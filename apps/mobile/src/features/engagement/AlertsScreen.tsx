import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getAlerts } from "./engagement.api";

export function AlertsScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts(user!), enabled: Boolean(user) }); return <Screen title="Product alerts" description="Stock and target-price alerts for saved products.">{query.isLoading ? <ActivityIndicator /> : null}{query.data?.length === 0 ? <Text>No active alerts.</Text> : null}{query.data?.map((item) => <ModuleCard key={item.id} title={item.productName} meta={item.target ? `Target ${item.target.amountMinor} ${item.target.currency}` : "Notify when available"}><Text>Active</Text></ModuleCard>)}</Screen>; }
