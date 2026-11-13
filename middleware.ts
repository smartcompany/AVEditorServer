import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { pickStoreRedirect } from '@/lib/applink';

/**
 * `/applink` — UA 기준 App Store / Play Store 302 (iOS 미출시 시 `/applink/social`).
 * X·카카오 등 인앱 WebView는 `/applink/social` (HTML + 버튼) 사용.
 * 루트 `/` 는 엔드포인트 안내 페이지라 건드리지 않는다.
 */
export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

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
  matcher: ['/applink'],
};
