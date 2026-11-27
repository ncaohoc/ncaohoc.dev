---
title: "Rust từ cơ bản đến nâng cao"
description: "Cargo, ownership, borrow, lifetime, trait, generic, xử lý lỗi, collection, iterator, smart pointer, concurrency, async và unsafe trong Rust."
date: 2026-11-28
tags: [Rust, Cargo, Systems]
---

## 1. Cài đặt & Cargo

Rust cài qua **rustup**, quản lý dự án và thư viện (crate) qua **Cargo**. Mọi thứ hằng ngày đều đi qua `cargo`.

```bash
# Cài đặt / cập nhật
rustup update                    # lên bản stable mới nhất
rustup component add clippy rustfmt rust-analyzer
rustup target add wasm32-unknown-unknown   # thêm target build

# Dự án
cargo new hello                  # tạo binary crate
cargo new mylib --lib            # tạo library crate
cargo build                      # build debug, ra target/debug/
cargo build --release            # build tối ưu, ra target/release/
cargo run -- arg1 arg2           # build + chạy, sau -- là tham số cho chương trình
cargo check                      # chỉ kiểm tra lỗi, nhanh hơn build nhiều
cargo test                       # chạy test
cargo test ten_test -- --nocapture   # chạy 1 test, in cả println!
cargo clippy -- -D warnings      # lint, coi cảnh báo là lỗi
cargo fmt                        # định dạng code
cargo doc --open                 # sinh tài liệu và mở trình duyệt

# Thư viện
cargo add serde --features derive
cargo add tokio -F full
cargo add --dev pretty_assertions   # chỉ dùng khi test
cargo remove serde
cargo update                     # cập nhật trong phạm vi Cargo.lock cho phép
cargo tree                       # cây phụ thuộc
```

**Cargo.toml tối thiểu:**

```toml
[package]
name = "hello"
version = "0.1.0"
edition = "2024"

[dependencies]
serde = { version = "1", features = ["derive"] }
anyhow = "1"

[profile.release]
lto = true          # tối ưu xuyên crate, file nhỏ và nhanh hơn
codegen-units = 1
strip = true        # bỏ symbol debug
```

| File / thư mục | Vai trò |
| --- | --- |
| `src/main.rs` | Điểm vào của binary |
| `src/lib.rs` | Gốc của library |
| `src/bin/*.rs` | Thêm binary khác, chạy bằng `cargo run --bin ten` |
| `tests/` | Integration test |
| `examples/` | Ví dụ, chạy bằng `cargo run --example ten` |
| `benches/` | Benchmark |
| `Cargo.lock` | Phiên bản chính xác đã khoá. Commit nó cho cả binary lẫn library |

## 2. Cú pháp cơ bản

```rust
fn main() {
    let x = 5;               // bất biến mặc định
    let mut y = 10;          // mut mới gán lại được
    y += x;

    let x = x * 2;           // shadowing: khai báo lại cùng tên, có thể đổi kiểu
    const MAX: u32 = 100_000; // hằng số, phải ghi kiểu
    static NAME: &str = "Rust"; // biến toàn cục, sống suốt chương trình

    println!("{x} {y} {MAX} {NAME}");
    println!("{:?} {:#?}", vec![1, 2], (1, "a")); // Debug, Debug đẹp
    println!("{:>8.2}|{:<5}|{:08b}", 3.14159, "ab", 5u8); // căn phải, trái, nhị phân
    eprintln!("ghi ra stderr");
}
```

**Kiểu dữ liệu:**

| Nhóm | Kiểu | Ghi chú |
| --- | --- | --- |
| Số nguyên | `i8..i128`, `u8..u128`, `isize`, `usize` | `usize` dùng cho chỉ số, độ dài |
| Số thực | `f32`, `f64` | Mặc định `f64` |
| Logic | `bool` | |
| Ký tự | `char` | 4 byte, 1 Unicode scalar |
| Tuple | `(i32, &str)` | Truy cập `t.0`, `t.1` |
| Mảng | `[i32; 3]` | Cố định độ dài, nằm trên stack |
| Slice | `&[i32]`, `&str` | Con trỏ + độ dài, mượn một đoạn |
| Unit | `()` | Như `void` |
| Never | `!` | Hàm không bao giờ trả về (`panic!`, `loop {}`) |

```rust
let a = 255u8;
let b = a as i32 + 1;               // ép kiểu bằng as
let c: u8 = 300i32.try_into().unwrap_or(u8::MAX); // ép kiểu an toàn
let d = a.wrapping_add(1);          // 0, tràn thì quay vòng
let e = a.checked_add(1);           // None khi tràn
let f = a.saturating_add(10);       // 255, kẹt ở biên
```

Debug build sẽ `panic` khi tràn số nguyên, release build thì quay vòng. Muốn hành vi rõ ràng thì dùng `wrapping_*`, `checked_*`, `saturating_*`.

## 3. Điều khiển luồng

Gần như mọi thứ trong Rust là **biểu thức** và trả về giá trị. Dòng cuối không có `;` là giá trị trả về.

```rust
let grade = if score >= 8 { "Giỏi" } else { "Khá" };

let n = loop {
    count += 1;
    if count == 10 { break count * 2; } // loop trả giá trị qua break
};

'outer: for i in 0..5 {          // nhãn để break vòng ngoài
    for j in 0..5 {
        if i * j > 6 { break 'outer; }
    }
}

for i in (0..10).rev().step_by(2) { }  // 9, 7, 5, 3, 1
for (i, v) in vec.iter().enumerate() { }
while let Some(top) = stack.pop() { }

fn add(a: i32, b: i32) -> i32 {
    a + b                        // không có ; nên là giá trị trả về
}
```

**match và pattern:**

```rust
match n {
    0 => println!("không"),
    1 | 2 => println!("một hoặc hai"),
    3..=9 => println!("một chữ số"),
    x if x < 0 => println!("âm"),
    _ => println!("lớn"),
}

let (a, b) = (1, 2);                  // destructure tuple
let Point { x, y: py } = p;           // destructure struct, đổi tên y
let [first, .., last] = arr;          // bỏ qua phần giữa
if let Some(v) = opt { }              // chỉ quan tâm 1 nhánh
let Some(v) = opt else { return; };   // let-else: không khớp thì phải thoát
if let Some(a) = x && a > 3 { }       // let chain (edition 2024)
match msg { Msg::Move { x, .. } => {}, _ => {} }
let n @ 1..=5 = val else { return };  // @ gắn tên cho giá trị khớp
```

`match` bắt buộc phủ hết mọi trường hợp. Thêm biến thể mới vào enum là compiler chỉ ra mọi chỗ cần sửa.

## 4. Ownership, borrow, move

Ba luật nền tảng:
1. Mỗi giá trị có đúng **một chủ** (owner).
2. Chủ ra khỏi scope thì giá trị bị **drop** (giải phóng).
3. Tại một thời điểm: **nhiều `&T`** hoặc **đúng một `&mut T`**, không bao giờ cả hai.

```rust
let s1 = String::from("hi");
let s2 = s1;                  // move: s1 không dùng được nữa
let s3 = s2.clone();          // copy sâu, tốn chi phí

let n1 = 5;
let n2 = n1;                  // Copy: kiểu nhỏ trên stack tự sao chép, n1 vẫn dùng được

fn len(s: &String) -> usize { s.len() }   // mượn đọc
fn push(s: &mut String) { s.push('!'); }  // mượn ghi
fn take(s: String) { }                    // nhận quyền sở hữu

let mut s = String::from("a");
let r1 = &s;
let r2 = &s;                  // nhiều &T: được
println!("{r1} {r2}");        // r1, r2 hết dùng từ đây (NLL)
let r3 = &mut s;              // nên &mut bây giờ hợp lệ
r3.push('b');
```

| Truyền vào hàm | Cú pháp | Khi nào dùng |
| --- | --- | --- |
| Mượn đọc | `&T` | Mặc định, chỉ cần đọc |
| Mượn ghi | `&mut T` | Cần sửa, không cần giữ |
| Lấy luôn | `T` | Cần lưu lại, biến đổi rồi trả ra |
| Tham số chuỗi | `&str` thay cho `&String` | Nhận được cả `String`, literal, slice |
| Tham số mảng | `&[T]` thay cho `&Vec<T>` | Nhận được cả `Vec`, mảng, slice |

Kiểu `Copy` (sao chép khi gán): số, `bool`, `char`, `&T`, tuple/mảng chứa toàn kiểu `Copy`. `String`, `Vec`, `Box` thì **move**.

## 5. Lifetime

Lifetime là cách compiler chứng minh tham chiếu không sống lâu hơn dữ liệu nó trỏ tới. Phần lớn được suy ra tự động, chỉ phải ghi khi trả về tham chiếu mà compiler không biết nó lấy từ tham số nào.

```rust
// kết quả sống tối đa bằng tham số ngắn hơn trong hai tham số
fn longest<'a>(a: &'a str, b: &'a str) -> &'a str {
    if a.len() > b.len() { a } else { b }
}

// struct giữ tham chiếu phải ghi lifetime
struct Parser<'a> {
    input: &'a str,
}

impl<'a> Parser<'a> {
    fn first_word(&self) -> &'a str {
        self.input.split_whitespace().next().unwrap_or("")
    }
}

let s: &'static str = "sống suốt chương trình";
```

**Luật tự suy ra (elision):**
- Mỗi tham số tham chiếu có lifetime riêng.
- Chỉ có 1 tham số tham chiếu thì đầu ra lấy lifetime của nó.
- Có `&self` / `&mut self` thì đầu ra lấy lifetime của `self`.

Gặp lỗi lifetime rối, cách thoát nhanh nhất thường là cho struct **sở hữu** dữ liệu (`String` thay `&str`) thay vì cố chú thích.

## 6. Struct, enum, impl

```rust
#[derive(Debug, Clone, PartialEq, Default)]
struct Player {
    name: String,
    hp: i32,
}

struct Meters(f64);           // tuple struct, hay dùng làm newtype
struct Marker;                // unit struct

impl Player {
    pub fn new(name: &str) -> Self {      // hàm liên kết, gọi Player::new
        Self { name: name.into(), hp: 100 }
    }
    fn hurt(&mut self, dmg: i32) { self.hp -= dmg; }
    fn is_dead(&self) -> bool { self.hp <= 0 }
    fn into_name(self) -> String { self.name } // lấy luôn self
}

let p2 = Player { hp: 50, ..p1.clone() }; // copy các trường còn lại

enum Shape {
    Circle(f64),
    Rect { w: f64, h: f64 },
    Empty,
}

impl Shape {
    fn area(&self) -> f64 {
        match self {
            Shape::Circle(r) => std::f64::consts::PI * r * r,
            Shape::Rect { w, h } => w * h,
            Shape::Empty => 0.0,
        }
    }
}
```

**Các derive hay dùng:** `Debug` (in `{:?}`), `Clone`, `Copy`, `PartialEq`/`Eq` (so sánh `==`), `PartialOrd`/`Ord` (sắp xếp), `Hash` (làm key `HashMap`), `Default`.

## 7. Option & Result

Rust không có `null` và không có exception. Thiếu giá trị là `Option<T>`, có thể lỗi là `Result<T, E>`.

```rust
enum Option<T> { Some(T), None }
enum Result<T, E> { Ok(T), Err(E) }
```

| Phương thức | Tác dụng |
| --- | --- |
| `unwrap()` / `expect("msg")` | Lấy giá trị, panic nếu `None`/`Err`. Chỉ dùng cho prototype, test |
| `unwrap_or(v)` / `unwrap_or_default()` | Giá trị dự phòng |
| `unwrap_or_else(\|\| ...)` | Dự phòng tính lười |
| `map(f)` | Biến đổi giá trị bên trong |
| `and_then(f)` | Nối tiếp thao tác cũng trả `Option`/`Result` |
| `ok_or(err)` | `Option` → `Result` |
| `ok()` | `Result` → `Option` |
| `map_err(f)` | Đổi kiểu lỗi |
| `as_ref()` / `as_deref()` | `&Option<String>` → `Option<&str>` |
| `take()` | Lấy giá trị ra, để lại `None` |
| `is_some_and(f)` | Có giá trị và thoả điều kiện |
| `?` | Lỗi thì trả lỗi về ngay, ok thì lấy giá trị |

```rust
use std::fs;
use std::num::ParseIntError;

fn read_number(path: &str) -> Result<i32, Box<dyn std::error::Error>> {
    let text = fs::read_to_string(path)?;   // lỗi IO thì trả về luôn
    let n = text.trim().parse::<i32>()?;    // lỗi parse cũng vậy
    Ok(n * 2)
}

fn first_char_upper(s: &str) -> Option<char> {
    let c = s.chars().next()?;              // ? cũng dùng được với Option
    Some(c.to_ascii_uppercase())
}
```

**Lỗi trong dự án thật:** ứng dụng dùng `anyhow`, thư viện dùng `thiserror`.

```rust
// thư viện: kiểu lỗi rõ ràng
#[derive(Debug, thiserror::Error)]
enum ConfigError {
    #[error("không đọc được file: {0}")]
    Io(#[from] std::io::Error),
    #[error("thiếu trường {0}")]
    Missing(&'static str),
}

// ứng dụng: gom mọi lỗi, thêm ngữ cảnh
use anyhow::{Context, Result, bail};

fn load() -> Result<String> {
    let s = std::fs::read_to_string("cfg.toml").context("đọc cfg.toml")?;
    if s.is_empty() { bail!("file cấu hình rỗng"); }
    Ok(s)
}

fn main() -> anyhow::Result<()> {
    load()?;
    Ok(())
}
```

## 8. Trait & generic

Trait giống interface: một tập hành vi kiểu nào cũng có thể cài đặt.

```rust
trait Describe {
    fn name(&self) -> String;
    fn describe(&self) -> String {          // phương thức mặc định
        format!("Đây là {}", self.name())
    }
}

impl Describe for Player {
    fn name(&self) -> String { self.name.clone() }
}

// 3 cách viết ràng buộc, nghĩa như nhau
fn show(x: &impl Describe) { }
fn show2<T: Describe>(x: &T) { }
fn show3<T>(x: &T) where T: Describe + Clone { }

// trả về một kiểu cụ thể nhưng giấu tên
fn evens() -> impl Iterator<Item = u32> { (0..).step_by(2) }

// generic struct
struct Stack<T> { items: Vec<T> }
impl<T: Clone> Stack<T> {
    fn peek(&self) -> Option<T> { self.items.last().cloned() }
}

// associated type & const
trait Shape { type Unit; const SIDES: u32; }
```

**Static dispatch vs dynamic dispatch:**

| | `impl Trait` / `<T: Trait>` | `dyn Trait` |
| --- | --- | --- |
| Cơ chế | Monomorphization, sinh code riêng cho từng kiểu | Gọi qua vtable |
| Tốc độ | Nhanh nhất, inline được | Thêm một bước gián tiếp |
| Kích thước binary | Lớn hơn | Nhỏ hơn |
| Trộn nhiều kiểu trong 1 `Vec` | Không | Được: `Vec<Box<dyn Trait>>` |

```rust
let shapes: Vec<Box<dyn Describe>> = vec![Box::new(p1), Box::new(p2)];
for s in &shapes { println!("{}", s.describe()); }
```

**Trait chuẩn nên biết:**

| Trait | Dùng để |
| --- | --- |
| `Display` | In bằng `{}` |
| `From` / `Into` | Chuyển kiểu; cài `From` là có `Into` miễn phí |
| `TryFrom` / `TryInto` | Chuyển kiểu có thể thất bại |
| `AsRef<str>` | Nhận mọi thứ xem được như `&str` |
| `Deref` | Cho smart pointer dùng như tham chiếu |
| `Drop` | Chạy code khi giá trị bị huỷ |
| `Iterator` | Cài `next()` là có hết các adapter |
| `Add`, `Mul`, `Index`... | Overload toán tử |
| `Send` / `Sync` | Gửi / chia sẻ an toàn giữa các thread |

```rust
use std::fmt;
impl fmt::Display for Player {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{} ({} HP)", self.name, self.hp)
    }
}

impl From<&str> for Player {
    fn from(s: &str) -> Self { Player::new(s) }
}
let p: Player = "Học".into();
```

Luật orphan: chỉ được `impl Trait for Type` khi trait **hoặc** type thuộc crate của bạn. Muốn cài trait ngoài cho kiểu ngoài thì bọc trong newtype.

## 9. Collection & chuỗi

```rust
// Vec
let mut v = vec![3, 1, 2];
v.push(4);
v.extend([5, 6]);
v.sort();                          // sort_unstable() nhanh hơn nếu không cần ổn định
v.sort_by_key(|x| std::cmp::Reverse(*x));
v.dedup();
v.retain(|&x| x % 2 == 0);
let last = v.pop();
let x = v[0];                      // panic nếu ngoài phạm vi
let y = v.get(10);                 // Option<&T>, an toàn
let slice = &v[1..3];
v.contains(&2);
v.iter().position(|&x| x == 2);

// HashMap
use std::collections::HashMap;
let mut m: HashMap<String, i32> = HashMap::new();
m.insert("a".into(), 1);
*m.entry("b".into()).or_insert(0) += 1;   // đếm tần suất
if let Some(v) = m.get("a") { }
for (k, v) in &m { }
m.remove("a");
```

| Collection | Khi nào dùng |
| --- | --- |
| `Vec<T>` | Mặc định cho danh sách |
| `VecDeque<T>` | Hàng đợi, thêm/bớt cả 2 đầu |
| `HashMap<K, V>` | Tra cứu theo key, không thứ tự |
| `BTreeMap<K, V>` | Key được sắp xếp, cần duyệt theo thứ tự |
| `HashSet<T>` / `BTreeSet<T>` | Tập không trùng |
| `BinaryHeap<T>` | Hàng đợi ưu tiên (max-heap; dùng `Reverse` cho min) |

**Chuỗi:** `String` sở hữu dữ liệu, trên heap, sửa được. `&str` là slice mượn. Cả hai luôn là UTF-8 hợp lệ.

```rust
let mut s = String::from("Xin");
s.push_str(" chào");
s += "!";
let t = format!("{s} {}", 2026);
let n = s.len();                   // số BYTE, không phải số ký tự
let chars = s.chars().count();     // số ký tự
let sub = &s[0..3];                // cắt theo byte, sai biên ký tự là panic
for c in s.chars() { }
s.split(' ').collect::<Vec<_>>();
s.trim().to_lowercase().replace("a", "b");
s.starts_with("Xin");
let num: i32 = "42".parse()?;
```

Tiếng Việt có dấu mỗi ký tự 2-3 byte, nên đừng cắt chuỗi bằng chỉ số byte tuỳ tiện. Dùng `chars()` hoặc `char_indices()`.

## 10. Iterator & closure

Iterator trong Rust là **lười**: không chạy gì cho tới khi gọi hàm kết thúc như `collect`, `sum`, `for`. Sau khi tối ưu, tốc độ ngang vòng `for` viết tay.

```rust
let v = vec![1, 2, 3, 4, 5];

let squares: Vec<i32> = v.iter().map(|x| x * x).collect();
let total: i32 = v.iter().filter(|&&x| x % 2 == 0).sum();
let names: Vec<String> = players.iter().map(|p| p.name.clone()).collect();
let max = v.iter().max_by_key(|x| x.abs());
let (even, odd): (Vec<_>, Vec<_>) = v.iter().partition(|&&x| x % 2 == 0);
let map: HashMap<_, _> = keys.into_iter().zip(values).collect();
let flat: Vec<_> = nested.into_iter().flatten().collect();
let found = v.iter().find(|&&x| x > 3);
let all_pos = v.iter().all(|&x| x > 0);
let s = v.iter().map(|x| x.to_string()).collect::<Vec<_>>().join(", ");
let parsed: Result<Vec<i32>, _> = strs.iter().map(|s| s.parse()).collect(); // gặp lỗi đầu tiên là dừng
v.windows(2).all(|w| w[0] <= w[1]);   // kiểm tra đã sắp xếp
v.chunks(2);                          // [1,2], [3,4], [5]
(1..=5).fold(0, |acc, x| acc + x);
v.iter().rev().skip(1).take(2);
```

| Gọi | Phần tử nhận được | Vec sau đó |
| --- | --- | --- |
| `v.iter()` | `&T` | Còn nguyên |
| `v.iter_mut()` | `&mut T` | Bị sửa |
| `v.into_iter()` | `T` | Bị move, không dùng lại được |

**Closure:**

```rust
let k = 3;
let mul = |x: i32| x * k;               // mượn k
let mut count = 0;
let mut inc = || count += 1;            // mượn ghi
let owned = move || println!("{k}");    // move: lấy luôn biến, hay dùng cho thread

fn apply<F: Fn(i32) -> i32>(f: F) -> i32 { f(10) }
fn make_adder(n: i32) -> impl Fn(i32) -> i32 { move |x| x + n }
let boxed: Box<dyn Fn(i32) -> i32> = Box::new(|x| x + 1);
```

| Trait | Closure làm gì với biến bắt được | Gọi được |
| --- | --- | --- |
| `Fn` | Chỉ đọc | Nhiều lần, song song |
| `FnMut` | Sửa | Nhiều lần, tuần tự |
| `FnOnce` | Move ra ngoài | Một lần |

## 11. Smart pointer & quản lý bộ nhớ

| Kiểu | Dùng khi | Thread-safe |
| --- | --- | --- |
| `Box<T>` | Đặt giá trị lên heap, kiểu đệ quy, trait object | Có (nếu `T` có) |
| `Rc<T>` | Nhiều chủ cùng đọc, 1 thread | Không |
| `Arc<T>` | Nhiều chủ cùng đọc, nhiều thread | Có |
| `RefCell<T>` | Sửa bên trong qua `&T`, kiểm tra borrow lúc chạy | Không |
| `Cell<T>` | Như `RefCell` cho kiểu `Copy`, không có tham chiếu | Không |
| `Mutex<T>` / `RwLock<T>` | Sửa chung giữa nhiều thread | Có |
| `Weak<T>` | Tham chiếu không giữ sống, chống vòng lặp `Rc` | Theo `Rc`/`Arc` |
| `Cow<'a, T>` | Mượn khi được, chỉ clone khi phải sửa | |

```rust
use std::rc::Rc;
use std::cell::RefCell;

// cây đệ quy cần Box vì kích thước phải biết lúc biên dịch
enum List { Cons(i32, Box<List>), Nil }

// nhiều chủ cùng sửa trong 1 thread
let shared = Rc::new(RefCell::new(vec![1]));
let a = Rc::clone(&shared);          // tăng bộ đếm, không copy dữ liệu
a.borrow_mut().push(2);              // vi phạm luật borrow lúc chạy thì panic
println!("{:?} refs={}", shared.borrow(), Rc::strong_count(&shared));
```

Công thức nhớ nhanh: 1 thread thì `Rc<RefCell<T>>`, nhiều thread thì `Arc<Mutex<T>>`.

## 12. Module & visibility

```rust
// src/lib.rs
pub mod game;                    // nạp src/game.rs hoặc src/game/mod.rs
mod utils;                       // riêng tư trong crate

pub use game::Player;            // re-export, người dùng viết mylib::Player

// src/game.rs
pub struct Player {
    pub name: String,            // trường cũng phải pub riêng
    hp: i32,                     // riêng tư
}
pub(crate) fn helper() {}        // chỉ thấy trong crate
pub(super) fn parent_only() {}   // chỉ module cha thấy

// đường dẫn
use crate::game::Player;         // từ gốc crate
use super::utils;                // module cha
use std::collections::{HashMap, HashSet};
use std::io::{self, Write};
```

Workspace gom nhiều crate dùng chung `Cargo.lock` và `target/`:

```toml
# Cargo.toml ở gốc
[workspace]
members = ["core", "cli", "server"]
resolver = "3"
```

## 13. Test & tài liệu

```rust
/// Cộng hai số. Comment `///` thành tài liệu, code bên trong là doc test.
///
/// ```
/// assert_eq!(mylib::add(2, 3), 5);
/// ```
pub fn add(a: i32, b: i32) -> i32 { a + b }

#[cfg(test)]                     // chỉ biên dịch khi chạy test
mod tests {
    use super::*;

    #[test]
    fn adds() {
        assert_eq!(add(2, 2), 4);
        assert!(add(1, 1) > 0, "phải dương");
    }

    #[test]
    #[should_panic(expected = "chia cho 0")]
    fn panics() { divide(1, 0); }

    #[test]
    fn with_result() -> Result<(), String> { Ok(()) }

    #[test]
    #[ignore]                    // chạy bằng cargo test -- --ignored
    fn slow() {}
}
```

Integration test đặt ở `tests/*.rs`, mỗi file là một crate riêng, chỉ gọi được API `pub`.

## 14. Concurrency

Compiler chặn data race ngay lúc biên dịch qua `Send` và `Sync`. Rust gọi đây là "fearless concurrency".

```rust
use std::sync::{Arc, Mutex, mpsc};
use std::thread;

// thread + join
let h = thread::spawn(move || 42);
let result = h.join().unwrap();

// scoped thread: mượn dữ liệu trên stack, không cần Arc
let mut data = vec![1, 2, 3];
thread::scope(|s| {
    s.spawn(|| println!("{:?}", data));
});
data.push(4);

// chia sẻ trạng thái
let counter = Arc::new(Mutex::new(0));
let handles: Vec<_> = (0..8).map(|_| {
    let c = Arc::clone(&counter);
    thread::spawn(move || { *c.lock().unwrap() += 1; })
}).collect();
for h in handles { h.join().unwrap(); }

// kênh truyền tin
let (tx, rx) = mpsc::channel();
for id in 0..3 {
    let tx = tx.clone();
    thread::spawn(move || tx.send(id).unwrap());
}
drop(tx);                        // đóng đầu gửi gốc để vòng for dưới kết thúc
for msg in rx { println!("{msg}"); }
```

| Công cụ | Dùng khi |
| --- | --- |
| `std::sync::atomic::AtomicUsize` | Bộ đếm, cờ đơn giản, không cần khoá |
| `OnceLock` / `LazyLock` | Khởi tạo toàn cục một lần |
| `rayon` | Song song hoá iterator: đổi `.iter()` thành `.par_iter()` |
| `crossbeam` | Kênh và cấu trúc dữ liệu lock-free mạnh hơn |
| `parking_lot` | `Mutex` nhanh hơn, không bị poison |

```rust
use std::sync::LazyLock;
static CONFIG: LazyLock<String> = LazyLock::new(|| std::env::var("APP").unwrap_or_default());
```

## 15. Async với Tokio

`async fn` trả về một `Future`, không chạy cho tới khi bị `.await`. Rust không kèm runtime, phổ biến nhất là **Tokio**.

```rust
// Cargo.toml: tokio = { version = "1", features = ["full"] }
use tokio::time::{sleep, Duration};

async fn fetch(id: u32) -> u32 {
    sleep(Duration::from_millis(100)).await;
    id * 10
}

#[tokio::main]
async fn main() {
    let a = fetch(1).await;                       // tuần tự

    let (b, c) = tokio::join!(fetch(2), fetch(3)); // chạy đồng thời, chờ cả hai

    let task = tokio::spawn(async { fetch(4).await }); // task chạy nền
    let d = task.await.unwrap();

    tokio::select! {                              // lấy cái xong trước
        v = fetch(5) => println!("xong {v}"),
        _ = sleep(Duration::from_secs(1)) => println!("hết giờ"),
    }

    let r = tokio::time::timeout(Duration::from_secs(2), fetch(6)).await;
}
```

**Lưu ý hay vấp:**
- Không gọi hàm chặn (đọc file đồng bộ, `thread::sleep`, tính toán nặng) trong async. Dùng `tokio::task::spawn_blocking`.
- Giữ `std::sync::Mutex` qua `.await` làm future không `Send`. Thả khoá trước khi `.await`, hoặc dùng `tokio::sync::Mutex`.
- `tokio::spawn` yêu cầu future là `'static`, nên thường phải `move` và clone `Arc` vào.

## 16. Macro

```rust
// macro khai báo
macro_rules! square {
    ($x:expr) => { $x * $x };
}

macro_rules! hashmap {
    ($($k:expr => $v:expr),* $(,)?) => {{
        let mut m = std::collections::HashMap::new();
        $( m.insert($k, $v); )*
        m
    }};
}

let m = hashmap! { "a" => 1, "b" => 2 };
```

Macro có sẵn hay dùng: `vec!`, `format!`, `println!`, `assert!`, `assert_eq!`, `dbg!` (in kèm file:dòng rồi trả lại giá trị), `todo!`, `unimplemented!`, `unreachable!`, `matches!`, `include_str!`, `env!`, `cfg!`.

```rust
let x = dbg!(a * 2) + 1;
if matches!(shape, Shape::Circle(_) | Shape::Empty) { }
```

Procedural macro (`#[derive(Serialize)]`, `#[tokio::main]`) viết trong crate riêng có `proc-macro = true`, thường dùng `syn` và `quote`.

## 17. Unsafe & FFI

`unsafe` không tắt borrow checker. Nó chỉ mở thêm 5 quyền: dereference con trỏ thô, gọi hàm `unsafe`, đọc/ghi `static mut`, cài trait `unsafe`, truy cập trường `union`.

```rust
let mut n = 5;
let p = &raw mut n;              // con trỏ thô, tạo ra thì an toàn
unsafe { *p += 1; }              // dereference thì cần unsafe

// gọi hàm C
unsafe extern "C" {
    safe fn abs(x: i32) -> i32;  // đánh dấu safe thì gọi không cần unsafe
}

// cho C (hoặc C# trong Unity) gọi hàm Rust
#[unsafe(no_mangle)]
pub extern "C" fn rust_add(a: i32, b: i32) -> i32 { a + b }
```

Build thư viện cho Unity hoặc C/C++ gọi:

```toml
[lib]
crate-type = ["cdylib"]   # ra .dll / .so / .dylib
```

```csharp
// phía C# trong Unity
[DllImport("mylib")] static extern int rust_add(int a, int b);
```

Quy ước: bọc phần `unsafe` trong một hàm an toàn nhỏ, ghi comment `// SAFETY:` giải thích vì sao nó đúng. Chạy `cargo +nightly miri test` để bắt hành vi không xác định.

## 18. Crate phổ biến

| Mục đích | Crate |
| --- | --- |
| Serialize JSON/TOML/... | `serde`, `serde_json`, `toml` |
| Lỗi | `anyhow` (ứng dụng), `thiserror` (thư viện) |
| CLI | `clap` (derive) |
| Async runtime | `tokio` |
| HTTP client | `reqwest` |
| Web server | `axum`, `actix-web` |
| Database | `sqlx`, `diesel`, `rusqlite` |
| Log | `tracing`, `tracing-subscriber` |
| Song song | `rayon` |
| Ngẫu nhiên | `rand` |
| Thời gian | `chrono`, `jiff` |
| Regex | `regex` |
| Game engine | `bevy` (ECS), `macroquad` |
| Toán game | `glam` |
| WebAssembly | `wasm-bindgen`, `wasm-pack` |
| Benchmark | `criterion` |

## 19. Lỗi compiler hay gặp

| Lỗi | Nghĩa | Cách sửa thường gặp |
| --- | --- | --- |
| `E0382 borrow of moved value` | Dùng biến sau khi đã move | Truyền `&x`, hoặc `.clone()` nếu thật cần |
| `E0499 cannot borrow as mutable more than once` | Hai `&mut` cùng lúc | Thu hẹp scope, tách thành bước riêng |
| `E0502 cannot borrow as mutable because it is also borrowed as immutable` | Vừa đọc vừa ghi | Lấy giá trị ra trước (`let n = v.len();`) rồi mới sửa |
| `E0106 missing lifetime specifier` | Trả tham chiếu không rõ nguồn | Thêm `'a`, hoặc trả kiểu sở hữu |
| `E0597 does not live long enough` | Tham chiếu sống lâu hơn dữ liệu | Đưa dữ liệu ra scope ngoài, hoặc sở hữu nó |
| `E0277 trait bound not satisfied` | Kiểu thiếu trait | `#[derive(...)]`, cài trait, thêm ràng buộc `T: Trait` |
| `E0308 mismatched types` | Sai kiểu | Đọc kỹ expected/found, thường thiếu `&`, `.into()`, `?` |
| `cannot move out of borrowed content` | Lấy giá trị ra khỏi tham chiếu | `.clone()`, `std::mem::take`, `Option::take` |
| `future cannot be sent between threads` | Giữ thứ không `Send` qua `.await` | Thả khoá/`Rc` trước `.await`, đổi `Rc` sang `Arc` |

## 20. Mẹo & thói quen tốt

- Viết xong chạy `cargo clippy`. Nó dạy cách viết Rust "đúng kiểu" tốt hơn mọi cuốn sách.
- Đừng ngại `.clone()` khi mới học. Tối ưu sau, khi profiler chỉ ra chỗ chậm.
- Ưu tiên nhận `&str`, `&[T]`, `impl AsRef<Path>` ở tham số; trả về kiểu sở hữu (`String`, `Vec<T>`).
- Dùng kiểu để mã hoá luật: newtype `struct UserId(u64)` thay vì `u64` trần; enum thay cho cờ `bool`.
- Hạn chế `unwrap()` trong code thật. Dùng `?`, hoặc `expect("vì sao chỗ này không thể lỗi")`.
- Tránh `Rc<RefCell<...>>` khắp nơi. Đó thường là dấu hiệu nên dùng chỉ số (`Vec` + index) hoặc ECS.
- Build release cho benchmark. Debug build có thể chậm hơn 10-100 lần.
- Tài liệu: *The Rust Book* (doc.rust-lang.org/book), *Rust by Example*, *Rustlings* để luyện tay, docs.rs để tra crate.
