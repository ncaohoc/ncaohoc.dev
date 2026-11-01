---
title: "SQL và SQLite từ cơ bản đến nâng cao"
description: "DDL, CRUD, JOIN, CTE, window function, index, transaction, JSON, FTS5 và tối ưu truy vấn trong SQLite."
date: 2026-10-06
tags: [SQL, SQLite, Database]
---

## 1. Tổng quan SQLite & kiểu dữ liệu

SQLite là CSDL nhúng, toàn bộ nằm trong một file, không cần server. Cú pháp phần lớn theo chuẩn SQL, nhưng kiểu dữ liệu là **động** (type affinity) thay vì cứng nhắc như MySQL/PostgreSQL.

| Storage class | Ý nghĩa | Ví dụ khai báo cột được map vào |
| --- | --- | --- |
| `NULL` | Giá trị rỗng | — |
| `INTEGER` | Số nguyên có dấu, 1–8 byte | `INT`, `INTEGER`, `BIGINT`, `BOOLEAN` (0/1) |
| `REAL` | Số thực 8 byte | `REAL`, `DOUBLE`, `FLOAT` |
| `TEXT` | Chuỗi UTF-8/16 | `TEXT`, `VARCHAR(n)`, `CHAR`, `CLOB` (n bị bỏ qua) |
| `BLOB` | Dữ liệu nhị phân nguyên vẹn | `BLOB` |
| `NUMERIC` (affinity) | Ưu tiên lưu dạng số | `NUMERIC`, `DECIMAL`, `DATE`, `DATETIME` |

- SQLite **không có** kiểu DATE/BOOLEAN riêng: ngày lưu dạng TEXT ISO-8601 (`'2026-10-06 14:30:00'`), INTEGER (Unix time) hoặc REAL (Julian day); boolean là 0/1.
- `typeof(x)` cho biết storage class thực tế của một giá trị.
- Muốn kiểm tra kiểu nghiêm ngặt: dùng bảng `STRICT` (SQLite ≥ 3.37), chỉ cho phép `INT`, `INTEGER`, `REAL`, `TEXT`, `BLOB`, `ANY`.

```sql
CREATE TABLE logs (
  id    INTEGER PRIMARY KEY,
  level TEXT NOT NULL,
  ts    INTEGER
) STRICT;

SELECT typeof(42), typeof(3.14), typeof('a'), typeof(NULL), typeof(x'00');
-- integer | real | text | null | blob
```

Phân loại lệnh SQL: **DDL** (CREATE, ALTER, DROP), **DML** (INSERT, UPDATE, DELETE), **DQL** (SELECT), **TCL** (BEGIN, COMMIT, ROLLBACK). SQLite không có DCL (GRANT/REVOKE) vì quyền truy cập do hệ điều hành quản lý qua file.

## 2. DDL: tạo, sửa, xóa bảng

Mọi ví dụ phía sau dùng hai bảng `users` và `orders` dưới đây.

```sql
CREATE TABLE IF NOT EXISTS users (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL UNIQUE,
  name       TEXT    NOT NULL,
  age        INTEGER CHECK (age >= 0),
  city       TEXT    DEFAULT 'HCM',
  created_at TEXT    DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE orders (
  id       INTEGER PRIMARY KEY,
  user_id  INTEGER NOT NULL,
  amount   REAL    NOT NULL CHECK (amount > 0),
  status   TEXT    NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending','paid','cancelled')),
  order_at TEXT    DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Khóa chính kép
CREATE TABLE order_items (
  order_id   INTEGER,
  product_id INTEGER,
  qty        INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (order_id, product_id)
) WITHOUT ROWID;

-- Tạo bảng từ kết quả truy vấn (không copy ràng buộc)
CREATE TABLE vip AS SELECT * FROM users WHERE age > 30;

-- Bảng tạm, mất khi đóng kết nối
CREATE TEMP TABLE tmp_ids (id INTEGER);
```

| Ràng buộc | Tác dụng |
| --- | --- |
| `PRIMARY KEY` | Định danh duy nhất. `INTEGER PRIMARY KEY` là bí danh của `rowid`, tự tăng |
| `AUTOINCREMENT` | Cấm tái dùng id đã xóa; chậm hơn, chỉ dùng khi thật cần |
| `NOT NULL` | Bắt buộc có giá trị |
| `UNIQUE` | Không trùng (nhiều NULL vẫn được phép) |
| `CHECK (expr)` | Giá trị phải thỏa biểu thức |
| `DEFAULT v` | Giá trị mặc định; biểu thức phải trong ngoặc `(...)` |
| `FOREIGN KEY` | Tham chiếu bảng khác; **phải bật** `PRAGMA foreign_keys = ON;` mỗi kết nối |
| `COLLATE NOCASE` | So sánh không phân biệt hoa thường (ASCII) |

Hành động FK: `CASCADE`, `SET NULL`, `SET DEFAULT`, `RESTRICT`, `NO ACTION` (mặc định).

```sql
ALTER TABLE users RENAME TO members;
ALTER TABLE users RENAME COLUMN name TO full_name;
ALTER TABLE users ADD COLUMN phone TEXT;
ALTER TABLE users DROP COLUMN phone;      -- SQLite ≥ 3.35

DROP TABLE IF EXISTS vip;
DELETE FROM orders;                        -- xóa hết dòng (SQLite không có TRUNCATE)
```

`ALTER TABLE` của SQLite không đổi được kiểu cột hay thêm ràng buộc. Cách làm chuẩn là tạo lại bảng:

```sql
PRAGMA foreign_keys = OFF;
BEGIN;
CREATE TABLE users_new (/* cấu trúc mới */);
INSERT INTO users_new SELECT /* cột */ FROM users;
DROP TABLE users;
ALTER TABLE users_new RENAME TO users;
-- tạo lại index, trigger, view
COMMIT;
PRAGMA foreign_keys = ON;
```

## 3. CRUD: thêm, đọc, sửa, xóa

**INSERT**

```sql
INSERT INTO users (email, name, age) VALUES ('an@x.vn', 'An', 25);

-- Nhiều dòng một lần
INSERT INTO users (email, name, age) VALUES
  ('binh@x.vn', 'Bình', 31),
  ('chi@x.vn',  'Chi',  NULL);

-- Từ truy vấn khác
INSERT INTO vip (id, email, name) SELECT id, email, name FROM users WHERE age > 30;

-- Toàn bộ cột dùng DEFAULT
INSERT INTO logs DEFAULT VALUES;

-- Xử lý xung đột ràng buộc
INSERT OR IGNORE  INTO users (email, name) VALUES ('an@x.vn', 'An');  -- bỏ qua nếu trùng
INSERT OR REPLACE INTO users (id, email, name) VALUES (1, 'an@x.vn', 'An mới'); -- xóa dòng cũ rồi chèn
-- Các biến thể khác: OR ABORT (mặc định), OR FAIL, OR ROLLBACK

SELECT last_insert_rowid();   -- id vừa chèn
SELECT changes();             -- số dòng lệnh trước ảnh hưởng
```

**UPSERT** (SQLite ≥ 3.24) — cập nhật thay vì xóa-chèn như `OR REPLACE`:

```sql
INSERT INTO users (email, name, age) VALUES ('an@x.vn', 'An', 26)
ON CONFLICT(email) DO UPDATE SET
  name = excluded.name,
  age  = excluded.age
WHERE excluded.age > users.age;

INSERT INTO users (email, name) VALUES ('an@x.vn', 'An')
ON CONFLICT DO NOTHING;
```

`excluded` là dòng định chèn nhưng bị xung đột.

**SELECT**

```sql
SELECT * FROM users;
SELECT name, age FROM users;
SELECT name AS ho_ten, age * 12 AS so_thang FROM users;   -- alias
SELECT DISTINCT city FROM users;                          -- bỏ trùng
SELECT DISTINCT city, age FROM users;                     -- trùng theo cặp
SELECT 1 + 1, 'hello', date('now');                       -- không cần FROM
```

**UPDATE**

```sql
UPDATE users SET age = age + 1, city = 'HN' WHERE id = 1;

-- Cập nhật từ bảng khác (SQLite ≥ 3.33)
UPDATE orders SET status = 'cancelled'
FROM users
WHERE orders.user_id = users.id AND users.city = 'HN';

-- Cách cũ bằng subquery
UPDATE orders SET status = 'cancelled'
WHERE user_id IN (SELECT id FROM users WHERE city = 'HN');
```

**DELETE**

```sql
DELETE FROM orders WHERE status = 'cancelled';
DELETE FROM users WHERE id NOT IN (SELECT user_id FROM orders);
```

**RETURNING** (SQLite ≥ 3.35) — trả về dòng vừa thay đổi, không cần truy vấn lại:

```sql
INSERT INTO users (email, name) VALUES ('dung@x.vn', 'Dũng') RETURNING id, created_at;
UPDATE users SET age = age + 1 WHERE city = 'HCM' RETURNING id, age;
DELETE FROM orders WHERE amount < 1000 RETURNING *;
```

Luôn viết `WHERE` trước khi chạy `UPDATE`/`DELETE`; thiếu nó là thay đổi toàn bộ bảng. Mẹo: chạy thử `SELECT` với cùng `WHERE` trước.

## 4. Lọc & sắp xếp

| Toán tử | Ý nghĩa | Ví dụ |
| --- | --- | --- |
| `=`, `==`, `!=`, `<>` | Bằng / khác | `city = 'HCM'` |
| `<`, `<=`, `>`, `>=` | So sánh | `age >= 18` |
| `AND`, `OR`, `NOT` | Logic (`AND` ưu tiên hơn `OR`) | `a = 1 AND (b = 2 OR c = 3)` |
| `BETWEEN a AND b` | Trong khoảng, gồm 2 đầu | `age BETWEEN 18 AND 30` |
| `IN (...)` | Thuộc tập | `status IN ('paid','pending')` |
| `LIKE` | Mẫu, `%` = nhiều ký tự, `_` = 1 ký tự; không phân biệt hoa thường (ASCII) | `email LIKE '%@gmail.com'` |
| `GLOB` | Mẫu kiểu Unix `*`, `?`, `[a-z]`; phân biệt hoa thường | `name GLOB 'Ng*'` |
| `IS NULL`, `IS NOT NULL` | Kiểm tra NULL | `age IS NULL` |
| `IS`, `IS NOT` | So sánh an toàn với NULL | `a IS b` đúng khi cả hai NULL |
| `\|\|` | Nối chuỗi | `name \|\| ' - ' \|\| city` |
| `%` | Chia lấy dư | `id % 2 = 0` |

```sql
SELECT * FROM users
WHERE city IN ('HCM', 'HN')
  AND age BETWEEN 18 AND 40
  AND name LIKE 'N%'
  AND email NOT LIKE '%test%';

-- Escape ký tự đặc biệt trong LIKE
SELECT * FROM products WHERE code LIKE '50\%%' ESCAPE '\';

-- Kiểm tra tồn tại
SELECT * FROM users u WHERE EXISTS (SELECT 1 FROM orders o WHERE o.user_id = u.id);
```

**Bẫy NULL:** `NULL = NULL` cho kết quả NULL (không phải TRUE), nên `WHERE age = NULL` không trả dòng nào. `NOT IN (subquery)` mà subquery chứa NULL cũng trả rỗng; dùng `NOT EXISTS` thay thế.

**ORDER BY, LIMIT, OFFSET**

```sql
SELECT * FROM users ORDER BY age DESC, name ASC;
SELECT * FROM users ORDER BY age NULLS LAST;        -- SQLite ≥ 3.30
SELECT * FROM users ORDER BY 2;                      -- theo cột thứ 2 trong SELECT
SELECT * FROM users ORDER BY name COLLATE NOCASE;
SELECT * FROM users ORDER BY random() LIMIT 1;       -- lấy ngẫu nhiên

SELECT * FROM users ORDER BY id LIMIT 10 OFFSET 20;  -- trang 3, mỗi trang 10
SELECT * FROM users ORDER BY id LIMIT 20, 10;        -- cú pháp rút gọn: LIMIT offset, count

-- Phân trang nhanh hơn cho bảng lớn (keyset pagination)
SELECT * FROM users WHERE id > :last_seen_id ORDER BY id LIMIT 10;
```

Mặc định SQLite xếp NULL đứng đầu khi `ASC`. Không có `ORDER BY` thì thứ tự kết quả không được đảm bảo.

## 5. Hàm tích hợp

**Chuỗi**

| Hàm | Kết quả |
| --- | --- |
| `length('Xin chào')` | 8 (số ký tự) |
| `upper('abc')`, `lower('ABC')` | `ABC`, `abc` (chỉ ASCII) |
| `trim('  a  ')`, `ltrim`, `rtrim` | `a`; `trim(s, 'x')` bỏ ký tự `x` |
| `substr('SQLite', 2, 3)` | `QLi` (đếm từ 1; số âm tính từ cuối) |
| `replace('a-b-c', '-', '/')` | `a/b/c` |
| `instr('hello', 'l')` | 3 (vị trí đầu tiên, 0 nếu không có) |
| `printf('%05.2f', 3.14159)` / `format(...)` | `03.14` |
| `'a' \|\| 'b'`, `concat('a','b')`, `concat_ws('-','a','b')` | `ab`, `ab`, `a-b` (concat từ 3.44) |
| `hex(x)`, `unicode('A')`, `char(65)` | `41`, 65, `A` |
| `quote(s)` | Chuỗi đã escape dùng cho SQL |

**Số**

| Hàm | Kết quả |
| --- | --- |
| `abs(-5)` | 5 |
| `round(3.14159, 2)` | 3.14 |
| `ceil(1.2)`, `floor(1.8)` | 2, 1 (hàm toán học, có sẵn từ 3.35 nếu bật khi biên dịch) |
| `7 / 2`, `7 / 2.0` | 3, 3.5 (chia hai số nguyên ra số nguyên) |
| `CAST('42' AS INTEGER)` | 42 |
| `max(a, b, c)`, `min(a, b)` | Giá trị lớn / nhỏ nhất trong các đối số |
| `random()` | Số nguyên ngẫu nhiên 64-bit |
| `abs(random()) % 100` | Ngẫu nhiên 0–99 |

**Ngày giờ** — năm hàm chính: `date`, `time`, `datetime`, `julianday`, `strftime` (+ `unixepoch` từ 3.38). Mặc định là giờ UTC.

```sql
SELECT date('now');                          -- 2026-10-06
SELECT datetime('now', 'localtime');         -- giờ máy (VN = UTC+7)
SELECT datetime('now', '+7 hours');
SELECT date('now', '+1 month', 'start of month', '-1 day');  -- ngày cuối tháng này
SELECT date('now', 'weekday 1');             -- thứ Hai kế tiếp
SELECT strftime('%Y-%m', order_at) AS thang FROM orders;
SELECT strftime('%w', 'now');                -- thứ trong tuần, 0 = Chủ nhật
SELECT unixepoch('now');                     -- Unix timestamp
SELECT datetime(1767225600, 'unixepoch');    -- từ timestamp về chuỗi
SELECT julianday('2026-12-31') - julianday('now');      -- số ngày còn lại
SELECT CAST((julianday('now') - julianday(created_at)) / 365.25 AS INT) FROM users;
```

| Mã strftime | Ý nghĩa |
| --- | --- |
| `%Y` `%m` `%d` | Năm, tháng, ngày |
| `%H` `%M` `%S` | Giờ, phút, giây |
| `%w` `%j` `%W` | Thứ (0–6), ngày trong năm, tuần trong năm |
| `%s` | Unix timestamp |

Modifier hay dùng: `'+N days'`, `'-N hours'`, `'start of month'`, `'start of year'`, `'start of day'`, `'weekday N'`, `'localtime'`, `'utc'`, `'unixepoch'`.

**Điều kiện & NULL**

```sql
SELECT name,
  CASE
    WHEN age < 18 THEN 'Trẻ em'
    WHEN age < 60 THEN 'Người lớn'
    ELSE 'Cao tuổi'
  END AS nhom,
  CASE status WHEN 'paid' THEN 1 ELSE 0 END AS da_tra,   -- dạng rút gọn
  iif(age >= 18, 'adult', 'minor') AS iif_demo,            -- SQLite ≥ 3.32
  coalesce(phone, email, 'N/A') AS lien_he,                -- giá trị khác NULL đầu tiên
  ifnull(age, 0),                                          -- = coalesce 2 đối số
  nullif(amount, 0)                                        -- NULL nếu bằng 0, tránh chia 0
FROM users;
```

## 6. Tổng hợp: GROUP BY & HAVING

| Hàm aggregate | Tác dụng |
| --- | --- |
| `COUNT(*)` | Đếm mọi dòng, kể cả NULL |
| `COUNT(col)` | Đếm dòng có `col` khác NULL |
| `COUNT(DISTINCT col)` | Đếm giá trị khác nhau |
| `SUM(col)`, `TOTAL(col)` | Tổng; `SUM` trả NULL khi rỗng, `TOTAL` trả 0.0 |
| `AVG(col)` | Trung bình (bỏ qua NULL) |
| `MIN(col)`, `MAX(col)` | Nhỏ / lớn nhất |
| `group_concat(col, ', ')` / `string_agg(col, ', ')` | Nối chuỗi trong nhóm (`string_agg` từ 3.44) |

```sql
-- Doanh thu theo khách, chỉ đơn đã trả, chỉ khách có ≥ 3 đơn
SELECT user_id,
       COUNT(*)            AS so_don,
       SUM(amount)         AS doanh_thu,
       ROUND(AVG(amount),2) AS tb_don,
       MAX(order_at)       AS don_gan_nhat
FROM orders
WHERE status = 'paid'          -- lọc DÒNG trước khi gom nhóm
GROUP BY user_id
HAVING COUNT(*) >= 3           -- lọc NHÓM sau khi gom
ORDER BY doanh_thu DESC;

-- Gom theo nhiều cột / biểu thức
SELECT strftime('%Y-%m', order_at) AS thang, status, SUM(amount)
FROM orders
GROUP BY thang, status;

-- Đếm có điều kiện trong một truy vấn (pivot đơn giản)
SELECT user_id,
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END)      AS paid,
  COUNT(*) FILTER (WHERE status = 'cancelled')          AS cancelled,   -- SQLite ≥ 3.30
  SUM(amount) FILTER (WHERE status = 'paid')            AS paid_amount
FROM orders GROUP BY user_id;

-- Danh sách tên theo thành phố, sắp xếp bên trong (3.44+)
SELECT city, group_concat(name, ', ' ORDER BY name) FROM users GROUP BY city;
```

- Cột trong `SELECT` mà không nằm trong `GROUP BY` và không bị aggregate: SQLite vẫn chạy (lấy giá trị tùy ý), PostgreSQL sẽ báo lỗi. Đừng dựa vào hành vi này.
- Ngoại lệ hữu ích của SQLite: với `MAX()`/`MIN()` đơn lẻ, các cột trần lấy từ **chính dòng** đạt max/min: `SELECT name, MAX(age) FROM users;` trả tên người lớn tuổi nhất.
- `WHERE` không dùng được hàm aggregate; điều kiện trên `SUM`, `COUNT`… phải nằm trong `HAVING`.

## 7. JOIN & phép tập hợp

| Loại JOIN | Trả về | SQLite hỗ trợ |
| --- | --- | --- |
| `INNER JOIN` (`JOIN`) | Chỉ dòng khớp ở cả hai bảng | Có |
| `LEFT JOIN` | Mọi dòng bảng trái, bên phải NULL nếu không khớp | Có |
| `RIGHT JOIN` | Mọi dòng bảng phải | Từ 3.39 |
| `FULL OUTER JOIN` | Mọi dòng cả hai bên | Từ 3.39 |
| `CROSS JOIN` | Tích Descartes (mọi cặp) | Có |
| Self join | Bảng nối với chính nó qua alias | Có |

```sql
-- INNER: khách có đơn
SELECT u.name, o.id, o.amount
FROM users u
JOIN orders o ON o.user_id = u.id;

-- LEFT: mọi khách, kể cả chưa có đơn
SELECT u.name, COUNT(o.id) AS so_don, COALESCE(SUM(o.amount), 0) AS tong
FROM users u
LEFT JOIN orders o ON o.user_id = u.id
GROUP BY u.id;

-- Anti-join: khách CHƯA có đơn
SELECT u.* FROM users u
LEFT JOIN orders o ON o.user_id = u.id
WHERE o.id IS NULL;

-- Điều kiện ở ON vs WHERE khi LEFT JOIN
SELECT u.name, o.id FROM users u
LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid';  -- giữ mọi user
-- Nếu đặt o.status = 'paid' ở WHERE, LEFT JOIN bị biến thành INNER JOIN

-- Nhiều bảng
SELECT u.name, o.id, p.title, oi.qty
FROM orders o
JOIN users u        ON u.id = o.user_id
JOIN order_items oi ON oi.order_id = o.id
JOIN products p     ON p.id = oi.product_id;

-- Self join: nhân viên và quản lý
SELECT e.name AS nhan_vien, m.name AS quan_ly
FROM employees e LEFT JOIN employees m ON e.manager_id = m.id;

-- USING / NATURAL khi cột cùng tên
SELECT * FROM orders JOIN order_items USING (order_id);
```

**Phép tập hợp** — các SELECT phải có cùng số cột; `ORDER BY`/`LIMIT` chỉ đặt ở cuối cùng.

```sql
SELECT email FROM users
UNION                 -- gộp, bỏ trùng
SELECT email FROM newsletter;

SELECT email FROM users UNION ALL SELECT email FROM newsletter;  -- giữ trùng, nhanh hơn
SELECT email FROM users INTERSECT SELECT email FROM newsletter;  -- có ở cả hai
SELECT email FROM users EXCEPT    SELECT email FROM newsletter;  -- có ở A, không ở B
```

## 8. Subquery & CTE

**Subquery** có thể đặt ở `WHERE`, `FROM`, `SELECT`.

```sql
-- Scalar subquery: trả 1 giá trị
SELECT * FROM orders WHERE amount > (SELECT AVG(amount) FROM orders);

-- Subquery trong FROM (bảng dẫn xuất, cần alias)
SELECT city, AVG(tong) FROM (
  SELECT u.city, SUM(o.amount) AS tong
  FROM users u JOIN orders o ON o.user_id = u.id
  GROUP BY u.id
) t GROUP BY city;

-- Correlated subquery: chạy lại cho mỗi dòng ngoài
SELECT u.name,
  (SELECT MAX(o.order_at) FROM orders o WHERE o.user_id = u.id) AS don_cuoi
FROM users u;

-- Đơn lớn nhất của mỗi khách
SELECT * FROM orders o
WHERE amount = (SELECT MAX(amount) FROM orders WHERE user_id = o.user_id);
```

**CTE** (`WITH`) — đặt tên cho truy vấn trung gian, dễ đọc hơn subquery lồng nhau.

```sql
WITH
  paid AS (
    SELECT user_id, SUM(amount) AS tong FROM orders
    WHERE status = 'paid' GROUP BY user_id
  ),
  top_users AS (
    SELECT * FROM paid WHERE tong > 1000000
  )
SELECT u.name, t.tong
FROM top_users t JOIN users u ON u.id = t.user_id
ORDER BY t.tong DESC;

-- Ép tính một lần và lưu lại (hoặc ngược lại)
WITH x AS MATERIALIZED (SELECT ...) SELECT ...;
WITH x AS NOT MATERIALIZED (SELECT ...) SELECT ...;
```

**Recursive CTE** — gồm phần neo + `UNION ALL` + phần đệ quy tham chiếu chính CTE.

```sql
-- Dãy số 1..10
WITH RECURSIVE n(x) AS (
  SELECT 1
  UNION ALL
  SELECT x + 1 FROM n WHERE x < 10
)
SELECT x FROM n;

-- Lịch mọi ngày trong tháng 10/2026 (dùng để lấp ngày không có đơn)
WITH RECURSIVE days(d) AS (
  SELECT '2026-10-01'
  UNION ALL
  SELECT date(d, '+1 day') FROM days WHERE d < '2026-10-31'
)
SELECT d, COALESCE(SUM(o.amount), 0)
FROM days LEFT JOIN orders o ON date(o.order_at) = d
GROUP BY d;

-- Cây phân cấp: toàn bộ cấp dưới của nhân viên id = 1
WITH RECURSIVE sub(id, name, level) AS (
  SELECT id, name, 0 FROM employees WHERE id = 1
  UNION ALL
  SELECT e.id, e.name, s.level + 1
  FROM employees e JOIN sub s ON e.manager_id = s.id
)
SELECT printf('%.*c', level * 2, ' ') || name AS cay FROM sub;
```

Luôn có điều kiện dừng (`WHERE x < 10`) hoặc `LIMIT`, nếu không truy vấn đệ quy chạy mãi.

## 9. Window functions (SQLite ≥ 3.25)

Window function tính toán trên một "cửa sổ" các dòng liên quan nhưng **không gộp dòng** như `GROUP BY`. Cú pháp: `hàm() OVER (PARTITION BY ... ORDER BY ... frame)`.

| Hàm | Tác dụng |
| --- | --- |
| `ROW_NUMBER()` | Số thứ tự 1, 2, 3… không trùng |
| `RANK()` | Xếp hạng, đồng hạng thì nhảy số (1, 1, 3) |
| `DENSE_RANK()` | Đồng hạng không nhảy số (1, 1, 2) |
| `NTILE(n)` | Chia thành n nhóm gần bằng nhau |
| `PERCENT_RANK()`, `CUME_DIST()` | Vị trí tương đối 0–1 |
| `LAG(col, n, default)` | Giá trị dòng trước n bước |
| `LEAD(col, n, default)` | Giá trị dòng sau n bước |
| `FIRST_VALUE`, `LAST_VALUE`, `NTH_VALUE(col, n)` | Giá trị đầu / cuối / thứ n trong frame |
| `SUM`, `AVG`, `COUNT`, `MIN`, `MAX` + `OVER` | Aggregate dạng cửa sổ (tổng lũy kế, trung bình trượt) |

```sql
-- Xếp hạng đơn trong từng khách
SELECT user_id, id, amount,
  ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rn,
  RANK()       OVER (ORDER BY amount DESC)                       AS hang_toan_bo
FROM orders;

-- Top 2 đơn lớn nhất mỗi khách (window không dùng trực tiếp trong WHERE → bọc CTE)
WITH r AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY amount DESC) AS rn
  FROM orders
)
SELECT * FROM r WHERE rn <= 2;

-- Tổng lũy kế và % đóng góp
SELECT id, order_at, amount,
  SUM(amount) OVER (ORDER BY order_at)                  AS luy_ke,
  ROUND(100.0 * amount / SUM(amount) OVER (), 2)        AS pct_tong
FROM orders;

-- So với tháng trước
WITH m AS (
  SELECT strftime('%Y-%m', order_at) AS thang, SUM(amount) AS dt
  FROM orders GROUP BY thang
)
SELECT thang, dt,
  LAG(dt) OVER (ORDER BY thang)                                       AS thang_truoc,
  ROUND(100.0 * (dt - LAG(dt) OVER (ORDER BY thang)) / LAG(dt) OVER (ORDER BY thang), 1) AS tang_truong_pct
FROM m;

-- Trung bình trượt 7 ngày, dùng named window
SELECT d, dt, AVG(dt) OVER w7 AS ma7
FROM daily
WINDOW w7 AS (ORDER BY d ROWS BETWEEN 6 PRECEDING AND CURRENT ROW);
```

**Frame:** `ROWS` (đếm theo dòng), `RANGE` (theo giá trị), `GROUPS` (theo nhóm giá trị bằng nhau); biên: `UNBOUNDED PRECEDING`, `N PRECEDING`, `CURRENT ROW`, `N FOLLOWING`, `UNBOUNDED FOLLOWING`. Có `ORDER BY` mà không ghi frame thì mặc định là `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW` — vì vậy `LAST_VALUE` thường trả chính dòng hiện tại; muốn lấy giá trị cuối thật sự thì ghi `ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING`.

## 10. Index, View, Trigger

**Index** tăng tốc đọc (WHERE, JOIN, ORDER BY) nhưng làm chậm ghi và tốn dung lượng.

```sql
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Index kép: thứ tự cột quan trọng (dùng được cho user_id, hoặc user_id + status)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index: chỉ đánh index một phần dòng
CREATE INDEX idx_pending ON orders(order_at) WHERE status = 'pending';

-- Index trên biểu thức
CREATE INDEX idx_email_lower ON users(lower(email));

-- Covering index: chứa đủ cột nên không cần đọc bảng
CREATE INDEX idx_cover ON orders(user_id, status, amount);

DROP INDEX IF EXISTS idx_pending;
REINDEX;            -- xây lại index
ANALYZE;            -- cập nhật thống kê cho bộ tối ưu
```

Quy tắc "trái nhất": index `(a, b, c)` giúp truy vấn lọc theo `a`, `a+b`, `a+b+c`, không giúp khi chỉ lọc `b` hoặc `c`. Bọc cột trong hàm (`WHERE lower(email) = ...`) hoặc `LIKE '%abc'` sẽ bỏ qua index thường.

**View** — truy vấn được lưu tên, dùng như bảng; SQLite view là chỉ đọc.

```sql
CREATE VIEW IF NOT EXISTS v_user_revenue AS
SELECT u.id, u.name, COALESCE(SUM(o.amount), 0) AS revenue
FROM users u LEFT JOIN orders o ON o.user_id = u.id AND o.status = 'paid'
GROUP BY u.id;

SELECT * FROM v_user_revenue WHERE revenue > 0;
DROP VIEW v_user_revenue;
```

**Trigger** — tự chạy khi `INSERT`/`UPDATE`/`DELETE`, thời điểm `BEFORE`, `AFTER` hoặc `INSTEAD OF` (chỉ cho view). Trong thân trigger dùng `NEW.col` và `OLD.col`.

```sql
-- Tự cập nhật updated_at
CREATE TRIGGER trg_users_updated
AFTER UPDATE ON users
FOR EACH ROW WHEN NEW.updated_at IS OLD.updated_at
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- Ghi log xóa
CREATE TRIGGER trg_orders_audit
AFTER DELETE ON orders
BEGIN
  INSERT INTO audit_log (table_name, row_id, action, at)
  VALUES ('orders', OLD.id, 'DELETE', datetime('now'));
END;

-- Chặn dữ liệu không hợp lệ
CREATE TRIGGER trg_no_negative
BEFORE UPDATE OF amount ON orders
WHEN NEW.amount < 0
BEGIN
  SELECT RAISE(ABORT, 'amount không được âm');
END;

-- Cho phép ghi vào view
CREATE TRIGGER trg_view_insert INSTEAD OF INSERT ON v_users
BEGIN
  INSERT INTO users (email, name) VALUES (NEW.email, NEW.name);
END;

DROP TRIGGER IF EXISTS trg_no_negative;
```

Xem danh sách đối tượng: `SELECT type, name, sql FROM sqlite_schema;` (tên cũ: `sqlite_master`).

## 11. Transaction & PRAGMA

Transaction gom nhiều lệnh thành một đơn vị "tất cả hoặc không gì" (ACID). Ngoài đúng, nó còn làm `INSERT` hàng loạt nhanh hơn hàng trăm lần vì chỉ ghi đĩa một lần.

```sql
BEGIN;                      -- = BEGIN DEFERRED: khóa khi cần
  UPDATE accounts SET balance = balance - 100 WHERE id = 1;
  UPDATE accounts SET balance = balance + 100 WHERE id = 2;
COMMIT;                     -- hoặc ROLLBACK; để hủy

BEGIN IMMEDIATE;            -- giành khóa ghi ngay, tránh SQLITE_BUSY giữa chừng
BEGIN EXCLUSIVE;            -- khóa hoàn toàn

-- Savepoint: điểm lưu lồng nhau
SAVEPOINT sp1;
  DELETE FROM orders WHERE id = 5;
ROLLBACK TO sp1;            -- quay về sp1, transaction vẫn mở
RELEASE sp1;                -- xác nhận sp1
```

| PRAGMA | Tác dụng / giá trị nên dùng |
| --- | --- |
| `PRAGMA foreign_keys = ON;` | Bật kiểm tra khóa ngoại (tắt mặc định, phải bật mỗi kết nối) |
| `PRAGMA journal_mode = WAL;` | Người đọc không chặn người ghi; khuyên dùng cho app; lưu vĩnh viễn trong file |
| `PRAGMA synchronous = NORMAL;` | Cân bằng tốc độ/an toàn khi dùng WAL |
| `PRAGMA busy_timeout = 5000;` | Chờ tối đa 5000 ms khi DB bị khóa thay vì lỗi ngay |
| `PRAGMA cache_size = -64000;` | Cache \~64 MB (số âm = KiB) |
| `PRAGMA temp_store = MEMORY;` | Bảng/index tạm nằm trong RAM |
| `PRAGMA table_info(users);` | Liệt kê cột của bảng |
| `PRAGMA index_list(orders);` / `index_info(idx)` | Index của bảng / cột trong index |
| `PRAGMA foreign_key_list(orders);` | Khóa ngoại của bảng |
| `PRAGMA foreign_key_check;` | Tìm dòng vi phạm FK |
| `PRAGMA integrity_check;` | Kiểm tra file hỏng |
| `PRAGMA user_version = 3;` | Số phiên bản schema tự quản lý (tiện cho migration) |
| `PRAGMA optimize;` | Chạy trước khi đóng kết nối để cập nhật thống kê |

Bộ cấu hình khởi đầu phổ biến cho ứng dụng:

```sql
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;
```

Bảo trì: `VACUUM;` thu gọn file sau khi xóa nhiều; `VACUUM INTO 'backup.db';` tạo bản sao lưu nhất quán khi DB đang chạy.

## 12. Tính năng nâng cao của SQLite

**JSON** (có sẵn từ 3.38; lưu JSON trong cột TEXT, hoặc JSONB nhị phân từ 3.45)

```sql
CREATE TABLE events (id INTEGER PRIMARY KEY, data TEXT CHECK (json_valid(data)));
INSERT INTO events (data) VALUES ('{"user":"an","tags":["vip","new"],"cart":{"total":250000}}');

SELECT json_extract(data, '$.user')        FROM events;  -- an
SELECT data ->> '$.cart.total'             FROM events;  -- 250000 (giá trị SQL)
SELECT data ->  '$.tags'                   FROM events;  -- ["vip","new"] (JSON)
SELECT json_array_length(data, '$.tags')   FROM events;  -- 2

-- Tách mảng thành dòng
SELECT e.id, t.value AS tag
FROM events e, json_each(e.data, '$.tags') t;

-- Sửa JSON
UPDATE events SET data = json_set(data, '$.cart.total', 300000);
UPDATE events SET data = json_insert(data, '$.tags[#]', 'sale');   -- nối vào cuối mảng
UPDATE events SET data = json_remove(data, '$.cart');

-- Tạo JSON từ bảng
SELECT json_object('id', id, 'name', name) FROM users;
SELECT json_group_array(json_object('id', id, 'name', name)) FROM users;

-- Index trên trường JSON
CREATE INDEX idx_events_user ON events(data ->> '$.user');
```

**Generated columns** (≥ 3.31) — cột tính từ cột khác; `VIRTUAL` tính khi đọc, `STORED` lưu sẵn.

```sql
CREATE TABLE products (
  id      INTEGER PRIMARY KEY,
  price   REAL,
  qty     INTEGER,
  total   REAL GENERATED ALWAYS AS (price * qty) STORED,
  user    TEXT AS (json_extract(meta, '$.user')) VIRTUAL,
  meta    TEXT
);
```

**Full-text search FTS5**

```sql
CREATE VIRTUAL TABLE docs USING fts5(title, body, tokenize = 'unicode61 remove_diacritics 2');
INSERT INTO docs (title, body) VALUES ('Học SQL', 'Hướng dẫn SQLite cơ bản đến nâng cao');

SELECT * FROM docs WHERE docs MATCH 'sqlite';
SELECT * FROM docs WHERE docs MATCH 'title:hoc';               -- theo cột, bỏ dấu
SELECT * FROM docs WHERE docs MATCH '"co ban" AND nang';         -- cụm từ + logic
SELECT * FROM docs WHERE docs MATCH 'sql*';                     -- tiền tố
SELECT title, highlight(docs, 1, '<b>', '</b>'), bm25(docs)
FROM docs WHERE docs MATCH 'sqlite' ORDER BY bm25(docs);        -- xếp theo độ liên quan
```

`remove_diacritics 2` giúp tìm tiếng Việt không dấu vẫn ra kết quả có dấu.

**Làm việc với nhiều file**

```sql
ATTACH DATABASE 'archive.db' AS arc;
INSERT INTO arc.orders SELECT * FROM main.orders WHERE order_at < '2025-01-01';
SELECT * FROM main.users u JOIN arc.orders o ON o.user_id = u.id;
DETACH DATABASE arc;
```

**Khác:** `INSERT ... SELECT ... ON CONFLICT` (UPSERT hàng loạt), `rowid` ẩn có trên mọi bảng thường, `WITHOUT ROWID` cho bảng khóa chính kép/chuỗi, extension `generate_series(1, 10)` (nếu được bật), R\*Tree cho dữ liệu không gian.

## 13. CLI sqlite3

Mở hoặc tạo DB: `sqlite3 shop.db`. Lệnh bắt đầu bằng dấu chấm không cần `;`.

| Lệnh | Tác dụng |
| --- | --- |
| `.help` | Danh sách lệnh |
| `.open file.db` | Mở file khác |
| `.databases` | DB đang gắn |
| `.tables` / `.tables u%` | Liệt kê bảng (có lọc) |
| `.schema users` | Câu CREATE của bảng |
| `.indexes orders` | Index của bảng |
| `.headers on` | Hiện tên cột |
| `.mode box` / `table` / `column` / `csv` / `json` / `markdown` | Định dạng xuất |
| `.timer on` | Đo thời gian mỗi truy vấn |
| `.eqp on` | Tự in query plan |
| `.import --csv data.csv users` | Nhập CSV vào bảng (`--skip 1` bỏ dòng tiêu đề) |
| `.output out.csv` … `.output stdout` | Ghi kết quả ra file rồi trả về màn hình |
| `.once out.json` | Ghi ra file cho đúng truy vấn kế tiếp |
| `.dump` / `.dump users` | Xuất toàn bộ SQL (backup dạng text) |
| `.read script.sql` | Chạy file SQL |
| `.backup bk.db` / `.restore bk.db` | Sao lưu / khôi phục |
| `.excel` | Mở kết quả truy vấn tiếp theo bằng bảng tính |
| `.quit` | Thoát |

Dùng từ terminal, không vào chế độ tương tác:

```bash
sqlite3 shop.db "SELECT COUNT(*) FROM users;"
sqlite3 -header -csv shop.db "SELECT * FROM orders;" > orders.csv
sqlite3 shop.db .dump > backup.sql          # sao lưu
sqlite3 new.db < backup.sql                 # khôi phục
sqlite3 shop.db < migrate.sql
```

Dùng trong Python (thư viện chuẩn), luôn truyền tham số bằng `?` để chống SQL injection:

```python
import sqlite3
con = sqlite3.connect("shop.db")
con.row_factory = sqlite3.Row
with con:  # tự COMMIT, hoặc ROLLBACK nếu lỗi
    con.execute("INSERT INTO users (email, name) VALUES (?, ?)", ("e@x.vn", "Em"))
    con.executemany("INSERT INTO logs (level) VALUES (?)", [("info",), ("warn",)])
for row in con.execute("SELECT * FROM users WHERE city = :c", {"c": "HCM"}):
    print(row["name"])
con.close()
```

## 14. Tối ưu & lỗi thường gặp

**Thứ tự thực thi logic của SELECT** (khác thứ tự viết) — giải thích vì sao alias trong `SELECT` không dùng được ở `WHERE` theo chuẩn SQL:

1. `FROM` + `JOIN` — xác định nguồn dữ liệu
2. `WHERE` — lọc dòng
3. `GROUP BY` — gom nhóm
4. `HAVING` — lọc nhóm
5. `SELECT` — tính cột, window function
6. `DISTINCT` — bỏ trùng
7. `ORDER BY` — sắp xếp (được dùng alias)
8. `LIMIT` / `OFFSET` — cắt kết quả

(SQLite dễ dãi hơn: cho dùng alias cả ở `WHERE`/`GROUP BY`/`HAVING`, nhưng code sẽ không chạy trên PostgreSQL.)

**Đọc query plan**

```sql
EXPLAIN QUERY PLAN
SELECT * FROM orders WHERE user_id = 5 AND status = 'paid';
-- SCAN orders                                       → quét cả bảng: cân nhắc thêm index
-- SEARCH orders USING INDEX idx_orders_user_status  → đã dùng index
-- USING COVERING INDEX                              → tốt nhất, không đọc bảng
-- USE TEMP B-TREE FOR ORDER BY                      → sắp xếp thủ công, có thể thêm index
```

**Mẹo hiệu năng**

- Bọc ghi hàng loạt trong một `BEGIN … COMMIT`; dùng prepared statement / `executemany`.
- Chỉ `SELECT` cột cần thiết thay vì `*`, nhất là khi có cột TEXT/BLOB lớn.
- Index cho cột ở `WHERE`, `JOIN ON`, `ORDER BY`; khóa ngoại nên có index riêng.
- Viết điều kiện "sargable": `WHERE order_at >= '2026-10-01'` thay vì `WHERE strftime('%Y-%m', order_at) = '2026-10'`.
- `EXISTS` thường nhanh hơn `IN` với subquery lớn; `UNION ALL` nhanh hơn `UNION` khi không cần bỏ trùng.
- Phân trang bằng keyset (`WHERE id > ?`) thay cho `OFFSET` lớn.
- Bật WAL, chạy `PRAGMA optimize` / `ANALYZE` định kỳ.

**Lỗi thường gặp**

| Triệu chứng | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `WHERE x = NULL` không ra dòng nào | NULL không so sánh bằng `=` | `IS NULL` |
| Khóa ngoại không có tác dụng | FK tắt mặc định | `PRAGMA foreign_keys = ON` mỗi kết nối |
| `database is locked` (SQLITE\_BUSY) | Hai tiến trình cùng ghi | WAL + `busy_timeout`, transaction ngắn, `BEGIN IMMEDIATE` |
| `7/2` ra 3 | Chia hai số nguyên | `7/2.0` hoặc `CAST(x AS REAL)` |
| So sánh ngày sai | Lưu ngày không theo ISO (`06/10/2026`) | Luôn lưu `YYYY-MM-DD HH:MM:SS` |
| `'10' < '9'` là đúng | So sánh chuỗi theo từng ký tự | Lưu số đúng kiểu, hoặc `CAST` |
| `UPDATE`/`DELETE` cả bảng | Quên `WHERE` | Chạy thử bằng `SELECT`, dùng transaction |
| `OR REPLACE` làm mất dữ liệu cột khác / kích hoạt `ON DELETE CASCADE` | Nó xóa rồi chèn lại | Dùng `ON CONFLICT DO UPDATE` |
| `upper('việt')` không đổi chữ có dấu | Hàm chỉ xử lý ASCII | Xử lý ở tầng ứng dụng hoặc extension ICU |
| SQL injection | Nối chuỗi input vào câu lệnh | Tham số `?` / `:name` |
