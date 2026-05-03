export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  colorHex: string | null;
  icon: string | null;
}

export interface CategoryFormState {
  name: string;
  setName: (value: string) => void;
  type: 'income' | 'expense';
  setType: (value: 'income' | 'expense') => void;
  colorHex: string;
  setColorHex: (value: string) => void;
  icon: string;
  setIcon: (value: string) => void;
  isSubmitting: boolean;
}