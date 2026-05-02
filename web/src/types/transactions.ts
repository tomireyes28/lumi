
import { Category } from "./categories";
import { CreditCard } from "./cards";

export interface Transaction {
  id: string;
  amount: number | string;
  date: string;
  note: string | null;
  category: Category;
  creditCard?: CreditCard | null;
}