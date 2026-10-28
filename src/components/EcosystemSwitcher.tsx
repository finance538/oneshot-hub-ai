import {
  ArrowUpRight,
  Camera,
  Clapperboard,
  Workflow,
  Sparkles,
  CreditCard,
  Palette,
  FlaskConical,
} from "lucide-react";
import { ecosystemApps } from "../../shared/ecosystem";
import { useAppearance } from "../storefront/i18n";
import "./ecosystem-switcher.css";

const icons = {
  hub: Camera,
  workflow: Workflow,
  ai: Sparkles,
  pay: CreditCard,
  brand: Palette,
  loader: FlaskConical,
  media: Clapperboard,
};
export default function EcosystemSwitcher() {
  const { tr } = useAppearance();
  return (
    <nav
      className="ecosystem-switcher"
      aria-label={tr("تطبيقات منظومة OneShot", "OneShot ecosystem apps")}
    >
      <span className="ecosystem-switcher-label" dir="ltr">
        one<b>Shot</b>
        <small>{tr("المنظومة", "ECOSYSTEM")}</small>
      </span>
      <div className="ecosystem-switcher-links">
        {ecosystemApps.map((app) => {
          const Icon = icons[app.id];
          const active =
            app.origin === location.origin ||
            (app.id === "hub" &&
              !ecosystemApps.some((item) => item.origin === location.origin));
          return (
            <a
              key={app.id}
              href={app.origin}
              aria-current={active ? "true" : undefined}
            >
              <Icon size={15} aria-hidden="true" />
              <span>
                {app.name.replace("OneShot ", "").replace(" Test", "")}
              </span>
              {!active && (
                <ArrowUpRight
                  size={12}
                  className="ecosystem-switcher-arrow"
                  aria-hidden="true"
                />
              )}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
