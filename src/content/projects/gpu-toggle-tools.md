---
title: GPU Toggle Tools
description: Công cụ miễn phí cho người dùng eGPU trên Windows. Bật/tắt GPU một cú bấm, chọn card cho từng game, đo băng thông PCIe và xem OSD ngay trong game để biết cái gì đang giới hạn FPS.
date: 2026-11-16
updated: 2026-11-17
status: Đang làm
stack: [C#, WinForms, .NET Framework 4, Direct3D 11, NVML]
repo: https://github.com/ncaohoc/GPUToggleTools
tags: [eGPU, Windows, Công cụ]
order: 0
featured: true
---

Cắm eGPU qua USB4 hay Thunderbolt giúp laptop mạnh hơn hẳn, nhưng đi kèm nhiều phiền toái nhỏ. Game chạy nhầm sang iGPU. Muốn tắt iGPU thì phải mở Device Manager. Rút dây eGPU lúc card còn chạy thì Windows dễ treo. Và lúc FPS tụt, khó biết lỗi do card, do CPU hay do đường truyền USB4.

GPU Toggle Tools gom hết những việc đó vào một cửa sổ nhỏ. App là một file `.exe` duy nhất, không cần cài đặt, chạy trên Windows 10 (2004 trở lên) và Windows 11.

## App giúp gì cho người dùng eGPU

| Vấn đề hay gặp | App xử lý thế nào |
|---|---|
| Game chạy trên iGPU thay vì eGPU | Chọn GPU cho từng game, rồi bấm **Launch to test** để xem game thật sự chạy trên card nào |
| Muốn tắt iGPU hoặc eGPU nhanh | Bật/tắt GPU bằng một cú bấm hoặc double-click |
| Tắt nhầm card, màn hình đen | Sau 15 giây không bấm **Keep**, GPU tự bật lại |
| Không biết đường truyền eGPU có bị nghẽn | Đo băng thông PCIe thật và vẽ đồ thị lưu lượng khi chơi game |
| FPS thấp mà không rõ lý do | OSD trong game cho biết FPS đang bị giới hạn bởi GPU, CPU, PCIe hay VRAM |

## Bật/tắt GPU

- App tự quét các card đồ họa, hiện hãng, trạng thái và tải của từng card. Danh sách tự làm mới khi bạn cắm hoặc rút eGPU.
- Chọn card rồi bấm **Enable** / **Disable**. App gọi `pnputil` có sẵn của Windows, không cài driver gì thêm.
- Có bảng màn hình: màn hình nào đang được card nào xuất hình, độ phân giải và tần số quét.
- Card NVIDIA hiện thêm nhiệt độ, công suất và tốc độ quạt.

Hai chốt an toàn giúp bạn không bị kẹt:

1. Tắt GPU cuối cùng còn chạy thì app hỏi lại, nút mặc định là **No**.
2. Sau khi tắt, app đếm ngược 15 giây. Không bấm **Keep** thì card tự bật lại.

## Chọn GPU cho từng game

Trang **Apps / Games** cho biết Windows đang coi card nào là *Power saving* (thường là iGPU) và card nào là *High performance* (thường là eGPU). Thêm game bằng cách chọn file `.exe`, chọn trong danh sách app đang mở, hoặc kéo thả vào cửa sổ.

Cài đặt được ghi vào đúng chỗ của *Settings → System → Display → Graphics*, nên Windows cũng thấy. Cột **Running on** cập nhật mỗi 2 giây, cho biết game đang chạy trên card nào và tải bao nhiêu phần trăm.

> Game mở qua Steam hay Epic thì hãy thêm file `.exe` của chính game, không phải của launcher.

## Đo băng thông PCIe

Với eGPU, đường truyền thường là thứ giới hạn đầu tiên. App chép khối dữ liệu 64 MB giữa RAM và VRAM theo cả hai chiều, bấm giờ bằng timestamp của GPU, nên chạy được với card NVIDIA, AMD lẫn Intel.

Kết quả hiện link PCIe đang chạy (ví dụ `Gen4 x4`), băng thông lý thuyết và tốc độ đo thực tế. App tự nhận ra eGPU cắm qua USB4 / Thunderbolt. Ví dụ một eGPU Gen4 x4 qua USB4 đo được khoảng 3,8 GB/s trên 7,9 GB/s lý thuyết.

Với card NVIDIA, trang **PCIe monitor** ghi lưu lượng 4 lần mỗi giây khi bạn chơi game. Đồ thị tô đỏ những lúc bị nghẽn, kèm nhật ký từng lần nghẽn và nút xuất file CSV.

## OSD trong game

Nhấn **Ctrl+Shift+O** trong game để bật bảng thông số ở góc màn hình: FPS và 1 % low, tải và nhiệt độ GPU, VRAM, CPU, RAM, lưu lượng PCIe. Bảng này click xuyên qua được và không bao giờ cướp focus của game.

Dòng **LIM** cho biết thứ đang giới hạn FPS:

| Kết luận | Nghĩa là | Nên làm gì |
|---|---|---|
| GPU-bound | GPU chạy ≥ 95 % | Bình thường. Giảm thiết lập hoặc bật DLSS / FSR nếu muốn thêm FPS |
| CPU-bound | Luồng CPU bận nhất ≥ 90 % | Tăng độ phân giải không mất FPS. Giảm tầm nhìn xa, mật độ NPC |
| PCIe link | Lưu lượng gần chạm giới hạn đo được | Hay gặp với eGPU. Giảm texture, cắm màn hình thẳng vào eGPU |
| VRAM full | VRAM ≥ 95 % | Texture tràn sang RAM rồi đi qua PCIe nên bị giật. Giảm chất lượng texture |

FPS được đọc từ sự kiện mà Windows tự ghi lại (ETW, cùng cách với PresentMon). App **không chèn gì vào game**, nên an toàn với anti-cheat.

> OSD là cửa sổ luôn nằm trên cùng. Game chạy *exclusive fullscreen* có thể che mất nó, khi đó hãy chuyển game sang *borderless*.

## Mẹo khi dùng eGPU

- **Cắm màn hình thẳng vào eGPU.** Nếu màn hình cắm vào laptop, hình phải chạy ngược từ eGPU về qua dây USB4, tốn thêm băng thông vốn đã hẹp.
- **Trước khi tắt iGPU**, bấm `Win + P` và chọn *Second screen only*. Kiểm tra ở *Settings → System → Display → Advanced display* rằng màn hình ngoài đang *Connected to* card eGPU.
- **Màn hình đen?** Thử `Win + Ctrl + Shift + B`, rút ra cắm lại dây màn hình, hoặc chờ 15 giây để app tự bật lại GPU.
- **Tắt eGPU trong app trước khi rút dây.**

## Tải và chạy

Hiện chưa có bản dựng sẵn. Bạn tự build trong vài giây, không cần Visual Studio hay .NET SDK:

1. Tải mã nguồn từ [GitHub](https://github.com/ncaohoc/GPUToggleTools) (nút **Code → Download ZIP**) và giải nén.
2. Chạy `build.bat`. Script dùng trình biên dịch C# có sẵn trong Windows và tạo ra `GpuToggle.exe`.
3. Mở `GpuToggle.exe`. App cần quyền Administrator để bật/tắt thiết bị và sẽ tự xin quyền khi mở.

Yêu cầu: Windows 10 bản 2004 trở lên hoặc Windows 11, .NET Framework 4.x (có sẵn trong Windows). Các thông số riêng của NVIDIA cần driver NVIDIA.

## Góp ý

App vẫn đang được làm thêm. Nếu bạn dùng eGPU và gặp lỗi, hoặc muốn thêm tính năng, hãy mở [issue trên GitHub](https://github.com/ncaohoc/GPUToggleTools/issues). Kết quả đo từ nhiều loại eGPU khác nhau (Thunderbolt 3, USB4, OCuLink, card AMD) cũng giúp mình rất nhiều.
