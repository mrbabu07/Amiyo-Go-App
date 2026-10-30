import { Ionicons } from "@expo/vector-icons";
import { signOut } from "@firebase/auth";
import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState, type Dispatch, type PropsWithChildren, type SetStateAction } from "react";
import { ActivityIndicator, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, useColorScheme, useWindowDimensions, View, type ScrollViewInstance } from "react-native";
import { AdminGlobalSearch } from "../features/admin/AdminGlobalSearch";
import { BottomNav } from "../features/home/components/BottomNav";
import { StoreHeader } from "../features/home/components/StoreHeader";
import { useAuthStore } from "../features/auth/auth.store";
import { firebaseAuth } from "../features/auth/firebase";
import { useCurrentUser } from "../features/auth/use-current-user";
import { getNotifications } from "../features/engagement/engagement.api";
import { canAccessVendorPath, filterVendorTargets } from "../features/vendor/vendor-navigation";
import { colors, darkPalette, radius, spacing } from "./tokens";
import { useThemeStore } from "./theme.store";
import { ThemeToggle } from "./ThemeToggle";

type ScreenProps = PropsWithChildren<{ eyebrow?: string; title: string; description?: string; hideHeading?: boolean }>;
type WorkspaceLink = { label: string; href: string; icon: string };
type AdminGroup = { label: string; icon: string; links: WorkspaceLink[] };
const emptyVendorPermissions: string[] = [];
const vendorSidebarStorageKey = "amiyo:vendor-sidebar-collapsed";
const readVendorSidebarCollapsed = () => { try { return Platform.OS === "web" && globalThis.localStorage?.getItem(vendorSidebarStorageKey) === "true"; } catch { return false; } };
const persistVendorSidebarCollapsed = (collapsed: boolean) => { try { if (Platform.OS === "web") globalThis.localStorage?.setItem(vendorSidebarStorageKey, String(collapsed)); } catch {} };

const vendorPrimaryLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/vendor/dashboard", icon: "grid-outline" },
  { label: "Notifications", href: "/vendor/notifications", icon: "notifications-outline" },
  { label: "University", href: "/vendor/university", icon: "school-outline" }
];

const vendorGroups: AdminGroup[] = [
  { label: "Products", icon: "cube-outline", links: [
    { label: "All products", href: "/vendor/products", icon: "cube-outline" }, { label: "Add product", href: "/vendor/products/add", icon: "add-circle-outline" }, { label: "Bulk upload", href: "/vendor/products/bulk", icon: "cloud-upload-outline" }, { label: "Inventory", href: "/vendor/inventory", icon: "layers-outline" }, { label: "Category requests", href: "/vendor/category-requests", icon: "git-pull-request-outline" }
  ] },
  { label: "Orders", icon: "bag-handle-outline", links: [
    { label: "All orders", href: "/vendor/orders", icon: "bag-handle-outline" }, { label: "Returns", href: "/vendor/returns", icon: "return-down-back-outline" }
  ] },
  { label: "Finance", icon: "wallet-outline", links: [
    { label: "Overview", href: "/vendor/finance", icon: "wallet-outline" }, { label: "Reconciliation", href: "/vendor/finance/reconciliation", icon: "calculator-outline" }, { label: "Payouts", href: "/vendor/finance/payouts", icon: "cash-outline" }, { label: "Transactions", href: "/vendor/finance/transactions", icon: "swap-horizontal-outline" }, { label: "Statements", href: "/vendor/finance/statements", icon: "document-text-outline" }, { label: "Payout setup", href: "/vendor/payout-settings", icon: "card-outline" }
  ] },
  { label: "Growth", icon: "trending-up-outline", links: [
    { label: "Marketing", href: "/vendor/marketing", icon: "megaphone-outline" }, { label: "Reports", href: "/vendor/reports", icon: "bar-chart-outline" }, { label: "Reviews", href: "/vendor/reviews", icon: "star-outline" }, { label: "Q&A", href: "/vendor/questions", icon: "help-circle-outline" }
  ] },
  { label: "Shop", icon: "storefront-outline", links: [
    { label: "Shop profile", href: "/vendor/shop", icon: "storefront-outline" }, { label: "KYC verification", href: "/vendor/kyc", icon: "id-card-outline" }, { label: "Staff access", href: "/vendor/staff", icon: "people-outline" }, { label: "Settings", href: "/vendor/settings", icon: "settings-outline" }
  ] },
  { label: "Support", icon: "headset-outline", links: [
    { label: "Messages", href: "/vendor/messages", icon: "chatbubbles-outline" }, { label: "Support center", href: "/vendor/support", icon: "headset-outline" }, { label: "Operations", href: "/vendor/operations", icon: "construct-outline" }
  ] }
];

const vendorLinks = [...vendorPrimaryLinks, ...vendorGroups.flatMap((group) => group.links)];
const vendorMobileLinks: WorkspaceLink[] = [
  vendorPrimaryLinks[0]!,
  vendorGroups[0]!.links[0]!,
  vendorGroups[1]!.links[0]!,
  vendorGroups[2]!.links[0]!,
  vendorGroups[3]!.links[0]!,
  vendorGroups[4]!.links[0]!
];

const adminPrimaryLinks: WorkspaceLink[] = [
  { label: "Dashboard", href: "/admin", icon: "grid-outline" },
  { label: "Operations", href: "/admin/operations", icon: "pulse-outline" },
  { label: "University", href: "/admin/university", icon: "school-outline" },
  { label: "Audit Logs", href: "/admin/audit", icon: "time-outline" },
  { label: "Data Integrity", href: "/admin/data-integrity", icon: "shield-checkmark-outline" },
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
    { label: "Category Tree", href: "/admin/categories/manage", icon: "git-network-outline" },
    { label: "Category Requests", href: "/admin/category-requests", icon: "git-pull-request-outline" }
  ] },
  { label: "Orders", icon: "bag-handle-outline", links: [
    { label: "All Orders", href: "/admin/orders", icon: "bag-handle-outline" },
    { label: "COD Reconciliation", href: "/admin/cod-reconciliation", icon: "calculator-outline" },
    { label: "COD Delivery", href: "/admin/cod-delivery", icon: "cash-outline" },
    { label: "Returns", href: "/admin/returns", icon: "return-down-back-outline" },
    { label: "Logistics", href: "/admin/logistics", icon: "car-outline" },
    { label: "My Orders", href: "/admin/logistics?tab=work", icon: "clipboard-outline" },
    { label: "Ready Pickup", href: "/admin/logistics?tab=ready", icon: "cube-outline" },
    { label: "Dispatch Manifest", href: "/admin/logistics?tab=manifest", icon: "document-text-outline" },
    { label: "Parcel Assignment", href: "/admin/logistics?tab=parcels", icon: "git-branch-outline" },
    { label: "Pickup Staff", href: "/admin/logistics?tab=staff", icon: "people-outline" },
    { label: "COD Float", href: "/admin/logistics?tab=cod", icon: "wallet-outline" },
    { label: "Failed Delivery", href: "/admin/logistics?tab=failed", icon: "warning-outline" },
    { label: "Support Tickets", href: "/admin/support", icon: "headset-outline" }
  ] },
  { label: "Marketing", icon: "megaphone-outline", links: [
    { label: "Promotions", href: "/admin/promotions", icon: "megaphone-outline" },
    { label: "Banners", href: "/admin/banners", icon: "images-outline" },
    { label: "Vouchers", href: "/admin/vouchers", icon: "ticket-outline" },
    { label: "Coupons", href: "/admin/coupons", icon: "cut-outline" },
    { label: "Flash Sales", href: "/admin/flash-sales", icon: "flash-outline" },
    { label: "Offers", href: "/admin/offers", icon: "pricetags-outline" },
    { label: "Content", href: "/admin/content", icon: "newspaper-outline" },
    { label: "Newsletter", href: "/admin/newsletter", icon: "mail-outline" }
  ] },
  { label: "Finance", icon: "wallet-outline", links: [
    { label: "Commission Rules", href: "/admin/commissions", icon: "calculator-outline" },
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

const adminStandaloneLinks: WorkspaceLink[] = [{ label: "Delivery Settings", href: "/admin/delivery-settings", icon: "car-outline" }];
const adminLinks = [...adminPrimaryLinks, ...adminGroups.flatMap((group) => group.links), ...adminStandaloneLinks];
const adminRolePriority = ["SUPER_ADMIN", "OPERATIONS_ADMIN", "FINANCE_ADMIN", "SUPPORT_AGENT"] as const;
const roleLabel = (role: string) => role.toLocaleLowerCase().split("_").map((part) => part[0]?.toLocaleUpperCase() + part.slice(1)).join(" ");

export function Screen(props: ScreenProps) {
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const workspace = pathname.startsWith("/vendor") && pathname !== "/vendor/register" ? "vendor" : pathname.startsWith("/admin") ? "admin" : null;

  if (workspace === "admin") return <AdminScreen {...props} desktop={width >= 1024} pathname={pathname} width={width} />;
  if (workspace === "vendor") return <VendorScreen {...props} desktop={width >= 1024} pathname={pathname} width={width} />;
  return <StandardScreen {...props} pathname={pathname} vendor={workspace === "vendor"} width={width} />;
}

function AdminScreen({ children, description, desktop, eyebrow, hideHeading = false, pathname, title, width }: ScreenProps & { desktop: boolean; pathname: string; width: number }) {
  const router = useRouter();
  const user = useCurrentUser();
  const session = useAuthStore((state) => state.session);
  const systemColorScheme = useColorScheme();
  const themeMode = useThemeStore((state) => state.mode);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const sidebarWidth = collapsed ? 80 : 288;
  const open = (href: string) => { if (Platform.OS === "web" && document.activeElement instanceof HTMLElement) document.activeElement.blur(); setMobileSidebarOpen(false); router.push(href as never); };
  const accountName = session?.profile.displayName || session?.email || "Admin account";
  const accountInitials = accountName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "A";
  const accountRole = adminRolePriority.find((role) => session?.principal.roles.includes(role)) ?? session?.principal.roles[0] ?? "ADMIN";
  const dark = themeMode === "dark" || (themeMode === "system" && systemColorScheme === "dark");
  const topbarIcon = dark ? colors.onPrimary : colors.text;
  const notifications = useQuery({ queryKey: ["notifications", user?.uid], queryFn: () => getNotifications(user!), enabled: Boolean(user), refetchInterval: 30_000 });
  const unreadNotifications = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const unreadOrders = notifications.data?.filter((item) => !item.readAt && item.href?.startsWith("/admin/orders")).length ?? 0;
  const logout = async () => { if (firebaseAuth) await signOut(firebaseAuth); open("/login"); };

  return <SafeAreaView style={[styles.safe, dark && styles.adminDarkSafe]}>
    <View style={[styles.adminTopbar, !desktop && styles.adminMobileTopbar, dark && styles.adminDarkTopbar]}>
      <View style={styles.adminTopLeft}>
        <Pressable accessibilityLabel={desktop ? (collapsed ? "Expand admin sidebar" : "Collapse admin sidebar") : (mobileSidebarOpen ? "Close admin menu" : "Open admin menu")} onPress={() => desktop ? setCollapsed((value) => !value) : setMobileSidebarOpen((value) => !value)} style={styles.topIcon}><Ionicons color={topbarIcon} name={desktop ? (collapsed ? "menu-outline" : "menu") : (mobileSidebarOpen ? "close" : "menu")} size={22} /></Pressable>
        <Pressable onPress={() => open("/admin")} style={styles.workspaceBrand}>
          <View style={[styles.workspaceMark, styles.adminMark]}><Text style={styles.workspaceMarkText}>AG</Text></View>
          {width >= 430 ? <View><Text style={[styles.workspaceName, dark && styles.adminDarkText]}>Amiyo-Go Admin</Text><Text style={[styles.workspaceLabel, dark && styles.adminDarkMuted]}>CONTROL CENTER</Text></View> : null}
        </Pressable>
      </View>
      {desktop ? <AdminGlobalSearch dark={dark} onOpen={open} routes={adminLinks} /> : null}
      <View style={[styles.workspaceActions, !desktop && styles.adminMobileActions]}>
        {desktop ? <><Pressable accessibilityLabel={unreadOrders ? `Orders, ${unreadOrders} new updates` : "Orders"} onPress={() => open("/admin/orders")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="clipboard-outline" size={19} />{unreadOrders ? <CountBadge count={unreadOrders} /> : null}</Pressable><Pressable accessibilityLabel="Vendors" onPress={() => open("/admin/vendor-requests")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="storefront-outline" size={19} /></Pressable><Pressable accessibilityLabel="Payments" onPress={() => open("/admin/payment-verification")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="card-outline" size={19} /></Pressable></> : null}
        {desktop ? <Pressable accessibilityLabel="Open storefront" onPress={() => open("/")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="storefront-outline" size={19} /></Pressable> : null}
        <Pressable accessibilityLabel={unreadNotifications ? `Notifications, ${unreadNotifications} unread` : "Notifications"} onPress={() => open("/admin/notifications")} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name="notifications-outline" size={19} />{unreadNotifications ? <CountBadge count={unreadNotifications} /> : null}</Pressable>
        <Pressable accessibilityLabel={dark ? "Use light admin theme" : "Use dark admin theme"} accessibilityRole="button" onPress={toggleTheme} style={[styles.iconButton, dark && styles.adminDarkButton]}><Ionicons color={topbarIcon} name={dark ? "sunny-outline" : "moon-outline"} size={19} /></Pressable>
        {desktop ? <Pressable accessibilityLabel={`Account: ${accountName}, ${roleLabel(accountRole)}`} onPress={() => open("/account")} style={[styles.adminAccount, dark && styles.adminDarkAccount]}><View style={styles.avatar}><Text style={styles.avatarText}>{accountInitials}</Text></View><View><Text numberOfLines={1} style={[styles.accountName, dark && styles.adminDarkText]}>{accountName}</Text><Text style={[styles.accountRole, dark && styles.adminDarkMuted]}>{roleLabel(accountRole)}</Text></View></Pressable> : null}
        <Pressable accessibilityLabel="Sign out" onPress={logout} style={[styles.iconButton, styles.logoutButton, dark && styles.adminDarkButton]}><Ionicons color={colors.danger} name="log-out-outline" size={19} /></Pressable>
      </View>
    </View>
    {!desktop ? <AdminMobileSearch dark={dark} onOpen={open} /> : null}
    {!desktop && mobileSidebarOpen ? <View style={styles.adminDrawerLayer}>
      <Pressable accessibilityLabel="Close admin menu" onPress={() => setMobileSidebarOpen(false)} style={styles.adminDrawerBackdrop} />
      <View accessibilityLabel="Admin navigation" style={[styles.adminDrawer, dark && styles.adminDarkSidebar, { width: Math.min(width - 48, 288) }]}>
        <AdminSidebarNavigation collapsed={false} dark={dark} expandedGroups={expandedGroups} onOpen={open} pathname={pathname} setExpandedGroups={setExpandedGroups} />
      </View>
    </View> : null}
    <View style={styles.adminBody}>
      {desktop ? <View style={[styles.adminSidebar, dark && styles.adminDarkSidebar, { width: sidebarWidth }]}>
        <AdminSidebarNavigation collapsed={collapsed} dark={dark} expandedGroups={expandedGroups} onOpen={open} pathname={pathname} setExpandedGroups={setExpandedGroups} />
      </View> : null}
      <ScrollView contentContainerStyle={[styles.adminPage, !desktop && styles.adminMobilePage]} showsVerticalScrollIndicator={false} style={[styles.adminMain, dark && styles.adminDarkMain]}>
        {!hideHeading ? <AdminHeading dark={dark} description={description} eyebrow={eyebrow} onBack={() => open("/admin")} title={title} /> : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
    </View>
  </SafeAreaView>;
}

function CountBadge({ count }: { count: number }) { return <View style={styles.vendorNotificationBadge}><Text style={styles.vendorNotificationBadgeText}>{count > 99 ? "99+" : count}</Text></View>; }

function AdminMobileSearch({ dark, onOpen }: { dark: boolean; onOpen(href: string): void }) {
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const searchResults = search.trim().length < 2 ? [] : adminLinks.filter((link) => `${link.label} ${link.href}`.toLowerCase().includes(search.trim().toLowerCase())).slice(0, 6);
  const submitSearch = () => { const match = searchResults[0]; if (match) { setSearch(""); setFocused(false); onOpen(match.href); } };
  return <View style={[styles.adminMobileSearchWrap, dark && styles.adminDarkTopbar]}>
    <View style={[styles.adminSearch, dark && styles.adminDarkSearch, focused && styles.adminSearchFocused]}><Ionicons color={dark ? darkPalette.muted : colors.muted} name="search-outline" size={17} /><TextInput accessibilityLabel="Search admin pages" onBlur={() => setTimeout(() => setFocused(false), 120)} onChangeText={setSearch} onFocus={() => setFocused(true)} onSubmitEditing={submitSearch} placeholder="Search admin pages" placeholderTextColor={dark ? darkPalette.muted : colors.muted} returnKeyType="search" style={[styles.adminSearchInput, dark && styles.adminDarkText]} value={search} /></View>
    {focused && search.trim().length >= 2 ? <View style={[styles.adminMobileSearchResults, dark && styles.adminDarkResults]}>{searchResults.map((item) => <Pressable key={item.href} onPress={() => { setSearch(""); setFocused(false); onOpen(item.href); }} style={[styles.adminSearchResult, dark && styles.adminDarkResult]}><Ionicons color={colors.primary} name={item.icon as never} size={18} /><View style={styles.adminSearchCopy}><Text style={[styles.adminSearchLabel, dark && styles.adminDarkText]}>{item.label}</Text><Text style={styles.adminSearchPath}>{item.href}</Text></View></Pressable>)}{!searchResults.length ? <View style={styles.adminSearchEmpty}><Ionicons color={colors.muted} name="search-outline" size={18} /><Text style={styles.adminSearchEmptyText}>No admin page matches “{search.trim()}”.</Text></View> : null}</View> : null}
  </View>;
}

function AdminSidebarNavigation({ collapsed, dark, expandedGroups, onOpen, pathname, setExpandedGroups }: { collapsed: boolean; dark: boolean; expandedGroups: Record<string, boolean>; onOpen: (href: string) => void; pathname: string; setExpandedGroups: Dispatch<SetStateAction<Record<string, boolean>>> }) {
  return <>
    <View style={[styles.workspacePanel, dark && styles.adminDarkWorkspacePanel, collapsed && styles.workspacePanelCollapsed]}><View style={styles.workspacePulse} />{!collapsed ? <View><Text style={[styles.workspacePanelTitle, dark && styles.adminDarkNavText]}>Admin workspace</Text><Text style={[styles.workspacePanelCopy, dark && styles.adminDarkMuted]}>Super admin access</Text></View> : null}</View>
    <ScrollView contentContainerStyle={styles.adminSidebarScroll} showsVerticalScrollIndicator={false} style={styles.adminSidebarScroller}>
      <View style={[styles.adminPrimary, dark && styles.adminDarkSection]}>{adminPrimaryLinks.map((link) => <AdminNavLink dark={dark} key={link.href} link={link} pathname={pathname} collapsed={collapsed} onOpen={onOpen} />)}</View>
      {adminGroups.map((group) => {
        const groupActive = group.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`));
        const expanded = groupActive || (expandedGroups[group.label] ?? false);
        return <View key={group.label} style={styles.adminGroup}>
          {!collapsed ? <Pressable accessibilityRole="button" onPress={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))} style={[styles.adminGroupButton, groupActive && styles.adminGroupButtonActive, dark && groupActive && styles.adminDarkGroupActive]}><Ionicons color={groupActive ? (dark ? colors.onPrimary : colors.primary) : (dark ? colors.shellMuted : colors.muted)} name={group.icon as never} size={19} /><Text style={[styles.adminGroupButtonText, dark && styles.adminDarkNavMuted, groupActive && styles.adminLightActiveText, dark && groupActive && styles.adminNavLabelActive]}>{group.label}</Text><Ionicons color={dark ? colors.shellMuted : colors.muted} name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Pressable> : null}
          {collapsed || expanded ? <View style={[!collapsed && styles.adminGroupChildren, dark && !collapsed && styles.adminDarkGroupChildren]}>{group.links.map((link) => <AdminNavLink dark={dark} key={link.href} link={link} pathname={pathname} collapsed={collapsed} nested onOpen={onOpen} />)}</View> : null}
        </View>;
      })}
      <View style={[styles.adminStandalone, dark && styles.adminDarkSection]}>{adminStandaloneLinks.map((link) => <AdminNavLink dark={dark} key={link.href} link={link} pathname={pathname} collapsed={collapsed} onOpen={onOpen} />)}</View>
    </ScrollView>
    <Pressable onPress={() => onOpen("/")} style={[styles.storefrontLink, dark && styles.adminDarkStorefront, collapsed && styles.navCollapsed]}><Ionicons color={dark ? colors.shellMuted : colors.muted} name="home-outline" size={19} />{!collapsed ? <Text style={[styles.storefrontText, !dark && styles.adminLightNavText]}>View storefront</Text> : null}</Pressable>
  </>;
}

function AdminNavLink({ collapsed, dark, link, nested = false, onOpen, pathname }: { collapsed: boolean; dark: boolean; link: WorkspaceLink; nested?: boolean; onOpen: (href: string) => void; pathname: string }) {
  const activeHref = adminLinks.filter((candidate) => pathname === candidate.href || pathname.startsWith(`${candidate.href}/`)).sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const active = activeHref === link.href;
  return <Pressable accessibilityLabel={link.label} onPress={() => onOpen(link.href)} style={[styles.adminNavItem, active && (nested ? styles.adminNestedActive : styles.adminNavItemActive), dark && active && (nested ? styles.adminDarkNestedActive : styles.adminDarkNavActive), collapsed && styles.navCollapsed]}>{nested && !collapsed ? <View style={[styles.childDot, dark && styles.adminDarkChildDot, active && styles.childDotActive]} /> : <Ionicons color={active ? (dark ? colors.onPrimary : colors.primary) : (dark ? colors.shellMuted : colors.muted)} name={link.icon as never} size={19} />}{!collapsed ? <Text style={[styles.adminNavLabel, dark && styles.adminDarkNavMuted, active && styles.adminLightActiveText, dark && active && styles.adminNavLabelActive]}>{link.label}</Text> : null}</Pressable>;
}

function VendorScreen({ children, description, desktop, eyebrow, hideHeading = false, pathname, title, width }: ScreenProps & { desktop: boolean; pathname: string; width: number }) {
  const router = useRouter();
  const pageScrollRef = useRef<ScrollViewInstance>(null);
  const session = useAuthStore((state) => state.session);
  const authStatus = useAuthStore((state) => state.status);
  const user = useCurrentUser();
  const [collapsed, setCollapsed] = useState(readVendorSidebarCollapsed);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const sidebarWidth = collapsed ? 80 : 272;
  const sessionLoading = authStatus === "loading" && Boolean(user) && !session;
  const permissions = session?.permissions ?? emptyVendorPermissions;
  const visibleMobileLinks = useMemo(() => filterVendorTargets(vendorMobileLinks, permissions), [permissions]);
  const accessDenied = Boolean(session?.vendorMemberships.length && !canAccessVendorPath(pathname, permissions));
  const notifications = useQuery({ queryKey: ["notifications", user?.uid], queryFn: () => getNotifications(user!), enabled: Boolean(user && session?.vendorMemberships.length), refetchInterval: 30_000 });
  const unreadNotifications = notifications.data?.filter((item) => !item.readAt).length ?? 0;
  const open = (href: string) => { if (Platform.OS === "web" && document.activeElement instanceof HTMLElement) document.activeElement.blur(); setMobileSidebarOpen(false); setMobileSearchOpen(false); router.push(href as never); };
  const accountName = session?.profile.displayName || session?.email || "Seller account";
  const accountInitials = accountName.split(/[\s@]+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toLocaleUpperCase()).join("") || "S";
  const logout = async () => { if (firebaseAuth) await signOut(firebaseAuth); open("/login"); };
  useEffect(() => persistVendorSidebarCollapsed(collapsed), [collapsed]);
  useEffect(() => {
    pageScrollRef.current?.scrollTo({ animated: false, y: 0 });
    setMobileSidebarOpen(false);
    setMobileSearchOpen(false);
  }, [pathname]);

  return <SafeAreaView style={styles.safe}>
    <View style={[styles.vendorTopbar, !desktop && styles.vendorMobileTopbar]}>
      <View style={styles.adminTopLeft}><Pressable accessibilityLabel={desktop ? (collapsed ? "Expand seller menu" : "Collapse seller menu") : (mobileSidebarOpen ? "Close seller menu" : "Open seller menu")} onPress={() => desktop ? setCollapsed((value) => !value) : (setMobileSearchOpen(false), setMobileSidebarOpen((value) => !value))} style={styles.topIcon}><Ionicons color={colors.text} name={mobileSidebarOpen ? "close" : "menu"} size={23} /></Pressable><Pressable onPress={() => open("/vendor/dashboard")} style={styles.workspaceBrand}><View style={styles.vendorMark}><Text style={styles.workspaceMarkText}>AG</Text></View>{width >= 350 ? <View style={styles.vendorBrandCopy}><Text numberOfLines={1} style={styles.workspaceName}>Amiyo-Go</Text><Text style={styles.workspaceLabel}>SELLER CENTER</Text></View> : null}</Pressable></View>
      {desktop ? <VendorRouteSearch onOpen={open} /> : null}
      <View style={styles.workspaceActions}>{!desktop ? <Pressable accessibilityLabel={mobileSearchOpen ? "Close seller search" : "Search seller tools"} onPress={() => { setMobileSidebarOpen(false); setMobileSearchOpen((value) => !value); }} style={[styles.iconButton, mobileSearchOpen && styles.vendorSearchToggleActive]}><Ionicons color={mobileSearchOpen ? colors.surface : colors.text} name={mobileSearchOpen ? "close" : "search-outline"} size={19} /></Pressable> : null}{desktop && canAccessVendorPath("/vendor/products/add", permissions) ? <Pressable accessibilityLabel="Add product" onPress={() => open("/vendor/products/add")} style={styles.vendorAddButton}><Ionicons color={colors.surface} name="add" size={18} /><Text style={styles.vendorAddButtonText}>Add product</Text></Pressable> : null}{desktop ? <Pressable accessibilityLabel="Open storefront" onPress={() => open("/")} style={styles.iconButton}><Ionicons color={colors.text} name="storefront-outline" size={19} /></Pressable> : null}<Pressable accessibilityLabel={unreadNotifications ? `Seller notifications, ${unreadNotifications} unread` : "Seller notifications"} onPress={() => open("/vendor/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={19} />{unreadNotifications ? <View style={styles.vendorNotificationBadge}><Text style={styles.vendorNotificationBadgeText}>{unreadNotifications > 9 ? "9+" : unreadNotifications}</Text></View> : null}</Pressable>{desktop ? <ThemeToggle compact /> : null}{desktop ? <Pressable accessibilityLabel={`Seller account: ${accountName}`} onPress={() => open("/account")} style={styles.vendorAccount}><View style={styles.vendorAvatar}><Text style={styles.avatarText}>{accountInitials}</Text></View><View><Text numberOfLines={1} style={styles.accountName}>{accountName}</Text><Text style={styles.accountRole}>Vendor workspace</Text></View></Pressable> : <Pressable accessibilityLabel="Seller account" onPress={() => open("/account")} style={styles.vendorAvatar}><Text style={styles.avatarText}>{accountInitials}</Text></Pressable>}{desktop ? <Pressable accessibilityLabel="Sign out" onPress={logout} style={[styles.iconButton, styles.logoutButton]}><Ionicons color={colors.danger} name="log-out-outline" size={19} /></Pressable> : null}</View>
    </View>
    {!desktop && mobileSearchOpen ? <View style={styles.vendorSearchPopover}><VendorRouteSearch compact onOpen={open} /></View> : null}
    {!desktop && mobileSidebarOpen ? <View style={[styles.adminDrawerLayer, styles.vendorDrawerLayer]}><Pressable accessibilityLabel="Close seller menu" onPress={() => setMobileSidebarOpen(false)} style={styles.adminDrawerBackdrop} /><View accessibilityLabel="Seller navigation" style={[styles.vendorDrawer, { width: Math.min(width - 42, 286) }]}><VendorSidebar collapsed={false} expandedGroups={expandedGroups} onOpen={open} pathname={pathname} setExpandedGroups={setExpandedGroups} /><View style={styles.vendorDrawerFooter}><Pressable onPress={() => open("/account")} style={styles.vendorDrawerAction}><Ionicons color={colors.shellMuted} name="person-outline" size={19} /><Text style={styles.storefrontText}>Account</Text></Pressable><Pressable onPress={logout} style={styles.vendorDrawerAction}><Ionicons color={colors.shellDanger} name="log-out-outline" size={19} /><Text style={styles.vendorDrawerLogoutText}>Sign out</Text></Pressable></View></View></View> : null}
    <View style={styles.adminBody}>{desktop ? <View style={[styles.vendorSidebar, { width: sidebarWidth }]}>{sessionLoading ? <VendorSidebarLoading collapsed={collapsed} /> : <VendorSidebar collapsed={collapsed} expandedGroups={expandedGroups} onOpen={open} pathname={pathname} setExpandedGroups={setExpandedGroups} />}</View> : null}<ScrollView contentContainerStyle={[styles.vendorPage, !desktop && styles.vendorMobilePage]} ref={pageScrollRef} showsVerticalScrollIndicator={false} style={styles.adminMain}>{!hideHeading ? <VendorHeading compact={!desktop} description={description} eyebrow={eyebrow} onBack={() => open("/vendor/dashboard")} showBack={pathname !== "/vendor/dashboard"} title={title} /> : null}<View style={styles.content}>{sessionLoading ? <VendorSessionLoading /> : accessDenied ? <VendorAccessDenied onBack={() => open("/vendor/dashboard")} /> : children}</View></ScrollView></View>
    {!desktop && !sessionLoading ? <View accessibilityLabel="Seller primary navigation" style={styles.vendorBottomDock}>{visibleMobileLinks.slice(0, 2).map((link) => <VendorDockLink key={link.href} link={link} onOpen={open} pathname={pathname} />)}{canAccessVendorPath("/vendor/products/add", permissions) ? <Pressable accessibilityLabel="Add product" onPress={() => open("/vendor/products/add")} style={styles.vendorCreateItem}><View style={styles.vendorCreateIcon}><Ionicons color={colors.surface} name="add" size={25} /></View><Text style={styles.vendorCreateText}>Add</Text></Pressable> : null}{visibleMobileLinks.slice(2, 3).map((link) => <VendorDockLink key={link.href} link={link} onOpen={open} pathname={pathname} />)}<Pressable accessibilityLabel="More seller tools" onPress={() => { setMobileSearchOpen(false); setMobileSidebarOpen(true); }} style={styles.vendorDockItem}><View style={[styles.vendorDockIcon, mobileSidebarOpen && styles.vendorDockIconActive]}><Ionicons color={mobileSidebarOpen ? colors.surface : colors.muted} name="grid-outline" size={19} /></View><Text style={[styles.vendorDockText, mobileSidebarOpen && styles.vendorDockTextActive]}>More</Text></Pressable></View> : null}
  </SafeAreaView>;
}

function VendorSessionLoading() {
  return <View accessibilityLabel="Restoring seller workspace" style={styles.vendorSessionLoading}><View style={styles.vendorLoadingIcon}><ActivityIndicator color={colors.primary} /></View><Text style={styles.vendorLoadingTitle}>Restoring seller workspace</Text><Text style={styles.vendorLoadingCopy}>Loading your shop permissions, catalog and operations securely.</Text><View style={styles.vendorLoadingRows}>{[0, 1, 2].map((item) => <View key={item} style={styles.vendorLoadingRow}><View style={styles.vendorLoadingDot} /><View style={styles.vendorLoadingLine} /></View>)}</View></View>;
}

function VendorSidebarLoading({ collapsed }: { collapsed: boolean }) {
  return <View accessibilityLabel="Loading seller navigation" style={styles.vendorSidebarLoading}><View style={[styles.vendorWorkspacePanel, collapsed && styles.workspacePanelCollapsed]}><ActivityIndicator color="#d6df9b" />{!collapsed ? <Text style={styles.workspacePanelTitle}>Loading workspace</Text> : null}</View>{[0, 1, 2, 3, 4].map((item) => <View key={item} style={[styles.vendorSidebarLoadingRow, collapsed && styles.navCollapsed]}><View style={styles.vendorSidebarLoadingIcon} />{!collapsed ? <View style={styles.vendorSidebarLoadingLine} /> : null}</View>)}</View>;
}

function VendorRouteSearch({ compact = false, onOpen }: { compact?: boolean; onOpen(href: string): void }) {
  const permissions = useAuthStore((state) => state.session?.permissions ?? emptyVendorPermissions);
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const normalized = query.trim().toLocaleLowerCase();
  const allowedLinks = useMemo(() => filterVendorTargets(vendorLinks, permissions), [permissions]);
  const results = normalized.length < 2 ? [] : allowedLinks.filter((link) => `${link.label} ${link.href}`.toLocaleLowerCase().includes(normalized)).slice(0, 7);
  const submit = () => { if (results[0]) onOpen(results[0].href); };
  return <View style={[styles.vendorSearchWrap, compact && styles.vendorSearchWrapCompact]}>
    <View style={[styles.vendorSearch, focused && styles.vendorSearchFocused]}><Ionicons color={colors.muted} name="search-outline" size={18} /><TextInput accessibilityLabel="Search seller tools" autoCapitalize="none" onChangeText={setQuery} onFocus={() => setFocused(true)} onSubmitEditing={submit} placeholder="Search products, orders, finance..." placeholderTextColor={colors.muted} returnKeyType="search" style={styles.vendorSearchInput} value={query} />{query ? <Pressable accessibilityLabel="Clear seller search" onPress={() => setQuery("")}><Ionicons color={colors.muted} name="close-circle" size={18} /></Pressable> : null}</View>
    {focused && normalized.length > 0 ? <View style={styles.vendorSearchResults}>{normalized.length < 2 ? <View style={styles.vendorSearchHint}><Text style={styles.vendorSearchHintText}>Type at least 2 characters.</Text></View> : results.length ? results.map((link) => <Pressable key={link.href} onPress={() => onOpen(link.href)} style={styles.vendorSearchResult}><View style={styles.vendorSearchIcon}><Ionicons color={colors.primary} name={link.icon as never} size={17} /></View><View style={styles.adminSearchCopy}><Text style={styles.adminSearchLabel}>{link.label}</Text><Text style={styles.adminSearchPath}>{link.href}</Text></View><Ionicons color={colors.muted} name="arrow-forward" size={15} /></Pressable>) : <View style={styles.vendorSearchHint}><Text style={styles.vendorSearchHintText}>No seller tool matches “{query.trim()}”.</Text></View>}</View> : null}
  </View>;
}

function VendorSidebar({ collapsed, expandedGroups, onOpen, pathname, setExpandedGroups }: { collapsed: boolean; expandedGroups: Record<string, boolean>; onOpen: (href: string) => void; pathname: string; setExpandedGroups: Dispatch<SetStateAction<Record<string, boolean>>> }) {
  const permissions = useAuthStore((state) => state.session?.permissions ?? emptyVendorPermissions);
  const primaryLinks = useMemo(() => filterVendorTargets(vendorPrimaryLinks, permissions), [permissions]);
  const groups = useMemo(() => vendorGroups.map((group) => ({ ...group, links: filterVendorTargets(group.links, permissions) })).filter((group) => group.links.length), [permissions]);
  return <><View style={[styles.vendorWorkspacePanel, collapsed && styles.workspacePanelCollapsed]}><View style={styles.workspacePulse} />{!collapsed ? <View><Text style={styles.workspacePanelTitle}>Seller workspace</Text><Text style={styles.workspacePanelCopy}>Store operations online</Text></View> : null}</View><ScrollView contentContainerStyle={styles.adminSidebarScroll} showsVerticalScrollIndicator={false} style={styles.adminSidebarScroller}><View style={styles.adminPrimary}>{primaryLinks.map((link) => <VendorNavLink collapsed={collapsed} key={link.href} link={link} onOpen={onOpen} pathname={pathname} />)}</View>{groups.map((group) => { const groupActive = group.links.some((link) => pathname === link.href || pathname.startsWith(`${link.href}/`)); const expanded = groupActive || (expandedGroups[group.label] ?? false); return <View key={group.label} style={styles.adminGroup}>{!collapsed ? <Pressable onPress={() => setExpandedGroups((current) => ({ ...current, [group.label]: !expanded }))} style={[styles.adminGroupButton, groupActive && styles.vendorGroupActive]}><Ionicons color={groupActive ? colors.onPrimary : colors.shellMuted} name={group.icon as never} size={19} /><Text style={[styles.adminGroupButtonText, groupActive && styles.adminNavLabelActive]}>{group.label}</Text><Ionicons color={colors.shellMuted} name={expanded ? "chevron-up" : "chevron-down"} size={15} /></Pressable> : null}{collapsed || expanded ? <View style={!collapsed && styles.adminGroupChildren}>{group.links.map((link) => <VendorNavLink collapsed={collapsed} key={link.href} link={link} nested onOpen={onOpen} pathname={pathname} />)}</View> : null}</View>; })}</ScrollView><Pressable onPress={() => onOpen("/")} style={[styles.storefrontLink, collapsed && styles.navCollapsed]}><Ionicons color={colors.shellMuted} name="home-outline" size={19} />{!collapsed ? <Text style={styles.storefrontText}>View storefront</Text> : null}</Pressable></>;
}

function VendorAccessDenied({ onBack }: { onBack(): void }) {
  return <View style={styles.vendorDenied}><View style={styles.vendorDeniedIcon}><Ionicons color={colors.primary} name="lock-closed-outline" size={26} /></View><Text style={styles.vendorDeniedTitle}>This seller tool is restricted</Text><Text style={styles.vendorDeniedCopy}>Your staff role does not include the permission required for this workspace. Ask the shop owner to update your access.</Text><Pressable onPress={onBack} style={styles.vendorDeniedButton}><Text style={styles.vendorDeniedButtonText}>Back to seller dashboard</Text></Pressable></View>;
}

function VendorNavLink({ collapsed, link, nested = false, onOpen, pathname }: { collapsed: boolean; link: WorkspaceLink; nested?: boolean; onOpen: (href: string) => void; pathname: string }) {
  const activeHref = vendorLinks.filter((candidate) => pathname === candidate.href || pathname.startsWith(`${candidate.href}/`)).sort((left, right) => right.href.length - left.href.length)[0]?.href;
  const active = activeHref === link.href;
  return <Pressable accessibilityLabel={link.label} onPress={() => onOpen(link.href)} style={[styles.adminNavItem, active && (nested ? styles.vendorNestedActive : styles.vendorNavActive), collapsed && styles.navCollapsed]}>{nested && !collapsed ? <View style={[styles.childDot, active && styles.vendorChildDot]} /> : <Ionicons color={active ? colors.onPrimary : colors.shellMuted} name={link.icon as never} size={19} />}{!collapsed ? <Text style={[styles.adminNavLabel, active && styles.adminNavLabelActive]}>{link.label}</Text> : null}</Pressable>;
}

function VendorDockLink({ link, onOpen, pathname }: { link: WorkspaceLink; onOpen: (href: string) => void; pathname: string }) {
  const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
  return <Pressable accessibilityLabel={link.label} onPress={() => onOpen(link.href)} style={styles.vendorDockItem}><View style={[styles.vendorDockIcon, active && styles.vendorDockIconActive]}><Ionicons color={active ? colors.surface : colors.muted} name={link.icon as never} size={19} /></View><Text numberOfLines={1} style={[styles.vendorDockText, active && styles.vendorDockTextActive]}>{link.label}</Text></Pressable>;
}

function VendorHeading({ compact, description, eyebrow, onBack, showBack, title }: { compact: boolean; description?: string; eyebrow?: string; onBack(): void; showBack: boolean; title: string }) {
  return <View style={[styles.vendorHeading, compact && styles.vendorHeadingCompact]}>{showBack ? <Pressable accessibilityLabel="Back to seller dashboard" onPress={onBack} style={styles.vendorBack}><Ionicons color={colors.primary} name="arrow-back" size={20} /></Pressable> : null}<View style={styles.adminHeadingCopy}><View style={styles.vendorPill}><Text style={styles.vendorPillText}>{eyebrow || "AMIYO-GO SELLER"}</Text></View><Text accessibilityRole="header" style={[styles.vendorPageTitle, compact && styles.vendorPageTitleCompact]}>{title}</Text>{description ? <Text style={styles.vendorPageDescription}>{description}</Text> : null}</View></View>;
}

function StandardScreen({ children, description, eyebrow, hideHeading = false, pathname, title, vendor, width }: ScreenProps & { pathname: string; vendor: boolean; width: number }) {
  const router = useRouter();
  const showCustomerChrome = !vendor && pathname !== "/auth";
  const contentWidth = Math.min(width, 1280);
  return <SafeAreaView style={styles.safe}>
    <ScrollView contentContainerStyle={styles.page} showsVerticalScrollIndicator={false}>
      {showCustomerChrome ? <StoreHeader desktop={width >= 900} viewportWidth={width} /> : null}
      {vendor ? <View style={styles.workspaceChrome}>
        <View style={[styles.workspaceTop, { width: contentWidth }]}><Pressable onPress={() => router.push("/")} style={styles.workspaceBrand}><View style={styles.workspaceMark}><Text style={styles.workspaceMarkText}>A</Text></View>{width >= 380 ? <View><Text style={styles.workspaceName}>Amiyo-Go</Text><Text style={styles.workspaceLabel}>Seller Center</Text></View> : null}</Pressable><View style={styles.workspaceActions}><ThemeToggle compact /><Pressable accessibilityLabel="Notifications" onPress={() => router.push("/notifications")} style={styles.iconButton}><Ionicons color={colors.text} name="notifications-outline" size={20} /></Pressable><Pressable accessibilityLabel="Account" onPress={() => router.push("/account")} style={styles.iconButton}><Ionicons color={colors.text} name="person-outline" size={20} /></Pressable></View></View>
        <ScrollView contentContainerStyle={[styles.workspaceNav, { minWidth: contentWidth }]} horizontal showsHorizontalScrollIndicator={false}>{vendorLinks.map((link) => { const active = pathname === link.href || pathname.startsWith(`${link.href}/`); return <Pressable key={link.href} onPress={() => router.push(link.href as never)} style={[styles.navItem, active && styles.navItemActive]}><Ionicons color={active ? colors.primary : colors.muted} name={link.icon as never} size={17} /><Text style={[styles.navLabel, active && styles.navLabelActive]}>{link.label}</Text></Pressable>; })}</ScrollView>
      </View> : null}
      <View style={[styles.container, { width: contentWidth }]}>{!hideHeading ? <Heading compact={width < 480} description={description} eyebrow={eyebrow} title={title} workspace={vendor} /> : null}<View style={styles.content}>{children}</View></View>
    </ScrollView>
    {showCustomerChrome && width < 900 ? <BottomNav /> : null}
  </SafeAreaView>;
}

function Heading({ compact, description, eyebrow, title, workspace }: { compact: boolean; description?: string; eyebrow?: string; title: string; workspace?: boolean }) {
  return <View style={[styles.heading, compact && styles.compactHeading, workspace && styles.workspaceHeading]}>{eyebrow ? <Text style={[styles.eyebrow, workspace && styles.workspaceEyebrow]}>{eyebrow}</Text> : null}<Text accessibilityRole="header" style={[styles.title, compact && styles.compactTitle, workspace && styles.workspaceTitle]}>{title}</Text>{description ? <Text style={[styles.description, workspace && styles.workspaceDescription]}>{description}</Text> : null}</View>;
}

function AdminHeading({ dark, description, eyebrow, onBack, title }: { dark: boolean; description?: string; eyebrow?: string; onBack(): void; title: string }) {
  return <View style={[styles.adminHeading, dark && styles.adminDarkHeading]}><Pressable accessibilityLabel="Back to dashboard" onPress={onBack} style={styles.adminBack}><Ionicons color={colors.primary} name="arrow-back" size={20} /></Pressable><View style={styles.adminHeadingCopy}><View style={styles.adminPill}><Text style={styles.adminPillText}>{eyebrow || "AMIYO-GO ADMIN"}</Text></View><Text accessibilityRole="header" style={[styles.adminPageTitle, dark && styles.adminDarkText]}>{title}</Text>{description ? <Text style={[styles.adminPageDescription, dark && styles.adminDarkMuted]}>{description}</Text> : null}</View></View>;
}

const styles = StyleSheet.create({
  vendorSessionLoading: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 12px 36px rgba(11,31,58,.08)", gap: spacing.sm, marginTop: spacing.lg, maxWidth: 560, padding: spacing.xl, width: "100%" }, vendorLoadingIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 }, vendorLoadingTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: spacing.sm, textAlign: "center" }, vendorLoadingCopy: { color: colors.muted, lineHeight: 20, maxWidth: 420, textAlign: "center" }, vendorLoadingRows: { gap: spacing.sm, marginTop: spacing.md, maxWidth: 360, width: "100%" }, vendorLoadingRow: { alignItems: "center", backgroundColor: colors.background, borderRadius: radius.md, flexDirection: "row", gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md }, vendorLoadingDot: { backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 28, width: 28 }, vendorLoadingLine: { backgroundColor: colors.border, borderRadius: radius.pill, height: 8, width: "64%" }, vendorSidebarLoading: { flex: 1 }, vendorSidebarLoadingRow: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 42, paddingHorizontal: 21 }, vendorSidebarLoadingIcon: { backgroundColor: "rgba(255,255,255,.14)", borderRadius: radius.sm, height: 19, width: 19 }, vendorSidebarLoadingLine: { backgroundColor: "rgba(255,255,255,.12)", borderRadius: radius.pill, height: 8, width: 112 },
  vendorDenied: { alignItems: "center", alignSelf: "center", backgroundColor: colors.surface, borderRadius: radius.xl, boxShadow: "0 12px 36px rgba(11,31,58,.08)", gap: spacing.sm, marginTop: spacing.xl, maxWidth: 560, padding: spacing.xl, width: "100%" }, vendorDeniedIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 58, justifyContent: "center", width: 58 }, vendorDeniedTitle: { color: colors.text, fontSize: 20, fontWeight: "700", marginTop: spacing.sm, textAlign: "center" }, vendorDeniedCopy: { color: colors.muted, lineHeight: 20, maxWidth: 440, textAlign: "center" }, vendorDeniedButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, justifyContent: "center", marginTop: spacing.sm, minHeight: 46, paddingHorizontal: spacing.lg }, vendorDeniedButtonText: { color: colors.surface, fontWeight: "700" },
  vendorTopbar: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, height: 68, justifyContent: "space-between", paddingHorizontal: spacing.md, zIndex: 20 }, vendorMobileTopbar: { gap: 4, paddingHorizontal: spacing.sm }, vendorMark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, boxShadow: "0 6px 16px rgba(122,31,43,.20)", height: 40, justifyContent: "center", width: 40 }, vendorBrandCopy: { flexShrink: 1, minWidth: 0 }, vendorAccount: { alignItems: "center", borderLeftColor: colors.border, borderLeftWidth: 1, flexDirection: "row", gap: 9, marginLeft: 3, paddingLeft: 12 }, vendorAvatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.pill, height: 36, justifyContent: "center", width: 36 }, vendorAddButton: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, flexDirection: "row", gap: 5, height: 40, paddingHorizontal: 12 }, vendorAddButtonText: { color: colors.onPrimary, fontSize: 11, fontWeight: "700" }, vendorSearchToggleActive: { backgroundColor: colors.primary, borderColor: colors.primary }, vendorSearchPopover: { left: spacing.sm, position: "absolute", right: spacing.sm, top: 62, zIndex: 24 }, vendorSearchWrap: { flex: 1, maxWidth: 470, position: "relative", zIndex: 30 }, vendorSearchWrapCompact: { backgroundColor: colors.surface, borderRadius: radius.lg, boxShadow: "0 14px 38px rgba(11,31,58,.2)", maxWidth: "100%", padding: spacing.sm }, vendorSearch: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 }, vendorSearchFocused: { backgroundColor: colors.surface, borderColor: colors.primary }, vendorSearchInput: { color: colors.text, flex: 1, fontSize: 12, height: 40, outlineStyle: "none" } as never, vendorSearchResults: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, boxShadow: "0 12px 32px rgba(11,31,58,.16)", left: 0, overflow: "hidden", position: "absolute", right: 0, top: 46 }, vendorSearchResult: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 9, minHeight: 52, paddingHorizontal: 11 }, vendorSearchIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 32, justifyContent: "center", width: 32 }, vendorSearchHint: { padding: spacing.md }, vendorSearchHintText: { color: colors.muted, fontSize: 11 }, vendorDrawerLayer: { bottom: 72, top: 68 }, vendorDrawer: { backgroundColor: colors.navy, borderRightColor: "rgba(154,170,91,.24)", borderRightWidth: 1, boxShadow: "8px 0 28px rgba(5,11,20,.30)", elevation: 18, flexDirection: "column", maxWidth: 286 }, vendorDrawerFooter: { borderTopColor: "rgba(154,170,91,.26)", borderTopWidth: 1, padding: spacing.sm }, vendorDrawerAction: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 44, paddingHorizontal: 11 }, vendorDrawerLogoutText: { color: colors.shellDanger, fontSize: 12, fontWeight: "600" }, vendorSidebar: { backgroundColor: colors.navy, borderRightColor: "rgba(154,170,91,.24)", borderRightWidth: 1 }, vendorWorkspacePanel: { alignItems: "center", backgroundColor: "rgba(107,122,58,.22)", borderColor: "rgba(154,170,91,.35)", borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 9, margin: 12, padding: 11 }, vendorGroupActive: { backgroundColor: "rgba(122,31,43,.72)" }, vendorNestedActive: { backgroundColor: "rgba(122,31,43,.28)" }, vendorNavActive: { backgroundColor: colors.primary }, vendorChildDot: { backgroundColor: colors.shellAccent }, vendorPage: { alignSelf: "center", backgroundColor: colors.background, maxWidth: 1440, minWidth: 0, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, width: "100%" }, vendorMobilePage: { paddingBottom: 104, paddingHorizontal: spacing.sm }, vendorBottomDock: { alignItems: "center", backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, bottom: 0, boxShadow: "0 -8px 28px rgba(11,31,58,.10)", flexDirection: "row", justifyContent: "space-around", left: 0, minHeight: 74, paddingBottom: 6, paddingHorizontal: 4, paddingTop: 7, position: "absolute", right: 0, zIndex: 40 }, vendorDockItem: { alignItems: "center", flex: 1, gap: 3, justifyContent: "center", minHeight: 52 }, vendorDockIcon: { alignItems: "center", borderRadius: radius.pill, height: 30, justifyContent: "center", width: 44 }, vendorDockIconActive: { backgroundColor: colors.primary }, vendorDockText: { color: colors.muted, fontSize: 9, fontWeight: "600" }, vendorDockTextActive: { color: colors.primary, fontWeight: "700" }, vendorCreateItem: { alignItems: "center", flex: 1, gap: 2, justifyContent: "center", minHeight: 58 }, vendorCreateIcon: { alignItems: "center", backgroundColor: colors.primary, borderColor: colors.onPrimary, borderRadius: radius.pill, borderWidth: 4, boxShadow: "0 6px 16px rgba(122,31,43,.26)", height: 50, justifyContent: "center", marginTop: -24, width: 50 }, vendorCreateText: { color: colors.primary, fontSize: 9, fontWeight: "700" }, vendorHeading: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, marginBottom: spacing.sm, minWidth: 0, paddingBottom: spacing.lg, paddingTop: spacing.lg }, vendorHeadingCompact: { gap: spacing.sm, paddingBottom: spacing.md, paddingTop: spacing.md }, vendorBack: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, flexShrink: 0, height: 44, justifyContent: "center", width: 44 }, vendorPill: { alignSelf: "flex-start", backgroundColor: colors.accentSoft, borderRadius: radius.pill, marginBottom: 6, paddingHorizontal: 10, paddingVertical: 4 }, vendorPillText: { color: colors.accent, fontSize: 9, fontWeight: "700", letterSpacing: .8 }, vendorPageTitle: { color: colors.text, flexShrink: 1, fontSize: 26, fontWeight: "700", letterSpacing: -.4 }, vendorPageTitleCompact: { fontSize: 22, lineHeight: 27 }, vendorPageDescription: { color: colors.muted, flexShrink: 1, fontSize: 12, lineHeight: 18, marginTop: 4 },
  adminPrimary: { borderBottomColor: colors.border, borderBottomWidth: 1, gap: 3, marginBottom: 8, paddingBottom: 8 }, adminStandalone: { borderTopColor: colors.border, borderTopWidth: 1, marginTop: 8, paddingTop: 8 }, adminNestedActive: { backgroundColor: colors.accentSoft }, childDot: { backgroundColor: colors.muted, borderRadius: radius.pill, height: 6, width: 6 }, childDotActive: { backgroundColor: colors.primary },
  adminHeading: { alignItems: "flex-start", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 12, marginBottom: spacing.sm, minWidth: 0, paddingBottom: spacing.lg, paddingTop: spacing.lg }, adminBack: { alignItems: "center", backgroundColor: colors.primarySoft, borderColor: "rgba(107,122,58,.24)", borderRadius: radius.md, borderWidth: 1, flexShrink: 0, height: 40, justifyContent: "center", width: 40 }, adminHeadingCopy: { flex: 1, minWidth: 0 }, adminPill: { alignSelf: "flex-start", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.pill, borderWidth: 1, marginBottom: 5, maxWidth: "100%", paddingHorizontal: 9, paddingVertical: 4 }, adminPillText: { color: colors.text, flexShrink: 1, fontSize: 9, fontWeight: "700", letterSpacing: .7, textTransform: "uppercase" }, adminPageTitle: { color: colors.text, flexShrink: 1, fontSize: 24, fontWeight: "700", letterSpacing: -.4 }, adminPageDescription: { color: colors.muted, flexShrink: 1, fontSize: 12, fontWeight: "600", lineHeight: 18, marginTop: 3 },
  safe: { backgroundColor: colors.background, flex: 1 }, page: { minHeight: "100%", paddingBottom: spacing.xl },
  workspaceChrome: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1 }, workspaceTop: { alignItems: "center", alignSelf: "center", flexDirection: "row", justifyContent: "space-between", minHeight: 68, paddingHorizontal: spacing.sm }, workspaceBrand: { alignItems: "center", flexDirection: "row", gap: 10 }, workspaceMark: { alignItems: "center", backgroundColor: colors.primary, borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminMark: { backgroundColor: colors.navy }, workspaceMarkText: { color: colors.surface, fontSize: 15, fontWeight: "700" }, workspaceName: { color: colors.text, fontSize: 15, fontWeight: "700" }, workspaceLabel: { color: colors.muted, fontSize: 9, fontWeight: "600", letterSpacing: .7, marginTop: 1 }, workspaceActions: { alignItems: "center", flexDirection: "row", gap: spacing.sm }, iconButton: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, height: 38, justifyContent: "center", position: "relative", width: 38 }, workspaceNav: { alignSelf: "center", gap: 5, paddingBottom: 9 }, navItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 6, minHeight: 38, paddingHorizontal: 12 }, navItemActive: { backgroundColor: colors.primarySoft }, navLabel: { color: colors.muted, fontSize: 12, fontWeight: "600" }, navLabelActive: { color: colors.primary, fontWeight: "700" },
  adminTopbar: { alignItems: "center", backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: spacing.md, height: 66, justifyContent: "space-between", paddingHorizontal: spacing.md, zIndex: 20 }, adminMobileTopbar: { gap: spacing.sm, paddingHorizontal: spacing.sm }, adminTopLeft: { alignItems: "center", flexDirection: "row", flexShrink: 1, gap: 10, minWidth: 0 }, topIcon: { alignItems: "center", borderRadius: radius.md, height: 38, justifyContent: "center", width: 38 }, adminSearchWrap: { flex: 1, maxWidth: 520, position: "relative", zIndex: 30 }, adminSearch: { alignItems: "center", backgroundColor: colors.background, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 8, paddingHorizontal: 12 }, adminSearchFocused: { backgroundColor: colors.surface, borderColor: colors.primary }, adminSearchInput: { color: colors.text, flex: 1, fontSize: 13, height: 40, outlineStyle: "none" } as never, adminSearchResults: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, boxShadow: "0 12px 32px rgba(15,23,42,.18)", left: 0, overflow: "hidden", position: "absolute", right: 0, top: 46 }, adminSearchResult: { alignItems: "center", borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 12, paddingVertical: 7 }, adminSearchIcon: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.sm, height: 34, justifyContent: "center", width: 34 }, adminSearchCopy: { flex: 1 }, adminSearchLabel: { color: colors.text, fontSize: 13, fontWeight: "700" }, adminSearchPath: { color: colors.muted, fontSize: 10, marginTop: 2 }, adminSearchEmpty: { alignItems: "center", flexDirection: "row", gap: 8, padding: spacing.md }, adminSearchEmptyText: { color: colors.muted, flex: 1, fontSize: 12 }, notificationDot: { backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: 6, borderWidth: 2, height: 8, position: "absolute", right: 7, top: 6, width: 8 }, vendorNotificationBadge: { alignItems: "center", backgroundColor: colors.danger, borderColor: colors.surface, borderRadius: radius.pill, borderWidth: 2, justifyContent: "center", minHeight: 17, minWidth: 17, paddingHorizontal: 3, position: "absolute", right: -5, top: -5 }, vendorNotificationBadgeText: { color: colors.surface, fontSize: 7, fontWeight: "700" }, adminAccount: { alignItems: "center", borderLeftColor: colors.border, borderLeftWidth: 1, flexDirection: "row", gap: 9, marginLeft: 2, paddingLeft: 12 }, adminMobileAccount: { marginLeft: 0, paddingLeft: 6 }, adminMobileActions: { flexShrink: 0, gap: 5 }, logoutButton: { backgroundColor: "#fff7f7", borderColor: "#fecaca" }, avatar: { alignItems: "center", backgroundColor: colors.primarySoft, borderRadius: radius.md, height: 36, justifyContent: "center", width: 36 }, avatarText: { color: colors.primary, fontSize: 14, fontWeight: "700" }, accountName: { color: colors.text, fontSize: 12, fontWeight: "700" }, accountRole: { color: colors.muted, fontSize: 10, marginTop: 1 },
  adminMobileSearchWrap: { backgroundColor: colors.surface, borderBottomColor: colors.border, borderBottomWidth: 1, padding: spacing.sm, position: "relative", zIndex: 18 }, adminMobileSearchResults: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, left: spacing.sm, overflow: "hidden", position: "absolute", right: spacing.sm, top: 58 }, adminBody: { flex: 1, flexDirection: "row", minWidth: 0 }, adminSidebar: { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1 }, adminSidebarScroller: { flex: 1 }, adminDrawerLayer: { bottom: 0, flexDirection: "row", left: 0, position: "absolute", right: 0, top: 66, zIndex: 19 }, adminDrawerBackdrop: { backgroundColor: "rgba(5,11,20,.42)", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }, adminDrawer: { backgroundColor: colors.surface, borderRightColor: colors.border, borderRightWidth: 1, boxShadow: "8px 0 28px rgba(11,31,58,.16)", elevation: 18, flexDirection: "column", maxWidth: 288 }, workspacePanel: { alignItems: "center", backgroundColor: colors.accentSoft, borderColor: colors.border, borderRadius: radius.md, borderWidth: 1, flexDirection: "row", gap: 9, margin: 12, padding: 11 }, workspacePanelCollapsed: { justifyContent: "center", paddingHorizontal: 4 }, workspacePulse: { backgroundColor: colors.accent, borderRadius: 5, height: 9, width: 9 }, workspacePanelTitle: { color: colors.text, fontSize: 12, fontWeight: "700" }, workspacePanelCopy: { color: colors.muted, fontSize: 10, marginTop: 2 }, adminSidebarScroll: { paddingBottom: 14, paddingHorizontal: 10 }, adminGroup: { gap: 3, marginBottom: 5 }, adminGroupButton: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 42, paddingHorizontal: 11 }, adminGroupButtonActive: { backgroundColor: colors.primarySoft }, adminGroupButtonText: { color: colors.muted, flex: 1, fontSize: 12, fontWeight: "700" }, adminGroupChildren: { borderLeftColor: colors.border, borderLeftWidth: 1, marginLeft: 19, paddingLeft: 7 }, adminNavItem: { alignItems: "center", borderRadius: radius.md, flexDirection: "row", gap: 10, minHeight: 39, paddingHorizontal: 11 }, adminNavItemActive: { backgroundColor: colors.primarySoft }, adminNavLabel: { color: colors.muted, flex: 1, fontSize: 11, fontWeight: "700" }, adminLightActiveText: { color: colors.primary }, adminLightNavText: { color: colors.text }, adminNavLabelActive: { color: colors.onPrimary, fontWeight: "700" }, activePip: { backgroundColor: colors.onPrimary, borderRadius: 3, height: 5, width: 5 }, navCollapsed: { justifyContent: "center", paddingHorizontal: 0 }, storefrontLink: { alignItems: "center", borderTopColor: colors.border, borderTopWidth: 1, flexDirection: "row", gap: 10, minHeight: 54, paddingHorizontal: 21 }, storefrontText: { color: colors.shellMuted, fontSize: 12, fontWeight: "600" },
  adminMain: { flex: 1, minWidth: 0 }, adminPage: { alignSelf: "center", maxWidth: 1440, minWidth: 0, paddingBottom: spacing.xl, paddingHorizontal: spacing.lg, width: "100%" }, adminMobilePage: { paddingHorizontal: spacing.sm }, adminBreadcrumb: { alignItems: "center", flexDirection: "row", gap: 4, minHeight: 42 }, breadcrumbMuted: { color: colors.muted, fontSize: 11, fontWeight: "700" }, breadcrumbCurrent: { color: colors.text, fontSize: 11, fontWeight: "700" },
  adminDarkSafe: { backgroundColor: darkPalette.background }, adminDarkTopbar: { backgroundColor: darkPalette.surface, borderBottomColor: darkPalette.border }, adminDarkMain: { backgroundColor: darkPalette.background }, adminDarkText: { color: darkPalette.text }, adminDarkMuted: { color: darkPalette.muted }, adminDarkButton: { backgroundColor: darkPalette.primarySoft, borderColor: darkPalette.border }, adminDarkAccount: { borderLeftColor: darkPalette.border }, adminDarkSearch: { backgroundColor: darkPalette.primarySoft, borderColor: darkPalette.border }, adminDarkResults: { backgroundColor: darkPalette.surface, borderColor: darkPalette.border }, adminDarkResult: { borderBottomColor: darkPalette.primarySoft }, adminDarkHeading: { borderBottomColor: darkPalette.border }, adminDarkSidebar: { backgroundColor: darkPalette.surface, borderRightColor: darkPalette.border }, adminDarkWorkspacePanel: { backgroundColor: darkPalette.accentSoft, borderColor: darkPalette.border }, adminDarkNavText: { color: darkPalette.text }, adminDarkNavMuted: { color: darkPalette.muted }, adminDarkGroupActive: { backgroundColor: darkPalette.primary }, adminDarkNavActive: { backgroundColor: darkPalette.primary }, adminDarkNestedActive: { backgroundColor: darkPalette.primarySoft }, adminDarkGroupChildren: { borderLeftColor: darkPalette.border }, adminDarkSection: { borderColor: darkPalette.border }, adminDarkStorefront: { borderTopColor: darkPalette.border }, adminDarkChildDot: { backgroundColor: darkPalette.muted },
  container: { alignSelf: "center", gap: spacing.lg, paddingHorizontal: spacing.sm, paddingTop: spacing.lg }, heading: { backgroundColor: colors.navy, borderRadius: radius.xl, padding: spacing.xl }, compactHeading: { borderRadius: radius.lg, padding: spacing.lg }, workspaceHeading: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }, eyebrow: { color: colors.shellAccent, fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase" }, workspaceEyebrow: { color: colors.accent }, title: { color: colors.onPrimary, fontSize: 32, fontWeight: "700", letterSpacing: -0.8, lineHeight: 38 }, compactTitle: { fontSize: 26, lineHeight: 32 }, workspaceTitle: { color: colors.text }, description: { color: colors.shellMuted, fontSize: 14, lineHeight: 21, marginTop: spacing.sm }, workspaceDescription: { color: colors.muted }, content: { gap: spacing.md, minWidth: 0 }
});
