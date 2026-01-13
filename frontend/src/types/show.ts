export interface Show {
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
  showPosterUrl?: string;
  trailerUrl?: string;
  websiteUrl?: string;
  socialMediaLinks?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  cancellationReason?: string;
  maxCapacity?: number;
  contentWarnings?: string;
}

export interface ShowPerformance {
  id: string;
  showId: string;
  performanceDate: string;
  startTime: string;
  endTime?: string;
  availableSeats: number;
  bookedSeats: number;
  seatData: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ShowStats {
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
}

export interface ShowWithDetails extends Show {
  theater?: any;
  performances?: ShowPerformance[];
}
