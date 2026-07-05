import { Router } from "express";
import { projects, tasks } from "../db";

export const projectsRouter = Router();

projectsRouter.get("/", (_req, res) => {
  res.json(projects);
});

// Rollup used by the dashboard: task counts per status for one project.
projectsRouter.get("/:id/summary", (req, res) => {
  const project = projects.find(p => p.id === req.params.id);
  if (!project) return res.status(404).json({ error: "project not found" });
  const projectTasks = tasks.filter(t => t.projectId === project.id);
  const summary = {
    project: project.name,
    plan: project.plan,
    total: projectTasks.length,
    todo: projectTasks.filter(t => t.status === "todo").length,
    in_progress: projectTasks.filter(t => t.status === "in_progress").length,
    done: projectTasks.filter(t => t.status === "done").length
  };
  res.json(summary);
});
