import { Principal } from "@icp-sdk/core/principal";
import type { backendInterface } from "../backend";
import {
  Discipline,
  PaymentMethod,
  PaymentStatus,
  Role,
  ShippingStatus,
  Token,
  type AdminOrderView,
  type Category,
  type CategoryWithCount,
  type StorageStats,
  type SubmissionRecord,
  type UserRecord,
} from "../backend";

const sampleProduct = {
  id: 1n,
  updated_at: 1700000000000000000n,
  active: true,
  inventory: 25n,
  name: "Ameer Al Oud | Eau De Parfum | 100ml",
  slug: "ameer-al-oud-eau-de-parfum-100ml",
  description: "A rich, resinous oud accord with warm amber and spice.",
  variants: [
    {
      id: "v-ameer",
      inventory: 25n,
      name: "100ML",
      size: "100ML",
      price: 2499n,
    },
  ],
  created_at: 1700000000000000000n,
  currency: "usd",
  category: "eau-de-parfum",
  price: 2499n,
  admin_only: false,
  images: ["/images/ameer-al-oud-eau-de-parfum-100ml.webp"],
};

// Real product catalog for the dev mock so the shop category filter can be
// exercised across both categories. Product.category stores the category SLUG
// (matching Category.slug), never a display name. Prices are Float US dollar
// decimals (e.g. 24.99) rendered directly with two decimals — never cents.
const catalogProducts = [
  {
    id: 1n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Ameer Al Oud | Eau De Parfum | 100ml",
    slug: "ameer-al-oud-eau-de-parfum-100ml",
    description: "A rich, resinous oud accord with warm amber and spice.",
    variants: [
      {
        id: "v-ameer",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 2499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 2499n,
    admin_only: false,
    images: ["/images/ameer-al-oud-eau-de-parfum-100ml.webp"],
  },
  {
    id: 2n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Arabic Coffee | Eau De Parfum | 100ml",
    slug: "arabic-coffee-eau-de-parfum-100ml",
    description: "A rich eau de parfum with roasted coffee, cardamom, and amber.",
    variants: [
      {
        id: "v-arabic-coffee",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/arabic-coffee-eau-de-parfum-100ml.webp"],
  },
  {
    id: 3n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Atlantis | Eau De Parfum | 140ml",
    slug: "atlantis-eau-de-parfum-140ml",
    description: "A deep aquatic eau de parfum with ambergris and marine notes.",
    variants: [
      {
        id: "v-atlantis",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/atlantis-eau-de-parfum-140ml.webp"],
  },
  {
    id: 4n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Black Horse | Eau De Parfum | 100ml",
    slug: "black-horse-eau-de-parfum-100ml",
    description: "A powerful eau de parfum with leather, oud, and dark spice.",
    variants: [
      {
        id: "v-black-horse",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/black-horse-eau-de-parfum-100ml.webp"],
  },
  {
    id: 5n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Blue Moon | Eau De Parfum | 100ml",
    slug: "blue-moon-eau-de-parfum-100ml",
    description: "A luminous, sparkling blend of bergamot, iris, and amber.",
    variants: [
      {
        id: "v-blue-moon",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/blue-moon-eau-de-parfum-100ml.webp"],
  },
  {
    id: 6n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Cuban Tobacco | Extrait De Aoud | 100ml",
    slug: "cuban-tobacco-extrait-de-aoud-100ml",
    description: "A warm extrait de aoud with tobacco leaf and honeyed amber.",
    variants: [
      {
        id: "v-cuban-tobacco",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-aoud",
    price: 4499n,
    admin_only: false,
    images: ["/images/cuban-tobacco-extrait-de-aoud-100ml.webp"],
  },
  {
    id: 7n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Dolce Marina | Eau De Parfum | 140ml",
    slug: "dolce-marina-eau-de-parfum-140ml",
    description: "A breezy eau de parfum with sea breeze, fig, and white musk.",
    variants: [
      {
        id: "v-dolce-marina",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/dolce-marina-eau-de-parfum-140ml.webp"],
  },
  {
    id: 8n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Dubai Ocean | Eau De Parfum | 100ml",
    slug: "dubai-ocean-eau-de-parfum-100ml",
    description: "A radiant eau de parfum with oud, ocean air, and amber.",
    variants: [
      {
        id: "v-dubai-ocean",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/dubai-ocean-eau-de-parfum-100ml.webp"],
  },
  {
    id: 9n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Fabrica 1929 | Extrait De Parfum | 150ml",
    slug: "fabrica-1929-extrait-de-parfum-150ml",
    description: "A vintage-inspired extrait de parfum with leather and spice.",
    variants: [
      {
        id: "v-fabrica",
        inventory: 25n,
        name: "150ML",
        size: "150ML",
        price: 6999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-parfum",
    price: 6999n,
    admin_only: false,
    images: ["/images/fabrica-1929-extrait-de-parfum-150ml.webp"],
  },
  {
    id: 10n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Gray oud | Extrait De Parfum | 150ml",
    slug: "gray-oud-extrait-de-parfum-150ml",
    description: "A smoky extrait de parfum with vetiver, oud, and mineral notes.",
    variants: [
      {
        id: "v-gray-oud",
        inventory: 25n,
        name: "150ML",
        size: "150ML",
        price: 6999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-parfum",
    price: 6999n,
    admin_only: false,
    images: ["/images/gray-oud-extrait-de-parfum-150ml.webp"],
  },
  {
    id: 11n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Honey Oud | Eau De Parfum | 140ml",
    slug: "honey-oud-eau-de-parfum-140ml",
    description: "A golden eau de parfum with honey, oud, and warm amber.",
    variants: [
      {
        id: "v-honey-oud",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/honey-oud-eau-de-parfum-140ml.webp"],
  },
  {
    id: 12n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Italian tobacco | Extrait De Parfum | 150ml",
    slug: "italian-tobacco-extrait-de-parfum-150ml",
    description: "A smooth extrait de parfum with tobacco, vanilla, and woods.",
    variants: [
      {
        id: "v-italian-tobacco",
        inventory: 25n,
        name: "150ML",
        size: "150ML",
        price: 6999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-parfum",
    price: 6999n,
    admin_only: false,
    images: ["/images/italian-tobacco-extrait-de-parfum-150ml.webp"],
  },
  {
    id: 13n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Jewel | Eau De Parfum | 140ml",
    slug: "jewel-eau-de-parfum-140ml",
    description: "A sparkling eau de parfum with citrus, jasmine, and musk.",
    variants: [
      {
        id: "v-jewel",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/jewel-eau-de-parfum-140ml.webp"],
  },
  {
    id: 14n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Kariman | Concentrated Perfume Oil | 30ml",
    slug: "kariman-concentrated-perfume-oil-30ml",
    description: "A concentrated perfume oil with oud, saffron, and musk.",
    variants: [
      {
        id: "v-kariman",
        inventory: 25n,
        name: "30ML",
        size: "30ML",
        price: 19999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "concentrated-perfume-oil",
    price: 19999n,
    admin_only: false,
    images: ["/images/kariman-concentrated-perfume-oil-30ml.webp"],
  },
  {
    id: 15n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Manhattan | Eau De Parfum | 100ml",
    slug: "manhattan-eau-de-parfum-100ml",
    description: "A bold eau de parfum with bergamot, cedar, and amber.",
    variants: [
      {
        id: "v-manhattan",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/manhattan-eau-de-parfum-100ml.webp"],
  },
  {
    id: 16n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Mehyar | Concentrated Perfume Oil | 30ml",
    slug: "mehyar-concentrated-perfume-oil-30ml",
    description: "A concentrated perfume oil with rose, oud, and amber.",
    variants: [
      {
        id: "v-mehyar",
        inventory: 25n,
        name: "30ML",
        size: "30ML",
        price: 17999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "concentrated-perfume-oil",
    price: 17999n,
    admin_only: false,
    images: ["/images/mehyar-concentrated-perfume-oil-30ml.webp"],
  },
  {
    id: 17n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "My Stone | Eau De Parfum | 100ml",
    slug: "my-stone-eau-de-parfum-100ml",
    description: "A mineral, woody eau de parfum with vetiver and stone accord.",
    variants: [
      {
        id: "v-my-stone",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 2999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 2999n,
    admin_only: false,
    images: ["/images/my-stone-eau-de-parfum-100ml.webp"],
  },
  {
    id: 18n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Omniyat | Eau De Parfum | 140ml",
    slug: "omniyat-eau-de-parfum-140ml",
    description: "A luxurious eau de parfum with oud, saffron, and rose.",
    variants: [
      {
        id: "v-omniyat",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/omniyat-eau-de-parfum-140ml.webp"],
  },
  {
    id: 19n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Oud Al Ameer - Extrait De Aoud 120ml",
    slug: "oud-al-ameer-extrait-de-aoud-120ml",
    description: "A bold extrait de aoud with smoky oud and leather.",
    variants: [
      {
        id: "v-oud-al-ameer",
        inventory: 25n,
        name: "120ML",
        size: "120ML",
        price: 5499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-aoud",
    price: 5499n,
    admin_only: false,
    images: ["/images/oud-al-ameer-extrait-de-aoud-120ml.webp"],
  },
  {
    id: 20n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Oud Dubai | Eau De Parfum | 100ml",
    slug: "oud-dubai-eau-de-parfum-100ml",
    description: "A rich eau de parfum with oud, leather, and warm spice.",
    variants: [
      {
        id: "v-oud-dubai",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/oud-dubai-eau-de-parfum-100ml.webp"],
  },
  {
    id: 21n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "oyal Musk|Eau De Parfum|100ml",
    slug: "oyal-musk-eau-de-parfum-100ml",
    description: "A soft, clean eau de parfum with white musk and amber.",
    variants: [
      {
        id: "v-oyal-musk",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/oyal-musk-eau-de-parfum-100ml.webp"],
  },
  {
    id: 22n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Pink Miss | Eau De Parfum | 140ml",
    slug: "pink-miss-eau-de-parfum-140ml",
    description: "A fresh, floral eau de parfum with pink pepper and rose.",
    variants: [
      {
        id: "v-pink-miss",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/pink-miss-eau-de-parfum-140ml-1.webp"],
  },
  {
    id: 23n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Purple candy | Extrait De Parfum | 150ml",
    slug: "purple-candy-extrait-de-parfum-150ml",
    description: "A sweet, playful extrait de parfum with berry and vanilla.",
    variants: [
      {
        id: "v-purple-candy",
        inventory: 25n,
        name: "150ML",
        size: "150ML",
        price: 6999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-parfum",
    price: 6999n,
    admin_only: false,
    images: ["/images/purple-candy-extrait-de-parfum-150ml.webp"],
  },
  {
    id: 24n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Rosso ombre | Extrait De Parfum | 150ml",
    slug: "rosso-ombre-extrait-de-parfum-150ml",
    description: "A deep, smoky rose with leather and dark woods.",
    variants: [
      {
        id: "v-rosso",
        inventory: 25n,
        name: "150ML",
        size: "150ML",
        price: 6999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "extrait-de-parfum",
    price: 6999n,
    admin_only: false,
    images: ["/images/rosso-ombre-extrait-de-parfum-150ml.webp"],
  },
  {
    id: 25n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Surrati Arabian Eagle 100 ml",
    slug: "surrati-arabian-eagle-100-ml",
    description: "A majestic oud eau de parfum with amber and musk.",
    variants: [
      {
        id: "v-arabian-eagle",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/surrati-arabian-eagle-100-ml.webp"],
  },
  {
    id: 26n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Surrati Dream Valley|140ml",
    slug: "surrati-dream-valley-140ml",
    description: "A dreamy eau de parfum with lavender, vanilla, and musk.",
    variants: [
      {
        id: "v-dream-valley",
        inventory: 25n,
        name: "140ML",
        size: "140ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/surrati-dream-valley-140ml.webp"],
  },
  {
    id: 27n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Surrati Lady Rose 100 ml",
    slug: "surrati-lady-rose-100-ml",
    description: "A romantic rose eau de parfum with soft musk and peony.",
    variants: [
      {
        id: "v-lady-rose",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 3499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 3499n,
    admin_only: false,
    images: ["/images/surrati-lady-rose-100-ml.webp"],
  },
  {
    id: 28n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Surrati Luxury Oud 100 ml",
    slug: "surrati-luxury-oud-100-ml",
    description: "A refined oud eau de parfum with saffron and sandalwood.",
    variants: [
      {
        id: "v-luxury-oud",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 4499n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 4499n,
    admin_only: false,
    images: ["/images/surrati-luxury-oud-100-ml.webp"],
  },
  {
    id: 29n,
    updated_at: 1700000000000000000n,
    active: true,
    inventory: 25n,
    name: "Turquoise Stone | Eau De Parfum | 100ml",
    slug: "turquoise-stone-eau-de-parfum-100ml",
    description: "A crisp, aquatic eau de parfum with sea salt and driftwood.",
    variants: [
      {
        id: "v-turquoise",
        inventory: 25n,
        name: "100ML",
        size: "100ML",
        price: 2999n,
      },
    ],
    created_at: 1700000000000000000n,
    currency: "usd",
    category: "eau-de-parfum",
    price: 2999n,
    admin_only: false,
    images: ["/images/turquoise-stone-eau-de-parfum-100ml.webp"],
  },
];

// Sample shop categories so the CATEGORIES tab and the shop filter row render
// populated data in dev. The mock keeps a mutable copy so create/update/reorder
// flows can be exercised.
const sampleCategories: Category[] = [
  {
    id: 1n,
    updated_at: 1700000000000000000n,
    active: true,
    sortOrder: 0n,
    name: "Eau De Parfum",
    slug: "eau-de-parfum",
    description: "Eau de parfum concentrates.",
    created_at: 1700000000000000000n,
    showWhenEmpty: false,
  },
  {
    id: 2n,
    updated_at: 1700000000000000000n,
    active: true,
    sortOrder: 1n,
    name: "Extrait De Aoud",
    slug: "extrait-de-aoud",
    description: "Extrait de aoud concentrates.",
    created_at: 1700000000000000000n,
    showWhenEmpty: false,
  },
  {
    id: 3n,
    updated_at: 1700000000000000000n,
    active: true,
    sortOrder: 2n,
    name: "Extrait De Parfum",
    slug: "extrait-de-parfum",
    description: "Extrait de parfum concentrates.",
    created_at: 1700000000000000000n,
    showWhenEmpty: false,
  },
  {
    id: 4n,
    updated_at: 1700000000000000000n,
    active: true,
    sortOrder: 3n,
    name: "Concentrated Perfume Oil",
    slug: "concentrated-perfume-oil",
    description: "Concentrated perfume oils and attars.",
    created_at: 1700000000000000000n,
    showWhenEmpty: false,
  },
];

let mockCategories: Category[] = sampleCategories.map((c) => ({ ...c }));

function categoryWithCount(c: Category): CategoryWithCount {
  const productCount = catalogProducts.filter(
    (p) => p.category === c.slug,
  ).length;
  return { category: c, productCount: BigInt(productCount) };
}

const sampleOrder = {
  id: 1n,
  tax: 0n,
  updated_at: 1700000000000000000n,
  total: 2499n,
  shipping: 0n,
  reference: "NAK-000001",
  created_at: 1700000000000000000n,
  payment_status: PaymentStatus.pending,
  payment_method: PaymentMethod.crypto_ckusdc,
  currency: "usd",
  items: [
    {
      product_id: 1n,
        unit_amount: 2499n,
        name: "Ameer Al Oud",
      variant_id: "v-ameer",
      quantity: 1n,
    },
  ],
  customer_email: "jane@example.com",
  subtotal: 2499n,
  shipping_status: ShippingStatus.pending,
  has_shipping_details: true,
  // Opaque IBE blob; the backend never sees plaintext PII.
  encrypted_shipping: new Uint8Array([1, 2, 3, 4]),
  marketing_consent: false,
  marketing_consent_at: undefined,
  shipped_at: undefined,
  tracking_number: undefined,
};

// Public order view returned by getMyOrders / getOrderStatus. The backend
// exposes these as a PublicOrderView whose money fields are Float dollars
// (number), distinct from the bigint integer-cents Order returned by
// createOrder. The mock mirrors that split so both call sites typecheck.
const samplePublicOrderView = {
  id: 1n,
  tax: 0,
  updated_at: 1700000000000000000n,
  total: 24.99,
  shipping: 0,
  reference: "NAK-000001",
  created_at: 1700000000000000000n,
  payment_status: PaymentStatus.pending,
  payment_method: PaymentMethod.crypto_ckusdc,
  currency: "usd",
  items: [
    {
      product_id: 1n,
      unit_amount: 2499n,
      name: "Ameer Al Oud",
      variant_id: "v-ameer",
      quantity: 1n,
    },
  ],
  customer_email: "jane@example.com",
  subtotal: 24.99,
  shipping_status: ShippingStatus.pending,
  has_shipping_details: true,
  encrypted_shipping: new Uint8Array([1, 2, 3, 4]),
  marketing_consent: false,
  marketing_consent_at: undefined,
  shipped_at: undefined,
  tracking_number: undefined,
};

const sampleAdminOrder: AdminOrderView = {
  status: PaymentStatus.pending,
  paymentMethod: PaymentMethod.crypto_ckusdc,
  cryptoStatus: { __kind__: "awaiting_payment", awaiting_payment: null },
  createdAt: 1700000000000000000n,
  itemCount: 1n,
  reference: "NAK-000001",
  amountOwed: 2499n,
  currency: "usd",
  subaccountHex: "0000000000000000000000000000000000000000000000000000000000000005",
  depositAccountText:
    "icrc1:ckUSDC:vm5zh-yaaaa-aaaaj-qoaza-cai:0000000000000000000000000000000000000000000000000000000000000005",
  customerEmail: "jane@example.com",
};

const sampleAdminOrderPaid: AdminOrderView = {
  status: PaymentStatus.paid,
  paymentMethod: PaymentMethod.crypto_ckusdc,
  cryptoStatus: { __kind__: "paid", paid: { blockIndex: 42n } },
  createdAt: 1700000000000000000n,
  itemCount: 2n,
  reference: "NAK-000002",
  amountOwed: 4499n,
  currency: "usd",
  subaccountHex: "0000000000000000000000000000000000000000000000000000000000000005",
  depositAccountText:
    "icrc1:ckUSDC:vm5zh-yaaaa-aaaaj-qoaza-cai:0000000000000000000000000000000000000000000000000000000000000005",
  customerEmail: "alex@example.com",
};

// Sample role records so the USERS tab renders a populated table and the
// single-owner warning.
const sampleUsers: Array<[Principal, UserRecord]> = [
  [
    Principal.fromText("aaaaa-aa"),
    { role: Role.owner, grantedAt: 1700000000000000000n },
  ],
  [
    Principal.fromText("2vxsx-fae"),
    { role: Role.admin, grantedAt: 1700000000000000000n },
  ],
  [
    Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"),
    { role: Role.staff, grantedAt: 1700000000000000000n },
  ],
];

// Sample artist submissions so the SUBMISSIONS tab renders a populated table.
const sampleSubmissions: SubmissionRecord[] = [
  {
    id: "sub-1",
    name: "Aria Voss",
    discipline: Discipline.music,
    link: "https://soundcloud.com/aria-voss/demo",
    email: "aria@example.com",
    message: "Electronic ambient demo, 3 tracks.",
    submittedAt: 1700000000000000000n,
    marketingConsent: true,
    marketingConsentAt: 1700000000000000000n,
  },
  {
    id: "sub-2",
    name: "Kofi Mensah",
    discipline: Discipline.visualArt,
    link: "https://kofi.art/portfolio",
    email: "kofi@example.com",
    message: undefined,
    submittedAt: 1700000000000000000n,
    marketingConsent: false,
    marketingConsentAt: undefined,
  },
];

export const mockBackend: backendInterface = {
  addAdmin: async () => true,
  adminGetOrderDetail: async () => ({
    status: PaymentStatus.pending,
    paymentMethod: PaymentMethod.crypto_ckusdc,
    cryptoStatus: { __kind__: "awaiting_payment", awaiting_payment: null },
    createdAt: 1700000000000000000n,
    reference: "NAK-000001",
    amountOwed: 2499n,
    updatedAt: 1700000000000000000n,
    currency: "usd",
    subaccountHex: "0000000000000000000000000000000000000000000000000000000000000005",
    items: [
      {
        product_id: 1n,
      unit_amount: 2499n,
        name: "Ameer Al Oud",
        variant_id: "v-ameer",
        quantity: 1n,
      },
    ],
    sweepNote: undefined,
    customerEmail: "jane@example.com",
    hasShippingDetails: true,
    encryptedShipping: new Uint8Array([1, 2, 3, 4]),
    depositAccountText:
      "icrc1:ckUSDC:vm5zh-yaaaa-aaaaj-qoaza-cai:0000000000000000000000000000000000000000000000000000000000000005",
  }),
  adminListOrders: async () => [sampleAdminOrder, sampleAdminOrderPaid],
  adminCount: async () => 1n,
  bootstrapOwner: async () => true,
  cancelCardOrder: async () => ({ __kind__: "ok", ok: null }),
  // Guest self-cancellation: the backend requires the short-lived token that
  // was issued to the browser session at createOrder time. The mock accepts
  // any reference/token pair and succeeds, mirroring the real Result_1 shape.
  cancelGuestOrder: async () => ({ __kind__: "ok", ok: null }),
  claimInitialAdmin: async () => true,
  getMyRole: async () => Role.owner,
  grantRole: async () => true,
  isAdmin: async () => true,
  listAdmins: async () => [],
  listLatePayments: async () => [],
  listOrdersForRecovery: async () => [],
  listUsers: async () => [],
  removeAdmin: async () => true,
  resetAdminForMigration: async () => true,
  revokeRole: async () => true,
  checkCryptoPayment: async () => ({
    __kind__: "ok",
    ok: { __kind__: "awaiting_payment", awaiting_payment: null },
  }),
  confirmCardPayment: async () => ({ __kind__: "ok", ok: PaymentStatus.paid }),
  createCardCheckoutSession: async () => ({
    __kind__: "ok",
    ok: { reference: "NAK-000001", url: "https://checkout.stripe.com/test" },
  }),
  createCheckoutSession: async () => ({
    __kind__: "ok",
    ok: { reference: "NAK-000001" },
  }),
  // createOrder now returns CreateOrderResult: the order plus a short-lived
  // cancellation token for anonymous (guest) callers. Signed-in callers get
  // cancellationToken: undefined. The mock always issues a token so the guest
  // cancellation flow can be exercised in dev.
  createOrder: async () => ({
    __kind__: "ok",
    ok: { order: sampleOrder, cancellationToken: "mock-cancellation-token" },
  }),
  createProduct: async () => true,
  execute: async () => ({ hasMore: false, rows: [] }),
  forceRecheckPayment: async () => ({
    __kind__: "ok",
    ok: {
      reference: "NAK-000001",
      balance: 0n,
      status: { __kind__: "awaiting_payment", awaiting_payment: null },
    },
  }),
  forceSweepOrder: async () => ({ __kind__: "ok", ok: { blockIndex: 1n } }),
  getApiDoc: async () => "api doc",
  getCryptoConfig: async () => ({
    icp: {
      fee: 10000n,
      decimals: 8,
      canisterId: "aaaaa-aa" as never,
    },
    ckUSDC: {
      fee: 10000n,
      decimals: 8,
      canisterId: "aaaaa-aa" as never,
    },
    minimumOrder: 2500n,
    ckUSDCEnabled: false,
    treasuryPrincipal: "aaaaa-aa" as never,
  }),
  getMinimumOrder: async () => 2500n,
  // Featured video — the mock returns an unset video (both URLs empty) so the
  // admin Featured Video section renders its empty state and the live preview
  // stays hidden until a valid URL is entered.
  getFeaturedVideo: async () => ({ rawUrl: "", embedUrl: "" }),
  getCryptoDepositInfo: async () => ({
    __kind__: "ok",
    ok: {
      decimals: 8,
      token: Token.ckUSDC,
      expiresAt: 1700000000000000000n + 1800000000000n,
      qrPayload: "icp:abc",
      subaccount: new Uint8Array(32),
      reference: "NAK-000001",
      address: "aaaaa-aa" as never,
      amountDue: 3500000000n,
    },
  }),
  getCryptoPaymentStatus: async () => ({
    __kind__: "ok",
    ok: { __kind__: "awaiting_payment", awaiting_payment: null },
  }),
  getCanisterId: async () => "aaaaa-aa" as unknown as Principal,
  getCycleBalance: async () => 1_250_000_000_000n,
  // Cycle Monitor — the mock returns a populated ring buffer (2+ samples) so
  // the tab renders real data in dev. The second sample shows an increased
  // cyclesBalance to demonstrate a top-up interval, which the frontend flags
  // and excludes from burn-rate math.
  getCycleMetrics: async () => ({
    liveBalance: 1_250_000_000_000n,
    samples: [
      {
        timestamp: 1700000000000000000n,
        cyclesBalance: 1_240_000_000_000n,
        heapBytes: 12_000_000n,
        stableBytes: 8_000_000n,
        totalOutcalls: 1_200n,
        totalLedgerCalls: 340n,
        totalVetkdCalls: 0n,
        totalRawRandCalls: 0n,
      },
      {
        timestamp: 1700003600000000000n,
        cyclesBalance: 1_250_000_000_000n,
        heapBytes: 12_100_000n,
        stableBytes: 8_050_000n,
        totalOutcalls: 1_260n,
        totalLedgerCalls: 352n,
        totalVetkdCalls: 0n,
        totalRawRandCalls: 0n,
      },
    ],
    counters: {
      totalOutcalls: 1_260n,
      totalLedgerCalls: 352n,
      totalVetkdCalls: 0n,
      totalRawRandCalls: 0n,
    },
  }),
  getDashboardData: async () => "{}",
  getDefaultSubaccountBalance: async () => ({ __kind__: "ok", ok: 1_250_000_000n }),
  getEncryptionRecipients: async () => [],
  getIbePublicKey: async () => new Uint8Array(0),
  getConsentListCsv: async () => ({
    __kind__: "ok",
    ok: { csv: "email,consented_at\njane@example.com,1700000000000000000" },
  }),
  getSubaccountBalance: async () => ({
    __kind__: "ok",
    ok: {
      balance: 3_500_000_000n,
      subaccountHex:
        "0000000000000000000000000000000000000000000000000000000000000005",
      subaccountIndex: 5n,
    },
  }),
  getMyOrders: async () => [samplePublicOrderView],
  getMyEncryptedIbeKey: async (transportPublicKey: Uint8Array) => new Uint8Array(0),
  getNAKPrice: async () => "1.00",
  getOrderStatus: async () => samplePublicOrderView,
  getPaymentServiceConfig: async () => ({
    url: "",
    tokenSet: false,
  }),
  getPaymentStatus: async () => PaymentStatus.pending,
  getProduct: async () => sampleProduct,
  getResumeInfo: async () => ({
    __kind__: "ok",
    ok: {
      reference: "NAK-000001",
      status: { __kind__: "awaiting_payment", awaiting_payment: null },
      expiresAt: 1700000000000000000n + 1800000000000n,
      remainingNs: 1800000000000n,
      deposit: {
        decimals: 8,
        token: Token.ckUSDC,
        expiresAt: 1700000000000000000n + 1800000000000n,
        qrPayload: "icp:abc",
        subaccount: new Uint8Array(32),
        reference: "NAK-000001",
        address: "aaaaa-aa" as never,
        amountDue: 3500000000n,
      },
    },
  }),
  getTokenImage: async () => "",
  getTokenProfile: async () => "",
  getTreasuryTokens: async () =>
    JSON.stringify([
      { symbol: "ckUSDC", balance: 12_500_000_000n, decimals: 6 },
      { symbol: "ICP", balance: 0n, decimals: 8 },
    ]),
  handlePaymentConfirmation: async () => ({ __kind__: "ok", ok: null }),
  listProducts: async () => catalogProducts,
  listCategories: async () => mockCategories.map(categoryWithCount),
  createCategory: async (name, description) => {
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    if (!slug) return { __kind__: "err", err: { __kind__: "emptyName", emptyName: null } };
    if (mockCategories.some((c) => c.slug === slug)) {
      return { __kind__: "err", err: { __kind__: "slugCollision", slugCollision: slug } };
    }
    const now = 1700000000000000000n;
    const nextId = mockCategories.reduce(
      (max, c) => (c.id > max ? c.id : max),
      0n,
    ) + 1n;
    const category: Category = {
      id: nextId,
      slug,
      name,
      description: description ?? undefined,
      sortOrder: BigInt(mockCategories.length),
      active: true,
      showWhenEmpty: false,
      created_at: now,
      updated_at: now,
    };
    mockCategories = [...mockCategories, category];
    return { __kind__: "ok", ok: category };
  },
  updateCategory: async (id, name, description, sortOrder, active, showWhenEmpty) => {
    const existing = mockCategories.find((c) => c.id === id);
    if (!existing) {
      return { __kind__: "err", err: { __kind__: "notFound", notFound: id } };
    }
    const updated: Category = {
      ...existing,
      name,
      description: description ?? undefined,
      sortOrder,
      active,
      showWhenEmpty,
      updated_at: 1700000000000000000n,
    };
    mockCategories = mockCategories.map((c) => (c.id === id ? updated : c));
    return { __kind__: "ok", ok: updated };
  },
  reorderCategories: async (orderedIds) => {
    const byId = new Map(mockCategories.map((c) => [c.id, c]));
    const reordered = orderedIds
      .map((id) => byId.get(id))
      .filter((c): c is Category => c !== undefined);
    if (reordered.length !== mockCategories.length) {
      return { __kind__: "err", err: { __kind__: "notFound", notFound: 0n } };
    }
    mockCategories = reordered.map((c, index) => ({
      ...c,
      sortOrder: BigInt(index),
      updated_at: 1700000000000000000n,
    }));
    return { __kind__: "ok", ok: null };
  },
  deleteCategory: async (id) => {
    const existing = mockCategories.find((c) => c.id === id);
    if (!existing) {
      return { __kind__: "err", err: { __kind__: "notFound", notFound: id } };
    }
    const referenced = catalogProducts.filter((p) => p.category === existing.slug);
    if (referenced.length > 0) {
      return {
        __kind__: "err",
        err: {
          __kind__: "productsReferenced",
          productsReferenced: { slug: existing.slug, count: BigInt(referenced.length) },
        },
      };
    }
    mockCategories = mockCategories.filter((c) => c.id !== id);
    return { __kind__: "ok", ok: null };
  },
  reassignProducts: async (fromSlug, toSlug) => {
    const target = mockCategories.find((c) => c.slug === toSlug);
    if (!target) {
      return {
        __kind__: "err",
        err: { __kind__: "targetCategoryNotFound", targetCategoryNotFound: toSlug },
      };
    }
    const count = catalogProducts.filter((p) => p.category === fromSlug).length;
    return { __kind__: "ok", ok: BigInt(count) };
  },
  listSubmissions: async () => ({ __kind__: "ok", ok: [] }),
  markLatePaymentReviewed: async () => true,
  markOrderShipped: async () => ({ __kind__: "ok", ok: null }),
  resendConfirmationEmail: async () => ({ __kind__: "ok", ok: null }),
  sweepSubaccount: async () => ({
    __kind__: "ok",
    ok: {
      subaccountHex:
        "0000000000000000000000000000000000000000000000000000000000000005",
      subaccountIndex: 5n,
      blockIndex: 1n,
    },
  }),
  unsubscribe: async () => ({ __kind__: "ok", ok: null }),
  consentServiceTransform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  emailTransform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  paymentServiceTransform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  releaseExpiredOrders: async () => 0n,
  releaseExpiredReservations: async () => 0n,
  getPendingOrderConfig: async () => ({ globalCap: 10n, perSessionCap: 2n }),
  updatePendingOrderGlobalCap: async (cap) => cap,
  schema: async () => "{}",
  submissionServiceTransform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  submitSubmission: async () => ({ __kind__: "ok", ok: null }),
  sweepCryptoToTreasury: async () => ({ __kind__: "ok", ok: 1n }),
  sweepDefaultSubaccount: async () => ({ __kind__: "ok", ok: {} }),
  startVerificationTimer: async () => true,
  stopVerificationTimer: async () => true,
  transform: async (input) => ({
    status: input.response.status,
    body: input.response.body,
    headers: [],
  }),
  updateLedgerConfig: async () => ({ __kind__: "ok", ok: null }),
  updateMinimumOrder: async () => ({ __kind__: "ok", ok: null }),
  updateFeaturedVideo: async () => ({ __kind__: "ok", ok: null }),
  updatePaymentServiceToken: async () => ({ __kind__: "ok", ok: null }),
  updatePaymentServiceUrl: async () => ({ __kind__: "ok", ok: null }),
  updateProduct: async () => true,
  updateTreasury: async () => ({ __kind__: "ok", ok: null }),
  // Product image upload — chunked canister storage. The mock accepts any
  // content type / size, echoes a stable upload id, and returns a stable asset
  // id on finish so the admin image manager can be exercised in dev.
  startUpload: async () => ({ __kind__: "ok", ok: "mock-upload-id" }),
  uploadChunk: async () => ({ __kind__: "ok", ok: null }),
  finishUpload: async () => ({ __kind__: "ok", ok: "mock-asset-1" }),
  deleteProductImage: async () => ({ __kind__: "ok", ok: null }),
  getProductImageStorageStats: async (): Promise<StorageStats> => ({
    totalBytes: 1_250_000n,
    count: 4n,
  }),
  sweepExpiredUploads: async () => undefined,
  // Public asset serving — the mock returns an empty 404-style response so the
  // interface typechecks; real asset bytes come from the canister at runtime.
  http_request: async () => ({
    status_code: 404,
    headers: [],
    body: new Uint8Array(0),
  }),
  http_request_update: async () => ({
    status_code: 404,
    headers: [],
    body: new Uint8Array(0),
  }),
  http_request_streaming_callback: async () => ({
    body: new Uint8Array(0),
  }),
};
