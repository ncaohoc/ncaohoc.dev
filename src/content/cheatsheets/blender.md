---
title: "Blender từ cơ bản đến nâng cao"
description: "Phím tắt, modeling, modifier, vật liệu và UV, ánh sáng và render, rigging, Geometry Nodes và lỗi thường gặp."
date: 2026-10-01
tags: [Blender, 3D, Modeling]
---

## 1. Giao diện & điều hướng

Nắm vững cách xoay, zoom và các góc nhìn numpad trước tiên; mọi thao tác khác đều dựa trên đó. Cheatsheet áp dụng cho Blender 4.x trở lên, keymap mặc định, chuột trái để chọn.

**Các vùng giao diện chính**

| Vùng | Chức năng |
| --- | --- |
| 3D Viewport | Không gian làm việc chính |
| Outliner (góc trên phải) | Cây đối tượng, collection, ẩn/hiện |
| Properties (góc dưới phải) | Thuộc tính render, object, modifier, vật liệu |
| Timeline (dưới cùng) | Khung hình, keyframe, phát animation |
| Toolbar (T) / Sidebar (N) | Công cụ bên trái / thông số transform bên phải |
| Workspaces (tab trên cùng) | Layout, Modeling, Sculpting, UV Editing, Shading, Animation, Geometry Nodes, Scripting |

**Điều hướng viewport**

| Thao tác | Phím |
| --- | --- |
| Xoay góc nhìn | Giữ chuột giữa (MMB) |
| Di chuyển (pan) | Shift + MMB |
| Zoom | Cuộn chuột / Ctrl + MMB |
| Zoom vào đối tượng đang chọn | Numpad . (dấu chấm) |
| Xem toàn bộ cảnh | Home |
| Chế độ cô lập (local view) | Numpad / |
| Góc trước / phải / trên | Numpad 1 / 3 / 7 (Ctrl để lấy góc ngược lại) |
| Phối cảnh ↔ trực giao | Numpad 5 |
| Nhìn qua camera | Numpad 0 |
| Đặt camera theo góc nhìn hiện tại | Ctrl + Alt + Numpad 0 |
| Menu góc nhìn nhanh | \~ (dấu ngã) |
| Bay tự do (walk/fly) | Shift + \~ |
| Phóng to một vùng giao diện | Ctrl + Space |
| Chế độ hiển thị (wireframe/solid/material/rendered) | Z (pie menu); Shift + Z để bật tắt wireframe |
| X-ray (nhìn xuyên) | Alt + Z |

**Laptop không có numpad hoặc chuột giữa:** vào Edit › Preferences › Input, bật *Emulate 3 Button Mouse* (Alt + chuột trái thay MMB) và *Emulate Numpad* (phím số hàng trên thay numpad).

## 2. Phím tắt Object Mode thiết yếu

G / R / S cộng với X / Y / Z và gõ số là bộ ba dùng nhiều nhất: ví dụ `R Z 90 Enter` xoay 90° quanh trục Z. Phím tắt ăn theo vị trí con trỏ chuột, nên di chuột vào đúng vùng trước khi bấm.

**Chọn & quản lý**

| Thao tác | Phím |
| --- | --- |
| Chọn / chọn thêm | Click trái / Shift + click |
| Chọn tất cả / bỏ chọn | A / Alt + A |
| Đảo vùng chọn | Ctrl + I |
| Chọn bằng khung / vòng tròn | B / C |
| Thêm đối tượng | Shift + A |
| Xóa | X hoặc Delete |
| Nhân bản (copy độc lập) | Shift + D |
| Nhân bản liên kết (dùng chung mesh) | Alt + D |
| Ẩn / hiện lại tất cả | H / Alt + H |
| Ẩn mọi thứ trừ vùng chọn | Shift + H |
| Chuyển vào collection | M |
| Gộp đối tượng | Ctrl + J |
| Đặt parent / gỡ parent | Ctrl + P / Alt + P |
| Đổi tên | F2 |
| Tìm lệnh bất kỳ | F3 |
| Hoàn tác / làm lại | Ctrl + Z / Ctrl + Shift + Z |
| Lặp lại thao tác cuối | Shift + R |

**Biến đổi (transform)**

| Thao tác | Phím |
| --- | --- |
| Di chuyển / xoay / co giãn | G / R / S |
| Khóa theo trục | Sau G/R/S bấm X, Y hoặc Z (bấm 2 lần = trục cục bộ) |
| Loại trừ một trục | Shift + X/Y/Z (ví dụ S Shift Z = co giãn trên mặt phẳng XY) |
| Nhập số chính xác | Gõ số ngay sau lệnh, Enter để xác nhận |
| Tinh chỉnh chậm | Giữ Shift khi kéo |
| Bật snap tạm thời | Giữ Ctrl khi kéo |
| Bật/tắt snapping | Shift + Tab |
| Hủy thao tác | Chuột phải hoặc Esc |
| Reset vị trí / xoay / scale | Alt + G / Alt + R / Alt + S |
| Áp dụng transform | Ctrl + A |
| Pivot point | . (dấu chấm, pie menu) |
| Menu 3D cursor & snap | Shift + S |
| Đưa 3D cursor về gốc | Shift + C |
| Đổi chế độ (Object/Edit/Sculpt…) | Tab (Object↔Edit), Ctrl + Tab (pie menu) |

**Luôn `Ctrl + A › Scale` trước khi bevel, thêm modifier, rig hay xuất file.** Scale chưa áp dụng là nguyên nhân số một gây bevel lệch, vật lý sai và texture bị kéo dãn.

## 3. Edit Mode & modeling

Phần lớn công việc modeling chỉ cần 6 lệnh: Extrude (E), Inset (I), Loop Cut (Ctrl + R), Bevel (Ctrl + B), Knife (K) và Merge (M). Bấm Tab để vào Edit Mode, rồi 1 / 2 / 3 để chọn chế độ vertex / edge / face.

**Chọn trong Edit Mode**

| Thao tác | Phím |
| --- | --- |
| Vertex / Edge / Face | 1 / 2 / 3 (hàng số trên) |
| Chọn edge loop | Alt + click |
| Chọn edge ring | Ctrl + Alt + click |
| Chọn đường ngắn nhất giữa 2 điểm | Ctrl + click |
| Chọn phần mesh liên kết | L (dưới chuột) / Ctrl + L |
| Mở rộng / thu hẹp vùng chọn | Ctrl + Numpad + / Ctrl + Numpad − |
| Chọn đối tượng tương tự | Shift + G |

**Công cụ modeling**

| Lệnh | Phím | Ghi chú |
| --- | --- | --- |
| Extrude | E | Alt + E để chọn kiểu extrude (theo normal…) |
| Inset face | I | Bấm I lần 2 để inset từng mặt riêng |
| Loop cut | Ctrl + R | Cuộn chuột để thêm số đường cắt |
| Bevel cạnh / đỉnh | Ctrl + B / Ctrl + Shift + B | Cuộn chuột để tăng segment |
| Knife | K | Giữ C để cắt thẳng góc; Z để cắt xuyên |
| Tạo cạnh / mặt | F | Giữa các đỉnh hoặc cạnh đang chọn |
| Fill (lấp lỗ) / Grid Fill | Alt + F / qua F3 | Grid Fill cho lưới đẹp hơn |
| Nối đỉnh bằng cạnh | J |  |
| Merge | M | “By Distance” để xóa đỉnh trùng |
| Tách (rip) / Phân tách thành object | V / P |  |
| Edge slide / Vertex slide | G G | Trượt đỉnh dọc cạnh, giữ hình |
| Spin / Screw | Toolbar | Tạo vật thể tròn xoay (ly, bình) |
| Subdivide | Chuột phải › Subdivide |  |
| Dissolve | X › Dissolve | Xóa mà không tạo lỗ |
| Smooth đỉnh | Chuột phải › Smooth Vertices |  |
| Tính lại normal | Shift + N | Ctrl + Shift + N để hướng vào trong |

**Proportional Editing (O):** kéo một đỉnh sẽ kéo theo vùng xung quanh mềm mại. Cuộn chuột khi đang kéo để đổi bán kính ảnh hưởng; rất hữu ích cho địa hình và vải.

**Nguyên tắc topology:** ưu tiên mặt 4 cạnh (quad); tránh n-gon trên bề mặt sẽ subdivide hoặc biến dạng; giữ edge loop chạy theo hình dáng (quanh mắt, miệng, khớp tay).

## 4. Modifiers

Modifier là lớp hiệu ứng không phá hủy: sửa mesh gốc bất cứ lúc nào, chỉ Apply khi thật sự cần. Thêm tại Properties › tab cờ lê (Modifiers); stack chạy từ trên xuống, nên thứ tự thay đổi kết quả.

| Modifier | Dùng để | Mẹo |
| --- | --- | --- |
| Subdivision Surface | Làm mịn mesh | Ctrl + 1/2/3 thêm nhanh; dùng support loop hoặc crease (Shift + E) để giữ cạnh sắc |
| Mirror | Đối xứng (nhân vật, xe) | Bật Clipping để đỉnh giữa không tách ra |
| Bevel | Bo cạnh không phá hủy | Limit Method = Angle; cần scale đã áp dụng |
| Solidify | Tạo độ dày cho mặt phẳng | Tường, vải, vỏ hộp |
| Array | Nhân bản theo hàng / vòng | Kết hợp Empty + Object Offset để xếp vòng tròn |
| Boolean | Cộng / trừ / giao hai khối | Để object cắt ở chế độ hiển thị Wire; dễ sinh n-gon |
| Weighted Normal | Shading sạch cho hard-surface | Đặt cuối stack |
| Smooth by Angle | Thay Auto Smooth cũ (từ 4.1) | Chuột phải › Shade Auto Smooth |
| Shrinkwrap | Bám mesh lên bề mặt khác | Retopology, decal |
| Decimate | Giảm số polygon | Model nặng từ scan / sculpt |
| Remesh | Tái tạo lưới đều | Trước khi sculpt |
| Displace | Đẩy bề mặt theo texture | Địa hình, nước |
| Curve / Lattice / Simple Deform | Uốn, xoắn, biến dạng | Uốn ống, dây theo curve |

**Thứ tự stack thường dùng cho hard-surface:** Mirror → Boolean → Bevel → Subdivision → Weighted Normal. Đặt Mirror trước Subdivision để đường giữa mịn liền mạch.

Ctrl + A khi di chuột lên một modifier để Apply riêng nó; bấm biểu tượng màn hình trên modifier để tắt nó trong viewport khi cảnh nặng.

## 5. Vật liệu, shader & UV

Principled BSDF gần như đủ cho mọi vật liệu thực tế; học chắc 7 thông số của nó trước khi học node khác. Làm việc trong workspace Shading, viewport ở chế độ Material Preview.

**Thông số Principled BSDF quan trọng**

| Thông số | Ý nghĩa | Giá trị tham khảo |
| --- | --- | --- |
| Base Color | Màu gốc / texture màu | Không dùng đen hoặc trắng tuyệt đối |
| Metallic | Kim loại hay không | 0 hoặc 1, hiếm khi ở giữa |
| Roughness | Độ nhám | 0 = gương, 0.4–0.6 = nhựa, 0.8+ = vải, đá |
| IOR | Chỉ số khúc xạ | Nước 1.33, kính 1.45–1.52 |
| Transmission | Trong suốt (kính, nước) | 1 cho kính |
| Emission | Tự phát sáng | Tăng Strength cho đèn neon |
| Normal | Chi tiết bề mặt giả | Nối qua node Normal Map |

**Phím tắt Node Editor**

| Thao tác | Phím |
| --- | --- |
| Thêm node | Shift + A |
| Xem nhanh output một node (cần add-on Node Wrangler) | Ctrl + Shift + click |
| Tự thêm Texture Coordinate + Mapping (Node Wrangler) | Ctrl + T |
| Nạp bộ texture PBR một lần (Node Wrangler) | Ctrl + Shift + T trên Principled BSDF |
| Cắt dây nối | Ctrl + chuột phải kéo ngang |
| Chèn Reroute | Shift + chuột phải kéo ngang |
| Gom node vào Frame | Ctrl + J |
| Tạo / vào Node Group | Ctrl + G / Tab |
| Tắt node (mute) | M |

**Thiết lập màu texture đúng:** ảnh màu (Base Color) để Color Space = sRGB; Roughness, Metallic, Normal, Displacement để Non-Color. Sai thiết lập này làm vật liệu bị bạc màu hoặc bóng sai.

**UV unwrap cơ bản**

1. Trong Edit Mode, chọn cạnh làm đường cắt › chuột phải › Mark Seam (đặt seam ở chỗ khuất).
2. A để chọn hết › U › Unwrap. Vật thể đơn giản có thể dùng Smart UV Project.
3. Kiểm tra bằng texture caro (Image › New › Generated Type = UV Grid): ô vuông đều là tốt, ô méo là UV bị kéo dãn.
4. Trong UV Editor: Pack Islands để xếp gọn, Average Islands Scale để đồng đều mật độ texture.

Texture Paint: workspace Texture Paint, tạo ảnh mới cho Base Color rồi vẽ trực tiếp lên model. Nhớ **lưu ảnh riêng** (Image › Save) vì ảnh vẽ không tự lưu cùng file .blend.

## 6. Ánh sáng, camera & render

Dùng Eevee để xem trước và làm việc nhanh, Cycles khi cần ánh sáng chân thực. Đổi engine tại Properties › Render.

| Tiêu chí | Eevee | Cycles |
| --- | --- | --- |
| Cách tính | Raster thời gian thực (có raytracing từ bản 4.2) | Path tracing vật lý |
| Tốc độ | Vài giây mỗi khung | Vài chục giây đến vài phút mỗi khung |
| Chất lượng | Tốt cho stylized, motion graphics | Chuẩn cho product, kiến trúc, ảnh thực tế |
| Phần cứng | GPU bất kỳ | GPU NVIDIA (OptiX/CUDA), AMD (HIP), Apple (Metal) hoặc CPU |

**Cài đặt Cycles quan trọng**

- **Device = GPU Compute** (bật GPU tại Preferences › System trước); nhanh hơn CPU nhiều lần.
- **Samples + Denoise:** 128–512 samples kèm Denoise (OpenImageDenoise hoặc OptiX) thường đã sạch; không cần hàng nghìn samples.
- **Noise Threshold** (adaptive sampling) để Blender tự dừng ở vùng đã đủ sạch.
- **Light Paths:** giảm bounce để nhanh hơn; tắt Caustics nếu không cần.
- **Color Management:** View Transform = AgX (mặc định từ 4.0) cho ánh sáng mạnh không bị cháy; Standard khi cần màu chính xác tuyệt đối (logo, UI).

**Ánh sáng**

- 4 loại đèn: Point, Sun, Spot, Area. Area light cho bóng mềm đẹp nhất.
- Thiết lập 3 điểm: Key (chính, mạnh nhất), Fill (làm mềm bóng), Rim (viền tách vật khỏi nền).
- HDRI: World › Color › Environment Texture, nạp file .hdr/.exr; cách nhanh nhất để có ánh sáng và phản chiếu tự nhiên (nguồn miễn phí: Poly Haven).
- Đơn vị đèn là Watt; Sun đo bằng Strength (ánh nắng ban ngày khoảng 3–5 trên AgX).

**Camera**

| Thao tác | Cách làm |
| --- | --- |
| Đặt camera theo góc nhìn | Ctrl + Alt + Numpad 0 |
| Điều khiển camera như viewport | N › View › bật Lock Camera to View |
| Tiêu cự | 35–50 mm tự nhiên; 85 mm+ cho chân dung, sản phẩm |
| Xoá phông | Camera › Depth of Field, chọn Focus Object |
| Khung căn bố cục | Camera › Viewport Display › Composition Guides |

**Xuất file**

| Thao tác | Phím / thiết lập |
| --- | --- |
| Render ảnh / animation | F12 / Ctrl + F12 |
| Xem lại cửa sổ render | F11 |
| Render vùng (xem thử) | Ctrl + B trong camera view |
| Định dạng animation | Xuất chuỗi PNG/EXR thay vì video trực tiếp, rồi ghép sau |

Render animation ra chuỗi ảnh an toàn hơn: máy crash ở khung 500 thì chỉ render tiếp từ 501, không mất cả video.

## 7. Animation & rigging

Mọi animation trong Blender là keyframe cộng đường cong nội suy giữa chúng; Graph Editor là nơi biến chuyển động cứng nhắc thành tự nhiên.

**Keyframe & timeline**

| Thao tác | Phím |
| --- | --- |
| Chèn keyframe | I (di chuột lên một ô thuộc tính để key riêng nó) |
| Xóa keyframe | Alt + I |
| Tự động ghi key | Bật nút tròn (Auto Keying) trên Timeline |
| Phát / dừng | Space |
| Khung trước / sau | ← / → |
| Keyframe trước / sau | ↑ / ↓ |
| Về đầu / cuối | Shift + ← / Shift + → |
| Đổi kiểu nội suy (Graph Editor) | T (Linear, Bezier, Constant…) |
| Lặp vô hạn | Graph Editor › Channel › Extrapolation › Make Cyclic |
| Kiểu handle (Graph Editor) | V |

**Nguyên tắc để chuyển động đẹp:** ease in/out (đường cong mềm ở hai đầu), anticipation (lấy đà trước khi nhảy), overlap (tóc, đuôi chuyển động trễ hơn thân). Thiết lập FPS và độ dài tại Properties › Output trước khi animate.

**Rigging nhân vật cơ bản**

1. Shift + A › Armature, Tab vào Edit Mode, E để extrude thêm xương theo dáng nhân vật.
2. Đặt tên xương có đuôi .L / .R (ví dụ arm.L) rồi dùng Symmetrize để nhân đối xứng.
3. Chọn mesh, Shift + chọn armature, Ctrl + P › With Automatic Weights.
4. Sửa ảnh hưởng bằng Weight Paint: đỏ = 100%, xanh dương = 0%.
5. Thêm IK: Pose Mode › chọn xương cẳng chân › Shift + I, đặt Chain Length = 2.

Với nhân vật hình người, dùng add-on **Rigify** (có sẵn) để sinh rig hoàn chỉnh có IK/FK và bộ điều khiển thay vì tự dựng từ đầu. Pose Mode: Ctrl + Tab; reset pose: Alt + G / Alt + R / Alt + S.

## 8. Nâng cao: Sculpt, Geometry Nodes, vật lý, Python

Mỗi mảng dưới đây là một chuyên ngành riêng; chọn một mảng theo mục tiêu thay vì học dàn trải.

**Sculpting**

| Thao tác | Phím |
| --- | --- |
| Kích thước / cường độ cọ | F / Shift + F |
| Đảo chiều (lõm thay vì lồi) | Giữ Ctrl |
| Làm mịn | Giữ Shift |
| Mask / xóa mask / đảo mask | M (cọ Mask) / Alt + M / Ctrl + I |
| Remesh (Voxel) | Ctrl + R, chỉnh độ phân giải bằng R |
| Bật/tắt Dyntopo | Ctrl + D |
| Face Sets | Ctrl + W, giữ H trên một face set để cô lập |

Cọ hay dùng: Draw, Clay Strips (đắp khối), Grab (G, kéo hình), Crease (rãnh), Inflate, Snake Hook. Quy trình: khối lớn trước với độ phân giải thấp, chi tiết sau; dùng Multiresolution modifier để làm chi tiết nhỏ, bật Symmetry X từ đầu.

**Geometry Nodes** (workspace Geometry Nodes)

- Tư duy: Group Input (mesh gốc) → các node xử lý → Group Output. Mọi thay đổi đều không phá hủy.
- Bộ node cốt lõi nên học trước: Distribute Points on Faces → Instance on Points (rải cỏ, đá, cây), Realize Instances, Set Position, Join Geometry, Random Value.
- **Field** (ô tròn viền kim cương) là giá trị tính cho từng điểm; đây là khái niệm khó nhất, nắm được nó là hiểu 80% Geometry Nodes.
- Đưa thông số ra Group Input để chỉnh ngay trong tab Modifier, biến node tree thành công cụ tái sử dụng.
- Simulation Zone (từ 3.6) cho hiệu ứng mô phỏng tự viết theo từng khung.

**Vật lý & mô phỏng** (Properties › Physics)

| Loại | Dùng cho | Lưu ý |
| --- | --- | --- |
| Rigid Body | Đổ vỡ, rơi, va chạm vật cứng | Scale phải đã apply; vật đứng yên đặt Passive |
| Cloth | Vải, rèm, cờ | Mesh cần đủ mật độ; vật cản cần Collision |
| Fluid (Mantaflow) | Nước, khói, lửa | Cần Domain bao quanh; Bake tốn dung lượng lớn |
| Soft Body | Vật mềm, nảy |  |
| Particle / Hair Curves | Lông, tóc, cỏ | Tóc kiểu mới (Curves) dùng Geometry Nodes |

Luôn **Bake** mô phỏng trước khi render và đặt thư mục cache riêng; bắt đầu với độ phân giải thấp để thử nhanh.

**Add-on & Python**

- Add-on và extension bật tại Edit › Preferences › Get Extensions (từ 4.2). Nên bật: Node Wrangler, LoopTools, Bool Tool, Extra Objects.
- Python: workspace Scripting. Bật Preferences › Interface › Python Tooltips để di chuột lên nút bất kỳ là thấy lệnh Python tương ứng.
- Info Editor ghi lại mọi thao tác dưới dạng code Python: cách nhanh nhất để học API `bpy` và tự động hóa việc lặp lại.

## 9. Mẹo hay & lỗi thường gặp

Phần lớn lỗi “kỳ lạ” của người mới đến từ 5 nguyên nhân: scale chưa apply, normal ngược, đỉnh trùng, origin sai và quên lưu texture.

**Bảng tra lỗi**

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| Bevel, Solidify, Array lệch hoặc méo | Scale chưa apply | Ctrl + A › Scale |
| Mặt đen, sọc đốm, bóng lạ | Normal bị ngược | Edit Mode › A › Shift + N; bật Face Orientation trong Overlays (xanh = đúng, đỏ = ngược) |
| Không extrude/merge được, mặt chớp nháy | Đỉnh hoặc mặt trùng nhau | M › By Distance |
| Xoay/scale quanh điểm lạ | Origin sai vị trí | Chuột phải › Set Origin › Origin to Geometry |
| Texture hồng tươi (magenta) | Mất đường dẫn file ảnh | File › External Data › Find Missing Files, hoặc Pack Resources |
| Vật biến mất khi zoom gần/xa | Clip Start/End của viewport hoặc camera | N › View › Clip Start/End |
| Subdivision làm méo hình | Thiếu support loop, có n-gon | Thêm loop cut sát cạnh, sửa n-gon thành quad |
| Render Cycles nhiều hạt | Thiếu samples hoặc chưa denoise | Bật Denoise; tăng kích thước đèn Area |
| Boolean lỗi, có lỗ hổng | Mesh không kín hoặc trùng mặt | Dùng solver Exact; đẩy object cắt xuyên hẳn qua |
| Không chọn được vật phía sau | Đang ở Solid không bật X-ray | Alt + Z |
| Phím tắt không hoạt động | Chuột đang ở vùng giao diện khác, hoặc bộ gõ tiếng Việt đang bật | Di chuột vào viewport; tắt Unikey/EVKey khi dùng Blender |

**Mẹo trải nghiệm làm việc**

- Ctrl + S thường xuyên; dùng File › Save Incremental (Ctrl + Alt + S) để lưu thành scene\_01, scene\_02… thay vì ghi đè.
- Crash hoặc quên lưu: File › Recover › Auto Save; file `.blend1` là bản lưu trước đó.
- Model theo đơn vị thực (mét): vật lý, ánh sáng và độ sâu trường đều dựa vào kích thước thật.
- Đặt tên object và xếp vào Collection ngay từ đầu; cảnh lớn sẽ không thể quản lý nếu toàn “Cube.047”.
- Dùng Alt + D thay Shift + D cho vật lặp lại (ghế, cây): nhẹ file và sửa một là sửa tất cả.
- Thêm ảnh tham khảo: kéo thả ảnh vào viewport, hoặc Shift + A › Image › Reference.
- Thanh trạng thái: chuột phải › bật Scene Statistics để theo dõi số polygon.
- Bấm Ctrl + Space khi cần không gian; tắt Overlays khi xem kết quả cuối.
- Asset Browser: đánh dấu Mark as Asset cho vật liệu, model hay dùng để kéo thả vào dự án khác.

**Hiệu năng khi cảnh nặng**

- Giảm Viewport level của Subdivision (để 1) và giữ Render level cao.
- Simplify (Properties › Render) giới hạn subdivision và particle toàn cảnh.
- Ẩn collection không dùng (bấm biểu tượng mắt hoặc bỏ tick checkbox trong Outliner).
- Xuất sang engine game (Unity, Unreal): apply transform, kiểm tra normal, đặt Forward/Up đúng trong hộp thoại xuất FBX/glTF.

## 10. Lộ trình học gợi ý

Học qua dự án nhỏ hoàn chỉnh hiệu quả hơn xem tutorial rời rạc: mỗi giai đoạn nên kết thúc bằng một sản phẩm render ra ảnh. Thời gian dưới đây tính với khoảng 1 giờ mỗi ngày.

1. **Tuần 1–2 · Làm quen:** điều hướng, G/R/S, Edit Mode cơ bản. Dự án: chiếc donut hoặc cốc cà phê (series Donut của Blender Guru là khởi đầu kinh điển).
2. **Tuần 3–6 · Modeling:** extrude, loop cut, bevel, modifiers, topology quad. Dự án: căn phòng isometric, đồ nội thất, một món đồ điện tử.
3. **Tuần 7–10 · Vật liệu & ánh sáng:** Principled BSDF, texture PBR, UV unwrap, HDRI, Cycles. Dự án: render sản phẩm (chai nước hoa, đồng hồ) trên nền studio.
4. **Tháng 3–4 · Animation:** keyframe, Graph Editor, camera chuyển động. Dự án: quả bóng nảy, logo xuất hiện, camera bay quanh cảnh.
5. **Tháng 4–6 · Chọn chuyên sâu một hướng:**
   - Nhân vật: sculpt → retopology → UV → rig (Rigify) → animate.
   - Hard-surface / sản phẩm: boolean, bevel nâng cao, weighted normal.
   - Môi trường / kiến trúc: Geometry Nodes rải cây cỏ, ánh sáng thực tế.
   - Motion graphics / VFX: Geometry Nodes, mô phỏng, compositing.
6. **Sau 6 tháng · Nâng cao:** Geometry Nodes chất lượng công cụ, Python tự động hóa, quy trình xuất sang game engine, xây portfolio.

**Nguồn học miễn phí:** Blender Manual chính thức (docs.blender.org), Blender Studio, kênh YouTube Blender Guru, CG Cookie, Grant Abbitt, Ryan King Art; asset miễn phí từ Poly Haven. Tham gia cộng đồng Blender Việt Nam trên Facebook để hỏi đáp và nhận góp ý.

- [ ] Hoàn thành dự án giai đoạn 1
- [ ] Hoàn thành dự án giai đoạn 2
- [ ] Hoàn thành dự án giai đoạn 3
- [ ] Hoàn thành dự án giai đoạn 4
- [ ] Chọn hướng chuyên sâu và hoàn thành dự án đầu tiên
