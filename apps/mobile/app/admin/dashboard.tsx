import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function AdminDashboardScreen() {
  const router = useRouter();
  return <Screen title="Admin Dashboard" description="Task-oriented mobile admin shell for operations, finance, trust, and support teams."><ModuleCard title="Admin queues"><Pressable accessibilityRole="button" onPress={() => router.push("/admin/analytics")}><Text>Open analytics and customer insights →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/operations")}><Text>Open delivery retries, returns, payouts, and audit queues →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/platform")}><Text>Payments, categories, marketing and audit →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/categories")}><Text>Manage dynamic category attributes →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/catalog")}><Text>Open product moderation queue →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/content")}><Text>Open reviews and Q&A moderation →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/trust")}><Text>Open users, vendors, KYC and trust cases →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/promotions")}><Text>Open promotions and campaigns →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/admin/support")}><Text>Open customer support queue →</Text></Pressable></ModuleCard></Screen>;
}
