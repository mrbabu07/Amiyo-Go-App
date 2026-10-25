import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMarketplaceLocale } from "../features/platform/marketplace-locale";
import { colors, spacing } from "./tokens";

export function OfflineNotice() { const state = Network.useNetworkState(); const { t } = useMarketplaceLocale(); const online = state.isConnected !== false && state.isInternetReachable !== false; useEffect(() => { onlineManager.setOnline(online); }, [online]); if (online) return null; return <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.notice}><Text style={styles.text}>{t.offline}</Text></View>; }
const styles = StyleSheet.create({ notice: { backgroundColor: colors.navy, borderBottomColor: colors.accent, borderBottomWidth: 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, zIndex: 100 }, text: { color: colors.surface, fontSize: 12, fontWeight: "600", textAlign: "center" } });
