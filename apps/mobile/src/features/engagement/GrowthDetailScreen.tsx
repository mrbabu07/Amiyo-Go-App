import { Ionicons } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { Screen } from "../../ui/Screen";
import { colors, radius, spacing } from "../../ui/tokens";
import { getGrowthFeed } from "./engagement.api";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function CampaignScreen({ slug }: { slug: string }) {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const query = useQuery({ queryKey: ["growth", "feed"], queryFn: getGrowthFeed });
  const item = query.data?.campaigns.find((campaign) => campaign.slug === slug);
  if (query.isLoading) return <OfferLoading title="Loading campaign" />;
  if (query.error || !item) return <OfferMissing copy={query.error instanceof Error ? query.error.message : "This campaign is no longer available."} onPress={() => router.replace("/")} />;

  return <Screen eyebrow="LIMITED CAMPAIGN" title={item.name} description="Explore the live marketplace selection included in this campaign.">
    <OfferHero compact={compact} copy={`Available until ${new Date(item.endsAt).toLocaleString("en-BD")}`} icon="megaphone" title="Campaign is live" />
    <View style={[styles.info, compact && styles.infoCompact]}>
      <Info icon="calendar-outline" label="Started" value={new Date(item.startsAt).toLocaleDateString("en-BD")} />
      <Info icon="time-outline" label="Ends" value={new Date(item.endsAt).toLocaleDateString("en-BD")} />
    </View>
    <Pressable accessibilityRole="link" onPress={() => router.push(item.href as never)} style={[styles.primary, compact && styles.primaryCompact]}><Text style={styles.primaryText}>Explore campaign products</Text><Ionicons color={colors.surface} name="arrow-forward" size={18} /></Pressable>
  </Screen>;
}

export function FlashSaleScreen({ id }: { id: string }) {
  const compact = useWindowDimensions().width < 620;
  const router = useRouter();
  const query = useQuery({ queryKey: ["growth", "feed"], queryFn: getGrowthFeed });
  const item = query.data?.flashSales.find((sale) => sale.id === id);
  if (query.isLoading) return <OfferLoading title="Loading flash sale" />;
  if (query.error || !item) return <OfferMissing copy={query.error instanceof Error ? query.error.message : "This flash sale has ended or is unavailable."} onPress={() => router.replace("/")} />;

  return <Screen eyebrow="FLASH SALE" title={item.name} description={`Live offer ends ${new Date(item.endsAt).toLocaleString("en-BD")}.`}>
    <OfferHero compact={compact} copy={`${item.products.length} product${item.products.length === 1 ? "" : "s"} currently included`} icon="flash" sale title="Limited-time prices" />
    {item.products.length ? <View style={styles.grid}>{item.products.map((product) => <View key={product.productId} style={[styles.card, compact && styles.cardCompact]}><View style={styles.productIcon}><Ionicons color={colors.accent} name="flash-outline" size={26} /></View><Text style={styles.cardLabel}>FLASH PRICE</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.price}>{money(product.price.amountMinor)}</Text><Text style={styles.stock}>{product.quantityRemaining === null ? "Available while stocks last" : `${product.quantityRemaining} remaining`}</Text><Pressable accessibilityRole="link" onPress={() => router.push(`/product/${product.productId}` as never)} style={styles.cardButton}><Text style={styles.cardButtonText}>View deal</Text><Ionicons color={colors.primary} name="arrow-forward" size={16} /></Pressable></View>)}</View> : <View style={styles.empty}><Ionicons color={colors.primary} name="hourglass-outline" size={45} /><Text style={styles.emptyTitle}>Deals are being prepared</Text></View>}
  </Screen>;
}

function OfferHero({ compact, copy, icon, sale = false, title }: { compact: boolean; copy: string; icon: React.ComponentProps<typeof Ionicons>["name"]; sale?: boolean; title: string }) { return <View style={[styles.hero, sale && styles.heroSale, compact && styles.heroCompact]}><View style={[styles.heroIcon, sale && styles.heroIconSale]}><Ionicons color={colors.surface} name={icon} size={29} /></View><View style={styles.flex}><Text accessibilityRole="header" style={[styles.heroTitle, compact && styles.heroTitleCompact]}>{title}</Text><Text style={styles.heroCopy}>{copy}</Text></View></View>; }
function Info({ icon, label, value }: { icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; value: string }) { return <View style={styles.infoCard}><Ionicons color={colors.primary} name={icon} size={22} /><View style={styles.flex}><Text style={styles.infoLabel}>{label}</Text><Text style={styles.infoValue}>{value}</Text></View></View>; }
function OfferLoading({ title }: { title: string }) { return <Screen eyebrow="SPECIAL OFFER" title={title} description="Fetching live offer availability."><View style={styles.empty}><ActivityIndicator color={colors.primary} size="large" /></View></Screen>; }
function OfferMissing({ copy, onPress }: { copy: string; onPress: () => void }) { return <Screen eyebrow="SPECIAL OFFER" title="Offer unavailable" description={copy}><View style={styles.empty}><Ionicons color={colors.primary} name="pricetag-outline" size={48} /><Pressable onPress={onPress} style={[styles.primary, styles.primaryCompact]}><Text style={styles.primaryText}>Browse current offers</Text></Pressable></View></Screen>; }

const styles = StyleSheet.create({ flex: { flex: 1, minWidth: 0 }, hero: { alignItems: "center", backgroundColor: colors.navy, borderRadius: radius.xl, flexDirection: "row", gap: spacing.md, padding: spacing.xl }, heroSale: { backgroundColor: colors.primary }, heroCompact: { alignItems: "flex-start", padding: spacing.lg }, heroIcon: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.lg, height: 58, justifyContent: "center", width: 58 }, heroIconSale: { backgroundColor: colors.accent }, heroTitle: { color: colors.surface, fontSize: 22, fontWeight: "700" }, heroTitleCompact: { fontSize: 19 }, heroCopy: { color: "#e2e8f0", lineHeight: 20, marginTop: 4 }, info: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, infoCompact: { flexDirection: "column" }, infoCard: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flex: 1, flexDirection: "row", gap: spacing.md, minHeight: 78, padding: spacing.lg }, infoLabel: { color: colors.muted, fontSize: 11 }, infoValue: { color: colors.text, fontWeight: "700", marginTop: 3 }, primary: { alignItems: "center", alignSelf: "flex-start", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", minHeight: 48, paddingHorizontal: spacing.lg }, primaryCompact: { alignSelf: "stretch", width: "100%" }, primaryText: { color: colors.surface, fontWeight: "700" }, grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md }, card: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 8px 24px rgba(11,31,58,.06)", flexBasis: 230, flexGrow: 1, gap: spacing.sm, maxWidth: 330, minWidth: 0, padding: spacing.lg }, cardCompact: { flexBasis: "100%", maxWidth: "100%", width: "100%" }, productIcon: { alignItems: "center", backgroundColor: colors.accentSoft, borderRadius: radius.md, height: 50, justifyContent: "center", width: 50 }, cardLabel: { color: colors.accent, fontSize: 10, fontWeight: "700", letterSpacing: 1 }, price: { color: colors.text, fontSize: 26, fontWeight: "700" }, stock: { color: colors.muted }, cardButton: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: 6, justifyContent: "space-between", marginTop: spacing.sm, minHeight: 44, paddingTop: spacing.md }, cardButtonText: { color: colors.primary, fontWeight: "700" }, empty: { alignItems: "center", backgroundColor: colors.surface, borderRadius: radius.xl, gap: spacing.lg, padding: 44 }, emptyTitle: { color: colors.text, fontSize: 20, fontWeight: "700" } });
