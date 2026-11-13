import { useEffect, useRef, useState, type RefObject } from "react";

export default function SpatialScene({
  energy,
  calm,
  paused,
  markLabel,
  markHint,
}: {
  energy: RefObject<number>;
  calm: boolean;
  paused: boolean;
  markLabel: string;
  markHint: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const grab = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [touched, setTouched] = useState(false);
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
          dispose = createSpatialScene(
            host.current,
            energy,
            calm,
            () => setReady(false),
            grab.current,
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
    <>
      <div
        className={`lux-spatial-art ${ready ? "is-ready" : ""}`}
        aria-hidden="true"
      >
        <div className="lux-spatial-fallback">
          <i />
          <i />
          <i />
          <img
            className="lux-mark-poster"
            src="/models/oneshot-mark-poster.webp"
            width="700"
            height="700"
            alt=""
            loading="lazy"
            decoding="async"
          />
        </div>
        <div ref={host} className="lux-canvas" />
      </div>
      {/* The mark itself: drag, arrow keys or double-click to recentre. */}
      <div
        ref={grab}
        className={`lux-mark-grab ${ready ? "is-live" : ""} ${touched ? "is-touched" : ""}`}
        role="img"
        aria-label={markLabel}
        tabIndex={ready ? 0 : -1}
        onPointerDown={() => setTouched(true)}
        onKeyDown={() => setTouched(true)}
      >
        <span className="lux-mark-hint" aria-hidden="true">
          {markHint}
        </span>
      </div>
    </>
  );
}
