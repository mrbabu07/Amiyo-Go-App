import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getVendorFinance } from "./operations.api";

export function VendorFinanceScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["vendor-finance"], queryFn: () => getVendorFinance(user!), enabled: Boolean(user) }); return <Screen title="Vendor finance" description="Balance is derived from the append-only vendor ledger.">{query.isLoading ? <ActivityIndicator /> : null}{query.error ? <Text>{query.error instanceof Error ? query.error.message : "Could not load finance"}</Text> : null}{query.data ? <><ModuleCard title={`${query.data.balance.amountMinor} ${query.data.balance.currency}`} meta="Available balance after payout reservations"><Text>{query.data.payoutRequests.length} payout request(s)</Text></ModuleCard>{query.data.entries.map((entry) => <ModuleCard key={entry.id} title={`${entry.direction === "CREDIT" ? "+" : "-"}${entry.amount.amountMinor} ${entry.amount.currency}`} meta={entry.entryType.replaceAll("_", " ")}><Text>{new Date(entry.createdAt).toLocaleString()}</Text></ModuleCard>)}</> : null}</Screen>; }
