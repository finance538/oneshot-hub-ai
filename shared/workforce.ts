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
export interface Workspace {
  organization: {
    id: string;
    name: string;
    outputLanguage: WorkforceLanguage;
  } | null;
  tasks: WorkTask[];
  events: WorkEvent[];
  meetings: Meeting[];
}
