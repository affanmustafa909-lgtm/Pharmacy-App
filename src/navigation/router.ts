import {
  CommonActions,
  StackActions,
  createNavigationContainerRef,
} from '@react-navigation/native';

import type { RootStackParamList, TabParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

type Target =
  | { kind: 'tab'; screen: keyof TabParamList }
  | {
      kind: 'stack';
      name: Exclude<keyof RootStackParamList, 'Tabs'>;
      params?: RootStackParamList[Exclude<keyof RootStackParamList, 'Tabs'>];
    };

type AuthReturnTo = NonNullable<RootStackParamList['Auth']> extends { returnTo?: infer R } ? R : never;

const AUTH_RETURN_TO = new Set<string>([
  'Checkout',
  'Orders',
  'Addresses',
  'Reminders',
  'Prescriptions',
  'Notifications',
  'Pharmacies',
  'Profile',
  'Scan',
  'Tabs',
]);

function parseAuthReturnTo(raw: string | null): AuthReturnTo {
  if (raw && AUTH_RETURN_TO.has(raw)) return raw as AuthReturnTo;
  return 'Checkout';
}

function parse(path: string): Target {
  const [clean, query = ''] = path.split('?');
  const queryParams = new URLSearchParams(query);
  const product = clean.match(/^\/product\/([^/]+)/);
  if (product) {
    return { kind: 'stack', name: 'Product', params: { id: product[1] } };
  }
  if (clean === '/' || clean === '/(tabs)' || clean === '/(tabs)/index') {
    return { kind: 'tab', screen: 'index' };
  }
  if (clean === '/(tabs)/cart' || clean === '/cart') {
    return { kind: 'tab', screen: 'cart' };
  }
  if (clean === '/(tabs)/ai' || clean === '/ai') {
    return { kind: 'tab', screen: 'ai' };
  }
  if (clean === '/(tabs)/profile' || clean === '/profile') {
    return { kind: 'tab', screen: 'profile' };
  }
  if (clean === '/scan') return { kind: 'stack', name: 'Scan' };
  if (clean === '/search') return { kind: 'stack', name: 'Search' };
  if (clean === '/auth' || clean === '/login' || clean === '/signup') {
    return {
      kind: 'stack',
      name: 'Auth',
      params: {
        mode: clean === '/signup' ? 'signup' : 'signin',
        returnTo: parseAuthReturnTo(queryParams.get('returnTo')),
      },
    };
  }
  if (clean === '/checkout') return { kind: 'stack', name: 'Checkout' };
  if (clean === '/order-success') return { kind: 'stack', name: 'OrderSuccess' };
  if (clean === '/track-order') {
    return {
      kind: 'stack',
      name: 'TrackOrder',
      params: { orderId: queryParams.get('orderId') || undefined },
    };
  }
  if (clean === '/pharmacies') return { kind: 'stack', name: 'Pharmacies' };
  if (clean === '/reminders') return { kind: 'stack', name: 'Reminders' };
  if (clean === '/addresses') {
    return {
      kind: 'stack',
      name: 'Addresses',
      params: {
        completeId: queryParams.get('completeId') || undefined,
        returnTo: queryParams.get('returnTo') === 'Checkout' ? 'Checkout' : undefined,
      },
    };
  }
  if (clean === '/account-settings') return { kind: 'stack', name: 'AccountSettings' };
  if (clean === '/prescriptions') return { kind: 'stack', name: 'Prescriptions' };
  if (clean === '/notifications') return { kind: 'stack', name: 'Notifications' };
  if (clean === '/orders') return { kind: 'stack', name: 'Orders' };
  if (clean === '/receipt') {
    return {
      kind: 'stack',
      name: 'Receipt',
      params: { orderId: queryParams.get('orderId') || '' },
    };
  }
  return { kind: 'tab', screen: 'index' };
}

function run(path: string, mode: 'push' | 'replace') {
  if (!navigationRef.isReady()) return;
  const target = parse(path);

  if (target.kind === 'tab') {
    if (mode === 'replace') {
      navigationRef.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Tabs', params: { screen: target.screen } }],
        }),
      );
      return;
    }
    navigationRef.navigate('Tabs', { screen: target.screen });
    return;
  }

  if (mode === 'replace') {
    navigationRef.dispatch(StackActions.replace(target.name, target.params));
    return;
  }
  navigationRef.dispatch(StackActions.push(target.name, target.params));
}

export const router = {
  push(path: string) {
    run(path, 'push');
  },
  replace(path: string) {
    run(path, 'replace');
  },
  back() {
    if (navigationRef.isReady() && navigationRef.canGoBack()) {
      navigationRef.goBack();
    }
  },
  /** Leave stack screens (product/search) and open the cart tab without resetting the whole app. */
  toCart() {
    if (!navigationRef.isReady()) return;
    navigationRef.dispatch(
      CommonActions.navigate({
        name: 'Tabs',
        params: { screen: 'cart' },
      }),
    );
  },
};
