export const ecosystemApps = [
  {
    id: "hub",
    name: "OneShot Hub",
    origin: "https://www.1shotcam.com",
    season: "Solar Summer",
    color: "#cfbc97",
    mark: "01",
  },
  {
    id: "workflow",
    name: "OneShot Workflow",
    origin: "https://workflow.1shotcam.com",
    season: "Equinox Dusk",
    color: "#b9a78d",
    mark: "02",
  },
  {
    id: "ai",
    name: "OneShot AI",
    origin: "https://ai.1shotcam.com",
    season: "Frost Winter",
    color: "#a8b8ad",
    mark: "03",
  },
  {
    id: "pay",
    name: "OneShot Pay",
    origin: "https://pay.1shotcam.com",
    season: "Copper Autumn",
    color: "#bba58a",
    mark: "04",
  },
  {
    id: "brand",
    name: "OneShot Brand",
    origin: "https://brand.1shotcam.com",
    season: "Prism Spring",
    color: "#9daf91",
    mark: "05",
  },
  {
    id: "loader",
    name: "OneShot Loader Test",
    origin: "https://loader.1shotcam.com",
    season: "Eclipse Lab",
    color: "#a6aca0",
    mark: "06",
  },
] as const;
export type EcosystemAppId = (typeof ecosystemApps)[number]["id"];
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
