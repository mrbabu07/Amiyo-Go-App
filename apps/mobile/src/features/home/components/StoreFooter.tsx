import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors, radius, spacing } from "../../../ui/tokens";

const links = [{ label: "About", href: "/about" }, { label: "Contact", href: "/contact" }, { label: "Support", href: "/support" }, { label: "Privacy", href: "/privacy" }, { label: "Terms", href: "/terms" }, { label: "Returns", href: "/returns" }];

export function StoreFooter() {
  const router = useRouter();
  return <View style={styles.footer}><Text style={styles.brand}>Amiyo-Go</Text><Text style={styles.tagline}>A connected marketplace for customers and local sellers across Bangladesh.</Text><View style={styles.links}>{links.map((link) => <Pressable key={link.href} onPress={() => router.push(link.href as never)} style={styles.link}><Text style={styles.linkText}>{link.label}</Text></Pressable>)}</View><Text style={styles.copyright}>© {new Date().getFullYear()} Amiyo-Go. All rights reserved.</Text></View>;
}

const styles = StyleSheet.create({ footer: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, marginTop: spacing.lg, padding: spacing.xl }, brand: { color: "#fff", fontSize: 24, fontWeight: "700" }, tagline: { color: "#cbd5e1", lineHeight: 20, marginTop: spacing.sm, maxWidth: 520, textAlign: "center" }, links: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, justifyContent: "center", marginTop: spacing.lg }, link: { borderColor: "#475569", borderRadius: radius.pill, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 8 }, linkText: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" }, copyright: { color: "#94a3b8", fontSize: 10, marginTop: spacing.lg } });
