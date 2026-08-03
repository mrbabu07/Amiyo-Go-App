import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function VendorDashboardScreen() {
  const router = useRouter();
  return <Screen title="Vendor Dashboard" description="Mobile-first seller operations for orders, catalog, KYC, finance, and support."><ModuleCard title="Vendor queues"><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/orders")}><Text>Open vendor orders and READY_TO_SHIP actions →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/products")}><Text>Manage products and moderation →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/bulk-products")}><Text>Bulk import or export product CSV →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/inventory")}><Text>Manage stock and reservations →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/operations")}><Text>Reports, returns, vouchers and staff →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/engagement")}><Text>Open customer reviews and Q&A →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/finance")}><Text>Open ledger and payout status →</Text></Pressable><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/settings")}><Text>Shop, KYC and payout settings →</Text></Pressable></ModuleCard></Screen>;
}
