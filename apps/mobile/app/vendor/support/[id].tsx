import { useLocalSearchParams } from "expo-router";
import { SupportThreadScreen } from "../../../src/features/support/SupportThreadScreen";

export default function VendorSupportThreadRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SupportThreadScreen audience="seller" basePath="/vendor/support" id={id} />;
}
