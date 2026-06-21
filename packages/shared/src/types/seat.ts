export type SeatStatus = 'available' | 'selected' | 'booked' | 'reserved';

export type SpecialCondition =
  //| 'Absent' // Physically missing (column, passageway): while editing: ghost: while booking: hidden
  | 'Unavailable' // Broken / out of service
  | 'RestrictedView' // Obstructed sightline
  | 'Premium' // VIP / upsell tier
  | 'Impaired' // Reserved for wheelchair users
  | 'Staff' // Reserved for staff / press / ...
  | 'Baby' // Baby-cradle attachment seat
;

export interface GeneratedSeat {
  seatId: string; // Composite: "Platea-A-1"
  sectionId: string;
  sectionName: string;
  rowId: string;
  seatNumber: number;
  x: number; // Required for SVG positioning
  y: number; // Required for SVG positioning
  status?: SeatStatus;
  specialCondition?: SpecialCondition;
}
