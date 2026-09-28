import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const isProtectedRoute = createRouteMatcher(['/admin(.*)']);
const isSelectOrgRoute = createRouteMatcher(['/admin/select-organization']);

export default clerkMiddleware(async (auth, req) => {
  if (isSelectOrgRoute(req)) {
    return NextResponse.next();
  }

  if (isProtectedRoute(req)) {
    await auth.protect();

    const { orgId } = await auth();
    if (!orgId) {
      return NextResponse.redirect(new URL('/admin/select-organization', req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!.*\\..*|_next).*)',
    '/',
    '/(api|trpc)(.*)',
  ],
};
