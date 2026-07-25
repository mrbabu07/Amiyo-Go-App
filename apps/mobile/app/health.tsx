import { useQuery } from "@tanstack/react-query";
import { SafeAreaView, StyleSheet, Text } from "react-native";
import { healthResponseSchema } from "@amiyo/contracts";

async function fetchHealth() {
  const baseUrl = process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000";
  const response = await fetch(`${baseUrl}/health`);
  const json = await response.json();
  return healthResponseSchema.parse(json);
}

export default function HealthScreen() {
  const query = useQuery({ queryKey: ["health"], queryFn: fetchHealth, retry: 1 });

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>API Health</Text>
      <Text style={styles.body}>
        {query.isLoading ? "Checking..." : query.isError ? "API unavailable" : `${query.data.service}: ${query.data.status}`}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 28, fontWeight: "800", color: "#0f172a" },
  body: { marginTop: 12, fontSize: 16, color: "#475569" }
});
