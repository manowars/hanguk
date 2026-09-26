# Hanguk

App web (PWA) luyện tiếng Hàn cho giảng viên/nhà nghiên cứu: nghe, nói, đọc, viết, từ vựng. Bài học do Claude tạo theo ba bối cảnh (giảng dạy, thuyết trình, thảo luận công việc) và theo lĩnh vực của bạn.

- Chạy trên điện thoại qua Chrome, cài lên màn hình chính ("Add to Home screen").
- Không có server. App gọi thẳng Claude API bằng key bạn dán trong Cài đặt. Key chỉ nằm trong máy bạn.
- Dữ liệu (bài đã làm, thẻ từ vựng) lưu trong máy. Có xuất/nhập JSON.

## Chạy trên máy tính

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định `http://localhost:5173/hanguk/`).

## Kiểm tra

```bash
npm test
npm run typecheck
npm run build
```

`npm run build` tạo thư mục `dist/` gồm cả service worker và manifest.

## Đưa lên GitHub Pages

1. Tạo repo GitHub tên `hanguk` (public). Push nhánh `main`.
2. Trong repo: Settings → Pages → Source chọn **GitHub Actions**.
3. Mỗi lần push `main`, workflow `.github/workflows/pages.yml` tự chạy test, build và deploy.
4. Link app: `https://<tên-tài-khoản>.github.io/hanguk/`.

Nếu đổi tên repo, sửa `base` trong `vite.config.ts` và `start_url` trong manifest cho khớp.

## Lấy API key

1. Vào https://console.anthropic.com/settings/keys, tạo key mới.
2. Mở app → ⚙️ → dán key → Lưu.

Model mặc định là Claude Sonnet 5. Một bài học tốn khoảng 2-5 nghìn token, tức vài chục won.

## Cấu trúc

```
src/api/         gọi Claude (claude.ts) và prompt cho từng kỹ năng (prompts/)
src/speech/      đọc văn bản (tts.ts) và nhận giọng nói (stt.ts)
src/store/       cài đặt, IndexedDB, SRS (SM-2), cập nhật trình độ
src/lib/diff.ts  so sánh câu nói với câu gốc
src/modules/     giao diện từng kỹ năng
src/pages/       trang chủ, cài đặt
tests/           Vitest cho phần logic thuần
docs/            spec, kế hoạch, checklist QA
```
