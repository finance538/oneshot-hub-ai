import { useEffect, useRef, useState, type RefObject } from "react";
import { Moon, Volume2, VolumeX, Sun } from "lucide-react";
import { useAppearance } from "../storefront/i18n";

export default function SensoryControls({
  zen,
  setZen,
  energy,
}: {
  zen: boolean;
  setZen: (value: boolean) => void;
  energy: RefObject<() => number>;
}) {
  const { tr } = useAppearance();
  const [playing, setPlaying] = useState(false),
    [volume, setVolume] = useState(18),
    [error, setError] = useState(false);
  const audio = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
  } | null>(null);
  const alive = useRef(true);
  const stop = () => {
    const current = audio.current;
    audio.current = null;
    energy.current = () => 0;
    if (current) {
      current.oscillators.forEach((o) => {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      });
      void current.context.close().catch(() => {});
    }
    if (alive.current) setPlaying(false);
  };
  useEffect(() => {
    alive.current = true;
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", stop);
    return () => {
      alive.current = false;
      stop();
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", stop);
    };
  }, []);
  useEffect(() => {
    if (audio.current)
      audio.current.gain.gain.setTargetAtTime(
        (volume / 100) * 0.16,
        audio.current.context.currentTime,
        0.15,
      );
  }, [volume]);
  async function toggle() {
    if (audio.current) {
      stop();
      return;
    }
    try {
      setError(false);
      const context = new AudioContext();
      const gain = context.createGain(),
        analyser = context.createAnalyser();
      gain.gain.value = 0;
      analyser.fftSize = 256;
      gain.connect(analyser);
      analyser.connect(context.destination);
      const oscillators = [130.81, 196, 261.63].map((frequency, i) => {
        const oscillator = context.createOscillator(),
          layer = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        layer.gain.value = 1 / (i + 3);
        oscillator.connect(layer);
        layer.connect(gain);
        oscillator.start();
        return oscillator;
      });
      audio.current = { context, gain, oscillators };
      await context.resume();
      if (!alive.current || audio.current?.context !== context) return;
      gain.gain.setTargetAtTime(
        (volume / 100) * 0.16,
        context.currentTime,
        1.2,
      );
      const data = new Uint8Array(analyser.frequencyBinCount);
      energy.current = () => {
        analyser.getByteFrequencyData(data);
        return (
          data.reduce((sum, value) => sum + value, 0) / (data.length * 100)
        );
      };
      setPlaying(true);
    } catch {
      stop();
      if (alive.current) setError(true);
    }
  }
  return (
    <div className="lux-sensory">
      <button aria-pressed={zen} onClick={() => setZen(!zen)}>
        {zen ? <Sun size={16} /> : <Moon size={16} />}
        {tr(
          zen ? "العودة للإضاءة العادية" : "وضع الهدوء",
          zen ? "Standard lighting" : "Focus lighting",
        )}
      </button>
      <span className="lux-control-divider" />
      <button aria-pressed={playing} onClick={() => void toggle()}>
        {playing ? <Volume2 size={16} /> : <VolumeX size={16} />}
        {tr(
          playing ? "إيقاف الصوت" : "أجواء صوتية",
          playing ? "Stop ambient audio" : "Ambient audio",
        )}
      </button>
      {playing && (
        <label className="lux-volume">
          <span className="sr-only">{tr("مستوى الصوت", "Volume")}</span>
          <input
            type="range"
            min="0"
            max="50"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </label>
      )}
      {error && (
        <span role="status">
          {tr(
            "الصوت غير متاح في هذا المتصفح.",
            "Audio is unavailable in this browser.",
          )}
        </span>
      )}
    </div>
  );
}
