import type {
  Address,
  ChatMessage,
  DeliveryOption,
  MobileConfig,
  PaymentMethod,
} from '../types';

/** Local fallbacks only. Live copy comes from `/catalog/mobile-config` and addresses from `/addresses/mine`. */

export const DEFAULT_MOBILE_CONFIG: MobileConfig = {
  heroLight: 'Find Your',
  heroBold: 'Medicines Fast',
  quickActions: [
    { id: 'upload', label: 'Upload', icon: 'camera-outline', href: '/scan' },
    { id: 'order', label: 'Order', icon: 'bag-outline', href: '/(tabs)/cart' },
    { id: 'pharmacy', label: 'Pharmacy', icon: 'location-outline', href: '/pharmacies' },
    { id: 'reminder', label: 'Reminder', icon: 'time-outline', href: '/reminders' },
  ],
  deliveryOptions: [
    { id: 'standard', title: 'Standard', eta: '45-60 min', priceLabel: 'From charges' },
    { id: 'express', title: 'Express', eta: '20-30 min', priceLabel: 'From charges', highlighted: true },
    { id: 'pickup', title: 'Store Pickup', eta: 'Ready in 30-45 min', priceLabel: 'Free' },
  ],
  paymentMethods: [
    { id: 'cod', type: 'cod', label: 'Cash on Delivery' },
    { id: 'debit', type: 'debit_card', label: 'Debit Card', detail: 'TEST MODE' },
    { id: 'credit', type: 'credit_card', label: 'Credit Card', detail: 'TEST MODE' },
  ],
  aiMessages: [
    {
      id: 'm1',
      role: 'assistant',
      text: 'Hi — I’m Hera AI. Ask me about medicines, side effects, or what to take for common symptoms.',
    },
    {
      id: 'm2',
      role: 'user',
      text: 'I have a mild headache and fever. What should I take?',
    },
    {
      id: 'm3',
      role: 'assistant',
      text: 'For mild headache and fever, Yakapsule 500mg is commonly recommended: 1 tablet up to 3 times a day for 5 days. Stay hydrated and rest.',
    },
  ],
  tracking: {
    riderName: 'Alex',
    expressEtaMinutes: 25,
    standardEtaMinutes: 45,
    pickupEtaMinutes: 40,
    defaultDistanceKm: 2.4,
  },
};

export const QUICK_ACTIONS = DEFAULT_MOBILE_CONFIG.quickActions;
export const DELIVERY_OPTIONS: DeliveryOption[] = DEFAULT_MOBILE_CONFIG.deliveryOptions;
export const PAYMENT_METHODS: PaymentMethod[] = DEFAULT_MOBILE_CONFIG.paymentMethods;
export const AI_STARTER_MESSAGES: ChatMessage[] = DEFAULT_MOBILE_CONFIG.aiMessages;

export const ADDRESSES: Address[] = [
  {
    id: 'a1',
    label: 'Home',
    recipientName: 'Guest',
    phone: '+12125550100',
    houseNo: '245',
    street: 'Park Ave',
    area: 'Midtown',
    city: 'New York',
    line: '245 Park Ave, New York, NY',
  },
  {
    id: 'a2',
    label: 'Work',
    recipientName: 'Guest',
    phone: '+12125550100',
    houseNo: '350',
    street: '5th Ave',
    area: 'Midtown',
    city: 'New York',
    line: '350 5th Ave, New York, NY',
  },
];
