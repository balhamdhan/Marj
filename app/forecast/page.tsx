"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";
import type { Transaction, Invoice } from "@/lib/types";

type InventoryItem = {
  id: string;
  product_name: string;
  stock_level: number;
  reorder_threshold: number;
};

type Shipment = {
  id: string;
  order_reference: string;
  supplier: string | null;
  status: "in_transit" | "delayed" | "customs_hold" | "delivered";
  expected_date: string | null;
};

function formatKWD(n: number) {
  return n.toLocaleString("en-KW", { minimumFractionDigits: 3, maximumFractionDigits: 3 });
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
}

export default function ForecastPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);

  const [targetInput, setTargetInput] = useState("");
  const [targetSaving, setTargetSaving] = useState(false);
  const [targetError, setTargetError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
      } else {
        setCheckingAuth(false);
      }
    });
  }, [router]);

  const loadData = useCallback(async () => {
    setLoading(true);

    const [txRes, invRes, invtRes, shipRes, targetRes] = await Promise.all([
      supabase.from("transactions").select("*"),
      supabase.from("invoices").select("*"),
      supabase.from("inventory").select("*"),
      supabase.from("shipments").select("*"),
      supabase.from("targets").select("*").eq("month", monthStart(new Date())),
    ]);

    if (txRes.data) setTransactions(txRes.data as Transaction[]);
    if (invRes.data) setInvoices(invRes.data as Invoice[]);
    if (invtRes.data) setInventory(invtRes.data as InventoryItem[]);
    if (shipRes.data) setShipments(shipRes.data as Shipment[]);
    if (targetRes.data && targetRes.data.length > 0) {
      setTargetAmount(Number(targetRes.data[0].target_amount));
    } else {
      setTargetAmount(null);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth) loadData();
  }, [checkingAuth, loadData]);

  async function handleSetTarget(e: React.FormEvent) {
    e.preventDefault();
    setTargetError(null);

    const amountNum = parseFloat(targetInput);
    if (isNaN(amountNum) || amountNum <= 0) {
      setTargetError("Enter a valid target amount greater than 0.");
      return;
    }

    setTargetSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setTargetError("Session expired ‚Äî please log in again.");
      setTargetSaving(false);
      return;
    }

    // Upsert: update this month's target if it exists, otherwise create it
    const { error } = await supabase
      .from("targets")
      .upsert(
        { user_id: user.id, month: monthStart(new Date()), target_amount: amountNum },
        { onConflict: "user_id,month" }
      );

    setTargetSaving(false);

    if (error) {
      setTargetError(error.message);
      return;
    }

    setTargetInput("");
    await loadData();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-muted text-sm">Checking session‚Ä¶</p>
      </div>
    );
  }

  // --- Calculations ---
  const now = new Date();
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthRevenue = thisMonthTx
    .filter((t) => t.type === "revenue")
    .reduce((s, t) => s + Number(t.amount), 0);

  const pctOfTarget = targetAmount ? Math.min(100, (monthRevenue / targetAmount) * 100) : null;
  const gap = targetAmount ? Math.max(0, targetAmount - monthRevenue) : null;

  // Cash position: all-time revenue minus all-time expenses
  const allRevenue = transactions
    .filter((t) => t.type === "revenue")
    .reduce((s, t) => s + Number(t.amount), 0);
  const allExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const cashPosition = allRevenue - allExpenses;

  // Burn rate: average monthly expenses over the last 3 calendar months (including this one)
  const last3MonthKeys = [0, 1, 2].map((i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return `${d.getFullYear()}-${d.getMonth()}`;
  });
  const last3MonthExpenses = transactions
    .filter((t) => {
      const d = new Date(t.transaction_date);
      return t.type === "expense" && last3MonthKeys.includes(`${d.getFullYear()}-${d.getMonth()}`);
    })
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthlyBurn = last3MonthExpenses / 3;
  const dailyBurn = monthlyBurn / 30;
  const runwayDays = dailyBurn > 0 ? Math.round(cashPosition / dailyBurn) : null;

  // Insights, pulled from real Operations + Finances data
  const lowStockItems = inventory.filter((i) => i.stock_level <= i.reorder_threshold);
  const delayedShipments = shipments.filter(
    (s) => s.status === "delayed" || s.status === "customs_hold"
  );
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />

      <main className="flex-1 p-10">
        <h1 className="font-display text-2xl font-semibold text-ivory mb-8">Forecast</h1>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Forecast gap panel */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-1">
              Forecast gap
            </h3>
            <p className="text-xs text-muted mb-5">This month's target vs. actual</p>

            {targetAmount === null ? (
              <form onSubmit={handleSetTarget} className="space-y-3">
                <p className="text-sm text-muted mb-2">
                  No target set for this month yet.
                </p>
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  required
                  placeholder="Set this month's revenue target (KWD)"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory mono-num focus:outline-none focus:border-brass"
                />
                {targetError && <div className="text-rust text-sm">{targetError}</div>}
                <button
                  type="submit"
                  disabled={targetSaving}
                  className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
                >
                  {targetSaving ? "Saving‚Ä¶" : "Set target"}
                </button>
              </form>
            ) : (
              <>
                <div className="flex gap-8 mb-4">
                  <div>
                    <div className="text-xs text-muted uppercase mb-1">Target</div>
                    <div className="mono-num text-xl text-ivory">
                      {formatKWD(targetAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted uppercase mb-1">Actual so far</div>
                    <div className="mono-num text-xl text-brass font-semibold">
                      {formatKWD(monthRevenue)}
                    </div>
                  </div>
                </div>
                <div className="h-2.5 bg-surface2 rounded-full overflow-hidden mb-2">
                  <div
                    className="h-full bg-gradient-to-r from-brassDim to-brass rounded-full transition-all duration-700"
                    style={{ width: `${pctOfTarget}%` }}
                  />
                </div>
                <p className="text-xs text-muted">
                  {pctOfTarget?.toFixed(0)}% of target
                  {gap && gap > 0 ? ` ‚Äî ${formatKWD(gap)} KD gap remaining` : " ‚Äî target reached!"}
                </p>
              </>
            )}
          </div>

          {/* Cash runway panel */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-1">Cash runway</h3>
            <p className="text-xs text-muted mb-5">
              Based on current cash position and recent burn rate
            </p>

            <div className="text-center py-3">
              <div
                className={`mono-num text-4xl font-semibold ${
                  runwayDays === null
                    ? "text-muted"
                    : runwayDays < 21
                    ? "text-rust"
                    : "text-emerald"
                }`}
              >
                {runwayDays === null ? "‚Äî" : runwayDays}
              </div>
              <div className="text-xs text-muted uppercase tracking-wide mt-1">
                {runwayDays === null ? "Not enough data yet" : "days of runway"}
              </div>
            </div>

            <div className="border-t border-border pt-3 mt-3 flex justify-between text-xs text-muted">
              <span>Cash position: <span className="mono-num text-ivory">{formatKWD(cashPosition)} KD</span></span>
              <span>Avg. monthly burn: <span className="mono-num text-ivory">{formatKWD(monthlyBurn)} KD</span></span>
            </div>
          </div>
        </div>

        {/* Insights */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-display text-lg font-semibold text-ivory mb-1">Insights</h3>
          <p className="text-xs text-muted mb-4">
            Pulled directly from your Operations and Finances data
          </p>

          {loading ? (
            <p className="text-muted text-sm">Loading‚Ä¶</p>
          ) : lowStockItems.length === 0 &&
            delayedShipments.length === 0 &&
            overdueInvoices.length === 0 ? (
            <p className="text-muted text-sm">
              No flags right now ‚Äî nothing low on stock, delayed, or overdue.
            </p>
          ) : (
            <div>
              {lowStockItems.map((item) => (
                <div key={item.id} className="flex gap-3 py-3 border-t border-border first:border-0">
                  <div className="w-7 h-7 rounded bg-rust/15 text-rust flex items-center justify-center text-sm flex-shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ivory">
                      {item.product_name} is low on stock
                    </h4>
                    <p className="text-xs text-muted">
                      Currently at {item.stock_level}, at or below your reorder threshold of{" "}
                      {item.reorder_threshold}.
                    </p>
                  </div>
                </div>
              ))}

              {delayedShipments.map((s) => (
                <div key={s.id} className="flex gap-3 py-3 border-t border-border first:border-0">
                  <div className="w-7 h-7 rounded bg-rust/15 text-rust flex items-center justify-center text-sm flex-shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ivory">
                      Shipment {s.order_reference} is {s.status === "delayed" ? "delayed" : "held at customs"}
                    </h4>
                    <p className="text-xs text-muted">
                      {s.supplier ? `From ${s.supplier}. ` : ""}
                      {s.expected_date ? `Expected ${s.expected_date}.` : ""}
                    </p>
                  </div>
                </div>
              ))}

              {overdueInvoices.map((inv) => (
                <div key={inv.id} className="flex gap-3 py-3 border-t border-border first:border-0">
                  <div className="w-7 h-7 rounded bg-rust/15 text-rust flex items-center justify-center text-sm flex-shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-ivory">
                      {inv.client_name} invoice is overdue
                    </h4>
                    <p className="text-xs text-muted">
                      {formatKWD(Number(inv.amount))} KD, due {inv.due_date || "‚Äî"}.
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

