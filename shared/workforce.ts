export const workforceLanguages = [
  "ar",
  "en",
  "fr",
  "es",
  "tr",
  "zh",
  "hi",
  "ur",
] as const;
export type WorkforceLanguage = (typeof workforceLanguages)[number];
export const languageNames: Record<WorkforceLanguage, string> = {
  ar: "العربية",
  en: "English",
  fr: "Français",
  es: "Español",
  tr: "Türkçe",
  zh: "简体中文",
  hi: "हिन्दी",
  ur: "اردو",
};
export function isLanguage(value: unknown): value is WorkforceLanguage {
  return (
    typeof value === "string" &&
    workforceLanguages.includes(value as WorkforceLanguage)
  );
}
export function voiceProfile(employeeId: string) {
  const index = [
    "ceo",
    "mail",
    "researcher",
    "marketing",
    "developer",
    "salla",
    "ads",
    "analyst",
    "support",
    "operations",
  ].indexOf(employeeId);
  const profile = Math.max(0, index);
  return {
    index: profile,
    pitch: [0.9, 1.12, 1.02, 1.08, 0.95, 1.04, 1.15, 0.88, 1.06, 0.98][profile],
    rate: [0.98, 1.04, 1.02, 1.05, 1.0, 0.96, 1.08, 0.94, 1.01, 1.03][profile],
  };
}
export interface Employee {
  id: string;
  title: Record<string, string>;
  bio: Record<string, string>;
  skills: string[];
  category: string;
  availability: string;
}
export interface WorkTask {
  id: string;
  employeeId: string;
  mode: string;
  status: string;
  input: string;
  output: string;
  outputLanguage: string;
  createdAt: string;
  updatedAt: string;
}
export interface WorkEvent {
  id: string;
  taskId: string;
  phase: string;
  createdAt: string;
}
export interface Meeting {
  id: string;
  outputLanguage?: WorkforceLanguage;
  status: string;
  topic: string;
  minutes: string;
  revision: string;
  reports: {
    employeeId: string;
    taskId: string;
    status: string;
    output: string;
  }[];
  proposals: { id: string; employeeId: string; title: string }[];
  createdAt: string;
}
export interface ChatTurn {
  id: string;
  employeeId: string;
  meetingId: string | null;
  input: string;
  output: string;
  outputLanguage: WorkforceLanguage;
  status: "generating" | "ready" | "failed";
  action?: { kind: string; employeeId: string; resourceId?: string } | null;
  createdAt: string;
}

export interface WorkforceConnection {
  id: string;
  kind: string;
  label: string;
  origin: string;
  status: string;
  keepSession: boolean;
  syncEnabled: boolean;
  lastSyncAt: string | null;
  sessionExpiresAt: string | null;
}
export interface MailMessage {
  id: string;
  connectionId: string;
  direction: string;
  sender: string;
  recipient: string;
  subject: string;
  body: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}
export interface ResearchRun {
  id: string;
  connectionId: string | null;
  query: string;
  kind: string;
  status: string;
  summary: string;
  pages: { title: string; url: string; excerpt: string }[];
  createdAt: string;
  updatedAt: string;
}
export interface Workspace {
  activity?: Record<
    string,
    { status: string; text: string; updatedAt: string }
  >;
  organization: {
    id: string;
    name: string;
    outputLanguage: WorkforceLanguage;
  } | null;
  tasks: WorkTask[];
  events: WorkEvent[];
  meetings: Meeting[];
}
