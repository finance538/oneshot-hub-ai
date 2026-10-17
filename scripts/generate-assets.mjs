import { GoogleGenAI } from "@google/genai";
import { writeFile, mkdir } from "node:fs/promises";
const ai = new GoogleGenAI({
  apiKey: process.env.NETLIFY_AI_GATEWAY_KEY,
  httpOptions: {
    baseUrl: process.env.NETLIFY_AI_GATEWAY_URL?.replace(/\/$/, ""),
  },
});
const prompts = {
  camera:
    "Premium product concept photography for oneShot store: a professional compact matte graphite black AI 4K camera with a large beautifully detailed optical lens, orange subtle ring around lens, small futuristic cylindrical gimbal base, three-quarter view. On a dark charcoal studio backdrop #13161c, warm orange rim lighting, elegant realistic commercial photography. Single product centered, full object visible, plenty of space around it. No words, no text, no logos, no watermark. Landscape 4:3 composition.",
  "studio-kit":
    "Premium product concept photography for oneShot store: neatly arranged professional creator studio kit, matte graphite black camera on compact tripod with two small cinematic LED panel lights on stands and wireless microphone, on a very dark charcoal seamless studio backdrop. Warm orange rim lighting. Elegant photographic realism, full objects visible, centered landscape 4:3 composition. No words, no text, no logos, no watermark.",
};
await mkdir("public/img", { recursive: true });
await Promise.all(
  Object.entries(prompts).map(async ([name, prompt]) => {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-image",
        contents: prompt,
      });
      const part = response.candidates?.[0]?.content?.parts?.find((p) =>
        p.inlineData?.mimeType?.startsWith("image/"),
      );
      if (!part?.inlineData?.data) throw new Error("No image");
      await writeFile(
        `public/img/${name}.png`,
        Buffer.from(part.inlineData.data, "base64"),
      );
      console.log(`Saved ${name}`);
    } catch {
      console.log(`Image unavailable: ${name}`);
    }
  }),
);
