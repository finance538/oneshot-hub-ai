import { ShieldCheck } from "lucide-react";
import { appearanceLink, useAppearance } from "../../storefront/i18n";
import { documents } from "../../storefront/documents";
import { guides } from "../../storefront/guides";
function Logo() {
  const { tr } = useAppearance();
  return (
    <a
      className="store-logo"
      href={appearanceLink("/")}
      aria-label={`OneShot Hub · ${tr("الرئيسية", "Home")}`}
    >
      <img
        className="store-logo-emblem"
        src="/oneshot.svg"
        alt=""
        width="44"
        height="44"
      />
      <span dir="ltr">
        one<b>Shot</b>
        <small>Hub</small>
      </span>
    </a>
  );
}

export default function BusinessFooter() {
  const { tr } = useAppearance();
  return (
    <footer className="store-footer">
      <div className="store-footer-inner">
        <div className="store-footer-columns">
          <div>
            <Logo />
            <p>
              {tr(
                "خدمات التصوير الفوتوغرافي والإنتاج المرئي والتسويق الرقمي والتصميم، مع حلول رقمية مساندة للأفراد والمنشآت.",
                "Photography, visual production, digital marketing and design, supported by modern digital business solutions.",
              )}
            </p>
            <small className="store-kicker" dir="ltr">
              1shotcam.com → OneShot Hub
            </small>
          </div>
          <div>
            <h3>{tr("خدماتنا", "Our Services")}</h3>
            {[
              ["التصوير الفوتوغرافي", "Photography"],
              ["الإنتاج المرئي والمحتوى", "Visual Production & Content"],
              ["التسويق الرقمي والإعلانات", "Digital Marketing"],
              ["التصميم والهوية البصرية", "Design & Brand Identity"],
            ].map(([arabic, english], index) => (
              <a
                key={english}
                href={appearanceLink(
                  index === 2 ? "/#section-google-ads" : "/#section-media",
                )}
              >
                {tr(arabic, english)}
              </a>
            ))}
            <a href={appearanceLink("/products")}>
              {tr("حلول الأعمال الرقمية", "Digital Business Solutions")}
            </a>
          </div>
          <div>
            <h3>{tr("دليل التجار الذكي", "Smart Merchant Guide")}</h3>
            {guides.map((guide) => (
              <a
                key={guide.slug}
                href={appearanceLink(`/guides/${guide.slug}`)}
              >
                {tr(guide.titleAr, guide.titleEn)}
              </a>
            ))}
          </div>
          <div>
            <h3>{tr("المنشأة", "Business Information")}</h3>
            <p>OneShot Photography</p>
            <p>
              {tr(
                "مؤسسة يحيى أحمد يحيى الهوساوي للتصوير الفوتوغرافي",
                "Yahya Ahmed Yahya Alhawsawi Photography Establishment",
              )}
            </p>
            <p>1shotcam.com</p>
            <p>{tr("المملكة العربية السعودية", "Kingdom of Saudi Arabia")}</p>
          </div>
          <div>
            <h3>{tr("دليل التجار الذكي", "Merchant Smart Guide")}</h3>
            <a href="/guides/payment-gateways.html">
              {tr("ربط بوابات الدفع", "Payment gateways")}
            </a>
            <a href="/guides/store-automation.html">
              {tr("أتمتة المتاجر", "Store automation")}
            </a>
            <a href="/guides/ai-employees.html">
              {tr("موظفو الذكاء الاصطناعي", "AI employees")}
            </a>
            <a href="/guides/commercial-photography.html">
              {tr("التصوير التجاري", "Commercial photography")}
            </a>
          </div>
          <div>
            <h3>{tr("التواصل والاعتماد", "Contact & Brand")}</h3>
            <a className="store-accent" href="mailto:finance@1shotcam.com">
              finance@1shotcam.com
            </a>
            <a href="mailto:support@1shotcam.com">support@1shotcam.com</a>
            <a href={appearanceLink("/dashboard")}>
              {tr("مساحة التاجر", "Merchant Workspace")}
            </a>
            <a href={appearanceLink("/products")}>
              {tr("كتالوج المنتجات والخدمات", "Products & Services")}
            </a>
          </div>
        </div>
        <nav
          className="store-footer-policies"
          aria-label={tr(
            "معلومات الشركة والسياسات",
            "Company information and policies",
          )}
        >
          {Object.entries(documents).map(([key, value]) => (
            <a key={key} href={appearanceLink(`/${key}`)}>
              {tr(value.titleAr, value.titleEn)}
            </a>
          ))}
        </nav>
        <div className="store-footer-bottom">
          <span>
            <ShieldCheck size={15} />© 2026 OneShot Brand System.{" "}
            {tr(
              "جميع الحقوق محفوظة لـ 1shotcam.com",
              "All rights reserved to 1shotcam.com",
            )}
          </span>
          <span>Photography · Marketing · Design</span>
        </div>
      </div>
    </footer>
  );
}
