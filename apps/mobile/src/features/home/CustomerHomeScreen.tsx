import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { flashProducts, recommendedProducts, type HomeProduct } from "./home.data";
import { BottomNav } from "./components/BottomNav";
import { CategoryRail } from "./components/CategoryRail";
import { HeroBanner } from "./components/HeroBanner";
import { ProductCard } from "./components/ProductCard";
import { StoreHeader } from "./components/StoreHeader";

function SectionTitle({ eyebrow, title, action = "View all" }: { eyebrow?: string; title: string; action?: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.sectionTitle}>{title}</Text></View>
      <Text style={styles.sectionAction}>{action}  ›</Text>
    </View>
  );
}

function ProductGrid({ columns, products }: { columns: number; products: HomeProduct[] }) {
  const cardWidth = `${100 / columns}%` as `${number}%`;
  return (
    <View style={styles.grid}>
      {products.map((product) => <View key={product.id} style={[styles.cardSlot, { width: cardWidth }]}><ProductCard product={product} /></View>)}
    </View>
  );
}

const benefits = [
  { icon: "shield-checkmark-outline", title: "Secure payment", text: "Protected checkout" },
  { icon: "car-outline", title: "Fast delivery", text: "Across Bangladesh" },
  { icon: "refresh-outline", title: "Easy returns", text: "Simple return policy" },
  { icon: "headset-outline", title: "24/7 support", text: "Always here to help" }
];

export function CustomerHomeScreen() {
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const columns = width >= 1180 ? 5 : width >= 820 ? 4 : 2;
  const contentWidth = Math.min(width - spacing.xl, 1208);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <StoreHeader desktop={desktop} viewportWidth={width} />
          <View style={[styles.content, { width: contentWidth }]}>
            <HeroBanner desktop={desktop} />
            <View style={styles.section}><SectionTitle eyebrow="EXPLORE DEPARTMENTS" title="Shop by category" /><CategoryRail /></View>

            <View style={[styles.flashSection, desktop && styles.desktopFlash]}>
              <View style={styles.flashHeading}>
                <View><View style={styles.flashEyebrowRow}><Ionicons color={colors.accent} name="flash" size={17} /><Text style={styles.flashEyebrow}>FLASH SALE</Text></View><Text style={styles.flashTitle}>Deals end soon</Text></View>
                <View style={styles.timerRow}>{["08", "24", "39"].map((value, index) => <View key={`${value}-${index}`} style={styles.timerBox}><Text style={styles.timerText}>{value}</Text></View>)}</View>
              </View>
              <ProductGrid columns={columns} products={flashProducts} />
            </View>

            <View style={styles.promo}>
              <View style={styles.promoIcon}><Ionicons color={colors.surface} name="gift-outline" size={30} /></View>
              <View style={styles.promoCopy}><Text style={styles.promoKicker}>NEW CUSTOMER OFFER</Text><Text style={styles.promoTitle}>Get ৳200 off your first order</Text><Text style={styles.promoText}>Use code WELCOME200 at checkout</Text></View>
              <View style={styles.promoCode}><Text style={styles.promoCodeText}>WELCOME200</Text></View>
            </View>

            <View style={styles.section}><SectionTitle eyebrow="CURATED FOR YOU" title="Just for you" /><ProductGrid columns={columns} products={recommendedProducts} /></View>

            <View style={styles.benefits}>
              {benefits.map((benefit) => (
                <View key={benefit.title} style={styles.benefit}>
                  <View style={styles.benefitIcon}><Ionicons color={colors.primary} name={benefit.icon as never} size={23} /></View>
                  <View><Text style={styles.benefitTitle}>{benefit.title}</Text><Text style={styles.benefitText}>{benefit.text}</Text></View>
                </View>
              ))}
            </View>

            <View style={styles.footer}><Text style={styles.footerBrand}>Amiyo-Go</Text><Text style={styles.footerText}>Your trusted marketplace for everyday shopping.</Text><Text style={styles.copyright}>© 2026 Amiyo-Go. Made for Bangladesh.</Text></View>
          </View>
        </ScrollView>
        {!desktop ? <BottomNav /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.surface, flex: 1 },
  screen: { flex: 1 },
  scrollContent: { backgroundColor: colors.background, paddingBottom: 4 },
  content: { alignSelf: "center", gap: 18, paddingVertical: spacing.md },
  section: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, padding: spacing.md },
  sectionTitleRow: { alignItems: "flex-end", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  eyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900", letterSpacing: -0.5, marginTop: 2 },
  sectionAction: { color: colors.primary, fontSize: 12, fontWeight: "900", paddingBottom: 3 },
  flashSection: { backgroundColor: colors.navy, borderRadius: radius.lg, overflow: "hidden", padding: spacing.md },
  desktopFlash: { padding: spacing.lg },
  flashHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.md },
  flashEyebrowRow: { alignItems: "center", flexDirection: "row", gap: 5 },
  flashEyebrow: { color: colors.accent, fontSize: 10, fontWeight: "900", letterSpacing: 0.8 },
  flashTitle: { color: colors.surface, fontSize: 22, fontWeight: "900", marginTop: 2 },
  timerRow: { flexDirection: "row", gap: 5 },
  timerBox: { alignItems: "center", backgroundColor: colors.surface, borderRadius: 5, minWidth: 34, paddingHorizontal: 7, paddingVertical: 8 },
  timerText: { color: colors.navy, fontSize: 12, fontWeight: "900" },
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -6, rowGap: 12 },
  cardSlot: { paddingHorizontal: 6 },
  promo: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, flexDirection: "row", flexWrap: "wrap", gap: 14, padding: 20 },
  promoIcon: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.15)", borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 },
  promoCopy: { flex: 1, minWidth: 200 },
  promoKicker: { color: "#bae6fd", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  promoTitle: { color: colors.surface, fontSize: 20, fontWeight: "900", marginTop: 3 },
  promoText: { color: "rgba(255,255,255,0.82)", fontSize: 11, marginTop: 4 },
  promoCode: { borderColor: "rgba(255,255,255,0.6)", borderRadius: radius.md, borderStyle: "dashed", borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  promoCodeText: { color: colors.surface, fontSize: 12, fontWeight: "900", letterSpacing: 0.7 },
  benefits: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg, borderWidth: 1, flexDirection: "row", flexWrap: "wrap", padding: 10 },
  benefit: { alignItems: "center", flex: 1, flexDirection: "row", gap: 10, minWidth: 220, padding: 12 },
  benefitIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 44, justifyContent: "center", width: 44 },
  benefitTitle: { color: colors.text, fontSize: 12, fontWeight: "900" },
  benefitText: { color: colors.muted, fontSize: 10, marginTop: 2 },
  footer: { alignItems: "center", paddingBottom: 28, paddingTop: 18 },
  footerBrand: { color: colors.primary, fontSize: 22, fontWeight: "900" },
  footerText: { color: colors.muted, fontSize: 11, marginTop: 5, textAlign: "center" },
  copyright: { color: "#94a3b8", fontSize: 9, marginTop: 12 }
});
