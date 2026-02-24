import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { pushLog } from './lib/telemetry';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const latency = Date.now() - start;

  // Configuration for your InfraGuardian monitor
  const INFRAGUARDIAN_URL = process.env.INFRAGUARDIAN_URL;
  const PROJECT_ID = process.env.INFRAGUARDIAN_PROJECT_ID;

  if (INFRAGUARDIAN_URL && PROJECT_ID) {
    // Send telemetry to InfraGuardian
    fetch(`${INFRAGUARDIAN_URL}/api/ingest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        project_id: PROJECT_ID,
        message: `Request: ${request.method} ${request.nextUrl.pathname}`,
        level: response.status >= 400 ? 'error' : 'info',
        latency_ms: latency,
      }),
    }).catch(() => {
      // Silent fail to ensure Dish Genie performance
    });
  }

  return response;
}

// Ensure middleware only runs on relevant routes
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};