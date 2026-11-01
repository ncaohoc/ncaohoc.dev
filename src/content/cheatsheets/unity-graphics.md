---
title: "Unity Graphics từ cơ bản đến nâng cao"
description: "Chọn render pipeline, ánh sáng và bóng, shader, post-processing, Renderer Feature và tối ưu đồ hoạ trong Unity 6."
date: 2026-10-01
tags: [Unity, URP, Rendering]
---

## 1. Tổng quan: chọn Render Pipeline

Dự án mới trên Unity 6 nên dùng URP, trừ khi cần đồ họa AAA trên PC/console thì chọn HDRP. Built-in đang dần bị thay thế, chỉ giữ cho dự án cũ.

| Tiêu chí | Built-in | URP | HDRP |
| --- | --- | --- | --- |
| Nền tảng | Mọi nền tảng | Mọi nền tảng (mobile, VR, web, console, PC) | PC, console đời mới |
| Hiệu năng | Trung bình | Nhẹ, tối ưu nhất | Nặng |
| Chất lượng hình | Khá | Tốt, có thể nâng cao | Rất cao, physically based |
| Shader viết tay | Surface Shader, CGPROGRAM | HLSL + include của URP | HLSL + include của HDRP |
| Shader Graph | Hỗ trợ hạn chế | Có | Có |
| Tùy biến pipeline | Command Buffer | Renderer Feature, Render Graph | Custom Pass |
| Rendering path | Forward, Deferred | Forward, Forward+, Deferred, Deferred+ | Deferred, Forward |

**Khái niệm nền tảng**

- **Draw call**: một lệnh CPU gửi GPU để vẽ một mesh với một material. Càng ít càng tốt.
- **SetPass call**: số lần đổi trạng thái shader. Thường đắt hơn draw call.
- **Forward**: mỗi object tính ánh sáng trực tiếp; tốt khi ít đèn, hỗ trợ MSAA và vật trong suốt.
- **Forward+**: chia màn hình thành tile, cho phép nhiều đèn mà không giới hạn 8 đèn/object.
- **Deferred**: vẽ G-Buffer trước, tính ánh sáng sau; tốt khi rất nhiều đèn, không có MSAA.
- **Linear vs Gamma**: luôn dùng Linear color space (Project Settings > Player) để ánh sáng chính xác.
- **HDR**: bật trên camera/pipeline asset để có Bloom và tonemapping đúng.

**Thiết lập URP nhanh**

1. Tạo asset: Create > Rendering > URP Asset (with Universal Renderer).
2. Gán vào Project Settings > Graphics và Quality > Render Pipeline Asset.
3. Chuyển material cũ: Window > Rendering > Render Pipeline Converter.

## 2. Cơ bản: các thành phần đồ họa

Một object hiển thị cần 3 thứ: Mesh (hình dạng), Material (cách tô) và Renderer (component vẽ). Material lại tham chiếu tới một Shader và các Texture.

| Thành phần | Vai trò | Ghi nhớ nhanh |
| --- | --- | --- |
| Mesh | Đỉnh, tam giác, UV, normal, tangent | Bật Read/Write chỉ khi cần sửa mesh lúc runtime (tốn RAM gấp đôi) |
| MeshFilter | Giữ tham chiếu tới Mesh | `GetComponent<MeshFilter>().sharedMesh` |
| MeshRenderer | Vẽ mesh tĩnh | Cài đặt shadow, light probe, layer |
| SkinnedMeshRenderer | Vẽ mesh có xương | Đắt hơn; dùng GPU Skinning (Player Settings) |
| SpriteRenderer | Vẽ sprite 2D | Dùng Sprite Atlas để batch |
| Material | Instance cấu hình của shader | `renderer.material` tạo bản sao; `sharedMaterial` thì không |
| Shader | Chương trình GPU | URP mặc định: Lit, Simple Lit, Unlit |
| Texture | Ảnh dữ liệu | Bật mipmap cho 3D, tắt cho UI |
| Camera | Góc nhìn, culling mask, clear flags | URP: Base + Overlay camera stack |
| Light | Directional, Point, Spot, Area | Area chỉ bake (trừ HDRP) |

**Kênh texture chuẩn của URP Lit**

- **Base Map**: màu albedo (sRGB bật).
- **Normal Map**: Texture Type = Normal map (sRGB tắt).
- **Metallic Map**: R = metallic, A = smoothness.
- **Occlusion**: kênh G.
- **Emission**: màu tự phát sáng, kết hợp Bloom để có hiệu ứng glow.

**Thứ tự render (Render Queue)**

| Queue | Giá trị | Dùng cho |
| --- | --- | --- |
| Background | 1000 | Skybox |
| Geometry | 2000 | Vật đục (mặc định) |
| AlphaTest | 2450 | Cutout (lá cây, hàng rào) |
| Transparent | 3000 | Vật trong suốt, vẽ từ xa đến gần |
| Overlay | 4000 | Lens flare, UI trên cùng |

## 3. Ánh sáng và bóng

Quy tắc vàng: bake mọi thứ tĩnh, chỉ để realtime cho đèn và vật thực sự chuyển động.

| Light Mode | Tính khi nào | Chi phí runtime | Dùng cho |
| --- | --- | --- | --- |
| Realtime | Mỗi frame | Cao | Đèn pin, đèn nhấp nháy, chu kỳ ngày đêm |
| Baked | Lúc bake | Gần như 0 | Đèn tĩnh chiếu vật tĩnh |
| Mixed | Direct realtime + indirect baked | Trung bình | Mặt trời chiếu cả vật tĩnh lẫn động |

**Mixed Lighting Mode**

- **Baked Indirect**: bóng realtime, ánh sáng gián tiếp baked. Chất lượng tốt, tốn hơn.
- **Shadowmask**: bóng vật tĩnh lưu vào texture, vật động vẫn có bóng realtime. Cân bằng nhất.
- **Subtractive**: rẻ nhất, cho mobile thấp cấp; chỉ một directional light.

**Global Illumination**

- Đánh dấu vật tĩnh: Static > Contribute GI.
- Mở Window > Rendering > Lighting để bake; dùng Progressive GPU lightmapper cho nhanh.
- **Lightmap UV**: bật Generate Lightmap UVs trong Model Import Settings.
- **Light Probes**: cho vật động nhận ánh sáng baked. Unity 6 có Adaptive Probe Volumes (APV), tự rải probe, thay cho Light Probe Group thủ công.
- **Reflection Probes**: chụp cubemap môi trường cho phản chiếu. Mode Baked cho tĩnh, Realtime chỉ khi thật cần (rất đắt).

**Cài đặt bóng (URP Asset > Shadows)**

| Thông số | Tác dụng | Gợi ý |
| --- | --- | --- |
| Max Distance | Khoảng cách tối đa có bóng | 50–80 m cho mobile, 150 m cho PC |
| Cascade Count | Số tầng shadow map | 1–2 mobile, 4 PC |
| Shadow Resolution | Độ nét bóng | 1024–2048 mobile, 4096 PC |
| Depth Bias | Chống shadow acne (sọc bóng) | Tăng nếu thấy sọc |
| Normal Bias | Chống peter-panning (bóng tách khỏi vật) | Giảm nếu bóng hở chân |
| Soft Shadows | Bóng mềm | Tắt trên mobile yếu |

**Lỗi ánh sáng thường gặp**

- Lightmap có vệt, đốm: tăng Lightmap Resolution hoặc sửa UV chồng lấn.
- Vật động bị tối: thiếu Light Probe quanh khu vực đó.
- Bóng nhòe ở xa: giảm Max Distance hoặc chỉnh tỷ lệ cascade split.

## 4. Shader

Dùng Shader Graph cho phần lớn hiệu ứng; chỉ viết HLSL tay khi cần kiểm soát hiệu năng hoặc tính năng Shader Graph không có.

**Khung shader Unlit cho URP (tương thích SRP Batcher)**

```hlsl
Shader "Custom/UnlitURP"
{
    Properties
    {
        _BaseMap ("Base Map", 2D) = "white" {}
        _BaseColor ("Base Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }

            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);

            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST;
                half4 _BaseColor;
            CBUFFER_END

            struct Attributes { float4 positionOS : POSITION; float2 uv : TEXCOORD0; };
            struct Varyings  { float4 positionHCS : SV_POSITION; float2 uv : TEXCOORD0; };

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                OUT.positionHCS = TransformObjectToHClip(IN.positionOS.xyz);
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                return SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
            }
            ENDHLSL
        }
    }
}
```

**Hàm HLSL thường dùng trong URP**

| Hàm / biến | Tác dụng |
| --- | --- |
| `TransformObjectToHClip(p)` | Object space sang clip space |
| `TransformObjectToWorld(p)` | Object space sang world space |
| `TransformObjectToWorldNormal(n)` | Normal sang world space |
| `GetWorldSpaceViewDir(p)` | Hướng từ điểm tới camera |
| `GetMainLight()` | Lấy directional light chính (cần include Lighting.hlsl) |
| `_Time.y` | Thời gian (giây) để làm animation |
| `SampleSceneDepth(uv)` | Đọc depth texture (bật Depth Texture trong URP Asset) |
| `SampleSceneColor(uv)` | Đọc opaque texture cho hiệu ứng khúc xạ |
| `lerp`, `saturate`, `smoothstep`, `step` | Nội suy, kẹp 0–1, chuyển mềm, ngưỡng cứng |

**Render state trong ShaderLab**

| Lệnh | Ví dụ | Dùng cho |
| --- | --- | --- |
| Blend | `Blend SrcAlpha OneMinusSrcAlpha` | Trong suốt thông thường |
| Blend | `Blend One One` | Additive (lửa, ánh sáng) |
| ZWrite | `ZWrite Off` | Vật trong suốt |
| ZTest | `ZTest Always` | Vẽ xuyên tường (outline, x-ray) |
| Cull | `Cull Off` / `Front` / `Back` | Hai mặt, outline lật mặt |
| Stencil | `Stencil { Ref 1 Comp Equal }` | Portal, mask, cổng không gian |

**Công thức hiệu ứng phổ biến**

- **Fresnel / rim light**: `pow(1 - saturate(dot(N, V)), power)`.
- **Dissolve**: lấy noise, `clip(noise - _Cutoff)`; viền phát sáng bằng `step(noise, _Cutoff + edge)`.
- **Lambert diffuse**: `saturate(dot(N, L)) * lightColor`.
- **Blinn-Phong specular**: `pow(saturate(dot(N, normalize(L + V))), shininess)`.
- **Toon shading**: `step` hoặc ramp texture trên giá trị N·L.
- **UV scroll**: `uv + _Time.y * _Speed`.

**Mẹo Shader Graph**

- Dùng Sub Graph để tái sử dụng logic.
- Custom Function node để chèn HLSL tay.
- Đặt property là Exposed mới chỉnh được từ material và script.
- Keyword (Boolean/Enum) tạo biến thể; quá nhiều keyword làm tăng thời gian build.

## 5. Post-processing

Trong URP/HDRP, post-processing chạy qua hệ thống Volume: tạo GameObject > Volume > Global Volume, thêm Override, và bật Post Processing trên camera.

- **Global Volume**: áp dụng toàn cảnh.
- **Local Volume**: cần Collider; hiệu ứng thay đổi khi camera đi vào vùng (Blend Distance để chuyển mềm).
- **Priority**: số lớn hơn thắng khi nhiều Volume chồng nhau.

| Hiệu ứng | Tác dụng | Chi phí | Mẹo |
| --- | --- | --- | --- |
| Tonemapping | Nén HDR về màn hình | Thấp | Dùng ACES cho điện ảnh, Neutral để giữ màu gốc |
| Color Adjustments | Exposure, contrast, saturation | Thấp | Chỉnh trước Color Grading |
| Bloom | Vùng sáng tỏa hào quang | Trung bình | Threshold khoảng 1; cần HDR và màu emission lớn hơn 1 |
| Vignette | Tối góc màn hình | Thấp | Intensity 0.2–0.35 là đủ |
| SSAO | Bóng tối ở góc, khe | Cao | Là Renderer Feature trong URP; tránh trên mobile yếu |
| Depth of Field | Làm mờ theo khoảng cách | Cao | Gaussian rẻ hơn Bokeh |
| Motion Blur | Mờ khi chuyển động | Trung bình | Thường tắt cho game cạnh tranh |
| Chromatic Aberration | Lệch màu ở viền | Thấp | Dùng nhẹ tay |
| Film Grain | Hạt nhiễu phim | Thấp | Giúp che banding |
| Lift Gamma Gain / Color Curves | Grading chi tiết | Thấp | Dùng LUT (Color Lookup) để đồng bộ với Photoshop/DaVinci |

**Chỉnh Volume bằng script**

```csharp
using UnityEngine.Rendering;
using UnityEngine.Rendering.Universal;

if (volume.profile.TryGet(out Vignette vignette))
{
    vignette.intensity.Override(0.5f); // ví dụ khi bị trúng đòn
}
```

Lưu ý: `volume.profile` tạo bản sao lúc runtime; `volume.sharedProfile` sửa luôn asset gốc.

**Anti-aliasing**

| Kỹ thuật | Đặt ở đâu | Đặc điểm |
| --- | --- | --- |
| MSAA | URP Asset | Sắc nét, chỉ với Forward, tốn băng thông |
| FXAA | Camera | Rẻ nhất, hơi mờ |
| SMAA | Camera | Cân bằng giữa chất lượng và chi phí |
| TAA | Camera | Đẹp nhất cho cảnh tĩnh, có thể bóng ma khi chuyển động |
| STP / DLSS / FSR | Camera, URP Asset | Upscaling: render độ phân giải thấp rồi phóng to |

## 6. Nâng cao

Từ Unity 6, URP dùng Render Graph làm mặc định: pass tùy biến viết trong `RecordRenderGraph` thay cho `Execute` kiểu cũ.

**Renderer Feature với Render Graph (Unity 6, URP)**

```csharp
using UnityEngine;
using UnityEngine.Rendering;
using UnityEngine.Rendering.RenderGraphModule;
using UnityEngine.Rendering.RenderGraphModule.Util;
using UnityEngine.Rendering.Universal;

public class TintFeature : ScriptableRendererFeature
{
    class TintPass : ScriptableRenderPass
    {
        readonly Material mat;
        public TintPass(Material m)
        {
            mat = m;
            renderPassEvent = RenderPassEvent.BeforeRenderingPostProcessing;
        }

        public override void RecordRenderGraph(RenderGraph rg, ContextContainer frameData)
        {
            var res = frameData.Get<UniversalResourceData>();
            if (res.isActiveTargetBackBuffer) return;

            TextureHandle src = res.activeColorTexture;
            var desc = rg.GetTextureDesc(src);
            desc.name = "_TintTemp";
            desc.clearBuffer = false;
            TextureHandle dst = rg.CreateTexture(desc);

            rg.AddBlitPass(new RenderGraphUtils.BlitMaterialParameters(src, dst, mat, 0), "Tint");
            res.cameraColor = dst; // các pass sau đọc kết quả này
        }
    }

    public Material material;
    TintPass pass;

    public override void Create() => pass = new TintPass(material);

    public override void AddRenderPasses(ScriptableRenderer renderer, ref RenderingData data)
    {
        if (material != null) renderer.EnqueuePass(pass);
    }
}
```

Thêm vào: URP Renderer asset > Add Renderer Feature. Dùng Window > Analysis > Render Graph Viewer để xem các pass và tài nguyên.

**RenderPassEvent hay dùng**

| Event | Dùng cho |
| --- | --- |
| BeforeRenderingOpaques | Vẽ trước vật đục (mask, stencil) |
| AfterRenderingOpaques | Outline, decal tùy biến, đọc depth |
| AfterRenderingSkybox | Hiệu ứng nước, khúc xạ |
| BeforeRenderingPostProcessing | Hiệu ứng toàn màn hình trong HDR |
| AfterRenderingPostProcessing | Hiệu ứng sau tonemapping (pixelate, UI blur) |

**Compute Shader**

```hlsl
// Wave.compute
#pragma kernel CSMain
RWStructuredBuffer<float3> _Positions;
float _Time;

[numthreads(64, 1, 1)]
void CSMain (uint3 id : SV_DispatchThreadID)
{
    float3 p = _Positions[id.x];
    p.y = sin(p.x + _Time);
    _Positions[id.x] = p;
}
```

```csharp
int k = cs.FindKernel("CSMain");
var buffer = new ComputeBuffer(count, sizeof(float) * 3);
cs.SetBuffer(k, "_Positions", buffer);
cs.SetFloat("_Time", Time.time);
cs.Dispatch(k, Mathf.CeilToInt(count / 64f), 1, 1);
// Nhớ buffer.Release() trong OnDestroy
```

Tránh `buffer.GetData()` mỗi frame vì CPU phải chờ GPU; dùng `AsyncGPUReadback` nếu cần đọc về.

**Vẽ số lượng lớn**

| Kỹ thuật | Khi nào dùng | Ghi chú |
| --- | --- | --- |
| SRP Batcher | Mặc định trong URP/HDRP | Shader phải để property trong `CBUFFER UnityPerMaterial`; giảm chi phí CPU khi đổi material |
| GPU Instancing | Nhiều bản cùng mesh, cùng material | Tích Enable GPU Instancing trên material; không chạy song song với SRP Batcher cho cùng object |
| `Graphics.RenderMeshInstanced` | Cỏ, đá, đạn: hàng nghìn bản không cần GameObject | Tối đa 1023 instance mỗi lần gọi với một số API cũ |
| `Graphics.RenderMeshIndirect` | Số lượng do GPU quyết định (compute culling) | Kết hợp compute shader và GraphicsBuffer args |
| GPU Resident Drawer (Unity 6) | Cảnh nhiều MeshRenderer tĩnh | Bật trong URP Asset; cần Forward+ và BatchRendererGroup variants = Keep All |
| BatchRendererGroup | Hệ thống render tùy biến hiệu năng cao | API cấp thấp, dùng cùng DOTS/Entities Graphics |

**CommandBuffer (Built-in và code cũ)**

```csharp
var cmd = new CommandBuffer { name = "Outline" };
cmd.DrawRenderer(targetRenderer, outlineMat);
camera.AddCommandBuffer(CameraEvent.AfterForwardOpaque, cmd);
```

Trong URP hiện đại, logic tương tự nằm trong Renderer Feature thay vì gắn vào camera.

**MaterialPropertyBlock**

Đổi màu từng object mà không tạo material mới: `block.SetColor("_BaseColor", c); renderer.SetPropertyBlock(block);`. Lưu ý: MaterialPropertyBlock làm object rớt khỏi SRP Batcher, nên với URP ưu tiên giữ ít biến thể material hoặc dùng instancing.

## 7. Tối ưu hiệu năng

Đo trước, tối ưu sau: xác định game đang nghẽn CPU hay GPU rồi mới chọn kỹ thuật.

**Bước chẩn đoán**

1. Mở Profiler (Ctrl+7), xem CPU Usage và GPU Usage, đo trên thiết bị thật chứ không phải Editor.
2. Nếu main thread hoặc render thread chờ lâu: nghẽn CPU, giảm draw call và SetPass.
3. Nếu `Gfx.WaitForPresent` hoặc GPU time cao: nghẽn GPU, giảm overdraw, độ phân giải, shader nặng.
4. Thử giảm Render Scale: FPS tăng rõ nghĩa là nghẽn fill rate (GPU).

| Công cụ | Xem được gì |
| --- | --- |
| Profiler | Thời gian CPU/GPU, bộ nhớ, rendering stats |
| Frame Debugger | Từng draw call, lý do batch bị tách |
| Render Graph Viewer | Pass, texture tạo ra và đọc ghi |
| Rendering Debugger | Overdraw, mipmap, lighting, material debug |
| Memory Profiler (package) | Texture, mesh chiếm RAM |
| RenderDoc | Phân tích frame mức GPU (Editor hoặc PC) |
| Xcode GPU Capture / Android GPU Inspector / Snapdragon Profiler | Phân tích GPU trên mobile |

**Giảm tải CPU**

- Đánh dấu Static Batching cho vật tĩnh; dùng ít material, gộp texture vào atlas.
- Dùng LOD Group: thường 3 mức, bỏ mức cuối bằng Culled.
- Occlusion Culling: Window > Rendering > Occlusion Culling, bake cho cảnh trong nhà hoặc thành phố nhiều vật che.
- Giảm Far Clip Plane của camera; dùng Layer Cull Distances cho vật nhỏ.
- Hạn chế đèn realtime có bóng; mỗi đèn shadow vẽ lại cảnh thêm lần nữa.

**Giảm tải GPU**

- Hạn chế overdraw: ít lớp trong suốt chồng nhau, particle nhỏ hơn, UI gọn.
- Hạ Render Scale (0.7–0.85 trên mobile) kết hợp upscaler.
- Shader: dùng `half` trên mobile, tránh rẽ nhánh động, ít sample texture.
- Tắt Depth/Opaque Texture trong URP Asset nếu không hiệu ứng nào dùng.
- Dùng Simple Lit hoặc Baked Lit thay Lit cho vật phụ.

**Nén texture theo nền tảng**

| Nền tảng | Định dạng khuyên dùng | Ghi chú |
| --- | --- | --- |
| Android | ASTC (6x6 cho màu, 4x4 cho normal/UI) | ETC2 làm dự phòng cho máy cũ |
| iOS | ASTC | Mọi thiết bị A8 trở lên |
| PC / Console | BC7 (màu chất lượng cao), BC5 (normal), BC1/DXT1 (không alpha) | BC6H cho HDR |
| WebGL | ASTC hoặc DXT tùy trình duyệt | Cân nhắc build hai bộ |

- Đặt Max Size vừa đủ; texture 4K cho vật nhỏ là lãng phí.
- Bật Crunch Compression để giảm dung lượng file (không giảm RAM GPU).
- Mipmap Streaming giúp giảm bộ nhớ texture cho cảnh lớn.

**Ngân sách tham khảo cho mobile tầm trung**

| Chỉ số | Mục tiêu |
| --- | --- |
| SetPass calls | Dưới 100 |
| Batches | Dưới 200–300 |
| Tam giác trên màn hình | 100k–300k |
| Đèn realtime có bóng | 1 (directional) |

Đây là mức tham khảo chung, cần chỉnh theo thiết bị mục tiêu và đo thực tế.

## 8. Bảng tra nhanh

**API C# thường dùng**

| Mục đích | Code |
| --- | --- |
| Đổi màu (tạo bản sao material) | `renderer.material.SetColor("_BaseColor", Color.red);` |
| Đổi màu chung cho mọi object | `renderer.sharedMaterial.SetColor("_BaseColor", c);` |
| Lấy ID property (nhanh hơn chuỗi) | `static readonly int BaseColor = Shader.PropertyToID("_BaseColor");` |
| Biến global cho mọi shader | `Shader.SetGlobalFloat("_WindStrength", 0.5f);` |
| Bật/tắt keyword | `material.EnableKeyword("_EMISSION");` |
| Bật emission | `material.SetColor("_EmissionColor", c * intensity);` |
| Đổi Render Pipeline lúc chạy | `GraphicsSettings.defaultRenderPipeline = urpAsset;` |
| Đổi mức chất lượng | `QualitySettings.SetQualityLevel(2, true);` |
| Đổi render scale (URP) | `((UniversalRenderPipelineAsset)GraphicsSettings.currentRenderPipeline).renderScale = 0.8f;` |
| Chụp màn hình | `ScreenCapture.CaptureScreenshot("shot.png");` |
| Render camera ra texture | `camera.targetTexture = renderTexture;` |
| Cấu hình camera URP | `camera.GetUniversalAdditionalCameraData().renderPostProcessing = true;` |
| Giới hạn FPS | `Application.targetFrameRate = 60;` |

**Phím tắt và menu hữu ích**

| Thao tác | Phím / menu |
| --- | --- |
| Profiler | Ctrl+7 (Cmd+7 trên macOS) |
| Frame Debugger | Window > Analysis > Frame Debugger |
| Lighting window | Window > Rendering > Lighting |
| Rendering Debugger | Window > Analysis > Rendering Debugger |
| Chế độ hiển thị Scene (Wireframe, Overdraw...) | Menu Draw Mode góc trên trái Scene view |
| Thống kê nhanh | Nút Stats trên Game view |
| Căn camera Scene theo vật | Chọn vật rồi nhấn F |
| Đưa camera game về góc nhìn Scene | Ctrl+Shift+F (Align With View) |

**Lỗi thường gặp và cách sửa**

| Triệu chứng | Nguyên nhân thường gặp | Cách sửa |
| --- | --- | --- |
| Material màu hồng tím | Shader không hợp với pipeline | Dùng Render Pipeline Converter hoặc đổi sang shader URP |
| Bloom không hoạt động | Chưa bật HDR hoặc Post Processing trên camera | Bật HDR trong URP Asset và Post Processing trên camera |
| Post-processing không hiện | Volume sai layer hoặc chưa có Volume | Kiểm tra Volume Mask trên camera và layer của Volume |
| Vật trong suốt hiển thị sai thứ tự | Sắp xếp theo tâm object | Chỉnh Sorting Priority, tách mesh, hoặc dùng alpha clip |
| Bóng sọc (shadow acne) | Bias quá thấp | Tăng Depth Bias |
| Bóng tách khỏi chân vật | Bias quá cao | Giảm Normal Bias |
| Màu nhợt hoặc quá đậm | Sai color space hoặc sRGB của texture | Dùng Linear; tắt sRGB cho mask, normal map |
| Normal map trông lồi lõm sai | Texture chưa đặt kiểu Normal map | Đổi Texture Type sang Normal map |
| Batch không gộp | Khác material, MaterialPropertyBlock, lightmap khác nhau | Xem lý do trong Frame Debugger |
| Shader biên dịch lâu, build nặng | Quá nhiều shader variant | Dùng `shader_feature` thay `multi_compile`, bật strip trong URP Asset |
| Lightmap lấm tấm | Thiếu sample hoặc UV chồng | Tăng sample, bật Filtering, sửa lightmap UV |

**`multi_compile` và `shader_feature`**

- `multi_compile`: luôn build mọi biến thể; dùng cho keyword bật tắt lúc runtime.
- `shader_feature`: chỉ build biến thể mà material đang dùng; dùng cho tùy chọn cố định trên material.
- Thêm hậu tố `_local` (ví dụ `shader_feature_local`) để keyword không chiếm giới hạn keyword toàn cục.

Nội dung dựa trên Unity 6 và URP 17; tên menu có thể khác ở phiên bản cũ hơn.
