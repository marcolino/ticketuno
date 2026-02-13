export interface Event {
  id: string;
  title: string;
  description?: string;
  genre?: string;
  durationMinutes?: number;
  intermissionCount?: number;
  rating?: string;
  language?: string;
  director?: string;
  playwright?: string;
  producer?: string;
  choreographer?: string;
  musicalDirector?: string;
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
  createdByUserId?: string;
  typicalStartTime?: string;
  typicalEndTime?: string;
  posterImage?: string;
  trailerUrl?: string;
  websiteUrl?: string;
  socialMediaLinks?: string;
  status: 'scheduled' | 'in progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
  maxCapacity?: number;
  contentWarnings?: string;
}

export interface EventPerformance {
  id: string;
  eventId: string;
  performanceDate: string;
  startTime: string;
  endTime?: string;
  // availableSeats?: number; // Optional (calculated)
  // bookedSeats?: number; // Optional (calculated)
  //seatData: string; // JSON string of seat statuses
  status: 'scheduled' | 'in progress' | 'completed' | 'cancelled';
  availableSeats?: number;
  bookedSeats?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface EventWithTheater extends Event {
  theaterName: string;
  totalSeats: number;
}

export interface EventStats {
  id: string;
  title: string;
  theaterName: string;
  genre?: string;
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
  theater?: any;
  performances?: EventPerformance[];
}
