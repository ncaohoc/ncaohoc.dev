---
title: "Unity Physics từ cơ bản đến nâng cao"
description: "Rigidbody, collider, va chạm, raycast, joint, CCD, tối ưu vật lý và các use case thường gặp theo API Unity 6."
date: 2026-10-01
tags: [Unity, Physics, C#]
---

## 1. Nền tảng: Rigidbody & Collider

Một object tham gia vật lý khi có Collider; nó chịu lực và trọng lực khi có thêm Rigidbody. Cheatsheet dùng tên API của Unity 6 (bản cũ hơn: `velocity`, `drag`, `angularDrag`).

### Ba loại body

| Loại | Cấu hình | Dùng cho | Ghi chú |
| --- | --- | --- | --- |
| Static | Chỉ Collider, không Rigidbody | Tường, sàn, địa hình | Không được di chuyển bằng Transform khi chạy |
| Dynamic | Collider + Rigidbody (`isKinematic = false`) | Thùng, bóng, ragdoll | Chịu lực, trọng lực, va chạm |
| Kinematic | Collider + Rigidbody (`isKinematic = true`) | Thang máy, cửa, platform di động | Di chuyển bằng `MovePosition`, đẩy được Dynamic nhưng không bị đẩy lại |

### Thuộc tính Rigidbody hay dùng

| Thuộc tính | Ý nghĩa | Giá trị gợi ý |
| --- | --- | --- |
| `mass` | Khối lượng (kg) | Giữ tỉ lệ giữa các vật ≤ 1:100 để solver ổn định |
| `linearDamping` | Cản chuyển động thẳng | 0 cho đạn, 1–5 cho vật "nặng nề" |
| `angularDamping` | Cản xoay | Mặc định 0.05 |
| `useGravity` | Bật/tắt trọng lực | Tắt cho vật bay, đạn thẳng |
| `constraints` | Khóa trục vị trí/xoay | `FreezeRotation` cho nhân vật |
| `interpolation` | Làm mượt hình ảnh giữa các bước vật lý | `Interpolate` cho vật camera bám theo |
| `collisionDetectionMode` | Kiểu phát hiện va chạm | `Discrete` mặc định; CCD cho vật nhanh (mục 6) |
| `centerOfMass` | Tâm khối | Hạ thấp cho xe để không lật |

### Collider: từ rẻ đến đắt

1. `SphereCollider` — rẻ nhất.
2. `CapsuleCollider` — chuẩn cho nhân vật.
3. `BoxCollider` — đa số vật thể.
4. `MeshCollider` convex — tối đa 255 tam giác, dùng được với Dynamic.
5. `MeshCollider` non-convex — đắt nhất, chỉ nên cho Static hoặc Kinematic.

Compound collider: nhiều collider con dưới một Rigidbody cha. Thường rẻ và ổn định hơn một MeshCollider.

## 2. Va chạm & Trigger

Callback chỉ bắn khi ít nhất một trong hai object có Rigidbody, và hai layer được bật trong Layer Collision Matrix.

### Callback

| Callback | Khi nào | Tham số |
| --- | --- | --- |
| `OnCollisionEnter / Stay / Exit` | Hai collider thường chạm nhau | `Collision` (contacts, impulse, relativeVelocity) |
| `OnTriggerEnter / Stay / Exit` | Một trong hai có `isTrigger = true` | `Collider` |
| `OnControllerColliderHit` | CharacterController va vào collider khi gọi `Move` | `ControllerColliderHit` |

Bản 2D dùng hậu tố `2D`: `OnCollisionEnter2D(Collision2D c)`, `OnTriggerEnter2D(Collider2D c)`.

### Ai nhận được sự kiện

| A \\ B | Static | Dynamic | Kinematic |
| --- | --- | --- | --- |
| Static | Không | Collision | Không |
| Dynamic | Collision | Collision | Collision |
| Kinematic | Không | Collision | Không (trừ khi bật Kinematic Contacts) |

Trigger: cần ít nhất một Rigidbody (Dynamic hoặc Kinematic) trong cặp; Static trigger × Static không bắn.

### Code mẫu

```csharp
void OnCollisionEnter(Collision c)
{
    float impact = c.relativeVelocity.magnitude;
    if (impact > 5f) PlayHitSound(impact);
    ContactPoint p = c.GetContact(0); // tránh c.contacts (cấp phát mảng)
    SpawnFx(p.point, p.normal);
}

void OnTriggerEnter(Collider other)
{
    if (other.CompareTag("Player")) // nhanh hơn other.tag == "Player"
        Collect();
}
```

### Layer & Collision Matrix

- Project Settings → Physics → Layer Collision Matrix: tắt mọi cặp layer không cần va chạm (ví dụ Bullet × Bullet, Pickup × Enemy).
- Bỏ qua một cặp cụ thể: `Physics.IgnoreCollision(colA, colB)`; cả hai layer: `Physics.IgnoreLayerCollision(8, 9)`.
- Unity 2022.2+: `Collider.includeLayers / excludeLayers` override matrix theo từng collider.

## 3. Di chuyển & lực

Mọi thay đổi lên Rigidbody làm trong `FixedUpdate` (mặc định 50 lần/giây, `Time.fixedDeltaTime = 0.02`); đọc input trong `Update` rồi lưu lại.

### Cách di chuyển: chọn cái nào

| Cách | Body | Tôn trọng va chạm? | Dùng khi |
| --- | --- | --- | --- |
| `AddForce / AddTorque` | Dynamic | Có | Xe, tàu, đẩy nổ, chuyển động tự nhiên |
| Gán `linearVelocity` | Dynamic | Có | Nhân vật cần phản hồi chính xác, nhảy |
| `MovePosition / MoveRotation` | Kinematic | Đẩy vật khác, bản thân không bị chặn | Platform, cửa, vật theo đường ray |
| `transform.position` | Bất kỳ | Không — teleport | Chỉ để dịch chuyển tức thời; tránh mỗi frame |

### ForceMode

| Mode | Tính khối lượng? | Tức thời? | Ví dụ |
| --- | --- | --- | --- |
| `Force` (mặc định) | Có | Không, × fixedDeltaTime | Động cơ, gió |
| `Acceleration` | Không | Không | Trọng lực tùy biến |
| `Impulse` | Có | Có | Nhảy, bắn, nổ |
| `VelocityChange` | Không | Có | Dash, đổi hướng tức thì |

### Code mẫu

```csharp
[SerializeField] float speed = 6f, jumpForce = 5f;
Rigidbody rb; Vector3 input; bool jumpQueued;

void Awake() => rb = GetComponent<Rigidbody>();

void Update()
{
    input = new Vector3(Input.GetAxisRaw("Horizontal"), 0, Input.GetAxisRaw("Vertical")).normalized;
    if (Input.GetButtonDown("Jump")) jumpQueued = true; // đọc ở Update để không mất phím
}

void FixedUpdate()
{
    Vector3 v = input * speed;
    v.y = rb.linearVelocity.y;          // giữ vận tốc rơi
    rb.linearVelocity = v;

    if (jumpQueued) { rb.AddForce(Vector3.up * jumpForce, ForceMode.Impulse); jumpQueued = false; }
}
```

### Ghi nhớ nhanh

- Không nhân `Time.deltaTime` khi dùng `AddForce` — Unity đã tính.
- `AddForceAtPosition` tạo cả lực lẫn mô-men xoay (đạn trúng mép thùng).
- `AddExplosionForce(force, center, radius, upwardsModifier)` cho vụ nổ.
- `AddRelativeForce` dùng trục cục bộ (tàu, máy bay).
- `rb.maxAngularVelocity` mặc định 7 rad/s; tăng lên nếu bánh xe/con quay xoay chậm bất thường.

## 4. Truy vấn vật lý (Raycast, Cast, Overlap)

Luôn truyền `LayerMask` và `maxDistance`; trong code chạy mỗi frame, dùng bản `NonAlloc` để không tạo rác GC.

| Hàm | Trả về | Dùng cho |
| --- | --- | --- |
| `Physics.Raycast` | Hit đầu tiên | Bắn hitscan, check mặt đất, click chọn object |
| `Physics.RaycastNonAlloc` | Nhiều hit vào mảng có sẵn | Đạn xuyên, LOS nhiều lớp |
| `SphereCast / CapsuleCast / BoxCast` | Hit đầu tiên của hình khối quét | Ground check đáng tin, dự đoán va chạm, camera chống xuyên tường |
| `OverlapSphereNonAlloc / OverlapBoxNonAlloc` | Collider trong vùng | AoE, phát hiện kẻ địch gần, nổ |
| `CheckSphere / CheckBox` | `bool` | Chỉ cần biết có/không (rẻ nhất) |
| `Physics.Linecast` | Hit giữa 2 điểm | Line of sight |
| `Collider.Raycast` | Hit trên một collider duy nhất | Raycast lên đúng một object, bỏ qua scene |
| `RaycastCommand` (Jobs) | Hàng nghìn ray song song | AI cảm biến, đạn số lượng lớn |

### Code mẫu

```csharp
[SerializeField] LayerMask groundMask;   // chọn layer trong Inspector
readonly Collider[] hits = new Collider[32];

bool IsGrounded() =>
    Physics.CheckSphere(feet.position, 0.2f, groundMask, QueryTriggerInteraction.Ignore);

void Explode(Vector3 center)
{
    int n = Physics.OverlapSphereNonAlloc(center, 5f, hits, enemyMask);
    for (int i = 0; i < n; i++)
        if (hits[i].attachedRigidbody is { } rb)
            rb.AddExplosionForce(800f, center, 5f, 1f);
}

if (Physics.Raycast(cam.ScreenPointToRay(Input.mousePosition), out RaycastHit hit, 100f, clickMask))
    Select(hit.collider);
```

### Lưu ý

- `LayerMask`: `1 << layer` cho một layer, `~mask` để đảo; dùng `LayerMask.GetMask("Ground","Wall")` một lần rồi cache.
- `QueryTriggerInteraction.Ignore` để ray không trúng trigger (mặc định theo setting `Queries Hit Triggers`).
- Kết quả `RaycastNonAlloc` không sắp xếp theo khoảng cách — tự sort nếu cần.
- Cast bắt đầu bên trong collider sẽ không trúng collider đó; lùi điểm bắt đầu ra một chút.
- Debug: `Debug.DrawRay(origin, dir * dist, Color.red)`.

## 5. Joints, Physics Material, CharacterController

### Joints

| Joint | Ràng buộc | Use case |
| --- | --- | --- |
| `FixedJoint` | Khóa cứng hai vật | Dính vật vào nhau, vật vỡ khi lực lớn (`breakForce`) |
| `HingeJoint` | Xoay quanh 1 trục | Cửa, bản lề, bánh xe đơn giản, con lắc |
| `SpringJoint` | Giữ khoảng cách đàn hồi | Dây thun, kéo vật bằng chuột |
| `CharacterJoint` | Xoay có giới hạn như khớp | Ragdoll |
| `ConfigurableJoint` | Tùy chỉnh cả 6 bậc tự do + drive | Active ragdoll, cần cẩu, grab VR |
| `ArticulationBody` | Chuỗi khớp giải chính xác (Featherstone) | Robot, cánh tay máy, chuỗi dài không bị giãn |

Mẹo joint: bật `enablePreprocessing = false` nếu rung giật; tăng `solverIterations` cho chuỗi dài (xích, dây); giữ tỉ lệ mass giữa hai vật nối ≤ 1:10.

### Physics Material

| Thuộc tính | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `dynamicFriction` | Ma sát khi đang trượt | Băng 0.05, cao su 0.8 |
| `staticFriction` | Ma sát khi đứng yên | Thường ≥ dynamic |
| `bounciness` | Độ nảy 0–1 | Bóng cao su 0.8 |
| `frictionCombine / bounceCombine` | Cách gộp giữa 2 vật | `Minimum` cho tường trơn |

Mẹo kinh điển: gán material ma sát 0 + `Minimum` cho collider nhân vật để không bị dính vào tường khi nhảy.

### Rigidbody hay CharacterController?

| Tiêu chí | Rigidbody | CharacterController |
| --- | --- | --- |
| Điều khiển | Qua lực/vận tốc, cảm giác "có quán tính" | Chính xác từng frame qua `Move()` |
| Bậc thang, dốc | Tự xử lý bằng code | Có sẵn `stepOffset`, `slopeLimit` |
| Trọng lực | Tự động | Tự cộng vào vận tốc |
| Bị đẩy bởi vật khác | Có | Không (tự code) |
| Hợp với | Game vật lý, xe, ragdoll, phản lực | FPS/TPS cổ điển, platformer cần điều khiển "chặt" |

## 6. Nâng cao

### Continuous Collision Detection (chống xuyên tường)

| Mode | Chống xuyên với | Chi phí | Dùng cho |
| --- | --- | --- | --- |
| `Discrete` | — | Thấp nhất | Đa số vật |
| `Continuous` | Static | Trung bình | Vật nhanh va vào tường |
| `ContinuousDynamic` | Static + Dynamic có CCD | Cao | Đạn thật, bóng golf |
| `ContinuousSpeculative` | Tất cả, kể cả xoay nhanh | Trung bình | Kinematic, vật xoay nhanh; có thể gây "va chạm ma" |

Quy tắc ngón tay: vật đi quá nửa bề dày của nó trong một bước vật lý thì cần CCD. Đạn rất nhanh: dùng Raycast từ vị trí cũ đến vị trí mới thay vì CCD.

### Interpolation

- `Interpolate`: hiển thị trễ một bước, mượt và ổn định — mặc định nên dùng cho player.
- `Extrapolate`: đoán trước, không trễ nhưng có thể lố vào tường.
- Chỉ bật cho vật camera theo dõi hoặc cận cảnh; camera follow phải chạy trong `LateUpdate`.
- Khi có interpolation, đọc `rb.position` (giá trị vật lý) khác với `transform.position` (giá trị hiển thị).

### Solver & thông số toàn cục (Project Settings → Physics)

| Thông số | Mặc định | Khi nào đổi |
| --- | --- | --- |
| `Default Solver Iterations` | 6 | Tăng khi joint/chồng vật rung; có thể đặt riêng `rb.solverIterations` |
| `Default Solver Velocity Iterations` | 1 | Tăng khi vật nảy sai, mất năng lượng |
| `Default Contact Offset` | 0.01 | Giảm với vật rất nhỏ |
| `Sleep Threshold` | 0.005 | Tăng để vật ngủ sớm hơn |
| `Solver Type` | Projected Gauss Seidel | `Temporal Gauss Seidel` cho joint/ragdoll ổn định hơn |
| `Friction Type` | Patch | One Directional rẻ hơn |

### Tự điều khiển bước vật lý

```csharp
// Project Settings → Physics → Simulation Mode = Script
void FixedUpdate() => Physics.Simulate(Time.fixedDeltaTime);

// Dự đoán quỹ đạo trên scene vật lý riêng
Scene sim = SceneManager.CreateScene("Sim", new CreateSceneParameters(LocalPhysicsMode.Physics3D));
PhysicsScene ps = sim.GetPhysicsScene();
// ... SceneManager.MoveGameObjectToScene(ghost, sim);
for (int i = 0; i < 60; i++) { ps.Simulate(Time.fixedDeltaTime); line.SetPosition(i, ghost.position); }
```

Dùng cho: vẽ quỹ đạo (Angry Birds, golf), rollback netcode, replay, chạy mô phỏng nhanh hơn thời gian thực.

### Các API chuyên sâu

- **Contact Modification** (`Physics.ContactModifyEvent`, bật `collider.hasModifiableContacts`): sửa điểm tiếp xúc trước khi giải — one-way platform 3D, bánh xe trơn, bỏ va chạm có điều kiện.
- **`Physics.ContactEvent`**: nhận toàn bộ contact của frame theo batch, thay cho hàng nghìn `OnCollisionEnter`.
- **`Physics.BakeMesh`** (job): bake MeshCollider ở background thread, tránh giật khi spawn mesh procedural.
- **`Physics.ComputePenetration` / `ClosestPoint`**: tự viết character controller kinematic, đẩy vật ra khỏi tường.
- **Unity Physics / Havok (DOTS)**: stateless, định định (deterministic), phù hợp hàng chục nghìn vật hoặc netcode.

### Khác biệt 2D vs 3D

|  | 3D (PhysX) | 2D (Box2D) |
| --- | --- | --- |
| Component | `Rigidbody`, `BoxCollider` | `Rigidbody2D`, `BoxCollider2D` |
| Kinematic | `isKinematic` | `bodyType = Kinematic` |
| Trọng lực riêng | Không | `gravityScale` |
| One-way platform | Tự code / Contact Modification | `PlatformEffector2D` có sẵn |
| Collider đặc biệt | Terrain, Wheel | `CompositeCollider2D`, `EdgeCollider2D`, `TilemapCollider2D` |

Hai hệ không tương tác với nhau: collider 2D không va với collider 3D.

## 7. Tips tối ưu hiệu năng

Hai đòn bẩy lớn nhất thường là: giảm số cặp cần kiểm tra (layer matrix) và giảm tần suất bước vật lý (fixed timestep). Đo bằng Profiler trước khi tối ưu.

### Cấu hình dự án

- **Fixed Timestep**: 0.02 (50 Hz) là mặc định; mobile có thể 0.0333 (30 Hz) nếu gameplay cho phép.
- **Maximum Allowed Timestep**: đặt \~0.1 để tránh "spiral of death" (FPS tụt → chạy nhiều FixedUpdate hơn → tụt thêm).
- **Layer Collision Matrix**: tắt mọi cặp không cần — thường là tối ưu rẻ và hiệu quả nhất.
- **Auto Sync Transforms**: để tắt (mặc định); gọi `Physics.SyncTransforms()` thủ công khi cần.
- **Reuse Collision Callbacks**: bật (mặc định từ 2019+) để không cấp phát `Collision` mỗi lần.
- **Broadphase Type**: `Automatic Box Pruning` cho thế giới lớn nhiều vật.
- **Simulation Mode = Script** cho scene trình diễn/menu không cần vật lý.

### Collider & Rigidbody

- Ưu tiên primitive (Sphere > Capsule > Box) và compound collider thay cho MeshCollider.
- MeshCollider: dùng mesh collision riêng đã giảm tam giác; bật `Cooking Options` phù hợp; bake trước bằng `Physics.BakeMesh`.
- Không scale không đều (non-uniform) lên MeshCollider/Sphere — tốn chi phí và dễ sai.
- Object có collider mà di chuyển → phải có Rigidbody (Kinematic). Di chuyển Static collider buộc PhysX rebuild cấu trúc.
- Để vật ngủ: không gán velocity/position mỗi frame khi không cần; kiểm tra `rb.IsSleeping()`.
- Gom collider trên một Rigidbody thay vì nhiều Rigidbody nối FixedJoint.
- Tắt `GameObject` (hoặc Rigidbody) ở xa người chơi; dùng culling/LOD cho vật lý.

### Code

- Dùng `NonAlloc` + mảng cache cho Raycast/Overlap; hoặc `RaycastCommand` / `OverlapSphereCommand` cho batch lớn.
- Cache `GetComponent<Rigidbody>()` trong `Awake`; dùng `TryGetComponent` thay `GetComponent` + null check.
- `CompareTag` thay cho so sánh `tag`; `c.GetContact(i)` / `c.GetContacts(buffer)` thay `c.contacts`.
- Tránh `OnCollisionStay` / `OnTriggerStay` nếu chỉ cần Enter/Exit — chúng chạy mỗi bước.
- Không raycast mỗi frame cho AI — giãn ra 5–10 lần/giây và so le giữa các agent.
- Pool đạn/hiệu ứng thay vì `Instantiate/Destroy`; khi lấy từ pool, reset `linearVelocity`, `angularVelocity`.
- Số lượng cực lớn (hàng nghìn vật): cân nhắc DOTS Physics hoặc tự mô phỏng đơn giản không dùng Rigidbody.

### Đo đạc

- Profiler → module **Physics**: số Active Dynamic/Kinematic bodies, contacts, trigger overlaps.
- CPU timeline: `Physics.Simulate`, `Physics.Processing`, `Physics.FetchResults`, `Physics.ProcessReports`.
- Window → Analysis → **Physics Debugger**: xem collider, contact, vật đang ngủ/thức.

## 8. Use case thường gặp

### Ground check đáng tin cậy

```csharp
bool Grounded(out RaycastHit hit) =>
    Physics.SphereCast(transform.position + Vector3.up * 0.5f, 0.3f, Vector3.down,
                       out hit, 0.6f, groundMask, QueryTriggerInteraction.Ignore);
// hit.normal để biết độ dốc: Vector3.Angle(hit.normal, Vector3.up) > maxSlope → trượt
```

### Nhảy cảm giác tốt (coyote time + jump buffer + rơi nhanh)

```csharp
float coyote, buffer;
void Update() { if (Input.GetButtonDown("Jump")) buffer = 0.15f; }
void FixedUpdate()
{
    coyote = Grounded(out _) ? 0.1f : coyote - Time.fixedDeltaTime;
    buffer -= Time.fixedDeltaTime;
    if (buffer > 0 && coyote > 0) {
        rb.linearVelocity = new Vector3(rb.linearVelocity.x, jumpSpeed, rb.linearVelocity.z);
        buffer = coyote = 0;
    }
    if (rb.linearVelocity.y < 0) rb.AddForce(Physics.gravity * 1.5f, ForceMode.Acceleration); // rơi nhanh hơn
}
```

### Đứng trên platform di động

Platform: Rigidbody Kinematic + `MovePosition` trong `FixedUpdate`. Player Rigidbody: cộng vận tốc platform (`platformRb.GetPointVelocity(hit.point)`) vào vận tốc của mình. Tránh `SetParent` player vào platform khi player là Dynamic.

### Nhặt/kéo vật (grab)

```csharp
void FixedUpdate()
{
    Vector3 toTarget = holdPoint.position - held.position;
    held.linearVelocity = toTarget / Time.fixedDeltaTime * 0.5f; // bám theo, vẫn va tường
    held.angularVelocity *= 0.8f;
}
```

Phương án khác: `SpringJoint` hoặc `ConfigurableJoint` với drive — mềm hơn, hợp VR.

### Vùng sát thương / phát hiện

- Vùng cố định (bẫy, checkpoint): trigger collider + `OnTriggerEnter/Exit`.
- Đòn đánh tức thời (kiếm, AoE): `OverlapSphereNonAlloc` đúng frame ra đòn — không bật/tắt trigger collider.
- Tầm nhìn AI: Overlap tìm ứng viên → lọc theo góc (`Vector3.Dot`) → `Linecast` kiểm tra bị che.

### Đạn

| Loại | Cách làm |
| --- | --- |
| Hitscan (súng trường) | `Physics.Raycast` từ nòng/camera, không cần Rigidbody |
| Đạn bay nhanh | Không dùng Rigidbody; tự cộng vị trí + `Raycast(lastPos → newPos)` mỗi bước |
| Đạn chậm có trọng lực (lựu đạn, mũi tên) | Rigidbody + `AddForce(Impulse)`; mũi tên xoay theo `linearVelocity` |

### Xe

`WheelCollider` × 4 + Rigidbody mass \~1000–1500, hạ `centerOfMass`, đồng bộ mesh bánh bằng `GetWorldPose`. Xe arcade: tự raycast treo từng bánh + `AddForceAtPosition` dễ tinh chỉnh hơn.

### Ragdoll khi chết

Tạo bằng GameObject → 3D Object → Ragdoll; lúc sống đặt mọi bone `isKinematic = true`, collider tắt. Khi chết: tắt Animator, bật lại vật lý, chuyển `linearVelocity` cuối cùng của nhân vật cho các bone, `AddForce` theo hướng đòn.

### Quỹ đạo dự đoán (ném, bắn cung)

Công thức giải tích (không damping), với v0 là vận tốc ban đầu và g là `Physics.gravity`:

```latex
p(t) = p_0 + v_0 t + \tfrac{1}{2} g t^2
```

Có damping hoặc va chạm: dùng scene vật lý riêng (mục 6).

## 9. Lỗi thường gặp & cách debug

| Triệu chứng | Nguyên nhân hay gặp | Cách sửa |
| --- | --- | --- |
| `OnCollisionEnter` / `OnTriggerEnter` không chạy | Thiếu Rigidbody; layer bị tắt trong matrix; trộn 2D với 3D; sai chữ ký hàm | Thêm Rigidbody (Kinematic cũng được), kiểm tra matrix, đúng `Collision` vs `Collision2D` |
| Vật xuyên tường | Quá nhanh; di chuyển bằng `transform`; collider quá mỏng | CCD, raycast bù, dùng `linearVelocity`/`MovePosition`, làm tường dày hơn |
| Nhân vật giật khi camera bám | Camera cập nhật lệch nhịp với vật lý | Bật `Interpolate`, camera trong `LateUpdate` |
| Chồng thùng rung, trôi | Solver iteration thấp; mass chênh lệch | Tăng `solverIterations`, đưa mass về tỉ lệ hợp lý, thử TGS solver |
| Nhân vật dính vào tường khi nhảy | Ma sát giữa capsule và tường | Physics Material ma sát 0, combine `Minimum` |
| Nhân vật bị đổ lăn | Rigidbody tự xoay | `constraints = FreezeRotation` |
| Nhảy lúc ăn lúc không | Đọc `GetButtonDown` trong `FixedUpdate` | Đọc ở `Update`, xử lý ở `FixedUpdate` (mục 3) |
| Joint giãn, dây xích "bung" | Chuỗi dài, mass lệch | Tăng iterations, dùng `ArticulationBody`, bật `projection` trên ConfigurableJoint |
| Vật nảy mãi hoặc nổ tung khi spawn | Spawn chồng lên collider khác | Kiểm tra `CheckSphere/CheckBox` trước khi spawn; giảm `maxDepenetrationVelocity` |
| Raycast không trúng | Sai LayerMask (truyền số layer thay vì mask); bắt đầu trong collider | Dùng `1 << layer` hoặc `LayerMask`; lùi điểm bắt đầu |
| FPS tụt theo số vật | Quá nhiều cặp contact, MeshCollider, `Stay` callback | Mục 7; xem Profiler module Physics |

### Công cụ debug

- **Physics Debugger** (Window → Analysis): hiển thị collider, contact, trạng thái ngủ.
- `Debug.DrawRay / DrawLine` cho ray; `OnDrawGizmos` + `Gizmos.DrawWireSphere` cho Overlap/SphereCast.
- `Time.timeScale = 0.1f` để xem chậm va chạm nhanh.
- Log `rb.linearVelocity`, `rb.IsSleeping()` và `collision.impulse` khi vật hành xử lạ.
