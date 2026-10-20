import type { User } from "@firebase/auth";
import { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { vendorStatementQuerySchema } from "@amiyo/contracts";
import { getVendorChargeReport, getVendorCommissionInvoice, getVendorStatement } from "./operations.api";
import { commissionInvoiceHtml } from "../orders/commission-invoice-html";
import { chargeReportHtml } from "../orders/charge-report-html";
import { shareDocumentPdf } from "../orders/document-export";
import { statementHtml } from "../orders/statement-html";
import { colors, spacing } from "../../ui/tokens";

export function VendorStatementExport({ user, vendorId }: { user: User; vendorId: string }) {
  const [month, setMonth] = useState(() => new Date(Date.now() + 6 * 3600000).toISOString().slice(0, 7));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const exportStatement = async (kind: "statement" | "charges" | "commission-invoice" = "statement") => {
    if (busy) return;
    if (!vendorStatementQuerySchema.safeParse({ month }).success) { setError("Enter a valid month as YYYY-MM, for example 2026-09."); return; }
    setBusy(true); setError("");
    try {
      const html = kind === "commission-invoice" ? commissionInvoiceHtml(await getVendorCommissionInvoice(user, month, vendorId)) : kind === "charges" ? chargeReportHtml(await getVendorChargeReport(user, month, vendorId)) : statementHtml(await getVendorStatement(user, month, vendorId));
      await shareDocumentPdf(html, `Amiyo ${kind} ${month}`);
    }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Statement export failed."); }
    finally { setBusy(false); }
  };
  return <View style={styles.panel}>
    <Text style={styles.title}>Monthly seller statement</Text>
    <Text style={styles.text}>Month (YYYY-MM), Bangladesh time</Text>
    <TextInput accessibilityLabel="Statement month" value={month} onChangeText={setMonth} editable={!busy} maxLength={7} placeholder="YYYY-MM" style={styles.input} />
    <Text style={styles.text}>Opening balance, period credits/debits and closing balance. This is not a tax invoice.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => exportStatement()} style={styles.button}><Text style={styles.buttonText}>{busy ? "Preparing statement…" : Platform.OS === "web" ? "Print / Save statement PDF" : "Share statement PDF"}</Text></Pressable>
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <Text style={styles.text}>Posted commission and refund reversals, by settlement month. Excludes shipping and VAT.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => exportStatement("commission-invoice")} style={styles.button}><Text style={styles.buttonText}>{busy ? "Preparing export..." : "Export settled commission invoice"}</Text></Pressable>
    <Text style={styles.text}>Commission assessment by order month, excluding cancelled/rejected packages. Not a settled-charge or tax invoice.</Text>
    <Pressable accessibilityRole="button" disabled={busy} onPress={() => exportStatement("charges")} style={styles.button}><Text style={styles.buttonText}>{busy ? "Preparing export..." : Platform.OS === "web" ? "Print / Save commission report" : "Share commission report"}</Text></Pressable>
  </View>;
}
const styles = StyleSheet.create({ panel: { backgroundColor: colors.surface, padding: spacing.md, gap: spacing.sm, borderRadius: 12 }, title: { color: colors.text, fontSize: 18, fontWeight: "600" }, text: { color: colors.muted }, input: { color: colors.text, borderColor: colors.border, borderWidth: 1, padding: 12, minHeight: 44 }, button: { backgroundColor: colors.primary, padding: 14, minHeight: 44, borderRadius: 8 }, buttonText: { color: "#fff", fontWeight: "600" }, error: { color: colors.danger } });
