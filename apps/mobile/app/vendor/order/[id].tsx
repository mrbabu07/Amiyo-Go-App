import { useLocalSearchParams } from "expo-router";
import { VendorOrderDetailScreen } from "../../../src/features/orders/VendorOrderDetailScreen";
export default function VendorOrderRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <VendorOrderDetailScreen id={id} />; }
