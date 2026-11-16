import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ADDRESSES as FALLBACK_ADDRESSES,
  DEFAULT_MOBILE_CONFIG,
  DELIVERY_OPTIONS as FALLBACK_DELIVERY,
  PAYMENT_METHODS as FALLBACK_PAYMENTS,
} from '../data/dummy';
import {
  createAddress,
  deleteAddress,
  loadCatalog,
  loadMobileConfig,
  loadMyAddresses,
  loadMyOrders,
  loadProfile,
  loadStores,
  loginCustomer,
  placeCustomerOrder,
  quoteOrder,
  validatePromo,
  type ChargeQuote,
  type ProfileUser,
} from '../lib/api';
import type {
  Address,
  CartItem,
  DeliveryOption,
  MobileConfig,
  Order,
  PaymentMethod,
  Pharmacy,
  Product,
  PromoInfo,
} from '../types';

type AppContextValue = {
  products: Product[];
  stores: Pharmacy[];
  selectedStoreId: string | null;
  selectedStore: Pharmacy | null;
  setSelectedStoreId: (id: string) => void;
  catalogStatus: 'loading' | 'ready' | 'error';
  catalogError: string;
  user: ProfileUser | null;
  orderCount: number;
  quote: ChargeQuote | null;
  cart: CartItem[];
  favorites: string[];
  promoApplied: boolean;
  activePromo: PromoInfo | null;
  mobileConfig: MobileConfig;
  addresses: Address[];
  deliveryOptions: DeliveryOption[];
  paymentMethods: PaymentMethod[];
  selectedAddressId: string;
  selectedDeliveryId: 'standard' | 'express' | 'pickup';
  selectedPaymentId: string;
  prescriptionNumber: string | null;
  quoteError: string;
  lastOrder: Order | null;
  cartCount: number;
  subtotal: number;
  discount: number;
  total: number;
  storeSwitchMessage: string;
  getProduct: (productId: string) => Product | undefined;
  refreshCatalog: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleFavorite: (productId: string) => void;
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  setSelectedAddressId: (id: string) => void;
  setSelectedDeliveryId: (id: 'standard' | 'express' | 'pickup') => void;
  setSelectedPaymentId: (id: string) => void;
  setPrescriptionNumber: (number: string | null) => void;
  replaceCart: (items: CartItem[]) => void;
  refreshAddresses: () => Promise<Address[]>;
  addAddress: (input: { label: string; line: string }) => Promise<Address>;
  removeAddress: (id: string) => Promise<void>;
  placeOrder: () => Promise<Order>;
  updateLastOrderProgress: (distanceKm: number, etaMinutes: number, completedSteps: number) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Pharmacy[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState('');
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [orderCount, setOrderCount] = useState(0);
  const [quote, setQuote] = useState<ChargeQuote | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activePromo, setActivePromo] = useState<PromoInfo | null>(null);
  const [mobileConfig, setMobileConfig] = useState<MobileConfig>(DEFAULT_MOBILE_CONFIG);
  const [addresses, setAddresses] = useState<Address[]>(FALLBACK_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState(FALLBACK_ADDRESSES[0]?.id ?? '');
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<'standard' | 'express' | 'pickup'>('express');
  const [prescriptionNumber, setPrescriptionNumber] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [storeSwitchMessage, setStoreSwitchMessage] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState(FALLBACK_PAYMENTS[0]?.id ?? 'apple');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;

  const deliveryOptions = mobileConfig.deliveryOptions?.length
    ? mobileConfig.deliveryOptions
    : FALLBACK_DELIVERY;
  const paymentMethods = mobileConfig.paymentMethods?.length
    ? mobileConfig.paymentMethods
    : FALLBACK_PAYMENTS;
  const promoApplied = Boolean(activePromo);

  useEffect(() => {
    let cancel = false;
    loginCustomer()
      .then(() =>
        Promise.all([
          loadStores().catch(() => [] as Pharmacy[]),
          loadProfile().catch(() => null),
          loadMyOrders().catch(() => []),
          loadMobileConfig().catch(() => null),
          loadMyAddresses().catch(() => FALLBACK_ADDRESSES),
        ]),
      )
      .then(async ([nextStores, nextUser, nextOrders, mobile, nextAddresses]) => {
        if (cancel) return;
        setStores(nextStores);
        const firstStoreId = nextStores[0]?.id ?? null;
        setSelectedStoreIdState(firstStoreId);
        const nextProducts = await loadCatalog(firstStoreId ? { storeId: firstStoreId } : undefined);
        if (cancel) return;
        setProducts(nextProducts);
        if (nextUser) setUser(nextUser);
        setOrderCount(nextOrders.length);
        if (mobile) {
          setMobileConfig(mobile.config);
          const nextPayments = mobile.config.paymentMethods?.length
            ? mobile.config.paymentMethods
            : FALLBACK_PAYMENTS;
          setSelectedPaymentId((prev) =>
            nextPayments.some((method) => method.id === prev) ? prev : nextPayments[0].id,
          );
          const nextDelivery = mobile.config.deliveryOptions?.find((option) => option.highlighted)?.id
            ?? mobile.config.deliveryOptions?.[0]?.id
            ?? 'express';
          setSelectedDeliveryId(nextDelivery);
        }
        if (nextAddresses.length) {
          setAddresses(nextAddresses);
          setSelectedAddressId((prev) =>
            nextAddresses.some((item) => item.id === prev) ? prev : nextAddresses[0].id,
          );
        }
        setCatalogStatus('ready');
        setCatalogError('');
      })
      .catch((error: unknown) => {
        if (cancel) return;
        setCatalogStatus('error');
        setCatalogError(error instanceof Error ? error.message : 'Could not load medicines');
      });
    return () => {
      cancel = true;
    };
  }, []);

  const getProduct = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products],
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const [nextStores, nextOrders, mobile, nextAddresses] = await Promise.all([
        loadStores().catch(() => [] as Pharmacy[]),
        loadMyOrders().catch(() => [] as Awaited<ReturnType<typeof loadMyOrders>>),
        loadMobileConfig().catch(() => null),
        loadMyAddresses().catch(() => null),
      ]);
      setStores(nextStores);
      const storeId =
        selectedStoreId && nextStores.some((store) => store.id === selectedStoreId)
          ? selectedStoreId
          : nextStores[0]?.id ?? null;
      if (storeId !== selectedStoreId) setSelectedStoreIdState(storeId);
      const nextProducts = await loadCatalog(storeId ? { storeId } : undefined);
      setProducts(nextProducts);
      setOrderCount(nextOrders.length);
      if (mobile) setMobileConfig(mobile.config);
      if (nextAddresses?.length) {
        setAddresses(nextAddresses);
        setSelectedAddressId((prev) =>
          nextAddresses.some((item) => item.id === prev) ? prev : nextAddresses[0].id,
        );
      }
      setCatalogStatus('ready');
      setCatalogError('');
      setCart((prev) =>
        prev.filter((item) => nextProducts.some((product) => product.id === item.productId && product.inStock)),
      );
    } catch (error: unknown) {
      setCatalogStatus('error');
      setCatalogError(error instanceof Error ? error.message : 'Could not refresh medicines');
    }
  }, [selectedStoreId]);

  const setSelectedStoreId = useCallback((id: string) => {
    setSelectedStoreIdState((prevStoreId) => {
      const previousCart = cart;
      const previousProducts = products;
      setActivePromo(null);
      setCatalogStatus('loading');
      setStoreSwitchMessage('');
      void loadCatalog({ storeId: id })
        .then((nextProducts) => {
          setProducts(nextProducts);
          const remapped: CartItem[] = [];
          let dropped = 0;
          for (const item of previousCart) {
            const previous = previousProducts.find((product) => product.id === item.productId);
            if (!previous?.sku) {
              dropped += 1;
              continue;
            }
            const match = nextProducts.find((product) => product.sku === previous.sku && product.inStock);
            if (!match) {
              dropped += 1;
              continue;
            }
            remapped.push({ productId: match.id, quantity: item.quantity });
          }
          setCart(remapped);
          if (previousCart.length) {
            setStoreSwitchMessage(
              dropped
                ? `Switched stores. ${remapped.length} item(s) kept, ${dropped} unavailable at the new store.`
                : 'Switched stores. Cart prices and stock were rechecked.',
            );
          }
          setCatalogStatus('ready');
          setCatalogError('');
        })
        .catch((error: unknown) => {
          setCatalogStatus('error');
          setCatalogError(error instanceof Error ? error.message : 'Could not load store products');
          if (prevStoreId) setSelectedStoreIdState(prevStoreId);
        });
      return id;
    });
  }, [cart, products]);

  const cartCount = useMemo(() => cart.reduce((sum, item) => sum + item.quantity, 0), [cart]);

  const subtotal = useMemo(
    () =>
      cart.reduce((sum, item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return sum + (product?.price ?? 0) * item.quantity;
      }, 0),
    [cart, products],
  );

  const discount = activePromo?.discount ?? quote?.discount ?? 0;
  const total = quote ? quote.total : Math.max(0, subtotal - discount);

  useEffect(() => {
    if (catalogStatus !== 'ready' || cart.length === 0) {
      setQuote(null);
      setQuoteError(cart.length === 0 ? '' : quoteError);
      return;
    }
    const lines = cart
      .map((item) => ({ product: products.find((entry) => entry.id === item.productId), quantity: item.quantity }))
      .filter((line): line is { product: Product; quantity: number } => Boolean(line.product?.storeId));
    if (lines.length !== cart.length) return;
    const storeId = lines[0].product.storeId;
    if (!storeId || lines.some((line) => line.product.storeId !== storeId)) {
      setQuote(null);
      return;
    }
    let cancel = false;
    quoteOrder({
      storeId,
      deliveryType: selectedDeliveryId,
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    })
      .then((next) => {
        if (!cancel) {
          setQuote(next);
          setQuoteError('');
        }
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setQuote(null);
          setQuoteError(error instanceof Error ? error.message : 'Could not calculate charges');
        }
      });
    return () => {
      cancel = true;
    };
  }, [cart, products, selectedDeliveryId, catalogStatus, activePromo, prescriptionNumber]);

  const addToCart = useCallback(
    (productId: string, quantity = 1) => {
      const product = products.find((entry) => entry.id === productId);
      if (!product?.inStock) return;
      setCart((prev) => {
        if (prev.length) {
          const cartStoreId = products.find((entry) => entry.id === prev[0].productId)?.storeId;
          if (cartStoreId && product.storeId && cartStoreId !== product.storeId) {
            return [{ productId, quantity }];
          }
        }
        const existing = prev.find((item) => item.productId === productId);
        if (existing) {
          return prev.map((item) =>
            item.productId === productId ? { ...item, quantity: item.quantity + quantity } : item,
          );
        }
        return [...prev, { productId, quantity }];
      });
    },
    [products],
  );

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) return prev.filter((item) => item.productId !== productId);
      const existing = prev.find((item) => item.productId === productId);
      if (!existing) return [...prev, { productId, quantity }];
      return prev.map((item) => (item.productId === productId ? { ...item, quantity } : item));
    });
  }, []);

  const toggleFavorite = useCallback((productId: string) => {
    setFavorites((prev) => (prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]));
  }, []);

  const applyPromo = useCallback(async (code: string) => {
    try {
      const promo = await validatePromo(code);
      setActivePromo(promo);
      return true;
    } catch {
      setActivePromo(null);
      return false;
    }
  }, []);

  const clearPromo = useCallback(() => setActivePromo(null), []);

  const refreshAddresses = useCallback(async () => {
    const nextAddresses = await loadMyAddresses();
    setAddresses(nextAddresses);
    setSelectedAddressId((prev) =>
      nextAddresses.some((item) => item.id === prev) ? prev : nextAddresses[0]?.id ?? '',
    );
    return nextAddresses;
  }, []);

  const addAddress = useCallback(async (input: { label: string; line: string }) => {
    const created = await createAddress({ ...input, isDefault: true });
    const nextAddresses = await loadMyAddresses().catch(() => {
      setAddresses((prev) => {
        const without = prev.filter((item) => item.id !== created.id);
        return [created, ...without];
      });
      return [created];
    });
    setAddresses(nextAddresses.length ? nextAddresses : [created]);
    setSelectedAddressId(created.id);
    return created;
  }, []);

  const removeAddress = useCallback(async (id: string) => {
    await deleteAddress(id);
    setAddresses((prev) => {
      const next = prev.filter((item) => item.id !== id);
      setSelectedAddressId((selected) => (selected === id ? next[0]?.id ?? '' : selected));
      return next;
    });
  }, []);

  const replaceCart = useCallback((items: CartItem[]) => {
    setCart(items);
  }, []);

  const placeOrder = useCallback(async () => {
    const lines = cart
      .map((item) => ({ product: products.find((entry) => entry.id === item.productId), quantity: item.quantity }))
      .filter((line): line is { product: Product; quantity: number } => Boolean(line.product?.storeId));
    if (lines.length === 0) throw new Error('Cart is empty');
    const storeId = lines[0].product.storeId;
    if (!storeId || lines.some((line) => line.product.storeId !== storeId)) {
      throw new Error('Checkout one store at a time');
    }
    const payment = paymentMethods.find((method) => method.id === selectedPaymentId);
    const address = addresses.find((item) => item.id === selectedAddressId);
    if (selectedDeliveryId !== 'pickup' && !address?.line?.trim()) {
      throw new Error('Add a delivery address before placing the order');
    }
    const store = stores.find((item) => item.id === storeId);
    const placed = await placeCustomerOrder({
      storeId,
      deliveryType: selectedDeliveryId,
      paymentLabel: payment?.label ?? 'Card',
      addressLine: selectedDeliveryId === 'pickup' ? store?.address ?? '' : address?.line ?? '',
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    });
    const tracking = mobileConfig.tracking;
    const etaMinutes =
      selectedDeliveryId === 'express'
        ? tracking.expressEtaMinutes
        : selectedDeliveryId === 'pickup'
          ? tracking.pickupEtaMinutes ?? 40
          : tracking.standardEtaMinutes;
    const order: Order = {
      id: placed.id,
      total: placed.total,
      itemCount: placed.itemCount,
      deliveryType: placed.deliveryType,
      paymentLabel: placed.paymentLabel,
      createdAt: placed.createdAt,
      storeName: store?.name,
      storeAddress: store?.address,
      openUntil: store?.openUntil,
      riderName: tracking.riderName,
      etaMinutes,
      distanceKm: tracking.defaultDistanceKm,
      productSubtotal: placed.productSubtotal,
      deliveryCharge: placed.deliveryCharge,
      serviceCharge: placed.serviceCharge,
      bfpCharge: placed.bfpCharge,
      discount: placed.discount,
      steps:
        selectedDeliveryId === 'pickup'
          ? [
              { id: 'confirmed', title: 'Order confirmed', timeLabel: 'Just now', completed: true },
              { id: 'packed', title: 'Preparing for pickup', timeLabel: '—', completed: false },
              { id: 'ready', title: 'Ready for pickup', timeLabel: '—', completed: false },
              { id: 'collected', title: 'Collected', timeLabel: '—', completed: false },
            ]
          : [
              { id: 'confirmed', title: 'Order confirmed', timeLabel: 'Just now', completed: true },
              { id: 'packed', title: 'Packed at pharmacy', timeLabel: '—', completed: false },
              { id: 'on_way', title: 'On the way', timeLabel: '—', completed: false },
              { id: 'delivered', title: 'Delivered', timeLabel: '—', completed: false },
            ],
    };
    setLastOrder(order);
    setOrderCount((count) => count + 1);
    setCart([]);
    setActivePromo(null);
    return order;
  }, [
    cart,
    products,
    selectedAddressId,
    selectedDeliveryId,
    selectedPaymentId,
    activePromo,
    addresses,
    paymentMethods,
    mobileConfig.tracking,
    prescriptionNumber,
    stores,
  ]);

  const updateLastOrderProgress = useCallback((distanceKm: number, etaMinutes: number, completedSteps: number) => {
    setLastOrder((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        distanceKm,
        etaMinutes,
        steps: prev.steps.map((step, index) => ({ ...step, completed: index < completedSteps })),
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      products,
      stores,
      selectedStoreId,
      selectedStore,
      setSelectedStoreId,
      catalogStatus,
      catalogError,
      user,
      orderCount,
      quote,
      cart,
      favorites,
      promoApplied,
      activePromo,
      mobileConfig,
      addresses,
      deliveryOptions,
      paymentMethods,
      selectedAddressId,
      selectedDeliveryId,
      selectedPaymentId,
      prescriptionNumber,
      quoteError,
      lastOrder,
      cartCount,
      subtotal,
      discount,
      total,
      storeSwitchMessage,
      getProduct,
      refreshCatalog,
      addToCart,
      removeFromCart,
      setQuantity,
      toggleFavorite,
      applyPromo,
      clearPromo,
      setSelectedAddressId,
      setSelectedDeliveryId,
      setSelectedPaymentId,
      setPrescriptionNumber,
      replaceCart,
      refreshAddresses,
      addAddress,
      removeAddress,
      placeOrder,
      updateLastOrderProgress,
    }),
    [
      products,
      stores,
      selectedStoreId,
      selectedStore,
      setSelectedStoreId,
      catalogStatus,
      catalogError,
      user,
      orderCount,
      quote,
      cart,
      favorites,
      promoApplied,
      activePromo,
      mobileConfig,
      addresses,
      deliveryOptions,
      paymentMethods,
      selectedAddressId,
      selectedDeliveryId,
      selectedPaymentId,
      prescriptionNumber,
      quoteError,
      lastOrder,
      cartCount,
      subtotal,
      discount,
      total,
      storeSwitchMessage,
      getProduct,
      refreshCatalog,
      addToCart,
      removeFromCart,
      setQuantity,
      toggleFavorite,
      applyPromo,
      clearPromo,
      replaceCart,
      refreshAddresses,
      addAddress,
      removeAddress,
      placeOrder,
      updateLastOrderProgress,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
