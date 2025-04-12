import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "./session";
import { DEFAULT_LOGIN_PAGE } from "./constants";

export async function authMiddleware(
  request: NextRequest,
  response: NextResponse,
  redirectTo: string = DEFAULT_LOGIN_PAGE
) {
  const { pathname } = request.nextUrl;
  const session = await SessionService.getSessionMiddleware(request, response);
  if (!session.userId) {
    const url = new URL(redirectTo, request.url);
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
