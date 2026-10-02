import type { PaymentMethod, PublicPlatformSettingsDto } from "@amiyo/contracts";

export function paymentMethodEnabled(settings: PublicPlatformSettingsDto | undefined, method: PaymentMethod) {
  if (!settings) return false;
  if (method === "COD") return settings.paymentMethods.cod.enabled;
  if (method === "SSLCOMMERZ") return settings.paymentMethods.sslcommerz.enabled;
  if (method === "BKASH" || method === "NAGAD") return settings.paymentMethods.bkashManual.enabled;
  return false;
}

export function checkoutPolicyError(settings: PublicPlatformSettingsDto | undefined, method: PaymentMethod, phoneConfirmed: boolean, address?: { upazila?: string | null; unionName?: string | null }) {
  if (!settings) return "Marketplace settings are unavailable. Please retry before ordering.";
  if (settings.maintenanceMode.enabled) return settings.maintenanceMode.message || "Checkout is temporarily unavailable.";
  if (!paymentMethodEnabled(settings, method)) return "Select an available payment method.";
  const village = settings.villageOperations;
  if (!village.enabled) return null;
  if (method === "COD" && village.requireCodPhoneConfirmation && !phoneConfirmed) return "Confirm that your delivery phone is active before placing a COD order.";
  if (address && village.requireUnionForDelivery && (!address.upazila?.trim() || !address.unionName?.trim())) return "Upazila and union are required for village delivery.";
  if (address?.unionName?.trim() && !village.ruralDeliveryEnabled) return "Village and union delivery is temporarily paused.";
  return null;
}
