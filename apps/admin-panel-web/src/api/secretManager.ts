import http from './http';
import { useVaultStore } from '@/stores/vaultStore';

const BASE = '/secret-manager';

// Attach the vault session token as X-Vault-Token (gateway forwards it to admin-service).
function vaultConfig() {
  const token = useVaultStore.getState().vaultToken;
  return token ? { headers: { 'X-Vault-Token': token } } : {};
}

export interface VaultStatus {
  configured: boolean;
  totpEnabled: boolean;
  locked: boolean;
  lockedUntil: string | null;
}

export interface SecretView {
  key: string;
  label: string;
  category: string;
  isSecret: boolean;
  isSet: boolean;
  masked: string | null;
  validationStatus: 'unknown' | 'valid' | 'invalid';
  lastValidatedAt: string | null;
  updatedAt: string | null;
}

export type SecretGroups = Record<string, SecretView[]>;

// Note: the global http interceptor returns the response body and the backend ResponseInterceptor
// wraps payloads as `{ data, message }`, so `await http.x()` resolves to the envelope and the
// payload is at `.data`. At the type level axios reports `AxiosResponse<T>`, whose `.data` is `T`,
// so we set the generic `T` to the PAYLOAD type and read a single `.data`.
export const secretManagerApi = {
  status: async (): Promise<VaultStatus> => (await http.get<VaultStatus>(`${BASE}/status`)).data,

  setup: async (body: { passphrase: string; recoveryEmail: string; recoveryMobile: string }) =>
    (await http.post<{ otpauthUrl: string; secret: string }>(`${BASE}/setup`, body)).data,

  confirmTotp: async (totp: string) =>
    (await http.post<{ enabled: boolean }>(`${BASE}/setup/confirm`, { totp })).data,

  unlock: async (body: { passphrase: string; totp: string }) =>
    (await http.post<{ vaultToken: string; expiresIn: number }>(`${BASE}/unlock`, body)).data,

  lock: async () => (await http.post(`${BASE}/lock`, {}, vaultConfig())).data,

  changePassphrase: async (body: {
    currentPassphrase: string;
    newPassphrase: string;
    totp: string;
  }) => (await http.post(`${BASE}/change-passphrase`, body, vaultConfig())).data,

  requestRecovery: async () =>
    (
      await http.post<{
        email: string;
        mobile: string;
        // DEV-ONLY (NODE_ENV !== production): OTPs returned so the flow is testable.
        devEmailOtp?: string;
        devMobileOtp?: string;
      }>(`${BASE}/recovery/request`, {})
    ).data,

  confirmRecovery: async (body: { emailOtp: string; mobileOtp: string; newPassphrase: string }) =>
    (await http.post(`${BASE}/recovery/confirm`, body)).data,

  listSecrets: async (): Promise<SecretGroups> =>
    (await http.get<SecretGroups>(`${BASE}/secrets`, vaultConfig())).data,

  updateSecret: async (key: string, value: string) =>
    (await http.put(`${BASE}/secrets/${key}`, { value }, vaultConfig())).data,

  revealSecret: async (key: string, totp: string): Promise<{ key: string; value: string }> =>
    (
      await http.post<{ key: string; value: string }>(
        `${BASE}/secrets/${key}/reveal`,
        { totp },
        vaultConfig(),
      )
    ).data,

  testSecret: async (key: string) =>
    (
      await http.post<{ key: string; validationStatus: string }>(
        `${BASE}/secrets/${key}/test`,
        {},
        vaultConfig(),
      )
    ).data,
};
