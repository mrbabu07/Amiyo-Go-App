import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getAdminQueues } from "./operations.api";

export function AdminOperationsScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["admin-operations"], queryFn: () => getAdminQueues(user!), enabled: Boolean(user) }); return <Screen title="Operations queues" description="Returns, payouts, and financial audit activity in one mobile view.">{query.isLoading ? <ActivityIndicator /> : null}{query.error ? <Text>{query.error instanceof Error ? query.error.message : "Could not load queues"}</Text> : null}{query.data ? <><ModuleCard title={`Returns · ${query.data.returns.length}`}>{query.data.returns.slice(0, 8).map((item) => <Text key={item.id}>{item.status.replaceAll("_", " ")} · {item.reasonCode}</Text>)}</ModuleCard><ModuleCard title={`Payouts · ${query.data.payouts.length}`}>{query.data.payouts.slice(0, 8).map((item) => <Text key={item.id}>{item.status} · {item.vendor.legalName}</Text>)}</ModuleCard><ModuleCard title={`Audit activity · ${query.data.audit.length}`}>{query.data.audit.slice(0, 8).map((item) => <Text key={item.id}>{item.action} · {item.resourceType}</Text>)}</ModuleCard></> : null}</Screen>; }
