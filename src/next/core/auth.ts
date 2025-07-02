import { isCredentialsAuth, isThirdPartyAuth } from "./lib";
import {
  AUTH_TYPES,
  AuthData,
  CredentialsAuth,
  OAuthConfig,
  Session,
  ThirdPartyAuth,
} from "./types";
import { v4 as uuidv4 } from "uuid";

import Parse from "./parse";
import { parseConfig } from "./parse";
import { SessionService } from "./session";
import { Attributes } from "parse";
import ParseUser from "parse/types/ParseUser";
import { LOGOUT_FUNCTION_NAME } from "../../parse-server";
import { DEFAULT_AFTER_OAUTHLOGIN_REDIRECT } from "./constants";

export class AuthServiceError extends Error {
  constructor(message: string, public code: number) {
    super(message);
  }

  toJSON() {
    return {
      message: this.message,
      code: this.code,
    };
  }
}

export class AuthResponse {
  constructor(
    public success: boolean,
    public session: Session | null,
    public error: AuthServiceError | null
  ) {}
}

export class ChallengeResponse<T> {
  constructor(
    public success: boolean,
    public challengeData: T | null,
    public error: AuthServiceError | null
  ) {}
}

export class AuthService {
  async challenge<T>(data: unknown): Promise<T> {
    try {
      const response = await fetch(`${parseConfig.url}/challenge`, {
        method: "POST",
        headers: {
          "X-Parse-Application-Id": parseConfig.applicationId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          challengeData: data,
        }),
      });
      const json = await response.json();
      return json.challengeData;
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Parse.Error ? error.message : "Unknown challenge error",
        error instanceof Parse.Error ? error.code : 500
      );
    }
  }

  async signup(authType: AUTH_TYPES, data: AuthData): Promise<Session> {
    try {
      if (authType === AUTH_TYPES.CREDENTIALS && isCredentialsAuth(data)) {
        return await this.signupWithCredentials(data);
      }

      if (authType === AUTH_TYPES.THIRD_PARTY && isThirdPartyAuth(data)) {
        return await this.signupWithThirdParty(data);
      }

      throw new AuthServiceError("Invalid auth type", 400);
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Parse.Error ? error.message : "Unknown signup error",
        error instanceof Parse.Error ? error.code : 500
      );
    }
  }

  async signin(authType: AUTH_TYPES, data: AuthData): Promise<Session> {
    try {
      if (authType === AUTH_TYPES.CREDENTIALS && isCredentialsAuth(data)) {
        return await this.signinWithCredentials(data);
      }
      if (authType === AUTH_TYPES.THIRD_PARTY && isThirdPartyAuth(data)) {
        return await this.signinWithThirdParty(data);
      }

      throw new AuthServiceError("Invalid auth type", 400);
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Parse.Error ? error.message : "Unknown login error",
        error instanceof Parse.Error ? error.code : 500
      );
    }
  }

  async signout(): Promise<void> {
    const session = await SessionService.getSession();
    if (!session) {
      throw new AuthServiceError("No session found", 400);
    }
    try {
      await Parse.Cloud.run(
        LOGOUT_FUNCTION_NAME,
        {},
        {
          sessionToken: session.sessionToken,
        }
      );
      await SessionService.deleteSession();
    } catch (error) {
      throw new AuthServiceError(
        error instanceof Parse.Error ? error.message : "Unknown logout error",
        error instanceof Parse.Error ? error.code : 500
      );
    }
  }

  async redirectToOAuth(oAuthConfig: OAuthConfig, from?: string | null): Promise<string> {
    const state = uuidv4();
    let codeVerifier: string | undefined = undefined;

    const url = new URL(oAuthConfig.authorizeUrl);
    url.searchParams.append("state", state);

    if (oAuthConfig.pkce) {
      // 1. Generate code_verifier - random string
      codeVerifier = crypto.randomUUID().replace(/-/g, "");

      // 2. Generate code_challenge - base64url encoded SHA256 hash
      const encoder = new TextEncoder();
      const data = encoder.encode(codeVerifier);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const codeChallenge = btoa(String.fromCharCode(...hashArray))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      // 3. Add PKCE parameters to the URL
      url.searchParams.append("code_challenge", codeChallenge);
      url.searchParams.append("code_challenge_method", "S256");
    }

    // Store the state and potentially the code_verifier in session
    // SessionService.setOAuthSession should be modified to accept codeVerifier
    await SessionService.setOAuthSession(state, codeVerifier, from);
    return url.toString();
  }

  async handleOAuthCallback(
    providerName: string,
    oAuthConfig: OAuthConfig,
    params: URLSearchParams
  ): Promise<string> {
    const session = await SessionService.getOAuthSession();
    const { authState, codeVerifier, from } = session;

    const { state, ...rest } = this.searchParamsToObject(params);
    if (state !== authState) {
      throw new AuthServiceError("Invalid state", 400);
    }
    await SessionService.deleteOAuthSession();
    const data = await oAuthConfig.callBackFunction(providerName, {
      ...rest,
      codeVerifier,
    });
    await this.signin(AUTH_TYPES.THIRD_PARTY, data);

    // Return redirect URL - use 'from' parameter if available, otherwise use configured redirect
    const redirectUrl =
      from || oAuthConfig.afterLoginRedirect || DEFAULT_AFTER_OAUTHLOGIN_REDIRECT;
    return redirectUrl;
  }

  async getSession(): Promise<Session | null> {
    const session = await SessionService.getSession();
    return session;
  }

  private async signupWithCredentials(data: CredentialsAuth): Promise<Session> {
    const user = new Parse.User();
    user.set("username", data.email);
    user.set("email", data.email);
    user.set("password", data.password);

    const newUser = await user.signUp();
    const session = this.createSessionFromUser(newUser);
    await SessionService.setSession(session);

    return session;
  }

  private async signupWithThirdParty(data: ThirdPartyAuth): Promise<Session> {
    return this.signinWithThirdParty(data);
  }

  private async signinWithCredentials(data: CredentialsAuth): Promise<Session> {
    const user = await Parse.User.logIn(data.email, data.password);
    const session = this.createSessionFromUser(user);
    await SessionService.setSession(session);
    return session;
  }

  private async signinWithThirdParty(data: ThirdPartyAuth): Promise<Session> {
    const { providerName, authData } = data;
    const user = await Parse.User.logInWith(providerName, { authData });
    const session = this.createSessionFromUser(user);
    await SessionService.setSession(session);
    return session;
  }

  private searchParamsToObject = (searchParams: URLSearchParams) => {
    const params: Record<string, string> = {};
    searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  };

  private createSessionFromUser(user: ParseUser<Attributes>): Session {
    return {
      userId: user.id!,
      sessionToken: user.getSessionToken()!,
    };
  }
}

export const authService = new AuthService();
export const auth = (): Promise<Session | null> => authService.getSession();
