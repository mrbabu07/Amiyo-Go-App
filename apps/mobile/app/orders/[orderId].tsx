import { useLocalSearchParams } from "expo-router";
import { CustomerOrderDetailScreen } from "../../src/features/orders/CustomerOrderDetailScreen";
export default function OrderAliasRoute() { const { orderId } = useLocalSearchParams<{ orderId: string }>(); return <CustomerOrderDetailScreen id={orderId} />; }
