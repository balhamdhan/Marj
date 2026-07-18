export type Transaction = {
  id: string;
  user_id: string;
  type: "revenue" | "expense";
  amount: number;
  category: string | null;
  description: string | null;
  transaction_date: string;
  created_at: string;
};

export type Invoice = {
  id: string;
  user_id: string;
  client_name: string;
  amount: number;
  due_date: string | null;
  status: "paid" | "pending" | "overdue";
  created_at: string;
};
