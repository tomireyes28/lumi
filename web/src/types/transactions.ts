export type Transaction = import("@/lib/contracts").TransactionDto;

export interface UpdateTransactionInput {
  amount?: number;
  categoryId?: string;
  note?: string | null;
  date?: string;
  creditCardId?: string | null;
}

export type PaginatedTransactionsResponse =
  import("@/lib/contracts").PaginatedTransactionsDto;
