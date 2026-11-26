import { Platform } from 'react-native';

export type AuthProviders = {
  password: boolean;
  google: boolean;
  apple: boolean;
};

const DEFAULT_PROVIDERS: AuthProviders = {
  password: true,
  google: false,
  apple: false,
};

function apiBase() {
  return Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
}

export async function loadAuthProviders(): Promise<AuthProviders> {
  try {
    const response = await fetch(`${apiBase()}/auth/providers`, { method: 'GET' });
    if (!response.ok) return DEFAULT_PROVIDERS;
    const payload = (await response.json()) as { providers?: Partial<AuthProviders> };
    const providers = payload.providers ?? {};
    return {
      password: providers.password !== false,
      google: Boolean(providers.google),
      // Apple Sign In is iOS-only in practice for this app.
      apple: Boolean(providers.apple) && Platform.OS === 'ios',
    };
  } catch {
    return DEFAULT_PROVIDERS;
  }
}
