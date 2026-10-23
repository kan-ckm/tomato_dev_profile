import dns from "node:dns";
try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // ignore
}

import { NextRequest, NextResponse } from "next/server";
import { fallbackPlaylist } from "@/config/music.config";
import {
  checkRateLimit,
  getCorsHeaders,
} from "@/lib/security";
import {
  getCachedMusicPlaylist,
  setCachedMusicPlaylist,
} from "@/lib/redis";
import { getMusicPlaylistFromDatabase, getMusicPlaylistFromCms } from "@/lib/cms";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

/**
 * GET /api/music
 * Trả về danh sách bài hát cho Profile Music Player:
 * 1. Đọc từ Redis Cache (L1 RAM + L2 Docker/Upstash Redis) — TTL ngắn 120s, bị Admin xóa tức thì khi thay đổi.
 * 2. Primary Source: Truy vấn Neon PostgreSQL Database (Single Source of Truth, link R2 CDN toàn cầu).
 * 3. Secondary Source: Central Admin CMS API (Headless Endpoint trên mạng Tailscale/Docker).
 * 4. Emergency Offline Fallback: Danh sách tĩnh fallbackPlaylist từ music.config.ts.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);
  const noCacheHeaders = {
    ...corsHeaders,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
  };

  const rateLimit = checkRateLimit(request, 60, 60_000, "api-music");
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: noCacheHeaders }
    );
  }

  const forceRefresh = request.nextUrl.searchParams.get("refresh") === "1";

  // ============================================================================
  // TẦNG 1: Đọc từ Redis Cache (TTL ngắn 120s, Admin xóa tức thì khi có thay đổi)
  // ============================================================================
  if (!forceRefresh) {
    try {
      const cached = await getCachedMusicPlaylist();
      if (cached && cached.length > 0) {
        return NextResponse.json(cached, {
          status: 200,
          headers: {
            ...noCacheHeaders,
            "X-Cache": "HIT",
            "X-Source": "Redis-Cache",
          },
        });
      }
    } catch (redisErr) {
      console.warn("[API /api/music] Redis cache read failed:", redisErr);
    }
  }

  // ============================================================================
  // TẦNG 2 (PRIMARY SOURCE): Truy vấn Neon PostgreSQL Database trực tiếp
  // ============================================================================
  try {
    const dbTracks = await getMusicPlaylistFromDatabase();
    if (dbTracks && dbTracks.length > 0) {
      // Lưu làm bản sao dự phòng vào Redis
      await setCachedMusicPlaylist(dbTracks);

      return NextResponse.json(dbTracks, {
        status: 200,
        headers: {
          ...noCacheHeaders,
          "X-Cache": "MISS",
          "X-Source": "Neon-SQL-Direct",
        },
      });
    }
  } catch (dbErr) {
    console.warn("[API /api/music] Direct Neon DB query failed, attempting CMS fallback:", dbErr);
  }

  // ============================================================================
  // TẦNG 2B (SECONDARY): Central Admin CMS API (Headless Endpoint)
  // ============================================================================
  try {
    const cmsTracks = await getMusicPlaylistFromCms();
    if (cmsTracks && cmsTracks.length > 0) {
      await setCachedMusicPlaylist(cmsTracks);

      return NextResponse.json(cmsTracks, {
        status: 200,
        headers: {
          ...noCacheHeaders,
          "X-Cache": "MISS",
          "X-Source": "Neon-SQL-CMS",
        },
      });
    }
  } catch (cmsErr) {
    console.warn("[API /api/music] Central CMS query failed, attempting offline fallback:", cmsErr);
  }

  // ============================================================================
  // TẦNG 3: Emergency Fallback tĩnh khi mất mạng hoàn toàn
  // ============================================================================
  return NextResponse.json(fallbackPlaylist, {
    status: 200,
    headers: {
      ...noCacheHeaders,
      "X-Cache": "MISS",
      "X-Source": "Emergency-Config-Fallback",
    },
  });
}
