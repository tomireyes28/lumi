export interface CalendarTransaction {
  id: string;
  date: string;
  amount: string;
  type: 'INCOME' | 'EXPENSE';
}

export interface CalendarReminder {
  id: string;
  title: string;
  amount: string | null;
  dueDate: string;
  isPaid: boolean;
}