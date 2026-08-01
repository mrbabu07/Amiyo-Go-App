import { useLocalSearchParams } from "expo-router";
import { ProductDetailScreen } from "../../src/features/catalog/ProductDetailScreen";
export default function ProductRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <ProductDetailScreen identifier={id} />; }
