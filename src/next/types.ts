export enum AUTH_ACTIONS {
  SESSION = "session",
  OAUTH = "oauth",
  CALLBACK = "callback",
  CHALLENGE = "challenge",
  SIGNUP = "signup",
  SIGNIN = "signin",
  LOGOUT = "logout",
}

export enum AUTH_TYPES {
  CREDENTIALS = "credentials",
  THIRD_PARTY = "third-party",
}

export interface CredentialsAuth {
  email: string;
  password: string;
}

export interface ThirdPartyAuth {
  providerName: string;
  authData: Record<string, any>;
}

export type AuthData = CredentialsAuth | ThirdPartyAuth;

export interface AuthRequestData {
  action: string;
  authType: AUTH_TYPES;
  data: AuthData;
}

export interface Session {
  userId: string;
  sessionToken: string;
}

export interface OAuthSession {
  authState: string;
  codeVerifier?: string;
}

export interface OAuthConfig {
  authorizeUrl: string;
  callBackFunction: (
    providerName: string,
    data: any
  ) => ThirdPartyAuth | Promise<ThirdPartyAuth>;
  loginPage?: string;
  afterLoginRedirect?: string;
  pkce?: boolean;
}
