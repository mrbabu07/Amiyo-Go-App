import { useQuery } from "@tanstack/react-query";
import { ActivityIndicator, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getPromotions } from "./engagement.api";

export function PromotionsScreen() { const user = firebaseAuth?.currentUser; const query = useQuery({ queryKey: ["admin-promotions"], queryFn: () => getPromotions(user!), enabled: Boolean(user) }); return <Screen title="Promotions" description="Versioned deterministic promotion rules and campaign windows.">{query.isLoading ? <ActivityIndicator /> : null}{query.data?.map((item) => <ModuleCard key={item.id} title={item.name} meta={`${item.status} · priority ${item.priority}`}><Text>{new Date(item.startsAt).toLocaleString()} → {new Date(item.endsAt).toLocaleString()}</Text></ModuleCard>)}</Screen>; }
