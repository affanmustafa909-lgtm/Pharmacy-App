export type TabParamList = {
  index: undefined;
  cart: undefined;
  ai: undefined;
  profile: undefined;
};

export type RootStackParamList = {
  Tabs: { screen?: keyof TabParamList } | undefined;
  Scan: undefined;
  Search: undefined;
  Product: { id: string };
  Auth: {
    returnTo?:
      | 'Checkout'
      | 'Orders'
      | 'Addresses'
      | 'Reminders'
      | 'Prescriptions'
      | 'Notifications'
      | 'Pharmacies'
      | 'Profile'
      | 'Scan'
      | 'Tabs';
    mode?: 'signin' | 'signup';
  } | undefined;
  Checkout: undefined;
  OrderSuccess: undefined;
  TrackOrder: { orderId?: string } | undefined;
  Pharmacies: undefined;
  Reminders: undefined;
  Addresses: { completeId?: string; returnTo?: 'Checkout' } | undefined;
  AccountSettings: undefined;
  Prescriptions: undefined;
  Notifications: undefined;
  Orders: undefined;
  Receipt: { orderId: string };
};
