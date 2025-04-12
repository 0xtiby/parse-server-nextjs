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
        "logout",
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

  async redirectToOAuth(oAuthConfig: OAuthConfig) {
    const state = uuidv4();
    await SessionService.setOAuthSession(state);

    const url = new URL(oAuthConfig.authorizeUrl);
    url.searchParams.append("state", state);
    return url.toString();
  }

  async handleOAuthCallback(
    providerName: string,
    oAuthConfig: OAuthConfig,
    params: URLSearchParams
  ) {
    const session = await SessionService.getOAuthSession();
    const { authState } = session;
    const { state, ...rest } = this.searchParamsToObject(params);
    if (state !== authState) {
      throw new AuthServiceError("Invalid state", 400);
    }
    await SessionService.deleteOAuthSession();
    const data = oAuthConfig.callBackFunction(providerName, rest);
    return this.signin(AUTH_TYPES.THIRD_PARTY, data);
  }

  async getSession(): Promise<Session> {
    const session = await SessionService.getSession();
    if (!session) {
      throw new AuthServiceError("No session found", 400);
    }
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
    const { providerName, authData, email, username } = data;
    const parseUser = new Parse.User();
    if (email) {
      parseUser.set("email", email);
    }
    if (username) {
      parseUser.set("username", username);
    }
    const user = await parseUser.linkWith(providerName, { authData });

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

  private createSessionFromUser(user: Parse.User<Parse.Attributes>): Session {
    return {
      userId: user.id!,
      sessionToken: user.getSessionToken()!,
    };
  }
}

export const authService = new AuthService();
export const auth = () => authService.getSession();
