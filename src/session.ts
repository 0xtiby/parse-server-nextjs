import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { OAuthSession, Session } from "./types";
import { NextRequest, NextResponse } from "next/server";
import { OAuthSessionConfig, sessionConfig } from "./config";

export class SessionService {
  static async setSession(data: Session) {
    const session = await getIronSession<Session>(await cookies(), sessionConfig);
    session.userId = data.userId;
    session.sessionToken = data.sessionToken;
    await session.save();
  }

  static async getSession() {
    const session = await getIronSession<Session>(await cookies(), sessionConfig);
    return session;
  }

  static async deleteSession() {
    const session = await getIronSession<Session>(await cookies(), sessionConfig);
    await session.destroy();
  }

  static async destroy(session: IronSession<Session>) {
    await session.destroy();
  }

  static async getSessionMiddleware(request: NextRequest, response: NextResponse) {
    const session = await getIronSession<Session>(request, response, sessionConfig);
    return session;
  }

  static async getOAuthSession() {
    const session = await getIronSession<OAuthSession>(
      await cookies(),
      OAuthSessionConfig
    );
    return session;
  }

  static async setOAuthSession(authState: string) {
    const session = await getIronSession<OAuthSession>(
      await cookies(),
      OAuthSessionConfig
    );
    session.authState = authState;
    await session.save();
  }

  static async deleteOAuthSession() {
    const session = await getIronSession<OAuthSession>(
      await cookies(),
      OAuthSessionConfig
    );
    await session.destroy();
  }
}
