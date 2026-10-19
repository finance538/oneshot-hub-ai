import { useEffect, useRef, useState, type RefObject } from "react";

export default function SpatialScene({
  energy,
  calm,
  paused,
}: {
  energy: RefObject<number>;
  calm: boolean;
  paused: boolean;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (paused) {
      setReady(false);
      return;
    }
    let alive = true;
    let dispose: (() => void) | undefined;
    setReady(false);
    void import("./spatialEngine")
      .then(({ createSpatialScene }) => {
        if (!alive || !host.current) return;
        try {
          dispose = createSpatialScene(host.current, energy, calm, () =>
            setReady(false),
          );
          setReady(true);
        } catch {
          setReady(false);
        }
      })
      .catch(() => setReady(false));
    return () => {
      alive = false;
      dispose?.();
    };
  }, [calm, paused, energy]);
  return (
    <div
      className={`lux-spatial-art ${ready ? "is-ready" : ""}`}
      aria-hidden="true"
    >
      <div className="lux-spatial-fallback">
        <i />
        <i />
        <i />
        <div className="lux-crystal" />
      </div>
      <div ref={host} className="lux-canvas" />
    </div>
  );
}
