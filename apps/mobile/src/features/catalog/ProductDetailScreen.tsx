import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import type { ProductDetailDto } from "@amiyo/contracts";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { colors, radius, spacing } from "../../ui/tokens";
import { firebaseAuth } from "../auth/firebase";
import { addCartItem } from "../commerce/commerce.api";
import { addWishlistItem, createProductQuestion, getAlerts, getProductQuestions, getProductReviews, getWishlist, removeAlert, removeWishlistItem, saveAlert } from "../engagement/engagement.api";
import { StoreHeader } from "../home/components/StoreHeader";
import { getProduct } from "./catalog.api";
import { fallbackProductImage } from "./catalog.view-model";
import { useComparisonStore } from "./comparison.store";

const money = (minor: string) => `৳${(Number(minor) / 100).toLocaleString("en-BD")}`;

export function ProductDetailScreen({ identifier }: { identifier: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const desktop = width >= 900;
  const product = useQuery({ queryKey: ["catalog", "product", identifier], queryFn: () => getProduct(identifier) });
  const item = product.data;
  const productId = item?.id;
  const user = firebaseAuth?.currentUser ?? null;
  const [selectedVariantId, setSelectedVariantId] = useState("");
  const [selectedMediaId, setSelectedMediaId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [cartBusy, setCartBusy] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [questionBody, setQuestionBody] = useState("");
  const selected = item?.variants.find((variant) => variant.id === selectedVariantId) ?? item?.variants[0];
  const selectedMedia = item?.media.find((media) => media.id === selectedMediaId) ?? item?.media.find((media) => media.variantId === selected?.id) ?? item?.media[0];
  const compared = useComparisonStore((state) => Boolean(productId && state.productIds.includes(productId)));
  const comparisonCount = useComparisonStore((state) => state.productIds.length);
  const addComparison = useComparisonStore((state) => state.addProduct);
  const wishlist = useQuery({ queryKey: ["wishlist"], queryFn: () => getWishlist(user!), enabled: Boolean(user) });
  const alerts = useQuery({ queryKey: ["alerts"], queryFn: () => getAlerts(user!), enabled: Boolean(user) });
  const reviews = useQuery({ queryKey: ["catalog", "reviews", productId], queryFn: () => getProductReviews(productId!), enabled: Boolean(productId) });
  const questions = useQuery({ queryKey: ["catalog", "questions", productId], queryFn: () => getProductQuestions(productId!), enabled: Boolean(productId) });
  const ask = useMutation({ mutationFn: async () => { const currentUser = firebaseAuth?.currentUser; if (!currentUser || !productId) throw new Error("Sign in to ask a question"); return createProductQuestion(currentUser, productId, questionBody.trim()); }, onSuccess: async () => { setQuestionBody(""); await queryClient.invalidateQueries({ queryKey: ["catalog", "questions", productId] }); } });
  const saved = Boolean(productId && wishlist.data?.items.some((entry) => entry.productId === productId));
  const alerted = Boolean(productId && alerts.data?.some((entry) => entry.productId === productId));
  const saveProduct = useMutation({ mutationFn: () => saved ? removeWishlistItem(user!, productId!) : addWishlistItem(user!, productId!), onSuccess: (data) => queryClient.setQueryData(["wishlist"], data) });
  const toggleAlert = useMutation({ mutationFn: () => alerted ? removeAlert(user!, productId!) : saveAlert(user!, productId!), onSuccess: (data) => queryClient.setQueryData(["alerts"], data) });

  useEffect(() => {
    if (!item?.variants.length) return;
    if (!item.variants.some((variant) => variant.id === selectedVariantId)) setSelectedVariantId(item.variants[0]!.id);
  }, [item, selectedVariantId]);

  useEffect(() => {
    setQuantity(1);
    const variantImage = item?.media.find((media) => media.variantId === selected?.id);
    if (variantImage) setSelectedMediaId(variantImage.id);
  }, [item, selected?.id]);

  if (product.isLoading) return <SafeAreaView style={styles.center}><ActivityIndicator color={colors.primary} size="large" /></SafeAreaView>;
  if (!item) return <SafeAreaView style={styles.center}><Text style={styles.error}>{product.error instanceof Error ? product.error.message : "Product not found"}</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Go back</Text></Pressable></SafeAreaView>;

  const maximumQuantity = Math.min(99, selected?.availableQuantity ?? 0);
  async function addToCart() {
    if (!selected) return;
    const currentUser = firebaseAuth?.currentUser;
    if (!currentUser) return router.push("/auth");
    setCartBusy(true);
    setCartError(null);
    try {
      const cart = await addCartItem(currentUser, selected.id, quantity);
      queryClient.setQueryData(["cart"], cart);
      router.push("/cart");
    } catch (caught) {
      setCartError(caught instanceof Error ? caught.message : "Could not add item");
    } finally {
      setCartBusy(false);
    }
  }
  function requireUser(action: () => void) { if (!user) router.push("/auth"); else action(); }
  function submitQuestion() { requireUser(() => ask.mutate()); }

  return <SafeAreaView style={styles.safe}><ScrollView><StoreHeader desktop={desktop} viewportWidth={width} /><View style={styles.page}>
    <View style={[styles.productLayout, desktop && styles.desktop]}>
      <ProductGallery item={item} selectedMediaId={selectedMedia?.id} onSelect={setSelectedMediaId} />
      <View style={styles.info}>
        <Text style={styles.brand}>{item.brand || "AMIYO VERIFIED"}</Text>
        <Text accessibilityRole="header" style={styles.title}>{item.name}</Text>
        <Pressable onPress={() => router.push(`/shop/${item.shopSlug}` as never)}><Text style={styles.link}>{item.shopName} ›</Text></Pressable>
        <View style={styles.rating}><Ionicons color="#f59e0b" name="star" size={17} /><Text style={styles.ratingText}>{item.rating.toFixed(1)} ({item.reviewCount} reviews)</Text></View>
        <Text style={styles.price}>{selected ? money(selected.price.amountMinor) : "Unavailable"}</Text>
        {selected?.compareAtPrice ? <Text style={styles.compare}>{money(selected.compareAtPrice.amountMinor)}</Text> : null}
        <Text style={[styles.stock, !maximumQuantity && styles.outOfStock]}>{maximumQuantity ? `${maximumQuantity} available` : "Out of stock"}</Text>
        <Text style={styles.description}>{item.description || "Product details will be available soon."}</Text>
        <Text style={styles.optionLabel}>Choose a variant</Text>
        <View style={styles.variants}>{item.variants.map((variant) => { const active = variant.id === selected?.id; return <Pressable accessibilityRole="button" key={variant.id} onPress={() => setSelectedVariantId(variant.id)} style={[styles.variant, active && styles.variantActive, !variant.availableQuantity && styles.variantDisabled]}><Text style={[styles.variantTitle, active && styles.variantTitleActive]}>{variant.title}</Text><Text style={[styles.variantStock, active && styles.variantStockActive]}>{variant.availableQuantity ? `${variant.availableQuantity} in stock` : "Out of stock"}</Text></Pressable>; })}</View>
        <View style={styles.purchaseRow}><View><Text style={styles.optionLabel}>Quantity</Text><View style={styles.quantity}><Pressable accessibilityLabel="Decrease quantity" disabled={quantity <= 1} onPress={() => setQuantity((value) => Math.max(1, value - 1))} style={styles.quantityButton}><Ionicons color={colors.text} name="remove" size={18} /></Pressable><Text style={styles.quantityValue}>{quantity}</Text><Pressable accessibilityLabel="Increase quantity" disabled={quantity >= maximumQuantity} onPress={() => setQuantity((value) => Math.min(maximumQuantity, value + 1))} style={styles.quantityButton}><Ionicons color={colors.text} name="add" size={18} /></Pressable></View></View><View style={styles.selectedSummary}><Text style={styles.selectedLabel}>Selected</Text><Text style={styles.selectedValue}>{selected?.title ?? "No variant"} · {quantity} item{quantity === 1 ? "" : "s"}</Text></View></View>
        <View style={styles.actionRow}><Action active={saved} icon={saved ? "heart" : "heart-outline"} label={saved ? "Saved" : "Wishlist"} onPress={() => requireUser(() => saveProduct.mutate())} /><Action active={alerted} icon={alerted ? "notifications" : "notifications-outline"} label={alerted ? "Alert active" : "Stock alert"} onPress={() => requireUser(() => toggleAlert.mutate())} /><Action active={compared} icon="git-compare-outline" label={compared ? `Compared (${comparisonCount})` : "Compare"} onPress={() => { if (!compared) addComparison(item.id); router.push("/compare"); }} /></View>
        {saveProduct.error || toggleAlert.error ? <Text style={styles.error}>{(saveProduct.error || toggleAlert.error)?.message}</Text> : null}{cartError ? <Text style={styles.error}>{cartError}</Text> : null}
        <Pressable disabled={!maximumQuantity || cartBusy} onPress={() => void addToCart()} style={[styles.cta, (!maximumQuantity || cartBusy) && styles.disabled]}>{cartBusy ? <ActivityIndicator color="#fff" /> : <><Ionicons color="#fff" name="cart-outline" size={20} /><Text style={styles.ctaText}>Add {quantity} to cart</Text></>}</Pressable>
      </View>
    </View>
    <View style={styles.engagementGrid}><ReviewsPanel query={reviews} /><QuestionsPanel ask={ask} body={questionBody} onBody={setQuestionBody} onSubmit={submitQuestion} query={questions} /></View>
  </View></ScrollView></SafeAreaView>;
}

function ProductGallery({ item, selectedMediaId, onSelect }: { item: ProductDetailDto; selectedMediaId?: string; onSelect(id: string): void }) {
  const selected = item.media.find((media) => media.id === selectedMediaId) ?? item.media[0];
  return <View style={styles.gallery}><View style={styles.media}><Image accessibilityLabel={selected?.altText || item.name} resizeMode="cover" source={{ uri: selected?.url || item.thumbnailUrl || fallbackProductImage }} style={styles.image} />{item.media.length > 1 ? <Text style={styles.imageCount}>{item.media.findIndex((media) => media.id === selected?.id) + 1}/{item.media.length}</Text> : null}</View>{item.media.length > 1 ? <ScrollView contentContainerStyle={styles.thumbnails} horizontal showsHorizontalScrollIndicator={false}>{item.media.map((media) => <Pressable accessibilityLabel={media.altText || `Product image ${media.displayOrder + 1}`} key={media.id} onPress={() => onSelect(media.id)} style={[styles.thumbnailButton, media.id === selected?.id && styles.thumbnailActive]}><Image source={{ uri: media.url }} style={styles.thumbnail} /></Pressable>)}</ScrollView> : null}</View>;
}

function Action({ active, icon, label, onPress }: { active: boolean; icon: React.ComponentProps<typeof Ionicons>["name"]; label: string; onPress(): void }) { return <Pressable onPress={onPress} style={[styles.secondary, active && styles.secondaryActive]}><Ionicons color={active ? "#fff" : colors.primary} name={icon} size={18} /><Text style={[styles.secondaryText, active && styles.secondaryTextActive]}>{label}</Text></Pressable>; }

function ReviewsPanel({ query }: { query: UseQueryResult<Awaited<ReturnType<typeof getProductReviews>>, Error> }) { return <View style={styles.panel}><Text style={styles.sectionTitle}>Customer reviews</Text>{query.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{query.data?.map((review) => <View key={review.id} style={styles.entry}><Text style={styles.stars}>{"★".repeat(review.rating)}{"☆".repeat(5 - review.rating)}</Text><Text style={styles.entryTitle}>{review.title || review.authorName}</Text><Text style={styles.entryBody}>{review.body || "No written review"}</Text><Text style={styles.meta}>{review.verifiedPurchase ? "Verified purchase · " : ""}{new Date(review.createdAt).toLocaleDateString()}</Text></View>)}{query.data?.length === 0 ? <Text style={styles.empty}>No reviews yet.</Text> : null}{query.error ? <Text style={styles.error}>{query.error.message}</Text> : null}</View>; }

function QuestionsPanel({ ask, body, onBody, onSubmit, query }: { ask: UseMutationResult<Awaited<ReturnType<typeof createProductQuestion>>, Error, void>; body: string; onBody(value: string): void; onSubmit(): void; query: UseQueryResult<Awaited<ReturnType<typeof getProductQuestions>>, Error> }) { return <View style={styles.panel}><Text style={styles.sectionTitle}>Questions & answers</Text><TextInput accessibilityLabel="Product question" multiline onChangeText={onBody} placeholder="Ask the seller about this product" placeholderTextColor={colors.muted} style={styles.questionInput} value={body} /><Pressable disabled={ask.isPending || body.trim().length < 5} onPress={onSubmit} style={[styles.askButton, (ask.isPending || body.trim().length < 5) && styles.disabled]}><Text style={styles.ctaText}>{ask.isPending ? "Sending…" : "Ask question"}</Text></Pressable>{ask.error ? <Text style={styles.error}>{ask.error.message}</Text> : null}{query.isLoading ? <ActivityIndicator color={colors.primary} /> : null}{query.data?.map((question) => <View key={question.id} style={styles.entry}><Text style={styles.entryTitle}>{question.body}</Text><Text style={styles.meta}>{question.authorName} · {new Date(question.createdAt).toLocaleDateString()}</Text>{question.answers.map((answer) => <View key={answer.id} style={styles.answer}><Text style={styles.answerLabel}>Seller answer</Text><Text style={styles.entryBody}>{answer.body}</Text></View>)}</View>)}{query.data?.length === 0 ? <Text style={styles.empty}>No questions yet.</Text> : null}{query.error ? <Text style={styles.error}>{query.error.message}</Text> : null}</View>; }

const styles = StyleSheet.create({ safe: { backgroundColor: colors.background, flex: 1 }, center: { alignItems: "center", backgroundColor: colors.background, flex: 1, gap: spacing.md, justifyContent: "center" }, page: { alignSelf: "center", gap: spacing.xl, maxWidth: 1100, padding: spacing.lg, width: "100%" }, productLayout: { gap: spacing.lg }, desktop: { alignItems: "flex-start", flexDirection: "row" }, gallery: { flex: 1, gap: spacing.sm, width: "100%" }, media: { aspectRatio: 1, backgroundColor: colors.surface, borderRadius: radius.xl, overflow: "hidden", position: "relative", width: "100%" }, image: { height: "100%", width: "100%" }, imageCount: { backgroundColor: "rgba(15,23,42,.72)", borderRadius: radius.pill, bottom: spacing.sm, color: "#fff", fontSize: 10, fontWeight: "900", overflow: "hidden", paddingHorizontal: 9, paddingVertical: 5, position: "absolute", right: spacing.sm }, thumbnails: { gap: spacing.sm }, thumbnailButton: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 2, overflow: "hidden" }, thumbnailActive: { borderColor: colors.primary }, thumbnail: { height: 72, width: 72 }, info: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flex: 1, padding: spacing.xl }, brand: { color: colors.accent, fontSize: 11, fontWeight: "900", letterSpacing: 1 }, title: { color: colors.text, fontSize: 30, fontWeight: "900", marginBottom: spacing.sm, marginTop: spacing.sm }, link: { color: colors.primary, fontWeight: "900" }, rating: { alignItems: "center", flexDirection: "row", gap: 5, marginTop: spacing.md }, ratingText: { color: colors.muted }, price: { color: colors.accent, fontSize: 30, fontWeight: "900", marginTop: spacing.lg }, compare: { color: colors.muted, textDecorationLine: "line-through" }, stock: { color: colors.success, fontWeight: "800", marginTop: spacing.sm }, outOfStock: { color: colors.danger }, description: { color: colors.muted, lineHeight: 22, marginTop: spacing.lg }, optionLabel: { color: colors.text, fontSize: 11, fontWeight: "900", marginBottom: spacing.sm, marginTop: spacing.lg }, variants: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, variant: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, minWidth: 120, padding: spacing.md }, variantActive: { backgroundColor: colors.primary, borderColor: colors.primary }, variantDisabled: { opacity: .5 }, variantTitle: { color: colors.text, fontWeight: "900" }, variantTitleActive: { color: "#fff" }, variantStock: { color: colors.muted, fontSize: 10, marginTop: 3 }, variantStockActive: { color: "#dbeafe" }, purchaseRow: { alignItems: "flex-end", flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, quantity: { alignItems: "center", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", overflow: "hidden" }, quantityButton: { alignItems: "center", height: 42, justifyContent: "center", width: 42 }, quantityValue: { borderLeftColor: colors.border, borderLeftWidth: 1, borderRightColor: colors.border, borderRightWidth: 1, color: colors.text, fontWeight: "900", lineHeight: 42, textAlign: "center", width: 48 }, selectedSummary: { flex: 1, minWidth: 160 }, selectedLabel: { color: colors.muted, fontSize: 10, fontWeight: "800" }, selectedValue: { color: colors.text, fontWeight: "900", marginTop: 5 }, actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.lg }, secondary: { alignItems: "center", borderColor: colors.primary, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: spacing.xs, justifyContent: "center", minHeight: 42, paddingHorizontal: spacing.md }, secondaryActive: { backgroundColor: colors.primary }, secondaryText: { color: colors.primary, fontWeight: "900" }, secondaryTextActive: { color: "#fff" }, cta: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, justifyContent: "center", marginTop: spacing.lg, minHeight: 52 }, ctaText: { color: "#fff", fontWeight: "900" }, error: { color: colors.danger, marginTop: spacing.md }, disabled: { opacity: .5 }, engagementGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.lg }, panel: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.xl, borderWidth: 1, flex: 1, minWidth: 300, padding: spacing.xl }, sectionTitle: { color: colors.text, fontSize: 22, fontWeight: "900", marginBottom: spacing.md }, entry: { borderTopColor: colors.border, borderTopWidth: 1, gap: 5, paddingVertical: spacing.md }, stars: { color: "#f59e0b", fontSize: 16 }, entryTitle: { color: colors.text, fontWeight: "900" }, entryBody: { color: colors.muted, lineHeight: 20 }, meta: { color: colors.muted, fontSize: 11 }, empty: { color: colors.muted, paddingVertical: spacing.md }, questionInput: { borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, color: colors.text, minHeight: 90, padding: spacing.md, textAlignVertical: "top" }, askButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", marginBottom: spacing.md, marginTop: spacing.sm, minHeight: 44 }, answer: { backgroundColor: colors.primarySoft, borderRadius: radius.md, marginTop: spacing.sm, padding: spacing.md }, answerLabel: { color: colors.primary, fontSize: 11, fontWeight: "900", marginBottom: 4 } });
