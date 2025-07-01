import { NextRequest, NextResponse } from "next/server";
import { SessionService } from "./session";
import { DEFAULT_LOGIN_PAGE } from "./constants";

export async function authMiddleware(
  request: NextRequest,
  response: NextResponse,
  redirectTo: string = DEFAULT_LOGIN_PAGE
) {
  const { pathname, search } = request.nextUrl;
  const session = await SessionService.getSessionMiddleware(request, response);
  if (!session.userId) {
    const url = new URL(redirectTo, request.url);
    const fromUrl = pathname + search;
    url.searchParams.set("from", fromUrl);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
