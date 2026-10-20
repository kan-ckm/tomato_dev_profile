import Link from "next/link";

export default function NotFound() {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <div className="rounded-panel border border-white/[0.08] bg-white/[0.03] p-8 shadow-panel backdrop-blur-md max-w-md w-full">
        <h1 className="font-display text-6xl font-extrabold text-white tracking-tight">404</h1>
        <h2 className="mt-3 font-display text-lg font-bold text-white">Page Not Found</h2>
        <p className="mt-2 text-xs text-muted leading-relaxed">
          Trang bạn tìm kiếm không tồn tại hoặc đã được tạm ẩn.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-2.5 font-display text-xs font-semibold text-white transition-all duration-300 hover:scale-105 hover:bg-white/20"
        >
          ← Trở về Trang chủ
        </Link>
      </div>
    </div>
  );
}
