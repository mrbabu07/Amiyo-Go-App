import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ActivityIndicator, Pressable, Text } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { firebaseAuth } from "../auth/firebase";
import { getAlerts, removeAlert } from "./engagement.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function AlertsScreen() { const user = firebaseAuth?.currentUser; const cache = useQueryClient(); const query = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts(user!), enabled: Boolean(user) }); const remove = useMutation({ mutationFn: (productId: string) => removeAlert(user!, productId), onSuccess: (data) => cache.setQueryData(["alerts"], data) }); return <Screen title="Product alerts" description="Stock and target-price alerts for saved products.">{query.isLoading ? <ActivityIndicator /> : null}{query.data?.length === 0 ? <Text>No active alerts.</Text> : null}{query.data?.map((item) => <ModuleCard key={item.id} title={item.productName} meta={item.target ? `Target ${money(item.target.amountMinor)}` : "Notify when available"}><Pressable disabled={remove.isPending} onPress={() => remove.mutate(item.productId)}><Text>Turn off alert</Text></Pressable></ModuleCard>)}</Screen>; }
