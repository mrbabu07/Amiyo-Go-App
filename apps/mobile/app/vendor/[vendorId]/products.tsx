import { useLocalSearchParams } from "expo-router";
import { ShopScreen } from "../../../src/features/catalog/ShopScreen";

export default function VendorProductsRoute() {
  const { vendorId } = useLocalSearchParams<{ vendorId: string }>();
  return <ShopScreen identifier={vendorId} />;
}
