import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useState, type PropsWithChildren } from "react";
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from "react-native";
import { BottomNav } from "../features/home/components/BottomNav";
import { StoreHeader } from "../features/home/components/StoreHeader";
import { useAuthStore } from "../features/auth/auth.store";
import { useAdminThemeStore } from "./admin-theme.store";
import { colors, radius, spacing } from "./tokens";

type ScreenProps = PropsWithChildren<{ eyebrow?: string; title: string; description?: string; hideHeading?: boolean }>;
type WorkspaceLink = { label: string; href: string; icon: string };
type AdminGroup = { label: string; icon: string; links: WorkspaceLink[] };

const vendorLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: "grid-outline" },
  { label: "Products", href: "/vendor/products", icon: "cube-outline" },
  { label: "Orders", href: "/vendor/orders", icon: "bag-handle-outline" },
  { label: "Inventory", href: "/vendor/inventory", icon: "layers-outline" },
  { label: "Returns", href: "/vendor/returns", icon: "return-down-back-outline" },
  { label: "Finance", href: "/vendor/finance", icon: "wallet-outline" },
  { label: "Marketing", href: "/vendor/marketing", icon: "megaphone-outline" },
  { label: "Reviews", href: "/vendor/reviews", icon: "star-outline" },
  { label: "Q&A", href: "/vendor/questions", icon: "help-circle-outline" },
  { label: "Messages", href: "/vendor/messages", icon: "chatbubbles-outline" },
  { label: "Support", href: "/vendor/support", icon: "headset-outline" },
  { label: "Shop", href: "/vendor/shop", icon: "storefront-outline" },
  { label: "KYC", href: "/vendor/kyc", icon: "id-card-outline" },
  { label: "Staff", href: "/vendor/staff", icon: "people-outline" },
  { label: "Operations", href: "/vendor/operations", icon: "construct-outline" },
  { label: "Reports", href: "/vendor/reports", icon: "bar-chart-outline" },
  { label: "Payout Setup", href: "/vendor/payout-settings", icon: "card-outline" },
  { label: "University", href: "/vendor/university", icon: "school-outline" },
  { label: "Settings", href: "/vendor/settings", icon: "settings-outline" }
];

const adminPrimaryLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/admin", icon: "grid-outline" },
  { label: "Operations", href: "/admin/operations", icon: "pulse-outline" },
  { label: "University", href: "/admin/university", icon: "school-outline" },
  { label: "Audit Logs", href: "/admin/audit", icon: "time-outline" },
  { label: "Analytics & Reports", href: "/admin/analytics", icon: "bar-chart-outline" },
  { label: "Platform Control", href: "/admin/platform", icon: "settings-outline" },
  { label: "Settings", href: "/admin/settings", icon: "options-outline" },
  { label: "Staff", href: "/admin/staff", icon: "people-circle-outline" }
];

const adminGroups: AdminGroup[] = [
  { label: "Vendors", icon: "storefront-outline", links: [
    { label: "Vendor Requests", href: "/admin/vendor-requests", icon: "person-add-outline" },
    { label: "KYC Review", href: "/admin/vendors/kyc", icon: "id-card-outline" },
    { label: "All Vendors", href: "/admin/vendors", icon: "storefront-outline" },
    { label: "Vendor Activity", href: "/admin/vendor-activity", icon: "pulse-outline" },
    { label: "Vendor Chats", href: "/admin/chats", icon: "chatbubbles-outline" }
  ] },
  { label: "Catalog", icon: "cube-outline", links: [
    { label: "Products", href: "/admin/products", icon: "cube-outline" },
    { label: "Add Product", href: "/admin/products/add", icon: "add-circle-outline" },
    { label: "Inventory", href: "/admin/inventory", icon: "layers-outline" },
    { label: "Categories", href: "/admin/categories", icon: "file-tray-full-outline" },
    { label: "Category Requests", href: "/admin/category-requests", icon: "git-pull-request-outline" }
  ] },
  { label: "Orders", icon: "bag-handle-outline", links: [
    { label: "All Orders", href: "/admin/orders", icon: "bag-handle-outline" },
    { label: "COD Delivery", href: "/admin/cod-delivery", icon: "cash-outline" },
    { label: "COD Reconciliation", href: "/admin/cod-reconciliation", icon: "calculator-outline" },
    { label: "Returns", href: "/admin/returns", icon: "return-down-back-outline" },
    { label: "Logistics", href: "/admin/logistics", icon: "car-outline" },
    { label: "Delivery Settings", href: "/admin/delivery-settings", icon: "options-outline" },
    { label: "Support Tickets", href: "/admin/support", icon: "headset-outline" }
  ] },
  { label: "Marketing", icon: "megaphone-outline", links: [
    { label: "Promotions", href: "/admin/promotions", icon: "megaphone-outline" },
    { label: "Banners", href: "/admin/banners", icon: "images-outline" },
    { label: "Coupons", href: "/admin/coupons", icon: "cut-outline" },
    { label: "Vouchers", href: "/admin/vouchers", icon: "ticket-outline" },
    { label: "Flash Sales", href: "/admin/flash-sales", icon: "flash-outline" },
    { label: "Offers", href: "/admin/offers", icon: "pricetags-outline" },
    { label: "Content", href: "/admin/content", icon: "newspaper-outline" },
    { label: "Newsletter", href: "/admin/newsletter", icon: "mail-outline" }
  ] },
  { label: "Finance", icon: "wallet-outline", links: [
    { label: "Vendor Payouts", href: "/admin/payouts", icon: "wallet-outline" },
    { label: "Payout Requests", href: "/admin/payout-requests", icon: "cash-outline" },
    { label: "Payment Verification", href: "/admin/payment-verification", icon: "card-outline" }
  ] },
  { label: "Customers", icon: "people-outline", links: [
    { label: "Customers", href: "/admin/customers", icon: "people-outline" },
    { label: "Trust & Safety", href: "/admin/trust-safety", icon: "shield-checkmark-outline" },
    { label: "User Roles", href: "/admin/users", icon: "key-outline" },
    { label: "Insights", href: "/admin/insights", icon: "analytics-outline" },
    { label: "Reviews", href: "/admin/reviews/moderation", icon: "star-outline" },
    { label: "Q&A", href: "/admin/qa", icon: "help-circle-outline" }
  ] }
];

const adminLinks = [...adminPrimaryLinks, ...adminGroups.flatMap((group) => group.links)];
const adminRolePriority = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT_AGENT"] as const;
const roleLabel = (role: string) => role.toLocaleLowerCase().split("_").map((part) => part[0]?.toLocaleUpperCase() + part.slice(1)).join(" ");

export function Screen(props: ScreenProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const workspace = pathname.startsWith("/vendor") && pathname !== "/vendor/register" ? "vendor" : pathname.startsWith("/admin") ? "admin" : null;

  if (workspace === "admin") return <AdminScreen {...props} desktop={width >= 1024} pathname={pathname} />;
  return <StandardScreen {...props} pathname={pathname} vendor={workspace === "vendor"} width={width} />;
}

function AdminScreen({ children, description, desktop, eyebrow, hideHeading = false, pathname, title }: ScreenProps & { desktop: boolean; pathname: string }) {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const adminTheme = useAdminThemeStore((state) => state.theme);
  const toggleAdminTheme = useAdminThemeStore((state) => state.toggleTheme);
  const [collapsed, setCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const sidebarWidth = collapsed ? 80 : 288;
  const open = (href: string) => { setSearchQuery(""); setSearchFocused(false); router.push(href as never); };
  const normalizedSearch = searchQuery.trim().toLocaleLowerCase();
  const searchResults = normalizedSearch ? adminLinks.filter((link) => `${link.label} ${link.href.replaceAll("/", " ")}`.toLocaleLowerCase().includes(normalizedSearch)).slice(0, 8) : [];
  const submitSearch = () => { if (searchResults[0]) open(searchResults[0].href); };
  const accountName = session?.profile.displayName || session?.email || "Admin account";
  const accountInitials = accountName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "A";
  const accountRole = adminRolePriority.find((role) => session?.principal.roles.includes(role)) ?? session?.principal.roles[0] ?? "ADMIN";
  const dark = adminTheme === "dark";
  const topbarIcon = dark ? "#e2e8f0" : colors.text;

  return <SafeAreaView style={[styles.safe, dark && styles.adminDarkSafe]}>
    <View style={[styles.adminTopbar, dark && styles.adminDarkTopbar]}>
      <View style={styles.adminTopLeft}>
        {desktop ? <Pressable accessibilityLabel={collapsed ? "Expand admin sidebar" : "Collapse admin sidebar"} onPress={() => setCollapsed((value) => !value)} style={styles.topIcon}><Ionicons color={topbarIcon} name={collapsed ? "menu-outline" : "menu"} size={22} /></Pressable> : null}
        <Pressable onPress={() => open("/admin")} style={styles.workspaceBrand}>
          <View style={[styles.workspaceMark, styles.adminMark]}><Text style={styles.workspaceMarkText}>AG</Text></View>
          <View><Text style={[styles.workspaceName, dark && styles.adminDarkText]}>Amiyo-Go Admin</Text><Text style={[styles.workspaceLabel, dark && styles.adminDarkMuted]}>CONTROL CENTER</Text></View>
        </Pressable>
      </View>
      {desktop ? <View style={styles.adminSearchWrap}><View style={[styles.adminSearch, dark && styles.adminDarkSearch, searchFocused && styles.adminSearchFocused]}><Ionicons color={dark ? "#94a3b8" : colors.muted} name="search-outline" size={18} /><TextInput accessibilityLabel="Search admin pages" autoCapitalize="none" onBlur={() => setTimeout(() => setSearchFocused(false), 120)} onChangeText={setSearchQuery} onFocus={() => setSearchFocused(true)} onSubmitEditing={submitSearch} placeholder="Search admin pages..." placeholderTextColor="#94a3b8" returnKeyType="go" style={[styles.adminSearchInput, dark && styles.adminDarkText]} value={searchQuery} />{searchQuery ? <Pressable accessibilityLabel="Clear admin search" onPress={() => setSearchQuery("")}><Ionicons color={dark ? "#94a3b8" : colors.muted} name="close-circle" size={18} /></Pressable> : null}</View>{searchFocused && normalizedSearch ? <View style={[styles.adminSearchResults, dark && styles.adminDarkResults]}>{searchResults.length ? searchResults.map((link) => <Pressable accessibilityRole="button" key={link.href} onPress={() => open(link.href)} style={[styles.adminSearchResult, dark && styles.adminDarkResult]}><View style={styles.adminSearchIcon}><Ionicons color={colors.primary} name={link.icon as never} size={17} /></View><View style={styles.adminSearchCopy}><Text style={[styles.adminSearchLabel, dark && styles.adminDarkText]}>{link.label}</Text><Text style={styles.adminSearchPath}>{link.href}</Text></View><Ionicons color="#94a3b8" name="arrow-forward" size={15} /></Pressable>) : <View style={styles.adminSearchEmpty}><Ionicons color="#94a3b8" name="search-outline" size={18} /><Text style={styles.adminSearchEmptyText}>No admin page matches “{searchQuery.trim()}”</Text></View>}</View> : null}</View> : null}
      <View style={styles.workspaceActions}>
        {desktop ? <><Pressable accessibilityLabel="Orders" onPress={() => open("/admin/orders")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="clipboard-outline" size={19} /></Pressable><Pressable accessibilityLabel="Vendors" onPress={() => open("/admin/vendor-requests")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="storefront-outline" size={19} /></Pressable><Pressable accessibilityLabel="Payments" onPress={() => open("/admin/payment-verification")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="card-outline" size={19} /></Pressable></> : null}
        <Pressable accessibilityLabel="Open storefront" onPress={() => open("/")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="storefront-outline" size={19} /></Pressable>
        <Pressable accessibilityLabel="Notifications" onPress={() => open("/notifications")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="notifications-outline" size={19} /><View style={styles.notificationDot} /></Pressable>
        <Pressable accessibilityLabel={dark ? "Use light admin theme" : "Use dark admin theme"} accessibilityRole="button" onPress={toggleAdminTheme} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name={dark ? "sunny-outline" : "moon-outline"} size={19} /></Pressable>
        <Pressable accessibilityLabel={`Account: ${accountName}, ${roleLabel(accountRole)}`} onPress={() => open("/account")} style={[styles.adminAccount, dark && styles.adminDarkAccount]}><View style={styles.avatar}><Text style={styles.avatarText}>{accountInitials}</Text></View>{desktop ? <View><Text numberOfLines={1} style={[styles.accountName, dark && styles.adminDarkText]}>{accountName}</Text><Text style={[styles.accountRole, dark && styles.adminDarkMuted]}>{roleLabel(accountRole)}</Text></View> : null}</Pressable>
      </View>
    </View>
    {!desktop ? <ScrollView contentContainerStyle={styles.adminMobileNav} horizontal showsHorizontalScrollIndicator={false}>{adminLinks.map((link) => <AdminNavLink key={link.href} link={link} pathname={pathname} collapsed onOpen={open} />)}</ScrollView> : null}
    <View style={styles.adminBody}>
      {desktop ? <View style={[styles.adminSidebar, { width: sidebarWidth }]}>
        <View style={[styles.workspacePanel, collapsed && styles.workspacePanelCollapsed]}><View style={styles.workspacePulse} />{!collapsed ? <View><Text style={styles.workspacePanelTitle}>Admin workspace</Text><Text style={styles.workspacePanelCopy}>Super admin access</Text></View> : null}</View>
        <ScrollView contentContainerStyle={styles.adminSidebarScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.adminPrimary}>{adminPrimaryLinks.map((link) => <AdminNavLink key={link.href} link={link} pathname={pathname} collapsed={collapsed} onOpen={open} />)}</View>
          {adminGroups.map((group) => {
            const groupActive = group.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
            const expanded = groupActive || (expandedGroups[group.label] ?? false);
            return <View key={group.label} style={styles.adminGroup}>
              {!collapsed ? <Pressable onPress={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))} style={[styles.adminGroupButton, groupActive && styles.adminGroupButtonActive]}><Ionicons color={groupActive ? "#ffffff" : "#cbd5e1"} name={group.icon as never} size={19} /><Text style={[styles.adminGroupButtonText, groupActive && styles.adminNavLabelActive]}>{group.label}</Text><Ionicons color="#94a3b8" name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Pressable> : null}
              {collapsed || expanded ? <View style={!collapsed && styles.adminGroupChildren}>{group.links.map((link) => <AdminNavLink key={link.href} link={link} pathname={pathname} collapsed={collapsed} nested onOpen={open} />)}</View> : null}
            </View>;
          })}
        </ScrollView>
        <Pressable onPress={() => open("/")} style={[styles.storefrontLink, collapsed && styles.navCollapsed]}><Ionicons color="#cbd5e1" name="home-outline" size={19} />{!collapsed ? <Text style={styles.storefrontText}>View storefront</Text> : null}</Pressable>
      </View> : null}
      <ScrollView contentContainerStyle={styles.adminPage} showsVerticalScrollIndicator={false} style={[styles.adminMain, dark && styles.adminDarkMain]}>
        {!hideHeading ? <AdminHeading dark={dark} description={description} eyebrow={eyebrow} onBack={() => router.push("/admin" as never)} title={title} /> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function AdminNavLink({ collapsed, link, nested = false, onOpen, pathname }: { collapsed: boolean; link: WorkspaceLink; nested?: boolean; onOpen: (href: string) => void; pathname: string }) {
  const activeHref = adminLinks.filter((candidate) => pathname === candidate.href || pathname.startsWith(`${candidate.href}/`)).sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const active = activeHref === link.href;
  return <Pressable accessibilityLabel={link.label} onPress={() => onOpen(link.href)} style={[styles.adminNavItem, active && (nested ? styles.adminNestedActive : styles.adminNavItemActive), collapsed && styles.navCollapsed]}>{nested && !collapsed ? <View style={[styles.childDot, active && styles.childDotActive]} /> : <Ionicons color={active ? "#ffffff" : "#cbd5e1"} name={link.icon as never} size={19} />}{!collapsed ? <Text style={[styles.adminNavLabel, active && styles.adminNavLabelActive]}>{link.label}</Text> : null}</Pressable>;
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

function AdminHeading({ dark, description, eyebrow, onBack, title }: { dark: boolean; description?: string; eyebrow?: string; onBack(): void; title: string }) {
  return <View style={[styles.adminHeading, dark && styles.adminDarkHeading]}><Pressable accessibilityLabel="Back to dashboard" onPress={onBack} style={styles.adminBack}><Ionicons color={colors.primary} name="arrow-back" size={20} /></Pressable><View style={styles.adminHeadingCopy}><View style={styles.adminPill}><Text style={styles.adminPillText}>{eyebrow || "AMIYO-GO ADMIN"}</Text></View><Text accessibilityRole="header" style={[styles.adminPageTitle, dark && styles.adminDarkText]}>{title}</Text>{description ? <Text style={[styles.adminPageDescription, dark && styles.adminDarkMuted]}>{description}</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  adminPrimary: { borderBottomColor: "rgba(255,255,255,.1)", borderBottomWidth: 1, gap: 3, marginBottom: 8, paddingBottom: 8 }, adminNestedActive: { backgroundColor: "rgba(255,255,255,.1)" }, childDot: { backgroundColor: "#64748b", borderRadius: radius.pill, height: 6, width: 6 }, childDotActive: { backgroundColor: "#38bdf8" },
  adminHeading: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, marginBottom: spacing.sm, paddingBottom: spacing.lg, paddingTop: spacing.lg }, adminBack: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "rgba(30,112,152,.2)", borderRadius: radius.md, borderWidth: 1, height: 40, justifyContent: "center", width: 40 }, adminHeadingCopy: { flex: 1 }, adminPill: { alignSelf: "flex-start", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, marginBottom: 5, paddingHorizontal: 9, paddingVertical: 4 }, adminPillText: { color: colors.text, fontSize: 9, fontWeight: "900", letterSpacing: .7, textTransform: "uppercase" }, adminPageTitle: { color: colors.text, fontSize: 24, fontWeight: "900", letterSpacing: -.4 }, adminPageDescription: { color: colors.muted, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 3 },
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%", paddingBottom: spacing.xl },
  workspaceChrome: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }, workspaceTop: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 68 }, workspaceBrand: { alignItems: "center", flexDirection: "row", gap: 10 }, workspaceMark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminMark: { backgroundColor: colors.navy }, workspaceMarkText: { color: colors.surface, fontSize: 15, fontWeight: "900" }, workspaceName: { color: colors.text, fontSize: 15, fontWeight: "900" }, workspaceLabel: { color: colors.muted, fontSize: 9, fontWeight: "800", letterSpacing: .7, marginTop: 1 }, workspaceActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, iconButton: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 38, justifyContent: "center", position: "relative", width: 38 }, workspaceNav: { alignSelf: "center", gap: 5, paddingBottom: 9 }, navItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 }, navItemActive: { backgroundColor: colors.primarySoft }, navLabel: { color: colors.muted, fontSize: 12, fontWeight: "800" }, navLabelActive: { color: colors.primary, fontWeight: "900" },
  adminTopbar: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: "#e2e8f0", borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, height: 66, justifyContent: "space-between", paddingHorizontal: spacing.md, zIndex: 20 }, adminTopLeft: { alignItems: "center", flexDirection: "row", gap: 10 }, topIcon: { alignItems: "center", borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminSearchWrap: { flex: 1, maxWidth: 520, position: "relative", zIndex: 30 }, adminSearch: { alignItems: "center", backgroundColor: "#f8fafc", borderColor: "#e2e8f0", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 }, adminSearchFocused: { backgroundColor: colors.surface, borderColor: colors.primary }, adminSearchInput: { color: colors.text, flex: 1, fontSize: 13, height: 40, outlineStyle: "none" } as never, adminSearchResults: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, boxShadow: "0 12px 32px rgba(15,23,42,.18)", left: 0, overflow: "hidden", position: "absolute", right: 0, top: 46 }, adminSearchResult: { alignItems: "center", borderBottomColor: "#f1f5f9", borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 12, paddingVertical: 7 }, adminSearchIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 }, adminSearchCopy: { flex: 1 }, adminSearchLabel: { color: colors.text, fontSize: 13, fontWeight: "900" }, adminSearchPath: { color: colors.muted, fontSize: 10, marginTop: 2 }, adminSearchEmpty: { alignItems: "center", flexDirection: "row", gap: 8, padding: spacing.md }, adminSearchEmptyText: { color: colors.muted, flex: 1, fontSize: 12 }, notificationDot: { backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 6, borderWidth: 2, height: 8, position: "absolute", right: 7, top: 6, width: 8 }, adminAccount: { alignItems: "center", borderLeftColor: "#e2e8f0", borderLeftWidth: 1, flexDirection: "row", gap: 9, marginLeft: 2, paddingLeft: 12 }, avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 36, justifyContent: "center", width: 36 }, avatarText: { color: colors.primary, fontSize: 14, fontWeight: "900" }, accountName: { color: colors.text, fontSize: 12, fontWeight: "900" }, accountRole: { color: colors.muted, fontSize: 10, marginTop: 1 },
  adminBody: { flex: 1, flexDirection: "row" }, adminSidebar: { backgroundColor: colors.navy, borderRightColor: "#0f1224", borderRightWidth: 1 }, workspacePanel: { alignItems: "center", backgroundColor: "rgba(255,255,255,.08)", borderColor: "rgba(255,255,255,.1)", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 9, margin: 12, padding: 11 }, workspacePanelCollapsed: { justifyContent: "center", paddingHorizontal: 4 }, workspacePulse: { backgroundColor: "#22c55e", borderRadius: 5, height: 9, width: 9 }, workspacePanelTitle: { color: colors.surface, fontSize: 12, fontWeight: "900" }, workspacePanelCopy: { color: "#94a3b8", fontSize: 10, marginTop: 2 }, adminSidebarScroll: { paddingBottom: 14, paddingHorizontal: 10 }, adminGroup: { gap: 3, marginBottom: 5 }, adminGroupButton: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 42, paddingHorizontal: 11 }, adminGroupButtonActive: { backgroundColor: "rgba(30,112,152,.35)" }, adminGroupButtonText: { color: "#cbd5e1", flex: 1, fontSize: 12, fontWeight: "900" }, adminGroupChildren: { borderLeftColor: "rgba(255,255,255,.12)", borderLeftWidth: 1, marginLeft: 19, paddingLeft: 7 }, adminNavItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 39, paddingHorizontal: 11 }, adminNavItemActive: { backgroundColor: colors.primary }, adminNavLabel: { color: "#cbd5e1", flex: 1, fontSize: 11, fontWeight: "700" }, adminNavLabelActive: { color: colors.surface, fontWeight: "900" }, activePip: { backgroundColor: colors.surface, borderRadius: 3, height: 5, width: 5 }, navCollapsed: { justifyContent: "center", paddingHorizontal: 0 }, storefrontLink: { alignItems: "center", borderTopColor: "rgba(255,255,255,.1)", borderTopWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 21 }, storefrontText: { color: "#cbd5e1", fontSize: 12, fontWeight: "800" },
  adminMobileNav: { backgroundColor: colors.navy, gap: 4, padding: 8 }, adminMain: { flex: 1 }, adminPage: { alignSelf: "center", maxWidth: 1440, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, width: "100%" }, adminBreadcrumb: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 42 }, breadcrumbMuted: { color: colors.muted, fontSize: 11, fontWeight: "700" }, breadcrumbCurrent: { color: colors.text, fontSize: 11, fontWeight: "900" },
  adminDarkSafe: { backgroundColor: "#0f172a" }, adminDarkTopbar: { backgroundColor: "#111827", borderBottomColor: "#334155" }, adminDarkMain: { backgroundColor: "#0f172a" }, adminDarkText: { color: "#f8fafc" }, adminDarkMuted: { color: "#94a3b8" }, adminDarkButton: { backgroundColor: "#1e293b", borderColor: "#334155" }, adminDarkAccount: { borderLeftColor: "#334155" }, adminDarkSearch: { backgroundColor: "#1e293b", borderColor: "#334155" }, adminDarkResults: { backgroundColor: "#111827", borderColor: "#334155" }, adminDarkResult: { borderBottomColor: "#1e293b" }, adminDarkHeading: { borderBottomColor: "#334155" },
  container: { alignSelf: "center", gap: spacing.lg, paddingHorizontal: spacing.md, paddingTop: spacing.lg }, heading: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.xl }, workspaceHeading: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, eyebrow: { color: "#fdba74", fontSize: 11, fontWeight: "900", letterSpacing: 1, textTransform: "uppercase" }, workspaceEyebrow: { color: colors.accent }, title: { color: colors.surface, fontSize: 32, fontWeight: "900", letterSpacing: -0.8, lineHeight: 38 }, workspaceTitle: { color: colors.text }, description: { color: "#cbd5e1", fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, workspaceDescription: { color: colors.muted }, content: { gap: spacing.md }
});
