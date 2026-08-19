# Amiyo-Go Stitch AI Premium Design Documentation

Version: 1.0  
Owner: Amiyo-Go  
Target: Stitch AI, product designers, React Native engineers  
Platform: Mobile-first Expo React Native app with responsive web support

## 1. Design Goal

Create a premium Bangladeshi marketplace experience for Amiyo-Go that feels warm, trusted, modern, and conversion-focused. The UI should carry the shopping energy of Cartup/Daraz-style ecommerce, but with a softer boutique identity: clean spacing, polished cards, strong product imagery, elegant off-white/maroon/navy/olive accents, and clear operational dashboards for admin and sellers.

The app must feel:

- Premium but approachable.
- Fast and easy to scan on mobile.
- Marketplace-first, with strong category, product, shop, order, invoice, payout, and seller workflows.
- Trustworthy for customers, sellers, and admins.
- Consistent across customer, vendor, admin, auth, finance, support, and logistics pages.

## 2. Mandatory Brand Palette

Use these exact core colors throughout the design system.

| Token | Hex | RGB | Usage |
| --- | --- | --- | --- |
| `offWhiteCanvas` | `#FAF7F0` | `250, 247, 240` | App background, soft page canvas, section wash |
| `navyText` | `#0B1F3A` | `11, 31, 58` | Main text, premium dark surfaces, invoice header |
| `maroonPrimary` | `#7A1F2B` | `122, 31, 43` | Primary CTA, sale badges, active tabs, highlights |
| `oliveAccent` | `#6B7A3A` | `107, 122, 58` | Secondary accent, cards, borders, premium dividers |

### Extended Supporting Palette

| Token | Hex | Usage |
| --- | --- | --- |
| `paperSurface` | `#FFFDF8` | Cards, sheets, form panels |
| `maroonMistSurface` | `#F3E4E7` | Secondary card backgrounds |
| `navyShell` | `#050B14` | Dark nav, admin sidebar, footer |
| `maroonHover` | `#651823` | Pressed/hover state for primary buttons |
| `oliveSoft` | `#EEF1E4` | Chips, category pills, empty states |
| `successOlive` | `#6B7A3A` | Success states, paid status, delivered |
| `warningAmber` | `#B7791F` | Pending, COD, payout review |
| `dangerRose` | `#B42318` | Errors, rejected, cancel actions |
| `mutedOliveGray` | `#62675B` | Secondary text |
| `lineWarm` | `#E6D9C8` | Borders and separators |

### Color Usage Rules

- App/page background should normally be `#FAF7F0`.
- Main body text should be `#0B1F3A`.
- Primary action buttons should use `#7A1F2B` with white text.
- Premium highlights, badges, dividers, and subtle card accents should use `#6B7A3A`.
- Use navy for depth and structure, maroon for conversion actions, and olive for premium accents/success states.
- Avoid pure black. Use navy tones instead.
- Use dark navy surfaces for admin/vendor command areas, but keep form cards off-white/paper for readability.

## 3. Typography

Use the project font direction:

```css
@import url('https://fonts.googleapis.com/css2?family=Croissant+One&family=Lora:ital,wght@0,400..700;1,400..700&family=Noto+Serif:ital,wght@0,100..900;1,100..900&family=Quicksand:wght@300..700&display=swap');
```

### Font Roles

- Brand/logo moments: `Croissant One`.
- Headings and premium editorial areas: `Lora` or `Noto Serif`.
- Product cards, forms, labels, dashboards: `Quicksand`.
- Keep weights lighter than before: use `500` and `600` for most headings; use `700` only for prices, totals, and primary dashboard numbers.

### Type Scale

| Role | Mobile | Desktop/Web | Weight |
| --- | --- | --- | --- |
| Hero title | 30-36 | 44-56 | 600 |
| Page title | 24-28 | 34-42 | 600 |
| Section title | 18-22 | 24-28 | 600 |
| Card title | 15-17 | 17-19 | 600 |
| Body | 13-15 | 14-16 | 400/500 |
| Caption | 10-12 | 11-13 | 500 |
| Price | 16-22 | 20-28 | 700 |

## 4. Layout System

### Mobile First

- Design every screen first at `360px` width.
- Use one-column stacks for mobile.
- Keep primary action buttons full-width on checkout, auth, seller registration, and forms.
- Product grids: 2 columns on mobile, 3-4 on tablet, 5-6 on desktop.
- Admin/vendor dashboards: use horizontal quick-action chips plus stacked cards on mobile; never show cramped sidebars on small screens.

### Spacing

| Token | Value | Usage |
| --- | --- | --- |
| `xs` | 4 | Tight icon/text gaps |
| `sm` | 8 | Chips, badges, compact rows |
| `md` | 16 | Card padding, section gaps |
| `lg` | 24 | Page section spacing |
| `xl` | 32 | Hero and desktop spacing |
| `xxl` | 48 | Desktop hero and landing blocks |

### Radius and Elevation

- Product cards: `18-22px` radius.
- Category chips: pill radius.
- Dashboard panels: `20-24px` radius.
- Bottom sheets/modals: `24px` top radius.
- Use soft navy-tinted shadows: `rgba(11,31,58,0.10)` not black shadows.

## 5. Core App Shell

### Customer Header

- Cream canvas with paper surface search bar.
- Top row: compact logo, location selector, wishlist icon, cart icon, profile/avatar.
- Search should be prominent with placeholder like `Search groceries, gadgets, fashion...`.
- Voice search icon must be visible inside or beside search.
- Category dropdown/mega menu must support main categories and subcategories.
- Sticky category rail below header on web/tablet.

### Bottom Navigation

Mobile tabs:

1. Home
2. Categories
3. Wishlist
4. Orders
5. Account

Rules:

- Active tab uses maroon icon and subtle olive/cream pill.
- Cart can be a floating mini button if bottom nav is full.
- Do not hide wishlist inside account only.

### Admin/Vendor Shell

- Mobile must not use a wide desktop sidebar.
- Use a top command bar and scrollable module chips.
- Desktop can use navy sidebar with warm active highlight.
- Important admin actions should stay visible: Orders, Products, Vendors, Payouts, Commission, Notifications, Invoices.

## 6. Component Library

### Product Card

Must include:

- Product image with `1:1` or `4:5` clean crop.
- Wishlist heart button as independent action, not nested inside card button.
- Discount badge top-left.
- Rating + sold count.
- Shop name or verified seller line.
- Price in maroon.
- Compare-at price muted with strikethrough.
- Quick add/cart button.
- Pressing card body opens product details; pressing heart toggles wishlist only.

Visual style:

- Surface: `#FFFDF8`.
- Border: `#E6D9C8`.
- Radius: `20px`.
- Shadow: soft warm shadow.
- Sale badge: maroon background, white text.

### Category Card

- Use icon/image tile with cream/gold background.
- Main category cards should have subcategory count.
- Dropdown should show subcategories in grouped columns on desktop and accordion on mobile.
- Active/hover uses `#7A1F2B` text and `#EEF1E4` background.

### Buttons

| Type | Background | Text | Usage |
| --- | --- | --- | --- |
| Primary | `#7A1F2B` | White | Buy now, checkout, save, approve |
| Secondary | `#6B7A3A` | `#0B1F3A` | Filters, alternate actions |
| Ghost | Transparent | `#0B1F3A` | Cancel, tertiary actions |
| Danger | `#B42318` | White | Reject, remove, delete |

### Forms

- Labels above fields, never placeholder-only.
- Inputs use paper background with warm border.
- Focus border: maroon.
- Error text: dangerRose.
- Seller registration should feel like a guided onboarding wizard with progress.

### Empty States

- Use warm illustration/icon blocks.
- Give exact action: `Add your first product`, `Start shopping`, `Create payout request`.
- Avoid plain blank screens.

## 7. Page-by-Page Stitch AI Direction

## Customer Pages

### Home Page

Goal: premium marketplace landing page.

Sections:

1. Header with search, voice search, location, wishlist, cart.
2. Hero banner with warm cream + maroon gradient, marketplace offer, CTA.
3. Main categories with subcategory dropdown/accordion.
4. Flash deals countdown.
5. Grocery/fresh picks.
6. Electronics/fashion/service sections.
7. Featured shops.
8. Recommended products.
9. App trust strip: secure payment, fast delivery, verified sellers, easy return.

Design notes:

- Use editorial hero image areas with rounded card overlays.
- Keep product-heavy sections highly scannable.
- Prices and discounts should stand out immediately.

### Category Listing Page

- Left filter drawer on desktop; bottom filter sheet on mobile.
- Category breadcrumb at top.
- Subcategory chips under title.
- Sort options: Popular, Newest, Price low-high, Price high-low, Rating.
- Filter groups: price, brand, rating, seller, availability, delivery time.

### Product Details Page

Must look premium and conversion-ready.

Sections:

1. Image gallery with thumbnails.
2. Title, rating, sold count, share, wishlist.
3. Price, discount, compare-at price.
4. Variant selector: color, size, weight, pack, category-specific attributes.
5. Delivery promise card.
6. Seller/shop card with `Visit shop`.
7. Coupons and vouchers.
8. Quantity stepper.
9. Sticky bottom actions: Add to cart, Buy now.
10. Description/specifications.
11. Reviews and Q&A.
12. Related products.

Mobile rule:

- No large empty gap after image gallery.
- Sticky CTA must always be reachable.

### Shop Page / Visit Shop

- Shop hero with logo, cover, rating, followers, verified badge.
- Search within shop.
- Category filter chips/dropdown.
- Sort and filter sheet.
- Product grid.
- Seller policies: delivery, return, chat response.
- Follow shop button.

### Cart Page

- Group products by seller/shop.
- Each shop group has checkbox/select all, shop name, delivery note.
- Product rows include image, title, variant, price, quantity, remove, wishlist.
- Coupon area should be visible.
- Checkout summary sticky on mobile.

### Checkout Page

- Stepper: Address → Delivery → Coupon → Payment → Review.
- Address card should support add/edit/default selection.
- Coupon input and available coupon drawer.
- Payment methods: COD, SSLCommerz, wallet where available.
- Multi-store order summary with per-shop delivery and totals.
- Primary CTA: `Place order`.

### Orders Page

- Daraz/Cartup style order list with product image thumbnails.
- Tabs: All, To Pay, Processing, Shipped, Delivered, Cancelled, Return/Refund.
- Show shop group, order number, status, payment, total.
- Actions: Track, Details, Invoice, Cancel within 30 minutes, Review, Return.

### Order Details Page

- Professional status timeline.
- Product images and grouped packages by seller.
- Delivery address, payment summary, coupon summary.
- Invoice button and print/download action.
- Cancellation banner if still inside 30-minute window.
- Support/contact seller action.

### Invoice Page

- Premium printable A4-style document.
- Espresso header, Amiyo brand mark, invoice number, QR/reference box.
- Payment verification stamp.
- Customer, address, payment, order summary.
- Store-wise package table with product lines.
- Admin invoice must show commission and seller payable.
- Footer with marketplace trust note.

### Wishlist Page

- Wishlist icon in nav.
- Cards mirror product cards.
- Heart toggle removes item without navigating.
- Add-to-cart from wishlist.
- Empty state with `Browse products` CTA.

### Account/Profile Page

- Profile hero with avatar, name, role, member since.
- Quick actions: Orders, Addresses, Wishlist, Coupons, Support.
- Editable personal info.
- Address management with polished cards.
- Notification preferences.
- Data/privacy controls.

### Address Page

- Add/edit form with recipient, phone, division, district, upazila, union/area, postal code, detailed address, label, default toggle.
- Mobile form should be one-column.
- Address cards show default badge, edit, delete, use as default.

### Support Page

- Ticket creation card with category, subject, message, attachments.
- My tickets list with latest reply preview.
- Conversation detail with timeline bubbles and attachment previews.

## Vendor/Seller Pages

### Become a Seller / Seller Registration

- Guided onboarding wizard.
- Steps: Account → Shop details → Category selection → Business documents → Bank/MFS payout → Review.
- Category selector must support main category and subcategory dropdown/accordion.
- Fields: shop name, legal name, phone, email, address, categories, pickup address, trade license/NID optional, bank/MFS details.
- Show progress and trust copy.

### Vendor Dashboard

- KPI cards: revenue, orders, pending shipments, low stock, payout balance.
- Today action queue.
- Recent orders with status.
- Product performance chart/list.
- Payout request CTA.

### Vendor Products

- Product table/cards with image, status, stock, price, commission hint, actions.
- Add product CTA visible.
- Bulk upload/export if supported.

### Add/Edit Product

- Category-aware form.
- Product info, media, variants, price, stock, SKU, attributes, delivery weight/dimensions.
- Color selector and custom color input.
- Category-specific fields should appear dynamically.
- Commission note: default shop rate applies unless admin has product-wise override.

### Vendor Orders

- Order list by package with product images.
- Status workflow: pending, accepted, packed, shipped, delivered, returned.
- Invoice/details button per order.
- Print packing slip/invoice.
- Multi-store orders should show only seller-owned package details.

### Vendor Payouts

- Wallet balance, pending payout, paid total.
- Request payout form.
- Bank/MFS account card.
- Payout history timeline.
- Status badges: requested, approved, processing, paid, rejected.

## Admin Pages

### Admin Dashboard

- Executive overview with marketplace KPIs.
- Cards: GMV, orders, active vendors, customers, payouts, refunds, risk alerts.
- Operational queues: vendor approvals, order exceptions, payout requests, returns, notifications.
- Must be mobile responsive with stacked cards and top module chips.

### Admin Orders

- Order table/cards with customer, stores, payment, delivery, fraud/risk, total.
- Filters: status, payment, seller, date, risk, delivery state.
- Detail page must include product images, store-wise packages, payment timeline, address, customer, seller, audit log.
- Actions: update status, refund, cancel, extend return, print invoice.

### Admin Invoice

- Same premium invoice design.
- Include internal finance lines: commission, seller payable, platform earnings.
- Print and download actions visible.

### Admin Vendors

- Vendor approval queue.
- Vendor 360 detail: identity, shop, products, orders, chats, finance, documents.
- Actions: approve, suspend, reject, adjust commission, view payouts.

### Admin Commission

- Commission hierarchy must be visible:
  1. Product-wise override: highest priority.
  2. Shop-wise rule: default for all new products under that shop.
  3. Vendor-wise rule.
  4. Vendor + category rule.
  5. Category rule.
  6. Global fallback.

Reference-style default rates:

| Rule | Rate | Purpose |
| --- | --- | --- |
| Global marketplace | `6%` | Default fallback for all sellers |
| New seller/shop intro | `3%` | Low shop-wise onboarding offer |
| Category standard | `8%` | Higher margin category rule |
| Product boost/override | `2%` | Special product-wise campaign or vendor acquisition |

UI requirements:

- Preset cards for these rates.
- Scope selector cards with clear explanation.
- Searchable dropdowns for vendor/shop/category/product.
- Active rules table with scope, target, rate, fixed fee, effective dates, priority.
- End rule action with version-safe confirmation.

### Admin Payouts

- Finance control workspace.
- KPI cards: review queue, approved payable, paid total, missing bank accounts.
- Search by vendor, bank/MFS, request ID.
- Filter by payout status.
- Settlement detail drawer/card.
- Checklist before approval/payment.
- Actions: approve, reject with reason, mark paid with provider/reference.
- Payout history visible.

### Admin Notifications

- Notification composer with target audience.
- Templates for order, payout, vendor approval, campaign.
- Delivery channels: push, email, SMS where supported.
- History and status.

### Admin Products/Catalog

- Product moderation queue.
- Category and subcategory manager.
- Attribute manager for category-specific product fields.
- Product detail includes images, seller, variants, price, inventory, commission override.

### Admin Returns/Refunds

- Return queue with SLA status.
- Evidence thumbnails.
- Refund action with payment status.
- Timeline and audit log.

## 8. Dark Mode

Dark mode should keep the same brand warmth.

| Token | Dark Value |
| --- | --- |
| Background | `#050B14` |
| Surface | `#0B1F3A` |
| Elevated | `#0B1F3A` |
| Text | `#FAF7F0` |
| Muted | `#C9C2B6` |
| Primary | `#B44B5A` |
| Accent | `#6B7A3A` |
| Border | `#263B55` |

Rules:

- Do not invert into cold gray/blue.
- Keep maroon CTAs.
- Product images remain bright.
- Admin dark shell can be navy with olive active states.

## 9. Motion and Interaction

- Card press: subtle scale `0.98` and shadow reduction.
- Wishlist heart: quick pop animation.
- Add to cart: mini confirmation toast.
- Checkout steps: slide/fade between steps.
- Admin actions: confirmation states and optimistic loading indicators.
- Pull-to-refresh on lists.
- Skeleton loading for product grids, order cards, payout rows.

## 10. Accessibility

- Minimum tap target: `44x44`.
- Text contrast must be checked, especially maroon on cream.
- Do not put tiny light text on olive or maroon accents.
- Every icon-only button must have an accessible label.
- Product cards cannot nest button inside button.
- Modals should not leave focus inside hidden `aria-hidden` ancestors on web.

## 11. Stitch AI Prompt

Use this prompt in Stitch AI when generating screens:

```text
Design a premium mobile-first marketplace app for Amiyo-Go using a warm premium Bangladeshi ecommerce visual identity. Use #FAF7F0 as the warm cream background, #0B1F3A as navy text/dark shell, #7A1F2B as maroon primary CTA, and #6B7A3A as deep olive accent. The style should feel like a polished Cartup/Daraz-inspired shopping app but more boutique, warm, elegant, and trustworthy. Use rounded product cards, strong product imagery, clean ecommerce hierarchy, visible wishlist/cart/search/voice search, main and subcategory navigation, professional order tracking, premium invoices, seller dashboards, admin finance controls, commission rules, and payout workflows. Make every screen responsive for 360px mobile first and scalable to tablet/web.
```

## 12. Screen Generation Checklist

Before accepting any Stitch AI output, confirm:

- Uses the exact brand palette.
- Looks premium, not plain dashboard default.
- Mobile layout works at 360px.
- Product image, price, discount, wishlist, and CTA are clearly visible.
- Categories include main and subcategory behavior.
- Customer order pages include product images and timeline.
- Invoice is printable and beautiful.
- Vendor screens include product, order, payout, and seller registration flows.
- Admin screens include orders, invoice, commission, payout, vendors, notifications, and queues.
- Buttons and cards use warm premium ecommerce styling.
- No nested button/pressable issues.
- Empty, loading, error, and success states are designed.

## 13. Engineering Token Mapping

Recommended mapping for `apps/mobile/src/ui/tokens.ts`:

```ts
export const lightPalette = {
  background: "#FAF7F0",
  surface: "#FFFDF8",
  primary: "#7A1F2B",
  primaryDark: "#0B1F3A",
  primarySoft: "#F3E4E7",
  accent: "#6B7A3A",
  accentSoft: "#EEF1E4",
  navy: "#0B1F3A",
  text: "#0B1F3A",
  muted: "#62675B",
  border: "#E6D9C8",
  danger: "#B42318",
  warning: "#B7791F",
  success: "#4F6F32"
};
```

Use this mapping only after checking every screen for contrast and state colors.

## 14. Final Design Standard

The final app should feel like a real marketplace product, not a prototype. A customer should immediately understand where to search, browse categories, wishlist, add to cart, checkout, track orders, and download invoices. A seller should clearly manage products, orders, invoices, and payouts. An admin should confidently operate orders, vendors, commission rules, notifications, invoices, finance, and payout settlement from a polished responsive command center.
