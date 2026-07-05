import express from "express";
import { tasksRouter } from "./routes/tasks";
import { projectsRouter } from "./routes/projects";
import { authMiddleware } from "./middleware/auth";
import { rateLimit } from "./middleware/rateLimit";

const app = express();
app.use(express.json());
app.use(authMiddleware);
app.use(rateLimit);

app.use("/v2/tasks", tasksRouter);
app.use("/v2/projects", projectsRouter);

// Legacy alias kept for the mobile app (pre-1.0 clients).
// Do not remove until mobile v3 rollout completes.
app.use("/v1/tickets", tasksRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`meridian-tasks-api listening on :${PORT}`);
});
