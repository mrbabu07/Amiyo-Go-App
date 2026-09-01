import AsyncStorage from "@react-native-async-storage/async-storage";
import { discoveryEventInputSchema, productListResponseSchema, trendingSearchSchema, type DiscoveryEventInput } from "@amiyo/contracts";
import { randomUUID } from "expo-crypto";

const apiUrl = (process.env.EXPO_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
const sessionKey = "amiyo:discovery-session";
const recentSearchesKey = "amiyo:recent-searches";

async function publicRequest(path: string, init?: RequestInit) {
  const response = await fetch(`${apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!response.ok) throw new Error(`Discovery request failed (${response.status})`);
  return response.json() as Promise<unknown>;
}

export async function getDiscoverySessionId() {
  const saved = await AsyncStorage.getItem(sessionKey);
  if (saved) return saved;
  const sessionId = randomUUID();
  await AsyncStorage.setItem(sessionKey, sessionId);
  return sessionId;
}

export async function getRecentSearches() {
  const saved = await AsyncStorage.getItem(recentSearchesKey);
  if (!saved) return [];
  try {
    const values = JSON.parse(saved) as unknown;
    return Array.isArray(values) ? values.filter((value): value is string => typeof value === "string").slice(0, 8) : [];
  } catch {
    return [];
  }
}

export async function rememberSearch(query: string) {
  const term = query.trim();
  if (term.length < 2) return getRecentSearches();
  const current = await getRecentSearches();
  const next = [term, ...current.filter((value) => value.toLocaleLowerCase() !== term.toLocaleLowerCase())].slice(0, 8);
  await AsyncStorage.setItem(recentSearchesKey, JSON.stringify(next));
  return next;
}

export async function clearRecentSearches() {
  await AsyncStorage.removeItem(recentSearchesKey);
}

export async function getTrendingSearches() {
  return trendingSearchSchema.array().parse(await publicRequest("/api/v2/catalog/trending-searches"));
}

export async function getRecommendations(sessionId: string) {
  return productListResponseSchema.parse(await publicRequest(`/api/v2/catalog/recommendations?sessionId=${encodeURIComponent(sessionId)}`));
}

export async function recordDiscoveryEvent(input: DiscoveryEventInput) {
  const event = discoveryEventInputSchema.parse(input);
  await publicRequest("/api/v2/catalog/discovery-events", { method: "POST", body: JSON.stringify(event) });
}

export function safelyRecordDiscoveryEvent(input: DiscoveryEventInput) {
  void recordDiscoveryEvent(input).catch(() => undefined);
}
