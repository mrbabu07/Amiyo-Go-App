export type BilingualCopy = { en: string; bn: string };
export type UniversityLink = { label: BilingualCopy; href: string };
export type UniversityModule = { id: string; title: BilingualCopy; summary: BilingualCopy; steps: BilingualCopy[]; links: UniversityLink[] };

export const sellerUniversityModules: UniversityModule[] = [
  {
    id: "vendor-onboarding",
    title: { en: "Onboarding, KYC, and shop readiness", bn: "অনবোর্ডিং, KYC ও শপ প্রস্তুতি" },
    summary: { en: "Complete KYC, payout details, shop profile, policies, and pickup address before selling.", bn: "বিক্রি শুরুর আগে KYC, পেআউট তথ্য, শপ প্রোফাইল, নীতিমালা ও পিকআপ ঠিকানা সম্পূর্ণ করুন।" },
    steps: [
      { en: "Submit accurate business and identity documents.", bn: "সঠিক ব্যবসায়িক ও পরিচয়পত্রের নথি জমা দিন।" },
      { en: "Set your logo, banner, description, policies, and location.", bn: "লোগো, ব্যানার, বিবরণ, নীতিমালা ও লোকেশন সেট করুন।" },
      { en: "Check rejection or resubmission notes before editing.", bn: "এডিট করার আগে প্রত্যাখ্যান বা পুনরায় জমার নির্দেশনা দেখুন।" }
    ],
    links: [
      { label: { en: "KYC", bn: "KYC" }, href: "/vendor/kyc" },
      { label: { en: "Shop settings", bn: "শপ সেটিংস" }, href: "/vendor/shop" },
      { label: { en: "Payout setup", bn: "পেআউট সেটআপ" }, href: "/vendor/payout-settings" }
    ]
  },
  {
    id: "vendor-catalog",
    title: { en: "Products, variants, and inventory", bn: "পণ্য, ভ্যারিয়েন্ট ও ইনভেন্টরি" },
    summary: { en: "Create accurate listings, manage stock, and respond to moderation feedback quickly.", bn: "সঠিক লিস্টিং তৈরি করুন, স্টক পরিচালনা করুন এবং মডারেশন ফিডব্যাক দ্রুত ঠিক করুন।" },
    steps: [
      { en: "Use clear titles, categories, images, SKU, price, stock, and variant data.", bn: "পরিষ্কার শিরোনাম, ক্যাটাগরি, ছবি, SKU, দাম, স্টক ও ভ্যারিয়েন্ট তথ্য দিন।" },
      { en: "Submit products for approval and fix rejected listings.", bn: "পণ্য অনুমোদনের জন্য জমা দিন এবং প্রত্যাখ্যাত লিস্টিং ঠিক করুন।" },
      { en: "Keep variant inventory accurate to prevent overselling.", bn: "অতিরিক্ত বিক্রি ঠেকাতে প্রতিটি ভ্যারিয়েন্টের স্টক সঠিক রাখুন।" }
    ],
    links: [
      { label: { en: "Products", bn: "পণ্য" }, href: "/vendor/products" },
      { label: { en: "Add product", bn: "পণ্য যোগ করুন" }, href: "/vendor/products/add" },
      { label: { en: "Inventory", bn: "ইনভেন্টরি" }, href: "/vendor/inventory" }
    ]
  },
  {
    id: "vendor-fulfillment",
    title: { en: "Orders, packing, dispatch, and returns", bn: "অর্ডার, প্যাকিং, পাঠানো ও রিটার্ন" },
    summary: { en: "Move each order through the approved workflow and handle return evidence from one queue.", bn: "প্রতিটি অর্ডার অনুমোদিত ধাপে এগিয়ে নিন এবং একই কিউ থেকে রিটার্নের প্রমাণ পরিচালনা করুন।" },
    steps: [
      { en: "Accept or reject new orders within the handling window.", bn: "নির্ধারিত সময়ের মধ্যে নতুন অর্ডার গ্রহণ বা প্রত্যাখ্যান করুন।" },
      { en: "Pack correctly and mark ready only when the parcel is prepared.", bn: "সঠিকভাবে প্যাক করুন এবং পার্সেল প্রস্তুত হলেই রেডি হিসেবে চিহ্নিত করুন।" },
      { en: "Review return reasons, items, quantities, and evidence carefully.", bn: "রিটার্নের কারণ, পণ্য, পরিমাণ ও প্রমাণ সতর্কভাবে দেখুন।" }
    ],
    links: [
      { label: { en: "Orders", bn: "অর্ডার" }, href: "/vendor/orders" },
      { label: { en: "Returns", bn: "রিটার্ন" }, href: "/vendor/returns" }
    ]
  },
  {
    id: "vendor-finance-marketing",
    title: { en: "Finance, payouts, marketing, and reputation", bn: "ফাইন্যান্স, পেআউট, মার্কেটিং ও সুনাম" },
    summary: { en: "Track sales, commission, refunds, payouts, campaigns, reviews, and product questions.", bn: "বিক্রি, কমিশন, রিফান্ড, পেআউট, ক্যাম্পেইন, রিভিউ ও পণ্যের প্রশ্ন পর্যবেক্ষণ করুন।" },
    steps: [
      { en: "Check settlement details before requesting payout.", bn: "পেআউট চাওয়ার আগে সেটেলমেন্টের তথ্য যাচাই করুন।" },
      { en: "Use vouchers and campaigns only when margins allow.", bn: "লাভের পরিমাণ উপযুক্ত হলে তবেই ভাউচার ও ক্যাম্পেইন ব্যবহার করুন।" },
      { en: "Reply to reviews and Q&A to improve buyer trust.", bn: "ক্রেতার আস্থা বাড়াতে রিভিউ ও প্রশ্নোত্তরে উত্তর দিন।" }
    ],
    links: [
      { label: { en: "Finance", bn: "ফাইন্যান্স" }, href: "/vendor/finance" },
      { label: { en: "Marketing", bn: "মার্কেটিং" }, href: "/vendor/marketing" },
      { label: { en: "Reviews", bn: "রিভিউ" }, href: "/vendor/reviews" },
      { label: { en: "Q&A", bn: "প্রশ্নোত্তর" }, href: "/vendor/questions" }
    ]
  }
];

export const sellerUniversityQuickGuides = [
  { title: { en: "Daily action queue", bn: "প্রতিদিনের কাজের তালিকা" }, body: { en: "Check pending orders, rejected products, low stock, returns, and payout notices at the start of every shift.", bn: "প্রতিটি শিফটের শুরুতে অপেক্ষমাণ অর্ডার, প্রত্যাখ্যাত পণ্য, কম স্টক, রিটার্ন ও পেআউট নোটিশ দেখুন।" } },
  { title: { en: "Fulfillment rule", bn: "ফুলফিলমেন্ট নিয়ম" }, body: { en: "Pack on time and mark pickup-ready only when the parcel is actually ready.", bn: "সময়মতো প্যাক করুন এবং পার্সেল সত্যিই প্রস্তুত হলেই পিকআপ-রেডি করুন।" } },
  { title: { en: "Finance habit", bn: "ফাইন্যান্স অভ্যাস" }, body: { en: "Review commission, refund deductions, settlement, and payout eligibility before requesting payment.", bn: "পেমেন্ট চাওয়ার আগে কমিশন, রিফান্ড কর্তন, সেটেলমেন্ট ও পেআউট যোগ্যতা দেখুন।" } }
] satisfies Array<{ title: BilingualCopy; body: BilingualCopy }>;
