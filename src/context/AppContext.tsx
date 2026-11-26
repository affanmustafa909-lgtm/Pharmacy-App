import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  DEFAULT_MOBILE_CONFIG,
  DELIVERY_OPTIONS as FALLBACK_DELIVERY,
  PAYMENT_METHODS as FALLBACK_PAYMENTS,
} from '../data/dummy';
import {
  addFavorite,
  clearCustomerSession,
  createAddress,
  deleteAddress,
  hasAuthToken,
  loadCatalog,
  loadFavorites,
  loadMobileConfig,
  loadMyAddresses,
  loadMyOrders,
  loadNearbyStores,
  loadProfile,
  loadStores,
  loginCustomer,
  placeCheckout,
  planCheckout,
  registerCustomer,
  removeFavorite,
  setAuthToken,
  updateAddress,
  validatePromo,
  type ChargeQuote,
  type ProfileUser,
} from '../lib/api';
import { isAddressComplete } from '../lib/addressComplete';
import {
  clearStoredToken,
  loadPendingCheckout,
  loadStoredCart,
  loadStoredStoreId,
  loadStoredToken,
  mergeCarts,
  savePendingCheckout,
  saveStoredCart,
  saveStoredStoreId,
  saveStoredToken,
  type PendingCheckout,
} from '../lib/session';
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

function addressScore(address: Address) {
  let score = 0;
  if (address.isDefault) score += 4;
  if (address.recipientName?.trim()) score += 2;
  if (address.phone?.trim()) score += 2;
  if (address.houseNo?.trim()) score += 1;
  if (address.street?.trim()) score += 1;
  if (address.area?.trim()) score += 1;
  if (address.city?.trim()) score += 1;
  if (address.line?.trim()) score += 1;
  return score;
}

function pickAddressId(list: Address[], prev: string) {
  if (!list.length) return '';
  const current = list.find((item) => item.id === prev);
  if (current && addressScore(current) >= 8) return current.id;
  return [...list].sort((a, b) => addressScore(b) - addressScore(a))[0]?.id ?? '';
}

function sanitizePhone(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  const digits = trimmed.replace(/[^\d+]/g, '');
  if (digits.startsWith('+')) {
    return `+${digits.slice(1).replace(/\D/g, '')}`.slice(0, 24);
  }
  const only = digits.replace(/\D/g, '');
  return only ? `+${only}`.slice(0, 24) : '';
}

/** Fill missing structured fields so incomplete saved addresses still check out. */
function normalizeDeliveryAddress(
  address: Address,
  fallback: { name: string; phone: string },
): Address {
  const line = address.line.trim();
  const parts = line
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  const recipientName = address.recipientName.trim() || fallback.name.trim();
  const phone = sanitizePhone(address.phone) || sanitizePhone(fallback.phone);
  const houseNo = address.houseNo.trim() || 'N/A';
  const street = address.street.trim() || parts[0] || line || 'Address';
  let city = address.city.trim();
  let area = address.area.trim();
  if (!city && parts.length >= 2) {
    const last = parts[parts.length - 1];
    if (/^[A-Z]{2}$/i.test(last) && parts.length >= 3) {
      city = parts[parts.length - 2];
    } else {
      city = last.replace(/\s+[A-Z]{2}$/i, '').trim() || last;
    }
  }
  if (!area) area = 'Local area';
  if (!city) city = 'City';
  return {
    ...address,
    label: address.label?.trim() || 'Home',
    recipientName,
    phone,
    houseNo,
    street,
    area,
    city,
    landmark: address.landmark ?? '',
    deliveryInstructions: address.deliveryInstructions ?? '',
    line:
      line ||
      [houseNo !== 'N/A' ? houseNo : '', street, area, city].filter(Boolean).join(', '),
  };
}

type AppContextValue = {
  products: Product[];
  stores: Pharmacy[];
  selectedStoreId: string | null;
  selectedStore: Pharmacy | null;
  setSelectedStoreId: (id: string) => void;
  catalogStatus: 'loading' | 'ready' | 'error';
  catalogError: string;
  user: ProfileUser | null;
  isAuthenticated: boolean;
  authReady: boolean;
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
  pendingCheckout: PendingCheckout | null;
  getProduct: (productId: string) => Product | undefined;
  refreshCatalog: () => Promise<void>;
  addToCart: (productId: string, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  toggleFavorite: (productId: string) => Promise<void>;
  applyPromo: (code: string) => Promise<boolean>;
  clearPromo: () => void;
  setSelectedAddressId: (id: string) => void;
  setSelectedDeliveryId: (id: 'standard' | 'express' | 'pickup') => void;
  setSelectedPaymentId: (id: string) => void;
  setPrescriptionNumber: (number: string | null) => void;
  replaceCart: (items: CartItem[]) => void;
  refreshAddresses: () => Promise<Address[]>;
  addAddress: (input: Omit<Address, 'id' | 'line'> & { line?: string; isDefault?: boolean }) => Promise<Address>;
  editAddress: (
    id: string,
    input: Omit<Address, 'id' | 'line'> & { line?: string; isDefault?: boolean },
  ) => Promise<Address>;
  removeAddress: (id: string) => Promise<void>;
  placeOrder: (options?: {
    paymentConfirmed?: boolean;
    expectedTotal?: number;
    paymentTransactionId?: string;
  }) => Promise<Order>;
  updateLastOrderProgress: (distanceKm: number, etaMinutes: number, completedSteps: number) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; password: string; phone?: string; city?: string }) => Promise<void>;
  signOut: () => Promise<void>;
  beginCheckout: () => 'checkout' | 'auth';
  clearPendingCheckout: () => void;
  pickupName: string;
  pickupPhone: string;
  setPickupName: (value: string) => void;
  setPickupPhone: (value: string) => void;
  nearbyStores: Awaited<ReturnType<typeof loadNearbyStores>>['stores'];
  nearbyMessage: string | null;
  nearbyLoading: boolean;
  nearbyStatus: 'idle' | 'loading' | 'ready' | 'unavailable' | 'error';
  refreshNearbyStores: () => Promise<void>;
  checkoutPlan: Awaited<ReturnType<typeof planCheckout>> | null;
  refreshCheckoutPlan: () => Promise<void>;
  confirmSplit: boolean;
  setConfirmSplit: (value: boolean) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stores, setStores] = useState<Pharmacy[]>([]);
  const [selectedStoreId, setSelectedStoreIdState] = useState<string | null>(null);
  const [catalogStatus, setCatalogStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [catalogError, setCatalogError] = useState('');
  const [user, setUser] = useState<ProfileUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [orderCount, setOrderCount] = useState(0);
  const [quote, setQuote] = useState<ChargeQuote | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [activePromo, setActivePromo] = useState<PromoInfo | null>(null);
  const [mobileConfig, setMobileConfig] = useState<MobileConfig>(DEFAULT_MOBILE_CONFIG);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [pickupName, setPickupName] = useState('');
  const [pickupPhone, setPickupPhone] = useState('');
  const [confirmSplit, setConfirmSplit] = useState(false);
  const [checkoutPlan, setCheckoutPlan] = useState<Awaited<ReturnType<typeof planCheckout>> | null>(null);
  const [nearbyStores, setNearbyStores] = useState<
    Awaited<ReturnType<typeof loadNearbyStores>>['stores']
  >([]);
  const [nearbyMessage, setNearbyMessage] = useState<string | null>(null);
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const nearbyRequestId = useRef(0);
  const [selectedDeliveryId, setSelectedDeliveryId] = useState<'standard' | 'express' | 'pickup'>('express');
  const [prescriptionNumber, setPrescriptionNumber] = useState<string | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [storeSwitchMessage, setStoreSwitchMessage] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('cod');
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [pendingCheckout, setPendingCheckout] = useState<PendingCheckout | null>(null);
  const cartRef = useRef<CartItem[]>([]);
  const checkoutIdempotencyRef = useRef<string | null>(null);
  const selectedStore = stores.find((store) => store.id === selectedStoreId) ?? null;
  const isAuthenticated = Boolean(user && hasAuthToken());

  const deliveryOptions = mobileConfig.deliveryOptions?.length
    ? mobileConfig.deliveryOptions
    : FALLBACK_DELIVERY;
  const paymentMethods = useMemo(() => {
    const configured = mobileConfig.paymentMethods?.length
      ? mobileConfig.paymentMethods
      : FALLBACK_PAYMENTS;
    // Always show the TEST MODE checkout set in the app (ignore legacy Apple Pay / saved Visa).
    const hasSimCards = configured.some(
      (method) =>
        method.type === 'debit_card' ||
        method.type === 'credit_card' ||
        (method.type === 'card' && /test/i.test(method.detail || '')),
    );
    let methods = hasSimCards
      ? configured.filter((method) => method.type !== 'apple_pay')
      : [...FALLBACK_PAYMENTS];
    if (!methods.some((method) => method.type === 'cod' || method.id === 'cod')) {
      methods = [{ id: 'cod', type: 'cod', label: 'Cash on Delivery' }, ...methods];
    }
    if (!methods.some((method) => method.type === 'debit_card' || method.id === 'debit')) {
      methods.push({ id: 'debit', type: 'debit_card', label: 'Debit Card', detail: 'TEST MODE' });
    }
    if (!methods.some((method) => method.type === 'credit_card' || method.id === 'credit')) {
      methods.push({ id: 'credit', type: 'credit_card', label: 'Credit Card', detail: 'TEST MODE' });
    }
    return methods.map((method) =>
      method.type === 'debit_card' || method.type === 'credit_card'
        ? { ...method, detail: method.detail || 'TEST MODE' }
        : method,
    );
  }, [mobileConfig.paymentMethods]);
  const promoApplied = Boolean(activePromo);

  const nearbyStatus = useMemo(() => {
    if (selectedDeliveryId === 'pickup') return 'idle' as const;
    if (!selectedAddressId) return 'idle' as const;
    if (nearbyLoading) return 'loading' as const;
    if (nearbyStores.length > 0) return 'ready' as const;
    if (nearbyMessage && /could not|try again|failed/i.test(nearbyMessage)) return 'error' as const;
    if (nearbyMessage) return 'unavailable' as const;
    return 'idle' as const;
  }, [selectedDeliveryId, selectedAddressId, nearbyLoading, nearbyStores.length, nearbyMessage]);

  useEffect(() => {
    cartRef.current = cart;
    void saveStoredCart(cart);
  }, [cart]);

  useEffect(() => {
    void saveStoredStoreId(selectedStoreId);
  }, [selectedStoreId]);

  const hydrateAuthenticated = useCallback(async () => {
    const [nextUser, nextOrders, nextAddresses, nextFavorites] = await Promise.all([
      loadProfile().catch(() => null),
      loadMyOrders().catch(() => []),
      loadMyAddresses().catch(() => [] as Address[]),
      loadFavorites().catch(() => ({ productIds: [] as string[] })),
    ]);
    // Missing role must not wipe a valid session (older API payloads omitted it).
    if (!nextUser || (nextUser.role && nextUser.role !== 'CUSTOMER')) {
      clearCustomerSession();
      await clearStoredToken();
      setUser(null);
      setOrderCount(0);
      setFavorites([]);
      return null;
    }
    setUser(nextUser);
    setOrderCount(nextOrders.length);
    setFavorites(nextFavorites.productIds ?? []);
    if (nextAddresses.length) {
      setAddresses(nextAddresses);
      setSelectedAddressId((prev) => pickAddressId(nextAddresses, prev));
    }
    return nextUser;
  }, []);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [storedToken, storedCart, storedStoreId, pending] = await Promise.all([
          loadStoredToken(),
          loadStoredCart(),
          loadStoredStoreId(),
          loadPendingCheckout(),
        ]);
        if (cancel) return;
        if (storedCart.length) setCart(storedCart);
        if (pending) setPendingCheckout(pending);
        if (storedToken) setAuthToken(storedToken);

        const [nextStores, mobile] = await Promise.all([
          loadStores().catch(() => [] as Pharmacy[]),
          loadMobileConfig().catch(() => null),
        ]);
        if (cancel) return;
        setStores(nextStores);
        const firstStoreId =
          (storedStoreId && nextStores.some((store) => store.id === storedStoreId)
            ? storedStoreId
            : nextStores[0]?.id) ?? null;
        setSelectedStoreIdState(firstStoreId);
        const nextProducts = await loadCatalog(firstStoreId ? { storeId: firstStoreId } : undefined);
        if (cancel) return;
        setProducts(nextProducts);
        setCart((prev) =>
          prev.filter((item) => nextProducts.some((product) => product.id === item.productId && product.inStock)),
        );

        if (mobile) {
          setMobileConfig(mobile.config);
          const nextPayments = mobile.config.paymentMethods?.length
            ? mobile.config.paymentMethods
            : FALLBACK_PAYMENTS;
          setSelectedPaymentId((prev) =>
            nextPayments.some((method) => method.id === prev) ? prev : nextPayments[0].id,
          );
          const nextDelivery =
            mobile.config.deliveryOptions?.find((option) => option.highlighted)?.id ??
            mobile.config.deliveryOptions?.[0]?.id ??
            'express';
          setSelectedDeliveryId(nextDelivery);
        }

        if (storedToken) {
          await hydrateAuthenticated();
        }
        if (cancel) return;
        setCatalogStatus('ready');
        setCatalogError('');
      } catch (error: unknown) {
        if (cancel) return;
        setCatalogStatus('error');
        setCatalogError(error instanceof Error ? error.message : 'Could not load medicines');
      } finally {
        if (!cancel) setAuthReady(true);
      }
    })();
    return () => {
      cancel = true;
    };
  }, [hydrateAuthenticated]);

  const getProduct = useCallback(
    (productId: string) => products.find((product) => product.id === productId),
    [products],
  );

  const refreshCatalog = useCallback(async () => {
    try {
      const [nextStores, mobile] = await Promise.all([
        loadStores().catch(() => [] as Pharmacy[]),
        loadMobileConfig().catch(() => null),
      ]);
      setStores(nextStores);
      const storeId =
        selectedStoreId && nextStores.some((store) => store.id === selectedStoreId)
          ? selectedStoreId
          : nextStores[0]?.id ?? null;
      if (storeId !== selectedStoreId) setSelectedStoreIdState(storeId);
      const nextProducts = await loadCatalog(storeId ? { storeId } : undefined);
      setProducts(nextProducts);
      setCart((prev) =>
        prev.filter((item) => nextProducts.some((product) => product.id === item.productId && product.inStock)),
      );
      if (mobile) setMobileConfig(mobile.config);
      if (hasAuthToken()) {
        const [nextOrders, nextAddresses] = await Promise.all([
          loadMyOrders().catch(() => []),
          loadMyAddresses().catch(() => null),
        ]);
        setOrderCount(nextOrders.length);
        if (nextAddresses?.length) {
          setAddresses(nextAddresses);
          setSelectedAddressId((prev) => pickAddressId(nextAddresses, prev));
        }
      }
      setCatalogStatus('ready');
      setCatalogError('');
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
    if (!isAuthenticated || catalogStatus !== 'ready' || cart.length === 0) {
      if (!isAuthenticated) setQuote(null);
      if (cart.length === 0) {
        setQuote(null);
        setQuoteError('');
        setCheckoutPlan(null);
      }
      return;
    }
    if (selectedDeliveryId !== 'pickup' && !selectedAddressId) {
      setQuote(null);
      setCheckoutPlan(null);
      setQuoteError('Add a delivery address to see charges');
      return;
    }
    const lines = cart
      .map((item) => ({ product: products.find((entry) => entry.id === item.productId), quantity: item.quantity }))
      .filter((line): line is { product: Product; quantity: number } => Boolean(line.product?.storeId));
    if (lines.length !== cart.length) return;
    let cancel = false;
    void planCheckout({
      deliveryType: selectedDeliveryId,
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      addressId: selectedDeliveryId === 'pickup' ? undefined : selectedAddressId || undefined,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
    })
      .then((plan) => {
        if (cancel) return;
        setCheckoutPlan(plan);
        const first = plan.stores[0];
        if (!first) {
          setQuote(null);
          return;
        }
        setQuote({
          productSubtotal: plan.stores.reduce((sum, row) => sum + row.productSubtotal, 0),
          deliveryCharge: plan.stores.reduce((sum, row) => sum + row.deliveryCharge, 0),
          serviceCharge: plan.stores.reduce((sum, row) => sum + row.serviceCharge, 0),
          bfpCharge: plan.stores.reduce((sum, row) => sum + row.bfpCharge, 0),
          discount: plan.stores.reduce((sum, row) => sum + row.discount, 0),
          total: plan.combinedTotal,
          etaMinutes: first.etaMinutes,
          storeName: plan.stores.map((row) => row.storeName).join(' + '),
          requiresPrescription: false,
        } as ChargeQuote);
        setQuoteError(plan.split ? plan.message ?? '' : '');
      })
      .catch((error: unknown) => {
        if (!cancel) {
          setQuote(null);
          setCheckoutPlan(null);
          setQuoteError(error instanceof Error ? error.message : 'Could not calculate charges');
        }
      });
    return () => {
      cancel = true;
    };
  }, [
    cart,
    products,
    selectedDeliveryId,
    selectedAddressId,
    catalogStatus,
    activePromo,
    prescriptionNumber,
    isAuthenticated,
  ]);

  const addToCart = useCallback(
    (productId: string, quantity = 1) => {
      const product = products.find((entry) => entry.id === productId);
      if (!product?.inStock) return;
      setCart((prev) => {
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

  const toggleFavorite = useCallback(async (productId: string) => {
    const liked = favorites.includes(productId);
    setFavorites((prev) => (liked ? prev.filter((id) => id !== productId) : [...prev, productId]));
    if (!hasAuthToken()) return;
    try {
      if (liked) await removeFavorite(productId);
      else await addFavorite(productId);
    } catch {
      setFavorites((prev) => (liked ? [...prev, productId] : prev.filter((id) => id !== productId)));
      throw new Error('Could not update favorites. Sign in and try again.');
    }
  }, [favorites]);

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
    setSelectedAddressId((prev) => pickAddressId(nextAddresses, prev));
    return nextAddresses;
  }, []);

  const editAddress = useCallback(
    async (id: string, input: Omit<Address, 'id' | 'line'> & { line?: string; isDefault?: boolean }) => {
      const updated = await updateAddress(id, { ...input, isDefault: input.isDefault ?? true });
      const nextAddresses = await loadMyAddresses().catch(() => {
        setAddresses((prev) => prev.map((item) => (item.id === id ? updated : item)));
        return [updated];
      });
      setAddresses(nextAddresses.length ? nextAddresses : [updated]);
      if (updated.isDefault) setSelectedAddressId(updated.id);
      return updated;
    },
    [],
  );

  const addAddress = useCallback(
    async (input: Omit<Address, 'id' | 'line'> & { line?: string; isDefault?: boolean }) => {
      const created = await createAddress({ ...input, isDefault: input.isDefault ?? true });
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
    },
    [],
  );

  const refreshNearbyStores = useCallback(async () => {
    const address = addresses.find((item) => item.id === selectedAddressId);
    if (!address || selectedDeliveryId === 'pickup') {
      setNearbyStores([]);
      setNearbyMessage(null);
      setNearbyLoading(false);
      return;
    }
    const requestId = ++nearbyRequestId.current;
    setNearbyLoading(true);
    setNearbyMessage(null);
    const skus = cart
      .map((item) => {
        const product = products.find((entry) => entry.id === item.productId);
        return product?.sku ? { sku: product.sku, quantity: item.quantity } : null;
      })
      .filter((row): row is { sku: string; quantity: number } => Boolean(row));
    try {
      const result = await loadNearbyStores({
        address,
        deliveryType: selectedDeliveryId,
        skus,
      });
      if (requestId !== nearbyRequestId.current) return;
      setNearbyStores(result.stores);
      setNearbyMessage(result.message);
    } catch (error) {
      if (requestId !== nearbyRequestId.current) return;
      setNearbyStores([]);
      const detail = error instanceof Error ? error.message : '';
      setNearbyMessage(
        detail && !/timeout|network request failed/i.test(detail)
          ? detail
          : 'Could not check delivery coverage. Try again.',
      );
    } finally {
      if (requestId === nearbyRequestId.current) {
        setNearbyLoading(false);
      }
    }
  }, [addresses, selectedAddressId, selectedDeliveryId, cart, products]);

  const refreshCheckoutPlan = useCallback(async () => {
    if (!isAuthenticated || cart.length === 0) {
      setCheckoutPlan(null);
      return;
    }
    const plan = await planCheckout({
      deliveryType: selectedDeliveryId,
      items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      addressId: selectedDeliveryId === 'pickup' ? undefined : selectedAddressId || undefined,
    });
    setCheckoutPlan(plan);
    if (!plan.split) setConfirmSplit(false);
  }, [isAuthenticated, cart, selectedDeliveryId, selectedAddressId, activePromo?.code, prescriptionNumber]);

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

  const afterAuth = useCallback(async () => {
    const guestCart = cartRef.current;
    await hydrateAuthenticated();
    await refreshCatalog();
    setCart((prev) => {
      const merged = mergeCarts(guestCart, prev);
      return merged.filter((item) =>
        products.some((product) => product.id === item.productId && product.inStock),
      ).length
        ? mergeCarts(guestCart, prev)
        : mergeCarts(guestCart, []);
    });
    // Recheck against latest catalog after refresh
    const latest = await loadCatalog(selectedStoreId ? { storeId: selectedStoreId } : undefined).catch(() => products);
    setProducts(latest);
    setCart((prev) => {
      const bySku = new Map<string, number>();
      for (const item of prev) {
        const product = latest.find((entry) => entry.id === item.productId) ?? products.find((entry) => entry.id === item.productId);
        if (!product?.sku) continue;
        bySku.set(product.sku, (bySku.get(product.sku) ?? 0) + item.quantity);
      }
      const remapped: CartItem[] = [];
      for (const [sku, quantity] of bySku) {
        const match = latest.find((product) => product.sku === sku && product.inStock);
        if (match) remapped.push({ productId: match.id, quantity });
      }
      return remapped;
    });
  }, [hydrateAuthenticated, refreshCatalog, products, selectedStoreId]);

  const clearAccountLocalState = useCallback(
    async (options?: { keepPendingCheckout?: boolean; keepCart?: boolean }) => {
      clearCustomerSession();
      setUser(null);
      setOrderCount(0);
      setFavorites([]);
      setAddresses([]);
      setSelectedAddressId('');
      setPickupName('');
      setPickupPhone('');
      setCheckoutPlan(null);
      setNearbyStores([]);
      setNearbyMessage(null);
      setConfirmSplit(false);
      setQuote(null);
      setQuoteError('');
      setLastOrder(null);
      setActivePromo(null);
      setPrescriptionNumber(null);
      checkoutIdempotencyRef.current = null;
      if (!options?.keepCart) {
        setCart([]);
        await saveStoredCart([]);
      }
      if (!options?.keepPendingCheckout) {
        setPendingCheckout(null);
        await savePendingCheckout(null);
      }
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string) => {
      const storeId = pendingCheckout?.storeId || selectedStoreId || null;
      // Clear prior account records; keep guest cart + checkout intent for this session.
      await clearAccountLocalState({ keepPendingCheckout: true, keepCart: true });
      const payload = await loginCustomer(email, password, storeId);
      await saveStoredToken(payload.token);
      await afterAuth();
      setUser((prev) => prev ?? payload.user);
    },
    [afterAuth, clearAccountLocalState, pendingCheckout?.storeId, selectedStoreId],
  );

  const signUp = useCallback(
    async (input: { name: string; email: string; password: string; phone?: string; city?: string }) => {
      const storeId = pendingCheckout?.storeId || selectedStoreId || null;
      await clearAccountLocalState({ keepPendingCheckout: true, keepCart: true });
      const payload = await registerCustomer({ ...input, storeId });
      await saveStoredToken(payload.token);
      await afterAuth();
      setUser((prev) => prev ?? payload.user);
    },
    [afterAuth, clearAccountLocalState, pendingCheckout?.storeId, selectedStoreId],
  );

  const signOut = useCallback(async () => {
    await clearAccountLocalState();
    await clearStoredToken();
  }, [clearAccountLocalState]);

  const beginCheckout = useCallback(() => {
    if (isAuthenticated) return 'checkout' as const;
    const pending: PendingCheckout = { action: 'checkout', storeId: selectedStoreId };
    setPendingCheckout(pending);
    void savePendingCheckout(pending);
    return 'auth' as const;
  }, [isAuthenticated, selectedStoreId]);

  const clearPendingCheckout = useCallback(() => {
    setPendingCheckout(null);
    void savePendingCheckout(null);
  }, []);

  const placeOrder = useCallback(async (options?: {
    paymentConfirmed?: boolean;
    expectedTotal?: number;
    paymentTransactionId?: string;
  }) => {
    if (!isAuthenticated) throw new Error('Sign in to place this order');
    const lines = cart
      .map((item) => ({ product: products.find((entry) => entry.id === item.productId), quantity: item.quantity }))
      .filter((line): line is { product: Product; quantity: number } => Boolean(line.product?.storeId));
    if (lines.length === 0) throw new Error('Cart is empty');

    const payment = paymentMethods.find((method) => method.id === selectedPaymentId);
    const isCod = payment?.type === 'cod' || payment?.id === 'cod';
    const isCard =
      payment?.type === 'card' ||
      payment?.type === 'debit_card' ||
      payment?.type === 'credit_card';
    if (!isCod && !options?.paymentConfirmed && !options?.paymentTransactionId) {
      throw Object.assign(new Error(isCard ? 'Complete card payment to continue' : 'Confirm payment to continue'), {
        code: isCard ? 'CARD_PAYMENT_REQUIRED' : 'PAYMENT_CONFIRM_REQUIRED',
      });
    }
    const fallbackContact = {
      name: user?.name?.trim() || pickupName.trim() || 'Customer',
      phone: sanitizePhone(user?.phone || '') || sanitizePhone(pickupPhone) || '',
    };
    const rawAddress = addresses.find((item) => item.id === selectedAddressId);
    if (selectedDeliveryId !== 'pickup' && !rawAddress) {
      throw new Error('Add a delivery address before placing the order');
    }
    if (selectedDeliveryId !== 'pickup' && !isAddressComplete(rawAddress)) {
      throw Object.assign(new Error('Complete the delivery address before placing the order'), {
        code: 'ADDRESS_INCOMPLETE',
      });
    }
    const address =
      selectedDeliveryId === 'pickup' || !rawAddress
        ? rawAddress
        : normalizeDeliveryAddress(rawAddress, fallbackContact);
    const name =
      selectedDeliveryId === 'pickup'
        ? pickupName.trim() || fallbackContact.name
        : address?.recipientName?.trim() || fallbackContact.name;
    const phone =
      selectedDeliveryId === 'pickup'
        ? sanitizePhone(pickupPhone) || fallbackContact.phone
        : address?.phone?.trim() || fallbackContact.phone;
    if (!name || !phone) {
      throw new Error(
        selectedDeliveryId === 'pickup'
          ? 'Enter your name and phone for pickup'
          : 'Delivery address needs recipient name and phone',
      );
    }
    if (sanitizePhone(phone).replace(/\D/g, '').length < 8) {
      throw new Error('Enter a valid phone number (8+ digits) before placing the order');
    }
    if (selectedDeliveryId !== 'pickup') {
      if (!address?.line?.trim() && !address?.street?.trim()) {
        throw new Error('Add a delivery address before placing the order');
      }
    }

    const plan = await planCheckout({
      deliveryType: selectedDeliveryId,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      addressId: selectedDeliveryId === 'pickup' ? undefined : selectedAddressId || undefined,
    });
    setCheckoutPlan(plan);
    setQuote({
      productSubtotal: plan.stores.reduce((sum, entry) => sum + entry.productSubtotal, 0),
      deliveryCharge: plan.stores.reduce((sum, entry) => sum + entry.deliveryCharge, 0),
      serviceCharge: plan.stores.reduce((sum, entry) => sum + entry.serviceCharge, 0),
      bfpCharge: plan.stores.reduce((sum, entry) => sum + entry.bfpCharge, 0),
      discount: plan.stores.reduce((sum, entry) => sum + entry.discount, 0),
      total: plan.combinedTotal,
      etaMinutes: plan.stores[0]?.etaMinutes,
      storeName: plan.stores.map((entry) => entry.storeName).join(' + '),
      requiresPrescription: false,
    } as ChargeQuote);
    if (plan.split && !confirmSplit) {
      throw new Error(plan.message || 'Confirm the multi-store split before placing orders');
    }
    if (
      options?.expectedTotal != null &&
      Math.abs(plan.combinedTotal - options.expectedTotal) > 0.01
    ) {
      throw Object.assign(
        new Error(
          `Total updated to $${plan.combinedTotal.toFixed(2)}. Confirm the new amount to place the order.`,
        ),
        { code: 'TOTAL_CHANGED', revisedTotal: plan.combinedTotal, plan },
      );
    }

    const paymentStatus: 'paid' | 'unpaid' = isCod ? 'unpaid' : 'paid';
    // Reuse one idempotency key across taps/retries for the same cart snapshot.
    const cartFingerprint = lines
      .map((line) => `${line.product.id}:${line.quantity}`)
      .sort()
      .join('|');
    const fingerprint = `${selectedDeliveryId}|${selectedAddressId}|${selectedPaymentId}|${cartFingerprint}|${activePromo?.code || ''}|${options?.paymentTransactionId || ''}`;
    if (!checkoutIdempotencyRef.current || !checkoutIdempotencyRef.current.startsWith(`${fingerprint}::`)) {
      checkoutIdempotencyRef.current = `${fingerprint}::chk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
    const idempotencyKey = checkoutIdempotencyRef.current.split('::')[1];
    const placedGroup = await placeCheckout({
      deliveryType: selectedDeliveryId,
      paymentLabel: payment?.label ?? 'Cash on Delivery',
      paymentStatus,
      paymentTransactionId: options?.paymentTransactionId,
      items: lines.map((line) => ({ productId: line.product.id, quantity: line.quantity })),
      idempotencyKey,
      confirmSplit: plan.split ? true : undefined,
      promoCode: activePromo?.code,
      prescriptionNumber: prescriptionNumber || undefined,
      addressId: selectedDeliveryId === 'pickup' ? undefined : selectedAddressId || undefined,
      address: selectedDeliveryId === 'pickup' ? undefined : address,
      pickupContact:
        selectedDeliveryId === 'pickup' ? { recipientName: name, phone } : undefined,
      recipientName: name,
      recipientPhone: phone,
      addressLine: address?.line,
    });

    const primary = placedGroup.orders[0];
    const store = stores.find((item) => item.id === primary?.storeId);
    const tracking = mobileConfig.tracking;
    const etaMinutes =
      selectedDeliveryId === 'express'
        ? tracking.expressEtaMinutes
        : selectedDeliveryId === 'pickup'
          ? tracking.pickupEtaMinutes ?? 40
          : tracking.standardEtaMinutes;
    const productSubtotal =
      placedGroup.orders.reduce((sum, entry) => sum + (entry.productSubtotal ?? 0), 0) ||
      plan.stores.reduce((sum, entry) => sum + entry.productSubtotal, 0);
    const deliveryCharge =
      placedGroup.orders.reduce((sum, entry) => sum + (entry.deliveryCharge ?? 0), 0) ||
      plan.stores.reduce((sum, entry) => sum + entry.deliveryCharge, 0);
    const serviceCharge =
      placedGroup.orders.reduce((sum, entry) => sum + (entry.serviceCharge ?? 0), 0) ||
      plan.stores.reduce((sum, entry) => sum + entry.serviceCharge, 0);
    const bfpCharge =
      placedGroup.orders.reduce((sum, entry) => sum + (entry.bfpCharge ?? 0), 0) ||
      plan.stores.reduce((sum, entry) => sum + entry.bfpCharge, 0);
    const discount =
      placedGroup.orders.reduce((sum, entry) => sum + (entry.discount ?? 0), 0) ||
      plan.stores.reduce((sum, entry) => sum + entry.discount, 0);
    const order: Order = {
      id: primary.id,
      total: placedGroup.combinedTotal,
      itemCount: placedGroup.orders.reduce((sum, entry) => sum + entry.itemCount, 0),
      deliveryType: selectedDeliveryId,
      paymentLabel: primary.paymentLabel || payment?.label || 'Cash on Delivery',
      paymentStatus: (primary.paymentStatus as 'paid' | 'unpaid') || paymentStatus,
      transactionId: primary.transactionId ?? placedGroup.transactionId ?? null,
      createdAt: new Date().toISOString(),
      status: 'placed',
      storeName:
        placedGroup.orders.length > 1
          ? placedGroup.orders.map((entry) => entry.storeName).join(' + ')
          : primary.storeName || store?.name,
      storeAddress: store?.address,
      openUntil: store?.openUntil,
      addressLine:
        selectedDeliveryId === 'pickup' ? store?.address || primary.addressLine : primary.addressLine,
      recipientName: primary.recipientName || name,
      recipientPhone: primary.recipientPhone || phone,
      riderName: primary.riderName ?? null,
      riderPhone: primary.riderPhone ?? null,
      waitingForRider: selectedDeliveryId !== 'pickup' && !primary.riderName,
      etaMinutes,
      distanceKm: tracking.defaultDistanceKm,
      productSubtotal,
      deliveryCharge,
      serviceCharge,
      bfpCharge,
      discount,
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
              {
                id: 'packed',
                title: primary.riderName ? 'Rider assigned' : 'Waiting for rider assignment',
                timeLabel: primary.riderName ? 'Just now' : '—',
                completed: Boolean(primary.riderName),
              },
              { id: 'on_way', title: 'On the way', timeLabel: '—', completed: false },
              { id: 'delivered', title: 'Delivered', timeLabel: '—', completed: false },
            ],
    };
    setLastOrder(order);
    setOrderCount((count) => count + 1);
    setCart([]);
    setActivePromo(null);
    checkoutIdempotencyRef.current = null;
    clearPendingCheckout();
    return order;
  }, [
    isAuthenticated,
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
    clearPendingCheckout,
    pickupName,
    pickupPhone,
    confirmSplit,
    user?.name,
    user?.phone,
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
      isAuthenticated,
      authReady,
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
      pendingCheckout,
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
      editAddress,
      removeAddress,
      placeOrder,
      updateLastOrderProgress,
      signIn,
      signUp,
      signOut,
      beginCheckout,
      clearPendingCheckout,
      pickupName,
      pickupPhone,
      setPickupName,
      setPickupPhone,
      nearbyStores,
      nearbyMessage,
      nearbyLoading,
      nearbyStatus,
      refreshNearbyStores,
      checkoutPlan,
      refreshCheckoutPlan,
      confirmSplit,
      setConfirmSplit,
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
      isAuthenticated,
      authReady,
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
      pendingCheckout,
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
      editAddress,
      removeAddress,
      placeOrder,
      updateLastOrderProgress,
      signIn,
      signUp,
      signOut,
      beginCheckout,
      clearPendingCheckout,
      pickupName,
      pickupPhone,
      nearbyStores,
      nearbyMessage,
      nearbyLoading,
      nearbyStatus,
      refreshNearbyStores,
      checkoutPlan,
      refreshCheckoutPlan,
      confirmSplit,
    ],
  );

  useEffect(() => {
    if (!paymentMethods.some((method) => method.id === selectedPaymentId)) {
      setSelectedPaymentId(paymentMethods[0]?.id ?? 'cod');
    }
  }, [paymentMethods, selectedPaymentId]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
