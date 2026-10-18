import { useEffect, useRef, useState } from "react";
import type { WorkforceLanguage } from "../../shared/workforce";
import { api } from "../lib/api";
import { liveText } from "./liveCopy";

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult:
    | ((event: {
        resultIndex: number;
        results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
      }) => void)
    | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
const locales: Record<WorkforceLanguage, string> = {
  ar: "ar-SA",
  en: "en-US",
  fr: "fr-FR",
  es: "es-ES",
  tr: "tr-TR",
  zh: "zh-CN",
  hi: "hi-IN",
  ur: "ur-PK",
};
export type VoicePhase =
  "idle" | "starting" | "listening" | "thinking" | "transcribing" | "speaking";
export type SpokenTurn = {
  employeeId: string;
  text: string;
  language: WorkforceLanguage;
};
const recognitionClass = () =>
  (window as SpeechWindow).SpeechRecognition ||
  (window as SpeechWindow).webkitSpeechRecognition;

export function useLiveVoice({
  language,
  outputLanguage,
  onTranscript,
  enabled,
}: {
  language: WorkforceLanguage;
  outputLanguage: WorkforceLanguage;
  onTranscript: (text: string) => Promise<void>;
  enabled: boolean;
}) {
  const [phase, setPhase] = useState<VoicePhase>("idle"),
    [active, setActive] = useState(false);
  const [speaker, setSpeaker] = useState<string | null>(null),
    [interim, setInterim] = useState("");
  const [error, setError] = useState(""),
    [muted, setMuted] = useState(false);
  const [route, setRouteState] = useState<"browser" | "gateway">(
    recognitionClass() ? "browser" : "gateway",
  );
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]),
    [voiceChoices, setVoiceChoices] = useState<Record<string, string>>({});
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const analyserNode = useRef<AnalyserNode | null>(null);
  const current = useRef({
    language,
    outputLanguage,
    onTranscript,
    enabled,
    muted,
    route,
    voiceChoices,
  });
  current.current = {
    language,
    outputLanguage,
    onTranscript,
    enabled,
    muted,
    route,
    voiceChoices,
  };
  const alive = useRef(true),
    session = useRef(0),
    speechId = useRef(0),
    audioEpoch = useRef(0);
  const call = useRef(false),
    held = useRef(false),
    listening = useRef(false),
    opening = useRef(false);
  const stream = useRef<MediaStream | null>(null),
    context = useRef<AudioContext | null>(null);
  const recognition = useRef<Recognition | null>(null),
    recorder = useRef<MediaRecorder | null>(null);
  const delayed = useRef<ReturnType<typeof setTimeout> | undefined>(undefined),
    vad = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const settleSpeech = useRef<((completed: boolean) => void) | null>(null);
  const recognitionAttempts = useRef(0);
  const t = (key: string) => liveText(current.current.language, key);
  function setStage(next: VoicePhase) {
    if (alive.current) setPhase(next);
  }
  function cancelListening() {
    listening.current = false;
    clearTimeout(delayed.current);
    clearInterval(vad.current);
    const r = recognition.current;
    recognition.current = null;
    if (r) {
      r.onend = null;
      r.onresult = null;
      r.onerror = null;
      try {
        r.abort();
      } catch {
        /* already stopped */
      }
    }
    const rec = recorder.current;
    recorder.current = null;
    if (rec && rec.state !== "inactive") {
      rec.onstop = null;
      rec.stop();
    }
    if (alive.current) setInterim("");
  }
  function cancelSpeech() {
    speechId.current++;
    settleSpeech.current?.(false);
    settleSpeech.current = null;
    window.speechSynthesis?.cancel();
    if (alive.current) setSpeaker(null);
  }
  function releaseMicrophone() {
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    void context.current?.close().catch(() => {});
    context.current = null;
    analyserNode.current = null;
    if (alive.current) setAnalyser(null);
  }
  function stop() {
    session.current++;
    audioEpoch.current++;
    call.current = false;
    held.current = false;
    opening.current = false;
    cancelListening();
    cancelSpeech();
    releaseMicrophone();
    if (alive.current) {
      setActive(false);
      setStage("idle");
    }
  }
  async function microphone() {
    if (stream.current?.active) return stream.current;
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia)
      throw new Error("microphone");
    const epoch = session.current;
    const media = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (!alive.current || epoch !== session.current) {
      media.getTracks().forEach((track) => track.stop());
      throw new Error("cancelled");
    }
    stream.current = media;
    media.getTracks().forEach((track) => {
      track.onended = () => {
        if (alive.current) {
          stop();
          setError(t("micError"));
        }
      };
    });
    try {
      const ctx = new AudioContext();
      context.current = ctx;
      await ctx.resume();
      if (epoch !== session.current || !alive.current) {
        void ctx.close().catch(() => {});
        throw new Error("cancelled");
      }
      const node = ctx.createAnalyser();
      node.fftSize = 256;
      ctx.createMediaStreamSource(media).connect(node);
      analyserNode.current = node;
      setAnalyser(node);
    } catch {
      /* Recognition still works when Web Audio is unavailable. */
    }
    return media;
  }
  function scheduleListen() {
    clearTimeout(delayed.current);
    if (!call.current || !alive.current) {
      setStage("idle");
      return;
    }
    delayed.current = setTimeout(() => {
      void listen();
    }, 350);
  }
  async function deliver(text: string, epoch: number) {
    if (epoch !== session.current || !alive.current) return;
    cancelListening();
    const value = text.trim().slice(0, 4000);
    if (!value) {
      scheduleListen();
      return;
    }
    setInterim("");
    setStage("thinking");
    try {
      await current.current.onTranscript(value);
    } catch {
      if (epoch === session.current) {
        stop();
        setError(t("pendingNote"));
      }
      return;
    }
    if (epoch === session.current && alive.current) scheduleListen();
    if (!call.current && !held.current) releaseMicrophone();
  }
  async function listen() {
    if (
      !current.current.enabled ||
      opening.current ||
      listening.current ||
      (!call.current && !held.current)
    )
      return;
    opening.current = true;
    const epoch = session.current;
    setStage("starting");
    setError("");
    try {
      const media = await microphone();
      if (epoch !== session.current || (!call.current && !held.current)) return;
      listening.current = true;
      setStage("listening");
      if (current.current.route === "browser") {
        const Constructor = recognitionClass();
        if (!Constructor) {
          stop();
          setError(t("noRecognition"));
          return;
        }
        const r = new Constructor();
        recognition.current = r;
        r.lang = locales[current.current.outputLanguage];
        r.continuous = false;
        r.interimResults = true;
        let final = "",
          heard = false;
        r.onresult = (event) => {
          if (epoch !== session.current || recognition.current !== r) return;
          let partial = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            if (event.results[i].isFinal)
              final += event.results[i][0].transcript + " ";
            else partial += event.results[i][0].transcript;
          }
          heard = true;
          recognitionAttempts.current = 0;
          setInterim(final || partial);
          if (final.trim()) {
            r.onend = null;
            try {
              r.stop();
            } catch {
              /* completed */
            }
            void deliver(final, epoch);
          }
        };
        r.onerror = (event) => {
          if (epoch !== session.current) return;
          if (event.error === "no-speech" || event.error === "aborted") return;
          stop();
          setError(
            event.error === "language-not-supported"
              ? t("noRecognition")
              : t("micError"),
          );
        };
        r.onend = () => {
          if (epoch !== session.current || recognition.current !== r) return;
          recognition.current = null;
          listening.current = false;
          if (!heard && ++recognitionAttempts.current > 4) {
            stop();
            return;
          }
          if (final.trim()) void deliver(final, epoch);
          else {
            scheduleListen();
            if (!call.current) releaseMicrophone();
          }
        };
        r.start();
      } else {
        if (!window.MediaRecorder) throw new Error("recorder");
        const mime = [
          "audio/webm;codecs=opus",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((type) => MediaRecorder.isTypeSupported(type));
        if (!mime) throw new Error("format");
        const rec = new MediaRecorder(media, {
          mimeType: mime,
          audioBitsPerSecond: 64000,
        });
        recorder.current = rec;
        const chunks: BlobPart[] = [];
        let bytes = 0;
        rec.ondataavailable = (event) => {
          if (event.data.size) {
            bytes += event.data.size;
            chunks.push(event.data);
          }
        };
        rec.onerror = () => {
          if (epoch === session.current) {
            stop();
            setError(t("micError"));
          }
        };
        rec.onstop = async () => {
          clearInterval(vad.current);
          listening.current = false;
          if (epoch !== session.current || !alive.current) return;
          recorder.current = null;
          if (!bytes || bytes > 1_300_000) {
            stop();
            setError(t("micError"));
            return;
          }
          setStage("transcribing");
          try {
            const audio = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error("read"));
              reader.onload = () =>
                resolve(String(reader.result).split(",")[1]);
              reader.readAsDataURL(new Blob(chunks, { type: mime }));
            });
            if (epoch !== session.current) return;
            const result = await api<{ transcript: string }>(
              "/api/workforce/voice/transcribe",
              {
                audio,
                mimeType: mime.split(";")[0],
                language: current.current.outputLanguage,
              },
              { quiet: true },
            );
            if (epoch === session.current)
              await deliver(result.transcript, epoch);
          } catch (err) {
            if (epoch === session.current && alive.current) {
              stop();
              setError((err as Error).message);
            }
          }
        };
        rec.start();
        const started = performance.now();
        let lastSpeech = started,
          heardSpeech = false;
        const meter = analyserNode.current;
        const samples = new Uint8Array(256);
        vad.current = setInterval(() => {
          if (rec.state !== "recording") return;
          const now = performance.now();
          if (meter) {
            meter.getByteTimeDomainData(samples);
            const rms = Math.sqrt(
              samples.reduce((sum, x) => sum + ((x - 128) / 128) ** 2, 0) /
                samples.length,
            );
            if (rms > 0.025) {
              heardSpeech = true;
              lastSpeech = now;
            }
          }
          if (
            now - started > 15000 ||
            (heardSpeech && now - lastSpeech > 1100)
          ) {
            clearInterval(vad.current);
            rec.stop();
          } else if (meter && !heardSpeech && now - started > 7000) {
            cancelListening();
            stop();
          }
        }, 100);
      }
    } catch {
      if (epoch === session.current && alive.current) {
        stop();
        setError(t("micError"));
      }
    } finally {
      if (epoch === session.current) opening.current = false;
    }
  }
  function startCall() {
    stop();
    audioEpoch.current++;
    call.current = true;
    recognitionAttempts.current = 0;
    setActive(true);
    void listen();
  }
  function interrupt() {
    stop();
    call.current = true;
    setActive(true);
    recognitionAttempts.current = 0;
    void listen();
  }
  function startHold() {
    if (!current.current.enabled || held.current) return;
    const wasCall = call.current;
    stop();
    call.current = wasCall;
    setActive(wasCall);
    held.current = true;
    recognitionAttempts.current = 0;
    void listen();
  }
  function endHold() {
    if (!held.current) return;
    held.current = false;
    if (recognition.current) {
      try {
        recognition.current.stop();
      } catch {
        /* completed */
      }
    } else if (recorder.current?.state === "recording") recorder.current.stop();
    else if (opening.current) {
      if (!call.current) stop();
    }
  }
  async function speak(item: SpokenTurn): Promise<boolean> {
    if (!alive.current || current.current.muted || !item.text.trim())
      return false;
    cancelListening();
    cancelSpeech();
    const synth = window.speechSynthesis;
    if (!synth) {
      setError(t("speechError"));
      return false;
    }
    synth.resume();
    const available = synth
      .getVoices()
      .filter((v) => v.lang.toLowerCase().split(/[-_]/)[0] === item.language)
      .sort((a, b) => a.voiceURI.localeCompare(b.voiceURI));
    if (!available.length) {
      setError(t("noVoice"));
      return false;
    }
    const profile =
      item.employeeId === "ceo" ? 0 : item.employeeId === "mail" ? 1 : 2;
    const chosen =
      available.find(
        (v) =>
          v.voiceURI ===
          current.current.voiceChoices[`${item.employeeId}:${item.language}`],
      ) || available[profile % available.length];
    const id = speechId.current;
    // Short chunks avoid long-utterance stalls in Chromium. Events drive the speaking ring.
    const chunks = item.text
      .replace(/[*#`]/g, "")
      .match(/[^.!?؟。\n]{1,180}(?:[.!?؟。\n]+|$)|.{1,180}/g) || [item.text];
    for (const chunk of chunks) {
      if (id !== speechId.current || !alive.current) return false;
      const ok = await new Promise<boolean>((resolve) => {
        let finished = false;
        const utterance = new SpeechSynthesisUtterance(chunk);
        utterance.lang = locales[item.language];
        utterance.voice = chosen;
        utterance.pitch = [0.9, 1.12, 1.02][profile];
        utterance.rate = [0.98, 1.04, 1.08][profile];
        const finish = (value: boolean) => {
          if (finished) return;
          finished = true;
          clearTimeout(timeout);
          if (settleSpeech.current === finish) settleSpeech.current = null;
          resolve(value);
        };
        const timeout = setTimeout(() => {
          if (id === speechId.current) {
            synth.cancel();
            if (alive.current) setError(t("speechError"));
          }
          finish(false);
        }, 30000);
        settleSpeech.current = finish;
        utterance.onstart = () => {
          if (alive.current && id === speechId.current) {
            setSpeaker(item.employeeId);
            setStage("speaking");
          }
        };
        utterance.onend = () => finish(true);
        utterance.onerror = () => {
          if (id === speechId.current && alive.current)
            setError(t("speechError"));
          finish(false);
        };
        synth.speak(utterance);
      });
      if (!ok) {
        if (id === speechId.current && alive.current) {
          setSpeaker(null);
          setStage("idle");
        }
        return false;
      }
    }
    if (id === speechId.current && alive.current) {
      setSpeaker(null);
      setStage("idle");
    }
    return id === speechId.current;
  }
  function setRoute(value: "browser" | "gateway") {
    stop();
    setError("");
    setRouteState(value);
  }
  function toggleMute() {
    cancelSpeech();
    audioEpoch.current++;
    setMuted((value) => !value);
    if (call.current) scheduleListen();
    else setStage("idle");
  }
  function pauseForReply() {
    cancelListening();
    cancelSpeech();
    setStage("thinking");
  }
  function selectVoice(employeeId: string, value: string) {
    setVoiceChoices((prev) => ({
      ...prev,
      [`${employeeId}:${outputLanguage}`]: value,
    }));
  }
  useEffect(() => {
    alive.current = true;
    const update = () => setVoices(window.speechSynthesis?.getVoices() || []);
    update();
    window.speechSynthesis?.addEventListener("voiceschanged", update);
    const hidden = () => {
      if (document.hidden) stop();
    };
    const blur = () => {
      if (held.current) stop();
    };
    document.addEventListener("visibilitychange", hidden);
    window.addEventListener("blur", blur);
    return () => {
      alive.current = false;
      stop();
      window.speechSynthesis?.removeEventListener("voiceschanged", update);
      document.removeEventListener("visibilitychange", hidden);
      window.removeEventListener("blur", blur);
    };
  }, []);
  useEffect(() => {
    stop();
  }, [outputLanguage, enabled]);
  return {
    phase,
    active,
    speaker,
    interim,
    error,
    muted,
    route,
    voices,
    analyser,
    voiceChoices,
    audioEpoch,
    startCall,
    stop,
    interrupt,
    startHold,
    endHold,
    speak,
    setRoute,
    toggleMute,
    selectVoice,
    pauseForReply,
    resume: scheduleListen,
    supportsRecognition: !!recognitionClass(),
  };
}
export type LiveVoice = ReturnType<typeof useLiveVoice>;
