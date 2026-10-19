# 🛡️ Tài Liệu Bảo Mật & Biến Môi Trường (`SECURITY.md`)

Trong quá trình chuyển dịch sang **Next.js**, toàn bộ mã nguồn đã được rà soát bảo mật (Security Audit) và gia cố theo tiêu chuẩn ứng dụng web hiện đại.

---

## 1. Các lỗ hổng ở phiên bản cũ đã được khắc phục

| STT | Vấn đề ở bản HTML/JS cũ | Giải pháp bảo mật ở bản Next.js mới |
| :-: | :--- | :--- |
| **1** | **Lộ thông tin máy chủ (Information Disclosure)** trong `api/music.js`: Khi thiếu thư mục nhạc hoặc gặp lỗi, API cũ trả về trực tiếp `process.cwd()`, đường dẫn tuyệt đối của ổ cứng server và `error.message` thô cho client. | Trong `src/app/api/music/route.ts`, mọi lỗi nội bộ chỉ được ghi log phía server (`console.error`) và trả về danh sách nhạc dự phòng (`fallbackPlaylist`), tuyệt đối không lộ cấu trúc thư mục máy chủ. |
| **2** | **DOM-based XSS** trong `assets/js/components/player.js`: Sử dụng `item.innerHTML = ...` để chèn trực tiếp tên bài hát từ API vào cây DOM mà không lọc ký tự HTML. | Chuyển hoàn toàn sang **React JSX** (`PlayerPanel.tsx`, `MobilePlaylistModal.tsx`), tự động escape mọi chuỗi ký tự đầu vào. |
| **3** | **Thực thi Script tùy ý (Script Injection)** trong `assets/js/core/router.js`: Hàm `injectScripts(doc)` tự động tạo thẻ `<script>` từ nội dung HTML tải về. | Loại bỏ hoàn toàn `router.js` thủ công, sử dụng cơ chế định tuyến an toàn của **Next.js App Router**. |
| **4** | **Nguy cơ cạn kiệt hạn mức Upstash Redis (Quota Exhaustion)** trong `api/tiktok-stats.js`: Mỗi lượt gọi API đều thực hiện `redis.set` ghi đè dữ liệu lên Redis và mở `Access-Control-Allow-Origin: *` không giới hạn. | Bổ sung **Rate Limiting theo IP** (`src/lib/security.ts`), **Write Throttling** (chỉ ghi lên Redis tối đa 10 phút/lần trong `src/lib/redis.ts`), và kiểm soát CORS qua biến môi trường `ALLOWED_ORIGIN`. |
| **5** | **Treo kết nối Serverless (Hanging Request)**: Lệnh `fetch` tới TikTok không có thời gian chờ tối đa (timeout). | Áp dụng `AbortSignal.timeout(8000)` tự động ngắt kết nối sau 8 giây nếu TikTok phản hồi chậm, chuyển ngay sang dữ liệu Redis Cache. |

---

## 2. Hệ thống HTTP Security Headers (`next.config.mjs`)

Mọi phản hồi từ ứng dụng đều được đính kèm các Header bảo mật tự động trong [`next.config.mjs`](../next.config.mjs):

- **`Content-Security-Policy (CSP)`**: Giới hạn nguồn tải Script, Font (Google Fonts), Media, và kết nối API (`self`, Upstash), ngăn chặn tấn công Cross-Site Scripting (XSS) và Data Injection.
- **`X-Frame-Options: SAMEORIGIN`** & **`frame-ancestors 'self'`**: Chống tấn công Clickjacking (ngăn trang web lạ nhúng hồ sơ của bạn vào thẻ `<iframe>` ẩn).
- **`X-Content-Type-Options: nosniff`**: Ngăn trình duyệt tự ý đoán sai kiểu MIME của file tĩnh.
- **`Strict-Transport-Security (HSTS)`**: Bắt buộc trình duyệt luôn kết nối qua giao thức mã hóa HTTPS.
- **`Permissions-Policy`**: Vô hiệu hóa quyền truy cập Camera, Microphone và Geolocation không cần thiết.
- **`poweredByHeader: false`**: Ẩn header `X-Powered-By: Next.js` để tránh lộ thông tin framework cho các công cụ dò quét tự động.

---

## 3. Hướng dẫn cấu hình Biến môi trường (`.env.local`)

Tất cả các khóa bí mật được quản lý qua biến môi trường phía Server và đã được chặn trong `.gitignore`.

Khi triển khai lên **Vercel** (hoặc chạy dưới máy cá nhân với file `.env.local`), bạn có thể cấu hình các biến sau (xem mẫu tại [`.env.example`](../.env.example)):

| Tên biến môi trường | Bắt buộc? | Mô tả |
| :--- | :---: | :--- |
| `UPSTASH_REDIS_REST_URL` | Tùy chọn* | URL REST API của cơ sở dữ liệu Upstash Redis dùng để lưu cache thống kê TikTok. |
| `UPSTASH_REDIS_REST_TOKEN` | Tùy chọn* | Token xác thực của Upstash Redis. *(Lưu ý: Tuyệt đối không thêm tiền tố `NEXT_PUBLIC_` để tránh lộ token ra trình duyệt).* |
| `ALLOWED_ORIGIN` | Tùy chọn | Tên miền được phép gọi API (VD: `https://tomatodevs.com`). Nếu để trống, mặc định cho phép `*`. |
| `TIKTOK_USERNAME` | Tùy chọn | Username TikTok cần lấy thống kê (Mặc định: `tomatodevs`). |

> *\*Nếu không cấu hình `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`, module `src/lib/redis.ts` sẽ tự động chuyển sang dùng bộ nhớ đệm trên RAM và số liệu dự phòng mà không báo lỗi.*
