import { useLocalSearchParams } from "expo-router";
import { ShopScreen } from "../../src/features/catalog/ShopScreen";
export default function ShopAliasRoute() { const { slug } = useLocalSearchParams<{ slug: string }>(); return <ShopScreen identifier={slug} />; }
