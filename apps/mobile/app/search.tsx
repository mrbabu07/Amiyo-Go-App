import { useLocalSearchParams } from "expo-router";
import { ProductListScreen } from "../src/features/catalog/ProductListScreen";
export default function SearchRoute() { const { q = "" } = useLocalSearchParams<{ q?: string }>(); return <ProductListScreen query={q} title={q ? `Search: ${q}` : "All products"} />; }
