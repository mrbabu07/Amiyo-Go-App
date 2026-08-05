export type InformationSection = { title: string; body: string[] };

export const privacySections: InformationSection[] = [
  { title: "Information we collect", body: ["Account details such as name, email, phone, profile information, and login activity.", "Order, payment, delivery, return, review, wishlist, support, and marketplace activity.", "Vendor shop, listing, KYC, payout, dispute, and policy records when you operate as a seller."] },
  { title: "How we use information", body: ["To process orders, payments, delivery, returns, refunds, support requests, and vendor operations.", "To personalize shopping, improve search, send service notices, and protect account security.", "To detect fraud, enforce platform rules, audit sensitive actions, and meet legal obligations."] },
  { title: "Sharing and providers", body: ["Necessary order information may be shared with sellers, couriers, payment providers, and support teams.", "Amiyo-Go does not sell personal data. Access is limited to operating, securing, and legally protecting the marketplace."] },
  { title: "Your choices", body: ["You can update profile, address, notification, and privacy settings from your account.", "You can request account export or deletion through account tools, subject to dispute, fraud-prevention, and legal retention needs."] },
  { title: "Security and retention", body: ["Authentication, role permissions, audit records, encryption in transit, and operational safeguards protect platform data.", "Information is retained only as long as required for service delivery, marketplace records, disputes, fraud prevention, and legal obligations."] }
];

export const termsSections: InformationSection[] = [
  { title: "1. Account rules", body: ["Provide accurate account, delivery, and contact information and keep your login secure.", "Accounts involved in fraud, abuse, false claims, or repeated policy violations may be restricted."] },
  { title: "2. Orders and availability", body: ["Price, stock, delivery fees, promotions, and estimates may change until checkout is completed.", "Orders affected by unavailable stock, payment failure, duplicate submission, suspicious activity, or delivery limits may be cancelled."] },
  { title: "3. Payments", body: ["Only payment methods shown in checkout are supported for an order.", "Customers should retain payment evidence until delivery and any return or refund period has closed."] },
  { title: "4. Delivery and returns", body: ["Delivery timelines are estimates and may change because of location, seller readiness, courier capacity, weather, or address issues.", "Return requests must follow the eligibility, condition, evidence, and time-window rules shown in the return flow."] },
  { title: "5. Seller rules", body: ["Sellers must keep listings, stock, pricing, warranties, delivery notes, and shop policies accurate.", "Counterfeit, unsafe, illegal, misleading, prohibited, or unauthorized products and content are not allowed."] },
  { title: "6. Reviews and messages", body: ["Spam, threats, hate speech, personal data, fake reviews, abuse, and misleading claims are prohibited.", "Content may be reviewed or removed to protect customers, sellers, staff, and marketplace integrity."] },
  { title: "7. Platform enforcement", body: ["Amiyo-Go may request verification or evidence before processing orders, returns, payouts, or seller approvals.", "Users can contact support to appeal an enforcement decision."] },
  { title: "8. Changes", body: ["These terms may change as laws, payment rules, delivery processes, and marketplace features evolve.", "Major updates may require acceptance before selected services can be used."] }
];

export const aboutSections: InformationSection[] = [
  { title: "Our mission", body: ["Make reliable digital commerce accessible across Bangladesh by connecting customers with accountable sellers.", "Give local businesses practical tools for catalog, inventory, fulfilment, finance, communication, and growth."] },
  { title: "How the marketplace works", body: ["Products are organized into searchable categories and seller storefronts.", "Orders, delivery updates, returns, reviews, questions, and support stay connected to the customer account.", "Seller and administrator workspaces use role-based access and audited operational actions."] },
  { title: "What we value", body: ["Clear product information and transparent order status.", "Safe account, payment, and marketplace operations.", "Responsive support and fair resolution for customers and sellers."] }
];
