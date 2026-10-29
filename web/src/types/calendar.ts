import { Category } from './categories';
import { CreditCard } from './cards';
import type { Reminder } from './reminders';

export interface CalendarTransaction {
  id: string;
  date: string;
  amount: number | string;
  note?: string | null;
  category?: Category;
  creditCard?: CreditCard | null;
}

export type CalendarReminder = Reminder;
