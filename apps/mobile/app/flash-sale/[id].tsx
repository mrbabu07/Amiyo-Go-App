import { useLocalSearchParams } from "expo-router";
import { FlashSaleScreen } from "../../src/features/engagement/GrowthDetailScreen";
export default function Route() { const { id } = useLocalSearchParams<{ id: string }>(); return <FlashSaleScreen id={id} />; }
