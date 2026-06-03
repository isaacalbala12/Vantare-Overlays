export type AlertType = 'overtake' | 'pole' | 'fastest_lap';

export interface Alert {
  id: string;
  type: AlertType;
  timestamp: number;
  message: string;
  data: Record<string, unknown>;
}
