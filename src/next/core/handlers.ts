import { NextRequest, NextResponse } from "next/server";
import { AuthResponse, authService, AuthServiceError, ChallengeResponse } from "./auth";
import { parseAuthRequest, redirectFromAuthHandler } from "./lib";
import { DEFAULT_LOGIN_PAGE, DEFAULT_AFTER_OAUTHLOGIN_REDIRECT } from "./constants";
import { AUTH_ACTIONS, AUTH_TYPES, AuthData, OAuthConfig, Session } from "./types";

async function handleGet(
  request: NextRequest,
  action: string | undefined,
  provider: string | undefined,
  OAuthConfig: Record<string, OAuthConfig> | undefined
) {
  const providers = Object.keys(OAuthConfig ?? {});
  const isValidProvider = provider ? providers.includes(provider) : false;

  if (
    (action === AUTH_ACTIONS.OAUTH || action === AUTH_ACTIONS.CALLBACK) &&
    !isValidProvider
  ) {
    throw new AuthServiceError("Invalid provider", 400);
  }

  switch (action) {
    case AUTH_ACTIONS.SESSION:
      const session = await authService.getSession();

      return NextResponse.json({
        success: true,
        session: session,
      });

    case AUTH_ACTIONS.OAUTH:
      const oauth = await authService.redirectToOAuth(OAuthConfig![provider!]!);
      return NextResponse.redirect(oauth);

    case AUTH_ACTIONS.CALLBACK:
      try {
        await authService.handleOAuthCallback(
          provider!,
          OAuthConfig![provider!]!,
          request.nextUrl.searchParams
        );
      } catch (error) {
        if (error instanceof AuthServiceError) {
          return redirectFromAuthHandler(
            request,
            OAuthConfig![provider!]!.loginPage ?? DEFAULT_LOGIN_PAGE,
            {
              message: error.message,
              code: error.code.toString(),
            }
          );
        }
      }
      return redirectFromAuthHandler(
        request,
        OAuthConfig![provider!]!.afterLoginRedirect ?? DEFAULT_AFTER_OAUTHLOGIN_REDIRECT
      );
    default:
      throw new AuthServiceError("Unknown action", 400);
  }
}

async function handlePost(
  action: string | undefined,
  authType: AUTH_TYPES,
  data: AuthData
) {
  let session: Session | null = null;
  switch (action) {
    case AUTH_ACTIONS.CHALLENGE:
      const challengeData = await authService.challenge(data);
      return NextResponse.json(new ChallengeResponse(true, challengeData, null));

    case AUTH_ACTIONS.SIGNUP:
      session = await authService.signup(authType, data);
      return NextResponse.json(new AuthResponse(true, session, null));

    case AUTH_ACTIONS.SIGNIN:
      session = await authService.signin(authType, data);
      return NextResponse.json(new AuthResponse(true, session, null));

    case AUTH_ACTIONS.LOGOUT:
      await authService.signout();
      return NextResponse.json(new AuthResponse(true, null, null));

    default:
      throw new AuthServiceError("Unknown action", 400);
  }
}

export function createAuthHandlers(OAuthConfig?: Record<string, OAuthConfig>) {
  return {
    async handleAuthRoute(
      request: NextRequest,
      action: string | undefined,
      provider: string | undefined
    ) {
      try {
        if (request.method === "GET") {
          const reponse = await handleGet(request, action, provider, OAuthConfig);
          return reponse;
        }
        if (request.method === "POST") {
          const { authType, data } = await parseAuthRequest(request);
          const reponse = await handlePost(action, authType, data);
          return reponse;
        }
        throw new AuthServiceError("Unsupported method", 405);
      } catch (error) {
        if (error instanceof AuthServiceError) {
          return NextResponse.json(
            { success: false, error: error.toJSON() },
            { status: 422 }
          );
        } else {
          return NextResponse.json(
            { success: false, error: "Unknown auth error" },
            { status: 500 }
          );
        }
      }
    },
  };
}

export function createAuth(config?: { oAuthProviders: Record<string, OAuthConfig> }) {
  const handlers = createAuthHandlers(config?.oAuthProviders);

  const httpHandler = async (
    request: NextRequest,
    context: { params: Promise<{ "psnjs-auth": string[] }> }
  ) => {
    const params = await context.params;
    const [action, provider] = params["psnjs-auth"];
    return handlers.handleAuthRoute(request, action, provider);
  };

  return {
    handlers: { GET: httpHandler, POST: httpHandler } as const,
  };
}
