import { useLocalSearchParams } from "expo-router";
import { ProductListScreen } from "../../src/features/catalog/ProductListScreen";
export default function CategoryRoute() { const { slug } = useLocalSearchParams<{ slug: string }>(); return <ProductListScreen category={slug} title={slug.replaceAll("-", " ")} />; }
