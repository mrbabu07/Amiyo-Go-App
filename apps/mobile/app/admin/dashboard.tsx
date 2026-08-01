import { Text } from "react-native";
import { ModuleCard } from "../../src/ui/ModuleCard";
import { Screen } from "../../src/ui/Screen";

export default function AdminDashboardScreen() {
  return (
    <Screen title="Admin Dashboard" description="Task-oriented mobile admin shell for operations, finance, trust, and support teams.">
      <ModuleCard title="Admin queues">
        <Text>• Payment verification</Text>
        <Text>• Vendor KYC review</Text>
        <Text>• Logistics exceptions</Text>
        <Text>• Audit and platform health</Text>
      </ModuleCard>
    </Screen>
  );
}
