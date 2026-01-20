import { Router } from "express";
import { PerformanceService } from "../services/performanceService";

export const performancesRouter = Router();

performancesRouter.post("/", async (req, res) => {
  const { layoutId, date } = req.body;

  const performanceId =
    await PerformanceService.createPerformance(layoutId, date);

  res.json({ performanceId });
});
