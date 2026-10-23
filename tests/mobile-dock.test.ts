import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import chromium from "@sparticuz/chromium";
import { chromium as browserEngine } from "playwright-core";

// Exercise the shipped CSS in a real browser with representative native controls.
// No build, development server, external resource, database or payment is started.
test("mobile CSS consolidates launchers and keeps the native speed dial inside narrow RTL/LTR screens", async () => {
  const browser = await browserEngine.launch({
    executablePath: await chromium.executablePath(),
    args: chromium.args,
    headless: true,
  });
  try {
    const page = await browser.newPage();
    await page.route("**/*", (route) => route.abort());
    const css = [
      "src/design-tokens.css",
      "src/components/modal.css",
      "src/growth/growth.css",
      "src/tools/tools.css",
      "src/components/smart-dock.css",
      "src/commerce/commerce.css",
    ]
      .map((file) =>
        readFileSync(new URL(`../${file}`, import.meta.url), "utf8"),
      )
      .join("\n");
    for (const width of [320, 375, 390, 768])
      for (const dir of ["rtl", "ltr"]) {
        await page.setViewportSize({ width, height: 812 });
        await page.setContent(
          `<html dir="${dir}"><head><style>*,*::before,*::after{box-sizing:border-box}body{margin:0}${css}</style></head><body><main><h1>OneShot</h1><button class="growth-dock">Growth</button><button class="tools-fab">Tools</button><div class="lux-sensory-controls"><button>Calm</button><button>Sound</button><button>Advisor</button></div></main><button class="smart-dock-trigger" data-visible="true" aria-label="Quick controls">⚡</button><dialog class="ui-dialog smart-dock-dialog"><header class="ui-dialog-heading"><h2>زر التحكم السريع · Quick controls</h2><button id="close">Close</button></header><div class="ui-dialog-body"><nav class="smart-dock-menu">${["طلب عرض سعر · Request a quote", "استوديو النمو · Growth Studio", "المرشد الذكي · Advisor", "الأدوات والأدلة · Tools & guides", "وضع الهدوء · Calm mode"].map((label) => `<button>${label}</button>`).join("")}</nav></div></dialog></body></html>`,
        );
        assert.equal(
          await page.locator(".growth-dock").isVisible(),
          false,
          `${width}/${dir}: old growth launcher`,
        );
        assert.equal(
          await page.locator(".tools-fab").isVisible(),
          false,
          `${width}/${dir}: old vault launcher`,
        );
        const fab = await page.locator(".smart-dock-trigger").boundingBox();
        assert.ok(
          fab &&
            fab.x >= 0 &&
            fab.x + fab.width <= width &&
            fab.width >= 44 &&
            fab.height >= 44,
        );
        await page.evaluate(() =>
          document.querySelector("dialog")!.showModal(),
        );
        assert.equal(
          await page.locator(".smart-dock-trigger").isVisible(),
          false,
          `${width}/${dir}: no competing launcher above a form/dialog`,
        );
        const dialog = await page.locator("dialog").boundingBox();
        assert.ok(
          dialog &&
            dialog.x >= 0 &&
            dialog.x + dialog.width <= width &&
            dialog.y >= 0 &&
            dialog.y + dialog.height <= 812,
        );
        for (const button of await page
          .locator(".smart-dock-menu button")
          .all()) {
          const box = await button.boundingBox();
          assert.ok(
            box && box.x >= 0 && box.x + box.width <= width && box.height >= 44,
          );
        }
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
          true,
        );
        await page.keyboard.press("Escape");
        assert.equal(await page.locator("dialog").isVisible(), false);
      }
    await page.setViewportSize({ width: 1024, height: 812 });
    assert.equal(await page.locator(".smart-dock-trigger").isVisible(), false);
    assert.equal(await page.locator(".tools-fab").isVisible(), true);
  } finally {
    await browser.close();
  }
});
