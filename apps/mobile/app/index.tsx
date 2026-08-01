import { Link } from "expo-router";
import { Text } from "react-native";
import { ModuleCard } from "../src/ui/ModuleCard";
import { Screen } from "../src/ui/Screen";

const modules = [
  "Customer discovery",
  "Vendor operations",
  "Admin task queues",
  "Checkout and delivery",
  "Support and notifications"
];

export default function HomeScreen() {
  return (
    <Screen
      eyebrow="Amiyo-Go Mobile"
      title="Modular production rebuild"
      description="React Native shell ready for role-aware customer, vendor, admin, and support flows."
    >
      <ModuleCard title="Phase 1 modules" meta="Role-aware navigation and shared contracts are wired first.">
        {modules.map((moduleName) => (
          <Text key={moduleName}>• {moduleName}</Text>
        ))}
      </ModuleCard>
      <Link href="/health">Open API health check screen</Link>
      <Link href="/customer/home">Customer home</Link>
      <Link href="/vendor/dashboard">Vendor dashboard</Link>
      <Link href="/admin/dashboard">Admin dashboard</Link>
    </Screen>
  );
}
