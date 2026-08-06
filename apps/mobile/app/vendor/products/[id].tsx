import { useLocalSearchParams } from "expo-router";
import { VendorProductDetailScreen } from "../../../src/features/vendor/VendorProductDetailScreen";
export default function VendorProductDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <VendorProductDetailScreen id={id} />; }
