---
title: "Unity Shader và Compute Shader"
description: "ShaderLab, HLSL, hàm có sẵn của Unity, lighting, kỹ thuật nâng cao, compute shader và cách tìm nút thắt hiệu năng."
date: 2026-10-01
tags: [Unity, Shader, HLSL, Compute]
---

## 1. Tổng quan

Shader trong Unity viết bằng **ShaderLab** (lớp vỏ khai báo) bọc **HLSL** (code chạy trên GPU). Compute shader (`.compute`) là HLSL thuần, chạy tính toán tổng quát ngoài pipeline vẽ.

Thứ tự một draw call đi qua GPU:

1. **Input Assembler** — đọc vertex buffer, index buffer.
2. **Vertex Shader** — biến đổi đỉnh từ Object space sang Clip space.
3. (Tùy chọn) **Hull / Domain** (tessellation) và **Geometry Shader**.
4. **Rasterizer** — clip, perspective divide, chia thành fragment, nội suy dữ liệu v2f.
5. **Fragment (Pixel) Shader** — tính màu cho từng pixel.
6. **Output Merger** — depth test, stencil test, blending, ghi vào render target.

Các không gian tọa độ: Object → World (`unity_ObjectToWorld`) → View (`UNITY_MATRIX_V`) → Clip (`UNITY_MATRIX_P`) → NDC (chia cho w) → Screen.

| Loại shader | File | Dùng khi |
| --- | --- | --- |
| Unlit / Vertex-Fragment | `.shader` | Toàn quyền kiểm soát, hiệu ứng tùy biến |
| Surface Shader | `.shader` | Chỉ Built-in RP; Unity tự sinh code lighting |
| Shader Graph | `.shadergraph` | Node-based, URP/HDRP |
| Compute Shader | `.compute` | GPGPU: particle, simulation, culling, xử lý ảnh |
| Include | `.cginc` / `.hlsl` | Thư viện hàm dùng chung |

| Pipeline | Thư viện include | Ghi chú |
| --- | --- | --- |
| Built-in | `UnityCG.cginc`, `Lighting.cginc`, `AutoLight.cginc` | Hỗ trợ Surface Shader, `CGPROGRAM` |
| URP | `Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl`, `Lighting.hlsl` | Dùng `HLSLPROGRAM`, cần `CBUFFER` cho SRP Batcher |
| HDRP | `Packages/com.unity.render-pipelines.high-definition/...` | Phức tạp, thường dùng Shader Graph |

## 2. Cấu trúc ShaderLab

Một file `.shader` gồm: tên, Properties (hiện trong Inspector), một hoặc nhiều SubShader, mỗi SubShader chứa các Pass, cuối cùng là Fallback.

```hlsl
Shader "Custom/MyShader"
{
    Properties
    {
        _MainTex ("Texture", 2D) = "white" {}
        _Color ("Color", Color) = (1,1,1,1)
        _Glossiness ("Smoothness", Range(0,1)) = 0.5
        _Speed ("Speed", Float) = 1.0
        _Count ("Count", Int) = 3
        _Dir ("Direction", Vector) = (0,1,0,0)
        _Cube ("Cubemap", Cube) = "" {}
        _Vol ("Volume", 3D) = "" {}
        [HDR] _Emission ("Emission", Color) = (0,0,0,1)
        [Toggle(_USE_FX)] _UseFX ("Use FX", Float) = 0
        [KeywordEnum(Low, High)] _Q ("Quality", Float) = 0
        [Enum(UnityEngine.Rendering.CullMode)] _Cull ("Cull", Float) = 2
        [NoScaleOffset] _Mask ("Mask", 2D) = "black" {}
        [Normal] _BumpMap ("Normal", 2D) = "bump" {}
        [HideInInspector] _Hidden ("Hidden", Float) = 0
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "Queue"="Geometry" "RenderPipeline"="UniversalPipeline" }
        LOD 100
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            Cull [_Cull]
            ZWrite On
            ZTest LEqual
            Blend Off
            HLSLPROGRAM
            // ... code
            ENDHLSL
        }
    }
    Fallback "Hidden/Universal Render Pipeline/FallbackError"
    CustomEditor "MyShaderGUI"
}
```

**Kiểu Property**

| Khai báo | Biến HLSL tương ứng |
| --- | --- |
| `2D`, `3D`, `Cube`, `2DArray` | `sampler2D` / `TEXTURE2D(_X); SAMPLER(sampler_X);` + `float4 _X_ST` (tiling/offset), `_X_TexelSize` |
| `Color`, `Vector` | `float4` / `half4` |
| `Float`, `Range(a,b)` | `float` / `half` |
| `Int` / `Integer` | `int` (dùng `Integer` từ Unity 2021.1) |

**Tags của SubShader**

| Tag | Giá trị thường dùng |
| --- | --- |
| `Queue` | `Background` (1000), `Geometry` (2000), `AlphaTest` (2450), `Transparent` (3000), `Overlay` (4000), có thể `Geometry+1` |
| `RenderType` | `Opaque`, `Transparent`, `TransparentCutout` (dùng cho replacement shader) |
| `RenderPipeline` | `UniversalPipeline`, `HDRenderPipeline` |
| `IgnoreProjector`, `DisableBatching`, `PreviewType` | `True` / `Plane` / `Skybox` |

**Tag `LightMode` của Pass**

| Built-in | URP |
| --- | --- |
| `ForwardBase`, `ForwardAdd` | `UniversalForward`, `UniversalForwardOnly` |
| `ShadowCaster` | `ShadowCaster` |
| `Deferred` | `UniversalGBuffer` |
| `Always` | `SRPDefaultUnlit` (mặc định khi không ghi tag) |
| `Meta` | `DepthOnly`, `DepthNormals`, `Meta`, `Universal2D` |

**Render state (đặt trong SubShader hoặc Pass)**

| Lệnh | Giá trị |
| --- | --- |
| `Cull` | `Back` (mặc định), `Front`, `Off` |
| `ZWrite` | `On`, `Off` |
| `ZTest` | `Less`, `LEqual` (mặc định), `Equal`, `GEqual`, `Greater`, `NotEqual`, `Always` |
| `Blend` | `Blend SrcAlpha OneMinusSrcAlpha` (alpha), `Blend One One` (additive), `Blend One OneMinusSrcAlpha` (premultiplied), `Blend DstColor Zero` (multiply) |
| `BlendOp` | `Add`, `Sub`, `RevSub`, `Min`, `Max` |
| `ColorMask` | `RGBA`, `RGB`, `A`, `0` |
| `Offset` | `Offset -1, -1` (chống z-fighting cho decal) |
| `AlphaToMask` | `On` (MSAA alpha-to-coverage) |
| `Stencil { }` | xem mục 8 |

Các pass dùng chung có thể gọi lại: `UsePass "Shader/Name/PASSNAME"`. `GrabPass { "_GrabTex" }` chỉ có ở Built-in; URP dùng `_CameraOpaqueTexture`.

## 3. HLSL cơ bản

**Kiểu dữ liệu**

| Kiểu | Độ chính xác | Dùng cho |
| --- | --- | --- |
| `float` | 32-bit | Vị trí, UV, ma trận, tính toán cần chính xác |
| `half` | 16-bit (trên mobile) | Màu, hướng, normal |
| `fixed` | \~11-bit (chỉ Built-in, cũ) | Màu 0–1 |
| `int`, `uint` | 32-bit nguyên | Index, bit flag, ID |
| `bool` | — | Điều kiện |
| `float2/3/4`, `half4`, `int3`... | vector | `float4 c = float4(1,0,0,1);` |
| `float3x3`, `float4x4` | ma trận | Biến đổi không gian |
| `sampler2D`, `samplerCUBE` | — | Kiểu cũ (DX9-style) |
| `Texture2D`, `SamplerState` | — | Kiểu DX11, tách texture/sampler |
| `RWTexture2D<float4>`, `StructuredBuffer<T>` | — | Compute / UAV |

**Swizzle và khởi tạo**

```hlsl
float4 v = float4(1, 2, 3, 4);
float3 a = v.xyz;      // (1,2,3)
float2 b = v.zx;       // (3,1)
float4 c = v.xxxx;     // (1,1,1,1)
float3 col = v.rgb;    // rgba = xyzw
v.xy = float2(0, 0);   // gán từng phần
float4 d = 0;          // broadcast
float4x4 m; float e = m._m00; float4 row0 = m[0];
```

**Semantics** (gắn ý nghĩa cho biến vào/ra)

| Semantic | Vị trí | Ý nghĩa |
| --- | --- | --- |
| `POSITION` | VS input | Vị trí đỉnh (object space) |
| `NORMAL`, `TANGENT` | VS input | Pháp tuyến, tiếp tuyến (`tangent.w` = dấu bitangent) |
| `TEXCOORD0`–`TEXCOORD7` | VS input/output | UV hoặc dữ liệu tùy ý cần nội suy |
| `COLOR` | VS input | Vertex color |
| `SV_POSITION` | VS output / PS input | Vị trí clip space (vào PS là tọa độ pixel) |
| `SV_Target` / `SV_Target0..7` | PS output | Màu ghi ra render target (MRT) |
| `SV_Depth` | PS output | Ghi đè depth |
| `SV_VertexID` | VS input | Chỉ số đỉnh |
| `SV_InstanceID` | VS input | Chỉ số instance |
| `SV_IsFrontFace` / `VFACE` | PS input | Mặt trước hay sau |
| `SV_PrimitiveID` | GS/PS input | ID tam giác |

**Cấu trúc chuẩn**

```hlsl
struct appdata            // Built-in gọi là appdata, URP gọi là Attributes
{
    float4 vertex  : POSITION;
    float3 normal  : NORMAL;
    float4 tangent : TANGENT;
    float2 uv      : TEXCOORD0;
    float4 color   : COLOR;
    UNITY_VERTEX_INPUT_INSTANCE_ID
};

struct v2f                // URP gọi là Varyings
{
    float4 pos      : SV_POSITION;
    float2 uv       : TEXCOORD0;
    float3 worldPos : TEXCOORD1;
    float3 worldN   : TEXCOORD2;
    UNITY_VERTEX_OUTPUT_STEREO
};

#pragma vertex vert
#pragma fragment frag
```

**Chỉ thị tiền xử lý thường dùng**

| Chỉ thị | Ý nghĩa |
| --- | --- |
| `#pragma vertex / fragment / geometry / hull / domain` | Tên hàm entry |
| `#pragma target 3.0 / 3.5 / 4.5 / 5.0` | Shader model (4.5 cần cho compute/StructuredBuffer trong VS) |
| `#pragma multi_compile_fog` | Biến thể sương mù |
| `#pragma multi_compile_instancing` | Biến thể GPU instancing |
| `#pragma only_renderers d3d11 vulkan` / `exclude_renderers gles` | Giới hạn nền tảng |
| `#pragma require geometry tessellation` | Yêu cầu tính năng GPU |
| `#include "..."` | Nhúng thư viện |
| `#define`, `#if`, `#ifdef`, `#elif`, `#endif` | Macro, nhánh biên dịch |
| `[unroll]`, `[loop]`, `[branch]`, `[flatten]` | Gợi ý trình biên dịch cho vòng lặp / if |

## 4. Hàm HLSL intrinsic

Các hàm dựng sẵn dưới đây chạy trên mọi stage (trừ khi ghi chú) và hoạt động theo từng thành phần với vector.

**Toán học cơ bản**

| Hàm | Định nghĩa |
| --- | --- |
| `abs(x)` | Giá trị tuyệt đối |
| `sign(x)` | -1, 0 hoặc 1 |
| `min(a,b)`, `max(a,b)` | Nhỏ nhất / lớn nhất |
| `clamp(x,a,b)` | Kẹp x trong \[a,b\] |
| `saturate(x)` | Kẹp trong \[0,1\] (gần như miễn phí trên GPU) |
| `floor(x)`, `ceil(x)`, `round(x)`, `trunc(x)` | Làm tròn xuống / lên / gần nhất / bỏ phần thập phân |
| `frac(x)` | x - floor(x), phần thập phân |
| `fmod(a,b)` | Phần dư, cùng dấu với a |
| `modf(x, out ip)` | Tách phần nguyên (ip) và phần thập phân (trả về) |
| `pow(x,y)` | x mũ y (x âm cho NaN) |
| `exp(x)`, `exp2(x)` | e^x, 2^x |
| `log(x)`, `log2(x)`, `log10(x)` | Logarit |
| `sqrt(x)`, `rsqrt(x)` | Căn bậc hai, 1/căn |
| `rcp(x)` | 1/x (SM5) |
| `mad(a,b,c)` | a\*b + c (một lệnh) |
| `step(edge,x)` | x >= edge ? 1 : 0 |
| `smoothstep(a,b,x)` | Nội suy Hermite mượt từ 0 đến 1 khi x đi từ a đến b |
| `lerp(a,b,t)` | a + (b-a)\*t |
| `isnan(x)`, `isinf(x)`, `isfinite(x)` | Kiểm tra giá trị đặc biệt |

**Lượng giác**

| Hàm | Định nghĩa |
| --- | --- |
| `sin`, `cos`, `tan` | Theo radian |
| `asin`, `acos`, `atan` | Hàm ngược |
| `atan2(y,x)` | Góc của vector (x,y), trong \[-π, π\] |
| `sincos(x, out s, out c)` | Tính sin và cos cùng lúc |
| `sinh`, `cosh`, `tanh` | Hyperbolic |
| `radians(d)`, `degrees(r)` | Đổi đơn vị góc |

**Vector và ma trận**

| Hàm | Định nghĩa |
| --- | --- |
| `dot(a,b)` | Tích vô hướng |
| `cross(a,b)` | Tích có hướng (float3) |
| `length(v)`, `distance(a,b)` | Độ dài, khoảng cách |
| `normalize(v)` | Chuẩn hóa về độ dài 1 |
| `reflect(i,n)` | Vector phản xạ của i qua pháp tuyến n |
| `refract(i,n,eta)` | Vector khúc xạ, eta = tỉ số chiết suất |
| `faceforward(n,i,ng)` | Lật n để hướng ngược i |
| `mul(M,v)` | Nhân ma trận–vector (cột); `mul(v,M)` là nhân với ma trận chuyển vị |
| `transpose(M)` | Chuyển vị |
| `determinant(M)` | Định thức |
| `any(v)`, `all(v)` | Có thành phần nào / tất cả khác 0 |

**Bit và kiểu dữ liệu**

| Hàm | Định nghĩa |
| --- | --- |
| `asfloat`, `asint`, `asuint` | Diễn giải lại bit (không đổi giá trị) |
| `f32tof16`, `f16tof32` | Nén / giải nén half |
| `countbits`, `firstbithigh`, `firstbitlow`, `reversebits` | Thao tác bit (SM5) |
| `&`, `\|`, `^`, `~`, `<<`, `>>` | Toán tử bit cho int/uint |

**Đạo hàm màn hình** (chỉ fragment shader)

| Hàm | Định nghĩa |
| --- | --- |
| `ddx(x)`, `ddy(x)` | Tốc độ thay đổi của x theo pixel ngang / dọc |
| `ddx_fine`, `ddy_fine`, `ddx_coarse`, `ddy_coarse` | Biến thể độ chính xác (SM5) |
| `fwidth(x)` | abs(ddx) + abs(ddy), dùng cho anti-aliasing đường kẻ |
| `clip(x)` | Loại bỏ pixel nếu bất kỳ thành phần nào < 0 (alpha cutout) |
| `discard` | Từ khóa loại bỏ pixel |

**Lấy mẫu texture**

| Kiểu cũ (`sampler2D`) | Kiểu DX11 (`Texture2D` + `SamplerState`) | Định nghĩa |
| --- | --- | --- |
| `tex2D(s, uv)` | `tex.Sample(ss, uv)` | Lấy mẫu có mipmap tự động (chỉ PS) |
| `tex2Dlod(s, float4(uv,0,lod))` | `tex.SampleLevel(ss, uv, lod)` | Chỉ định mip, dùng được trong VS/CS |
| `tex2Dgrad(s, uv, dx, dy)` | `tex.SampleGrad(ss, uv, dx, dy)` | Đạo hàm tự cấp |
| `tex2Dbias(s, float4(uv,0,b))` | `tex.SampleBias(ss, uv, b)` | Lệch mip |
| `tex2Dproj(s, uv4)` | — | Chia uv.xy cho w trước khi lấy mẫu |
| `texCUBE(s, dir)` | `cube.Sample(ss, dir)` | Cubemap theo hướng |
| `tex3D(s, uvw)` | `tex3d.Sample(ss, uvw)` | Texture 3D |
| — | `tex.Load(int3(x,y,mip))` | Đọc texel theo tọa độ nguyên, không lọc |
| — | `tex.Gather(ss, uv)` | Lấy 4 texel lân cận (kênh R) |
| — | `tex.SampleCmp(ss, uv, cmp)` | So sánh depth (shadow map) |
| — | `tex.GetDimensions(w, h)` | Lấy kích thước texture |

Trong URP, dùng macro đa nền tảng: `TEXTURE2D(_MainTex); SAMPLER(sampler_MainTex);` rồi `SAMPLE_TEXTURE2D(_MainTex, sampler_MainTex, uv)`, `SAMPLE_TEXTURE2D_LOD(...)`, `LOAD_TEXTURE2D(...)`, `SAMPLE_TEXTURECUBE(...)`. Có thể dùng sampler nội tuyến như `SamplerState sampler_linear_clamp;` (tên chứa `point`/`linear`/`trilinear` + `clamp`/`repeat`/`mirror`).

## 5. Hàm, macro và biến built-in của Unity

**Biến đổi không gian**

| Built-in (`UnityCG.cginc`) | URP (`Core.hlsl`) | Định nghĩa |
| --- | --- | --- |
| `UnityObjectToClipPos(v)` | `TransformObjectToHClip(p)` | Object → Clip |
| `mul(unity_ObjectToWorld, v).xyz` | `TransformObjectToWorld(p)` | Object → World |
| `mul(unity_WorldToObject, v)` | `TransformWorldToObject(p)` | World → Object |
| `UnityObjectToWorldNormal(n)` | `TransformObjectToWorldNormal(n)` | Normal → World (dùng ma trận nghịch đảo chuyển vị) |
| `UnityObjectToWorldDir(d)` | `TransformObjectToWorldDir(d)` | Hướng → World |
| `UnityWorldToViewPos(p)` | `TransformWorldToView(p)` | World → View |
| `UnityWorldToClipPos(p)` | `TransformWorldToHClip(p)` | World → Clip |
| — | `GetVertexPositionInputs(p)` | Trả về struct có `positionWS`, `positionVS`, `positionCS`, `positionNDC` |
| — | `GetVertexNormalInputs(n, t)` | Trả về `normalWS`, `tangentWS`, `bitangentWS` |

**Ma trận**

| Tên | Ý nghĩa |
| --- | --- |
| `UNITY_MATRIX_M` / `unity_ObjectToWorld` | Model |
| `UNITY_MATRIX_I_M` / `unity_WorldToObject` | Nghịch đảo Model |
| `UNITY_MATRIX_V`, `UNITY_MATRIX_I_V` | View và nghịch đảo |
| `UNITY_MATRIX_P` | Projection |
| `UNITY_MATRIX_VP`, `UNITY_MATRIX_MV`, `UNITY_MATRIX_MVP` | Tổ hợp (MV, MVP chỉ Built-in) |

**Biến thời gian, camera, màn hình**

| Biến | Giá trị |
| --- | --- |
| `_Time` | (t/20, t, t*2, t*3), t = giây |
| `_SinTime`, `_CosTime` | (sin(t/8), sin(t/4), sin(t/2), sin(t)) |
| `unity_DeltaTime` | (dt, 1/dt, smoothDt, 1/smoothDt) |
| `_WorldSpaceCameraPos` | Vị trí camera (world) |
| `_ProjectionParams` | (±1 flip, near, far, 1/far) |
| `_ScreenParams` | (width, height, 1+1/w, 1+1/h) |
| `_ZBufferParams` | Hệ số để tuyến tính hóa depth |
| `unity_OrthoParams` | (width, height, 0, isOrtho) |
| `_WorldSpaceLightPos0`, `_LightColor0` | Đèn chính (Built-in, Lighting.cginc) |
| `unity_AmbientSky`, `unity_SHAr..SHC` | Ánh sáng môi trường, spherical harmonics |

**Hàm tiện ích**

| Built-in | URP | Định nghĩa |
| --- | --- | --- |
| `TRANSFORM_TEX(uv, _MainTex)` | `TRANSFORM_TEX(uv, _MainTex)` | uv \* `_ST.xy` + `_ST.zw` |
| `ComputeScreenPos(clipPos)` | `ComputeScreenPos(clipPos)` / `GetNormalizedScreenSpaceUV(posCS)` | Tọa độ màn hình (chia .w ở PS) |
| `ComputeGrabScreenPos(p)` | — | UV cho GrabPass |
| `WorldSpaceViewDir(v)`, `UnityWorldSpaceViewDir(p)` | `GetWorldSpaceViewDir(p)` / `GetWorldSpaceNormalizeViewDir(p)` | Hướng từ điểm tới camera |
| `UnityWorldSpaceLightDir(p)` | `GetMainLight().direction` | Hướng ánh sáng |
| `Linear01Depth(d)`, `LinearEyeDepth(d)` | `Linear01Depth(d, _ZBufferParams)`, `LinearEyeDepth(d, _ZBufferParams)` | Chuyển depth buffer sang tuyến tính |
| `SAMPLE_DEPTH_TEXTURE(_CameraDepthTexture, uv)` | `SampleSceneDepth(uv)` (include `DeclareDepthTexture.hlsl`) | Đọc depth của scene |
| — | `SampleSceneColor(uv)` (`DeclareOpaqueTexture.hlsl`) | Đọc màu opaque (refraction) |
| `UnpackNormal(tex)` | `UnpackNormal(tex)`, `UnpackNormalScale(tex, s)` | Giải nén normal map |
| `Luminance(c)` | `Luminance(c)` | Độ sáng cảm nhận |
| `GammaToLinearSpace(c)`, `LinearToGammaSpace(c)` | `SRGBToLinear(c)`, `LinearToSRGB(c)` | Đổi không gian màu |
| `ShadeSH9(float4(n,1))` | `SampleSH(n)` | Ambient từ light probe |
| `UNITY_TRANSFER_FOG`, `UNITY_APPLY_FOG` | `ComputeFogFactor(z)`, `MixFog(c, f)` | Sương mù |
| `DecodeHDR(c, unity_SpecCube0_HDR)` | `GlossyEnvironmentReflection(...)` | Phản chiếu môi trường |
| `UNITY_PI` | `PI`, `TWO_PI`, `HALF_PI`, `INV_PI` | Hằng số |

## 6. Shader mẫu

**Unlit – Built-in RP**

```hlsl
Shader "Custom/UnlitBuiltin"
{
    Properties { _MainTex ("Texture", 2D) = "white" {} _Color ("Color", Color) = (1,1,1,1) }
    SubShader
    {
        Tags { "RenderType"="Opaque" }
        Pass
        {
            CGPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #include "UnityCG.cginc"

            struct appdata { float4 vertex : POSITION; float2 uv : TEXCOORD0; };
            struct v2f { float4 pos : SV_POSITION; float2 uv : TEXCOORD0; UNITY_FOG_COORDS(1) };

            sampler2D _MainTex; float4 _MainTex_ST; fixed4 _Color;

            v2f vert (appdata v)
            {
                v2f o;
                o.pos = UnityObjectToClipPos(v.vertex);
                o.uv = TRANSFORM_TEX(v.uv, _MainTex);
                UNITY_TRANSFER_FOG(o, o.pos);
                return o;
            }

            fixed4 frag (v2f i) : SV_Target
            {
                fixed4 col = tex2D(_MainTex, i.uv) * _Color;
                UNITY_APPLY_FOG(i.fogCoord, col);
                return col;
            }
            ENDCG
        }
    }
}
```

**Unlit – URP (tương thích SRP Batcher)**

```hlsl
Shader "Custom/UnlitURP"
{
    Properties
    {
        [MainTexture] _BaseMap ("Base Map", 2D) = "white" {}
        [MainColor] _BaseColor ("Base Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "Unlit"
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_fog
            #pragma multi_compile_instancing
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"

            struct Attributes
            {
                float4 positionOS : POSITION;
                float2 uv : TEXCOORD0;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };
            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float fogFactor : TEXCOORD1;
            };

            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);

            CBUFFER_START(UnityPerMaterial)   // mọi property (trừ texture) phải nằm ở đây
                float4 _BaseMap_ST;
                half4 _BaseColor;
            CBUFFER_END

            Varyings vert (Attributes IN)
            {
                Varyings OUT;
                UNITY_SETUP_INSTANCE_ID(IN);
                VertexPositionInputs p = GetVertexPositionInputs(IN.positionOS.xyz);
                OUT.positionCS = p.positionCS;
                OUT.uv = TRANSFORM_TEX(IN.uv, _BaseMap);
                OUT.fogFactor = ComputeFogFactor(p.positionCS.z);
                return OUT;
            }

            half4 frag (Varyings IN) : SV_Target
            {
                half4 col = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, IN.uv) * _BaseColor;
                col.rgb = MixFog(col.rgb, IN.fogFactor);
                return col;
            }
            ENDHLSL
        }
    }
}
```

**Đoạn code hay dùng**

```hlsl
// Cuộn UV theo thời gian
float2 uv = i.uv + _Time.y * _Speed;

// Fresnel / rim light
float3 V = normalize(_WorldSpaceCameraPos - i.worldPos);
float rim = pow(1.0 - saturate(dot(normalize(i.worldN), V)), _RimPower);

// Dissolve
float n = tex2D(_Noise, i.uv).r;
clip(n - _Cutoff);
float edge = step(n, _Cutoff + _EdgeWidth);

// Vertex wave (trong vertex shader)
v.vertex.y += sin(v.vertex.x * _Freq + _Time.y) * _Amp;

// Remap giá trị
float remap(float x, float a, float b, float c, float d) { return c + (x - a) * (d - c) / (b - a); }

// Hash ngẫu nhiên 2D đơn giản
float hash21(float2 p) { return frac(sin(dot(p, float2(12.9898, 78.233))) * 43758.5453); }

// Soft particle / độ sâu nước (URP)
float2 suv = IN.positionCS.xy / _ScaledScreenParams.xy;
float sceneZ = LinearEyeDepth(SampleSceneDepth(suv), _ZBufferParams);
float diff = sceneZ - IN.positionCS.w;
```

## 7. Lighting và Shadow

**Công thức chiếu sáng cơ bản** (N = normal, L = hướng tới đèn, V = hướng tới camera, H = normalize(L + V), tất cả đã chuẩn hóa)

| Mô hình | Công thức |
| --- | --- |
| Lambert (diffuse) | `diffuse = max(0, dot(N, L)) * lightColor * albedo` |
| Half-Lambert | `diffuse = (dot(N, L) * 0.5 + 0.5)` — mềm hơn, kiểu Valve |
| Phong (specular) | `spec = pow(max(0, dot(reflect(-L, N), V)), shininess)` |
| Blinn-Phong | `spec = pow(max(0, dot(N, H)), shininess)` |
| Toon | `step(_Threshold, dot(N, L))` hoặc lấy mẫu ramp texture theo NdotL |
| Fresnel (Schlick) | `F = F0 + (1 - F0) * pow(1 - dot(N, V), 5)` |
| Ambient | `ambient = SampleSH(N) * albedo` |

**Lighting trong URP**

```hlsl
#pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
#pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
#pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
#pragma multi_compile_fragment _ _SHADOWS_SOFT
#include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

half4 frag (Varyings IN) : SV_Target
{
    float3 N = normalize(IN.normalWS);
    float4 shadowCoord = TransformWorldToShadowCoord(IN.positionWS);
    Light mainLight = GetMainLight(shadowCoord);   // .direction .color .distanceAttenuation .shadowAttenuation

    half NdotL = saturate(dot(N, mainLight.direction));
    half3 color = albedo * mainLight.color * NdotL * mainLight.shadowAttenuation;

    uint count = GetAdditionalLightsCount();
    for (uint i = 0; i < count; i++)
    {
        Light l = GetAdditionalLight(i, IN.positionWS);
        color += albedo * l.color * saturate(dot(N, l.direction)) * l.distanceAttenuation * l.shadowAttenuation;
    }
    color += SampleSH(N) * albedo;
    return half4(color, 1);
}
```

Hàm PBR đầy đủ của URP: điền `InputData` và `SurfaceData`, rồi gọi `UniversalFragmentPBR(inputData, surfaceData)`; bản đơn giản là `UniversalFragmentBlinnPhong(...)`. Các hàm rời: `LightingLambert(color, dir, N)`, `LightingSpecular(color, dir, N, V, specular, smoothness)`.

**Shadow caster pass (URP)** — để vật thể đổ bóng, cách nhanh nhất là `UsePass "Universal Render Pipeline/Lit/ShadowCaster"`, hoặc tự viết:

```hlsl
Pass
{
    Name "ShadowCaster"
    Tags { "LightMode"="ShadowCaster" }
    ZWrite On ZTest LEqual ColorMask 0
    HLSLPROGRAM
    #pragma vertex ShadowPassVertex
    #pragma fragment ShadowPassFragment
    #include "Packages/com.unity.render-pipelines.universal/Shaders/LitInput.hlsl"
    #include "Packages/com.unity.render-pipelines.universal/Shaders/ShadowCasterPass.hlsl"
    ENDHLSL
}
```

**Built-in RP**: dùng `Tags {"LightMode"="ForwardBase"}`, `#pragma multi_compile_fwdbase`, `#include "AutoLight.cginc"`, rồi bộ macro `SHADOW_COORDS(n)` trong v2f, `TRANSFER_SHADOW(o)` trong VS, `SHADOW_ATTENUATION(i)` hoặc `UNITY_LIGHT_ATTENUATION(atten, i, worldPos)` trong PS. Pass ShadowCaster dùng `V2F_SHADOW_CASTER`, `TRANSFER_SHADOW_CASTER_NORMALOFFSET(o)`, `SHADOW_CASTER_FRAGMENT(i)`.

**Surface Shader (chỉ Built-in)**

```hlsl
CGPROGRAM
#pragma surface surf Standard fullforwardshadows addshadow vertex:vert
struct Input { float2 uv_MainTex; float3 worldPos; float3 viewDir; };
void surf (Input IN, inout SurfaceOutputStandard o)
{
    o.Albedo = tex2D(_MainTex, IN.uv_MainTex).rgb;
    o.Metallic = _Metallic; o.Smoothness = _Glossiness;
    o.Normal = UnpackNormal(tex2D(_BumpMap, IN.uv_MainTex));
    o.Emission = 0; o.Alpha = 1;
}
ENDCG
```

Model ánh sáng: `Standard`, `StandardSpecular`, `Lambert`, `BlinnPhong`, hoặc tự viết hàm `half4 LightingMyModel(SurfaceOutput s, half3 lightDir, half3 viewDir, half atten)`.

## 8. Kỹ thuật nâng cao cho shader vẽ

**Keyword và biến thể (variant)**

| Chỉ thị | Hành vi |
| --- | --- |
| `#pragma multi_compile _ FOO BAR` | Luôn build mọi biến thể, kể cả khi không vật liệu nào dùng |
| `#pragma shader_feature _ FOO` | Chỉ build biến thể vật liệu thực sự dùng (bị strip khi build) |
| `_local` hậu tố (`multi_compile_local`, `shader_feature_local`) | Keyword riêng của shader, không tốn giới hạn global |
| `_vertex` / `_fragment` hậu tố | Chỉ áp cho một stage, giảm số biến thể |
| `#pragma dynamic_branch FOO` | Unity 2022+: một biến thể, rẽ nhánh bằng `if (FOO)` lúc chạy |

```hlsl
#pragma shader_feature_local _USE_FX
#if defined(_USE_FX)
    col.rgb *= _FXColor.rgb;
#endif
```

Bật/tắt từ C#: `material.EnableKeyword("_USE_FX")`, `material.DisableKeyword(...)`, `Shader.EnableKeyword(...)` (global), hoặc `LocalKeyword kw = new LocalKeyword(shader, "_USE_FX"); material.SetKeyword(kw, true);`.

**GPU Instancing**

```hlsl
#pragma multi_compile_instancing
UNITY_INSTANCING_BUFFER_START(Props)
    UNITY_DEFINE_INSTANCED_PROP(float4, _Color)
UNITY_INSTANCING_BUFFER_END(Props)

// VS: UNITY_SETUP_INSTANCE_ID(v); UNITY_TRANSFER_INSTANCE_ID(v, o);
// PS: UNITY_SETUP_INSTANCE_ID(i);
float4 c = UNITY_ACCESS_INSTANCED_PROP(Props, _Color);
```

C# đặt giá trị riêng bằng `MaterialPropertyBlock` hoặc vẽ bằng `Graphics.RenderMeshInstanced(...)`. Lưu ý trong URP, `MaterialPropertyBlock` làm đối tượng rơi khỏi SRP Batcher.

**SRP Batcher** — điều kiện tương thích: mọi property của material nằm trong `CBUFFER_START(UnityPerMaterial)` với cùng bố cục ở mọi pass; biến built-in nằm trong `UnityPerDraw` (đã có sẵn trong `Core.hlsl`). Kiểm tra trên Inspector của shader: dòng “SRP Batcher: compatible”.

**Transparency**

| Kiểu | Cấu hình |
| --- | --- |
| Alpha blend | `Queue=Transparent`, `RenderType=Transparent`, `Blend SrcAlpha OneMinusSrcAlpha`, `ZWrite Off` |
| Additive | `Blend One One` hoặc `Blend SrcAlpha One`, `ZWrite Off` |
| Alpha cutout | `Queue=AlphaTest`, `clip(alpha - _Cutoff)`, `ZWrite On` |
| Hai mặt trong suốt | Pass 1 `Cull Front`, Pass 2 `Cull Back` |
| Sắp xếp sai thứ tự | Dùng pre-pass ghi depth (`ColorMask 0`, `ZWrite On`) hoặc OIT |

**Stencil**

```hlsl
Stencil
{
    Ref 1            // giá trị tham chiếu 0–255
    ReadMask 255
    WriteMask 255
    Comp Always      // Never, Less, Equal, LEqual, Greater, NotEqual, GEqual, Always
    Pass Replace     // Keep, Zero, Replace, IncrSat, DecrSat, Invert, IncrWrap, DecrWrap
    Fail Keep
    ZFail Keep
}
```

Ví dụ portal/mask: vật thể mask ghi `Ref 1, Comp Always, Pass Replace` với `ColorMask 0`; vật thể bên trong đọc `Ref 1, Comp Equal`. Outline: pass 1 ghi stencil, pass 2 phóng to theo normal và vẽ với `Comp NotEqual`.

**Geometry và Tessellation** (cần `#pragma target 4.6`, không chạy trên Metal)

```hlsl
#pragma geometry geom
[maxvertexcount(3)]
void geom(triangle v2f IN[3], inout TriangleStream<v2f> stream)
{
    for (int i = 0; i < 3; i++) stream.Append(IN[i]);
    stream.RestartStrip();
}
```

Tessellation gồm `#pragma hull hull`, `#pragma domain domain`, hàm hull khai báo các attribute `[domain("tri")]`, `[partitioning("fractional_odd")]`, `[outputtopology("triangle_cw")]`, `[patchconstantfunc("patchConst")]`, `[outputcontrolpoints(3)]`; hàm patch constant trả về `SV_TessFactor` và `SV_InsideTessFactor`; domain nhận `SV_DomainLocation`. Trên nhiều nền tảng, thay geometry/tessellation bằng compute shader thường nhanh và tương thích hơn.

**Hậu xử lý (URP)**: viết `ScriptableRendererFeature` + `ScriptableRenderPass` (Unity 6 dùng Render Graph với `RecordRenderGraph`), shader dùng `Blit.hlsl` với `Vert` có sẵn và đọc `_BlitTexture` bằng `SAMPLE_TEXTURE2D_X(_BlitTexture, sampler_LinearClamp, uv)`.

## 9. Compute shader cơ bản

Compute shader chia việc thành **thread group**; mỗi group có số thread cố định do `[numthreads(x,y,z)]` quy định, và C# gọi `Dispatch` với số group theo 3 chiều. Tổng thread = số group × numthreads.

```hlsl
// File: MyCompute.compute
#pragma kernel CSMain          // mỗi kernel một dòng; index theo thứ tự khai báo
#pragma kernel CSClear

RWTexture2D<float4> Result;
float Time;
uint Width, Height;

[numthreads(8, 8, 1)]
void CSMain (uint3 id : SV_DispatchThreadID)
{
    if (id.x >= Width || id.y >= Height) return;   // chặn thread thừa
    float2 uv = id.xy / float2(Width, Height);
    Result[id.xy] = float4(uv, 0.5 + 0.5 * sin(Time), 1);
}

[numthreads(8, 8, 1)]
void CSClear (uint3 id : SV_DispatchThreadID)
{
    Result[id.xy] = 0;
}
```

**Semantics định danh thread**

| Semantic | Kiểu | Ý nghĩa |
| --- | --- | --- |
| `SV_DispatchThreadID` | `uint3` | ID toàn cục = GroupID × numthreads + GroupThreadID; dùng phổ biến nhất |
| `SV_GroupID` | `uint3` | Chỉ số group trong lưới Dispatch |
| `SV_GroupThreadID` | `uint3` | Chỉ số thread trong group |
| `SV_GroupIndex` | `uint` | GroupThreadID phẳng hóa: z*X*Y + y\*X + x |

Ví dụ: `numthreads(8,8,1)`, `Dispatch(k, 4, 4, 1)` → 16 group × 64 thread = 1024 thread, phủ ảnh 32×32.

**Kiểu tài nguyên**

| Kiểu HLSL | Đọc/Ghi | C# tương ứng |
| --- | --- | --- |
| `Texture2D<float4>` | Chỉ đọc | `Texture`, `RenderTexture` |
| `RWTexture2D<float4>` | Đọc/ghi | `RenderTexture` với `enableRandomWrite = true` |
| `RWTexture3D<float4>`, `RWTexture2DArray<float4>` | Đọc/ghi | `RenderTexture` với `dimension = Tex3D / Tex2DArray` |
| `StructuredBuffer<T>` | Chỉ đọc | `ComputeBuffer` / `GraphicsBuffer.Target.Structured` |
| `RWStructuredBuffer<T>` | Đọc/ghi | Như trên |
| `ByteAddressBuffer`, `RWByteAddressBuffer` | Đọc theo byte (`Load`, `Load4`, `Store`) | `ComputeBufferType.Raw` / `Target.Raw` |
| `AppendStructuredBuffer<T>` | Chỉ `Append` | `ComputeBufferType.Append` |
| `ConsumeStructuredBuffer<T>` | Chỉ `Consume` | `ComputeBufferType.Append` |
| `Buffer<float4>`, `RWBuffer<float4>` | Typed buffer | Ít dùng trong Unity |
| `cbuffer` / biến toàn cục | Hằng số | `SetFloat`, `SetVector`, `SetConstantBuffer` |

**Struct trong buffer** — bố cục phải khớp chính xác với struct C# (kích thước `stride` tính bằng byte, nên là bội số của 4, tốt nhất 16):

```hlsl
struct Particle { float3 position; float3 velocity; float life; float pad; };  // 32 byte
RWStructuredBuffer<Particle> Particles;
```

```csharp
[StructLayout(LayoutKind.Sequential)]
struct Particle { public Vector3 position; public Vector3 velocity; public float life; public float pad; }
int stride = System.Runtime.InteropServices.Marshal.SizeOf<Particle>(); // 32
```

Lấy mẫu texture trong compute: dùng `tex.SampleLevel(sampler, uv, 0)` (không có `Sample` vì không có đạo hàm), hoặc `tex[id.xy]` / `tex.Load(int3(id.xy, 0))`.

## 10. Compute shader – API C#

```csharp
using UnityEngine;

public class ComputeRunner : MonoBehaviour
{
    public ComputeShader cs;
    RenderTexture rt;
    int kernel;
    static readonly int ResultID = Shader.PropertyToID("Result");
    static readonly int TimeID   = Shader.PropertyToID("Time");

    void Start()
    {
        rt = new RenderTexture(512, 512, 0, RenderTextureFormat.ARGBFloat);
        rt.enableRandomWrite = true;          // bắt buộc cho RWTexture
        rt.Create();

        kernel = cs.FindKernel("CSMain");
        cs.SetTexture(kernel, ResultID, rt);
        cs.SetInt("Width", 512); cs.SetInt("Height", 512);
    }

    void Update()
    {
        cs.SetFloat(TimeID, Time.time);
        cs.GetKernelThreadGroupSizes(kernel, out uint tx, out uint ty, out _);
        int gx = Mathf.CeilToInt(512f / tx);
        int gy = Mathf.CeilToInt(512f / ty);
        cs.Dispatch(kernel, gx, gy, 1);
    }

    void OnDestroy() { rt.Release(); }
}
```

**ComputeShader**

| Phương thức | Định nghĩa |
| --- | --- |
| `FindKernel(name)` | Lấy index kernel |
| `HasKernel(name)` | Kiểm tra kernel tồn tại |
| `GetKernelThreadGroupSizes(k, out x, out y, out z)` | Đọc numthreads |
| `Dispatch(k, gx, gy, gz)` | Chạy kernel (tối đa 65535 group mỗi chiều) |
| `DispatchIndirect(k, argsBuffer, offset)` | Số group lấy từ buffer trên GPU |
| `SetInt`, `SetFloat`, `SetBool`, `SetVector`, `SetMatrix` | Đặt hằng số (toàn shader) |
| `SetInts`, `SetFloats`, `SetVectorArray`, `SetMatrixArray` | Mảng hằng số |
| `SetTexture(k, name, tex, mip)` | Gán texture cho kernel |
| `SetTextureFromGlobal(k, name, globalName)` | Dùng texture global |
| `SetBuffer(k, name, buffer)` | Gán buffer cho kernel |
| `SetConstantBuffer(name, buffer, offset, size)` | Gán cbuffer |
| `EnableKeyword`, `DisableKeyword`, `SetKeyword` | Keyword (`#pragma multi_compile` trong compute) |

**ComputeBuffer / GraphicsBuffer**

```csharp
var buf = new ComputeBuffer(count, stride, ComputeBufferType.Structured);
// hoặc (khuyến nghị cho code mới)
var gbuf = new GraphicsBuffer(GraphicsBuffer.Target.Structured, count, stride);

buf.SetData(array);                 // CPU → GPU
buf.GetData(array);                 // GPU → CPU, chặn luồng (chậm)
AsyncGPUReadback.Request(buf, req => { var data = req.GetData<Particle>(); });  // không chặn
buf.Release();                      // luôn giải phóng (OnDisable/OnDestroy)
```

| `ComputeBufferType` / `GraphicsBuffer.Target` | Dùng cho |
| --- | --- |
| `Structured` / `Target.Structured` | `StructuredBuffer<T>` |
| `Raw` / `Target.Raw` | `ByteAddressBuffer` |
| `Append` / `Target.Append` | Append/Consume buffer |
| `Counter` / `Target.Counter` | Buffer có bộ đếm ẩn (`IncrementCounter`) |
| `IndirectArguments` / `Target.IndirectArguments` | Tham số cho DrawIndirect/DispatchIndirect |
| `Constant` / `Target.Constant` | Constant buffer |
| — / `Target.Vertex`, `Target.Index` | Đọc/ghi trực tiếp vertex/index buffer của Mesh |

Các hàm khác: `ComputeBuffer.CopyCount(src, dst, offset)` (chép bộ đếm Append), `buf.SetCounterValue(0)`, `buf.count`, `buf.stride`, `buf.IsValid()`.

**Dùng kết quả compute trong shader vẽ**

```csharp
material.SetBuffer("_Particles", buf);   // hoặc Shader.SetGlobalBuffer
```

```hlsl
#pragma target 4.5
StructuredBuffer<Particle> _Particles;
v2f vert (uint vid : SV_VertexID, uint iid : SV_InstanceID)
{
    Particle p = _Particles[iid];
    // ...
}
```

**CommandBuffer** (chạy trong pipeline, URP render pass): `cmd.SetComputeIntParam`, `cmd.SetComputeFloatParam`, `cmd.SetComputeVectorParam`, `cmd.SetComputeTextureParam`, `cmd.SetComputeBufferParam`, `cmd.DispatchCompute(cs, k, gx, gy, gz)`.

## 11. Compute shader nâng cao

**Shared memory và đồng bộ** — `groupshared` là bộ nhớ nhanh dùng chung trong một thread group (tối đa 32 KB trên DX11). Phải đồng bộ bằng barrier trước khi đọc dữ liệu do thread khác ghi.

```hlsl
#define GROUP 256
groupshared float cache[GROUP];
StructuredBuffer<float> Input;
RWStructuredBuffer<float> PartialSums;

[numthreads(GROUP, 1, 1)]
void Reduce (uint3 gid : SV_GroupID, uint gi : SV_GroupIndex, uint3 id : SV_DispatchThreadID)
{
    cache[gi] = Input[id.x];
    GroupMemoryBarrierWithGroupSync();

    [unroll]
    for (uint s = GROUP / 2; s > 0; s >>= 1)
    {
        if (gi < s) cache[gi] += cache[gi + s];
        GroupMemoryBarrierWithGroupSync();
    }
    if (gi == 0) PartialSums[gid.x] = cache[0];
}
```

| Barrier | Đảm bảo |
| --- | --- |
| `GroupMemoryBarrier()` | Mọi lệnh ghi groupshared đã xong |
| `GroupMemoryBarrierWithGroupSync()` | Như trên + mọi thread trong group chờ nhau (thường dùng nhất) |
| `DeviceMemoryBarrier()` / `...WithGroupSync()` | Ghi vào buffer/texture (UAV) đã xong |
| `AllMemoryBarrier()` / `...WithGroupSync()` | Cả hai loại trên |

Không đặt barrier trong nhánh `if` mà không phải mọi thread trong group đều đi vào — sẽ treo hoặc lỗi biên dịch.

**Atomic** (chỉ `int`/`uint`, trên `groupshared` hoặc RW buffer/texture)

| Hàm | Định nghĩa |
| --- | --- |
| `InterlockedAdd(dest, v, out orig)` | Cộng nguyên tử, trả giá trị cũ |
| `InterlockedMin`, `InterlockedMax` | Min / max nguyên tử |
| `InterlockedAnd`, `InterlockedOr`, `InterlockedXor` | Phép bit nguyên tử |
| `InterlockedExchange(dest, v, out orig)` | Ghi đè, trả giá trị cũ |
| `InterlockedCompareExchange(dest, cmp, v, out orig)` | Ghi nếu dest == cmp (khóa, lock-free) |
| `InterlockedCompareStore(dest, cmp, v)` | Như trên, không trả về |
| `buf.IncrementCounter()`, `buf.DecrementCounter()` | Bộ đếm ẩn của buffer kiểu Counter |

Ví dụ histogram: `InterlockedAdd(Histogram[bin], 1);`. Cần atomic float thì đổi sang fixed-point (nhân 1000 rồi lưu `int`).

**Append / Consume buffer** — dùng để lọc (culling) hoặc spawn particle.

```hlsl
AppendStructuredBuffer<uint> VisibleIDs;
[numthreads(64,1,1)]
void Cull (uint3 id : SV_DispatchThreadID)
{
    if (IsVisible(id.x)) VisibleIDs.Append(id.x);
}
```

```csharp
visible.SetCounterValue(0);                          // reset trước mỗi lần dispatch
cs.Dispatch(kernel, groups, 1, 1);
ComputeBuffer.CopyCount(visible, argsBuffer, sizeof(uint)); // ghi số phần tử vào args[1] = instanceCount
```

**Vẽ indirect (GPU-driven rendering)** — GPU tự quyết số instance, CPU không cần đọc lại.

```csharp
// args: indexCountPerInstance, instanceCount, startIndex, baseVertex, startInstance
var args = new uint[5] { mesh.GetIndexCount(0), 0, mesh.GetIndexStart(0), mesh.GetBaseVertex(0), 0 };
var argsBuffer = new GraphicsBuffer(GraphicsBuffer.Target.IndirectArguments, 1, 5 * sizeof(uint));
argsBuffer.SetData(args);

var rp = new RenderParams(material) { worldBounds = new Bounds(Vector3.zero, Vector3.one * 1000) };
Graphics.RenderMeshIndirect(rp, mesh, argsBuffer);   // API cũ: Graphics.DrawMeshInstancedIndirect
```

Trong shader vẽ, đọc `StructuredBuffer` theo `SV_InstanceID` (hoặc dùng `#pragma instancing_options procedural:Setup` + `unity_InstanceID`). Các biến thể: `Graphics.RenderPrimitivesIndirect`, `cs.DispatchIndirect` (args = 3 uint: gx, gy, gz).

**Wave intrinsics (SM 6.0)** — bật bằng `#pragma use_dxc` và `#pragma require wavebasic` (hỗ trợ tùy nền tảng): `WaveGetLaneIndex()`, `WaveGetLaneCount()`, `WaveActiveSum(x)`, `WaveActiveMax(x)`, `WavePrefixSum(x)`, `WaveReadLaneFirst(x)`, `WaveActiveBallot(cond)`, `WaveIsFirstLane()`. Dùng để reduce/scan nhanh hơn groupshared.

**Mẫu thiết kế thường gặp**

- **Ping-pong**: hai buffer/texture A, B; mỗi bước đọc A ghi B rồi đổi vai trò (mô phỏng chất lỏng, Game of Life, blur nhiều lượt).
- **Prefix sum (scan)**: nền tảng cho stream compaction, sort, radix sort.
- **Bitonic sort**: sắp xếp trên GPU (ví dụ sắp particle theo độ sâu).
- **Spatial hashing / grid**: tìm láng giềng trong boids, SPH.
- **Mesh deformation**: `mesh.vertexBufferTarget |= GraphicsBuffer.Target.Raw;` rồi `mesh.GetVertexBuffer(0)` để compute ghi trực tiếp vào vertex buffer.

## 12. Tối ưu, debug và lỗi thường gặp

**Tối ưu shader vẽ**

- Dùng `half` cho màu, normal, hướng trên mobile; giữ `float` cho vị trí và UV lớn.
- Đẩy phép tính từ fragment sang vertex khi kết quả nội suy tuyến tính được (nhiều đỉnh ít hơn nhiều pixel).
- Tránh `discard`/`clip` và alpha blend trên diện tích lớn: phá early-Z, gây overdraw.
- Gom texture (atlas, channel packing: R=metallic, G=AO, A=smoothness) để giảm số lần lấy mẫu.
- Giảm biến thể: ưu tiên `shader_feature_local`, `_vertex`/`_fragment`, và Shader Variant Stripping.
- `pow`, `sin`, `exp` tốn hơn `mad`, `saturate`, `lerp`; tránh `if` phụ thuộc dữ liệu trong vòng lặp lớn.

**Tối ưu compute**

- numthreads là bội số của 32 (NVIDIA warp) hoặc 64 (AMD wavefront); 64 hoặc 8×8 là lựa chọn an toàn.
- Truy cập bộ nhớ liền kề giữa các thread cạnh nhau (coalesced): thread i đọc phần tử i.
- Dùng `groupshared` khi nhiều thread đọc cùng dữ liệu (blur, convolution theo tile).
- Tránh `GetData` mỗi frame; dùng `AsyncGPUReadback` hoặc giữ dữ liệu trên GPU và vẽ indirect.
- Giảm phân nhánh khác nhau trong cùng warp (divergence).
- Kiểm tra `SystemInfo.supportsComputeShaders`, `SystemInfo.maxComputeWorkGroupSize` trước khi chạy.

**Công cụ debug**

| Công cụ | Dùng để |
| --- | --- |
| Frame Debugger (Window › Analysis) | Xem từng draw call, pass, keyword, giá trị property |
| RenderDoc (tích hợp Editor) | Bắt frame, xem buffer, texture, debug từng pixel/thread |
| Xcode GPU / PIX / Nsight | Profile GPU theo nền tảng |
| `#pragma enable_d3d11_debug_symbols` | Giữ symbol để debug shader trong RenderDoc/PIX |
| Trả màu trực quan | `return float4(i.normal * 0.5 + 0.5, 1);`, `return frac(i.uv.xyxy);` |
| Shader Inspector › Compile and show code | Xem code biên dịch, số lệnh, biến thể |

**Lỗi thường gặp**

| Triệu chứng | Nguyên nhân / cách sửa |
| --- | --- |
| Vật thể màu hồng tím | Shader lỗi biên dịch hoặc không hợp pipeline (shader Built-in trong URP) — xem Console, thêm tag `RenderPipeline` |
| Không tương thích SRP Batcher | Property nằm ngoài `CBUFFER_START(UnityPerMaterial)`, hoặc CBUFFER khác nhau giữa các pass |
| Không có bóng | Thiếu pass `ShadowCaster` hoặc thiếu `multi_compile _MAIN_LIGHT_SHADOWS...` |
| Không thấy trong Depth/SSAO | Thiếu pass `DepthOnly` / `DepthNormals` |
| Normal sai khi scale không đều | Dùng `TransformObjectToWorldNormal`, không nhân thẳng `unity_ObjectToWorld` |
| Trong suốt bị lỗi thứ tự | Đặt `Queue=Transparent`, `ZWrite Off`; vật thể giao nhau cần tách mesh hoặc OIT |
| Ảnh lật ngược trên DX | `_ProjectionParams.x` hoặc `#if UNITY_UV_STARTS_AT_TOP` để đảo uv.y |
| Compute không ghi gì | Quên `enableRandomWrite = true`, quên `SetTexture`/`SetBuffer` cho đúng kernel, hoặc Dispatch 0 group |
| Dữ liệu buffer rác | Stride C# không khớp struct HLSL, thiếu padding |
| Viền ảnh bị sót hoặc truy cập ngoài mảng | Số group làm tròn xuống — dùng `CeilToInt` và kiểm tra biên trong kernel |
| Rò rỉ bộ nhớ GPU (cảnh báo “Garbage collector disposing of ComputeBuffer”) | Gọi `Release()` trong `OnDisable`/`OnDestroy` |
| Treo GPU / TDR | Vòng lặp vô hạn, barrier trong nhánh không đồng nhất, dispatch quá lớn |

Tài liệu tham khảo chính: Unity Manual (mục Shaders và Compute shaders), URP ShaderLibrary trong thư mục `Packages`, và Microsoft HLSL Intrinsic Functions reference.

## 13. Tối ưu chuyên sâu: chẩn đoán điểm nghẽn và shader vẽ

Luôn đo trước khi tối ưu: frame chỉ nhanh bằng khâu chậm nhất, tối ưu sai khâu không tăng FPS.

**Bước 1 – Xác định đang nghẽn ở đâu**

| Thử nghiệm | Nếu FPS tăng rõ | Kết luận |
| --- | --- | --- |
| So `CPU main` và `GPU` trong Profiler / Stats | CPU ms > GPU ms | CPU-bound: draw call, SetPass, script — tối ưu shader không giúp |
| Giảm độ phân giải render (Render Scale URP 0.5) | Có | Fragment / fill-rate bound |
| Thay shader bằng màu đơn (Frame Debugger, RenderDoc) | Có | Fragment ALU hoặc lấy mẫu texture |
| Ép mipmap thấp / texture 1×1 | Có | Băng thông texture (bandwidth) |
| Giảm số tam giác (LOD thấp) | Có | Vertex / số đỉnh |
| Tắt transparent, particle | Có | Overdraw |
| Tắt shadow / post-processing từng cái | Có | Pass đó là thủ phạm |

**Những thứ làm nặng GPU (shader vẽ)**

| Thứ gây nặng | Vì sao chậm | Cách giảm |
| --- | --- | --- |
| Overdraw (transparent, particle, UI chồng lớp) | Một pixel bị tô nhiều lần | Particle nhỏ hơn, mesh ôm sát hình (không dùng quad trống), giới hạn số lớp |
| `discard` / `clip` / alpha test | Tắt early-Z; trên mobile (TBDR) phá Hidden Surface Removal | Dùng mesh cắt sẵn, depth pre-pass, chỉ dùng khi cần |
| Ghi `SV_Depth` trong fragment | Tắt hoàn toàn early-Z | Tránh; nếu bắt buộc dùng `SV_DepthGreaterEqual` / `SV_DepthLessEqual` (conservative depth) |
| Nhiều lần lấy mẫu texture | Tốn băng thông, chờ bộ nhớ | Channel packing, atlas, giảm tap blur, tách blur 2 chiều |
| Texture không nén / không mipmap | Cache miss, băng thông lớn | ASTC/ETC2 (mobile), BC7/BC5 (PC), bật mipmap cho vật 3D |
| Dependent texture read (UV phụ thuộc kết quả texture khác) | GPU không prefetch được | Tính UV ở vertex shader khi có thể |
| Vòng lặp động, `if` theo dữ liệu | Thread trong warp đi nhánh khác nhau (divergence) | Hằng số lặp + `[unroll]`, thay `if` bằng `step`/`lerp` khi hai nhánh rẻ |
| `pow`, `exp`, `log`, `sin`, `acos`, chia, `normalize` | Lệnh transcendental chạy ở đơn vị riêng, chậm hơn | Tính trước, LUT texture, xấp xỉ (`x*x` thay `pow(x,2)`) |
| Quá nhiều dữ liệu v2f (interpolator) | Tốn băng thông giữa VS và PS | Gộp vào `float4`, dùng `half`, bỏ biến không dùng |
| Nhiều đèn per-pixel, shadow cascade | Mỗi đèn nhân chi phí fragment | Giới hạn số đèn, dùng Forward+ / Deferred, ít cascade, bake lightmap |
| Post-processing độ phân giải đầy đủ | Mỗi effect = quét lại cả màn hình | Gộp effect vào một pass, chạy bloom/blur ở nửa hoặc 1/4 độ phân giải |
| Đọc `_CameraOpaqueTexture`, `_CameraDepthTexture` | Bắt buộc copy buffer, trên mobile phá tile | Chỉ bật khi thật cần trong URP Asset |
| MSAA + HDR trên mobile | Bộ nhớ gấp nhiều lần | MSAA 2x, tắt HDR nếu không cần |
| Geometry shader | Rất chậm trên đa số GPU, không có trên Metal | Thay bằng compute + indirect draw |
| Tessellation quá mức | Sinh hàng triệu tam giác nhỏ | Tess factor theo khoảng cách, cull patch ngoài camera |
| Tam giác nhỏ hơn pixel | Rasterizer xử lý theo quad 2×2, lãng phí đến 75% | LOD, giới hạn mật độ lưới |

**Những thứ làm nặng CPU / gây giật (hitch)**

| Thứ gây nặng | Cách giảm |
| --- | --- |
| Nhiều SetPass call / material khác nhau | Dùng chung shader + SRP Batcher, gom material, texture atlas |
| `MaterialPropertyBlock` trong URP | Rơi khỏi SRP Batcher — dùng material riêng hoặc instancing |
| `renderer.material` (tạo bản sao) | Dùng `sharedMaterial` hoặc cache material |
| `SetFloat("_Name")` bằng chuỗi mỗi frame | Cache `Shader.PropertyToID` |
| Bùng nổ biến thể (multi\_compile chồng nhau) | Build lâu, bộ nhớ lớn — dùng `shader_feature_local`, `dynamic_branch`, strip variant |
| Shader biên dịch lần đầu khi xuất hiện (PSO hitch) | Warmup: `ShaderVariantCollection.WarmUp()`; Unity 6 dùng `GraphicsStateCollection` để trace và warm PSO |
| Bật/tắt keyword liên tục | Đổi variant gây SetPass mới — dùng property `float` + nhánh động nếu rẻ |

**Tips cơ bản**

- Đặt đúng `Queue`: opaque vẽ trước theo thứ tự gần → xa để early-Z loại pixel bị che.
- Dùng `half` trên mobile; `saturate` gần như miễn phí, `clamp(x,0,1)` thì không chắc.
- Viết biểu thức dạng `a * b + c` để trình biên dịch gộp thành một lệnh `mad`.
- Đưa phép tính chung cho mọi pixel ra C# (ví dụ `1/_Size`, ma trận) và truyền vào.
- Unlit cho vật thể không cần ánh sáng; bake lighting cho cảnh tĩnh.

**Tips trung cấp**

- Normalize trong fragment chỉ khi cần; normal nội suy cần normalize, nhưng hướng đèn directional thì không.
- Dùng `SampleLevel` với mip cố định khi biết trước độ xa, tránh tính đạo hàm.
- Tách shader thành các mức chất lượng bằng `LOD` của SubShader và `Shader.globalMaximumLOD`.
- Dùng LUT (ramp texture, color grading 3D) thay chuỗi tính toán phức tạp.
- Kiểm tra số lệnh: Inspector › Compile and show code, hoặc Mali Offline Compiler / AMD RGA cho chu kỳ thực tế.

**Tips nâng cao**

- Depth pre-pass (URP Depth Priming) cho cảnh có fragment shader đắt, để chỉ tô pixel thấy được.
- Variable Rate Shading (VRS) hoặc render nửa độ phân giải rồi upscale (FSR, STP trong Unity 6) cho effect mềm.
- Mobile TBDR: tránh đọc lại render target giữa pass (load/store action `DontCare`), gộp pass bằng Native RenderPass / subpass của URP.
- Temporal: rải phép tính đắt qua nhiều frame (TAA-style, cập nhật 1/4 pixel mỗi frame).
- Đo theo GPU counters (RenderDoc, Snapdragon Profiler, Xcode GPU, Nsight) để biết nghẽn ALU, texture hay băng thông thay vì đoán.

## 14. Tối ưu chuyên sâu: compute shader

Compute thường nghẽn ở bộ nhớ chứ không ở phép tính: một lần đọc global memory chậm hơn hàng trăm phép nhân.

**Những thứ làm chậm, làm nghẽn compute**

| Thứ gây nặng | Vì sao chậm | Cách giảm |
| --- | --- | --- |
| `GetData()` / đọc ngược GPU → CPU | CPU đứng chờ GPU chạy xong mọi lệnh trước đó (stall đồng bộ) | `AsyncGPUReadback`, hoặc giữ dữ liệu trên GPU và dùng `DispatchIndirect` / `RenderMeshIndirect` |
| `SetData()` mảng lớn mỗi frame | Băng thông PCIe, copy CPU | Chỉ upload phần thay đổi (`SetData(arr, start, start, count)`), dùng `LockBufferForWrite` (GraphicsBuffer, `UsageFlags.LockBufferForWrite`) |
| Tạo / `Release` buffer mỗi frame | Cấp phát bộ nhớ GPU, rác GC | Tạo một lần, tái sử dụng, cấp dư dung lượng |
| numthreads nhỏ (1, 4, 16) | Warp/wavefront 32–64 lane chạy thiếu, lãng phí phần cứng | Bội số của 64 (64, 128, 256 hoặc 8×8, 16×16) |
| Nhiều dispatch rất nhỏ | Mỗi dispatch có chi phí cố định + barrier ngầm giữa các dispatch ghi cùng tài nguyên | Gộp kernel, xử lý nhiều phần tử mỗi thread |
| Truy cập bộ nhớ rải rác | Không coalesce, mỗi thread kéo một cache line riêng | Thread liền kề đọc địa chỉ liền kề; sắp xếp dữ liệu theo thứ tự truy cập |
| Struct lớn (AoS) khi chỉ cần 1–2 trường | Kéo cả struct qua bộ nhớ | Tách thành nhiều buffer (SoA): `positions`, `velocities` riêng |
| Stride không căn 16 byte | Đọc lệch, tốn thêm giao dịch bộ nhớ | Pad struct về 16/32/48 byte |
| Divergence (`if`, vòng lặp có độ dài khác nhau giữa thread) | Warp chạy cả hai nhánh tuần tự | Sắp xếp/gom công việc giống nhau lại, stream compaction trước |
| Atomic cạnh tranh trên cùng một địa chỉ | Các thread xếp hàng chờ nhau | Gộp trong `groupshared` hoặc dùng `WaveActiveSum` trước, mỗi group chỉ atomic 1 lần ra global |
| Bank conflict trong `groupshared` | Nhiều thread truy cập cùng bank (32 bank × 4 byte) bị tuần tự hóa | Padding mảng (`cache[N + 1]` mỗi hàng), tránh stride lũy thừa của 2 |
| Dùng quá nhiều `groupshared` hoặc register | Giảm số group chạy đồng thời (occupancy thấp), GPU không che được độ trễ bộ nhớ | Giảm biến tạm, mảng cục bộ, kích thước groupshared |
| Mảng cục bộ đánh chỉ số động (`float arr[32]; arr[i]`) | Bị đẩy ra bộ nhớ chậm (register spill) | Dùng hằng số chỉ số với `[unroll]`, hoặc chuyển sang groupshared |
| Barrier trong vòng lặp dài | Mọi thread chờ thread chậm nhất mỗi vòng | Giảm số barrier, chỉ sync khi thực sự đọc dữ liệu thread khác |
| `RWTexture` định dạng không hỗ trợ typed UAV load | Một số GPU/API chậm hoặc không đọc được | Dùng `RFloat`, `RInt`, `ARGBFloat`; kiểm tra `SystemInfo.IsFormatSupported(..., FormatUsage.LoadStore)` |
| Kernel quá dài trên một dispatch | TDR (driver reset \~2 giây trên Windows), giật | Chia thành nhiều dispatch nhỏ qua nhiều frame |

**Tips cơ bản**

- Bắt đầu với `[numthreads(64,1,1)]` cho dữ liệu 1D và `[numthreads(8,8,1)]` cho ảnh 2D.
- Luôn kiểm tra biên `if (id.x >= Count) return;` và dispatch bằng `CeilToInt`.
- Cache `FindKernel` và `Shader.PropertyToID`, chỉ gọi `SetBuffer`/`SetTexture` khi tài nguyên thay đổi.
- Giải phóng buffer trong `OnDisable` để tránh rò rỉ khi reload script trong Editor.
- Không đọc kết quả về CPU trừ khi gameplay thật sự cần (va chạm, logic).

**Tips trung cấp**

- Mỗi thread xử lý vài phần tử (vòng lặp nhỏ) khi số phần tử rất lớn, giảm số group và chi phí khởi tạo.
- Tile + groupshared cho blur, convolution, đọc láng giềng: nạp một ô (kể cả viền) vào shared memory, sync một lần, rồi tính.
- Tách blur 2D thành hai pass 1D: từ N×N lần đọc xuống 2N.
- Dùng `half`/`min16float` và nén dữ liệu (`f32tof16`, pack 2 giá trị vào một `uint`) để giảm băng thông.
- Dùng `Texture2D` + `SampleLevel` với sampler linear khi cần lọc: phần cứng nội suy miễn phí, cache texture tốt cho truy cập 2D.

**Tips nâng cao**

- Reduce/scan theo cấp: wave intrinsics trong warp → groupshared trong group → atomic một lần ra global.
- GPU-driven pipeline: culling (frustum, Hi-Z occlusion) trên compute → Append buffer → `CopyCount` → indirect draw, CPU không chạm vào dữ liệu.
- Async compute (`Graphics.ExecuteCommandBufferAsync` với `ComputeQueueType.Background`, `GraphicsFence`) để chạy song song với render khi GPU còn nhàn; kiểm tra `SystemInfo.supportsAsyncCompute`.
- Sắp xếp không gian (Morton/Z-order, sort theo cell) để thread gần nhau truy cập dữ liệu gần nhau, tăng cache hit.
- Đo bằng RenderDoc/Nsight/PIX: xem occupancy, số register, bandwidth, tỉ lệ cache hit, thay vì đoán; thử nhiều giá trị numthreads vì kết quả tốt nhất khác nhau theo GPU.
