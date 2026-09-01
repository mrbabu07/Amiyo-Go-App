import { publicPlatformSettingsSchema } from "@amiyo/contracts";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");

export async function getPublicPlatformSettings() {
  const response = await fetch(`${apiUrl}/api/v2/platform/settings`);
  if (!response.ok) throw new Error("Marketplace settings are unavailable");
  return publicPlatformSettingsSchema.parse(await response.json());
}
