import { v4 as uuidv4 } from "uuid";
import { t } from 'i18next';
import { database } from "../db/database";
import { generateSeats } from '../shared/types/layoutToSeats';
import { EventPerformance } from "../shared/types/event";

export class PerformanceService {
  static async createPerformance(
    eventId: string,
    date: string,
    startTime: string = '19:00', // TODO: to config
    endTime: string = '23:00', // TODO: to config
  ): Promise<string> {
    // Load event to get its layout
    if (!eventId) {
      throw new Error(t('Event id not found'));
    }
    const event = await database.getEventById(eventId);
    if (!event) throw new Error(t('Event not found'));

    // Get theater from event (assuming event has theaterId)
    if (!event.theaterId) {
      throw new Error(t('Theater id not found'));
    }
    const theater = await database.getTheaterById(event.theaterId);
    if (!theater) {
      throw new Error(t('Theater not fond'));
    }

    if (!theater.currentLayoutId) {
      throw new Error(t('Layout id not found'));
    }
    const layout = await database.getLayoutById(theater.currentLayoutId);
    if (!layout) {
      throw new Error(t('Layout not found'));
    }
    const layoutJSON = JSON.parse(layout.json);

    // if (!layout.sections || layout.sections.length === 0) {
    //   throw new Error(t('No sections in layout'));
    // }

    // Create performance object
    const performance: EventPerformance = {
      //id: performanceId,
      eventId: eventId,
      performanceDate: date ?? event.openingDate,
      startTime,
      endTime,
      availableSeats: 100, // TODO: calculate this from layout
      bookedSeats: 0,
      seatData: '{}', // We'll populate this later
      status: event.status, // Use event's status which is already typed correctly
    };

    // Create performance
    const performanceId = await database.createPerformance(performance);

    // Generate seats
    const seats = generateSeats(layoutJSON);

    // Insert seats
    await database.bulkCreateSeats(
      performanceId, // Use performanceId for seat assignment
      seats.map((s: any) => s.id)
    );

    return performanceId;
  }
}
