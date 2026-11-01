---
title: "Unity Render Pipeline: Built-in, URP, HDRP và Custom SRP"
description: "So sánh bốn cách render, Renderer Feature với Render Graph, Custom Pass của HDRP và tự viết một Scriptable Render Pipeline."
date: 2026-10-01
tags: [Unity, URP, HDRP, SRP]
---

## 1. Tổng quan & chọn pipeline

Render pipeline là chuỗi bước Unity dùng để biến scene thành ảnh: culling → rendering → post-processing. Dự án mới nên dùng URP, trừ khi cần đồ họa cao cấp trên PC/console (HDRP) hoặc cần kiểm soát hoàn toàn (Custom SRP).

| Pipeline | Nền tảng | Mức tùy biến | Dùng khi |
| --- | --- | --- | --- |
| Built-in | Mọi nền tảng | Trung bình (CommandBuffer, surface shader) | Dự án cũ, asset store cũ; không có tính năng mới |
| URP | Mobile, PC, console, XR, WebGL | Cao (Renderer Feature, Render Graph) | Mặc định cho hầu hết game mới |
| HDRP | PC, console cao cấp (DX12/Vulkan/Metal) | Cao nhưng nặng (Custom Pass, Volume) | AAA, kiến trúc, phim, ảnh thực |
| Custom SRP | Bạn tự quyết | Toàn quyền | Phong cách riêng, nghiên cứu, engine nội bộ |

Quy tắc nhớ nhanh:

- URP và HDRP đều xây trên Scriptable Render Pipeline (SRP) và SRP Core package.
- Shader và material không dùng chung được giữa các pipeline; đổi pipeline giữa chừng rất tốn công.
- Đổi pipeline: Project Settings → Graphics → Default Render Pipeline (gán asset); từng Quality level có thể override.
- Ở Unity 6, URP và HDRP dùng Render Graph; code dùng API cũ (Execute/Configure) chỉ chạy ở Compatibility Mode.

## 2. Built-in Render Pipeline

Built-in là pipeline cố định: bạn chỉ chèn lệnh vào các điểm có sẵn chứ không đổi được thứ tự render.

| Khái niệm | Ghi chú |
| --- | --- |
| Rendering Path | Forward (mỗi light thêm 1 pass), Deferred (G-buffer, nhiều light rẻ), Legacy Vertex Lit |
| Surface Shader | `#pragma surface surf Standard fullforwardshadows` — Unity tự sinh pass lighting |
| Pass tags | `ForwardBase`, `ForwardAdd`, `ShadowCaster`, `Deferred`, `Meta` |
| Include | `UnityCG.cginc`, `Lighting.cginc`, `AutoLight.cginc` |
| Post-processing | Post Processing Stack v2 (package) hoặc `OnRenderImage` |
| Mở rộng | `CommandBuffer` gắn vào `CameraEvent` / `LightEvent` |

Chèn lệnh bằng CommandBuffer:

```csharp
var cb = new CommandBuffer { name = "Outline" };
int tmp = Shader.PropertyToID("_Tmp");
cb.GetTemporaryRT(tmp, -1, -1, 0, FilterMode.Bilinear);
cb.Blit(BuiltinRenderTextureType.CameraTarget, tmp, outlineMat);
cb.Blit(tmp, BuiltinRenderTextureType.CameraTarget);
cb.ReleaseTemporaryRT(tmp);
cam.AddCommandBuffer(CameraEvent.AfterForwardAlpha, cb);
```

Post effect kiểu cũ (chỉ Built-in):

```csharp
void OnRenderImage(RenderTexture src, RenderTexture dst)
{
    Graphics.Blit(src, dst, effectMat);
}
```

## 3. URP (Universal Render Pipeline)

URP mở rộng chủ yếu qua ScriptableRendererFeature: thêm pass vào renderer mà không sửa package.

| Thành phần | Vai trò |
| --- | --- |
| URP Asset | Chất lượng chung: HDR, MSAA, render scale, shadow distance/cascades, SRP Batcher |
| Universal Renderer Data | Rendering path, depth/opaque texture, danh sách Renderer Features |
| Rendering Path | Forward (giới hạn light/object), Forward+ (clustered, nhiều light), Deferred |
| Volume + Volume Profile | Post-processing: Bloom, Tonemapping, Color Adjustments, DoF... |
| Camera Stack | Base camera + Overlay camera (UI, súng FPS) |
| `_CameraDepthTexture` / `_CameraOpaqueTexture` | Bật trong asset để shader đọc depth hoặc màu scene |

`RenderPassEvent` hay dùng: `BeforeRenderingOpaques`, `AfterRenderingOpaques`, `AfterRenderingSkybox`, `BeforeRenderingTransparents`, `BeforeRenderingPostProcessing`, `AfterRendering`.

Renderer Feature full-screen (Unity 6, Render Graph):

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.RenderGraphModule.Util;

public class TintFeature : ScriptableRendererFeature
{
    public Material material;
    TintPass pass;

    public override void Create()
    {
        pass = new TintPass { renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing };
    }

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData data)
    {
        if (material == null) return;
        pass.material = material;
        renderer.EnqueuePass(pass);
    }
}

class TintPass : ScriptableRenderPass
{
    public Material material;
    public TintPass() { requiresIntermediateTexture = true; }

    public override void RecordRenderGraph(RenderGraph rg, ContextContainer frameData)
    {
        var res = frameData.Get<UniversalResourceData>();
        if (res.isActiveTargetBackBuffer) return;

        TextureHandle src = res.activeColorTexture;
        var desc = rg.GetTextureDesc(src);
        desc.name = "_TintTex";
        desc.clearBuffer = false;
        TextureHandle dst = rg.CreateTexture(desc);

        rg.AddBlitPass(new RenderGraphUtils.BlitMaterialParameters(src, dst, material, 0), "Tint");
        res.cameraColor = dst; // pass sau dùng kết quả này
    }
}
```

Mẹo URP:

- Hiệu ứng full-screen đơn giản: dùng sẵn **Full Screen Pass Renderer Feature** + Fullscreen Shader Graph, không cần code.
- Vẽ lại object theo layer (outline, x-ray): **Render Objects** feature với Layer Mask + Override Material.
- Custom post effect có tham số trong Volume: tạo class kế thừa `VolumeComponent, IPostProcessComponent`, đọc bằng `VolumeManager.instance.stack.GetComponent<T>()` trong pass.

## 4. HDRP (High Definition Render Pipeline)

HDRP dùng đơn vị vật lý và Volume cho gần như mọi thứ; mở rộng chính qua Custom Pass và Custom Post Process.

| Thành phần | Ghi chú |
| --- | --- |
| HDRP Asset | Bật/tắt tính năng ở mức dự án (SSR, SSGI, ray tracing, decals, volumetrics) |
| Frame Settings | Bật/tắt tính năng theo từng camera, reflection probe |
| Volume | Sky, Fog, Exposure, Shadows, GI, Post — override theo vùng |
| Đơn vị ánh sáng | Lux (directional), Lumen/Candela (point/spot), Exposure theo EV100 |
| Lit shader | Material types: Standard, Subsurface Scattering, Anisotropy, Iridescence, Translucent |
| Ray tracing | Cần DX12; RT reflections, shadows, GI, AO, path tracing |

Injection Point của Custom Pass: `BeforeRendering`, `AfterOpaqueDepthAndNormal`, `AfterOpaqueColor`, `BeforePreRefraction`, `BeforeTransparent`, `BeforePostProcess`, `AfterPostProcess`.

Custom Pass full-screen (thêm Custom Pass Volume vào scene, chọn pass này):

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.HighDefinition;

class ScanlinePass : CustomPass
{
    public Material material;

    protected override void Execute(CustomPassContext ctx)
    {
        if (material == null) return;
        CoreUtils.SetRenderTarget(ctx.cmd, ctx.cameraColorBuffer, ClearFlag.None);
        CoreUtils.DrawFullScreen(ctx.cmd, material, ctx.propertyBlock, shaderPassId: 0);
    }
}
```

Vẽ lại object theo layer: `CustomPassUtils.DrawRenderers(ctx, layerMask, overrideMaterial: mat)`.

Custom Post Process: kế thừa `CustomPostProcessVolumeComponent, IPostProcessComponent`, override `Render(CommandBuffer cmd, HDCamera cam, RTHandle src, RTHandle dst)`, rồi đăng ký trong Project Settings → Graphics → HDRP Global Settings → Custom Post Process Orders.

## 5. Shader theo từng pipeline

Khác biệt cốt lõi là thư viện include và tag `LightMode`; pipeline chỉ vẽ pass có LightMode mà nó yêu cầu.

|  | Built-in | URP | HDRP | Custom SRP |
| --- | --- | --- | --- | --- |
| Ngôn ngữ | CG/HLSL (`CGPROGRAM`) | HLSL (`HLSLPROGRAM`) | HLSL | HLSL |
| Include chính | `UnityCG.cginc` | `Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl`, `Lighting.hlsl` | `.../high-definition/Runtime/ShaderLibrary/ShaderVariables.hlsl` | `Packages/com.unity.render-pipelines.core/ShaderLibrary/Common.hlsl` + file của bạn |
| LightMode chính | `ForwardBase`, `ForwardAdd`, `Deferred` | `UniversalForward`, `UniversalGBuffer`, `DepthNormals` | `Forward`, `ForwardOnly`, `GBuffer` | Tự đặt (vd. `CustomLit`) |
| LightMode chung | `ShadowCaster`, `Meta` | `ShadowCaster`, `DepthOnly`, `Meta`, `SRPDefaultUnlit` | `ShadowCaster`, `DepthOnly`, `MotionVectors` | `SRPDefaultUnlit` + tự đặt |
| Surface Shader | Có | Không | Không | Không |
| Shader Graph | Hỗ trợ hạn chế | Có | Có | Không (trừ khi tự viết target) |

Khung shader URP unlit, tương thích SRP Batcher:

```hlsl
Shader "Custom/URPUnlit"
{
    Properties
    {
        _BaseMap ("Texture", 2D) = "white" {}
        _BaseColor ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry" }
        Pass
        {
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            CBUFFER_START(UnityPerMaterial)   // bắt buộc cho SRP Batcher
                float4 _BaseMap_ST;
                half4 _BaseColor;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert (Attributes v)
            {
                Varyings o;
                o.positionCS = TransformObjectToHClip(v.positionOS.xyz);
                o.uv = TRANSFORM_TEX(v.uv, _BaseMap);
                return o;
            }

            half4 frag (Varyings i) : SV_Target
            {
                return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, i.uv) * _BaseColor;
            }
            ENDHLSL
        }
    }
}
```

Điểm cần nhớ:

- SRP Batcher: mọi property của material nằm trong `CBUFFER UnityPerMaterial`; kiểm tra ô "SRP Batcher: compatible" trong Inspector của shader.
- Một shader hỗ trợ nhiều pipeline: viết nhiều SubShader, mỗi cái gắn tag `RenderPipeline` khác nhau.
- Giảm variant: `shader_feature_local` thay vì `multi_compile` khi keyword chỉ đổi theo material.
- Lighting URP: `GetMainLight()`, `GetAdditionalLightsCount()`, `GetAdditionalLight(i, posWS)`; shadow cần keyword `_MAIN_LIGHT_SHADOWS`.

## 6. Custom SRP từ đầu

Một SRP tối thiểu chỉ cần 2 class: Asset (tạo pipeline) và Pipeline (hàm `Render` mỗi frame). Cài package Core RP để có thư viện shader và tiện ích.

Vòng đời mỗi camera:

1. Lấy culling params: `cam.TryGetCullingParameters(out p)`
2. Cull: `ctx.Cull(ref p)` → `CullingResults` (renderer, light, probe thấy được)
3. Gán ma trận camera: `ctx.SetupCameraProperties(cam)`
4. Clear target, vẽ opaque → skybox → transparent bằng RendererList
5. `ctx.ExecuteCommandBuffer(cmd)` rồi `ctx.Submit()`

```csharp
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.RendererUtils;

[CreateAssetMenu(menuName = "Rendering/My Pipeline")]
public class MyPipelineAsset : RenderPipelineAsset
{
    public bool useSRPBatcher = true;
    protected override RenderPipeline CreatePipeline() => new MyPipeline(this);
}

public class MyPipeline : RenderPipeline
{
    static readonly ShaderTagId UnlitTag = new("SRPDefaultUnlit");
    static readonly ShaderTagId LitTag   = new("CustomLit");

    public MyPipeline(MyPipelineAsset asset)
    {
        GraphicsSettings.useScriptableRenderPipelineBatching = asset.useSRPBatcher;
        GraphicsSettings.lightsUseLinearIntensity = true;
    }

    protected override void Render(ScriptableRenderContext ctx, List<Camera> cameras)
    {
        foreach (var cam in cameras) RenderCamera(ctx, cam);
    }

    void RenderCamera(ScriptableRenderContext ctx, Camera cam)
    {
#if UNITY_EDITOR
        if (cam.cameraType == CameraType.SceneView)
            ScriptableRenderContext.EmitWorldGeometryForSceneView(cam); // UI trong Scene view
#endif
        if (!cam.TryGetCullingParameters(out var p)) return;
        CullingResults cull = ctx.Cull(ref p);
        ctx.SetupCameraProperties(cam);

        var cmd = new CommandBuffer { name = cam.name };
        cmd.ClearRenderTarget(true, true, cam.backgroundColor.linear);

        // Opaque: front-to-back
        var sort = new SortingSettings(cam) { criteria = SortingCriteria.CommonOpaque };
        var draw = new DrawingSettings(UnlitTag, sort);
        draw.SetShaderPassName(1, LitTag);
        var filter = new FilteringSettings(RenderQueueRange.opaque);
        cmd.DrawRendererList(ctx.CreateRendererList(new RendererListParams(cull, draw, filter)));

        // Skybox
        cmd.DrawRendererList(ctx.CreateSkyboxRendererList(cam));

        // Transparent: back-to-front
        sort.criteria = SortingCriteria.CommonTransparent;
        draw.sortingSettings = sort;
        filter.renderQueueRange = RenderQueueRange.transparent;
        cmd.DrawRendererList(ctx.CreateRendererList(new RendererListParams(cull, draw, filter)));

        ctx.ExecuteCommandBuffer(cmd);
        cmd.Release();
        ctx.Submit();
    }
}
```

Tạo asset (Create → Rendering → My Pipeline) và gán vào Project Settings → Graphics. Shader của bạn dùng `LightMode = CustomLit` hoặc không đặt LightMode (= `SRPDefaultUnlit`).

Lộ trình nâng cấp SRP tự viết:

1. **Lighting**: đọc `cull.visibleLights`, đẩy màu/hướng vào global buffer (`cmd.SetGlobalVectorArray`), tính lighting trong shader.
2. **Shadow**: render shadow atlas với `ctx.CreateShadowRendererList(new ShadowDrawingSettings(cull, lightIndex))` + `cull.ComputeDirectionalShadowMatricesAndCullingPrimitives`.
3. **Render texture trung gian**: `cmd.GetTemporaryRT` hoặc `RTHandles`, render scene vào đó rồi blit ra camera target.
4. **Post-processing**: chuỗi blit (bloom, tonemapping) giữa các RT.
5. **Gizmos/editor**: `ctx.CreateGizmoRendererList(cam, GizmoSubset.PreImageEffects)` và `PostImageEffects`.
6. **Render Graph**: chuyển các bước trên sang Render Graph (phần 7) để tự quản lý tài nguyên.

Lưu ý: phiên bản Unity cũ hơn 2022 dùng `Render(ScriptableRenderContext, Camera[])` và `ctx.DrawRenderers(...)` thay cho RendererList.

## 7. Nâng cao: Render Graph, RTHandle, Blitter, Compute

Render Graph cho bạn khai báo pass đọc/ghi tài nguyên nào; hệ thống tự cấp phát texture, gộp pass và bỏ pass không dùng.

| API | Dùng để |
| --- | --- |
| `AddRasterRenderPass<T>` | Vẽ vào render target (draw, blit) |
| `AddComputePass<T>` | Dispatch compute shader |
| `AddUnsafePass<T>` | Code cũ cần `CommandBuffer` đầy đủ, đổi target giữa pass |
| `rg.CreateTexture(desc)` | Texture tạm, sống trong 1 frame |
| `rg.ImportTexture(rtHandle)` | Texture tồn tại qua nhiều frame (history, TAA, trail) |
| `builder.UseTexture(h, AccessFlags.Read)` | Khai báo đọc texture |
| `builder.SetRenderAttachment(h, 0)` | Khai báo ghi color target |
| `builder.AllowPassCulling(false)` | Giữ pass dù không ai đọc kết quả |
| `frameData.Get<UniversalCameraData>()` | Lấy camera, light, resource data (URP) |
| `ContextItem` | Chia sẻ dữ liệu tự định nghĩa giữa các pass |

Raster pass tự viết (thay cho AddBlitPass khi cần nhiều input):

```csharp
class PassData { public TextureHandle src; public Material mat; }

using (var b = rg.AddRasterRenderPass<PassData>("Custom Blit", out var data))
{
    data.src = res.activeColorTexture;
    data.mat = material;
    b.UseTexture(data.src, AccessFlags.Read);
    b.SetRenderAttachment(dst, 0, AccessFlags.Write);
    b.SetRenderFunc((PassData d, RasterGraphContext ctx) =>
        Blitter.BlitTexture(ctx.cmd, d.src, new Vector4(1, 1, 0, 0), d.mat, 0));
}
```

Compute pass:

```csharp
class CsData { public ComputeShader cs; public TextureHandle tex; public int w, h; }

using (var b = rg.AddComputePass<CsData>("Blur CS", out var d))
{
    d.cs = blurCS; d.tex = rwTex; d.w = width; d.h = height; // rwTex: desc.enableRandomWrite = true
    b.UseTexture(d.tex, AccessFlags.ReadWrite);
    b.SetRenderFunc((CsData x, ComputeGraphContext ctx) =>
    {
        int k = x.cs.FindKernel("CSMain");
        ctx.cmd.SetComputeTextureParam(x.cs, k, "_Result", x.tex);
        ctx.cmd.DispatchCompute(x.cs, k, (x.w + 7) / 8, (x.h + 7) / 8, 1);
    });
}
```

Shader full-screen dùng với Blitter (URP):

```hlsl
HLSLPROGRAM
#pragma vertex Vert
#pragma fragment Frag
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
#include "Packages/com.unity.render-pipelines.core/Runtime/Utilities/Blit.hlsl"
half4 _Tint;
half4 Frag (Varyings i) : SV_Target
{
    return SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, i.texcoord) * _Tint;
}
ENDHLSL
```

Quy tắc tránh lỗi:

- Không lưu `TextureHandle` qua frame; chỉ `RTHandle` import mới tồn tại lâu.
- Trong render func chỉ dùng dữ liệu từ `PassData`, không bắt biến bên ngoài lambda (tránh alloc và sai dữ liệu).
- Dùng `Blitter` thay `cmd.Blit` trong SRP: hỗ trợ XR, texture array và scale RTHandle.
- Debug: Window → Analysis → Render Graph Viewer để xem pass, tài nguyên, pass bị cull.

## 8. Tối ưu & debug

Đo trước rồi mới tối ưu: Frame Debugger cho biết vẽ gì, Profiler và RenderDoc cho biết tốn bao nhiêu.

| Công cụ | Xem được gì |
| --- | --- |
| Frame Debugger (Window → Analysis) | Từng draw call, pass, keyword, lý do không batch được |
| Profiler (GPU module) + Profile Analyzer | Thời gian CPU/GPU theo marker |
| RenderDoc (chuột phải tab Game → Load RenderDoc) | Texture, buffer, state từng draw |
| Rendering Debugger (Window → Analysis) | Overdraw, lighting, material, mipmap (URP/HDRP) |
| Render Graph Viewer | Pass, tài nguyên, pass bị cull |
| Xcode / PIX / Android GPU Inspector | Profiling GPU trên thiết bị thật |

Thứ tự ưu tiên batching trong SRP:

1. **SRP Batcher**: giảm chi phí set state cho nhiều material dùng chung shader variant.
2. **GPU Resident Drawer** (Unity 6, cần Forward+): tự instancing qua BatchRendererGroup cho nhiều mesh giống nhau.
3. **GPU Instancing**: nhiều object cùng mesh + material; không cộng dồn với SRP Batcher trên cùng object.
4. **Static batching**: object tĩnh, đổi RAM lấy draw call.

Checklist nhanh:

- Mobile: tắt MSAA hoặc để 2x, render scale 0.7–0.9, tránh `_CameraOpaqueTexture` nếu không cần.
- Transparent và alpha-test tốn overdraw; kiểm tra bằng chế độ Overdraw.
- Giảm shader variant: `shader_feature_local`, Shader Stripping trong Graphics settings, `IPreprocessShaders` để strip theo ý.
- Shadow: giảm cascade, shadow distance, độ phân giải atlas; tắt cast shadow ở object nhỏ.
- Mỗi Renderer Feature thêm pass full-screen là tốn băng thông; gộp hiệu ứng vào ít pass nhất.

## 9. Chuyển đổi pipeline & bảng tra nhanh

Built-in → URP dùng Window → Rendering → Render Pipeline Converter; Built-in → HDRP dùng HDRP Wizard rồi Edit → Rendering → Materials → Convert. Shader tự viết luôn phải viết lại bằng tay.

| Built-in | URP | HDRP | Custom SRP |
| --- | --- | --- | --- |
| `OnRenderImage` | Renderer Feature / Full Screen Pass | Custom Post Process | Blit trong `Render` |
| `CommandBuffer` + `CameraEvent` | `ScriptableRenderPass` + `RenderPassEvent` | `CustomPass` + Injection Point | Tự chèn vào thứ tự render |
| Post Processing Stack v2 | Volume (URP) | Volume (HDRP) | Tự viết |
| `Camera.depthTextureMode` | Depth Texture trong asset / `ConfigureInput` | Luôn có depth | Tự render depth prepass |
| `Camera.onPreRender` / `OnPostRender` | `RenderPipelineManager.beginCameraRendering` / `endCameraRendering` | Như URP | Tự gọi trong `Render` |
| Projector | Decal Renderer Feature + Decal Projector | Decal Projector | Tự viết |
| Surface Shader | Shader Graph hoặc HLSL + `Lighting.hlsl` | Shader Graph hoặc HLSL | HLSL |
| `Standard` shader | `Universal Render Pipeline/Lit` | `HDRP/Lit` | Shader của bạn |
| `Graphics.Blit` | `Blitter` / `AddBlitPass` | `Blitter` / `CoreUtils.DrawFullScreen` | `Blitter` |

Kiểm tra pipeline đang chạy trong code:

```csharp
var rp = GraphicsSettings.currentRenderPipeline;
bool isBuiltIn = rp == null;
bool isURP = rp is UnityEngine.Rendering.Universal.UniversalRenderPipelineAsset;
```

Trong shader, dùng tag SubShader `"RenderPipeline"="UniversalPipeline"` hoặc `"HDRenderPipeline"`; SubShader không có tag này sẽ được Built-in và Custom SRP chọn.
