import express from "express";
import cors from "cors";
import { requireUser } from "./middleware/requireUser";
import { errorHandler } from "./middleware/errorHandler";
import { equipmentRouter } from "./routes/equipment";
import {
  cleaningRecordsRouter,
  equipmentCleaningRouter,
} from "./routes/cleaningRecords";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());
  app.get("/api/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", requireUser);
  app.use("/api/equipment", equipmentRouter);
  app.use("/api/equipment/:id/cleaning-records", equipmentCleaningRouter);
  app.use("/api/cleaning-records", cleaningRecordsRouter);
  app.use(errorHandler);
  return app;
}
