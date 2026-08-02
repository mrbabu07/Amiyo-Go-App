import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getLoyalty } from "./engagement.api";

export function LoyaltyScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["loyalty"], queryFn: () => getLoyalty(user!), enabled: Boolean(user) }); return <Screen title="Loyalty" description="A transparent points ledger. Earning and redemption activate after policy approval.">{query.isLoading ? <ActivityIndicator /> : null}{query.data ? <><ModuleCard title={`${query.data.pointsBalance} points`} meta={`Account version ${query.data.version}`}><Text>Current points balance</Text></ModuleCard>{query.data.transactions.map((row) => <ModuleCard key={row.id} title={`${Number(row.points) > 0 ? "+" : ""}${row.points}`} meta={row.entryType.replaceAll("_", " ")}><Text>{new Date(row.createdAt).toLocaleString()}</Text></ModuleCard>)}</> : null}</Screen>; }
