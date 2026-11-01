---
title: Unity URP shader cơ bản
description: Khung shader HLSL cho URP, các semantic hay dùng, lấy mẫu texture và đổi không gian toạ độ.
date: 2026-10-28
tags: [Unity, Shader, HLSL, URP]
---

## Khung shader unlit

```hlsl
Shader "Custom/Unlit"
{
    Properties
    {
        _BaseMap ("Texture", 2D) = "white" {}
        _BaseColor ("Color", Color) = (1,1,1,1)
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" }
        Pass
        {
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

## Kiểu Properties

| Khai báo | Kiểu trong HLSL |
| --- | --- |
| `Float`, `Range(0,1)` | `float` / `half` |
| `Color`, `Vector` | `float4` / `half4` |
| `2D` | `TEXTURE2D` + `SAMPLER` |
| `Cube` | `TEXTURECUBE` + `SAMPLER` |

Mọi property của material nên nằm trong `CBUFFER_START(UnityPerMaterial)` để tương thích SRP Batcher. Texture thì khai báo bên ngoài.

## Semantic hay dùng

| Semantic | Ý nghĩa |
| --- | --- |
| `POSITION` | vị trí đỉnh (object space) |
| `NORMAL` | pháp tuyến |
| `TANGENT` | tiếp tuyến, `w` là dấu |
| `TEXCOORD0..7` | UV hoặc dữ liệu tự truyền |
| `COLOR` | màu đỉnh |
| `SV_POSITION` | vị trí clip space (output vertex) |
| `SV_Target` | màu output của fragment |

## Đổi không gian toạ độ

```hlsl
float3 posWS  = TransformObjectToWorld(IN.positionOS.xyz);
float4 posHCS = TransformWorldToHClip(posWS);
float3 nrmWS  = TransformObjectToWorldNormal(IN.normalOS);
float3 viewWS = GetWorldSpaceViewDir(posWS);
```

Có sẵn gói tiện lợi: `GetVertexPositionInputs(positionOS)` trả về cùng lúc `positionWS`, `positionVS`, `positionCS`.

## Lấy mẫu texture

```hlsl
half4 c = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv);
// Trong vertex shader phải chỉ định mip:
half4 v = SAMPLE_TEXTURE2D_LOD(_BaseMap, sampler_BaseMap, uv, 0);
```

## Hàm hay dùng

| Hàm | Dùng để |
| --- | --- |
| `lerp(a, b, t)` | nội suy |
| `saturate(x)` | kẹp về 0..1 |
| `step(edge, x)` | 0 nếu x < edge, ngược lại 1 |
| `smoothstep(a, b, x)` | chuyển mượt giữa a và b |
| `frac(x)` | phần thập phân, dùng để lặp |
| `dot(a, b)` | góc giữa hai vector, ánh sáng Lambert |
| `_Time.y` | thời gian tính bằng giây |

## Trong suốt

```hlsl
Tags { "RenderType"="Transparent" "Queue"="Transparent" }
Blend SrcAlpha OneMinusSrcAlpha
ZWrite Off
```

## Shader Graph tương đương

| Code | Node |
| --- | --- |
| `SAMPLE_TEXTURE2D` | Sample Texture 2D |
| `lerp` | Lerp |
| `_Time.y` | Time (Time) |
| `TRANSFORM_TEX` | Tiling And Offset |
| `dot(N, L)` | Dot Product |
