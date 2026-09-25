export interface CardCycle {
  id: string;
  creditCardId: string;
  month: number;
  year: number;
  closingDate: string;
  dueDate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CardCycleInfo {
  month: number;
  year: number;
  closingDate: string;
  dueDate: string | null;
  isCustom: boolean;
  daysToClose: number;
}

export interface CreditCard {
  id: string;
  alias: string;
  lastFour: string;
  limit: number | string;
  closingDay: number;
  dueDay: number;
  colorHex: string | null;
  consumed?: number;
  currentCycle?: CardCycleInfo;
  cycles?: CardCycle[];
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