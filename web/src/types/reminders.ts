export interface Reminder {
  id: string;
  title: string;
  amount: string | null;
  dueDate: string;
  isPaid: boolean;
}

export interface ReminderFormState {
  title: string;
  setTitle: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  isSubmitting: boolean;
}