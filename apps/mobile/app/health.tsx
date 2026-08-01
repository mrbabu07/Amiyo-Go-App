import { useQuery } from "@tanstack/react-query";
import { Text } from "react-native";
import { healthResponseSchema } from "@amiyo/contracts";
import { ModuleCard } from "../src/ui/ModuleCard";
import { Screen } from "../src/ui/Screen";

async function fetchHealth() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/health`);
  const json = await response.json();
  return healthResponseSchema.parse(json);
}

export default function HealthScreen() {
  const query = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 1 });
  const statusText = query.isLoading
    ? "Checking..."
    : query.isError || !query.data
      ? "API unavailable"
      : `${query.data.service}: ${query.data.status}`;

  return (
    <Screen title="API Health" description="Uses the shared Zod health contract from packages/contracts.">
      <ModuleCard title="Health result">
        <Text>{statusText}</Text>
      </ModuleCard>
    </Screen>
  );
}
