---
title: "Mạng máy tính: IP, subnet và cấu hình"
description: "OSI, IPv4, cách tính subnet, VLSM, IPv6, cấu hình trên Windows, Linux, Cisco và quy trình xử lý sự cố mạng."
date: 2026-10-07
tags: [Networking, IP, Linux]
---

## 1. Nền tảng: OSI, TCP/IP, thiết bị, port

Mọi sự cố mạng nên dò từ tầng thấp lên: cáp/đèn link → IP → gateway → DNS → ứng dụng.

| Tầng OSI | TCP/IP | Đơn vị dữ liệu | Địa chỉ / giao thức | Thiết bị |
| --- | --- | --- | --- | --- |
| 7 Application | Application | Data | HTTP, DNS, DHCP, SSH, FTP | — |
| 6 Presentation | Application | Data | TLS, mã hóa, nén | — |
| 5 Session | Application | Data | phiên kết nối | — |
| 4 Transport | Transport | Segment | TCP, UDP, port | Firewall |
| 3 Network | Internet | Packet | IP, ICMP, OSPF | Router, switch L3 |
| 2 Data Link | Link | Frame | MAC, ARP, VLAN 802.1Q | Switch, AP |
| 1 Physical | Link | Bit | cáp, sóng, đầu RJ45 | Hub, repeater |

Mẹo nhớ OSI (7→1): **A**ll **P**eople **S**eem **T**o **N**eed **D**ata **P**rocessing.

**TCP vs UDP:** TCP có bắt tay 3 bước (SYN → SYN-ACK → ACK), tin cậy, đúng thứ tự (web, SSH, email). UDP không kết nối, nhanh, có thể mất gói (DNS, VoIP, game, video stream).

**Port phổ biến**

| Port | Giao thức | Dùng cho |
| --- | --- | --- |
| 20/21 TCP | FTP | truyền file |
| 22 TCP | SSH / SFTP | quản trị từ xa an toàn |
| 23 TCP | Telnet | quản trị từ xa (không mã hóa) |
| 25, 587 TCP | SMTP | gửi mail |
| 53 UDP/TCP | DNS | phân giải tên miền |
| 67/68 UDP | DHCP | cấp IP tự động (server/client) |
| 80 / 443 TCP | HTTP / HTTPS | web |
| 110 / 143 TCP | POP3 / IMAP | nhận mail |
| 123 UDP | NTP | đồng bộ giờ |
| 161/162 UDP | SNMP | giám sát thiết bị |
| 3389 TCP | RDP | Remote Desktop Windows |

Dải port: 0–1023 well-known, 1024–49151 registered, 49152–65535 dynamic (client dùng tạm).

## 2. Địa chỉ IPv4

IPv4 dài 32 bit, chia 4 octet × 8 bit, viết thập phân: `192.168.1.10` = `11000000.10101000.00000001.00001010`. Mỗi octet nằm trong 0–255. Địa chỉ gồm 2 phần: **Network ID** (phần mạng) + **Host ID** (phần máy), ranh giới do subnet mask quyết định.

**Bảng trọng số bit (thuộc lòng)**

| Bit | 7 | 6 | 5 | 4 | 3 | 2 | 1 | 0 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Giá trị | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |

- Thập phân → nhị phân: trừ dần từ 128 xuống. Ví dụ 172 = 128 + 32 + 8 + 4 → `10101100`.
- Nhị phân → thập phân: cộng giá trị các bit 1. Ví dụ `11110000` = 128+64+32+16 = 240.

**Phân lớp (classful — cũ nhưng vẫn hay thi)**

| Lớp | Bit đầu | Dải octet 1 | Mask mặc định | Số host/mạng |
| --- | --- | --- | --- | --- |
| A | 0 | 1–126 | 255.0.0.0 (/8) | 16.777.214 |
| B | 10 | 128–191 | 255.255.0.0 (/16) | 65.534 |
| C | 110 | 192–223 | 255.255.255.0 (/24) | 254 |
| D | 1110 | 224–239 | — | multicast |
| E | 1111 | 240–255 | — | dự phòng, thử nghiệm |

**IP private (RFC 1918) — dùng trong LAN, không định tuyến ra Internet**

- `10.0.0.0/8` (10.0.0.0 – 10.255.255.255)
- `172.16.0.0/12` (172.16.0.0 – 172.31.255.255)
- `192.168.0.0/16` (192.168.0.0 – 192.168.255.255)

**IP đặc biệt**

| Địa chỉ | Ý nghĩa |
| --- | --- |
| 0.0.0.0 | mọi địa chỉ / chưa có IP / default route (0.0.0.0/0) |
| 127.0.0.0/8 | loopback, 127.0.0.1 = chính máy mình |
| 169.254.0.0/16 | APIPA: máy tự gán khi không xin được DHCP → dấu hiệu lỗi DHCP |
| 100.64.0.0/10 | CGNAT của nhà mạng |
| 255.255.255.255 | broadcast toàn mạng cục bộ |
| 224.0.0.0/4 | multicast |

**Unicast / Broadcast / Multicast:** gửi 1 máy / gửi tất cả máy trong mạng / gửi một nhóm máy đăng ký.

## 3. Subnet mask & CIDR — bảng tra nhanh

Subnet mask là dãy bit 1 liên tục (phần mạng) rồi bit 0 (phần host). CIDR `/n` = số bit 1. Ví dụ `/26` = 26 bit 1 = `255.255.255.192`.

**4 công thức cốt lõi** (n = prefix, h = 32 − n = số bit host, s = số bit mượn):

```latex
\text{Host hợp lệ} = 2^{h} - 2 \qquad \text{Số subnet} = 2^{s} \qquad \text{Block size} = 256 - \text{octet mask "đang dở"} \qquad \text{Tổng IP} = 2^{h}
```

Trừ 2 vì địa chỉ đầu là **Network**, địa chỉ cuối là **Broadcast**. Ngoại lệ: /31 dùng cho link point-to-point (2 IP, cả 2 dùng được), /32 là 1 host duy nhất.

**Giá trị octet của mask (học thuộc dòng này là đủ)**

| Số bit 1 trong octet | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Giá trị octet | 0 | 128 | 192 | 224 | 240 | 248 | 252 | 254 | 255 |
| Block size | 256 | 128 | 64 | 32 | 16 | 8 | 4 | 2 | 1 |

**Bảng CIDR thường dùng**

| CIDR | Subnet mask | Wildcard | Tổng IP | Host dùng được | Block (octet) | Dùng điển hình |
| --- | --- | --- | --- | --- | --- | --- |
| /8 | 255.0.0.0 | 0.255.255.255 | 16.777.216 | 16.777.214 | 1 (oct 1) | mạng lớp A |
| /12 | 255.240.0.0 | 0.15.255.255 | 1.048.576 | 1.048.574 | 16 (oct 2) | 172.16/12 |
| /16 | 255.255.0.0 | 0.0.255.255 | 65.536 | 65.534 | 1 (oct 2) | campus, VPC |
| /20 | 255.255.240.0 | 0.0.15.255 | 4.096 | 4.094 | 16 (oct 3) | subnet cloud lớn |
| /21 | 255.255.248.0 | 0.0.7.255 | 2.048 | 2.046 | 8 (oct 3) |  |
| /22 | 255.255.252.0 | 0.0.3.255 | 1.024 | 1.022 | 4 (oct 3) | Wi-Fi lớn |
| /23 | 255.255.254.0 | 0.0.1.255 | 512 | 510 | 2 (oct 3) |  |
| /24 | 255.255.255.0 | 0.0.0.255 | 256 | 254 | 1 (oct 3) | LAN gia đình/văn phòng |
| /25 | 255.255.255.128 | 0.0.0.127 | 128 | 126 | 128 (oct 4) |  |
| /26 | 255.255.255.192 | 0.0.0.63 | 64 | 62 | 64 | phòng ban |
| /27 | 255.255.255.224 | 0.0.0.31 | 32 | 30 | 32 |  |
| /28 | 255.255.255.240 | 0.0.0.15 | 16 | 14 | 16 | DMZ, server nhỏ |
| /29 | 255.255.255.248 | 0.0.0.7 | 8 | 6 | 8 | IP tĩnh nhà mạng cấp |
| /30 | 255.255.255.252 | 0.0.0.3 | 4 | 2 | 4 | link router–router |
| /31 | 255.255.255.254 | 0.0.0.1 | 2 | 2 (P2P) | 2 | link P2P (RFC 3021) |
| /32 | 255.255.255.255 | 0.0.0.0 | 1 | 1 | 1 | loopback, host route |

Mẹo: mỗi lần prefix tăng 1, số IP giảm một nửa.

## 4. Cách tính subnet từng bước

Dùng phương pháp **block size** (bội số) — nhanh, tính nhẩm được, không cần đổi nhị phân.

1. Xác định **octet đang dở** (octet mask không phải 255 cũng không phải 0): /1–8 → octet 1, /9–16 → octet 2, /17–24 → octet 3, /25–32 → octet 4.
2. **Block size** = 256 − giá trị mask ở octet đó.
3. Liệt kê các bội số của block size: 0, B, 2B, 3B… Tìm bội số lớn nhất ≤ giá trị IP ở octet đó → đó là **Network**.
4. **Broadcast** = (Network kế tiếp) − 1. Các octet sau octet đang dở: network = 0, broadcast = 255.
5. **Host đầu** = Network + 1, **Host cuối** = Broadcast − 1. Số host = 2^h − 2.

**Ví dụ 1 — 192.168.10.75/26**

- /26 → mask 255.255.255.192 → octet 4, block = 256 − 192 = **64**
- Bội số: 0, 64, 128, 192 → 75 nằm trong khoảng 64–127

| Network | Host đầu | Host cuối | Broadcast | Số host |
| --- | --- | --- | --- | --- |
| 192.168.10.64 | 192.168.10.65 | 192.168.10.126 | 192.168.10.127 | 62 |

Kiểm tra bằng phép AND nhị phân: 75 = `01001011`, 192 = `11000000` → AND = `01000000` = 64 ✔. (Network = IP AND Mask.)

**Ví dụ 2 — 172.16.45.200/20** (octet dở là octet 3)

- /20 → 255.255.240.0 → block = 256 − 240 = **16** ở octet 3
- Bội số: …, 32, 48 → 45 nằm trong 32–47

| Network | Host đầu | Host cuối | Broadcast | Số host |
| --- | --- | --- | --- | --- |
| 172.16.32.0 | 172.16.32.1 | 172.16.47.254 | 172.16.47.255 | 4.094 |

**Ví dụ 3 — chia 192.168.1.0/24 thành 6 subnet bằng nhau**

- Cần 2^s ≥ 6 → mượn s = 3 bit → /27 (8 subnet, mỗi subnet 2^5 − 2 = 30 host), block = 32

| # | Network | Dải host | Broadcast |
| --- | --- | --- | --- |
| 1 | 192.168.1.0/27 | .1 – .30 | .31 |
| 2 | 192.168.1.32/27 | .33 – .62 | .63 |
| 3 | 192.168.1.64/27 | .65 – .94 | .95 |
| 4 | 192.168.1.96/27 | .97 – .126 | .127 |
| 5 | 192.168.1.128/27 | .129 – .158 | .159 |
| 6 | 192.168.1.160/27 | .161 – .190 | .191 |
| 7 | 192.168.1.192/27 | .193 – .222 | .223 |
| 8 | 192.168.1.224/27 | .225 – .254 | .255 |

**Ví dụ 4 — cần mạng cho 500 host**: tìm h nhỏ nhất với 2^h − 2 ≥ 500 → h = 9 (510 host) → prefix = 32 − 9 = **/23** (255.255.254.0).

**Ví dụ 5 — 2 máy có cùng subnet không?** 10.1.1.100/25 và 10.1.1.130/25: block 128 → máy 1 thuộc 0–127, máy 2 thuộc 128–255 → **khác subnet**, phải qua router mới nói chuyện được.

**Bảng lũy thừa 2 (để tính host nhanh)**

| 2^1 | 2^2 | 2^3 | 2^4 | 2^5 | 2^6 | 2^7 | 2^8 | 2^9 | 2^10 | 2^11 | 2^12 | 2^16 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2 | 4 | 8 | 16 | 32 | 64 | 128 | 256 | 512 | 1.024 | 2.048 | 4.096 | 65.536 |

## 5. Nâng cao: VLSM, supernetting, wildcard mask

### VLSM — chia subnet kích thước khác nhau, không lãng phí IP

Quy tắc: **sắp xếp nhu cầu từ lớn đến nhỏ**, cấp subnet lớn nhất trước, mỗi subnet bắt đầu ngay sau broadcast của subnet trước.

**Bài toán:** mạng 192.168.10.0/24 cho Sales 100 host, IT 50 host, HR 25 host và 2 đường WAN nối router (2 host mỗi đường).

| Nhu cầu | Host cần | Prefix chọn (host tối đa) | Network | Dải host | Broadcast |
| --- | --- | --- | --- | --- | --- |
| Sales | 100 | /25 (126) | 192.168.10.0 | .1 – .126 | .127 |
| IT | 50 | /26 (62) | 192.168.10.128 | .129 – .190 | .191 |
| HR | 25 | /27 (30) | 192.168.10.192 | .193 – .222 | .223 |
| WAN 1 | 2 | /30 (2) | 192.168.10.224 | .225 – .226 | .227 |
| WAN 2 | 2 | /30 (2) | 192.168.10.228 | .229 – .230 | .231 |
| Còn trống | — | — | 192.168.10.232 | đến .255 | để mở rộng |

Nên dự phòng 20–30% host cho tăng trưởng; nhớ cộng thêm 1 IP cho gateway trong mỗi subnet LAN.

### Supernetting / Route summarization — gộp nhiều mạng thành 1 route

1. Viết octet thay đổi của các mạng ra nhị phân.
2. Đếm số bit đầu giống nhau → cộng với số bit của các octet phía trước → prefix mới.

Ví dụ gộp 192.168.0.0/24, 192.168.1.0/24, 192.168.2.0/24, 192.168.3.0/24:

- Octet 3: 0 = `000000|00`, 1 = `000000|01`, 2 = `000000|10`, 3 = `000000|11` → 6 bit chung
- Prefix = 16 + 6 = **/22** → route tổng: **192.168.0.0/22**

Điều kiện gộp gọn: số mạng là lũy thừa của 2 và mạng đầu là bội số của block mới (ở đây 0 chia hết cho 4). Gộp 192.168.1.0–192.168.4.0 sẽ **không** gọn thành 1 route.

### Wildcard mask — dùng trong ACL và OSPF của Cisco

Wildcard = 255.255.255.255 − subnet mask. Bit 0 = phải khớp, bit 1 = bỏ qua.

| Ý định | Wildcard | Ví dụ lệnh Cisco |
| --- | --- | --- |
| Đúng 1 host | 0.0.0.0 (từ khóa `host`) | `access-list 10 permit host 192.168.1.10` |
| Cả mạng /24 | 0.0.0.255 | `access-list 10 permit 192.168.1.0 0.0.0.255` |
| Mạng /26 | 0.0.0.63 | `network 10.0.0.64 0.0.0.63 area 0` |
| Mọi địa chỉ | 255.255.255.255 (từ khóa `any`) | `access-list 10 deny any` |

Lưu ý ACL: duyệt từ trên xuống, khớp dòng đầu tiên là dừng, cuối luôn có `deny any` ngầm định. Standard ACL (1–99) đặt gần đích; extended ACL (100–199) đặt gần nguồn.

## 6. IPv6 cơ bản

IPv6 dài 128 bit, viết 8 nhóm × 4 chữ số hex, cách nhau bằng dấu `:`. Không có broadcast, không cần NAT; LAN chuẩn luôn là **/64**.

**Quy tắc rút gọn**

1. Bỏ số 0 đứng đầu mỗi nhóm: `0db8` → `db8`, `0000` → `0`.
2. Thay **một** chuỗi nhóm 0 liên tiếp dài nhất bằng `::` (chỉ được dùng 1 lần).

Ví dụ: `2001:0db8:0000:0000:0000:ff00:0042:8329` → `2001:db8::ff00:42:8329`

**Cấu trúc địa chỉ unicast toàn cầu /64**

| Phần | Số bit | Ai cấp |
| --- | --- | --- |
| Global routing prefix | 48 (thường) | nhà mạng / RIR |
| Subnet ID | 16 | quản trị viên (65.536 subnet) |
| Interface ID | 64 | máy tự tạo (SLAAC/EUI-64) hoặc DHCPv6 |

**Loại địa chỉ cần nhớ**

| Tiền tố | Loại | Tương đương IPv4 |
| --- | --- | --- |
| `::1/128` | loopback | 127.0.0.1 |
| `::/128` | chưa xác định | 0.0.0.0 |
| `::/0` | default route | 0.0.0.0/0 |
| `2000::/3` | global unicast (public) | IP public |
| `fc00::/7` (thực tế `fd00::/8`) | unique local (ULA) | IP private |
| `fe80::/10` | link-local, mọi interface đều tự có | 169.254.x.x (nhưng luôn dùng) |
| `ff00::/8` | multicast (`ff02::1` = mọi node, `ff02::2` = mọi router) | broadcast/multicast |

**Cấp phát:** SLAAC (máy tự tạo IP từ prefix router quảng bá qua Router Advertisement), DHCPv6 stateful, hoặc SLAAC + DHCPv6 stateless (DNS). NDP thay thế ARP.

**Chia subnet IPv6:** chia theo ranh giới nibble (4 bit) cho dễ đọc. Được cấp /48 → có 2^16 = 65.536 mạng /64: `2001:db8:abcd:0000::/64`, `2001:db8:abcd:0001::/64`… Được cấp /56 → 256 mạng /64.

## 7. Cấu hình IP và dịch vụ mạng

Một máy cần đủ 4 thông số để lên Internet: **IP**, **Subnet mask**, **Default gateway** (IP router cùng subnet), **DNS**.

**Quy ước quy hoạch IP cho LAN /24** (gợi ý): `.1` gateway · `.2–.49` server, máy in, AP (IP tĩnh) · `.50–.200` DHCP pool · `.201–.254` dự phòng.

### Windows

```powershell
# Đặt IP tĩnh (CMD chạy quyền Admin)
netsh interface ip set address name="Ethernet" static 192.168.1.50 255.255.255.0 192.168.1.1
netsh interface ip set dns name="Ethernet" static 8.8.8.8
# Trở lại DHCP
netsh interface ip set address name="Ethernet" dhcp
netsh interface ip set dns name="Ethernet" dhcp

# PowerShell tương đương
New-NetIPAddress -InterfaceAlias "Ethernet" -IPAddress 192.168.1.50 -PrefixLength 24 -DefaultGateway 192.168.1.1
Set-DnsClientServerAddress -InterfaceAlias "Ethernet" -ServerAddresses 8.8.8.8,1.1.1.1
```

Giao diện: `Win + R` → `ncpa.cpl` → chuột phải card mạng → Properties → IPv4.

### Linux

```bash
# Tạm thời (mất khi reboot)
sudo ip addr add 192.168.1.50/24 dev eth0
sudo ip route add default via 192.168.1.1

# NetworkManager (Ubuntu desktop, RHEL, Fedora)
nmcli con mod "eth0" ipv4.method manual ipv4.addresses 192.168.1.50/24 ipv4.gateway 192.168.1.1 ipv4.dns "8.8.8.8 1.1.1.1"
nmcli con up "eth0"
```

Ubuntu server dùng Netplan — file `/etc/netplan/01-netcfg.yaml`, rồi `sudo netplan apply`:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses: [192.168.1.50/24]
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses: [8.8.8.8, 1.1.1.1]
```

### Cisco IOS — router cơ bản

```
enable
configure terminal
hostname R1
interface g0/0
 ip address 192.168.1.1 255.255.255.0
 no shutdown
exit
ip route 0.0.0.0 0.0.0.0 203.0.113.1      ! default route ra ISP
ip route 10.20.0.0 255.255.0.0 10.0.0.2   ! static route tới mạng khác
end
copy running-config startup-config        ! lưu cấu hình
```

### DHCP

Quy trình **DORA**: Discover (client broadcast) → Offer (server mời IP) → Request (client xin) → Acknowledge (server xác nhận). Client và server khác subnet → cần **DHCP relay** trên router.

```
ip dhcp excluded-address 192.168.1.1 192.168.1.49
ip dhcp pool LAN
 network 192.168.1.0 255.255.255.0
 default-router 192.168.1.1
 dns-server 8.8.8.8 1.1.1.1
 lease 7
! Relay: trên interface phía client
interface g0/1
 ip helper-address 10.0.0.5
```

### NAT / PAT — cho cả LAN dùng chung 1 IP public

```
interface g0/0
 ip nat inside
interface g0/1
 ip nat outside
access-list 1 permit 192.168.1.0 0.0.0.255
ip nat inside source list 1 interface g0/1 overload
! Port forwarding: mở web server nội bộ ra ngoài
ip nat inside source static tcp 192.168.1.20 80 interface g0/1 80
```

Loại NAT: static (1 private ↔ 1 public), dynamic (pool public), PAT/overload (nhiều private → 1 public, phân biệt bằng port — loại modem gia đình dùng).

### VLAN và định tuyến giữa VLAN

```
! Switch: tạo VLAN, gán port access, cấu hình trunk
vlan 10
 name SALES
vlan 20
 name IT
interface f0/1
 switchport mode access
 switchport access vlan 10
interface g0/1
 switchport mode trunk
 switchport trunk allowed vlan 10,20

! Router-on-a-stick: mỗi VLAN là 1 subinterface
interface g0/0.10
 encapsulation dot1Q 10
 ip address 192.168.10.1 255.255.255.0
interface g0/0.20
 encapsulation dot1Q 20
 ip address 192.168.20.1 255.255.255.0

! Hoặc switch Layer 3 dùng SVI
ip routing
interface vlan 10
 ip address 192.168.10.1 255.255.255.0
```

Access port mang 1 VLAN (nối máy tính); trunk port mang nhiều VLAN có tag 802.1Q (nối switch–switch, switch–router). Mỗi VLAN = 1 subnet riêng.

### Định tuyến động — OSPF

```
router ospf 1
 router-id 1.1.1.1
 network 192.168.10.0 0.0.0.255 area 0
 network 10.0.0.0 0.0.0.3 area 0
 passive-interface g0/0.10   ! không gửi hello ra LAN người dùng
```

| Loại route | Administrative Distance (càng nhỏ càng ưu tiên) |
| --- | --- |
| Connected | 0 |
| Static | 1 |
| eBGP | 20 |
| EIGRP | 90 |
| OSPF | 110 |
| RIP | 120 |

Router chọn route theo **longest prefix match** trước (prefix dài nhất khớp), rồi mới xét AD, rồi metric.

## 8. Lệnh kiểm tra & xử lý sự cố

**Quy trình 6 bước khi "mất mạng"** — dừng ở bước đầu tiên thất bại:

1. Kiểm tra vật lý: đèn link, cáp, Wi-Fi đã kết nối.
2. Xem IP: `ipconfig /all` hoặc `ip a`. Thấy 169.254.x.x → lỗi DHCP.
3. `ping 127.0.0.1` → kiểm tra TCP/IP stack của máy.
4. `ping <gateway>` → kiểm tra kết nối LAN.
5. `ping 8.8.8.8` → kiểm tra đường ra Internet (NAT, route).
6. `ping google.com` hoặc `nslookup google.com` → kiểm tra DNS. Ping IP được mà tên miền không được = lỗi DNS.

**Bảng lệnh**

| Mục đích | Windows | Linux / macOS | Cisco IOS |
| --- | --- | --- | --- |
| Xem IP, mask, gateway | `ipconfig /all` | `ip a`, `ip r` | `show ip interface brief` |
| Xin lại IP DHCP | `ipconfig /release` → `/renew` | `sudo dhclient -r && sudo dhclient` | — |
| Kiểm tra kết nối | `ping -t 8.8.8.8` | `ping 8.8.8.8` | `ping 8.8.8.8` |
| Dò đường đi | `tracert 8.8.8.8` | `traceroute 8.8.8.8`, `mtr` | `traceroute 8.8.8.8` |
| Tra DNS | `nslookup tenmien.com` | `dig tenmien.com` | — |
| Xóa cache DNS | `ipconfig /flushdns` | `resolvectl flush-caches` | — |
| Bảng ARP (IP ↔ MAC) | `arp -a` | `ip neigh` | `show arp` |
| Bảng định tuyến | `route print` | `ip route` | `show ip route` |
| Port đang mở / kết nối | `netstat -ano` | `ss -tulpn` | — |
| Thử port TCP | `Test-NetConnection host -Port 443` | `nc -zv host 443` | `telnet host 443` |
| Xem cấu hình | — | — | `show running-config` |
| VLAN / trunk | — | — | `show vlan brief`, `show interfaces trunk` |
| Bảng MAC switch | — | — | `show mac address-table` |
| DHCP / NAT | — | — | `show ip dhcp binding`, `show ip nat translations` |
| Hàng xóm OSPF | — | — | `show ip ospf neighbor` |

**Triệu chứng → nguyên nhân thường gặp**

| Triệu chứng | Nguyên nhân hay gặp |
| --- | --- |
| IP 169.254.x.x | DHCP server chết, hết IP trong pool, cáp/VLAN sai |
| Ping gateway OK, ping 8.8.8.8 fail | thiếu default route, NAT sai, ISP lỗi |
| Ping 8.8.8.8 OK, vào web không được | DNS sai hoặc chặn |
| Báo "IP address conflict" | 2 máy trùng IP — IP tĩnh nằm trong DHCP pool |
| Ping được 1 chiều | firewall chặn ICMP, sai gateway hoặc sai mask ở 1 phía |
| Cùng switch mà không ping được nhau | khác VLAN, khác subnet, sai mask |
| Mạng chậm, chập chờn | cáp lỗi, duplex mismatch, loop (bão broadcast), nhiễu Wi-Fi |
| Interface Cisco `administratively down` | quên `no shutdown` |

Nguyên tắc vàng: sai **subnet mask** hoặc **gateway** là 2 lỗi cấu hình phổ biến nhất — luôn kiểm tra 2 thông số này đầu tiên.
