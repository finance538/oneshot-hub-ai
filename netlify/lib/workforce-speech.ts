import * as speech from "microsoft-cognitiveservices-speech-sdk";
import { ApiError, env, payload, stringField } from "./security.js";
import { isLanguage, voiceProfile } from "../../shared/workforce.js";
export async function synthesizeSpeech(req: Request) {
  const key = env("AZURE_SPEECH_KEY"),
    region = env("AZURE_SPEECH_REGION");
  if (!key || !region || !/^[a-z0-9]+$/.test(region))
    throw new ApiError(
      503,
      "النطق السحابي يحتاج تفعيل خدمة الصوت لدى مسؤول المنصة. النص متاح ويمكن اختيار صوت الجهاز.",
      "SPEECH_NOT_CONFIGURED",
    );
  const body = await payload(req);
  if (!isLanguage(body.language)) throw new ApiError(400, "لغة غير مدعومة.");
  const voices = {
    ar: "ar-SA-ZariyahNeural",
    en: "en-US-JennyNeural",
    fr: "fr-FR-DeniseNeural",
    es: "es-ES-ElviraNeural",
    tr: "tr-TR-EmelNeural",
    zh: "zh-CN-XiaoxiaoNeural",
    hi: "hi-IN-SwaraNeural",
    ur: "ur-PK-UzmaNeural",
  };
  const text = stringField(body.text, "النص", 3500).replace(/[*#`]/g, "");
  const config = speech.SpeechConfig.fromSubscription(key, region);
  config.speechSynthesisVoiceName = voices[body.language];
  config.speechSynthesisOutputFormat =
    speech.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3;
  const synth = new speech.SpeechSynthesizer(config, null);
  const profile = voiceProfile(
    typeof body.employeeId === "string" ? body.employeeId : "ceo",
  );
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
  const ssml = `<speak version="1.0" xml:lang="${body.language}"><voice name="${voices[body.language]}"><prosody rate="${Math.round((profile.rate - 1) * 100)}%" pitch="${Math.round((profile.pitch - 1) * 100)}%">${escaped}</prosody></voice></speak>`;
  try {
    const audio = await new Promise<ArrayBuffer>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("timeout")), 20000);
      synth.speakSsmlAsync(
        ssml,
        (result) => {
          clearTimeout(timer);
          if (result.reason === speech.ResultReason.SynthesizingAudioCompleted)
            resolve(result.audioData);
          else reject(new Error("speech"));
        },
        () => {
          clearTimeout(timer);
          reject(new Error("speech"));
        },
      );
    });
    return {
      audio: Buffer.from(audio).toString("base64"),
      mimeType: "audio/mpeg",
    };
  } catch {
    throw new ApiError(
      502,
      "تعذر تشغيل النطق السحابي. النص محفوظ؛ أعد تشغيل القراءة أو اختر صوت الجهاز.",
    );
  } finally {
    synth.close();
  }
}
