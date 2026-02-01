import { v4 as uuidv4 } from "uuid";
import { database } from "../db/database";
import { generateSeats } from '../shared/types/layoutToSeats';
import { EventPerformance } from "../shared/types/event";

export class PerformanceService {
  static async createPerformance(
    eventId: string,
    date: string
  ): Promise<string> {
    const performanceId = uuidv4();

     // Load event to get its layout
    const event = await database.getEventById(eventId);
    if (!event) throw new Error("Event not found");

    // Create performance object
    const performance: EventPerformance = {
      id: '',
      eventId: eventId,
      performanceDate: date,
      startTime: '19:00', // TODO: get from event
      endTime: undefined,
      availableSeats: 100, // TODO: calculate this from layout
      bookedSeats: 0,
      seatData: '{}', // We'll populate this later
      status: 'scheduled',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Create performance
    await database.createPerformance(performance);

    // Load layout
    // const layoutJson = await database.getLayoutById(layoutId);
    // if (!layoutJson) {
    //   throw new Error('LAYOUT_NOT_FOUND');
    // }

    // Get layout from event (assuming event has layoutId)
    const layoutJson = await database.getLayoutById(event.layoutId);
    if (!layoutJson) {
      throw new Error('LAYOUT_NOT_FOUND');
    }
    const layout = JSON.parse(layoutJson);

    if (!layout.sections || layout.sections.length === 0) {
      throw new Error('INVALID_LAYOUT');
    }

    // Generate seats
    const seats = generateSeats(layout);

    // Insert seats
    await database.bulkCreateSeats(
      performanceId, // Use performanceId for seat assignment
      seats.map((s: any) => s.id)
    );

    return performanceId;
  }
}
