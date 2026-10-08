import { Image, StyleSheet, View } from "react-native";
import { radius, spacing } from "../../ui/tokens";

export function ReviewImages({ images }: { images: Array<{ id: string; url: string }> }) {
  if (!images.length) return null;
  return <View style={styles.row}>{images.map((image, index) => <Image key={image.id} accessibilityLabel={`Customer review photo ${index + 1}`} source={{ uri: image.url }} resizeMode="contain" style={styles.image} />)}</View>;
}

const styles = StyleSheet.create({ row: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }, image: { width: 96, height: 96, borderRadius: radius.md } });
