import { useLocalSearchParams } from "expo-router";
import { SharedWishlistScreen } from "../../../src/features/engagement/SharedWishlistScreen";

export default function SharedWishlistRoute() { const { token } = useLocalSearchParams<{ token: string }>(); return <SharedWishlistScreen token={token || ""} />; }
