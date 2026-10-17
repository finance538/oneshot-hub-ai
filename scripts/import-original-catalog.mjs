// One-time content import; parses literal data without executing upstream code.
// Usage: node scripts/import-original-catalog.mjs /path/to/pinned-source migration-path
import ts from "typescript";
import { readFileSync, writeFileSync } from "node:fs";
const root = process.argv[2];
const output = process.argv[3];
if (!root || !output)
  throw new Error("Source directory and NEW migration path required");
function literal(n) {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
    return n.text;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (ts.isArrayLiteralExpression(n)) return n.elements.map(literal);
  if (ts.isObjectLiteralExpression(n))
    return Object.fromEntries(
      n.properties.map((p) => {
        if (!ts.isPropertyAssignment(p)) throw new Error("Nonliteral property");
        return [p.name.text, literal(p.initializer)];
      }),
    );
  if (n.kind === ts.SyntaxKind.TrueKeyword) return true;
  if (n.kind === ts.SyntaxKind.FalseKeyword) return false;
  if (n.kind === ts.SyntaxKind.NullKeyword) return null;
  throw new Error("Nonliteral source node: " + ts.SyntaxKind[n.kind]);
}
function data(file, name) {
  const ast = ts.createSourceFile(
    file,
    readFileSync(`${root}/${file}`, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  for (const statement of ast.statements)
    if (ts.isVariableStatement(statement)) {
      const declaration = statement.declarationList.declarations.find(
        (d) => d.name.getText(ast) === name,
      );
      if (declaration?.initializer) return literal(declaration.initializer);
    }
  throw new Error("Missing " + name);
}
const products = data("src/storefront/catalog.ts", "products");
const categories = data("src/storefront/catalog.ts", "categories");
const english = data("src/storefront/catalog-en.ts", "catalogEnglishBySku");
const media = data("src/storefront/media.ts", "mediaPackages");
const ads = data("src/storefront/media.ts", "googleAdsPackage");
const records = products.map((p) => ({
  ...p,
  english: english[p.sku],
  sourceKind: "catalog",
  image: `/images/products/${p.sku}.jpg`,
}));
for (const p of media)
  records.push({
    sku: p.sku,
    nameAr: p.nameAr,
    nameEn: p.nameEn,
    categoryId: "MED",
    subCategory: p.badgeAr,
    status: "ready_to_sell",
    pricing: {
      amount: p.price,
      currency: "SAR",
      type: "fixed",
      billingCycle: p.days ? "one_time" : "monthly",
    },
    deliveryDays: p.days,
    revisions: { count: 0, scope: "" },
    publicContent: {
      shortDescription: p.descriptionAr,
      detailedDescription: p.descriptionAr,
      deliverables: [],
      exclusions: [],
      ctaButton: "طلب الباقة",
    },
    sourceKind: "media",
    image: `/images/${p.image}.jpg`,
    media: p,
  });
records.push({
  sku: ads.sku,
  nameAr: ads.nameAr,
  nameEn: ads.nameEn,
  categoryId: "MKT",
  subCategory: "Google Ads",
  status: "ready_to_sell",
  pricing: {
    amount: ads.amount,
    currency: "SAR",
    type: "fixed",
    billingCycle: "one_time",
  },
  deliveryDays: 0,
  revisions: { count: 0, scope: "" },
  publicContent: {
    shortDescription: ads.nameAr,
    deliverables: [],
    exclusions: [],
    ctaButton: "طلب الباقة",
  },
  sourceKind: "ads",
  image: "/images/marketing.jpg",
});
records.forEach((record, index) => {
  record.sortOrder = index;
});
if (records.length !== 53 || new Set(records.map((p) => p.sku)).size !== 53)
  throw new Error("Unexpected source catalog");
const q = (value) => "'" + String(value).replaceAll("'", "''") + "'";
const rows = records.map(
  (p) =>
    "(" +
    [
      p.sku,
      p.nameAr,
      p.publicContent.shortDescription,
      p.subCategory,
      p.categoryId,
    ]
      .map(q)
      .join(",") +
    "," +
    Math.round(p.pricing.amount * 100) +
    "," +
    q(p.pricing.currency) +
    "," +
    q(p.image) +
    "," +
    q(JSON.stringify(p)) +
    "::jsonb,true)",
);
const sql =
  "-- Original public catalog from finance538/oneshot-ai-google- @ a9160bae7fcfb588dc35c6b532610ac97ca2b1be.\n-- Preserve legacy products/orders; retire the four superseded storefront listings.\nUPDATE products SET active=false WHERE id IN ('oneshot-pro-4k','oneshot-studio-kit','oneshot-cloud-ai','gateway-verification');\nINSERT INTO products (id,name,description,badge,category,price_cents,currency,image,catalog_details,active) VALUES\n" +
  rows.join(",\n") +
  "\nON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,badge=EXCLUDED.badge,category=EXCLUDED.category,price_cents=EXCLUDED.price_cents,currency=EXCLUDED.currency,image=EXCLUDED.image,catalog_details=EXCLUDED.catalog_details,active=EXCLUDED.active;\n";
writeFileSync(output, sql, { flag: "wx" });
writeFileSync(
  "src/storefront/categories.ts",
  "// Original category labels (presentation configuration).\nexport const categories = " +
    JSON.stringify(categories, null, 2) +
    ";\n",
);
console.log(
  `Prepared ${products.length} catalog services, ${media.length} media packages and one ads package. No database writes performed.`,
);
