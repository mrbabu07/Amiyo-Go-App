import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState, type PropsWithChildren } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { BottomNav } from "../features/home/components/BottomNav";
import { StoreHeader } from "../features/home/components/StoreHeader";
import { colors, radius, spacing } from "./tokens";

type ScreenProps = PropsWithChildren<{ eyebrow?: string; title: string; description?: string; hideHeading?: boolean }>;
type WorkspaceLink = { label: string; href: string; icon: string };
type AdminGroup = { label: string; icon: string; links: WorkspaceLink[] };

const vendorLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: "grid-outline" },
  { label: "Products", href: "/vendor/products", icon: "cube-outline" },
  { label: "Orders", href: "/vendor/orders", icon: "bag-handle-outline" },
  { label: "Inventory", href: "/vendor/inventory", icon: "layers-outline" },
  { label: "Finance", href: "/vendor/finance", icon: "wallet-outline" },
  { label: "Marketing", href: "/vendor/engagement", icon: "megaphone-outline" },
  { label: "Operations", href: "/vendor/operations", icon: "construct-outline" },
  { label: "Settings", href: "/vendor/settings", icon: "settings-outline" }
];

const adminGroups: AdminGroup[] = [
  { label: "Overview", icon: "grid-outline", links: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "grid-outline" },
    { label: "Operations", href: "/admin/operations", icon: "pulse-outline" },
    { label: "Analytics & Reports", href: "/admin/analytics", icon: "bar-chart-outline" },
    { label: "Audit Logs", href: "/admin/audit", icon: "time-outline" },
    { label: "Platform Control", href: "/admin/platform", icon: "settings-outline" }
  ] },
  { label: "Vendors", icon: "storefront-outline", links: [
    { label: "Vendor Requests", href: "/admin/vendor-requests", icon: "person-add-outline" },
    { label: "KYC Review", href: "/admin/vendor-kyc", icon: "id-card-outline" },
    { label: "All Vendors", href: "/admin/vendors", icon: "storefront-outline" }
  ] },
  { label: "Catalog", icon: "cube-outline", links: [
    { label: "Products", href: "/admin/products", icon: "cube-outline" },
    { label: "Inventory", href: "/admin/inventory", icon: "layers-outline" },
    { label: "Categories", href: "/admin/categories", icon: "file-tray-full-outline" },
    { label: "Category Requests", href: "/admin/category-requests", icon: "git-pull-request-outline" }
  ] },
  { label: "Orders", icon: "bag-handle-outline", links: [
    { label: "All Orders", href: "/admin/orders", icon: "bag-handle-outline" },
    { label: "Returns", href: "/admin/returns", icon: "return-down-back-outline" },
    { label: "Logistics", href: "/admin/logistics", icon: "car-outline" },
    { label: "Delivery Settings", href: "/admin/delivery-settings", icon: "options-outline" },
    { label: "Support Tickets", href: "/admin/support", icon: "headset-outline" }
  ] },
  { label: "Marketing", icon: "megaphone-outline", links: [
    { label: "Promotions", href: "/admin/promotions", icon: "megaphone-outline" },
    { label: "Banners", href: "/admin/banners", icon: "images-outline" },
    { label: "Vouchers", href: "/admin/vouchers", icon: "ticket-outline" },
    { label: "Flash Sales", href: "/admin/flash-sales", icon: "flash-outline" },
    { label: "Offers", href: "/admin/offers", icon: "pricetags-outline" },
    { label: "Content", href: "/admin/content", icon: "newspaper-outline" },
    { label: "Newsletter", href: "/admin/newsletter", icon: "mail-outline" }
  ] },
  { label: "Finance", icon: "wallet-outline", links: [
    { label: "Vendor Payouts", href: "/admin/payouts", icon: "wallet-outline" },
    { label: "Payment Verification", href: "/admin/payment-verifications", icon: "card-outline" }
  ] },
  { label: "Customers", icon: "people-outline", links: [
    { label: "Customers", href: "/admin/customers", icon: "people-outline" },
    { label: "Trust & Safety", href: "/admin/trust-safety", icon: "shield-checkmark-outline" },
    { label: "User Roles", href: "/admin/users", icon: "key-outline" },
    { label: "Insights", href: "/admin/insights", icon: "analytics-outline" },
    { label: "Reviews", href: "/admin/reviews", icon: "star-outline" },
    { label: "Q&A", href: "/admin/qa", icon: "help-circle-outline" }
  ] }
];

const adminLinks = adminGroups.flatMap((group) => group.links);

export function Screen(props: ScreenProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const workspace = pathname.startsWith("/vendor") && pathname !== "/vendor/register" ? "vendor" : pathname.startsWith("/admin") ? "admin" : null;

  if (workspace === "admin") return <AdminScreen {...props} desktop={width >= 1024} pathname={pathname} />;
  return <StandardScreen {...props} pathname={pathname} vendor={workspace === "vendor"} width={width} />;
}

function AdminScreen({ children, description, desktop, eyebrow, hideHeading = false, pathname, title }: ScreenProps & { desktop: boolean; pathname: string }) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ Overview: true });
  const sidebarWidth = collapsed ? 82 : 276;
  const open = (href: string) => router.push(href as never);

  return <SafeAreaView style={styles.safe}>
    <View style={styles.adminTopbar}>
      <View style={styles.adminTopLeft}>
        {desktop ? <Pressable accessibilityLabel={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} onPress={() => setCollapsed((value) => !value)} style={styles.topIcon}><Ionicons color={colors.text} name={collapsed ? "menu-outline" : "menu"} size={22} /></Pressable> : null}
        <Pressable onPress={() => open("/admin/dashboard")} style={styles.workspaceBrand}>
          <View style={[styles.workspaceMark, styles.adminMark]}><Text style={styles.workspaceMarkText}>AG</Text></View>
          <View><Text style={styles.workspaceName}>Amiyo-Go Admin</Text><Text style={styles.workspaceLabel}>CONTROL CENTER</Text></View>
        </Pressable>
      </View>
      {desktop ? <View style={styles.adminSearch}><Ionicons color={colors.muted} name="search-outline" size={18} /><TextInput accessibilityLabel="Search admin pages" placeholder="Search pages, orders, vendors..." placeholderTextColor="#94a3b8" style={styles.adminSearchInput} /></View> : null}
      <View style={styles.workspaceActions}>
        <Pressable accessibilityLabel="Open storefront" onPress={() => open("/")} style={styles.iconButton}><Ionicons color={colors.text} name="storefront-outline" size={19} /></Pressable>
        <Pressable accessibilityLabel="Notifications" onPress={() => open("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={19} /><View style={styles.notificationDot} /></Pressable>
        <Pressable accessibilityLabel="Account" onPress={() => open("/account")} style={styles.adminAccount}><View style={styles.avatar}><Text style={styles.avatarText}>A</Text></View>{desktop ? <View><Text style={styles.accountName}>Administrator</Text><Text style={styles.accountRole}>Super admin</Text></View> : null}</Pressable>
      </View>
    </View>
    {!desktop ? <ScrollView contentContainerStyle={styles.adminMobileNav} horizontal showsHorizontalScrollIndicator={false}>{adminLinks.map((link) => <AdminNavLink key={link.href} link={link} pathname={pathname} collapsed onOpen={open} />)}</ScrollView> : null}
    <View style={styles.adminBody}>
      {desktop ? <View style={[styles.adminSidebar, { width: sidebarWidth }]}>
        <View style={[styles.workspacePanel, collapsed && styles.workspacePanelCollapsed]}><View style={styles.workspacePulse} />{!collapsed ? <View><Text style={styles.workspacePanelTitle}>Admin workspace</Text><Text style={styles.workspacePanelCopy}>Super admin access</Text></View> : null}</View>
        <ScrollView contentContainerStyle={styles.adminSidebarScroll} showsVerticalScrollIndicator={false}>
          {adminGroups.map((group) => {
            const groupActive = group.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
            const expanded = groupActive || (expandedGroups[group.label] ?? false);
            return <View key={group.label} style={styles.adminGroup}>
              {!collapsed ? <Pressable onPress={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))} style={[styles.adminGroupButton, groupActive && styles.adminGroupButtonActive]}><Ionicons color={groupActive ? "#ffffff" : "#cbd5e1"} name={group.icon as never} size={19} /><Text style={[styles.adminGroupButtonText, groupActive && styles.adminNavLabelActive]}>{group.label}</Text><Ionicons color="#94a3b8" name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Pressable> : null}
              {collapsed || expanded ? <View style={!collapsed && styles.adminGroupChildren}>{group.links.map((link) => <AdminNavLink key={link.href} link={link} pathname={pathname} collapsed={collapsed} onOpen={open} />)}</View> : null}
            </View>;
          })}
        </ScrollView>
        <Pressable onPress={() => open("/")} style={[styles.storefrontLink, collapsed && styles.navCollapsed]}><Ionicons color="#cbd5e1" name="home-outline" size={19} />{!collapsed ? <Text style={styles.storefrontText}>View storefront</Text> : null}</Pressable>
      </View> : null}
      <ScrollView contentContainerStyle={styles.adminPage} showsVerticalScrollIndicator={false} style={styles.adminMain}>
        <View style={styles.adminBreadcrumb}><Text style={styles.breadcrumbMuted}>Admin</Text><Ionicons color="#94a3b8" name="chevron-forward" size={13} /><Text style={styles.breadcrumbCurrent}>{title}</Text></View>
        {!hideHeading ? <Heading description={description} eyebrow={eyebrow} title={title} workspace /> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function AdminNavLink({ collapsed, link, onOpen, pathname }: { collapsed: boolean; link: WorkspaceLink; onOpen: (href: string) => void; pathname: string }) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
  return <Pressable accessibilityLabel={link.label} onPress={() => onOpen(link.href)} style={[styles.adminNavItem, active && styles.adminNavItemActive, collapsed && styles.navCollapsed]}><Ionicons color={active ? "#ffffff" : "#cbd5e1"} name={link.icon as never} size={19} />{!collapsed ? <Text style={[styles.adminNavLabel, active && styles.adminNavLabelActive]}>{link.label}</Text> : null}{active && !collapsed ? <View style={styles.activePip} /> : null}</Pressable>;
}

function StandardScreen({ children, description, eyebrow, hideHeading = false, pathname, title, vendor, width }: ScreenProps & { pathname: string; vendor: boolean; width: number }) {
  const router = useRouter();
  const showCustomerChrome = !vendor && pathname !== "/auth";
  const contentWidth = Math.min(width - spacing.xl, 1280);
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {showCustomerChrome ? <StoreHeader desktop={width >= 900} viewportWidth={width} /> : null}
      {vendor ? <View style={styles.workspaceChrome}>
        <View style={[styles.workspaceTop, { width: contentWidth }]}><Pressable onPress={() => router.push("/")} style={styles.workspaceBrand}><View style={styles.workspaceMark}><Text style={styles.workspaceMarkText}>A</Text></View><View><Text style={styles.workspaceName}>Amiyo-Go</Text><Text style={styles.workspaceLabel}>Seller Center</Text></View></Pressable><View style={styles.workspaceActions}><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={20} /></Pressable><Pressable accessibilityLabel="Account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={20} /></Pressable></View></View>
        <ScrollView contentContainerStyle={[styles.workspaceNav, { minWidth: contentWidth }]} horizontal showsHorizontalScrollIndicator={false}>{vendorLinks.map((link) => { const active = pathname === link.href || pathname.startsWith(`${link.href}/`); return <Pressable key={link.href} onPress={() => router.push(link.href as never)} style={[styles.navItem, active && styles.navItemActive]}><Ionicons color={active ? colors.primary : colors.muted} name={link.icon as never} size={17} /><Text style={[styles.navLabel, active && styles.navLabelActive]}>{link.label}</Text></Pressable>; })}</ScrollView>
      </View> : null}
      <View style={[styles.container, { width: contentWidth }]}>{!hideHeading ? <Heading description={description} eyebrow={eyebrow} title={title} workspace={vendor} /> : null}<View style={styles.content}>{children}</View></View>
    </ScrollView>
    {showCustomerChrome && width < 900 ? <BottomNav /> : null}
  </SafeAreaView>;
}

function Heading({ description, eyebrow, title, workspace }: { description?: string; eyebrow?: string; title: string; workspace?: boolean }) {
  return <View style={[styles.heading, workspace && styles.workspaceHeading]}>{eyebrow ? <Text style={[styles.eyebrow, workspace && styles.workspaceEyebrow]}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={[styles.title, workspace && styles.workspaceTitle]}>{title}</Text>{description ? <Text style={[styles.description, workspace && styles.workspaceDescription]}>{description}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%", paddingBottom: spacing.xl },
  workspaceChrome: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }, workspaceTop: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 68 }, workspaceBrand: { alignItems: "center", flexDirection: "row", gap: 10 }, workspaceMark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminMark: { backgroundColor: colors.navy }, workspaceMarkText: { color: colors.surface, fontSize: 15, fontWeight: "900" }, workspaceName: { color: colors.text, fontSize: 15, fontWeight: "900" }, workspaceLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: .7, marginTop: 1 }, workspaceActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, iconButton: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 38, justifyContent: "center", position: "relative", width: 38 }, workspaceNav: { alignSelf: "center", gap: 5, paddingBottom: 9 }, navItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 }, navItemActive: { backgroundColor: colors.primarySoft }, navLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" }, navLabelActive: { color: colors.primary, fontWeight: "900" },
  adminTopbar: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: "#e2e8f0", borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, height: 66, justifyContent: "space-between", paddingHorizontal: spacing.md, zIndex: 2 }, adminTopLeft: { alignItems: "center", flexDirection: "row", gap: 10 }, topIcon: { alignItems: "center", borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminSearch: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderRadius: radius.md, borderWidth: 1, flex: 1, flexDirection: "row", gap: 8, maxWidth: 520, paddingHorizontal: 12 }, adminSearchInput: { color: colors.text, flex: 1, fontSize: 13, height: 40, outlineStyle: "none" } as never, notificationDot: { backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 6, borderWidth: 2, height: 8, position: "absolute", right: 7, top: 6, width: 8 }, adminAccount: { alignItems: "center", borderLeftColor: "#e2e8f0", borderLeftWidth: 1, flexDirection: "row", gap: 9, marginLeft: 2, paddingLeft: 12 }, avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 36, justifyContent: "center", width: 36 }, avatarText: { color: colors.primary, fontSize: 14, fontWeight: "900" }, accountName: { color: colors.text, fontSize: 12, fontWeight: "900" }, accountRole: { color: colors.muted, fontSize: 10, marginTop: 1 },
  adminBody: { flex: 1, flexDirection: "row" }, adminSidebar: { backgroundColor: colors.navy, borderRightColor: "#0f1224", borderRightWidth: 1 }, workspacePanel: { alignItems: "center", backgroundColor: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.1)", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 9, margin: 12, padding: 11 }, workspacePanelCollapsed: { justifyContent: "center", paddingHorizontal: 4 }, workspacePulse: { backgroundColor: "#22c55e", borderRadius: 5, height: 9, width: 9 }, workspacePanelTitle: { color: colors.surface, fontSize: 12, fontWeight: "900" }, workspacePanelCopy: { color: "#94a3b8", fontSize: 10, marginTop: 2 }, adminSidebarScroll: { paddingBottom: 14, paddingHorizontal: 10 }, adminGroup: { gap: 3, marginBottom: 5 }, adminGroupButton: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 42, paddingHorizontal: 11 }, adminGroupButtonActive: { backgroundColor: "rgba(30,112,152,.35)" }, adminGroupButtonText: { color: "#cbd5e1", flex: 1, fontSize: 12, fontWeight: "900" }, adminGroupChildren: { borderLeftColor: "rgba(255,255,255,.12)", borderLeftWidth: 1, marginLeft: 19, paddingLeft: 7 }, adminNavItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 39, paddingHorizontal: 11 }, adminNavItemActive: { backgroundColor: colors.primary }, adminNavLabel: { color: "#cbd5e1", flex: 1, fontSize: 11, fontWeight: "700" }, adminNavLabelActive: { color: colors.surface, fontWeight: "900" }, activePip: { backgroundColor: colors.surface, borderRadius: 3, height: 5, width: 5 }, navCollapsed: { justifyContent: "center", paddingHorizontal: 0 }, storefrontLink: { alignItems: "center", borderTopColor: "rgba(255,255,255,.1)", borderTopWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 21 }, storefrontText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
  adminMobileNav: { backgroundColor: colors.navy, gap: 4, padding: 8 }, adminMain: { flex: 1 }, adminPage: { alignSelf: "center", maxWidth: 1440, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, width: "100%" }, adminBreadcrumb: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 42 }, breadcrumbMuted: { color: colors.muted, fontSize: 11, fontWeight: "700" }, breadcrumbCurrent: { color: colors.text, fontSize: 11, fontWeight: "900" },
  container: { alignSelf: "center", gap: spacing.lg, paddingHorizontal: spacing.md, paddingTop: spacing.lg }, heading: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.xl }, workspaceHeading: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, eyebrow: { color: "#fdba74", fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }, workspaceEyebrow: { color: colors.accent }, title: { color: colors.surface, fontSize: 32, fontWeight: "900", letterSpacing: -0.8, lineHeight: 38 }, workspaceTitle: { color: colors.text }, description: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, workspaceDescription: { color: colors.muted }, content: { gap: spacing.md }
});
