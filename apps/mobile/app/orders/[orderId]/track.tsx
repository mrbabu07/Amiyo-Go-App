import { useLocalSearchParams } from "expo-router";
import { OrderTrackingScreen } from "../../../src/features/orders/OrderTrackingScreen";
export default function TrackingAliasRoute() { const { orderId } = useLocalSearchParams<{ orderId: string }>(); return <OrderTrackingScreen id={orderId} />; }
