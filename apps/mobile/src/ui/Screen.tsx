import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import { StoreHeader } from "../features/home/components/StoreHeader";
import { BottomNav } from "../features/home/components/BottomNav";
import { colors, radius, spacing } from "./tokens";

type ScreenProps = PropsWithChildren<{ eyebrow?: string; title: string; description?: string }>;
type WorkspaceLink = { label: string; href: string; icon: string };

const vendorLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: "grid-outline" }, { label: "Products", href: "/vendor/products", icon: "cube-outline" }, { label: "Orders", href: "/vendor/orders", icon: "bag-handle-outline" }, { label: "Inventory", href: "/vendor/inventory", icon: "layers-outline" }, { label: "Finance", href: "/vendor/finance", icon: "wallet-outline" }, { label: "Marketing", href: "/vendor/engagement", icon: "megaphone-outline" }, { label: "Operations", href: "/vendor/operations", icon: "construct-outline" }, { label: "Settings", href: "/vendor/settings", icon: "settings-outline" }
];
const adminLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: "grid-outline" }, { label: "Operations", href: "/admin/operations", icon: "pulse-outline" }, { label: "Analytics", href: "/admin/analytics", icon: "bar-chart-outline" }, { label: "Catalog", href: "/admin/catalog", icon: "cube-outline" }, { label: "Categories", href: "/admin/categories", icon: "file-tray-full-outline" }, { label: "Promotions", href: "/admin/promotions", icon: "megaphone-outline" }, { label: "Support", href: "/admin/support", icon: "headset-outline" }, { label: "Platform", href: "/admin/platform", icon: "settings-outline" }
];

export function Screen({ eyebrow, title, description, children }: ScreenProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const workspace = pathname.startsWith("/vendor") && pathname !== "/vendor/register" ? "vendor" : pathname.startsWith("/admin") ? "admin" : null;
  const showCustomerChrome = !workspace && pathname !== "/auth";
  const links = workspace === "vendor" ? vendorLinks : workspace === "admin" ? adminLinks : [];
  const contentWidth = Math.min(width - spacing.xl, 1280);
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
        {showCustomerChrome ? <StoreHeader desktop={width >= 900} viewportWidth={width} /> : null}
        {workspace ? (
          <View style={styles.workspaceChrome}>
            <View style={[styles.workspaceTop, { width: contentWidth }]}>
              <Pressable onPress={() => router.push("/")} style={styles.workspaceBrand}>
                <View style={[styles.workspaceMark, workspace === "admin" && styles.adminMark]}><Text style={styles.workspaceMarkText}>A</Text></View>
                <View><Text style={styles.workspaceName}>Amiyo-Go</Text><Text style={styles.workspaceLabel}>{workspace === "vendor" ? "Seller Center" : "Admin Console"}</Text></View>
              </Pressable>
              <View style={styles.workspaceActions}><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={20} /></Pressable><Pressable accessibilityLabel="Account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={20} /></Pressable></View>
            </View>
            <ScrollView contentContainerStyle={[styles.workspaceNav, { minWidth: contentWidth }]} horizontal showsHorizontalScrollIndicator={false}>
              {links.map((link) => {
                const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
                return <Pressable key={link.href} onPress={() => router.push(link.href as never)} style={[styles.navItem, active && styles.navItemActive]}><Ionicons color={active ? colors.primary : colors.muted} name={link.icon as never} size={17} /><Text style={[styles.navLabel, active && styles.navLabelActive]}>{link.label}</Text></Pressable>;
              })}
            </ScrollView>
          </View>
        ) : null}
        <View style={[styles.container, { width: contentWidth }]}>
          <View style={[styles.heading, workspace && styles.workspaceHeading]}>
            {eyebrow ? <Text style={[styles.eyebrow, workspace && styles.workspaceEyebrow]}>{eyebrow}</Text> : null}
            <Text accessibilityRole="header" style={[styles.title, workspace && styles.workspaceTitle]}>{title}</Text>
            {description ? <Text style={[styles.description, workspace && styles.workspaceDescription]}>{description}</Text> : null}
          </View>
          <View style={styles.content}>{children}</View>
        </View>
      </ScrollView>
      {showCustomerChrome && width < 900 ? <BottomNav /> : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%", paddingBottom: spacing.xl }, workspaceChrome: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }, workspaceTop: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 68 }, workspaceBrand: { alignItems: "center", flexDirection: "row", gap: 10 }, workspaceMark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminMark: { backgroundColor: colors.navy }, workspaceMarkText: { color: colors.surface, fontSize: 18, fontWeight: "900" }, workspaceName: { color: colors.text, fontSize: 15, fontWeight: "900" }, workspaceLabel: { color: colors.muted, fontSize: 10, fontWeight: "800", marginTop: 1, textTransform: "uppercase" }, workspaceActions: { flexDirection: "row", gap: spacing.sm }, iconButton: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, height: 38, justifyContent: "center", width: 38 }, workspaceNav: { alignSelf: "center", gap: 5, paddingBottom: 9 }, navItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 }, navItemActive: { backgroundColor: colors.primarySoft }, navLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" }, navLabelActive: { color: colors.primary, fontWeight: "900" },
  container: { alignSelf: "center", gap: spacing.lg, paddingHorizontal: spacing.md, paddingTop: spacing.lg }, heading: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.xl }, workspaceHeading: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, eyebrow: { color: "#fdba74", fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }, workspaceEyebrow: { color: colors.accent }, title: { color: colors.surface, fontSize: 32, fontWeight: "900", letterSpacing: -0.8, lineHeight: 38 }, workspaceTitle: { color: colors.text }, description: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, workspaceDescription: { color: colors.muted }, content: { gap: spacing.md }
});
