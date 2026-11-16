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
  Checkout: undefined;
  OrderSuccess: undefined;
  TrackOrder: undefined;
  Pharmacies: undefined;
  Reminders: undefined;
  Addresses: undefined;
  Prescriptions: undefined;
  Notifications: undefined;
  Orders: undefined;
};
