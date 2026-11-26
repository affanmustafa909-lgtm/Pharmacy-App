export type Product = {
  id: string;
  name: string;
  brand: string;
  genericName?: string;
  strength?: string;
  price: number;
  unitLabel: string;
  packSize: string;
  description: string;
  longDescription: string;
  category: string;
  inStock: boolean;
  stock?: number;
  expiry?: string;
  expired?: boolean;
  batch?: string;
  rxRequired?: boolean;
  matchScore?: number;
  cardTone: 'blue' | 'pink' | 'mint' | 'lavender';
  bottleTone: string;
  storeId?: string;
  storeName?: string;
  sku?: string;
  /** Local require() image or remote URI from the API */
  image?: number | { uri: string };
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type Address = {
  id: string;
  label: string;
  recipientName: string;
  phone: string;
  houseNo: string;
  street: string;
  area: string;
  city: string;
  landmark?: string;
  deliveryInstructions?: string;
  line: string;
  lat?: number | null;
  lng?: number | null;
  isDefault?: boolean;
};

export type NearbyStoreOption = {
  id: string;
  name: string;
  address: string;
  openUntil?: string;
  rating?: number;
  distanceKm?: number | null;
  deliveryFee: number;
  etaMinutes: number;
  canFulfillAll: boolean;
  availability: {
    sku: string;
    quantity: number;
    available: boolean;
    productId?: string | null;
    name: string;
    price: number | null;
    stock: number;
  }[];
};

export type CheckoutPlanStore = {
  storeId: string;
  storeName: string;
  storeAddress: string;
  items: {
    productId: string;
    name: string;
    sku: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  productSubtotal: number;
  deliveryCharge: number;
  serviceCharge: number;
  bfpCharge: number;
  discount: number;
  total: number;
  etaMinutes: number;
};

export type DeliveryOption = {
  id: 'standard' | 'express' | 'pickup';
  title: string;
  eta: string;
  priceLabel: string;
  highlighted?: boolean;
};

export type PaymentMethod = {
  id: string;
  type: 'apple_pay' | 'card' | 'debit_card' | 'credit_card' | 'cod' | 'other';
  label: string;
  detail?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  text: string;
};

export type MobileConfig = {
  heroLight: string;
  heroBold: string;
  quickActions: { id: string; label: string; icon: string; href: string }[];
  deliveryOptions: DeliveryOption[];
  paymentMethods: PaymentMethod[];
  aiMessages: ChatMessage[];
  tracking: {
    riderName: string;
    expressEtaMinutes: number;
    standardEtaMinutes: number;
    pickupEtaMinutes?: number;
    defaultDistanceKm: number;
  };
};

export type PromoInfo = {
  code: string;
  label: string;
  discount: number;
};

export type OrderStatusStep = {
  id: string;
  title: string;
  timeLabel?: string;
  completed: boolean;
};

export type OrderItem = {
  productId?: string | null;
  name: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
};

export type Order = {
  id: string;
  total: number;
  itemCount: number;
  deliveryType: DeliveryOption['id'];
  paymentLabel: string;
  paymentStatus?: 'paid' | 'unpaid';
  transactionId?: string | null;
  createdAt: string;
  status?: string;
  storeName?: string;
  storeAddress?: string;
  openUntil?: string;
  addressLine?: string;
  recipientName?: string;
  recipientPhone?: string;
  riderName?: string | null;
  riderPhone?: string | null;
  waitingForRider?: boolean;
  etaMinutes: number;
  distanceKm: number;
  steps: OrderStatusStep[];
  productSubtotal?: number;
  deliveryCharge?: number;
  serviceCharge?: number;
  bfpCharge?: number;
  discount?: number;
  items?: OrderItem[];
  html?: string;
};

export type Reminder = {
  id: string;
  medicine: string;
  time: string;
  frequency: string;
  enabled: boolean;
  productId?: string | null;
  orderNumber?: string | null;
  snoozedUntil?: string | null;
};

export type Pharmacy = {
  id: string;
  name: string;
  distance: string;
  openUntil: string;
  rating: number;
  address: string;
  pharmacist?: string;
};

export type SearchSuggestion = {
  type: string;
  label: string;
  q: string;
};

export type StoreAvailability = {
  productId: string;
  storeId: string;
  storeName: string;
  address: string;
  openUntil: string;
  price: number;
  stock: number;
  inStock: boolean;
  expired: boolean;
  expiry: string;
  batch: string;
};

export type DetectedMedicine = {
  name?: string;
  strength?: string;
  form?: string;
  packSize?: string;
  confidence?: number;
  unclear?: boolean;
};

export type CatalogPhotoMatch = {
  productId: string;
  storeId: string;
  storeName: string;
  sku: string;
  name: string;
  genericName: string;
  strength: string;
  form: string;
  packSize: string;
  price: number;
  stock: number;
  inStock: boolean;
  rxRequired: boolean;
  score: number;
};

export type Prescription = {
  id: string;
  number: string;
  status: string;
  uploadType?: 'medicine_packaging' | 'prescription' | string;
  medicineName: string;
  imageUrl: string;
  imageReadable?: boolean;
  scannedText: string;
  detectedDetails?: DetectedMedicine;
  linkedProductId?: string | null;
  verifiedItems: {
    name: string;
    strength?: string;
    quantity?: string;
    approvedQty?: number;
    sku?: string;
    packSize?: string;
    unitLabel?: string;
    productId?: string;
  }[];
  customerNote: string;
  notes: string;
  storeId: string;
  storeName: string;
  storeAddress?: string;
  submittedAt: string;
  updatedAt?: string;
};

export type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: string;
};
