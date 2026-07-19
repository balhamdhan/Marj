"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Sidebar from "@/components/Sidebar";

type InventoryItem = {
  id: string;
  user_id: string;
  product_name: string;
  stock_level: number;
  reorder_threshold: number;
  created_at: string;
};

type Shipment = {
  id: string;
  user_id: string;
  order_reference: string;
  supplier: string | null;
  status: "in_transit" | "delayed" | "customs_hold" | "delivered";
  expected_date: string | null;
  created_at: string;
};

export default function OperationsPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [productName, setProductName] = useState("");
  const [stockLevel, setStockLevel] = useState("");
  const [reorderThreshold, setReorderThreshold] = useState("");
  const [invError, setInvError] = useState<string | null>(null);
  const [invSaving, setInvSaving] = useState(false);

  const [orderRef, setOrderRef] = useState("");
  const [supplier, setSupplier] = useState("");
  const [shipStatus, setShipStatus] = useState<Shipment["status"]>("in_transit");
  const [expectedDate, setExpectedDate] = useState("");
  const [shipError, setShipError] = useState<string | null>(null);
  const [shipSaving, setShipSaving] = useState(false);

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
    setLoadingData(true);

    const { data: invData, error: invErr } = await supabase
      .from("inventory")
      .select("*")
      .order("product_name", { ascending: true });

    const { data: shipData, error: shipErr } = await supabase
      .from("shipments")
      .select("*")
      .order("expected_date", { ascending: true });

    if (!invErr && invData) setInventory(invData as InventoryItem[]);
    if (!shipErr && shipData) setShipments(shipData as Shipment[]);

    setLoadingData(false);
  }, []);

  useEffect(() => {
    if (!checkingAuth) loadData();
  }, [checkingAuth, loadData]);

  async function handleAddInventory(e: React.FormEvent) {
    e.preventDefault();
    setInvError(null);

    const stockNum = parseFloat(stockLevel);
    const thresholdNum = parseFloat(reorderThreshold);

    if (!productName.trim()) {
      setInvError("Product name is required.");
      return;
    }
    if (isNaN(stockNum) || stockNum < 0) {
      setInvError("Enter a valid stock level (0 or more).");
      return;
    }
    if (isNaN(thresholdNum) || thresholdNum < 0) {
      setInvError("Enter a valid reorder threshold (0 or more).");
      return;
    }

    setInvSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setInvError("Session expired ‚Äî please log in again.");
      setInvSaving(false);
      return;
    }

    const { error } = await supabase.from("inventory").insert({
      user_id: user.id,
      product_name: productName.trim(),
      stock_level: stockNum,
      reorder_threshold: thresholdNum,
    });

    setInvSaving(false);

    if (error) {
      setInvError(error.message);
      return;
    }

    setProductName("");
    setStockLevel("");
    setReorderThreshold("");
    await loadData();
  }

  async function handleAddShipment(e: React.FormEvent) {
    e.preventDefault();
    setShipError(null);

    if (!orderRef.trim()) {
      setShipError("Order reference is required.");
      return;
    }

    setShipSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setShipError("Session expired ‚Äî please log in again.");
      setShipSaving(false);
      return;
    }

    const { error } = await supabase.from("shipments").insert({
      user_id: user.id,
      order_reference: orderRef.trim(),
      supplier: supplier.trim() || null,
      status: shipStatus,
      expected_date: expectedDate || null,
    });

    setShipSaving(false);

    if (error) {
      setShipError(error.message);
      return;
    }

    setOrderRef("");
    setSupplier("");
    setShipStatus("in_transit");
    setExpectedDate("");
    await loadData();
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ink">
        <p className="text-muted text-sm">Checking session‚Ä¶</p>
      </div>
    );
  }

  function shipmentBadge(status: Shipment["status"]) {
    const map: Record<Shipment["status"], { label: string; className: string }> = {
      in_transit: { label: "In transit", className: "bg-emerald/15 text-emerald" },
      delayed: { label: "Delayed", className: "bg-brass/15 text-brass" },
      customs_hold: { label: "Customs hold", className: "bg-rust/15 text-rust" },
      delivered: { label: "Delivered", className: "bg-emerald/15 text-emerald" },
    };
    const m = map[status];
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.className}`}>
        {m.label}
      </span>
    );
  }

  return (
    <div className="flex min-h-screen bg-ink">
      <Sidebar />

      <main className="flex-1 p-10">
        <h1 className="font-display text-2xl font-semibold text-ivory mb-8">Operations</h1>

        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Add inventory */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-4">Add product</h3>
            <form onSubmit={handleAddInventory} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Product name"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Current stock level"
                value={stockLevel}
                onChange={(e) => setStockLevel(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory mono-num focus:outline-none focus:border-brass"
              />
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="Reorder threshold"
                value={reorderThreshold}
                onChange={(e) => setReorderThreshold(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory mono-num focus:outline-none focus:border-brass"
              />

              {invError && <div className="text-rust text-sm">{invError}</div>}

              <button
                type="submit"
                disabled={invSaving}
                className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
              >
                {invSaving ? "Saving‚Ä¶" : "Add product"}
              </button>
            </form>
          </div>

          {/* Add shipment */}
          <div className="bg-surface border border-border rounded-lg p-6">
            <h3 className="font-display text-lg font-semibold text-ivory mb-4">Add shipment</h3>
            <form onSubmit={handleAddShipment} className="space-y-3">
              <input
                type="text"
                required
                placeholder="Order reference (e.g. #4021)"
                value={orderRef}
                onChange={(e) => setOrderRef(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />
              <input
                type="text"
                placeholder="Supplier (optional)"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />
              <select
                value={shipStatus}
                onChange={(e) => setShipStatus(e.target.value as Shipment["status"])}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              >
                <option value="in_transit">In transit</option>
                <option value="delayed">Delayed</option>
                <option value="customs_hold">Customs hold</option>
                <option value="delivered">Delivered</option>
              </select>
              <input
                type="date"
                placeholder="Expected date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full bg-ink border border-border rounded px-3 py-2 text-sm text-ivory focus:outline-none focus:border-brass"
              />

              {shipError && <div className="text-rust text-sm">{shipError}</div>}

              <button
                type="submit"
                disabled={shipSaving}
                className="w-full bg-brass text-ink font-semibold text-sm rounded py-2.5 hover:bg-brassDim transition-colors disabled:opacity-60"
              >
                {shipSaving ? "Saving‚Ä¶" : "Add shipment"}
              </button>
            </form>
          </div>
        </div>

        {/* Inventory table */}
        <div className="bg-surface border border-border rounded-lg p-6 mb-8">
          <h3 className="font-display text-lg font-semibold text-ivory mb-4">
            Inventory status
          </h3>
          {loadingData ? (
            <p className="text-muted text-sm">Loading‚Ä¶</p>
          ) : inventory.length === 0 ? (
            <p className="text-muted text-sm">No products yet ‚Äî add your first one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="pb-2">Product</th>
                  <th className="pb-2">Stock level</th>
                  <th className="pb-2">Reorder threshold</th>
                  <th className="pb-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((item) => {
                  const low = item.stock_level <= item.reorder_threshold;
                  return (
                    <tr key={item.id} className="border-b border-border last:border-0">
                      <td className="py-2.5 text-ivory">{item.product_name}</td>
                      <td className="py-2.5 mono-num text-ivory">{item.stock_level}</td>
                      <td className="py-2.5 mono-num text-muted">{item.reorder_threshold}</td>
                      <td className="py-2.5">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                            low ? "bg-rust/15 text-rust" : "bg-emerald/15 text-emerald"
                          }`}
                        >
                          {low ? "Low stock" : "In stock"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Shipments table */}
        <div className="bg-surface border border-border rounded-lg p-6">
          <h3 className="font-display text-lg font-semibold text-ivory mb-4">
            Active shipments
          </h3>
          {loadingData ? (
            <p className="text-muted text-sm">Loading‚Ä¶</p>
          ) : shipments.length === 0 ? (
            <p className="text-muted text-sm">No shipments yet ‚Äî add your first one above.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted uppercase tracking-wide border-b border-border">
                  <th className="pb-2">Order</th>
                  <th className="pb-2">Supplier</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Expected</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="py-2.5 mono-num text-ivory">{s.order_reference}</td>
                    <td className="py-2.5 text-muted">{s.supplier || "‚Äî"}</td>
                    <td className="py-2.5">{shipmentBadge(s.status)}</td>
                    <td className="py-2.5 mono-num text-muted">{s.expected_date || "‚Äî"}</td>
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

