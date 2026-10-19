import { NextRequest, NextResponse } from "next/server";
import { profileConfig } from "@/config/profile.config";
import { getCachedTikTokStats, setCachedTikTokStats } from "@/lib/redis";
import { checkRateLimit, getCorsHeaders } from "@/lib/security";
import { TikTokStatsResponse } from "@/types";

const TIKTOK_USERNAME = (process.env.TIKTOK_USERNAME || "tomatodevs").replace(/^@/, "");
const TIKTOK_PROFILE_URL = `https://www.tiktok.com/@${encodeURIComponent(TIKTOK_USERNAME)}`;

const FALLBACK: TikTokStatsResponse = {
  followers_raw: profileConfig.tiktok.fallbackFollowers,
  likes_raw: profileConfig.tiktok.fallbackLikes,
  source: "fallback",
};

/**
 * Thu thập thống kê Follower & Likes trực tiếp từ trang hồ sơ TikTok công khai
 * có giới hạn thời gian (AbortSignal.timeout) để tránh treo kết nối.
 */
async function scrapeTikTokProfile(): Promise<{
  followersRaw: number;
  likesRaw: number;
}> {
  const res = await fetch(TIKTOK_PROFILE_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) " +
        "AppleWebKit/537.36 (KHTML, like Gecko) " +
        "Chrome/124.0.0.0 Safari/537.36",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
      "Sec-Ch-Ua-Mobile": "?0",
      "Sec-Ch-Ua-Platform": '"Windows"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
    redirect: "follow",
    signal: AbortSignal.timeout(8000),
    next: { revalidate: 3600 },
  });

  if (!res.ok) {
    throw new Error(`TikTok responded with status ${res.status}`);
  }

  const html = await res.text();

  let followersRaw = 0;
  let likesRaw = 0;

  // Cách 1: Trích xuất từ __UNIVERSAL_DATA_FOR_REHYDRATION__
  const scriptMatch = html.match(
    /<script\s+id="__UNIVERSAL_DATA_FOR_REHYDRATION__"[^>]*>([\s\S]*?)<\/script>/
  );

  if (scriptMatch) {
    try {
      const json = JSON.parse(scriptMatch[1]);
      for (const key of Object.keys(json)) {
        const obj = json[key];
        if (obj && typeof obj === "object" && ("followerCount" in obj || "fans" in obj)) {
          followersRaw = Number(obj.followerCount ?? obj.fans ?? 0);
          likesRaw = Number(obj.heartCount ?? obj.heart ?? obj.diggCount ?? 0);
          break;
        }
      }
    } catch {
      // Bỏ qua lỗi parse JSON, chuyển sang phương pháp regex dự phòng
    }
  }

  // Cách 2: Regex trực tiếp trên HTML
  if (!followersRaw) {
    const fMatch = html.match(/"followerCount"\s*:\s*(\d+)/);
    if (fMatch) followersRaw = parseInt(fMatch[1], 10);
  }
  if (!likesRaw) {
    const lMatch = html.match(/"heartCount"\s*:\s*(\d+)/);
    if (lMatch) likesRaw = parseInt(lMatch[1], 10);
  }

  // Cách 3: Trích xuất từ SIGI_STATE
  if (!followersRaw) {
    const sigiMatch = html.match(/window\['SIGI_STATE'\]\s*=\s*({[\s\S]*?});\s*window/);
    if (sigiMatch) {
      try {
        const sigi = JSON.parse(sigiMatch[1]);
        for (const key of Object.keys(sigi)) {
          const obj = sigi[key];
          if (obj && typeof obj === "object" && "followerCount" in obj) {
            followersRaw = Number(obj.followerCount ?? 0);
            likesRaw = Number(obj.heartCount ?? 0);
            break;
          }
        }
      } catch {
        // Bỏ qua lỗi parse
      }
    }
  }

  return { followersRaw, likesRaw };
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function GET(request: NextRequest) {
  const corsHeaders = getCorsHeaders(request);

  const rateLimit = checkRateLimit(request, 30, 60_000);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: corsHeaders }
    );
  }

  try {
    // 1. Lấy dữ liệu cache từ Upstash Redis (hoặc RAM cache)
    const cachedFollower = await getCachedTikTokStats();

    // 2. Lấy dữ liệu mới từ TikTok
    let freshFollowers = 0;
    let freshLikes = 0;
    try {
      const result = await scrapeTikTokProfile();
      freshFollowers = result.followersRaw;
      freshLikes = result.likesRaw;
    } catch (scrapeErr) {
      console.warn("[TikTok Stats] Live scrape failed, using cache/fallback:", scrapeErr);
    }

    // 3. Nếu lấy được dữ liệu mới hợp lệ, cập nhật lên Upstash Redis
    if (freshFollowers > 0) {
      await setCachedTikTokStats(freshFollowers, freshLikes);
    }

    // 4. Tổng hợp kết quả trả về (Ưu tiên: Live TikTok -> Redis Cache -> Fallback)
    const data: TikTokStatsResponse = {
      followers_raw:
        freshFollowers || (cachedFollower ? cachedFollower.followers : FALLBACK.followers_raw),
      likes_raw:
        freshLikes || (cachedFollower ? cachedFollower.likes : FALLBACK.likes_raw),
      source: freshFollowers ? "tiktok" : cachedFollower ? "cached" : "fallback",
      updated_at: new Date().toISOString(),
    };

    return NextResponse.json(data, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Cache-Control": "public, s-maxage=21600, stale-while-revalidate=86400",
      },
    });
  } catch (err) {
    console.error("[API /api/tiktok-stats] Error:", err);

    const cachedFollower = await getCachedTikTokStats();
    if (cachedFollower) {
      return NextResponse.json(
        {
          followers_raw: cachedFollower.followers,
          likes_raw: cachedFollower.likes,
          source: "cached",
          updated_at: new Date().toISOString(),
        } satisfies TikTokStatsResponse,
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, s-maxage=3600",
          },
        }
      );
    }

    return NextResponse.json(
      {
        ...FALLBACK,
        updated_at: new Date().toISOString(),
      } satisfies TikTokStatsResponse,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Cache-Control": "public, s-maxage=3600",
        },
      }
    );
  }
}
