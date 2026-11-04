export interface Reminder {
  id: string;
  title: string;
  amount: string | number | null;
  dueDate: string;
  isPaid: boolean;
  isRecurring?: boolean;
}

export interface UpdateReminderInput {
  title?: string;
  amount?: number | null;
  dueDate?: string;
  isRecurring?: boolean;
}

export interface ReminderFormState {
  title: string;
  setTitle: (value: string) => void;
  amount: string;
  setAmount: (value: string) => void;
  dueDate: string;
  setDueDate: (value: string) => void;
  isRecurring?: boolean;
  setIsRecurring?: (value: boolean) => void;
  isSubmitting: boolean;
}
