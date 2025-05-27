import { NextRequest, NextResponse } from "next/server";

import { AUTH_TYPES, AuthRequestData, CredentialsAuth, ThirdPartyAuth } from "./types";

export const parseAuthRequest = async (
  request: NextRequest
): Promise<AuthRequestData> => {
  const data = await request.json().catch(() => ({}));

  return {
    action: data.action || "",
    authType: data.authType || AUTH_TYPES.CREDENTIALS,
    data: data.data || {},
  };
};

export const isCredentialsAuth = (data: any): data is CredentialsAuth => {
  return data && "email" in data && "password" in data;
};

export const isThirdPartyAuth = (data: any): data is ThirdPartyAuth => {
  return data && "providerName" in data && "authData" in data;
};

export const redirectFromAuthHandler = (
  request: NextRequest,
  path: string,
  params?: Record<string, string>
) => {
  const url = request.nextUrl.clone();
  url.search = "";
  url.pathname = path;

  if (params) {
    Object.keys(params).forEach((key) => {
      url.searchParams.set(key, params[key] || "");
    });
  }

  return NextResponse.redirect(url);
};
