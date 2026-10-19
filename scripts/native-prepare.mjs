import fs from "node:fs/promises";
await fs.mkdir("native-shell", { recursive: true });
const html = (await fs.readFile("public/hub-offline.html", "utf8"))
  .replace('href="/"', 'href="https://www.1shotcam.com/"')
  .replace('src="/oneshot.svg"', 'src="oneshot.svg"')
  .replace('src="/offline-guide.js"', 'src="offline-guide.js"');
await fs.writeFile("native-shell/index.html", html);
await fs.writeFile("native-shell/offline.html", html);
await fs.copyFile("public/offline-guide.js", "native-shell/offline-guide.js");
await fs.copyFile("public/oneshot.svg", "native-shell/oneshot.svg");
console.log("Prepared local offline assets for the native shells.");
