import { NextRequest, NextResponse } from "next/server";
import { isR2Configured } from "@/lib/r2";
import { checkRedisHealth } from "@/lib/redis";
import { checkRateLimit, getCorsHeaders } from "@/lib/security";

/**
 * GET /api/health
 * Endpoint kiểm tra sức khỏe hệ thống (Health Check) khi vận hành thực tế.
 * Không làm lộ thông tin nhạy cảm (URL, credentials, đường dẫn máy chủ).
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const rateLimit = checkRateLimit(request, 30, 60_000, "api-health");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { status: "rate_limited" },
      { status: 429, headers: corsHeaders }
    );
  }

  const redisHealth = await checkRedisHealth();

  return NextResponse.json(
    {
      status: "ok",
      timestamp: new Date().toISOString(),
      services: {
        r2Storage: isR2Configured() ? "configured" : "local-fallback",
        redisCache: {
          connected: redisHealth.connected,
          mode: redisHealth.mode,
          latencyMs: redisHealth.latencyMs,
        },
      },
    },
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
