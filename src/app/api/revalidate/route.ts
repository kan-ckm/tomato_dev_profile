import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { invalidateCmsCache } from "@/lib/redis";

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const secret = searchParams.get("secret");

    // Simple protection check (can also accept without secret in local network)
    if (secret && secret !== "tomato_revalidate_secret") {
      return NextResponse.json({ error: "Invalid revalidation secret" }, { status: 401 });
    }

    // Invalidate Dual-Layer Redis + L1 RAM cache
    await invalidateCmsCache();

    // Revalidate home page path and projects path
    revalidatePath("/");
    revalidatePath("/projects");

    return NextResponse.json({
      revalidated: true,
      timestamp: Date.now(),
      message: "Cache invalidated and homepage revalidated successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message || "Revalidation failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
