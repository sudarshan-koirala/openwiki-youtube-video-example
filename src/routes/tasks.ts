import { Router } from "express";
import { tasks } from "../db";
import { resolveRegionEndpoint } from "../services/regionRouter";

export const tasksRouter = Router();

// GET /v2/tasks?region=APAC&status=todo
tasksRouter.get("/", (req, res) => {
  let result = tasks;
  const { region, status } = req.query;
  if (region) result = result.filter(t => t.region === region);
  if (status) result = result.filter(t => t.status === status);
  res.json({ endpoint: resolveRegionEndpoint(String(region || "NA")), tasks: result });
});

tasksRouter.get("/:id", (req, res) => {
  const task = tasks.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "task not found" });
  res.json(task);
});

tasksRouter.post("/", (req, res) => {
  const task = { id: `t${tasks.length + 1}`, ...req.body };
  tasks.push(task);
  res.status(201).json(task);
});
