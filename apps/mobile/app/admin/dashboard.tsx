import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function AdminDashboardScreen() {
  const router = useRouter();
  const links = [["/admin/analytics", "Open analytics and customer insights"], ["/admin/newsletter", "Manage newsletter subscribers and broadcasts"], ["/admin/delivery-settings", "Configure delivery charges and service areas"], ["/admin/operations", "Open delivery retries, returns, payouts, and audit queues"], ["/admin/platform", "Payments, categories, marketing and audit"], ["/admin/categories", "Manage dynamic category attributes"], ["/admin/category-requests", "Review vendor category requests"], ["/admin/catalog", "Open product moderation queue"], ["/admin/content", "Open reviews and Q&A moderation"], ["/admin/trust", "Open users, vendors, KYC and trust cases"], ["/admin/promotions", "Open promotions and campaigns"], ["/admin/support", "Open customer support queue"]] as const;
  return <Screen title="Admin Dashboard" description="Task-oriented mobile admin shell for operations, finance, trust, and support teams."><ModuleCard title="Admin queues">{links.map(([href, label]) => <Pressable accessibilityRole="button" key={href} onPress={() => router.push(href)}><Text>{label} →</Text></Pressable>)}</ModuleCard></Screen>;
}
