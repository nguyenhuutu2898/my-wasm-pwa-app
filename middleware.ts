// middleware.js
// import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";

export async function middleware(request: any) {
  //   const token = await getToken({
  //     request,
  //     secret: process.env.NEXTAUTH_SECRET,
  //   });

  const sessionToken =
    request.cookies.get("__Secure-next-auth.session-token")?.value || // for production
    request.cookies.get("next-auth.session-token")?.value || // for local
    request.headers.get("authorization");

  const isLoginPage = request.nextUrl.pathname === "/login";

  if (isLoginPage && sessionToken) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (!isLoginPage && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|images|icons|font|login|sw.js|manifest.json).*)",
  ],
};
