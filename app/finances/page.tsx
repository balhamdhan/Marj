"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import type { Transaction, Invoice } from "@/lib/types";

const EXPENSE_CATEGORIES = ["Inventory", "Salaries", "Rent", "Logistics", "Marketing", "Other"];
const REVENUE_CATEGORIES = ["Sales", "Services", "Other"];

function formatKWD(n: number) {
  return n.toLocaleString("en-KW", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

export default function FinancesPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [txType, setTxType] = useState<"revenue" | "expense">("revenue");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState(REVENUE_CATEGORIES[0]);
  const [txDescription, setTxDescription] = useState("");
  const [txDate, setTxDate] = useState(new Date().toISOString().slice(0, 10));
  const [txError, setTxError] = useState<string | null>(null);
  const [txSaving, setTxSaving] = useState(false);

  const [invClient, setInvClient] = useState("");
  const [invAmount, setInvAmount] = useState("");
  const [invDueDate, setInvDueDate] = useState("");
  const [invStatus, setInvStatus] = useState<"paid" | "pending" | "overdue">("pending");
  const [invError, setInvError] = useState<string | null>(null);
  const [invSaving, setInvSaving] = useState(false);

  // --- Auth guard ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  // --- Data fetching ---
  const loadData = useCallback(async () => {
    setLoadingData(true);

    const { data: txData, error: txErr } = await supabase
      .from("transactions")
      .select("*")
      .order("transaction_date", { ascending: false });

    const { data: invData, error: invErr } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (!txErr && txData) setTransactions(txData as Transaction[]);
    if (!invErr && invData) setInvoices(invData as Invoice[]);

    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth) {
      loadData();
    }
  }, [checkingAuth, loadData]);

  // --- Add transaction ---
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault();
    setTxError(null);

    const amountNum = parseFloat(txAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTxError("Enter a valid amount greater than 0.");
      return;
    }

    setTxSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTxError("Session expired — please log in again.");
      setTxSaving(false);
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: user.id,
      type: txType,
      amount: amountNum,
      category: txCategory,
      description: txDescription || null,
      transaction_date: txDate,
    });

    setTxSaving(false);

    if (error) {
      setTxError(error.message);
      return;
    }

    setTxAmount("");
    setTxDescription("");
    await loadData();
  }

  // --- Add invoice ---
  async function handleAddInvoice(e: React.FormEvent) {
    e.preventDefault();
    setInvError(null);

    const amountNum = parseFloat(invAmount);
    if (!invClient.trim()) {
      setInvError("Client name is required.");
      return;
    }
    if (isNaN(amountNum) || amountNum <= 0) {
      setInvError("Enter a valid invoice amount greater than 0.");
      return;
    }

    setInvSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setInvError("Session expired — please log in again.");
      setInvSaving(false);
      return;
    }

    const { error } = await supabase.from("invoices").insert({
      user_id: user.id,
      client_name: invClient.trim(),
      amount: amountNum,
      due_date: invDueDate || null,
      status: invStatus,
    });

    setInvSaving(false);

    if (error) {
      setInvError(error.message);
      return;
    }

    setInvClient("");
    setInvAmount("");
    setInvDueDate("");
    setInvStatus("pending");
    await loadData();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-muted text-sm">Checking session…</p>
      </div>
    );
  }

  // --- KPI calculations (current calendar month, from real fetched data) ---
  const now = new Date();
  const monthTx = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const totalRevenue = monthTx
    .filter((t) => t.type === "revenue")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalExpenses = monthTx
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const netPosition = totalRevenue - totalExpenses;

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />

      <main className="flex-1 p-10">
        <h1 className="font-display text-2xl font-semibold text-ivory mb-8">Finances</h1>

        {/* KPI row */}
        <div className="grid grid-cols-3 gap-px bg-border border border-border rounded-lg overflow-hidden mb-8">
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              Revenue (this month)
            </div>
            <div className="mono-num text-xl font-semibold text-ivory">
              {formatKWD(totalRevenue)} <span className="text-sm text-muted">KD</span>
            </div>
          </div>
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              Expenses (this month)
            </div>
            <div className="mono-num text-xl font-semibold text-ivory">
              {formatKWD(totalExpenses)} <span className="text-sm text-muted">KD</span>
            </div>
          </div>
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">Net position</div>
            <div
              className={`mono-num text-xl font-semibold ${
                netPosition >= 0 ? "text-emerald" : "text-rust"
              }`}
            >
              {formatKWD(netPosition)} <span className="text-sm text-muted">KD</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Add transaction form */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-4">
              Add transaction
            </h3>
            <form onSubmit={handleAddTransaction} className="space-y-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTxType("revenue");
                    setTxCategory(REVENUE_CATEGORIES[0]);
                  }}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    txType === "revenue"
                      ? "bg-emerald text-ink"
                      : "bg-surface2 text-muted"
                  }`}
                >
                  Revenue
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTxType("expense");
                    setTxCategory(EXPENSE_CATEGORIES[0]);
                  }}
                  className={`flex-1 py-2 rounded text-sm font-medium ${
                    txType === "expense" ? "bg-rust text-ivory" : "bg-surface2 text-muted"
                  }`}
                >
                  Expense
                </button>
              </div>

              <input
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="Amount (KWD)"
                value={txAmount}
                onChange={(e) => setTxAmount(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory mono-num focus:outline-none focus:border-brass"
              />

              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              >
                {(txType === "revenue" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="Description (optional)"
                value={txDescription}
                onChange={(e) => setTxDescription(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />

              <input
                type="date"
                required
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />

              {txError && <div className="text-rust text-sm">{txError}</div>}

              <button
                type="submit"
                disabled={txSaving}
                className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
              >
                {txSaving ? "Saving…" : "Add transaction"}
              </button>
            </form>
          </div>

          {/* Add invoice form */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-4">Add invoice</h3>
            <form onSubmit={handleAddInvoice} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Client name"
                value={invClient}
                onChange={(e) => setInvClient(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />
              <input
                type="number"
                step="0.001"
                min="0"
                required
                placeholder="Amount (KWD)"
                value={invAmount}
                onChange={(e) => setInvAmount(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory mono-num focus:outline-none focus:border-brass"
              />
              <input
                type="date"
                placeholder="Due date"
                value={invDueDate}
                onChange={(e) => setInvDueDate(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />
              <select
                value={invStatus}
                onChange={(e) => setInvStatus(e.target.value as "paid" | "pending" | "overdue")}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="overdue">Overdue</option>
              </select>

              {invError && <div className="text-rust text-sm">{invError}</div>}

              <button
                type="submit"
                disabled={invSaving}
                className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
              >
                {invSaving ? "Saving…" : "Add invoice"}
              </button>
            </form>
          </div>
        </div>

        {/* Transactions table */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="font-display text-lg font-semibold text-ivory mb-4">
            Recent transactions
          </h3>
          {loadingData ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : transactions.length === 0 ? (
            <p className="text-muted text-sm">
              No transactions yet — add your first one above.
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Description</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 mono-num text-muted">{t.transaction_date}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          t.type === "revenue"
                            ? "bg-emerald/15 text-emerald"
                            : "bg-rust/15 text-rust"
                        }`}
                      >
                        {t.type}
                      </span>
                    </td>
                    <td className="py-2.5 text-ivory">{t.category}</td>
                    <td className="py-2.5 text-muted">{t.description || "—"}</td>
                    <td className="py-2.5 text-right mono-num text-ivory">
                      {formatKWD(Number(t.amount))} KD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Invoices table */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-display text-lg font-semibold text-ivory mb-4">Invoices</h3>
          {loadingData ? (
            <p className="text-muted text-sm">Loading…</p>
          ) : invoices.length === 0 ? (
            <p className="text-muted text-sm">No invoices yet — add your first one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="pb-2">Client</th>
                  <th className="pb-2">Due date</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 text-ivory">{inv.client_name}</td>
                    <td className="py-2.5 mono-num text-muted">{inv.due_date || "—"}</td>
                    <td className="py-2.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                          inv.status === "paid"
                            ? "bg-emerald/15 text-emerald"
                            : inv.status === "overdue"
                            ? "bg-rust/15 text-rust"
                            : "bg-brass/15 text-brass"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-right mono-num text-ivory">
                      {formatKWD(Number(inv.amount))} KD
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
}
