import { useLocalSearchParams } from "expo-router";
import { VendorOrderDetailScreen } from "../../../src/features/orders/VendorOrderDetailScreen";
export default function Route() { const { orderId } = useLocalSearchParams<{ orderId: string }>(); return <VendorOrderDetailScreen id={orderId} />; }
