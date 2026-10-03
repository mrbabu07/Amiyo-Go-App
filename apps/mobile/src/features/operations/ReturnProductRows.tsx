import type { ReturnDto } from "@amiyo/contracts";
import { StyleSheet, Text, View } from "react-native";
import { OrderItemImage } from "../orders/OrderItemImage";
import { colors, spacing } from "../../ui/tokens";

export function ReturnProductRows({ items }: { items: ReturnDto["items"] }) {
  return <View style={styles.list}>{items.map((item) => {
    const name = item.productName || `Order item #${item.orderItemId.slice(0, 8).toUpperCase()}`;
    const attributes = Object.entries(item.attributes ?? {}).filter(([, value]) => typeof value === "string" || typeof value === "number").map(([key, value]) => `${key}: ${value}`).join(" · ");
    return <View key={item.id} style={styles.row}>
      <OrderItemImage name={name} uri={item.thumbnailUrl} />
      <View style={styles.copy}>
        <Text style={styles.title}>{name}</Text>
        {item.sku ? <Text style={styles.muted}>SKU: {item.sku}</Text> : null}
        {attributes ? <Text style={styles.muted}>{attributes}</Text> : null}
        <Text style={styles.muted}>Return quantity: {item.quantity}</Text>
        <Text style={styles.amount}>Requested: {item.requestedAmount.currency} {(Number(item.requestedAmount.amountMinor) / 100).toLocaleString("en-BD", { minimumFractionDigits: 2 })}</Text>
      </View>
    </View>;
  })}</View>;
}

const styles = StyleSheet.create({
  list: { gap: spacing.md, minWidth: 0 },
  row: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, minWidth: 0 },
  copy: { flex: 1, minWidth: 0, gap: 4 },
  title: { color: colors.text, fontWeight: "600", flexShrink: 1 },
  muted: { color: colors.muted, lineHeight: 19, flexShrink: 1 },
  amount: { color: colors.primary, fontWeight: "600", flexShrink: 1 }
});
