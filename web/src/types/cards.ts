export type CardCycle = import("@/lib/contracts").CardCycleDto;

export type CardCycleInfo = import("@/lib/contracts").CardCycleInfoDto;

export type CreditCard = import("@/lib/contracts").CreditCardDto;

export interface UpdateCreditCardInput {
  alias?: string;
  lastFour?: string;
  limit?: number;
  closingDay?: number;
  dueDay?: number;
  colorHex?: string | null;
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
