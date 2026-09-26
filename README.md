# Hanguk

App web (PWA) luyện tiếng Hàn cho giảng viên/nhà nghiên cứu: nghe, nói, đọc, viết, từ vựng. Bài học do Claude tạo theo ba bối cảnh (giảng dạy, thuyết trình, thảo luận công việc) và theo lĩnh vực của bạn.

- Chạy trên điện thoại qua Chrome, cài lên màn hình chính ("Add to Home screen").
- Không có server. App gọi thẳng Claude API bằng key bạn dán trong Cài đặt. Key chỉ nằm trong máy bạn.
- Dữ liệu (bài đã làm, thẻ từ vựng) lưu trong máy. Có xuất/nhập JSON.

## Cài APK lên điện thoại Android

Mỗi lần push, workflow `.github/workflows/android.yml` build file `hanguk.apk`.

1. GitHub → tab **Actions** → chọn lần chạy "Build Android APK" mới nhất → tải artifact `hanguk-apk` (file zip, giải nén ra `hanguk.apk`). Với nhánh `main`, APK cũng có ở **Releases → apk-latest**.
2. Mở file trên điện thoại, cho phép "Cài ứng dụng không rõ nguồn gốc".
3. Lần đầu bấm mic, cho phép quyền Micrô. Nếu nghe/nói tiếng Hàn không chạy: cài **Speech Services by Google** và tải dữ liệu giọng Hàn (Cài đặt → Hệ thống → Ngôn ngữ → Chuyển văn bản thành giọng nói).

APK dùng mic và giọng đọc của Android (plugin Capacitor) vì WebView không có Web Speech API. Mọi APK dùng cùng một khóa ký nên bản mới cài đè bản cũ, không mất dữ liệu.

Build tại máy (cần Android SDK + JDK 21): `npm run build:android && cd android && ./gradlew assembleDebug`.

## Tập bài giảng

Mục 🎓 trên trang chủ: dán bài giảng/thuyết trình (tiếng Hàn tự viết, tiếng Việt hay dàn ý) → Claude liệt kê lỗi kèm giải thích, viết lại thành lời nói 합니다체 chia từng đoạn ngắn kèm mẹo phát âm → bạn nghe mẫu, nói từng đoạn (có chế độ ẩn chữ để tập thuộc), app so từng chữ với kịch bản → cuối buổi Claude nhận xét lỗi từng đoạn, từ phát âm sai (dựa vào chữ máy nghe nhầm), cách trình bày, và gợi ý cụm nên lưu vào thẻ ôn.

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
src/modules/     giao diện từng kỹ năng (rehearse/ = tập bài giảng)
android/         dự án Android (Capacitor)
src/pages/       trang chủ, cài đặt
tests/           Vitest cho phần logic thuần
docs/            spec, kế hoạch, checklist QA
```
