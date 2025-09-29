import { NextRequest, NextResponse } from "next/server";
import { getEnabledLanguageCodes, getDefaultLanguage, getLocaleFromAcceptLanguage } from "@/lib/intl/languageUtils";

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Skip for API routes and static files
  if (
    request.nextUrl.pathname.startsWith("/api/") ||
    request.nextUrl.pathname.startsWith("/_next/") ||
    request.nextUrl.pathname.includes(".")
  ) {
    return response;
  }

  // Get language from query param, cookie, or Accept-Language header
  const langFromQuery = request.nextUrl.searchParams.get("lang");
  const langFromCookie = request.cookies.get("lang")?.value;
  const langFromHeader = getLocaleFromAcceptLanguage(
    request.headers.get("accept-language") || ""
  );

  const selectedLang = langFromQuery || langFromCookie || langFromHeader;

  // Validate and set cookie
  const supportedCodes = getEnabledLanguageCodes();
  const finalLang = supportedCodes.includes(selectedLang as any)
    ? selectedLang
    : getDefaultLanguage();

  // Set lang cookie with 1 year expiry
  response.cookies.set("lang", finalLang, {
    maxAge: 365 * 24 * 60 * 60, // 1 year
    httpOnly: false, // Allow client-side access
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
