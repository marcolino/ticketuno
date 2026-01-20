import { database } from "../db/database";
import { generateSeats } from "../../../shared/types/layoutToSeats";
import { v4 as uuidv4 } from "uuid";

export class PerformanceService {
  static async createPerformance(
    layoutId: string,
    date: string
  ): Promise<string> {
    const performanceId = uuidv4();

    // Create performance
    await database.createPerformance(performanceId, layoutId, date);

    // Load layout
    const layoutJson = await database.getLayoutById(layoutId);
    if (!layoutJson) throw new Error("Layout not found");

    const layout = JSON.parse(layoutJson);

    // Generate seats
    const seats = generateSeats(layout);

    // Insert seats
    await database.bulkCreateSeats(
      performanceId,
      seats.map(s => s.id)
    );

    return performanceId;
  }
}
