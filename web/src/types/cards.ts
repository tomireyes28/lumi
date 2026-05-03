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

export interface CardFormState {
  alias: string;
  setAlias: (value: string) => void;
  lastFour: string;
  setLastFour: (value: string) => void;
  colorHex: string;
  setColorHex: (value: string) => void;
  limit: string;
  setLimit: (value: string) => void;
  closingDay: string;
  setClosingDay: (value: string) => void;
  dueDay: string;
  setDueDay: (value: string) => void;
  isSubmitting: boolean;
}