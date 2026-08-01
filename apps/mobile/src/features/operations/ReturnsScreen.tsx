import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getReturns } from "./operations.api";

export function ReturnsScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["returns"], queryFn: () => getReturns(user!), enabled: Boolean(user) }); return <Screen title="Returns & refunds" description="Track every return review, pickup, inspection, and refund state.">{query.isLoading ? <ActivityIndicator /> : null}{query.error ? <Text>{query.error instanceof Error ? query.error.message : "Could not load returns"}</Text> : null}{query.data?.length === 0 ? <ModuleCard title="No returns"><Text>Your requested returns will appear here.</Text></ModuleCard> : null}{query.data?.map((item) => <ModuleCard key={item.id} title={item.reasonCode} meta={`${item.status.replaceAll("_", " ")} · ${item.requestedAmount.amountMinor} ${item.requestedAmount.currency}`}><Text>{item.items.length} item(s) · version {item.version}</Text>{item.approvedAmount ? <Text>Approved: {item.approvedAmount.amountMinor} {item.approvedAmount.currency}</Text> : null}</ModuleCard>)}</Screen>; }
