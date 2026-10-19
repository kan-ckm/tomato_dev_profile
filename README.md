# 🌌 TomatoDevs Profile — Next.js & Tailwind CSS

Trang hồ sơ cá nhân (Bio), trưng bày dự án (Projects Showcase) và hiệu ứng 3D Armillary Sphere tương tác thời gian thực của **TomatoDevs**, được nâng cấp toàn diện sang kiến trúc **Next.js (App Router)**, **TypeScript**, và **Tailwind CSS**.

---

## ✨ Tính năng nổi bật

- **Kiến trúc Next.js App Router (SPA thực thụ)**: Chuyển trang mượt mà giữa `/` (Overview), `/projects` (Dự án) và `/clock` (3D Sphere) mà **không bao giờ làm ngắt quãng trình phát nhạc nền** nhờ `RootLayout` và `MusicPlayerContext`.
- **Dễ dàng mở rộng (Data-Driven Config)**: Toàn bộ thông tin cá nhân, mạng xã hội, thẻ liên kết (Bio Links), danh sách dự án, danh sách nhạc và thông số 3D đều được tách biệt hoàn toàn vào thư mục `src/config/`. Bạn có thể thêm dự án hoặc link mới chỉ bằng cách thêm 1 object vào file cấu hình mà không cần sửa code giao diện.
- **Giữ nguyên & tối ưu hóa các thư viện kết nối**:
  - `@upstash/redis`: Lưu trữ đệm (cache) số lượng Followers & Likes TikTok với cơ chế khởi tạo an toàn (Lazy Initialization), chống ghi lặp (Write Throttling) và tự động chuyển sang bộ nhớ đệm dự phòng (In-Memory / Fallback) khi chạy local chưa có biến môi trường.
  - `three` (Three.js `r128`): Tái tạo hoàn chỉnh khối cầu thiên문 **3D Armillary Sphere** với Custom GLSL Shaders, hiệu ứng hạt (Particle System), vòng xoay phân mảnh (Fragmented Rings) và kéo xoay vật lý Quaternion.
- **Bảo mật đa lớp (Security Hardened)**:
  - Tích hợp **HTTP Security Headers** (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, `Permissions-Policy`).
  - **Rate Limiting** theo IP cho toàn bộ API (`/api/music`, `/api/tiktok-stats`).
  - Chống **Path Traversal** và loại bỏ hoàn toàn nguy cơ lộ đường dẫn hệ thống nội bộ (`process.cwd()`) hay lỗi **DOM XSS**.

---

## 📚 Tài liệu hướng dẫn đọc hiểu dự án (`docs/`)

Dự án đi kèm bộ tài liệu chi tiết bằng tiếng Việt trong thư mục [`docs/`](./docs/README.md):

1. 📖 [**Tổng quan & Hướng dẫn đọc hiểu dự án (`docs/README.md`)**](./docs/README.md) — Điểm bắt đầu để nắm bắt toàn bộ dự án trong 5 phút.
2. 🏗️ [**Kiến trúc hệ thống & Luồng hoạt động (`docs/ARCHITECTURE.md`)**](./docs/ARCHITECTURE.md) — Giải thích chi tiết từng thư mục, luồng chạy của trình phát nhạc, API TikTok/Redis và động cơ 3D Three.js.
3. 🛠️ [**Hướng dẫn Mở rộng & Tùy chỉnh (`docs/CUSTOMIZATION.md`)**](./docs/CUSTOMIZATION.md) — Cầm tay chỉ việc cách thêm link, thêm dự án, thêm nhạc MP3, đổi giao diện Tailwind và tinh chỉnh khối cầu 3D.
4. 🛡️ [**Bảo mật & Biến môi trường (`docs/SECURITY.md`)**](./docs/SECURITY.md) — Chi tiết các lớp bảo mật đã được nâng cấp so với phiên bản HTML/JS thuần trước đây.

---

## 🚀 Hướng dẫn cài đặt & chạy nhanh

### 1. Cài đặt thư viện
```bash
npm install
```

### 2. Cấu hình biến môi trường (Tùy chọn khi chạy Local)
Sao chép file `.env.example` thành `.env.local`:
```bash
cp .env.example .env.local
```
> **Lưu ý:** Ngay cả khi bạn **chưa** điền `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN` vào `.env.local`, dự án vẫn chạy hoàn toàn bình thường nhờ cơ chế fallback thông minh trong `src/lib/redis.ts`.

### 3. Chạy môi trường phát triển (Development)
```bash
npm run dev
```
Mở trình duyệt tại `http://localhost:3000`.

### 4. Kiểm tra kiểu dữ liệu & Build Production
```bash
npm run typecheck
npm run build
npm run start
```

---

## 📂 Cấu trúc thư mục tóm tắt

```text
profiletomato/
├── public/
│   └── assets/                  # Tài nguyên tĩnh (ảnh, avatar, icon dự án, nhạc .mp3, favicon)
├── src/
│   ├── app/                     # Next.js App Router (Layout, Pages, API Routes)
│   │   ├── api/music/           # API tự động quét danh sách nhạc MP3
│   │   ├── api/tiktok-stats/    # API lấy thống kê TikTok + bộ đệm Upstash Redis
│   │   ├── clock/               # Trang /clock (3D Armillary Sphere)
│   │   ├── projects/            # Trang /projects (Projects Showcase)
│   │   ├── globals.css          # Tailwind CSS & Custom Keyframe Animations
│   │   ├── layout.tsx           # Root Layout giữ nhạc và nền chạy xuyên suốt
│   │   └── page.tsx             # Trang chủ / (Bio Overview)
│   ├── components/              # Các React Component chia theo tính năng
│   │   ├── background/          # Nền Gradient Gooey & Chữ chạy CRT Flicker
│   │   ├── clock/               # Component Three.js 3D Armillary Sphere
│   │   ├── layout/              # Thanh điều hướng BottomNav & ClientShell
│   │   ├── player/              # Hệ thống phát nhạc (Context, Sidebar, Floating, Modal)
│   │   ├── profile/             # Sidebar hồ sơ, thẻ LinkCard, thẻ TikTokCard
│   │   └── projects/            # Thẻ ProjectCard & Lưới/Slider ProjectsShowcase
│   ├── config/                  # Nơi chứa dữ liệu cấu hình để dễ dàng mở rộng
│   ├── lib/                     # Tiện ích kết nối Upstash Redis, Bảo mật & Format
│   └── types/                   # Định nghĩa kiểu dữ liệu TypeScript
└── docs/                        # Tài liệu hướng dẫn đọc hiểu dự án chi tiết
```

---
*Developed by **TomatoDevs***
