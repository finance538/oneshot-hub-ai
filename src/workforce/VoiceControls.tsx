import { useEffect, useRef } from "react";
import { Mic, MicOff, Phone, PhoneOff, Volume2, VolumeX } from "lucide-react";
import type { LiveVoice } from "./useLiveVoice";
import { useAppearance } from "../storefront/i18n";
import { liveText } from "./liveCopy";

export function AudioMeter({ analyser }: { analyser: AnalyserNode | null }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frame = 0;
    const samples = new Uint8Array(256);
    const draw = () => {
      ctx.clearRect(0, 0, 240, 36);
      ctx.strokeStyle = "#9cc8b0";
      ctx.lineWidth = 2;
      ctx.beginPath();
      analyser?.getByteTimeDomainData(samples);
      for (let i = 0; i < 240; i++) {
        const y = analyser ? 18 + ((samples[i] - 128) / 128) * 32 : 18;
        if (!i) ctx.moveTo(i, y);
        else ctx.lineTo(i, y);
      }
      ctx.stroke();
      if (analyser) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [analyser]);
  return (
    <canvas
      ref={ref}
      width={240}
      height={36}
      className="wf-audio-meter"
      aria-hidden="true"
    />
  );
}
export function VoiceControls({
  voice,
  employeeId,
  keyboard = false,
}: {
  voice: LiveVoice;
  employeeId: string;
  keyboard?: boolean;
}) {
  const { language, outputLanguage } = useAppearance(),
    t = (key: string) => liveText(language, key);
  const latest = useRef(voice);
  latest.current = voice;
  useEffect(() => {
    if (!keyboard) return;
    const isInput = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest(
        'input, textarea, select, button, a, [contenteditable="true"]',
      );
    const down = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        latest.current.stop();
        return;
      }
      if (
        event.code !== "Space" ||
        event.repeat ||
        event.ctrlKey ||
        event.altKey ||
        event.metaKey ||
        isInput(event.target)
      )
        return;
      event.preventDefault();
      latest.current.startHold();
    };
    const up = (event: KeyboardEvent) => {
      if (event.code === "Space") latest.current.endHold();
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [keyboard]);
  const matches = voice.voices.filter(
    (v) => v.lang.toLowerCase().split(/[-_]/)[0] === outputLanguage,
  );
  return (
    <div
      className={`wf-voice ${voice.phase === "listening" ? "is-listening" : ""}`}
    >
      <div className="wf-voice-main">
        <button
          type="button"
          className={voice.active ? "wf-call-active" : "wf-primary"}
          onClick={voice.active ? voice.stop : voice.startCall}
          aria-pressed={voice.active}
        >
          {voice.active ? <PhoneOff size={17} /> : <Phone size={17} />}
          {t(voice.active ? "hangup" : "call")}
        </button>
        <button
          type="button"
          className="wf-push-talk"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            voice.startHold();
          }}
          onPointerUp={voice.endHold}
          onPointerCancel={voice.endHold}
          onLostPointerCapture={voice.endHold}
          onKeyDown={(event) => {
            if (
              (event.code === "Space" || event.code === "Enter") &&
              !event.repeat
            ) {
              event.preventDefault();
              voice.startHold();
            }
          }}
          onKeyUp={(event) => {
            if (event.code === "Space" || event.code === "Enter") {
              event.preventDefault();
              voice.endHold();
            }
          }}
          aria-label={t("hold")}
          title={t("hold")}
        >
          {voice.phase === "listening" ? (
            <Mic size={20} />
          ) : (
            <MicOff size={20} />
          )}
          <span>{t("hold")}</span>
        </button>
        {(voice.phase === "speaking" || voice.phase === "thinking") && (
          <button type="button" onClick={voice.interrupt}>
            <Mic size={17} />
            {t("interrupt")}
          </button>
        )}
        <button
          type="button"
          aria-label={t(voice.muted ? "unmute" : "mute")}
          title={t(voice.muted ? "unmute" : "mute")}
          aria-pressed={voice.muted}
          onClick={voice.toggleMute}
        >
          {voice.muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <div className="wf-voice-status">
          <AudioMeter
            analyser={voice.phase === "listening" ? voice.analyser : null}
          />
          <span role="status">{t(voice.phase)}</span>
        </div>
      </div>
      <button
        type="button"
        onClick={voice.testAudio}
        disabled={voice.phase !== "idle"}
      >
        اختبار الصوت والمايك
      </button>
      {voice.diagnostic && <p role="status">{voice.diagnostic}</p>}
      {voice.interim && (
        <p className="wf-transcript" dir="auto">
          {voice.interim}
        </p>
      )}
      {voice.error && (
        <p className="wf-error" role="alert">
          {voice.error}
        </p>
      )}
      <details className="wf-voice-settings">
        <summary>{t("voiceSettings")}</summary>
        <div className="wf-voice-options">
          <label>
            {t("voiceSettings")}
            <select
              value={voice.route}
              onChange={(event) =>
                voice.setRoute(event.target.value as "browser" | "gateway")
              }
            >
              <option value="browser" disabled={!voice.supportsRecognition}>
                {t("browser")}
              </option>
              <option value="gateway">{t("gateway")}</option>
            </select>
          </label>
          <label>
            {t("automatic")}
            <select
              value={
                voice.voiceChoices[`${employeeId}:${outputLanguage}`] || ""
              }
              onChange={(event) =>
                voice.selectVoice(employeeId, event.target.value)
              }
            >
              <option value="">{t("automatic")}</option>
              {matches.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} · {v.lang}
                </option>
              ))}
            </select>
          </label>
        </div>
        {!matches.length && <p>{t("noVoice")}</p>}
        <p>{t("voiceNote")}</p>
        <p>{t("shortcut")}</p>
      </details>
    </div>
  );
}
