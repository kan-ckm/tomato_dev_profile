# 📖 Tài liệu Đọc Hiểu Dự Án (Project Documentation)

Chào mừng bạn đến với tài liệu kỹ thuật của dự án **TomatoDevs Profile (Next.js + Tailwind CSS)**. Bộ tài liệu này được biên soạn để giúp bạn nắm rõ toàn bộ cách tổ chức mã nguồn, nguyên lý hoạt động của từng thành phần, cách mở rộng tính năng và cơ chế bảo mật của hệ thống.

---

## 🧭 Mục lục tài liệu

1. [**Tổng quan & So sánh chuyển dịch (Trang này)**](./README.md)
2. [**Kiến trúc hệ thống & Luồng dữ liệu (`ARCHITECTURE.md`)**](./ARCHITECTURE.md)
3. [**Hướng dẫn mở rộng & Tùy chỉnh (`CUSTOMIZATION.md`)**](./CUSTOMIZATION.md)
4. [**Cơ chế bảo mật & Cấu hình môi trường (`SECURITY.md`)**](./SECURITY.md)
5. [**Hướng dẫn Thiết lập & Kết nối Cloudflare R2 (`CLOUDFLARE_R2.md`)**](./CLOUDFLARE_R2.md)

---

## 1. Tại sao lại chuyển dịch sang Next.js & Tailwind CSS?

Trước khi nâng cấp, mã nguồn gốc sử dụng HTML/CSS/JS thuần (`index.html`, `projects.html`, `clock.html`) kèm theo một bộ định tuyến tự viết (`assets/js/core/router.js`) dùng `fetch()` tải file HTML rồi cắt ghép DOM để giữ cho thẻ `<audio id="bg-music">` không bị tắt khi chuyển trang.

Cách làm cũ gặp một số hạn chế:
- **Khó mở rộng**: Muốn thêm 1 dự án hay 1 đường dẫn Bio phải sửa trực tiếp vào file HTML dài hàng trăm dòng, đồng thời phải nhớ thêm dấu chấm phân trang (`<span class="dot">`) cho giao diện mobile.
- **Lặp mã nguồn (Code Duplication)**: Toàn bộ code của `<head>`, `.gradient-bg`, `.bg-text-strip`, `.music-player`, `.bottom-nav` và `.mobile-playlist-modal` bị copy-paste lặp lại ở cả 3 file `index.html`, `projects.html` và `clock.html`.
- **Rủi ro bảo mật**: Việc chèn chuỗi trực tiếp qua `innerHTML` trong trình phát nhạc và tự động thực thi thẻ `<script>` khi chuyển trang SPA tiềm ẩn nguy cơ XSS; API cũ trả về trực tiếp `process.cwd()` khi lỗi.

### Giải pháp với Next.js App Router + Tailwind CSS:
| Khía cạnh | Phiên bản cũ (HTML/JS thuần) | Phiên bản mới (Next.js + Tailwind CSS) |
| :--- | :--- | :--- |
| **Chuyển trang giữ nhạc** | Tự viết `router.js` dùng `DOMParser` thay thế DOM thủ công | Sử dụng **Next.js Root Layout (`src/app/layout.tsx`)** và **React Context (`MusicPlayerContext`)** giữ trình phát nhạc sống xuyên suốt mọi route một cách tự nhiên. |
| **Quản lý dữ liệu** | Hardcode rải rác trong HTML & JS | Tập trung 100% tại **`src/config/`** với kiểu dữ liệu TypeScript rõ ràng. |
| **Styling (Giao diện)** | 1 file `style.css` dài hơn 2.300 dòng | Kết hợp **Tailwind CSS** (`tailwind.config.ts`) trên từng Component và `globals.css` gọn gàng cho các hiệu ứng Shader/Keyframes phức tạp. |
| **Thư viện kết nối** | `@upstash/redis` (API), `three.min.js` (CDN) | Giữ nguyên **`@upstash/redis`** (bọc thêm lớp an toàn `src/lib/redis.ts`) và tích hợp **`three` (r128)** trực tiếp vào React Component có dọn dẹp bộ nhớ WebGL khi thoát trang. |
| **Tương thích URL cũ** | `/index.html`, `/projects.html`, `/clock.html` | Hỗ trợ cả URL đẹp (`/`, `/projects`, `/clock`) lẫn tự động chuyển hướng (Redirect 308) từ các URL `.html` cũ. |

---

## 2. Bản đồ đọc mã nguồn (Nên đọc file nào trước?)

Nếu bạn muốn tìm hiểu dự án từ đầu đến cuối, hãy đọc theo thứ tự 4 bước sau:

### Bước 1: Xem tầng cấu hình dữ liệu (`src/config/`)
Đây là nơi chứa toàn bộ nội dung hiển thị trên trang web:
- `src/config/profile.config.ts`: Tên, tiểu sử (bio), avatar, ảnh bìa, danh sách nút mạng xã hội và thông tin TikTok.
- `src/config/links.config.ts`: Danh sách 8 thẻ liên kết (Afdian, MCModels, Patreon, X, Discord, GitHub, Shader, Ko-fi).
- `src/config/projects.config.ts`: Danh sách các dự án (Freesia II, EcoLens, Sudden-Death, Orbitalstrike).
- `src/config/music.config.ts`: Bài hát mặc định và danh sách nhạc dự phòng.
- `src/config/clock.config.ts`: Thông số ánh sáng, tốc độ xoay, số lượng hạt và vòng nhẫn của khối cầu 3D.

### Bước 2: Xem khung xương ứng dụng (`src/app/layout.tsx` & `ClientShell.tsx`)
- `src/app/layout.tsx`: Khai báo Metadata SEO, OpenGraph, nạp Google Fonts và bọc toàn bộ trang trong `<ClientShell>`.
- `src/components/layout/ClientShell.tsx`: Giữ cho nền động (`AnimatedBackground`), chữ chạy (`BgTextStrip`), trình phát nhạc (`MusicPlayerProvider` + `FloatingPlayer` + `MobilePlaylistModal`) và thanh điều hướng (`BottomNav`) luôn tồn tại cố định khi người dùng chuyển giữa các trang.

### Bước 3: Xem 3 trang chính (`src/app/`)
- **Trang chủ (`/`)** — `src/app/page.tsx`: Ghép cột trái (`ProfileSidebar`) và cột phải (`LinkCard` + `TikTokCard` + Footer).
- **Trang Dự án (`/projects`)** — `src/app/projects/page.tsx`: Gọi component `ProjectsShowcase` hiển thị lưới 4 cột trên Desktop và trình trượt (Carousel Slider) trên Mobile.
- **Trang Clock 3D (`/clock`)** — `src/app/clock/page.tsx`: Gọi component `CoreBlock3D` khởi tạo cảnh 3D bằng Three.js.

### Bước 4: Xem các API Backend (`src/app/api/`)
- `src/app/api/music/route.ts`: Tự động đọc thư mục `public/assets/music/`, lọc các file `.mp3` hợp lệ và tách tên Nghệ sĩ / Tên bài hát.
- `src/app/api/tiktok-stats/route.ts`: Lấy số lượng Followers & Likes mới nhất từ TikTok, kết hợp đọc/ghi bộ nhớ đệm qua `@upstash/redis` (`src/lib/redis.ts`).
