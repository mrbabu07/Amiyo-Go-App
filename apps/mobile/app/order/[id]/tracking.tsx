import { useLocalSearchParams } from "expo-router";
import { OrderTrackingScreen } from "../../../src/features/orders/OrderTrackingScreen";
export default function TrackingRoute() { const { id } = useLocalSearchParams<{ id: string }>(); return <OrderTrackingScreen id={id} />; }
