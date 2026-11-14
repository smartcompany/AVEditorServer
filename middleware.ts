import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { pickStoreRedirect } from '@/lib/applink';
import { DASHBOARD_COOKIE, dashboardSessionToken } from '@/lib/dashboard-auth';

/**
 * `/applink` — UA 기준 App Store / Play Store 302 (iOS 미출시 시 `/applink/social`).
 * X·카카오 등 인앱 WebView는 `/applink/social` (HTML + 버튼) 사용.
 * 루트 `/` 는 엔드포인트 안내 페이지라 건드리지 않는다.
 */
export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Dashboard: issue the session cookie derived from DASHBOARD_SECRET (env),
  // so the page can call its APIs without asking for the secret.
  if (path === '/dashboard') {
    const response = NextResponse.next();
    const token = await dashboardSessionToken();
    if (token) {
      response.cookies.set(DASHBOARD_COOKIE, token, {
        httpOnly: true,
        secure: request.nextUrl.protocol === 'https:',
        sameSite: 'strict',
        path: '/',
        maxAge: 60 * 60 * 12,
      });
    }
    return response;
  }

  if (path === '/applink') {
    const ua = request.headers.get('user-agent') ?? '';
    const target = pickStoreRedirect(ua);
    if (target.startsWith('/')) {
      const social = request.nextUrl.clone();
      social.pathname = target;
      return NextResponse.redirect(social, 302);
    }
    return NextResponse.redirect(target, 302);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/applink', '/dashboard'],
};
