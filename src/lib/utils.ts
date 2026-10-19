/**
 * Gộp các class CSS/Tailwind một cách an toàn
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Định dạng số lượng lớn thành dạng rút gọn (VD: 113799 -> 113.8K, 4082986 -> 4.1M)
 */
export function formatShort(num: number | undefined | null): string {
  if (!num || isNaN(num)) return "0";
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toLocaleString("en-US");
}

/**
 * Định dạng thời gian giây sang chuỗi M:SS (VD: 125 -> 2:05)
 */
export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}
