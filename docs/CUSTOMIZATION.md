# 🛠️ Hướng Dẫn Mở Rộng & Tùy Chỉnh Dự Án (`CUSTOMIZATION.md`)

Kiến trúc mới được thiết kế theo hướng **Data-Driven (Hướng dữ liệu)**. Bạn có thể thay đổi nội dung hoặc mở rộng tính năng chỉ bằng cách chỉnh sửa các file trong `src/config/` mà không cần can thiệp sâu vào code React.

---

## 1. Thay đổi thông tin cá nhân & Mạng xã hội

Mở file [`src/config/profile.config.ts`](../src/config/profile.config.ts):

```ts
export const profileConfig: ProfileConfig = {
  username: "TOMATODEVS",
  handle: "@TomatoDevs · MixelArt",
  greeting: "ごきげんよう。",
  roleBold: "Member of MixelArt",
  roleSuffix: " — YSM custom model.",
  collabText: "DM for collabs: discord",
  discordHandle: "@TomatoDevs",
  discordUrl: "https://discord.com/users/883689446422220821",
  avatarSrc: "/assets/avatar/avatar.webp",
  coverSrc: "/assets/images/cover.webp",
  // ...
};
```
- **Đổi ảnh đại diện / ảnh bìa**: Chỉ cần thay file ảnh trong `public/assets/avatar/avatar.webp` hoặc `public/assets/images/cover.webp`, hoặc đổi đường dẫn trong `profileConfig`.
- **Thêm/sửa nút mạng xã hội dưới tiểu sử**: Chỉnh sửa mảng `socialLinks` ngay bên dưới trong cùng file `src/config/profile.config.ts`.

---

## 2. Thêm hoặc chỉnh sửa thẻ liên kết (Bio Links)

Mở file [`src/config/links.config.ts`](../src/config/links.config.ts) và thêm một phần tử mới vào mảng `bioLinks`:

```ts
{
  id: "link-youtube",
  title: "TomatoDevs Official YouTube",
  subtitle: "youtube.com/@tomatodevs",
  url: "https://youtube.com/@tomatodevs",
  iconSrc: "/assets/link/youtube.webp", // Đặt ảnh icon vào public/assets/link/
  iconBg: "linear-gradient(135deg, #ff0000, #990000)",
  fallbackEmoji: "▶️", // Hiển thị tự động nếu ảnh icon chưa tồn tại
}
```
Giao diện trang chủ sẽ tự động render thẻ mới kèm hiệu ứng xuất hiện tuần tự (`animation-delay`) và hiệu ứng nghiêng icon khi di chuột.

---

## 3. Thêm dự án mới vào trang `/projects`

Mở file [`src/config/projects.config.ts`](../src/config/projects.config.ts) và thêm một object vào mảng `projectsConfig`:

```ts
{
  id: "my-new-project",
  title: "Project X",
  description: "Mô tả ngắn gọn về dự án mới của bạn.",
  badgeType: "plugin",        // "proxy" | "android" | "plugin"
  badgeLabel: "Plugin",
  glowVariant: "freesia",     // "freesia" (hồng) | "ecolens" (xanh lá) | "sudden" (tím) | "orbital" (đỏ)
  iconSrc: "/assets/project_icon/projectx.webp",
  languages: ["TypeScript", "Next.js"],
  repoUrl: "https://github.com/TomatoDevs/ProjectX",
}
```
> **Tự động hóa hoàn toàn:** Ngay khi bạn thêm dự án vào mảng này, cả lưới Desktop lẫn bộ nút chấm tròn phân trang (`pagination-dots`) trên trình trượt Mobile sẽ tự động tính toán lại số lượng trang mà bạn không cần sửa bất kỳ dòng code giao diện nào!

---

## 4. Thêm hoặc xóa bài hát phát nền (`.mp3`)

Bạn chỉ cần **kéo thả file `.mp3` mới** vào thư mục:
```text
public/assets/music/
```
Đặt tên file theo định dạng:
- `Tên Nghệ Sĩ - Tên Bài Hát.mp3` (Ví dụ: `Instupendo - Comfort Chain.mp3`)
- Hoặc `Nghệ Sĩ 1 x Nghệ Sĩ 2 - Tên Bài Hát.mp3`

API `/api/music` (`src/app/api/music/route.ts`) sẽ **tự động quét thư mục này**, tách tên nghệ sĩ & tên bài hát và đưa vào danh sách phát.
- Nếu muốn đổi bài hát phát mặc định lần đầu tiên, hãy sửa hằng số `DEFAULT_TRACK_FILE` trong [`src/config/music.config.ts`](../src/config/music.config.ts).

---

## 5. Tùy chỉnh màu sắc & Font chữ với Tailwind CSS

Mở file [`tailwind.config.ts`](../tailwind.config.ts) và [`src/app/globals.css`](../src/app/globals.css):
- Các biến màu chủ đạo được khai báo tại `:root` trong `src/app/globals.css` và ánh xạ vào `tailwind.config.ts`:
  - `accent`: `#b289ef` (Tím Lavender chủ đạo)
  - `accent2`: `#9661ff` (Tím đậm)
  - `accent3`: `#d4a8ff` (Tím sáng)
  - `bg`: `#0b0b0f` (Đen vũ trụ)
- Khi dùng trong các Component React, bạn có thể viết trực tiếp các class Tailwind như `bg-accent`, `text-accent3`, `border-border-hover`, `font-display`, `font-numeric`, `rounded-panel`...

---

## 6. Tùy chỉnh khối cầu 3D trên trang `/clock`

Mở file [`src/config/clock.config.ts`](../src/config/clock.config.ts) để điều chỉnh góc nhìn hoặc độ chi tiết của khối cầu 3D:
- `zoom`: Khoảng cách camera (Mặc định: `22` — càng nhỏ càng gần).
- `speed`: Tốc độ tự xoay (Mặc định: `0.6`).
- `ringAmount`: Số lượng vòng đá bao quanh (Mặc định: `3`, có thể tăng lên `4`–`6`).
- `particleAmount`: Số lượng hạt bụi sao (Mặc định: `3500`).

---

## 7. Cách tạo thêm một trang mới (Ví dụ: `/blog` hoặc `/contact`)

1. Tạo file `src/app/blog/page.tsx`:
   ```tsx
   export default function BlogPage() {
     return (
       <main className="relative z-10 mx-auto max-w-4xl px-6 py-16 text-white">
         <h1 className="font-display text-4xl font-bold">Blog</h1>
       </main>
     );
   }
   ```
2. Mở [`src/components/layout/BottomNav.tsx`](../src/components/layout/BottomNav.tsx) và thêm `{ href: "/blog", label: "Blog", icon: ... }` vào mảng `NAV_ITEMS`.
3. Trình phát nhạc nền và hiệu ứng nền sẽ tự động hoạt động trên trang mới mà không cần cấu hình gì thêm!
