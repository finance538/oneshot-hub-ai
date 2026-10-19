import { mkdir, readFile, writeFile, copyFile } from "node:fs/promises";

await mkdir("native/shell", { recursive: true });
const html = (await readFile("public/hub-offline.html", "utf8"))
  .replace('src="/oneshot.svg"', 'src="oneshot.svg"')
  .replace('src="/offline.js"', 'src="offline.js"')
  .replace('href="/hub"', 'href="https://www.1shotcam.com/hub"');
await writeFile("native/shell/index.html", html);
await writeFile("native/shell/offline.html", html);
await copyFile("public/offline.js", "native/shell/offline.js");
await copyFile("public/oneshot.svg", "native/shell/oneshot.svg");
