import { useEffect, useRef, useState, type RefObject } from "react";
import { ArrowUpRight, Pause, Play } from "lucide-react";
import { ecosystemApps, type EcosystemAppId } from "../../shared/ecosystem";
import { useAppearance } from "../storefront/i18n";

export default function SpatialScene({
  appHref,
  energy,
}: {
  appHref: (id: EcosystemAppId) => string;
  energy: RefObject<() => number>;
}) {
  const { tr } = useAppearance();
  const host = useRef<HTMLDivElement>(null);
  const engine = useRef<ReturnType<
    typeof import("./spatialEngine").createSpatialEngine
  > | null>(null);
  const [available, setAvailable] = useState(false),
    [motion, setMotion] = useState(true);
  useEffect(() => {
    let alive = true;
    void import("./spatialEngine")
      .then(({ createSpatialEngine }) => {
        if (!alive || !host.current) return;
        try {
          engine.current = createSpatialEngine(
            host.current,
            () => energy.current(),
            () => {
              setAvailable(false);
              engine.current?.dispose();
              engine.current = null;
            },
          );
          setAvailable(true);
        } catch {
          setAvailable(false);
        }
      })
      .catch(() => {
        if (alive) setAvailable(false);
      });
    return () => {
      alive = false;
      engine.current?.dispose();
      engine.current = null;
    };
  }, [energy]);
  useEffect(() => {
    engine.current?.motion(motion);
  }, [motion, available]);
  return (
    <div className={`lux-spatial ${available ? "has-webgl" : ""}`}>
      <div className="lux-scene-label">
        <span>THE ECOSYSTEM / 01—06</span>
        <span>EST. IN SAUDI ARABIA</span>
      </div>
      <div className="lux-spatial-fallback" aria-hidden="true">
        <i />
        <i />
        <i />
        <img src="/oneshot.svg" alt="" />
      </div>
      <div className="lux-canvas" ref={host} aria-hidden="true" />
      <div className="lux-center-word" aria-hidden="true">
        <span>
          one<b>Shot</b>
        </span>
        <small>CONNECTED BY DESIGN</small>
      </div>
      {ecosystemApps.slice(1).map((app, index) => (
        <a
          key={app.id}
          className={`lux-satellite lux-satellite-${index}`}
          href={appHref(app.id)}
          target="_blank"
          rel="noopener noreferrer"
        >
          <span>{app.mark}</span>
          <strong>
            {app.name.replace("OneShot ", "").replace(" Test", "")}
          </strong>
          <ArrowUpRight size={13} />
        </a>
      ))}
      <div className="lux-scene-bottom">
        <span>
          {tr("خمس وجهات. مركز واحد.", "Five destinations. One center.")}
        </span>
        {available && (
          <button
            className="lux-motion"
            aria-pressed={!motion}
            onClick={() => setMotion(!motion)}
          >
            {motion ? <Pause size={13} /> : <Play size={13} />}
            {tr(
              motion ? "إيقاف الحركة" : "تشغيل الحركة",
              motion ? "Pause motion" : "Resume motion",
            )}
          </button>
        )}
      </div>
    </div>
  );
}
