import { GoogleGenAI } from "@google/genai";

// Resolve at request time: team/runtime values are not baked into the bundle.
export function geminiClient() {
  const directKey = Netlify.env.get("GOOGLE_GENERATIVE_AI_API_KEY");
  if (directKey)
    return new GoogleGenAI({
      apiKey: directKey,
      httpOptions: { baseUrl: "https://generativelanguage.googleapis.com" },
    });
  const key = Netlify.env.get("GEMINI_API_KEY");
  const baseUrl = Netlify.env.get("GOOGLE_GEMINI_BASE_URL");
  if (key)
    return new GoogleGenAI({
      apiKey: key,
      ...(baseUrl ? { httpOptions: { baseUrl } } : {}),
    });
  // Preserve the platform's automatic AI Gateway injection.
  return new GoogleGenAI({});
}
