import { useLocalSearchParams } from "expo-router";
import { CustomerOrderDetailScreen } from "../../src/features/orders/CustomerOrderDetailScreen";

export default function CustomerOrderDetailRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <CustomerOrderDetailScreen id={id} />; }
