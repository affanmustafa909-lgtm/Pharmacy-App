import type { Address } from '../types';

/** True when a saved address has every field required for home delivery + coverage. */
export function isAddressComplete(address: Address | null | undefined): boolean {
  if (!address) return false;
  const phoneDigits = String(address.phone ?? '').replace(/\D/g, '');
  return Boolean(
    address.recipientName?.trim() &&
      phoneDigits.length >= 8 &&
      address.houseNo?.trim() &&
      address.street?.trim() &&
      address.area?.trim() &&
      address.city?.trim() &&
      address.lat != null &&
      address.lng != null &&
      Number.isFinite(address.lat) &&
      Number.isFinite(address.lng),
  );
}

export function missingAddressFields(address: Address | null | undefined): string[] {
  if (!address) return ['address'];
  const missing: string[] = [];
  if (!address.recipientName?.trim()) missing.push('recipient name');
  if (String(address.phone ?? '').replace(/\D/g, '').length < 8) missing.push('phone');
  if (!address.houseNo?.trim()) missing.push('house / flat');
  if (!address.street?.trim()) missing.push('street');
  if (!address.area?.trim()) missing.push('area');
  if (!address.city?.trim()) missing.push('city');
  if (address.lat == null || address.lng == null) missing.push('map pin');
  return missing;
}
