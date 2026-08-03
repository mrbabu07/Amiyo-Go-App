import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function AdminDashboardScreen() {
  const router = useRouter();
  return <Screen title="Admin Dashboard" description="Task-oriented mobile admin shell for operations, finance, trust, and support teams."><ModuleCard title="Admin queues"><Pressable accessibilityRole="button" onPress={() => router.push("/admin/operations")}><Text>Open delivery retries, returns, payouts, and audit queues →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/promotions")}><Text>Open promotions and campaigns →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/support")}><Text>Open customer support queue →</Text></Pressable><Text>Payment verification</Text><Text>Vendor KYC review</Text></ModuleCard></Screen>;
}
