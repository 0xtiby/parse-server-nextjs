import { SessionOptions } from "iron-session";

if (!process.env.SESSION_COOKIE_NAME || !process.env.SESSION_SECRET) {
  throw new Error("SESSION_COOKIE_NAME and SESSION_SECRET must be set");
}

export const sessionConfig: SessionOptions = {
  cookieName: process.env.SESSION_COOKIE_NAME,
  password: process.env.SESSION_SECRET,
  ttl: process.env.SESSION_TTL ? parseInt(process.env.SESSION_TTL) : 60 * 60 * 24 * 365, // 1 year
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};

export const OAuthSessionConfig: SessionOptions = {
  cookieName: "OAUTH_STATE",
  password: process.env.SESSION_SECRET,
  ttl: 60 * 2, // 2 minutes
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
};
