import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ModuleCard } from "../../ui/ModuleCard";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";

const lessons = [
  { title: "Launch your shop", description: "Complete profile, KYC and payout setup before publishing products.", icon: "storefront-outline", href: "/vendor/shop" },
  { title: "Create high-converting listings", description: "Use accurate categories, clear media, variants and stock information.", icon: "images-outline", href: "/vendor/products/add" },
  { title: "Process orders correctly", description: "Accept orders, prepare packages and move them to ready-to-ship on time.", icon: "bag-check-outline", href: "/vendor/orders" },
  { title: "Handle returns professionally", description: "Review reasons and evidence while following marketplace return policy.", icon: "return-down-back-outline", href: "/vendor/returns" },
  { title: "Grow with promotions", description: "Create seller vouchers and monitor campaign performance responsibly.", icon: "megaphone-outline", href: "/vendor/marketing" },
  { title: "Build customer trust", description: "Answer product questions, reviews and messages quickly and clearly.", icon: "chatbubbles-outline", href: "/vendor/questions" }
] as const;
export function VendorUniversityScreen() {
  const router = useRouter();
  return <Screen eyebrow="SELLER CENTER" title="Seller University" description="Practical guidance for running a trusted, high-performing Amiyo-Go shop.">
    <View style={styles.hero}><View style={styles.heroIcon}><Ionicons color="#fff" name="school-outline" size={30} /></View><View style={styles.heroCopy}><Text style={styles.heroTitle}>Start with the seller essentials</Text><Text style={styles.heroText}>Follow each module in order, then use live reports to improve fulfilment and customer experience.</Text></View></View>
    <View style={styles.grid}>{lessons.map((lesson, index) => <ModuleCard key={lesson.title} title={`${index + 1}. ${lesson.title}`} meta="ESSENTIAL MODULE"><View style={styles.lesson}><View style={styles.lessonIcon}><Ionicons color={colors.primary} name={lesson.icon} size={24} /></View><Text style={styles.description}>{lesson.description}</Text></View><Pressable onPress={() => router.push(lesson.href as never)} style={styles.button}><Text style={styles.buttonText}>Open workspace</Text><Ionicons color="#fff" name="arrow-forward" size={17} /></Pressable></ModuleCard>)}</View>
    <ModuleCard title="Seller success checklist" meta="Keep these standards active"><Check text="Maintain accurate stock for every variant" /><Check text="Ship within the promised handling time" /><Check text="Reply to customer questions and messages" /><Check text="Review returns and finance reports regularly" /><Check text="Never move marketplace payments off-platform" /></ModuleCard>
  </Screen>;
}
function Check({ text }: { text: string }) { return <View style={styles.check}><Ionicons color={colors.success} name="checkmark-circle" size={19} /><Text style={styles.checkText}>{text}</Text></View>; }
const styles = StyleSheet.create({ hero: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.xl, flexDirection: "row", gap: spacing.lg, padding: spacing.xl }, heroIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.18)", borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, heroCopy: { flex: 1, gap: 5 }, heroTitle: { color: "#fff", fontSize: 21, fontWeight: "900" }, heroText: { color: "#ffedd5", lineHeight: 20 }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, lesson: { alignItems: "center", flexDirection: "row", gap: spacing.md }, lessonIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 48, justifyContent: "center", width: 48 }, description: { color: colors.text, flex: 1, lineHeight: 20 }, button: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 42, paddingHorizontal: spacing.md }, buttonText: { color: "#fff", fontWeight: "900" }, check: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, checkText: { color: colors.text, flex: 1 } });
