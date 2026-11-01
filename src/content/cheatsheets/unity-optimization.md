---
title: "Tối ưu hiệu năng Unity"
description: "Quy trình đo và tìm bottleneck, các kỹ thuật tối ưu CPU, GPU, bộ nhớ, UI và cách trả lời câu hỏi optimize khi phỏng vấn."
date: 2026-09-29
tags: [Unity, Optimization, Phỏng vấn]
---

## 1. Khung trả lời chung

Nhà tuyển dụng muốn thấy **quy trình**, không chỉ danh sách mẹo:

> **Đo → Xác định bottleneck → Sửa → Đo lại**

Câu mẫu: *"Trước khi optimize, em dùng Profiler để xác định game đang bị CPU-bound hay GPU-bound, tìm chỗ tốn nhiều nhất rồi mới xử lý. Sau khi sửa thì đo lại để so sánh trước/sau."*

**Công cụ nên nhắc tên:**

- **Profiler**: CPU, GPU, Memory, Rendering. Nhớ profile trên **thiết bị thật**, không chỉ trong Editor.
- **Frame Debugger**: xem từng draw call, lý do batching bị break.
- **Memory Profiler** (package): tìm asset chiếm RAM, leak.
- **Stats window** trong Game view: Batches, SetPass calls, Tris.

## 2. CPU / Scripting

| Vấn đề | Cách xử lý |
| --- | --- |
| `GetComponent`, `Find`, `Camera.main` gọi trong Update | Cache lại ở `Awake`/`Start` |
| Instantiate/Destroy liên tục (đạn, enemy, hiệu ứng) | **Object Pooling** |
| GC spike (giật lag định kỳ) | Tránh cấp phát trong Update: nối string, LINQ, `new List` mỗi frame, boxing, lambda capture |
| Coroutine dùng `new WaitForSeconds` liên tục | Cache `WaitForSeconds` |
| Quá nhiều `Update()` | Gom về một manager, hoặc dùng event thay vì polling mỗi frame |
| Log thừa | Bỏ `Debug.Log` trong build |
| Tính toán nặng | Chia qua nhiều frame, hoặc dùng Job System + Burst |

**Physics:**

- Chỉnh **Layer Collision Matrix** để bỏ va chạm không cần thiết.
- Dùng collider đơn giản (Box/Sphere/Capsule) thay vì Mesh Collider.
- Dùng `RaycastNonAlloc`, `OverlapSphereNonAlloc` để tránh GC.
- Điều chỉnh Fixed Timestep nếu không cần physics chính xác cao.

## 3. GPU / Rendering

**Giảm draw call / SetPass call:**

- **Static Batching** cho vật thể không di chuyển.
- **SRP Batcher** (URP/HDRP): dùng chung shader.
- **GPU Instancing** cho nhiều object giống nhau (cây, cỏ, đá).
- **Sprite Atlas / Texture Atlas** để nhiều object dùng chung material.

**Giảm tải render:**

- **LOD Group**: model xa thì dùng mesh ít poly.
- **Occlusion Culling**: không render thứ bị che khuất.
- Giảm **overdraw**: hạn chế vật thể trong suốt chồng lên nhau, particle to.
- **Baked lighting** thay vì realtime light; hạn chế realtime shadow, giảm shadow distance.
- Shader đơn giản cho mobile, hạn chế post-processing nặng.
- Giảm render scale / resolution trên máy yếu.

## 4. Memory & Asset

- **Texture**: nén đúng định dạng (ASTC cho mobile), giảm Max Size, tắt **Read/Write** nếu không cần, tắt mipmap cho UI.
- **Audio**: nhạc nền dùng *Streaming*, SFX ngắn dùng *Decompress On Load*, bật *Force To Mono* nếu không cần stereo.
- **Mesh**: tắt Read/Write, giảm poly.
- **Load asset**: dùng **Addressables** thay vì để hết trong `Resources`; nhớ release khi không dùng.
- Tránh leak: hủy đăng ký event (`-=`) khi object bị destroy.

## 5. UI

- **Tách Canvas**: phần UI thay đổi liên tục (thanh máu, timer) để canvas riêng, vì một phần tử thay đổi làm rebuild cả canvas.
- Tắt **Raycast Target** cho Image/Text không cần bấm.
- Hạn chế **Layout Group** lồng nhau, nhất là trên phần tử động.
- Danh sách dài thì dùng **pooling cho Scroll View** (chỉ tạo số item vừa màn hình).
- Ẩn UI bằng tắt component `Canvas` thay vì `SetActive(false)` nếu bật/tắt thường xuyên.

## 6. Kể lại việc đã làm theo STAR

Nhiều kỹ thuật ở trên có thể đã được dùng mà chưa gọi tên. Tự hỏi lại:

- Có từng làm hệ thống bắn đạn / spawn enemy mà tái sử dụng object không? → **Object Pooling**
- Có từng lưu `GetComponent` vào biến thay vì gọi mỗi frame không? → **Caching**
- Có từng giảm kích thước ảnh, gộp sprite vào atlas? → **Texture optimization / batching**
- Có từng thấy game giật, rồi thử tắt bớt thứ để tìm nguyên nhân? → Đó chính là **tìm bottleneck**, chỉ là chưa dùng Profiler.

Cách kể theo **STAR**: *Tình huống → Việc cần làm → Hành động → Kết quả.*

> *"Trong project X, game bị giật khi nhiều enemy xuất hiện. Em kiểm tra thì thấy nguyên nhân là Instantiate/Destroy liên tục gây GC spike. Em chuyển sang object pooling, sau đó hết giật và FPS ổn định hơn."*

Nếu không có số liệu cụ thể, **đừng bịa số**. Nói thật kiểu *"lúc đó em chưa đo kỹ bằng Profiler, nhưng giờ nếu làm lại em sẽ đo trước/sau để chắc chắn"*. Câu này cho thấy bạn hiểu quy trình đúng.

## 7. Câu hỏi hay gặp

**"Game bị lag, em sẽ làm gì?"**
Profile trên máy thật → xem CPU hay GPU bound → nếu CPU: xem script, GC, physics; nếu GPU: xem draw call, overdraw, shader, lighting → sửa → đo lại.

**"Draw call là gì, giảm thế nào?"**
Là lệnh CPU gửi GPU để vẽ. Nhiều quá thì CPU bị nghẽn. Giảm bằng batching, atlas, instancing, dùng chung material.

**"GC là gì, sao gây giật?"**
Garbage Collector dọn bộ nhớ không dùng nữa; khi chạy nó dừng game một chút gây spike. Giảm bằng cách hạn chế cấp phát mỗi frame, dùng pooling, cache.

**"Object Pooling là gì?"**
Tạo sẵn một nhóm object, khi cần thì bật lên, dùng xong thì tắt và trả về pool thay vì Destroy. Unity có sẵn `UnityEngine.Pool.ObjectPool<T>`.

**"Update vs FixedUpdate vs LateUpdate?"**
Update: mỗi frame, logic/input. FixedUpdate: theo physics timestep, dùng cho Rigidbody. LateUpdate: sau Update, hay dùng cho camera follow.

**"Optimize cho mobile khác PC thế nào?"**
Mobile nhạy với fill rate/overdraw, nhiệt độ, pin và RAM; nên ưu tiên texture nén, baked light, shader đơn giản, giới hạn FPS (`Application.targetFrameRate`).
