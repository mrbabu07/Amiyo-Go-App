import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";

export function OfflineNotice() { const state = Network.useNetworkState(); const online = state.isConnected !== false && state.isInternetReachable !== false; useEffect(() => { onlineManager.setOnline(online); }, [online]); if (online) return null; return <View accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.notice}><Text style={styles.text}>You are offline. Saved screens remain available; updates will resume after reconnecting.</Text></View>; }
const styles = StyleSheet.create({ notice: { backgroundColor: "#7c2d12", paddingHorizontal: 16, paddingVertical: 9, zIndex: 100 }, text: { color: "#fff", fontSize: 12, fontWeight: "800", textAlign: "center" } });
