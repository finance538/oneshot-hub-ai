import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Derive launch artwork from the original emblem without changing the source logo.
const source = (await fs.readFile("public/oneshot.svg", "utf8"))
  .replaceAll("#FF5500", "#CFBC97")
  .replaceAll("#FFFFFF", "#C8C9B7")
  .replaceAll("#12141A", "#101211");
const background = "#101211";
async function artwork(size, iconSize, file, transparent = false) {
  const emblem = await sharp(Buffer.from(source))
    .resize(iconSize, iconSize)
    .png()
    .toBuffer();
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: transparent ? "#00000000" : background,
    },
  })
    .composite([{ input: emblem, gravity: "centre" }])
    .png()
    .toFile(file);
}
await artwork(192, 142, "public/hub-icon-192.png");
await artwork(512, 380, "public/hub-icon-512.png");
await artwork(
  1024,
  760,
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
);
// App Store artwork must be opaque.
const icon = await sharp(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
)
  .removeAlpha()
  .png()
  .toBuffer();
await fs.writeFile(
  "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
  icon,
);
for (const [density, size] of Object.entries({
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
})) {
  const dir = `android/app/src/main/res/mipmap-${density}`;
  for (const name of ["ic_launcher.png", "ic_launcher_round.png"])
    await artwork(size, Math.round(size * 0.74), path.join(dir, name));
  await artwork(
    Math.round(size * 2.25),
    Math.round(size * 1.2),
    path.join(dir, "ic_launcher_foreground.png"),
    true,
  );
}
for (const name of await fs.readdir(
  "ios/App/App/Assets.xcassets/Splash.imageset",
)) {
  if (name.endsWith(".png"))
    await artwork(
      2732,
      460,
      `ios/App/App/Assets.xcassets/Splash.imageset/${name}`,
    );
}
for (const dir of await fs.readdir("android/app/src/main/res")) {
  if (!dir.startsWith("drawable")) continue;
  const file = `android/app/src/main/res/${dir}/splash.png`;
  try {
    const meta = await sharp(file).metadata();
    const emblem = await sharp(Buffer.from(source))
      .resize(Math.round(Math.min(meta.width, meta.height) * 0.22))
      .png()
      .toBuffer();
    await fs.writeFile(
      file,
      await sharp({
        create: {
          width: meta.width,
          height: meta.height,
          channels: 3,
          background,
        },
      })
        .composite([{ input: emblem, gravity: "centre" }])
        .png()
        .toBuffer(),
    );
  } catch (error) {
    if (error.code !== "ENOENT" && !String(error.message).includes("missing"))
      throw error;
  }
}
console.log("Updated OneShot web and native launch artwork.");
