---
title: Bức Màn Sắt
description: Game xe tăng bắn nhau thời Chiến tranh Lạnh, góc nhìn 2.5D xoay được, chọn phe NATO hoặc Khối Warszawa.
date: 2026-11-27
play: /games/buc-man-sat/index.html
aspect: 16 / 9
controls: Bàn phím và chuột
stack: [Unity 6, URP, WebGL]
tags: [Unity, Sprite stacking, Game]
cover: ../../assets/uploads/buc-man-sat.png
---

Bảo vệ sở chỉ huy và tiêu diệt 20 xe tăng địch mỗi màn, kiểu các game tank arcade 8-bit ngày trước. Game không đứng về phe nào: bạn chọn NATO hoặc Khối Warszawa, bot luôn là phe còn lại.

Đồ hoạ dùng kỹ thuật **sprite stacking**: mỗi mô hình voxel được cắt thành nhiều lát 2D, mỗi lát là một mặt phẳng đặt đúng độ cao của nó trong không gian 3D, nên camera xoay góc nào cũng đúng. Xe tăng được dựng bằng code theo kích thước thật lấy từ thông số và bản vẽ blueprint: số bánh xích, tấm giáp nghiêng, kiểu tháp pháo, ống hút khói trên nòng... Mọi hình ảnh và âm thanh đều sinh ra lúc chạy, không có file asset nào.

## Điều khiển

| Phím | Hành động |
| --- | --- |
| W / S | Tiến / lùi |
| A / D | Xoay thân xe |
| Chuột | Xoay tháp pháo |
| Chuột trái, Space | Bắn |
| Q / E, giữ chuột phải kéo | Xoay camera |
| Lăn chuột | Phóng to / thu nhỏ |
| Esc | Tạm dừng |

Ở menu, bấm vào phe và xe muốn chơi, bấm lại vào xe đã chọn (hoặc nút **Bắt đầu**) để vào trận.

## Hai phe

| Vai trò | NATO | Khối Warszawa |
| --- | --- | --- |
| Nhanh, bắn nhanh, giáp mỏng | Leopard 1 | T-55 |
| Cân bằng, chịu được 2 phát | M48 Patton | T-62 |
| Chậm, pháo xuyên được tường thép | Chieftain | T-10M |

Bot của phe đối địch có 4 loại: xe cơ bản, xe hạng nhẹ rất nhanh, xe pháo mạnh và xe hạng nặng cần 4 phát mới hạ được.

## Luật chơi

- Sở chỉ huy bị bắn trúng là thua.
- Gạch vỡ khi trúng đạn, thép chỉ vỡ khi trúng đạn xuyên, nước chặn xe nhưng đạn bay qua, rừng che khuất xe.
- Xe địch nhấp nháy đỏ rơi ra hộp tiếp tế khi bị bắn trúng: nâng cấp pháo, khiên, không kích, gia cố sở chỉ huy, đóng băng địch, thêm mạng.
- 4 màn thiết kế sẵn, sau đó là các màn sinh ngẫu nhiên khó dần.
