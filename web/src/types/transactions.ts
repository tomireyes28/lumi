import { Category } from "./categories";
import { CreditCard } from "./cards";

export interface Transaction {
  id: string;
  amount: number | string;
  date: string;
  purchaseDate?: string | null;
  statementYear?: number | null;
  statementMonth?: number | null;
  statementClosingDate?: string | null;
  paymentDueDate?: string | null;
  installmentNumber?: number | null;
  installmentCount?: number | null;
  note: string | null;
  paymentMethod?: "cash" | "credit_card";
  category: Category;
  creditCard?: CreditCard | null;
}

export interface UpdateTransactionInput {
  amount?: number;
  categoryId?: string;
  note?: string | null;
  date?: string;
  creditCardId?: string | null;
}

export interface PaginatedTransactionsResponse {
  data: Transaction[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
