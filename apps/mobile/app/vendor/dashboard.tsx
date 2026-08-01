import { Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function VendorDashboardScreen() {
  return (
    <Screen title="Vendor Dashboard" description="Mobile-first seller operations for orders, catalog, KYC, finance, and support.">
      <ModuleCard title="Vendor queues">
        <Text>• New orders</Text>
        <Text>• READY_TO_SHIP actions</Text>
        <Text>• Product moderation tasks</Text>
        <Text>• Payout and KYC status</Text>
      </ModuleCard>
    </Screen>
  );
}
