---
title: Game of Life
description: Trò chơi cuộc sống của Conway. Vẽ vài tế bào, bấm chạy rồi ngồi xem chúng sinh sôi, di chuyển và tàn lụi theo bốn luật đơn giản.
date: 2026-11-28
play: /games/game-of-life/index.html
aspect: 16 / 10
controls: Chuột hoặc chạm, có phím tắt
stack: [HTML, Canvas, JavaScript]
tags: [Mô phỏng, Game]
---

Game of Life là "trò chơi không người chơi" do nhà toán học John Conway nghĩ ra năm 1970. Bạn chỉ đặt trạng thái ban đầu, phần còn lại do luật tự quyết. Chỉ với bốn luật, lưới ô vuông sinh ra đủ thứ: khối đứng yên, khối nhấp nháy, tàu lượn bay chéo, cả súng bắn ra tàu lượn mãi không dừng.

## Nguồn gốc

Những năm 1940, John von Neumann cùng Stanisław Ulam nghĩ về một câu hỏi: máy móc có tự sao chép được không? Họ mô hình hoá bằng **ô tự động** (cellular automaton): một lưới ô, mỗi ô mang một trạng thái, và tất cả cùng đổi trạng thái theo một luật dựa trên các ô xung quanh. Von Neumann dựng được một cỗ máy tự sao chép, nhưng mỗi ô của nó có tới 29 trạng thái, luật rất rối.

Conway, khi đó dạy ở Đại học Cambridge, muốn tìm luật đơn giản nhất mà vẫn cho ra hành vi phức tạp. Ông thử tay hàng trăm bộ luật trên bàn cờ vây, cùng sinh viên đặt và nhấc từng viên đá. Bộ luật cuối cùng chỉ có hai trạng thái (sống, chết) và phải cân bằng: không quá dễ để mọi thứ bùng nổ, không quá khó để mọi thứ chết sạch.

Tháng 10 năm 1970, Martin Gardner giới thiệu trò chơi trong chuyên mục "Mathematical Games" của tạp chí *Scientific American*. Conway đặt giải 50 đô cho ai chứng minh được có hay không một mẫu lớn mãi không giới hạn. Chỉ vài tuần sau, nhóm của Bill Gosper ở MIT tìm ra **súng tàu lượn**, cứ 30 thế hệ lại bắn ra một tàu lượn, nên số ô sống tăng mãi. Họ nhận giải. Lúc đó máy tính bắt đầu có ở các trường đại học, và Game of Life thành một trong những chương trình được chạy nhiều nhất thời ấy.

Conway sau này hơi khó chịu vì người ta chỉ nhớ ông qua trò chơi này, dù ông còn nhiều công trình lớn về lý thuyết nhóm và số siêu thực. Ông mất năm 2020 vì COVID-19.

## Lý thuyết

Về mặt toán, Game of Life là một ô tự động hai chiều với:

- **Hai trạng thái** cho mỗi ô: sống hoặc chết.
- **Lân cận Moore**: 8 ô bao quanh, gồm cả 4 ô chéo.
- **Cập nhật đồng loạt**: mọi ô tính trạng thái mới cùng lúc từ thế hệ cũ, không ô nào "đi trước".
- Luật viết gọn là **B3/S23**: sinh ra (Born) khi có 3 hàng xóm, sống sót (Survive) khi có 2 hoặc 3. Đổi con số là ra trò khác, ví dụ B36/S23 là HighLife, có mẫu tự sao chép.

Người chơi Life chia mẫu thành mấy họ:

- **Tĩnh vật** (still life): không bao giờ đổi, như khối vuông 2×2, tổ ong.
- **Dao động** (oscillator): lặp lại sau một chu kỳ, như blinker (chu kỳ 2), pulsar (3), pentadecathlon (15).
- **Tàu** (spaceship): lặp lại hình dạng nhưng đã dời chỗ. Không gì đi nhanh hơn một ô mỗi thế hệ, nên tốc độ này được gọi là "tốc độ ánh sáng" *c*. Tàu lượn đi chéo với tốc độ c/4, phi thuyền LWSS đi ngang với c/2.
- **Methuselah**: mẫu nhỏ mà sống rất lâu mới ổn định. R-pentomino 5 ô cần 1103 thế hệ, hạt sồi 7 ô cần 5206 thế hệ.
- **Vườn Địa Đàng** (Garden of Eden): mẫu không thể sinh ra từ bất kỳ trạng thái nào trước nó, chỉ có thể đặt tay từ đầu.

Kết quả bất ngờ nhất: Game of Life **Turing-complete**. Dòng tàu lượn đóng vai tín hiệu, va chạm giữa chúng tạo thành cổng logic AND, OR, NOT, ghép lại được bộ nhớ và cả một máy tính hoàn chỉnh. Conway phác chứng minh trong cuốn *Winning Ways* (1982), năm 2000 Paul Rendell dựng thật một máy Turing chạy trong Life. Hệ quả là không có thuật toán chung nào đoán trước được một mẫu bất kỳ rồi sẽ chết, dừng hay lớn mãi: muốn biết thì chỉ còn cách chạy thử.

Đây là ví dụ kinh điển của **tính trồi** (emergence): luật cục bộ rất đơn giản, không có ô nào "biết" bức tranh toàn cục, nhưng ở tầm lớn lại xuất hiện vật thể, chuyển động và tính toán. Stephen Wolfram xếp Life vào lớp 4 trong cách phân loại ô tự động của ông, lớp nằm giữa trật tự và hỗn loạn, nơi cấu trúc phức tạp có thể tồn tại.

## Luật

Mỗi ô có 8 ô hàng xóm. Sau mỗi thế hệ:

- Ô sống có ít hơn 2 hàng xóm sống thì chết (cô đơn).
- Ô sống có 2 hoặc 3 hàng xóm sống thì sống tiếp.
- Ô sống có nhiều hơn 3 hàng xóm sống thì chết (chật chội).
- Ô chết có đúng 3 hàng xóm sống thì sống lại.

Lưới cuộn tròn: đi ra mép phải thì vào lại từ mép trái, trên dưới cũng vậy. Ô vừa chết để lại vệt mờ vài thế hệ để dễ nhìn hướng chuyển động.

## Điều khiển

| Thao tác | Tác dụng |
| --- | --- |
| Bấm, kéo trên lưới | Vẽ tế bào. Bắt đầu kéo từ ô đang sống thì thành tẩy |
| Space | Chạy / dừng |
| N | Đi một thế hệ |
| R | Rải ngẫu nhiên |
| C | Xoá hết |
| Esc | Dừng |

Thanh **Tốc độ** chỉnh số thế hệ mỗi giây, **Cỡ ô** phóng to thu nhỏ lưới.

## Mấy mẫu nên thử

- **Tàu lượn** và **phi thuyền**: tự di chuyển qua lưới.
- **Pulsar**, **Pentadecathlon**: nhấp nháy lặp lại theo chu kỳ 3 và 15.
- **Súng Gosper**: cứ 30 thế hệ bắn ra một tàu lượn.
- **R-pentomino**, **hạt sồi**: chỉ 5 đến 7 ô nhưng hỗn loạn cả nghìn thế hệ mới yên.
- **Diehard**: biến mất hoàn toàn sau đúng 130 thế hệ.
