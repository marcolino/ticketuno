import { Theater } from './theater';
export type EventStatus = 'scheduled' | 'in progress' | 'completed' | 'canceled';

export interface Event {
  id: string;
  title: string;
  description?: string;
  genres?: string[];
  durationMinutes?: number;
  intermissionCount?: number;
  rating?: string;
  language?: string;
  director?: string;
  playwright?: string;
  producer?: string;
  choreographer?: string;
  musicalDirector?: string;
  cast?: { role: string; name: string }[];
  theaterId: string;
  stageType?: string;
  openingDate?: string;
  closingDate?: string;
  isActive: boolean;
  baseTicketPrice: number;
  currency: string;
  isSoldOut: boolean;
  specialRequirements?: string;
  minimumAge?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  createdByUserId?: string;
  typicalStartTime?: string;
  typicalEndTime?: string;
  posterImage?: string;
  trailerUrl?: string;
  websiteUrl?: string;
  socialMediaLinks?: string;
  status?: EventStatus;
  canceled: number,
  cancelationReason?: string;
  maxCapacity?: number;
  contentWarnings?: string;
  acceptsCash?: Boolean;
}

export interface EventPerformance {
  id: string;
  eventId: string;
  performanceDate: string;
  startTime: string;
  endTime?: string;
  availableSeats?: number;
  bookedSeats?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventPerformanceWithSeatCounts extends EventPerformance {
  seatCounts?: {
    total: number;
    available: number;
    booked: number;
    reserved: number;
  };
}

export interface EventStats {
  id: string;
  title: string;
  description: string;
  theaterName: string;
  genres?: string[];
  openingDate?: string;
  closingDate?: string;
  baseTicketPrice: number;
  currency: string;
  nextPerformanceDate?: string;
  availablePerformances: number;
  status: string;
  posterImage?: string;
}

export interface EventWithDetails extends Event {
  theater?: Theater;
  performances?: EventPerformance[];
}

export interface EventOptions {
  pastToo?: boolean;
  canceledToo?: boolean;
}
