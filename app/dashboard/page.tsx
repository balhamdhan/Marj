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

export default function DashboardPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [targetAmount, setTargetAmount] = useState<number | null>(null);

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
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth) loadData();
  }, [checkingAuth, loadData]);

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-muted text-sm">Checking session‚Ä¶</p>
      </div>
    );
  }

  const now = new Date();
  const thisMonthTx = transactions.filter((t) => {
    const d = new Date(t.transaction_date);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  });
  const monthRevenue = thisMonthTx
    .filter((t) => t.type === "revenue")
    .reduce((s, t) => s + Number(t.amount), 0);
  const monthExpenses = thisMonthTx
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const netPosition = monthRevenue - monthExpenses;
  const pctOfTarget = targetAmount ? Math.min(100, (monthRevenue / targetAmount) * 100) : null;

  const lowStockItems = inventory.filter((i) => i.stock_level <= i.reorder_threshold);
  const delayedShipments = shipments.filter(
    (s) => s.status === "delayed" || s.status === "customs_hold"
  );
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const totalFlags = lowStockItems.length + delayedShipments.length + overdueInvoices.length;

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />

      <main className="flex-1 p-10">
        <h1 className="font-display text-2xl font-semibold text-ivory mb-8">Dashboard</h1>

        {/* KPI row */}
        <div className="grid grid-cols-4 gap-px bg-border border border-border rounded-lg overflow-hidden mb-8">
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              Revenue (this month)
            </div>
            <div className="mono-num text-xl font-semibold text-ivory">
              {formatKWD(monthRevenue)} <span className="text-sm text-muted">KD</span>
            </div>
          </div>
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              Expenses (this month)
            </div>
            <div className="mono-num text-xl font-semibold text-ivory">
              {formatKWD(monthExpenses)} <span className="text-sm text-muted">KD</span>
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
          <div className="bg-surface p-5">
            <div className="text-xs text-muted uppercase tracking-wide mb-2">
              Target progress
            </div>
            <div className="mono-num text-xl font-semibold text-brass">
              {pctOfTarget === null ? "No target set" : `${pctOfTarget.toFixed(0)}%`}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-6">
          {/* Quick links */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-4">
              Jump to a module
            </h3>
            <div className="space-y-2">
              <a
                href="/finances"
                className="block bg-ink border border-border rounded px-4 py-3 text-sm text-ivory hover:border-brass transition-colors"
              >
                Finances ‚Äî transactions &amp; invoices
              </a>
              <a
                href="/operations"
                className="block bg-ink border border-border rounded px-4 py-3 text-sm text-ivory hover:border-brass transition-colors"
              >
                Operations ‚Äî inventory &amp; shipments
              </a>
              <a
                href="/forecast"
                className="block bg-ink border border-border rounded px-4 py-3 text-sm text-ivory hover:border-brass transition-colors"
              >
                Forecast ‚Äî targets &amp; cash runway
              </a>
            </div>
          </div>

          {/* Top insights */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-1">
              What needs attention
            </h3>
            <p className="text-xs text-muted mb-4">
              {loading
                ? "Loading‚Ä¶"
                : totalFlags === 0
                ? "Nothing flagged right now."
                : `${totalFlags} item${totalFlags === 1 ? "" : "s"} worth a look`}
            </p>

            {!loading && totalFlags === 0 && (
              <p className="text-sm text-muted">
                No low stock, delayed shipments, or overdue invoices right now.
              </p>
            )}

            {!loading && lowStockItems.slice(0, 1).map((item) => (
              <div key={item.id} className="flex gap-3 py-2.5 border-t border-border first:border-0">
                <div className="w-6 h-6 rounded bg-rust/15 text-rust flex items-center justify-center text-xs flex-shrink-0">
                  !
                </div>
                <p className="text-sm text-ivory">
                  <span className="font-semibold">{item.product_name}</span> is low on stock
                </p>
              </div>
            ))}

            {!loading && delayedShipments.slice(0, 1).map((s) => (
              <div key={s.id} className="flex gap-3 py-2.5 border-t border-border first:border-0">
                <div className="w-6 h-6 rounded bg-rust/15 text-rust flex items-center justify-center text-xs flex-shrink-0">
                  !
                </div>
                <p className="text-sm text-ivory">
                  Shipment <span className="font-semibold">{s.order_reference}</span> is{" "}
                  {s.status === "delayed" ? "delayed" : "held at customs"}
                </p>
              </div>
            ))}

            {!loading && overdueInvoices.slice(0, 1).map((inv) => (
              <div key={inv.id} className="flex gap-3 py-2.5 border-t border-border first:border-0">
                <div className="w-6 h-6 rounded bg-rust/15 text-rust flex items-center justify-center text-xs flex-shrink-0">
                  !
                </div>
                <p className="text-sm text-ivory">
                  <span className="font-semibold">{inv.client_name}</span> invoice is overdue
                </p>
              </div>
            ))}

            {!loading && totalFlags > 3 && (
              <a href="/forecast" className="block text-xs text-brass mt-3 hover:underline">
                See all {totalFlags} on the Forecast page ‚Üí
              </a>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

