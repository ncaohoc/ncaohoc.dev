# ncaohoc.dev

Blog cá nhân của Nguyễn Lê Cao Học (Unity game developer). Astro 5, site tĩnh, deploy lên Cloudflare. Nội dung viết bằng tiếng Việt, riêng trang CV viết bằng tiếng Anh.

## Lệnh

```bash
npm run dev     # http://localhost:4321, hiện cả bài nháp
npm run build   # ra dist/, bỏ bài có draft: true
```

Chạy `npm run build` sau mỗi thay đổi để kiểm tra schema nội dung và các trang.

## Cấu trúc

- `src/site.ts`: tên site, chữ trên con dấu (`高學`), menu `NAV`, các helper `published()`, `formatDate()`, `slugify()`.
- `src/content.config.ts`: schema của các collection `blog`, `cheatsheets`, `projects`, `hobbies`, `albums`.
- `src/content/<collection>/`: bài Markdown, tên file là slug. Album: mỗi thư mục là một album, gồm `index.md` và ảnh.
- `src/data/cv.ts`: nội dung trang CV. `src/pages/cv.astro` chỉ lo giao diện. Nút tải PDF chỉ hiện khi `cv.pdf` có giá trị. Bản PDF gốc có số điện thoại nằm trong `private/` (gitignore), không đưa lên repo.
- `src/layouts/Base.astro`: khung trang, header, menu. Mục "Sở thích" tự ẩn khi chưa có bài hoặc album nào đã đăng.
- `src/layouts/Post.astro`: trang bài viết. `wide` dùng cho cheatsheet: mục lục h2 dính bên trái, vạch đỏ chạy theo mục đang đọc.
- `src/components/Seal.astro`: con dấu đỏ, có 3 kiểu `vertical` (mặc định, 高 trên 學), `square`, `single`. Favicon `public/favicon.svg` vẽ tay cùng kiểu dấu dọc.
- `src/styles/global.css`: các token màu và cỡ chữ trên `:root`, chế độ tối qua `[data-theme='dark']`.

README.md ghi cách viết bài, frontmatter và cách tạo album ảnh.

## Quy ước

- Viết văn bản tiếng Việt có dấu, câu ngắn, tự nhiên. Comment trong code cũng viết tiếng Việt.
- Dùng màu qua biến CSS (`--ink`, `--seal`, ...), không viết mã màu cứng trong component.
- Không đưa số điện thoại hay thông tin riêng tư lên trang công khai.
- File SVG/ảnh do công cụ tạo ra có thể bị nhúng metadata (ví dụ C2PA). Xoá phần đó trước khi commit.

## UI: một điểm điều khiển duy nhất (single input focus)

- Tại mọi thời điểm chỉ đúng một lớp nhận input (bàn phím, chuột, phím tắt): lớp nằm trên cùng.
- Khi popup, lightbox, menu di động hay hộp thoại mở, phần bên dưới bị khoá hoàn toàn: không giữ focus, không Tab tới được, không click được (dùng `inert` hoặc `<dialog>` modal).
- Đóng lớp trên cùng thì focus trả về đúng phần tử đã mở nó.
- Một lần bấm chỉ tác động một lớp: phím vừa đóng popup không kích hoạt tiếp trang bên dưới; phím vừa mở popup không bấm luôn phần tử đầu tiên của nó.
- Cơ chế khoá đặt ở chỗ dùng chung (một helper hoặc component modal), không cài riêng lẻ trong từng trang.
- Lớp phủ mới phải được kiểm tra: focus không thoát ra ngoài, nền bị khoá và mở lại khi đóng.
