import { Link } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const modules = [
  "Customer discovery",
  "Vendor operations",
  "Admin task queues",
  "Checkout and delivery",
  "Support and notifications"
];

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.eyebrow}>Amiyo-Go Mobile</Text>
        <Text style={styles.title}>Modular production rebuild</Text>
        <Text style={styles.body}>
          React Native shell ready for role-aware customer, vendor, admin, and support flows.
        </Text>
        <View style={styles.card}>
          {modules.map((moduleName) => (
            <Text key={moduleName} style={styles.item}>• {moduleName}</Text>
          ))}
        </View>
        <Link href="/health" style={styles.link}>Open API health check screen</Link>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f8fafc" },
  container: { padding: 24, gap: 16 },
  eyebrow: { color: "#0f766e", fontWeight: "700", letterSpacing: 1 },
  title: { color: "#0f172a", fontSize: 32, fontWeight: "800", lineHeight: 38 },
  body: { color: "#475569", fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: "#ffffff", borderRadius: 20, padding: 18, gap: 10 },
  item: { color: "#1e293b", fontSize: 16 },
  link: { color: "#2563eb", fontWeight: "700", marginTop: 8 }
});
