export interface CreditCard {
  id: string;
  alias: string;
  lastFour: string;
  limit: number | string;
  closingDay: number;
  dueDay: number;
  colorHex: string | null;
  consumed?: number; 
}