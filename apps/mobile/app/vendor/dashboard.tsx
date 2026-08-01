import { useRouter } from "expo-router";
import { Pressable, Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function VendorDashboardScreen() {
  const router = useRouter();
  return <Screen title="Vendor Dashboard" description="Mobile-first seller operations for orders, catalog, KYC, finance, and support."><ModuleCard title="Vendor queues"><Pressable accessibilityRole="button" onPress={() => router.push("/vendor/orders")}><Text>• Open vendor orders and READY_TO_SHIP actions →</Text></Pressable><Text>• Product moderation tasks</Text><Text>• Payout and KYC status</Text></ModuleCard></Screen>;
}
