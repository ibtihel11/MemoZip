const ACCESS_TOKEN_KEY = 'memozip-access-token';
const REFRESH_TOKEN_KEY = 'memozip-refresh-token';

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export const tokenStorage = {
  getAccessToken(): string | null {
    return sessionStorage.getItem(ACCESS_TOKEN_KEY);
  },

  getRefreshToken(): string | null {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY);
  },

  saveTokens(tokens: TokenResponse): void {
    sessionStorage.setItem(ACCESS_TOKEN_KEY, tokens.access_token);
    sessionStorage.setItem(REFRESH_TOKEN_KEY, tokens.refresh_token);
  },

  clearTokens(): void {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  },
};
