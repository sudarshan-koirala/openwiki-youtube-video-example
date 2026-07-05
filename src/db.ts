// Simple in-memory store. Swapped for Postgres in production
// via the DATABASE_URL env var (see services/regionRouter.ts).
export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: "todo" | "in_progress" | "done";
  assignee: string;
  region: "NA" | "EU" | "APAC" | "LATAM";
  dueDate: string;
}

export interface Project {
  id: string;
  name: string;
  plan: "free" | "pro" | "enterprise";
  region: "NA" | "EU" | "APAC" | "LATAM";
}

export const projects: Project[] = [
  { id: "p1", name: "Website Redesign", plan: "pro", region: "NA" },
  { id: "p2", name: "Q3 Onboarding Revamp", plan: "enterprise", region: "EU" },
  { id: "p3", name: "Mobile App v3", plan: "pro", region: "APAC" },
  { id: "p4", name: "Partner Portal", plan: "free", region: "LATAM" }
];

export const tasks: Task[] = [
  { id: "t1", projectId: "p1", title: "Migrate hero banner", status: "in_progress", assignee: "priya", region: "NA", dueDate: "2026-07-10" },
  { id: "t2", projectId: "p2", title: "Localize welcome emails", status: "todo", assignee: "jonas", region: "EU", dueDate: "2026-07-15" },
  { id: "t3", projectId: "p3", title: "Fix push notification lag", status: "todo", assignee: "mei", region: "APAC", dueDate: "2026-07-08" },
  { id: "t4", projectId: "p4", title: "Draft partner FAQ", status: "done", assignee: "carlos", region: "LATAM", dueDate: "2026-06-28" }
];
