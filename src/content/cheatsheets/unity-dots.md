---
title: "Unity DOTS: ECS, Jobs và Burst"
description: "Entity, component, baking, ISystem, EntityCommandBuffer, Job System, Burst và tối ưu layout dữ liệu theo Entities 1.x."
date: 2026-10-01
tags: [Unity, DOTS, ECS, Burst]
---

## 1. Tổng quan DOTS

DOTS = ECS (tổ chức dữ liệu) + Job System (đa luồng an toàn) + Burst (biên dịch ra mã máy SIMD). Ba phần dùng riêng được, nhưng mạnh nhất khi kết hợp. Cheatsheet này viết theo API Entities 1.x (Unity 2022.3 / Unity 6).

| Thành phần | Package | Vai trò |
| --- | --- | --- |
| ECS | `com.unity.entities` | Entity, Component, System, Baking |
| Graphics | `com.unity.entities.graphics` | Render entity (thay MeshRenderer) |
| Jobs | có sẵn trong engine (`Unity.Jobs`) | Chạy code trên worker thread |
| Burst | `com.unity.burst` | Compile HPC# sang native qua LLVM |
| Collections | `com.unity.collections` | `NativeList`, `NativeHashMap`, `NativeQueue`… |
| Mathematics | `com.unity.mathematics` | `float3`, `quaternion`, `math.*` thân thiện SIMD |
| Physics | `com.unity.physics` | Vật lý stateless cho ECS |
| Netcode | `com.unity.netcode` | Multiplayer server-authoritative |

**Tư duy data-oriented:**

- OOP: một object chứa cả dữ liệu lẫn hành vi. DOD: dữ liệu nằm trong mảng liên tục, hành vi là hàm xử lý hàng loạt.
- Mục tiêu là cache-friendly: đọc tuần tự, không nhảy pointer, không GC.
- Tách dữ liệu theo cách nó được *dùng*, không theo cách nó được *đặt tên*.
- Câu hỏi cốt lõi: "Hệ thống này đọc gì, ghi gì?" — trả lời được thì song song hóa được.

## 2. ECS cơ bản

Entity chỉ là một ID; Component là dữ liệu thuần (struct); System là logic. Entity có cùng tập component nằm chung một Archetype, lưu trong các Chunk 16 KB.

| Khái niệm | Bản chất | Ghi chú |
| --- | --- | --- |
| `Entity` | struct `{ Index, Version }` | Không chứa dữ liệu, không có method |
| `World` | Tập entity + system | `World.DefaultGameObjectInjectionWorld` |
| `EntityManager` | API quản lý entity của một World | Chạy trên main thread |
| Archetype | Tổ hợp duy nhất các component type | Thêm/bớt component = đổi archetype |
| Chunk | Khối 16 KB chứa entity cùng archetype | Dữ liệu kiểu SoA, mỗi component một mảng |

**Các loại component:**

```csharp
// Unmanaged component — loại dùng nhiều nhất, Burst-friendly
public struct Speed : IComponentData { public float Value; }

// Tag component — không có field, chỉ để lọc query (không tốn bộ nhớ chunk)
public struct EnemyTag : IComponentData { }

// Dynamic buffer — mảng động gắn với entity
[InternalBufferCapacity(8)]
public struct Waypoint : IBufferElementData { public float3 Position; }

// Enableable — bật/tắt không cần structural change
public struct Stunned : IComponentData, IEnableableComponent { }

// Shared component — nhóm entity theo giá trị (mỗi giá trị = chunk riêng)
public struct TeamId : ISharedComponentData { public int Value; }

// Cleanup component — tồn tại sau khi entity bị destroy, để dọn dẹp
public struct ConnectionState : ICleanupComponentData { public int Id; }

// Managed component — class, KHÔNG dùng được trong Burst/Jobs
public class AnimatorRef : IComponentData { public Animator Value; }
```

| Loại | Burst/Jobs | Khi nào dùng |
| --- | --- | --- |
| `IComponentData` (struct) | Có | Mặc định cho mọi dữ liệu |
| Tag (struct rỗng) | Có | Phân loại, lọc query |
| `IBufferElementData` | Có | Danh sách theo entity: inventory, path |
| `IEnableableComponent` | Có | Trạng thái bật/tắt thường xuyên |
| `ISharedComponentData` | Hạn chế | Ít giá trị khác nhau: team, LOD, render mesh |
| `ICleanupComponentData` | Có | Dọn tài nguyên ngoài khi entity chết |
| `class IComponentData` | Không | Bắc cầu sang GameObject, tránh dùng nhiều |

**Quy tắc:** component chỉ chứa dữ liệu blittable (`int`, `float`, `float3`, `Entity`, `FixedString64Bytes`, `BlobAssetReference<T>`). Không `string`, không `class`, không mảng managed.

## 3. Baking: GameObject → Entity

Baking chuyển GameObject trong SubScene thành entity lúc build/edit, không phải lúc runtime. MonoBehaviour Authoring chỉ tồn tại trong Editor; Baker đọc nó và ghi component.

1. Tạo SubScene (Hierarchy → chuột phải → New Sub Scene).
2. Đặt GameObject vào SubScene, gắn script Authoring.
3. Viết Baker để add component.
4. Runtime chỉ load dữ liệu entity đã bake — rất nhanh.

```csharp
public class PlayerAuthoring : MonoBehaviour
{
    public float speed = 5f;
    public GameObject bulletPrefab;

    class Baker : Baker<PlayerAuthoring>
    {
        public override void Bake(PlayerAuthoring a)
        {
            // Chọn flags tối thiểu để tránh thêm transform thừa
            var e = GetEntity(TransformUsageFlags.Dynamic);
            AddComponent(e, new Speed { Value = a.speed });
            AddComponent<PlayerTag>(e);
            AddComponent(e, new BulletPrefab {
                Value = GetEntity(a.bulletPrefab, TransformUsageFlags.Dynamic)
            });
            AddBuffer<Waypoint>(e);
        }
    }
}
```

| `TransformUsageFlags` | Kết quả |
| --- | --- |
| `None` | Không có transform (entity dữ liệu thuần, config) |
| `Renderable` | Chỉ cần `LocalToWorld` để render, không di chuyển |
| `Dynamic` | Có `LocalTransform`, di chuyển được, giữ parent |
| `WorldSpace` | Bỏ parent, transform theo world |
| `NonUniformScale` | Thêm `PostTransformMatrix` cho scale không đều |
| `ManualOverride` | Tự quản lý transform hoàn toàn |

**Mẹo Baker:**

- Đọc asset hoặc component khác qua `GetComponent<T>()` / `DependsOn(asset)` để Baker chạy lại khi chúng đổi.
- Tạo thêm entity phụ: `CreateAdditionalEntity(flags)`.
- Logic phức tạp sau baking → `[WorldSystemFilter(WorldSystemFilterFlags.BakingSystem)]` cho một Baking System.
- Không truy cập `a.transform` trực tiếp để lấy dữ liệu của object khác — dùng `GetComponent` để dependency được theo dõi.

## 4. Systems

Dùng `ISystem` (struct, Burst được toàn bộ) làm mặc định; chỉ dùng `SystemBase` (class) khi cần managed data.

|  | `ISystem` | `SystemBase` |
| --- | --- | --- |
| Kiểu | `partial struct` | `partial class` |
| Burst cho OnUpdate | Có (`[BurstCompile]`) | Không |
| Managed field | Không | Có |
| Truy vấn | `SystemAPI.Query`, `IJobEntity` | Như trên + `Entities.ForEach` (đã deprecated ở bản mới) |
| Hiệu năng | Cao nhất | Thấp hơn |

```csharp
[BurstCompile]
[UpdateInGroup(typeof(SimulationSystemGroup))]
public partial struct MoveSystem : ISystem
{
    [BurstCompile]
    public void OnCreate(ref SystemState state)
    {
        // Chỉ chạy OnUpdate khi có ít nhất 1 entity khớp
        state.RequireForUpdate<Speed>();
    }

    [BurstCompile]
    public void OnUpdate(ref SystemState state)
    {
        float dt = SystemAPI.Time.DeltaTime;

        foreach (var (transform, speed) in
                 SystemAPI.Query<RefRW<LocalTransform>, RefRO<Speed>>()
                          .WithAll<EnemyTag>()
                          .WithNone<Stunned>())
        {
            transform.ValueRW.Position += new float3(0, 0, speed.ValueRO.Value * dt);
        }
    }

    public void OnDestroy(ref SystemState state) { }
}
```

**`SystemAPI.Query` cheat:**

| Cú pháp | Ý nghĩa |
| --- | --- |
| `RefRW<T>` / `.ValueRW` | Đọc + ghi component |
| `RefRO<T>` / `.ValueRO` | Chỉ đọc |
| `DynamicBuffer<T>` | Truy cập buffer |
| `EnabledRefRW<T>` | Bật/tắt enableable component |
| `.WithAll<T>()` | Phải có T (không cần đọc) |
| `.WithAny<A, B>()` | Có ít nhất một |
| `.WithNone<T>()` | Không được có T |
| `.WithDisabled<T>()` | T đang bị tắt |
| `.WithEntityAccess()` | Trả thêm `Entity` ở cuối tuple |
| `.WithChangeFilter<T>()` | Chỉ chunk có T thay đổi |

**SystemAPI khác hay dùng:** `SystemAPI.GetSingleton<T>()`, `SystemAPI.GetComponent<T>(e)`, `SystemAPI.HasComponent<T>(e)`, `SystemAPI.GetBuffer<T>(e)`, `SystemAPI.GetComponentLookup<T>(isReadOnly)`, `SystemAPI.Time`.

**Thứ tự cập nhật (mặc định):**

1. `InitializationSystemGroup` — spawn, setup, ECB đầu frame.
2. `SimulationSystemGroup` — gameplay; chứa `FixedStepSimulationSystemGroup` (physics) và `TransformSystemGroup`.
3. `PresentationSystemGroup` — render, đồng bộ sang GameObject.

Sắp xếp: `[UpdateInGroup(typeof(X))]`, `[UpdateBefore(typeof(Y))]`, `[UpdateAfter(typeof(Z))]`, `[CreateAfter]`, `[DisableAutoCreation]`.

**Aspects (`IAspect`):** gom nhiều component thành một view. Đã bị đánh dấu deprecated từ Entities 1.3 — code mới nên dùng query trực tiếp hoặc helper struct riêng.

## 5. EntityManager, ECB và Structural Change

Structural change (tạo/xóa entity, thêm/bớt component, đổi shared component) di chuyển dữ liệu giữa chunk và buộc mọi job hoàn thành (sync point). Gom chúng lại bằng EntityCommandBuffer.

**EntityManager (main thread, thực thi ngay):**

```csharp
var em = state.EntityManager;
Entity e = em.CreateEntity(typeof(Speed), typeof(LocalTransform));
em.AddComponentData(e, new Speed { Value = 3 });
em.SetComponentData(e, new Speed { Value = 5 });
Speed s = em.GetComponentData<Speed>(e);
em.RemoveComponent<Speed>(e);
Entity copy = em.Instantiate(prefabEntity);
em.DestroyEntity(e);

// Batch theo query — nhanh hơn nhiều so với từng entity
em.AddComponent<Stunned>(query);
em.DestroyEntity(query);
```

**EntityCommandBuffer (ghi lệnh, phát lại sau):**

```csharp
// Cách 1: dùng ECB system có sẵn — playback tự động
var ecb = SystemAPI.GetSingleton<EndSimulationEntityCommandBufferSystem.Singleton>()
                   .CreateCommandBuffer(state.WorldUnmanaged);

foreach (var (hp, entity) in SystemAPI.Query<RefRO<Health>>().WithEntityAccess())
    if (hp.ValueRO.Value <= 0) ecb.DestroyEntity(entity);

// Cách 2: tự tạo, tự playback
var ecb2 = new EntityCommandBuffer(Allocator.Temp);
// ... ghi lệnh ...
ecb2.Playback(state.EntityManager);
ecb2.Dispose();

// Trong job song song: dùng ParallelWriter + sortKey
var writer = ecb.AsParallelWriter();
writer.Instantiate(chunkIndexInQuery, prefab);
```

| ECB system | Playback lúc |
| --- | --- |
| `BeginInitializationEntityCommandBufferSystem` | Đầu frame |
| `EndInitializationEntityCommandBufferSystem` | Cuối Initialization |
| `BeginSimulationEntityCommandBufferSystem` | Đầu Simulation |
| `EndSimulationEntityCommandBufferSystem` | Cuối Simulation (hay dùng nhất) |
| `BeginPresentationEntityCommandBufferSystem` | Đầu Presentation |

Entity tạo bởi ECB là entity *tạm* cho đến khi playback — chỉ dùng nó trong chính ECB đó.

**EntityQuery thủ công:**

```csharp
EntityQuery q = SystemAPI.QueryBuilder()
    .WithAll<Speed, LocalTransform>()
    .WithNone<Stunned>()
    .Build();

int count = q.CalculateEntityCount();
NativeArray<Entity> arr = q.ToEntityArray(Allocator.Temp);
NativeArray<Speed> data = q.ToComponentDataArray<Speed>(Allocator.Temp);
state.RequireForUpdate(q);
```

## 6. Job System

Job là struct chứa dữ liệu + hàm `Execute`, được lên lịch chạy trên worker thread. Safety system phát hiện race condition trong Editor; dữ liệu chỉ qua NativeContainer, không qua managed object.

```csharp
[BurstCompile]
struct ScaleJob : IJobParallelFor
{
    [ReadOnly] public NativeArray<float> Input;
    [WriteOnly] public NativeArray<float> Output;
    public float Factor;

    public void Execute(int i) => Output[i] = Input[i] * Factor;
}

// Lên lịch
var input  = new NativeArray<float>(10000, Allocator.TempJob);
var output = new NativeArray<float>(10000, Allocator.TempJob);

var job = new ScaleJob { Input = input, Output = output, Factor = 2f };
JobHandle h = job.Schedule(input.Length, 64);   // batch size 64

h.Complete();          // chờ xong trước khi đọc Output trên main thread
input.Dispose();
output.Dispose();
```

| Interface | Execute | Dùng khi |
| --- | --- | --- |
| `IJob` | `Execute()` | Một tác vụ đơn trên 1 thread |
| `IJobFor` | `Execute(int i)` | Vòng lặp; chọn `Run` / `Schedule` (1 thread) / `ScheduleParallel` |
| `IJobParallelFor` | `Execute(int i)` | Vòng lặp song song nhiều thread |
| `IJobParallelForTransform` | `Execute(int i, TransformAccess t)` | Sửa Transform GameObject song song |
| `IJobParallelForBatch` | `Execute(int start, int count)` | Xử lý theo khối |
| `IJobEntity` / `IJobChunk` | Xem mục 7 | Lặp entity ECS |

**Dependency:**

```csharp
JobHandle a = jobA.Schedule();
JobHandle b = jobB.Schedule(a);                 // B chạy sau A
JobHandle c = jobC.Schedule(count, 64, a);
JobHandle all = JobHandle.CombineDependencies(b, c);
nativeArray.Dispose(all);                       // dispose sau khi job xong
JobHandle.ScheduleBatchedJobs();                // đẩy job đi ngay
```

Trong ISystem, nối vào `state.Dependency` để ECS tự quản dependency giữa các system: `state.Dependency = job.Schedule(state.Dependency);`.

**Allocator:**

| Allocator | Tuổi thọ | Ghi chú |
| --- | --- | --- |
| `Temp` | Trong 1 frame / 1 hàm | Nhanh nhất, không truyền vào job đã schedule |
| `TempJob` | ≤ 4 frame | Cho job ngắn; quá 4 frame sẽ cảnh báo leak |
| `Persistent` | Tới khi Dispose | Chậm hơn; dùng cho dữ liệu lâu dài |
| `state.WorldUpdateAllocator` | Tự giải phóng sau 2 lần update World | Tiện trong system, không cần Dispose |

**NativeContainer thường dùng:** `NativeArray<T>`, `NativeList<T>`, `NativeHashMap<K,V>`, `NativeParallelHashMap<K,V>`, `NativeParallelMultiHashMap<K,V>`, `NativeQueue<T>`, `NativeHashSet<T>`, `NativeReference<T>`, `NativeStream`. Bản không có safety check: `UnsafeList<T>`, `UnsafeHashMap<K,V>`. Dùng `.AsParallelWriter()` để nhiều thread cùng ghi.

**Attribute an toàn:**

| Attribute | Tác dụng |
| --- | --- |
| `[ReadOnly]` | Cho phép nhiều job cùng đọc song song |
| `[WriteOnly]` | Chỉ ghi |
| `[DeallocateOnJobCompletion]` | Tự Dispose khi job xong (NativeArray) |
| `[NativeDisableParallelForRestriction]` | Cho ghi ngoài index `i` — tự chịu trách nhiệm race |
| `[NativeDisableContainerSafetyRestriction]` | Tắt hẳn safety check cho field |

## 7. Jobs trong ECS: IJobEntity, IJobChunk, Lookup

`IJobEntity` là cách viết job ECS gọn nhất: tham số của `Execute` tự sinh ra query. `IJobChunk` cho quyền kiểm soát thấp nhất khi cần tối ưu theo chunk.

**IJobEntity:**

```csharp
[BurstCompile]
[WithAll(typeof(EnemyTag))]
[WithNone(typeof(Stunned))]
partial struct MoveJob : IJobEntity
{
    public float DeltaTime;

    // ref = ghi, in = chỉ đọc
    void Execute(ref LocalTransform t, in Speed speed)
    {
        t.Position.z += speed.Value * DeltaTime;
    }
}

// Trong OnUpdate của ISystem
new MoveJob { DeltaTime = SystemAPI.Time.DeltaTime }
    .ScheduleParallel();          // tự nối state.Dependency
// .Schedule()  -> 1 worker thread
// .Run()       -> main thread, ngay lập tức
```

Tham số đặc biệt của `Execute`: `Entity entity`, `[EntityIndexInQuery] int index`, `[ChunkIndexInQuery] int sortKey` (dùng cho ECB ParallelWriter), `DynamicBuffer<T>`, `EnabledRefRW<T>`.

**IJobChunk:**

```csharp
[BurstCompile]
struct MoveChunkJob : IJobChunk
{
    public ComponentTypeHandle<LocalTransform> TransformHandle;
    [ReadOnly] public ComponentTypeHandle<Speed> SpeedHandle;
    public float DeltaTime;

    public void Execute(in ArchetypeChunk chunk, int unfilteredChunkIndex,
                        bool useEnabledMask, in v128 chunkEnabledMask)
    {
        var transforms = chunk.GetNativeArray(ref TransformHandle);
        var speeds     = chunk.GetNativeArray(ref SpeedHandle);

        var e = new ChunkEntityEnumerator(useEnabledMask, chunkEnabledMask, chunk.Count);
        while (e.NextEntityIndex(out int i))
        {
            var t = transforms[i];
            t.Position.z += speeds[i].Value * DeltaTime;
            transforms[i] = t;
        }
    }
}

// OnUpdate
var job = new MoveChunkJob {
    TransformHandle = SystemAPI.GetComponentTypeHandle<LocalTransform>(),
    SpeedHandle     = SystemAPI.GetComponentTypeHandle<Speed>(true),
    DeltaTime       = SystemAPI.Time.DeltaTime
};
state.Dependency = job.ScheduleParallel(query, state.Dependency);
```

**Truy cập entity khác (random access):**

```csharp
partial struct FollowJob : IJobEntity
{
    [ReadOnly] public ComponentLookup<LocalTransform> TransformLookup;
    [ReadOnly] public BufferLookup<Waypoint> WaypointLookup;

    void Execute(ref Velocity v, in Target target)
    {
        if (!TransformLookup.HasComponent(target.Value)) return;
        float3 targetPos = TransformLookup[target.Value].Position;
        // ...
    }
}

// Lấy lookup trong OnUpdate (hoặc cache ở OnCreate rồi gọi .Update(ref state) mỗi frame)
new FollowJob {
    TransformLookup = SystemAPI.GetComponentLookup<LocalTransform>(true),
    WaypointLookup  = SystemAPI.GetBufferLookup<Waypoint>(true)
}.ScheduleParallel();
```

| Chọn job nào? | Khi nào |
| --- | --- |
| `foreach SystemAPI.Query` | Logic nhẹ, main thread, prototype nhanh |
| `IJobEntity` | Mặc định cho xử lý song song theo entity |
| `IJobChunk` | Cần logic theo chunk, change version, tối ưu thủ công |
| `IJob` + `ToComponentDataArray` | Thuật toán toàn cục (sort, spatial hash) |

Ghi vào `ComponentLookup` trong `ScheduleParallel` cần `[NativeDisableParallelForRestriction]` và bạn phải đảm bảo không có hai thread ghi cùng một entity.

## 8. Burst Compiler

Burst biên dịch một tập con của C# (HPC#) sang mã native tối ưu qua LLVM, thường nhanh gấp nhiều lần Mono/IL2CPP cho code tính toán. Chỉ cần gắn `[BurstCompile]` lên job, ISystem và các method của nó.

**HPC# — được và không được:**

| Được | Không được |
| --- | --- |
| struct, primitive, enum, pointer (`unsafe`) | class, `string`, `object`, mảng managed |
| `NativeArray`, `NativeList`, Unsafe\* | `List<T>`, `Dictionary<K,V>` |
| `static readonly` primitive/struct | static field có thể ghi (trừ `SharedStatic<T>`) |
| `FixedString32/64/128Bytes` | Boxing, `try/catch` (chỉ `throw` khi có safety check) |
| `Unity.Mathematics` | Gọi Unity API managed (`Debug.Log` chỉ hỗ trợ dạng chuỗi đơn giản) |
| Generic (với struct) | Delegate managed, LINQ, `foreach` trên IEnumerable managed |

```csharp
[BurstCompile(FloatMode = FloatMode.Fast, FloatPrecision = FloatPrecision.Standard,
              CompileSynchronously = true)]
struct MyJob : IJob { public void Execute() { } }

// Static method Burst gọi từ code thường (function pointer / direct call)
[BurstCompile]
public static class MathUtil
{
    [BurstCompile]
    public static float Dist(in float3 a, in float3 b) => math.distance(a, b);
}

// Static có thể ghi, dùng được trong Burst
public static readonly SharedStatic<int> Counter =
    SharedStatic<int>.GetOrCreate<CounterKey>();
class CounterKey { }
```

| Tùy chọn | Giá trị | Ý nghĩa |
| --- | --- | --- |
| `FloatMode` | `Default`, `Strict`, `Deterministic`, `Fast` | `Fast` cho phép sắp xếp lại phép toán để vector hóa |
| `FloatPrecision` | `Standard`, `High`, `Medium`, `Low` | Độ chính xác hàm `sin`, `exp`… |
| `CompileSynchronously` | `true` | Editor chờ compile xong thay vì chạy Mono trước |
| `DisableSafetyChecks` | `true` | Bỏ kiểm tra bounds/safety (cẩn thận) |
| `OptimizeFor` | `Performance`, `Size`, `FastCompilation` | Ưu tiên tối ưu |

**Unity.Mathematics:** dùng `float3`, `float4x4`, `quaternion`, `int2`, `bool4` thay `Vector3`/`Quaternion`. Hàm trong `math.*`: `math.dot`, `math.cross`, `math.normalize`, `math.lerp`, `math.select` (thay `if` để tránh nhánh), `math.mul` (nhân ma trận/quaternion), `math.length`, `math.distancesq`. Random: `Unity.Mathematics.Random` (struct, seed khác 0).

**Gợi ý tối ưu cho compiler:**

- `[NoAlias]` trên tham số/field để báo không chồng vùng nhớ.
- `Unity.Burst.CompilerServices.Hint.Likely(cond)` / `Hint.Unlikely(cond)` cho nhánh.
- `Unity.Burst.CompilerServices.Loop.ExpectVectorized()` để báo lỗi compile nếu vòng lặp không vector hóa được.
- `Unity.Burst.Intrinsics` (`X86.Avx2`, `Arm.Neon`) khi cần SIMD thủ công; luôn kiểm tra `IsAvx2Supported`.

**Debug Burst:**

- Jobs → Burst → Enable Compilation (tắt để debug bằng breakpoint C# thường).
- Jobs → Burst → Open Inspector: xem assembly sinh ra, kiểm tra vector hóa.
- Jobs → Burst → Safety Checks: bật trong Editor, tắt khi đo hiệu năng.
- Native debugging: bật trong Burst Inspector rồi attach debugger native (Visual Studio/Rider).

## 9. Kỹ thuật nâng cao

Các pattern dưới đây giải quyết những bài toán gặp trong mọi dự án DOTS thực tế: config toàn cục, spawn hàng loạt, tránh structural change và dữ liệu chỉ đọc lớn.

**Singleton:**

```csharp
state.RequireForUpdate<GameConfig>();
var config = SystemAPI.GetSingleton<GameConfig>();
ref var cfgRW = ref SystemAPI.GetSingletonRW<GameConfig>().ValueRW;
Entity cfgEntity = SystemAPI.GetSingletonEntity<GameConfig>();
bool ok = SystemAPI.TryGetSingleton(out GameConfig c);
var buf = SystemAPI.GetSingletonBuffer<SpawnRequest>();
```

**Spawn hàng loạt từ prefab:**

```csharp
var prefab = SystemAPI.GetSingleton<Spawner>().Prefab;
var entities = state.EntityManager.Instantiate(prefab, 10000, Allocator.Temp);
var rng = new Random(1234);
foreach (var e in entities)
    SystemAPI.SetComponent(e, LocalTransform.FromPosition(rng.NextFloat3(-50, 50)));
```

`Instantiate` theo batch nhanh hơn gọi từng cái qua ECB rất nhiều.

**Enableable component thay vì Add/Remove:**

```csharp
SystemAPI.SetComponentEnabled<Stunned>(entity, true);
bool on = SystemAPI.IsComponentEnabled<Stunned>(entity);

foreach (var stunned in SystemAPI.Query<EnabledRefRW<Stunned>>())
    stunned.ValueRW = false;   // không gây structural change, an toàn trong job
```

**Change filtering:** `.WithChangeFilter<T>()` bỏ qua chunk có T không bị ghi kể từ lần system chạy trước. Lưu ý: chỉ cần *truy cập ghi* (`RefRW`, `ref`) là chunk bị coi là đổi, kể cả khi giá trị không đổi — nên đọc bằng `RefRO` khi không thật sự ghi.

**Blob Asset — dữ liệu bất biến lớn, chia sẻ:**

```csharp
public struct WaveBlob { public BlobArray<float> SpawnTimes; public float Duration; }
public struct WaveData : IComponentData { public BlobAssetReference<WaveBlob> Blob; }

// Trong Baker
var builder = new BlobBuilder(Allocator.Temp);
ref var root = ref builder.ConstructRoot<WaveBlob>();
var arr = builder.Allocate(ref root.SpawnTimes, 3);
arr[0] = 1f; arr[1] = 2f; arr[2] = 4f;
root.Duration = 10f;
var blob = builder.CreateBlobAssetReference<WaveBlob>(Allocator.Persistent);
builder.Dispose();
AddBlobAsset(ref blob, out _);           // để Baker quản lý vòng đời + dedupe
AddComponent(entity, new WaveData { Blob = blob });

// Đọc: luôn qua ref
ref var w = ref waveData.Blob.Value;
float t = w.SpawnTimes[0];
```

**Random trong job song song:** mỗi entity/thread một seed riêng, ví dụ `Random.CreateFromIndex((uint)entityIndex + frameCount)`. Không dùng chung một `Random` giữa các thread.

**Transform hệ 1.x:**

| Component | Vai trò |
| --- | --- |
| `LocalTransform` | Position, Rotation, Scale (uniform) — bạn ghi vào đây |
| `LocalToWorld` | Ma trận world, `TransformSystemGroup` tính ra — chỉ đọc |
| `Parent` / `Child` | Quan hệ cha con |
| `PostTransformMatrix` | Scale không đều |

Đọc vị trí world sau khi transform system chạy: `LocalToWorld.Position`. Ghi: `LocalTransform` (theo không gian cha).

**Hybrid với GameObject:** dùng managed component giữ tham chiếu (`class IComponentData`), đồng bộ trong `SystemBase` ở `PresentationSystemGroup`. Hoặc `IJobParallelForTransform` với `TransformAccessArray` để cập nhật hàng nghìn Transform song song.

**Unity Physics nhanh:**

- Authoring: `Rigidbody` + `Collider` thường trong SubScene đều được bake (hoặc `PhysicsBody`/`PhysicsShape`).
- Raycast: `SystemAPI.GetSingleton<PhysicsWorldSingleton>().CastRay(input, out RaycastHit hit)`.
- Va chạm: job `ICollisionEventsJob` / `ITriggerEventsJob`, schedule với `SimulationSingleton`, đặt system trong `PhysicsSystemGroup` (sau `PhysicsSimulationGroup`).
- Vận tốc: ghi `PhysicsVelocity.Linear` / `.Angular`.

**Netcode for Entities (tóm tắt):** client và server là hai World riêng. `[GhostField]` đánh dấu field cần đồng bộ; input qua `IInputComponentData`; logic dự đoán đặt trong `PredictedSimulationSystemGroup`. Lọc system theo world bằng `[WorldSystemFilter(WorldSystemFilterFlags.ServerSimulation)]`.

## 10. Hiệu năng, lỗi thường gặp và checklist

Phần lớn vấn đề hiệu năng DOTS đến từ sync point, structural change trong vòng lặp nóng, và code vô tình không chạy Burst.

**Lỗi thường gặp:**

| Triệu chứng / lỗi | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `InvalidOperationException: ... job is currently writing` | Main thread đọc dữ liệu job chưa xong | `state.Dependency.Complete()` hoặc chuyển logic vào job |
| `ArgumentException: entity does not exist` | Dùng entity đã destroy / entity tạm của ECB | Kiểm tra `Exists`, chỉ dùng entity ECB trong ECB đó |
| Cảnh báo leak `TempJob` | Quên `Dispose` hoặc job kéo dài > 4 frame | `Dispose(handle)`, dùng `WorldUpdateAllocator` |
| `Structural changes are not allowed while iterating` | Add/Remove/Destroy trong `foreach SystemAPI.Query` | Dùng ECB, playback sau vòng lặp |
| Burst báo lỗi managed type | Dùng `string`, `class`, `List` | Đổi sang `FixedString`, struct, NativeContainer |
| System không chạy | Không có entity khớp `RequireForUpdate` | Xem Entities → Systems window |
| Entity không hiện | Thiếu Entities Graphics hoặc SubScene chưa bake | Cài package, mở/đóng SubScene, kiểm tra `RenderMeshArray` |
| Hai job ghi cùng dữ liệu → lỗi safety | Thiếu dependency giữa job | Truyền `JobHandle` / dùng `state.Dependency` |

**Mẹo hiệu năng:**

- Tránh `Complete()` giữa frame; để ECS tự nối dependency.
- Gom structural change: `EntityManager` theo query > ECB > từng entity.
- Dùng enableable component cho trạng thái đổi thường xuyên.
- Component nhỏ, tách theo tần suất truy cập (hot/cold data).
- Tránh shared component có nhiều giá trị khác nhau → chunk phân mảnh.
- `ComponentLookup` là random access, chậm hơn duyệt chunk — dùng có chừng mực.
- Batch size của `IJobParallelFor`: 32–128 cho việc nhẹ, 1–8 cho việc nặng.
- Đo trong build Release, tắt Safety Checks và Leak Detection khi profile.

**Công cụ debug:**

| Công cụ | Đường dẫn | Dùng để |
| --- | --- | --- |
| Entities Hierarchy | Window → Entities → Hierarchy | Xem entity runtime, component |
| Systems window | Window → Entities → Systems | Thứ tự system, thời gian chạy, query |
| Archetypes window | Window → Entities → Archetypes | Số chunk, mức sử dụng bộ nhớ |
| Components window | Window → Entities → Components | Tìm entity theo component |
| Profiler (Timeline) | Window → Analysis → Profiler | Xem job trên worker thread, sync point |
| Burst Inspector | Jobs → Burst → Open Inspector | Kiểm tra assembly, vector hóa |
| Journaling | Preferences → Entities → Journaling | Truy vết ai thay đổi entity |

**Checklist khi viết system mới:**

- [ ] `partial struct ... : ISystem` có `[BurstCompile]` trên struct và từng method
- [ ] `RequireForUpdate<T>()` trong `OnCreate`
- [ ] Component đọc dùng `RefRO` / `in`, chỉ ghi khi thật sự cần
- [ ] Logic nặng chạy bằng `IJobEntity.ScheduleParallel()`
- [ ] Structural change đi qua ECB hoặc batch theo query
- [ ] Mọi NativeContainer đều được Dispose hoặc dùng `WorldUpdateAllocator`
- [ ] Đặt đúng `[UpdateInGroup]` / `[UpdateAfter]`
- [ ] Kiểm tra trong Profiler: không có sync point bất ngờ

**Lộ trình học gợi ý:** Mathematics → Job + Burst trên MonoBehaviour → ECS cơ bản + Baking → ISystem + `SystemAPI.Query` → IJobEntity + ECB → Lookup, Blob, Enableable → Physics/Netcode. Tham khảo thêm repo `Unity-Technologies/EntityComponentSystemSamples` trên GitHub và tài liệu Entities trên docs.unity3d.com.

## 11. Tối ưu ECS chuyên sâu

Hiệu năng ECS phụ thuộc trực tiếp vào số byte mỗi entity chiếm trong chunk: ít byte hơn = nhiều entity mỗi chunk hơn = ít cache miss hơn. Mọi mẹo dưới đây đều quy về việc đọc ít bộ nhớ hơn và đọc tuần tự hơn.

### 11.1 Sắp xếp thứ tự field trong struct

C# struct mặc định là `LayoutKind.Sequential`: field nằm theo thứ tự khai báo, mỗi field được căn lề (align) theo kích thước của nó. Khai báo lộn xộn sinh ra padding vô ích.

```csharp
// XẤU: 12 byte (6 byte padding)
public struct BadLayout : IComponentData
{
    public byte  A;   // 1 + 3 padding
    public float B;   // 4
    public byte  C;   // 1 + 3 padding (để size chia hết cho align 4)
}

// TỐT: 8 byte (2 byte padding)
public struct GoodLayout : IComponentData
{
    public float B;   // 4
    public byte  A;   // 1
    public byte  C;   // 1 + 2 padding
}
```

**Quy tắc:** khai báo field theo kích thước **giảm dần** — 8 byte (`double`, `long`, `Entity`, pointer) → 4 byte (`float`, `int`, `float3`) → 2 byte (`half`, `short`) → 1 byte (`byte`, `bool`).

| Kiểu | Size (byte) | Align (byte) |
| --- | --- | --- |
| `byte`, `bool` | 1 | 1 |
| `short`, `half` | 2 | 2 |
| `int`, `float` | 4 | 4 |
| `float2` | 8 | 4 |
| `float3` | 12 | 4 |
| `float4`, `quaternion` | 16 | 4 |
| `long`, `double`, `Entity` | 8 | 8 |
| `float4x4` | 64 | 4 |
| `FixedString64Bytes` | 64 | 2 |

Kiểm tra nhanh: `UnsafeUtility.SizeOf<T>()` hoặc xem cột size trong Window → Entities → Components.

### 11.2 Thu nhỏ component

- `bool` chiếm 1 byte; nhiều cờ → gộp vào một `byte`/`uint` bitflag (`[Flags] enum`).
- Dùng `half` / `half3` cho dữ liệu không cần độ chính xác cao (màu, hướng, tỉ lệ).
- `byte`/`ushort` cho ID nhỏ, enum: `enum State : byte { … }`.
- Lưu dữ liệu bất biến dùng chung (stats, curve, bảng tra) trong **Blob Asset**, component chỉ giữ `BlobAssetReference` (8 byte).
- Tag component = 0 byte trong chunk; ưu tiên tag hơn `bool IsEnemy`.
- Đừng lưu dữ liệu tính lại được rẻ (ví dụ `LocalToWorld` đã có, không cần copy vị trí world vào component khác).

### 11.3 Tách hot / cold data

System chỉ kéo vào cache những component nó truy vấn, nhưng chunk chứa *tất cả* component của archetype. Component lớn ít dùng làm giảm số entity mỗi chunk cho mọi system.

```csharp
// Thay vì một component "béo"
public struct Unit : IComponentData {
    public float3 Velocity; public float Health;
    public FixedString128Bytes DisplayName; public float4x4 DebugMatrix;
}

// Tách theo tần suất dùng
public struct Velocity : IComponentData { public float3 Value; }   // hot: mỗi frame
public struct Health   : IComponentData { public float Value; }    // warm
public struct UnitInfo : IComponentData { public BlobAssetReference<UnitBlob> Blob; } // cold
```

Một component nên chứa những field **luôn được đọc/ghi cùng nhau**. Field thường dùng riêng lẻ → component riêng.

### 11.4 Hiểu dung lượng chunk

- Chunk = 16 KB; mỗi entity tốn `sizeof(Entity)` 8 byte + tổng size các component + bit enable.
- Entities 1.x giới hạn **tối đa 128 entity/chunk**, tức khoảng 128 byte/entity là ngưỡng đầy chunk. Dưới ngưỡng này, thu nhỏ thêm không giảm số chunk nhưng vẫn giảm băng thông bộ nhớ của từng system.
- Xem mức lấp đầy ở Window → Entities → Archetypes: nhiều chunk chỉ đầy một phần = phân mảnh.

### 11.5 DynamicBuffer và InternalBufferCapacity

- Buffer nằm *trong chunk* cho tới `InternalBufferCapacity` phần tử (mặc định ≈ 128 byte), vượt quá thì chuyển ra heap và vùng trong chunk bị lãng phí.
- Buffer thường lớn → đặt `[InternalBufferCapacity(0)]` để luôn ở heap, giữ chunk gọn.
- Buffer nhỏ, cố định (≤ 4–8 phần tử) → đặt capacity đúng bằng đó để dữ liệu nằm liền với entity.

### 11.6 Tránh phân mảnh archetype

- `ISharedComponentData` với nhiều giá trị khác nhau → mỗi giá trị một chunk gần rỗng. Chỉ dùng cho tập giá trị nhỏ.
- Add/Remove tag liên tục tạo churn giữa archetype. Trạng thái bật/tắt thường xuyên → `IEnableableComponent`.
- Ngược lại, khi **phần lớn** entity bị tắt lâu dài, Remove component lại tốt hơn: enableable vẫn bắt system duyệt chunk và kiểm tra bitmask.
- Prefab có `LinkedEntityGroup` lớn (nhiều child) làm `Instantiate` đắt; gộp mesh hoặc bỏ child không cần thiết khi bake.

### 11.7 Truy cập dữ liệu trong system

- Đọc bằng `RefRO` / `in` / `[ReadOnly]`: cho phép job khác chạy song song và không bump change version.
- Cache `ComponentLookup`, `ComponentTypeHandle`, `EntityQuery` trong `OnCreate`, gọi `.Update(ref state)` trong `OnUpdate` (SystemAPI làm điều này tự động — tự cache khi viết tay `IJobChunk`).
- Hạn chế `ComponentLookup` (random access). Nếu cần dữ liệu của target mỗi frame, cân nhắc copy dữ liệu cần thiết vào component của chính entity trong một system riêng.
- Gộp nhiều logic đọc cùng component vào một job thay vì nhiều job duyệt lại cùng chunk.
- Logic không cần chạy mỗi frame → giảm tần suất: `RateUtils.VariableRateManager` / `FixedRateSimpleManager` trên system group, hoặc chia entity theo frame (`entityIndex % N == frameCount % N`).

### 11.8 Code thân thiện Burst và SIMD

- Vòng lặp đơn giản trên `NativeArray` trong `IJobChunk` dễ vector hóa nhất; tránh lời gọi hàm phức tạp và nhánh trong vòng lặp.
- Dùng `math.select(a, b, cond)` thay `if/else` cho phép gán đơn giản.
- So sánh khoảng cách bằng `math.distancesq` để tránh `sqrt`.
- Tính sẵn giá trị bất biến (`dt`, `1f / x`) ngoài vòng lặp, truyền vào job.
- Dùng `FloatMode.Fast` khi không cần determinism.
- Kiểm tra trong Burst Inspector: tìm lệnh dạng `vmulps`, `vaddps` (AVX) hoặc `fmul v0.4s` (NEON) là đã vector hóa.

### 11.9 Bộ nhớ và allocation

- Trong system dùng `state.WorldUpdateAllocator` hoặc `Allocator.Temp` thay vì `Persistent` cho dữ liệu tạm.
- `NativeList` / `NativeHashMap` dùng lại qua nhiều frame: tạo `Persistent` ở `OnCreate`, gọi `.Clear()` mỗi frame, `Dispose` ở `OnDestroy`.
- Khởi tạo đúng capacity trước (`new NativeList<T>(expectedCount, …)`) để tránh resize.
- Copy khối lớn: `NativeArray.CopyFrom`, `UnsafeUtility.MemCpy` thay vì vòng lặp từng phần tử.

| Mẹo | Lợi ích chính |
| --- | --- |
| Sắp field theo size giảm dần | Giảm padding, component nhỏ hơn |
| Bitflag, `half`, enum `byte` | Nhiều entity/chunk hơn |
| Tách hot/cold | Ít cache miss cho system nóng |
| Blob Asset cho dữ liệu chung | Không nhân bản dữ liệu theo entity |
| `InternalBufferCapacity` hợp lý | Chunk gọn, buffer nằm liền entity |
| Enableable vs Remove đúng chỗ | Không structural change / không duyệt thừa |
| `RefRO` / `[ReadOnly]` | Song song hơn, change filter chính xác |
| Giảm tần suất update | Bớt công việc mỗi frame |
