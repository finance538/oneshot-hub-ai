export const ecosystemApps = [
  {
    id: "hub",
    name: "OneShot Hub",
    origin: "https://www.1shotcam.com",
    season: "Solar Summer",
    color: "#cfbc97",
    mark: "01",
    hidden: false,
  },
  {
    id: "workflow",
    name: "OneShot Workflow",
    origin: "https://workflow.1shotcam.com",
    season: "Equinox Dusk",
    color: "#b9a78d",
    mark: "02",
    hidden: false,
  },
  {
    id: "ai",
    name: "OneShot AI",
    origin: "https://ai.1shotcam.com",
    season: "Frost Winter",
    color: "#a8b8ad",
    mark: "03",
    hidden: false,
  },
  {
    id: "pay",
    name: "OneShot Pay",
    origin: "https://pay.1shotcam.com",
    season: "Copper Autumn",
    color: "#bba58a",
    mark: "04",
    hidden: true,
  },
  {
    id: "brand",
    name: "OneShot Brand",
    origin: "https://brand.1shotcam.com",
    season: "Prism Spring",
    color: "#9daf91",
    mark: "05",
    hidden: false,
  },
  {
    id: "loader",
    name: "OneShot Loader Test",
    origin: "https://loader.1shotcam.com",
    season: "Eclipse Lab",
    color: "#a6aca0",
    mark: "06",
    hidden: true,
  },
  {
    id: "media",
    name: "OneShot Media",
    origin: "https://media.1shotcam.com",
    season: "Signal Ember",
    color: "#ff5500",
    mark: "07",
    hidden: false,
  },
] as const;
export type EcosystemAppId = (typeof ecosystemApps)[number]["id"];
// `hidden: true` keeps an app wired to the ecosystem (SSO, handshake, health probing) while
// taking it out of every launcher and switcher list. Flip the flag back to false to restore it.
export const visibleApps = ecosystemApps.filter((app) => !app.hidden);
export const hubOrigin = ecosystemApps[0].origin;
export interface AppConnection {
  id: EcosystemAppId;
  status: "available" | "unverified";
  sso: boolean;
  checkedAt: string;
}
export interface EcosystemStatus {
  apps: AppConnection[];
  apkUrl: string | null;
}
