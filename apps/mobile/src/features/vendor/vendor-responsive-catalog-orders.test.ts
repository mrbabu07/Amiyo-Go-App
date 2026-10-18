import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "../../..");
const products = readFileSync(resolve(root, "src/features/vendor/VendorProductsScreen.tsx"), "utf8");
const orders = readFileSync(resolve(root, "src/features/orders/VendorOrdersScreen.tsx"), "utf8");
const finance = readFileSync(resolve(root, "src/features/operations/VendorFinanceScreen.tsx"), "utf8");
const shop = readFileSync(resolve(root, "src/features/vendor/VendorShopScreen.tsx"), "utf8");
const productForm = readFileSync(resolve(root, "src/features/vendor/VendorProductFormScreen.tsx"), "utf8");
const payoutSettings = readFileSync(resolve(root, "src/features/vendor/VendorPayoutSettingsScreen.tsx"), "utf8");
const messages = readFileSync(resolve(root, "src/features/engagement/MessagesScreen.tsx"), "utf8");
const kyc = readFileSync(resolve(root, "src/features/vendor/VendorKycScreen.tsx"), "utf8");
const staff = readFileSync(resolve(root, "src/features/vendor/VendorStaffScreen.tsx"), "utf8");
const returns = readFileSync(resolve(root, "src/features/vendor/VendorReturnsScreen.tsx"), "utf8");
const reports = readFileSync(resolve(root, "src/features/vendor/VendorReportsScreen.tsx"), "utf8");
const inventory = readFileSync(resolve(root, "src/features/vendor/VendorInventoryScreen.tsx"), "utf8");
const reviews = readFileSync(resolve(root, "src/features/vendor/VendorReviewsScreen.tsx"), "utf8");
const questions = readFileSync(resolve(root, "src/features/vendor/VendorQuestionsScreen.tsx"), "utf8");
const categorySelector = readFileSync(resolve(root, "src/features/vendor/components/VendorCategorySelector.tsx"), "utf8");
const shopMedia = readFileSync(resolve(root, "src/features/vendor/VendorShopMediaScreen.tsx"), "utf8");
const shopLocation = readFileSync(resolve(root, "src/features/vendor/VendorShopLocationScreen.tsx"), "utf8");
const settings = readFileSync(resolve(root, "src/features/vendor/VendorSettingsScreen.tsx"), "utf8");
const decoration = readFileSync(resolve(root, "src/features/vendor/VendorShopDecorationScreen.tsx"), "utf8");
const engagement = readFileSync(resolve(root, "src/features/vendor/VendorEngagementScreen.tsx"), "utf8");
const operations = readFileSync(resolve(root, "src/features/vendor/VendorOperationsScreen.tsx"), "utf8");
const categoryRequests = readFileSync(resolve(root, "src/features/vendor/VendorCategoryRequestsScreen.tsx"), "utf8");
const productDetail = readFileSync(resolve(root, "src/features/vendor/VendorProductDetailScreen.tsx"), "utf8");
const marketing = readFileSync(resolve(root, "src/features/vendor/VendorMarketingScreen.tsx"), "utf8");
const registration = readFileSync(resolve(root, "src/features/vendor/VendorRegistrationScreen.tsx"), "utf8");
const bulkProducts = readFileSync(resolve(root, "src/features/vendor/VendorBulkProductsScreen.tsx"), "utf8");
const productCategorySelect = readFileSync(resolve(root, "src/features/vendor/components/ProductCategorySelect.tsx"), "utf8");
const locationSelect = readFileSync(resolve(root, "src/features/vendor/components/LocationSelect.tsx"), "utf8");

test("seller catalog becomes a full-width mobile workspace", () => {
  assert.match(products, /const \{ width \} = useWindowDimensions\(\)/);
  assert.match(products, /const compact = width < 620/);
  assert.match(products, /const tablet = width < 1024/);
  assert.match(products, /compact && styles\.searchCompact/);
  assert.match(products, /compact && styles\.toolbarButtonCompact/);
  assert.match(products, /tablet && responsiveStyles\.cardTablet/);
  assert.match(products, /cardTablet: \{ minWidth: 240, width: "48\.5%" \}/);
  assert.match(products, /compact && styles\.cardCompact/);
  assert.match(products, /cardCompact: \{ minWidth: 0, width: "100%" \}/);
  assert.match(products, /Submit for review/);
});

test("seller orders preserve readable mobile cards and actions", () => {
  assert.match(orders, /useWindowDimensions\(\)\.width < 620/);
  assert.match(orders, /compact && styles\.cardHeaderCompact/);
  assert.match(orders, /compact && styles\.orderBodyCompact/);
  assert.match(orders, /compact && styles\.actionsCompact/);
  assert.match(orders, /compact && styles\.actionCompact/);
  assert.match(orders, /statusPresentation\(order\.status\)/);
  assert.match(orders, /Seller action required/);
  assert.match(orders, /successPill/);
  assert.match(orders, /transitPill/);
  assert.match(orders, /dangerPill/);
});

test("seller finance protects the balance hero on narrow screens", () => {
  assert.match(finance, /useWindowDimensions\(\)\.width < 620/);
  assert.match(finance, /compact && styles\.heroCompact/);
  assert.match(finance, /compact && styles\.columnCompact/);
  assert.match(finance, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.match(finance, /payoutPresentation\(item\.status\)/);
  assert.match(finance, /processingPill/);
  assert.match(finance, /successPill/);
  assert.match(finance, /dangerPill/);
});

test("storefront manager stacks preview tools on mobile", () => {
  assert.match(shop, /useWindowDimensions\(\)\.width < 620/);
  assert.match(shop, /compact && styles\.previewCompact/);
  assert.match(shop, /compact && styles\.toolCompact/);
  assert.match(shop, /toolCompact: \{ width: "100%" \}/);
  assert.match(shop, /activeUid\.current === variables\.owner\.uid/);
});

test("product editor exposes mobile steps and full-width footer actions", () => {
  assert.match(productForm, /useWindowDimensions\(\)\.width < 620/);
  assert.match(productForm, /compact && compactStyles\.steps/);
  assert.match(productForm, /compact && compactStyles\.footer/);
  assert.match(productForm, /compact && compactStyles\.footerButton/);
});

test("payout destinations remain readable and account scoped on mobile", () => {
  assert.match(payoutSettings, /useWindowDimensions\(\)\.width < 620/);
  assert.match(payoutSettings, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(payoutSettings, /compact && compactStyles\.account/);
  assert.match(payoutSettings, /Open seller dashboard/);
  assert.match(payoutSettings, /router\.replace\("\/vendor"\)/);
});

test("seller and customer inbox cards adapt to narrow screens", () => {
  assert.match(messages, /useWindowDimensions\(\)\.width < 620/);
  assert.match(messages, /\["chat-threads", user\?\.uid\]/);
  assert.match(messages, /compact && styles\.summaryCompact/);
  assert.match(messages, /compact && styles\.cardCompact/);
  assert.match(messages, /numberOfLines=\{compact \? 2 : 1\}/);
});

test("seller verification documents stack safely on mobile", () => {
  assert.match(kyc, /useWindowDimensions\(\)\.width < 620/);
  assert.match(kyc, /compact && compactStyles\.statusCard/);
  assert.match(kyc, /compact && compactStyles\.document/);
  assert.match(kyc, /compact && compactStyles\.upload/);
  assert.match(kyc, /numberOfLines=\{compact \? 2 : 1\}/);
  assert.match(kyc, /Continue to payout setup/);
  assert.match(kyc, /router\.push\("\/vendor\/payout-settings"\)/);
});

test("seller staff controls keep identity guards and stack actions", () => {
  assert.match(staff, /useWindowDimensions\(\)\.width < 620/);
  assert.match(staff, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(staff, /compact && styles\.cardHeaderCompact/);
  assert.match(staff, /compact && styles\.actionsCompact/);
  assert.match(staff, /compact && styles\.actionCompact/);
});

test("seller returns summary and toolbar fit narrow screens", () => {
  assert.match(returns, /useWindowDimensions\(\)\.width < 620/);
  assert.match(returns, /\["vendor", "returns", user\?\.uid\]/);
  assert.match(returns, /compact && compactStyles\.exposure/);
  assert.match(returns, /compact && compactStyles\.toolbar/);
  assert.match(returns, /compact && compactStyles\.refresh/);
});

test("seller reports preserve exports and readable mobile rows", () => {
  assert.match(reports, /useWindowDimensions\(\)\.width < 620/);
  assert.match(reports, /\["vendor", "report", user\?\.uid, days\]/);
  assert.match(reports, /compact && styles\.exportCompact/);
  assert.match(reports, /compact && styles\.metricCompact/);
  assert.match(reports, /compact && styles\.orderCompact/);
  assert.match(reports, /DELIVERED REVENUE/);
  assert.match(reports, /compact && styles\.heroCompact/);
  assert.match(reports, /compact && styles\.gridCompact/);
  assert.doesNotMatch(reports, /#fff|#e2e8f0|Â|â|à§/);
});

test("seller inventory is mobile friendly and account safe", () => {
  assert.match(inventory, /useWindowDimensions\(\)\.width < 620/);
  assert.match(inventory, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(inventory, /useEffect\(\(\) => \{ setValues\(\{\}\); setFilter\("all"\); \}, \[user\?\.uid\]\)/);
  assert.match(inventory, /compact && styles\.rowCompact/);
  assert.match(inventory, /compact && styles\.buttonCompact/);
  assert.match(inventory, /STOCK CONTROL/);
  assert.match(inventory, /compact && styles\.heroCompact/);
  assert.match(inventory, /type StockFilter = "all" \| "low" \| "out"/);
  assert.doesNotMatch(inventory, /#fff|Â|â/);
});

test("seller review replies retain identity guards and mobile actions", () => {
  assert.match(reviews, /useWindowDimensions\(\)\.width < 620/);
  assert.match(reviews, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(reviews, /compact && compactStyles\.actions/);
  assert.match(reviews, /compact && compactStyles\.action/);
});

test("seller question replies stack safely and remain account scoped", () => {
  assert.match(questions, /useWindowDimensions\(\)\.width < 620/);
  assert.match(questions, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(questions, /compact && styles\.questionTopCompact/);
  assert.match(questions, /compact && styles\.actionsCompact/);
  assert.match(questions, /compact && styles\.actionCompact/);
});

test("seller category selector replaces fixed panes on mobile", () => {
  assert.match(categorySelector, /useWindowDimensions\(\)\.width < 620/);
  assert.match(categorySelector, /horizontal=\{compact\}/);
  assert.match(categorySelector, /compact && styles\.workspaceCompact/);
  assert.match(categorySelector, /compact && styles\.groupsCompact/);
  assert.match(categorySelector, /compact && styles\.optionsCompact/);
  assert.match(categorySelector, /compact && styles\.searchCompact/);
  assert.doesNotMatch(categorySelector, /#fed7aa|#fdba74|#f8fafc|#f1f5f9/);
  assert.match(categorySelector, /groupActive: \{ backgroundColor: colors\.surface, borderColor: colors\.accent \}/);
  assert.match(categorySelector, /categorySelected: \{ backgroundColor: colors\.accentSoft, borderColor: colors\.accent \}/);
});

test("seller shop media stacks controls and guards late writes", () => {
  assert.match(shopMedia, /useWindowDimensions\(\)\.width < 620/);
  assert.match(shopMedia, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(shopMedia, /compact && styles\.previewCompact/);
  assert.match(shopMedia, /compact && styles\.mediaRowCompact/);
  assert.match(shopMedia, /compact && styles\.actionCompact/);
});

test("seller pickup form is responsive and mutation scoped", () => {
  assert.match(shopLocation, /useWindowDimensions\(\)\.width < 620/);
  assert.match(shopLocation, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(shopLocation, /compact && styles\.heroCompact/);
  assert.match(shopLocation, /compact && styles\.gridCompact/);
  assert.match(shopLocation, /compact && styles\.fieldCompact/);
  assert.match(shopLocation, /save\.mutate\(\{ owner: user, shopId: shop\.id, version: shop\.version \}\)/);
});

test("legacy seller settings scopes every mutation to its owner", () => {
  assert.match(settings, /useWindowDimensions\(\)\.width < 620/);
  assert.match(settings, /compact && styles\.summaryCompact/);
  assert.match(settings, /minHeight: 44/);
  assert.match(settings, /activeUid\.current === variables\.owner\.uid/);
  assert.match(settings, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(settings, /saveShop\.mutate\(\{ owner: user, shopId: shop\.id, version: shop\.version \}\)/);
  assert.match(settings, /saveBank\.mutate\(\{ owner: user \}\)/);
  assert.match(settings, /saveKyc\.mutate\(\{ owner: user \}\)/);
  assert.match(settings, /\[user\?\.uid\]/);
});

test("bulk catalog workflow provides mobile guidance and full-width actions", () => {
  assert.match(bulkProducts, /useWindowDimensions\(\)\.width < 620/);
  assert.match(bulkProducts, /compact && styles\.guideCompact/);
  assert.match(bulkProducts, /Imported products remain drafts until submitted/);
  assert.match(bulkProducts, /width: "100%"/);
});

test("seller decoration preview and publish remain mobile and account safe", () => {
  assert.match(decoration, /useWindowDimensions\(\)\.width < 620/);
  assert.match(decoration, /activeUid\.current !== variables\.owner\.uid/);
  assert.match(decoration, /compact && styles\.previewCompact/);
  assert.match(decoration, /save\.mutate\(\{ owner: user, shopId: shop\.id, version: shop\.version \}\)/);
  assert.match(decoration, /numberOfLines=\{compact \? 2 : 1\}/);
});

test("seller engagement overview uses full-width mobile cards", () => {
  assert.match(engagement, /useWindowDimensions\(\)\.width < 620/);
  assert.match(engagement, /\["vendor", "reviews", user\?\.uid\]/);
  assert.match(engagement, /\["vendor", "questions", user\?\.uid\]/);
  assert.match(engagement, /compact && styles\.metricCompact/);
  assert.match(engagement, /compact && styles\.cardCompact/);
});

test("seller operations command center stacks cleanly on mobile", () => {
  assert.match(operations, /useWindowDimensions\(\)\.width < 620/);
  assert.match(operations, /\["vendor", "report", user\?\.uid, 30\]/);
  assert.match(operations, /compact && styles\.metricCompact/);
  assert.match(operations, /compact && styles\.moduleCompact/);
  assert.match(operations, /adjustsFontSizeToFit numberOfLines=\{1\}/);
  assert.doesNotMatch(operations, /à§³|Â·/);
});

test("seller category requests stay usable on narrow screens", () => {
  assert.match(categoryRequests, /useWindowDimensions\(\)\.width < 620/);
  assert.match(categoryRequests, /\["vendor", "category-requests", user\?\.uid\]/);
  assert.match(categoryRequests, /horizontal=\{compact\}/);
  assert.match(categoryRequests, /compact && styles\.primaryCompact/);
  assert.match(categoryRequests, /activeUid\.current !== owner\.uid/);
});

test("seller product detail is readable and actionable on mobile", () => {
  assert.match(productDetail, /useWindowDimensions\(\)\.width < 620/);
  assert.match(productDetail, /\["vendor", "products", user\?\.uid\]/);
  assert.match(productDetail, /activeUid\.current === variables\.owner\.uid/);
  assert.match(productDetail, /compact && styles\.actionsCompact/);
  assert.match(productDetail, /compact && styles\.mediaCompact/);
  assert.match(productDetail, /compact && styles\.summaryCompact/);
  assert.match(productDetail, /compact && styles\.variantCompact/);
  assert.doesNotMatch(productDetail, /à§³|Â·|â€¦|â†’/);
});

test("seller marketing form and vouchers stack safely on mobile", () => {
  assert.match(marketing, /useWindowDimensions\(\)\.width < 620/);
  assert.match(marketing, /\["vendor", "vouchers", user\?\.uid\]/);
  assert.match(marketing, /activeUid\.current !== owner\.uid/);
  assert.match(marketing, /compact && styles\.fieldCompact/);
  assert.match(marketing, /compact && styles\.primaryCompact/);
  assert.match(marketing, /compact && styles\.voucherCompact/);
  assert.doesNotMatch(marketing, /à§³|Â·|â€“/);
});

test("seller registration presents a mobile guided onboarding flow", () => {
  assert.match(registration, /useWindowDimensions\(\)\.width < 620/);
  assert.match(registration, /activeUid\.current !== owner\.uid/);
  assert.match(registration, /compact && styles\.stepsCompact/);
  assert.match(registration, /compact && styles\.columnsCompact/);
  assert.match(registration, /compact && styles\.flexCompact/);
  assert.match(registration, /backgroundColor: colors\.primary/);
  assert.match(registration, /label="Account"/);
  assert.match(registration, /label="Documents"/);
  assert.match(registration, /label="Payout"/);
  assert.match(registration, /Guided seller onboarding/);
  assert.match(registration, /Create workspace & continue KYC/);
  assert.match(registration, /router\.replace\("\/vendor\/kyc"\)/);
  assert.doesNotMatch(registration, /borderColor: "#d1d5db"/);
});

test("seller onboarding selectors use the current marketplace palette", () => {
  assert.match(productCategorySelect, /backgroundColor: colors\.surface/);
  assert.match(productCategorySelect, /backgroundColor: colors\.accentSoft/);
  assert.doesNotMatch(productCategorySelect, /#f8fafc|#f1f5f9/);
  assert.match(locationSelect, /borderColor: colors\.border/);
  assert.match(locationSelect, /backgroundColor: colors\.accentSoft/);
  assert.doesNotMatch(locationSelect, /#d1d5db|#f3f4f6/);
});
