import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function VendorDashboardScreen() {
  const router = useRouter();
  const links = [["/vendor/orders", "Open vendor orders and READY_TO_SHIP actions"], ["/vendor/products", "Manage products and moderation"], ["/vendor/bulk-products", "Bulk import or export product CSV"], ["/vendor/category-requests", "Request category access"], ["/vendor/inventory", "Manage stock and reservations"], ["/vendor/operations", "Reports, returns, vouchers and staff"], ["/vendor/engagement", "Open customer reviews and Q&A"], ["/vendor/finance", "Open ledger and payout status"], ["/vendor/settings", "Shop, KYC and payout settings"]] as const;
  return <Screen title="Vendor Dashboard" description="Mobile-first seller operations for orders, catalog, KYC, finance, and support."><ModuleCard title="Vendor queues">{links.map(([href, label]) => <Pressable accessibilityRole="button" key={href} onPress={() => router.push(href)}><Text>{label} →</Text></Pressable>)}</ModuleCard></Screen>;
}
