import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CartItem } from '../types';

const TOKEN_KEY = 'hera.customer.token';
const CART_KEY = 'hera.customer.cart';
const STORE_KEY = 'hera.customer.storeId';
const PENDING_KEY = 'hera.customer.pendingCheckout';
const PENDING_PHOTO_KEY = 'hera.customer.pendingPhoto';

export type PendingCheckout = {
  action: 'checkout' | 'buy_now';
  storeId?: string | null;
};

export type PendingPhoto = {
  imageUri: string;
  fileName?: string;
  mimeType?: string;
  uploadType: 'medicine_packaging' | 'prescription';
  medicineName?: string;
  strength?: string;
  form?: string;
  packSize?: string;
  customerNote?: string;
  scannedText?: string;
  storeId?: string | null;
  phase?: string;
};

export async function loadStoredToken() {
  return (await AsyncStorage.getItem(TOKEN_KEY)) ?? '';
}

export async function saveStoredToken(token: string) {
  if (!token) {
    await AsyncStorage.removeItem(TOKEN_KEY);
    return;
  }
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearStoredToken() {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function loadStoredCart(): Promise<CartItem[]> {
  try {
    const raw = await AsyncStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) => typeof item?.productId === 'string' && Number.isFinite(item.quantity) && item.quantity > 0,
    );
  } catch {
    return [];
  }
}

export async function saveStoredCart(cart: CartItem[]) {
  await AsyncStorage.setItem(CART_KEY, JSON.stringify(cart));
}

export async function loadStoredStoreId() {
  return AsyncStorage.getItem(STORE_KEY);
}

export async function saveStoredStoreId(storeId: string | null) {
  if (!storeId) {
    await AsyncStorage.removeItem(STORE_KEY);
    return;
  }
  await AsyncStorage.setItem(STORE_KEY, storeId);
}

export async function loadPendingCheckout(): Promise<PendingCheckout | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingCheckout;
  } catch {
    return null;
  }
}

export async function savePendingCheckout(pending: PendingCheckout | null) {
  if (!pending) {
    await AsyncStorage.removeItem(PENDING_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}

export async function loadPendingPhoto(): Promise<PendingPhoto | null> {
  try {
    const raw = await AsyncStorage.getItem(PENDING_PHOTO_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingPhoto;
  } catch {
    return null;
  }
}

export async function savePendingPhoto(pending: PendingPhoto | null) {
  if (!pending) {
    await AsyncStorage.removeItem(PENDING_PHOTO_KEY);
    return;
  }
  await AsyncStorage.setItem(PENDING_PHOTO_KEY, JSON.stringify(pending));
}

/** Merge guest cart into an existing cart by productId without duplicating lines. */
export function mergeCarts(guest: CartItem[], existing: CartItem[]): CartItem[] {
  const map = new Map<string, number>();
  for (const item of existing) map.set(item.productId, item.quantity);
  for (const item of guest) {
    map.set(item.productId, (map.get(item.productId) ?? 0) + item.quantity);
  }
  return Array.from(map.entries()).map(([productId, quantity]) => ({ productId, quantity }));
}
