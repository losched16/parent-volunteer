// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    // Admin routes require admin role
    if (pathname.startsWith("/admin") && token?.role !== "admin") {
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Parent routes require parent role
    if (
      (pathname.startsWith("/dashboard") ||
        pathname.startsWith("/opportunities") ||
        pathname.startsWith("/history") ||
        pathname.startsWith("/profile")) &&
      token?.role !== "parent"
    ) {
      if (token?.role === "admin") {
        return NextResponse.redirect(new URL("/admin/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        // Allow auth pages
        if (pathname.startsWith("/login") || pathname.startsWith("/register") || pathname.startsWith("/api/auth")) {
          return true;
        }
        // Require auth for protected routes
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/opportunities/:path*",
    "/history/:path*",
    "/profile/:path*",
    "/admin/:path*",
  ],
};
