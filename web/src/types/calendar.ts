import { Category } from "./categories";
import { CreditCard } from "./cards";

export interface CalendarTransaction {
  id: string;
  date: string;
  amount: number | string;
  note?: string | null;
  category?: Category;
  creditCard?: CreditCard | null;
}

export interface CalendarReminder {
  id: string;
  title: string;
  amount: string | null;
  dueDate: string;
  isPaid: boolean;
}