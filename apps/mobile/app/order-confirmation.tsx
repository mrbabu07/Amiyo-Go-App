import { useLocalSearchParams } from "expo-router";
import { OrderConfirmationScreen } from "../src/features/commerce/OrderConfirmationScreen";

export default function OrderConfirmationRoute() {
  const params = useLocalSearchParams<{ actionUrl?: string; instructions?: string; invoice?: string; orderId?: string; orderNumber?: string; payment?: string; totalMinor?: string }>();
  return <OrderConfirmationScreen {...params} />;
}
