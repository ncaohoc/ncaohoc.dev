# ncaohoc.dev

Blog cá nhân của Nguyễn Lê Cao Học, làm bằng [Astro](https://astro.build), deploy lên Cloudflare.

## Chạy trên máy

```bash
npm install
npm run dev      # mở http://localhost:4321
npm run build    # build ra thư mục dist/
```

Cần Node.js 20 trở lên.

## Viết bài mới

Tạo file Markdown trong đúng thư mục, tên file chính là đường dẫn:

| Loại | Thư mục | Đường dẫn |
| --- | --- | --- |
| Blog | `src/content/blog/` | `/blog/<tên-file>/` |
| Cheatsheet | `src/content/cheatsheets/` | `/cheatsheets/<tên-file>/` |
| Dự án | `src/content/projects/` | `/projects/<tên-file>/` |
| Sở thích | `src/content/hobbies/` | `/hobbies/<tên-file>/` |

Phần đầu file (frontmatter):

```yaml
---
title: Tiêu đề
description: Một câu mô tả ngắn
date: 2026-10-28
tags: [Unity, Shader]
draft: true        # bỏ dòng này khi muốn đăng
---
```

Dự án có thêm `status` (`Đang làm`, `Hoàn thành`, `Tạm dừng`), `stack`, `repo`, `link` và `order` (số nhỏ xếp trước).

Cheatsheet có mục lục bên trái lấy từ các mục `##`, nên mỗi mục nên ngắn và độc lập.

## Thêm bài bằng form (Pages CMS)

Không muốn sửa file thì dùng [Pages CMS](https://app.pagescms.org): đăng nhập bằng GitHub, chọn repo `ncaohoc/ncaohoc.dev`, rồi thêm hoặc sửa bài bằng form. Cấu hình nằm trong `.pages.yml`.

- Mỗi lần bấm lưu, Pages CMS tạo một commit trên `main`, Cloudflare tự build lại site sau 1–2 phút.
- Ô "Tên file" khi tạo bài chính là đường dẫn. Nên sửa thành chữ không dấu, nối bằng gạch ngang, ví dụ `sai-gon-mua-mua`.
- Ảnh tải lên nằm trong `src/assets/uploads/`.
- Tick "Bản nháp" thì bài chưa hiện trên site.

## Sở thích và ảnh

Bài về sở thích nằm trong `src/content/hobbies/`, frontmatter có thêm:

```yaml
category: Nhiếp ảnh      # hoặc Mô hình... mỗi chủ đề tự thành một mục
gear: [OM-3, 12-45mm]    # máy, ống kính, kit...
cover: ../../assets/uploads/anh-bia.jpg   # tuỳ chọn
```

Ảnh dùng trong bài và ảnh bìa để trong `src/assets/uploads/`, ghi đường dẫn tương đối từ file bài: `../../assets/uploads/<tên-file>`.

### Album ảnh

Mỗi album là một file trong `src/content/albums/`. Tên file là đường dẫn của album: `sai-gon-mua-mua.md` -> `/hobbies/anh/sai-gon-mua-mua/`. Ảnh để trong `src/assets/uploads/` và liệt kê trong `photos`:

```yaml
title: Sài Gòn mùa mưa
description: Một câu mô tả
date: 2026-10-20
camera: Fujifilm X-T50   # ghi tự do; trang Ảnh tự tạo nút lọc theo các máy đã ghi
lens: XF 27mm f/2.8      # tuỳ chọn
location: Quận 1         # tuỳ chọn
photos:
  - ../../assets/uploads/01-cau-thu-thiem.jpg
  - ../../assets/uploads/02-ben-xe-buyt.jpg
  - ../../assets/uploads/DSCF4410.jpg
cover: ../../assets/uploads/02-ben-xe-buyt.jpg  # tuỳ chọn, mặc định ảnh đầu tiên
```

- Ảnh hiện theo đúng thứ tự trong `photos`.
- Tên file thành chú thích: `01-cau-thu-thiem.jpg` hiện là "cau thu thiem". Giữ tên gốc của máy (DSCF4410.jpg) thì không có chú thích.
- Một album trộn nhiều máy cũng được, ghi `camera: X-T50, OM-3`.
- Site tự nén và tạo nhiều cỡ ảnh khi build. Dù vậy nên xuất ảnh khoảng 2500–3000px cạnh dài trước khi tải lên, để repo không phình to và build nhanh hơn.

## Sửa CV

Toàn bộ nội dung CV nằm trong `src/data/cv.ts`. Tìm các dòng `TODO` để điền. Trên trang `/cv/` có nút **In / Lưu PDF**, bản in đã được căn cho khổ A4.

## Đổi màu, font

Màu và cỡ chữ nằm ở đầu `src/styles/global.css`. Tên, mô tả site và menu nằm trong `src/site.ts`.

## Deploy lên Cloudflare

1. Đẩy thư mục này lên một repo GitHub.
2. Vào Cloudflare dashboard, chọn **Workers & Pages**, tạo mới và kết nối với repo đó.
3. Thiết lập build: lệnh `npm run build`, thư mục output `dist`.
4. Sau khi deploy xong, vào **Custom domains** của project, thêm `ncaohoc.dev` (và `www.ncaohoc.dev` nếu muốn). Domain mua ở Cloudflare nên DNS và HTTPS được cấu hình tự động.

Từ đó, mỗi lần push lên nhánh chính là site tự build lại.
