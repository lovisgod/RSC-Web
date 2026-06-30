import type { Response } from "express";

import { ACCESS_TOKEN_COOKIE, REFRESH_TOKEN_COOKIE } from "./auth.constants";

const COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test",
  path: "/",
};

export function setAuthCookies(
  response: Response,
  input: {
    accessToken: string;
    refreshToken: string;
    accessTokenMaxAgeSeconds: number;
    refreshTokenMaxAgeSeconds: number;
  },
): void {
  response.cookie(ACCESS_TOKEN_COOKIE, input.accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: input.accessTokenMaxAgeSeconds * 1000,
  });
  response.cookie(REFRESH_TOKEN_COOKIE, input.refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: input.refreshTokenMaxAgeSeconds * 1000,
  });
}

export function clearAuthCookies(response: Response): void {
  response.clearCookie(ACCESS_TOKEN_COOKIE, COOKIE_OPTIONS);
  response.clearCookie(REFRESH_TOKEN_COOKIE, COOKIE_OPTIONS);
}

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  const cookies = cookieHeader.split(";").map((cookie) => cookie.trim());
  const cookie = cookies.find((item) => item.startsWith(`${name}=`));

  return cookie ? decodeURIComponent(cookie.slice(name.length + 1)) : undefined;
}
