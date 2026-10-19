import { useEffect, useRef, useState } from "react";

export function useAmbience() {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(24);
  const [error, setError] = useState(false);
  const engine = useRef<{
    context: AudioContext;
    gain: GainNode;
    oscillators: OscillatorNode[];
  } | null>(null);
  const energy = useRef(0),
    frame = useRef(0),
    generation = useRef(0),
    level = useRef(volume);
  level.current = volume;
  const stop = () => {
    generation.current++;
    cancelAnimationFrame(frame.current);
    const audio = engine.current;
    engine.current = null;
    if (audio) {
      audio.oscillators.forEach((osc) => osc.stop());
      void audio.context.close().catch(() => {});
    }
    energy.current = 0;
    setPlaying(false);
  };
  async function toggle() {
    if (engine.current) {
      stop();
      return;
    }
    setError(false);
    const seq = ++generation.current;
    try {
      const context = new AudioContext();
      const gain = context.createGain();
      gain.gain.value = 0;
      const analyser = context.createAnalyser();
      analyser.fftSize = 128;
      gain.connect(analyser);
      analyser.connect(context.destination);
      const oscillators = [174.61, 261.63, 349.23].map((frequency) => {
        const oscillator = context.createOscillator();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        oscillator.connect(gain);
        oscillator.start();
        return oscillator;
      });
      engine.current = { context, gain, oscillators };
      await context.resume();
      if (seq !== generation.current) return;
      gain.gain.setTargetAtTime(level.current / 1800, context.currentTime, 0.7);
      setPlaying(true);
      const data = new Uint8Array(analyser.frequencyBinCount);
      const sample = () => {
        if (seq !== generation.current) return;
        analyser.getByteFrequencyData(data);
        energy.current = data.reduce((a, b) => a + b, 0) / data.length / 255;
        frame.current = requestAnimationFrame(sample);
      };
      sample();
    } catch {
      stop();
      setError(true);
    }
  }
  useEffect(() => {
    const audio = engine.current;
    if (audio)
      audio.gain.gain.setTargetAtTime(
        volume / 1800,
        audio.context.currentTime,
        0.2,
      );
  }, [volume]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) stop();
    };
    document.addEventListener("visibilitychange", hide);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      stop();
    };
  }, []);
  return { playing, volume, setVolume, error, energy, toggle, stop };
}
