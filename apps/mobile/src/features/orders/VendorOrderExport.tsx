import { Platform, Pressable, Share, Text } from "react-native";
import { useState } from "react";
import { colors, spacing } from "../../ui/tokens";
import { vendorOrdersCsv } from "./vendor-orders-csv";

export function VendorOrderExport({ orders, selected }: { orders: Parameters<typeof vendorOrdersCsv>[0]; selected: boolean }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function exportOrders() {
    if (busy || !orders.length) return;
    setBusy(true); setError("");
    try {
      const csv = vendorOrdersCsv(orders);
      if (Platform.OS === "web") {
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
        const link = document.createElement("a");
        try { link.href = url; link.download = "amiyo-seller-orders.csv"; document.body.appendChild(link); link.click(); }
        finally { link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
      } else await Share.share({ title: "Amiyo seller orders CSV", message: csv });
    } catch (failure) { setError(failure instanceof Error ? failure.message : "Export failed"); }
    finally { setBusy(false); }
  }
  return <><Pressable accessibilityRole="button" disabled={busy || !orders.length} onPress={exportOrders} style={{ backgroundColor: colors.primarySoft, borderRadius: 10, minHeight: 44, padding: spacing.md, opacity: busy || !orders.length ? .5 : 1 }}><Text style={{ color: colors.primary }}>{busy ? "Exporting…" : `${Platform.OS === "web" ? "Download" : "Share"} ${selected ? "selected" : "visible"} orders CSV (${orders.length})`}</Text></Pressable>{error ? <Text accessibilityRole="alert" style={{ color: colors.danger }}>{error}</Text> : null}</>;
}
