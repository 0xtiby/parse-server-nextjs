# Next Parse Auth

Next Parse Auth is an authentication library for Next.js that integrates with Parse Server. It provides a complete solution for handling authentication in your Next.js applications, supporting both credentials-based, custom auth adapter and OAuth authentication.

## Features

- **Multiple Authentication**: Support for credentials (email/password), custom auth providers and OAuth authentication
- **Session Management**: Automatic user session handling
- **React Hooks**: Custom hooks for easy client-side integration
- **Next.js Middleware**: Route protection with authentication middleware
- **TypeScript**: Full TypeScript support with included types

## Installation

Install the package via npm:

```bash
npm install next-parse-auth
```

## Configuration

First, set up your environment variables:

```env
PARSE_SERVER_URL=your_parse_server_url
PARSE_APPLICATION_ID=your_application_id
SESSION_COOKIE_NAME=your_cookie_name
SESSION_SECRET=your_session_secret
```

### Basic Setup

Create an api route named `app/api/auth/[...next-parse-auth]/route.ts`

```typescript
import { createAuth } from "next-parse-auth";

const auth = createAuth();
export const GET = auth.handlers.GET;
export const POST = auth.handlers.POST;
```

This setup automatically creates the following API endpoints under `/api/auth`:

- **`GET /api/auth/session`**: Retrieves the current user's session data if they are authenticated. Returns `null` if not authenticated.
- **`POST /api/auth/signup`**: Handles user registration. Expects `{ authType: 'credentials' | 'third-party', data: AuthData }` in the request body. `AuthData` will be `CredentialsAuth` or `ThirdPartyAuth` depending on the `authType`.
- **`POST /api/auth/signin`**: Handles user login. Expects `{ authType: 'credentials' | 'third-party', data: AuthData }` in the request body.
- **`POST /api/auth/logout`**: Logs out the current user and destroys their session.
- **`POST /api/auth/challenge`**: Used for custom authentication flows that require a challenge step (e.g., fetching a nonce). Expects `{ data: unknown }` in the request body and returns challenge-specific data.
- **`GET /api/auth/oauth/[provider]`**: Initiates the OAuth flow by redirecting the user to the specified OAuth provider's authorization page (e.g., `/api/auth/oauth/github`).
- **`GET /api/auth/callback/[provider]`**: The callback URL that the OAuth provider redirects to after the user grants or denies access. This endpoint handles the exchange of the authorization code for user data and authenticates the user.

## Usage

### Client-side Authentication

The `useAuth` hook provides all necessary methods for handling authentication:

- **signup(authType: 'credentials' | 'third-party', data: AuthData)**: Registers a new user

  - For credentials auth: `data` should contain `email` and `password`
  - For third-party auth: `data` should contain provider-specific auth data
  - Returns `AuthResponse` with session data on success

- **login(authType: 'credentials' | 'third-party', data: AuthData)**: Authenticates an existing user

  - Same parameters as signup
  - Returns `AuthResponse` with session data on success

- **challenge<T>(data: unknown)**: Initiates a challenge flow (e.g., for SIWE)

  - `data`: Challenge-specific data
  - Returns `ChallengeResponse<T>` with challenge data

- **logout()**: Ends the current user session

  - Returns `AuthResponse` indicating success

- **getSession()**: Retrieves the current session data

  - Returns `AuthResponse` with session if authenticated

- **getOAuthUrl(provider: string)**: Generates OAuth redirect URL

  - `provider`: Name of OAuth provider (e.g., 'github')
  - Returns URL string for OAuth flow

- **loading**: Boolean state indicating if an auth operation is in progress

```typescript
import { useAuth } from 'next-parse-auth/client';

function LoginComponent() {
  const { login, loading } = useAuth();

  const handleLogin = async () => {
    const response = await login('credentials', {
      email: 'user@example.com',
      password: 'password'
    });

    if (response.success) {
      // Handle successful login
    }
  };

  return (
    // Your login component
  );
}
```

### Session Management

Next Parse Auth provides a SessionProvider and useSession hook for easy session state management across your application.

#### SessionProvider

Wrap your application with SessionProvider to enable session state management:

```typescript
// app/layout.tsx
import { SessionProvider } from "next-parse-auth/client";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <SessionProvider>{children}</SessionProvider>
      </body>
    </html>
  );
}
```

#### useSession Hook

The `useSession` hook provides easy access to the current session state:

```typescript
import { useSession } from "next-parse-auth/client";

function ProfileComponent() {
  const { data, status } = useSession();

  if (status === "loading") {
    return <div>Loading...</div>;
  }

  if (status === "unauthenticated") {
    return <div>Please sign in</div>;
  }

  return <div>Welcome {data?.userId}</div>;
}
```

The hook returns:

- `data`: The session data (null if not authenticated)
- `status`: One of three states:
  - `'loading'`: Initial session loading
  - `'authenticated'`: User is signed in
  - `'unauthenticated'`: No active session

### Route Protection

#### Middleware

Protect your application routes using the provided `authMiddleware`. Configure the `matcher` in `config` to specify which routes require authentication.

```typescript
// File: middleware.ts
import { authMiddleware } from "next-parse-auth/middleware";

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public routes (login, signup, etc.)
     * - auth API routes (/api/auth/...)
     * - home page ($) - adjust if your home page needs auth
     */
    "/((?!_next/static|_next/image|favicon.ico|login|signup|terms-of-service|privacy|api/auth|$).*)",
  ],
};

export { authMiddleware as middleware };
```

#### With auth

Use the `auth()` function in server components or route handlers to protect server-side resources:

```ts
import { auth } from "next-parse-auth";

export default function ProtectedPage() {
  const session = await auth();
  if (session.userId) {
    return unauthorized();
  }
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      sample
    </div>
  );
}
```

## Supported Authentication Methods

### Credentials Authentication

```typescript
const { login } = useAuth();

await login("credentials", {
  email: "user@example.com",
  password: "password",
});
```

### Custom Authentication Adapter

Exemple of [parse-server-otp-auth-adapter](https://github.com/0xtiby/parse-server-otp-auth-adapter)

```typescript
const { challenge, login } = useAuth();

const result = await challenge({ otp: { email: data.email } });
// next login
const result = await login("third-party", {
  providerName: "otp",
  authData: { email: "your-email", otp: "one time password", id: "your-email" },
});
```

### OAuth Authentication

To enable OAuth authentication, you need to configure the OAuth providers in your application. Here's an example using GitHub as a provider:
`app/api/auth/[...next-parse-auth]/route.ts`

```typescript
import { createAuth } from "next-parse-auth";
import { environments } from "@/config/env";

const oAuthProviders = {
  github: {
    authorizeUrl: `https://github.com/login/oauth/authorize?client_id=${environments.GITHUB_CLIENT_ID}&redirect_uri=${environments.GITHUB_REDIRECT_URI}&scope=${environments.GITHUB_SCOPE}`,
    callBackFunction: (providerName: string, data: { code: string }) => {
      return {
        providerName,
        authData: {
          code: data.code,
        },
      };
    },
  },
};

const auth = createAuth({
  oAuthProviders,
});
export const GET = auth.handlers.GET;
export const POST = auth.handlers.POST;
```

The `authorizeUrl` is the URL that users will be redirected to when initiating the OAuth flow. For github this URL typically includes:

- `client_id`: Your application's ID registered with the OAuth provider
- `redirect_uri`: The URL where the provider will redirect back to after authorization
- `scope`: The permissions your app is requesting
- Any other provider-specific parameters

The `callBackFunction` is the function called right after being redirect from your third party. All query params are return as `data`. The return object will be used for the signInwith method of parse server.

```typescript
const { getOAuthUrl } = useAuth();

// Redirects to OAuth provider
window.location.href = getOAuthUrl("github");
```

## Session Management

Next Parse Auth uses iron-session for secure session management. Sessions can be configured through environment variables:

```env
SESSION_TTL=31536000  # Session duration in seconds (default: 1 year)
```

## Error Handling

The library provides structured error responses:

```typescript
try {
  await login("credentials", credentials);
} catch (error) {
  if (error instanceof AuthServiceError) {
    console.log(error.code, error.message);
  }
}
```

### Logout

To enable logout functionality, you need to define a cloud function in your Parse Server configuration. Add the following to your cloud code:

```typescript
import { parseAuthLogout, LOGOUT_FUNCTION_NAME } from "next-parse-auth/parse";

Parse.Cloud.define(LOGOUT_FUNCTION_NAME, parseAuthLogout, {
  requireUser: true,
});
```

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues to discuss new features or improvements.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
