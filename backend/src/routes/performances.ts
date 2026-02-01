import { Router } from "express";
import { PerformanceService } from "../services/performanceService";
import { getErrorMessage } from '../utils/errorHandler';

export const performancesRouter = Router();

performancesRouter.post("/", async (req, res) => {
  try {
    const { layoutId, date } = req.body;
    const performanceId = await PerformanceService.createPerformance(layoutId, date);

    res.json({ performanceId });
  } catch (error) {
    res.status(500).json({ error: req.t('Failed to create performance: {{err}}', { err: getErrorMessage(error) }) });
  }
});
