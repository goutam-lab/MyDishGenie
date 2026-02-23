import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const latency = Date.now() - start;

  // Configuration for the monitor connection
  const INFRAGUARDIAN_URL = process.env.INFRAGUARDIAN_URL;
  const PROJECT_ID = process.env.INFRAGUARDIAN_PROJECT_ID;

  if (INFRAGUARDIAN_URL && PROJECT_ID) {
    // Capture and send request data to InfraGuardian
    fetch(`${INFRAGUARDIAN_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        message: `Request: ${request.method} ${request.nextUrl.pathname}`,
        level: response.status >= 400 ? 'error' : 'info',
        latency: latency,
        metadata: {
          status: response.status,
          url: request.url,
        }
      }),
    }).catch(() => {
      // Silent fail to ensure Dish Genie stays fast for users
    });
  }

  return response;
}

// Ensure middleware only runs on app routes, not static images
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};