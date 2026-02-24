import { NextResponse, type NextRequest } from 'next/server';
import { pushLog } from './lib/telemetry';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();
  const latency = Date.now() - start;

  // Report the request to InfraGuardian
  pushLog({
    message: `Request: ${request.method} ${request.nextUrl.pathname}`,
    level: response.status >= 400 ? 'error' : 'info',
    latency
  });

  return response;
}