---
title: "Firebase từ cơ bản đến nâng cao"
description: "Authentication, Firestore, Storage, Security Rules, Cloud Functions, Emulator, Hosting và checklist lên production."
date: 2026-10-06
tags: [Firebase, Backend, JavaScript]
---

## 1. Tổng quan

Firebase là nền tảng Backend-as-a-Service của Google: bạn có database, đăng nhập, lưu file, server function và hosting mà không phải tự quản lý server. Cheatsheet này dùng Web SDK dạng modular (v9 trở lên); cú pháp có thể thay đổi nhỏ theo phiên bản, hãy đối chiếu [tài liệu chính thức](https://firebase.google.com/docs) khi gặp lỗi.

| Dịch vụ | Dùng để | Mức độ |
| --- | --- | --- |
| Authentication | Đăng nhập email, Google, số điện thoại, ẩn danh | Cơ bản |
| Cloud Firestore | Database NoSQL dạng document, query mạnh, realtime | Cơ bản |
| Realtime Database | Database JSON một cây, độ trễ rất thấp | Cơ bản |
| Cloud Storage | Lưu ảnh, video, file người dùng | Cơ bản |
| Hosting | Deploy web tĩnh / SPA kèm CDN và HTTPS | Cơ bản |
| Security Rules | Phân quyền đọc/ghi trực tiếp từ client | Trung cấp |
| Cloud Functions | Code server chạy theo HTTP, sự kiện, lịch | Trung cấp |
| Emulator Suite | Chạy toàn bộ Firebase trên máy local để test | Trung cấp |
| Cloud Messaging (FCM) | Push notification | Nâng cao |
| App Check | Chặn request không đến từ app thật | Nâng cao |
| Analytics, Remote Config | Đo hành vi, bật/tắt tính năng từ xa | Nâng cao |

Lộ trình gợi ý: Auth → Firestore → Storage → Security Rules → Emulator → Functions → Hosting → các chủ đề nâng cao.

Về chi phí: gói Spark miễn phí đủ để học; Cloud Functions thường yêu cầu gói Blaze (trả theo dùng), nên đặt budget alert ngay khi nâng cấp.

## 2. Cài đặt và khởi tạo

Tạo project trên [Firebase Console](https://console.firebase.google.com), thêm một Web App để lấy `firebaseConfig`, rồi cài SDK và CLI.

```bash
npm install firebase            # SDK cho client
npm install -g firebase-tools   # CLI
firebase login
firebase init                   # chọn Firestore, Functions, Hosting, Storage, Emulators...
```

```javascript
// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "...",
  authDomain: "my-app.firebaseapp.com",
  projectId: "my-app",
  storageBucket: "my-app.appspot.com",
  messagingSenderId: "...",
  appId: "...",
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
```

- `apiKey` của web không phải bí mật; dữ liệu được bảo vệ bằng Security Rules và App Check.
- Modular SDK cho phép tree-shaking: chỉ import hàm cần dùng, bundle nhỏ hơn cú pháp cũ `firebase.firestore()`.
- Các file CLI tạo ra: `firebase.json` (cấu hình), `.firebaserc` (project alias), `firestore.rules`, `storage.rules`, `firestore.indexes.json`.

## 3. Authentication

Bật provider trong Console → Authentication → Sign-in method trước khi gọi code.

```javascript
import {
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  GoogleAuthProvider, signInWithPopup, signInAnonymously,
  sendPasswordResetEmail, sendEmailVerification, updateProfile,
  onAuthStateChanged, signOut,
} from "firebase/auth";
import { auth } from "./firebase";

// Đăng ký / đăng nhập email
const { user } = await createUserWithEmailAndPassword(auth, email, password);
await updateProfile(user, { displayName: "Lan" });
await sendEmailVerification(user);
await signInWithEmailAndPassword(auth, email, password);

// Google
await signInWithPopup(auth, new GoogleAuthProvider());

// Ẩn danh, quên mật khẩu
await signInAnonymously(auth);
await sendPasswordResetEmail(auth, email);

// Theo dõi trạng thái (luôn dùng cái này thay vì đọc auth.currentUser lúc khởi động)
const unsubscribe = onAuthStateChanged(auth, (user) => {
  if (user) console.log(user.uid, user.email);
  else console.log("Đã đăng xuất");
});

await signOut(auth);
```

**Custom claims (phân quyền admin):** chỉ đặt được từ server bằng Admin SDK.

```javascript
// Server / Cloud Functions
import { getAuth } from "firebase-admin/auth";
await getAuth().setCustomUserClaims(uid, { admin: true });

// Client: đọc claim (ép làm mới token sau khi đổi)
const token = await auth.currentUser.getIdTokenResult(true);
if (token.claims.admin) { /* hiện trang admin */ }
```

- `auth.currentUser` là `null` ngay khi trang vừa tải; chờ callback đầu tiên của `onAuthStateChanged`.
- Gọi `unsubscribe()` khi component unmount để tránh rò rỉ bộ nhớ.
- `uid` là khóa để liên kết user với dữ liệu (vd. `users/{uid}`).

## 4. Cloud Firestore

Firestore lưu dữ liệu theo cấu trúc collection → document → (subcollection → document...). Mỗi document tối đa 1 MiB, chứa các field kiểu string, number, boolean, map, array, timestamp, geopoint, reference.

```javascript
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot,
  serverTimestamp, increment, arrayUnion, arrayRemove, deleteField,
  writeBatch, runTransaction,
} from "firebase/firestore";
import { db } from "./firebase";
```

### CRUD

```javascript
// Create: ID tự sinh
const ref = await addDoc(collection(db, "posts"), {
  title: "Hello", authorId: uid, likes: 0, createdAt: serverTimestamp(),
});

// Create/ghi đè với ID chỉ định; merge: true = chỉ cập nhật field gửi lên
await setDoc(doc(db, "users", uid), { name: "Lan" }, { merge: true });

// Read một document
const snap = await getDoc(doc(db, "posts", ref.id));
if (snap.exists()) console.log(snap.id, snap.data());

// Update (document phải tồn tại)
await updateDoc(doc(db, "posts", id), {
  likes: increment(1),
  tags: arrayUnion("firebase"),
  "author.name": "Lan",      // field lồng nhau dùng dấu chấm
  draft: deleteField(),
});

// Delete (KHÔNG tự xóa subcollection)
await deleteDoc(doc(db, "posts", id));
```

### Query

```javascript
const q = query(
  collection(db, "posts"),
  where("authorId", "==", uid),
  where("likes", ">=", 10),
  orderBy("likes", "desc"),
  limit(20)
);
const result = await getDocs(q);
result.forEach((d) => console.log(d.id, d.data()));
```

| Toán tử `where` | Ví dụ |
| --- | --- |
| `==`, `!=` | `where("status", "==", "open")` |
| `<`, `<=`, `>`, `>=` | `where("price", "<", 100)` |
| `in`, `not-in` (tối đa 30 giá trị) | `where("city", "in", ["HCM", "HN"])` |
| `array-contains` | `where("tags", "array-contains", "js")` |
| `array-contains-any` | `where("tags", "array-contains-any", ["js", "ts"])` |

- Query kết hợp nhiều field (vd. `where` + `orderBy` khác field) cần **composite index**: lỗi trả về có sẵn link tạo index, bấm vào là xong.
- Dùng `or()` / `and()` cho điều kiện OR; `getCountFromServer(q)` để đếm mà không tải document.
- Collection group query: `query(collectionGroup(db, "comments"), ...)` tìm trong mọi subcollection cùng tên.

### Realtime listener

```javascript
const unsub = onSnapshot(q, (snapshot) => {
  snapshot.docChanges().forEach((change) => {
    // change.type: "added" | "modified" | "removed"
    console.log(change.type, change.doc.data());
  });
}, (err) => console.error(err));
// unsub() khi không cần nữa
```

### Pagination

```javascript
const first = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(10)));
const last = first.docs[first.docs.length - 1];
const next = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(last), limit(10)));
```

Tránh `offset` kiểu SQL: Firestore vẫn tính phí đọc các document bị bỏ qua.

### Batch và transaction

```javascript
// Batch: tối đa 500 thao tác ghi, thành công hoặc thất bại cùng nhau
const batch = writeBatch(db);
batch.set(doc(db, "logs", "a"), { ok: true });
batch.update(doc(db, "posts", id), { likes: increment(1) });
batch.delete(doc(db, "drafts", id));
await batch.commit();

// Transaction: đọc rồi ghi dựa trên giá trị đã đọc (tự retry khi xung đột)
await runTransaction(db, async (tx) => {
  const s = await tx.get(doc(db, "accounts", "A"));
  const balance = s.data().balance;
  if (balance < 100) throw new Error("Không đủ số dư");
  tx.update(doc(db, "accounts", "A"), { balance: balance - 100 });
  tx.update(doc(db, "accounts", "B"), { balance: increment(100) });
});
```

Trong transaction, mọi lệnh `get` phải đứng trước mọi lệnh ghi.

## 5. Realtime Database

Dùng Realtime Database khi cần đồng bộ trạng thái nhỏ, thay đổi liên tục (presence online/offline, typing indicator, game nhiều người); còn lại ưu tiên Firestore.

```javascript
import { getDatabase, ref, set, push, get, update, remove, onValue, onDisconnect } from "firebase/database";
const rtdb = getDatabase(app);

await set(ref(rtdb, `users/${uid}`), { name: "Lan", online: true });
const newRef = push(ref(rtdb, "messages"));          // ID tự sinh
await set(newRef, { text: "Hi", at: Date.now() });
const snap = await get(ref(rtdb, `users/${uid}`));
await update(ref(rtdb), { [`users/${uid}/online`]: false, [`stats/count`]: 5 }); // multi-path update
await remove(ref(rtdb, `messages/${id}`));
onValue(ref(rtdb, "messages"), (s) => console.log(s.val()));

// Presence: tự đặt offline khi mất kết nối
onDisconnect(ref(rtdb, `users/${uid}/online`)).set(false);
```

| Tiêu chí | Firestore | Realtime Database |
| --- | --- | --- |
| Mô hình | Collection / document | Một cây JSON |
| Query | Nhiều điều kiện, sắp xếp, index | Một `orderBy` + lọc đơn giản |
| Tính phí | Theo số lần đọc/ghi/xóa | Theo dung lượng lưu và băng thông |
| Mở rộng | Tự động | Chia nhiều instance khi lớn |
| Phù hợp | Đa số app | Presence, dữ liệu nhỏ đổi liên tục |

## 6. Cloud Storage

Lưu file theo đường dẫn; quy ước tốt là `users/{uid}/...` để rule phân quyền dễ viết. Lưu URL hoặc path của file vào Firestore, không lưu file vào Firestore.

```javascript
import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject, getMetadata, listAll } from "firebase/storage";
import { storage } from "./firebase";

const fileRef = ref(storage, `users/${uid}/avatar.jpg`);

// Upload đơn giản
await uploadBytes(fileRef, file, { contentType: file.type });
const url = await getDownloadURL(fileRef);

// Upload có thanh tiến trình, tạm dừng/tiếp tục
const task = uploadBytesResumable(fileRef, file);
task.on("state_changed",
  (s) => console.log((s.bytesTransferred / s.totalBytes) * 100 + "%"),
  (err) => console.error(err),
  async () => console.log(await getDownloadURL(task.snapshot.ref))
);
// task.pause(); task.resume(); task.cancel();

const meta = await getMetadata(fileRef);          // size, contentType, timeCreated
const { items } = await listAll(ref(storage, `users/${uid}`));
await deleteObject(fileRef);
```

Resize/nén ảnh nên làm ở client trước khi upload hoặc bằng extension "Resize Images" để giảm băng thông.

## 7. Security Rules

Rules là lớp bảo mật duy nhất giữa client và dữ liệu: không bao giờ để `allow read, write: if true` khi lên production. Rules không phải bộ lọc: query phải tự giới hạn đúng phạm vi rule cho phép, nếu không sẽ bị từ chối cả query.

### Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }
    function isAdmin() { return signedIn() && request.auth.token.admin == true; }

    // Hồ sơ: chỉ chủ sở hữu đọc/ghi
    match /users/{uid} {
      allow read, write: if isOwner(uid);
    }

    // Bài viết: ai cũng đọc, chỉ tác giả sửa, kiểm tra dữ liệu
    match /posts/{postId} {
      allow read: if true;
      allow create: if signedIn()
        && request.resource.data.authorId == request.auth.uid
        && request.resource.data.title is string
        && request.resource.data.title.size() <= 200;
      allow update: if isOwner(resource.data.authorId)
        && request.resource.data.diff(resource.data).affectedKeys().hasOnly(['title', 'body']);
      allow delete: if isOwner(resource.data.authorId) || isAdmin();

      match /comments/{commentId} {
        allow read: if true;
        allow create: if signedIn();
      }
    }
  }
}
```

| Biến | Ý nghĩa |
| --- | --- |
| `request.auth` | Thông tin user đang gọi (`uid`, `token`) hoặc `null` |
| `resource.data` | Dữ liệu hiện có trong DB |
| `request.resource.data` | Dữ liệu sau khi ghi (nếu được phép) |
| `get()` / `exists()` | Đọc document khác trong rule (tính phí đọc) |
| `read` = `get` + `list`; `write` = `create` + `update` + `delete` | Tách nhỏ để kiểm soát chặt hơn |

### Storage

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /users/{uid}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == uid
        && request.resource.size < 5 * 1024 * 1024
        && request.resource.contentType.matches('image/.*');
    }
  }
}
```

Kiểm thử rules bằng Rules Playground trong Console, hoặc tự động bằng Emulator kèm thư viện `@firebase/rules-unit-testing`. Deploy: `firebase deploy --only firestore:rules,storage`.

## 8. Cloud Functions

Dùng Functions cho logic không được tin client: thanh toán, gửi email, đặt custom claims, tính toán tổng hợp. Ví dụ dưới dùng API thế hệ 2 (`firebase-functions/v2`) và Admin SDK, bỏ qua Security Rules.

```javascript
// functions/index.js
import { onRequest, onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated, onDocumentUpdated } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

initializeApp();
const db = getFirestore();

// 1. HTTP endpoint
export const hello = onRequest({ region: "asia-southeast1", cors: true }, (req, res) => {
  res.json({ msg: "Xin chào" });
});

// 2. Callable: tự xác thực user
export const addPoints = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Cần đăng nhập");
  await db.doc(`users/${request.auth.uid}`).update({ points: FieldValue.increment(request.data.n) });
  return { ok: true };
});

// 3. Trigger Firestore
export const onPostCreated = onDocumentCreated("posts/{postId}", async (event) => {
  const post = event.data.data();
  await db.doc(`users/${post.authorId}`).update({ postCount: FieldValue.increment(1) });
});

// 4. Chạy theo lịch
export const cleanup = onSchedule("every day 03:00", async () => { /* xóa dữ liệu cũ */ });
```

```javascript
// Client gọi callable
import { getFunctions, httpsCallable } from "firebase/functions";
const addPoints = httpsCallable(getFunctions(app, "asia-southeast1"), "addPoints");
const { data } = await addPoints({ n: 10 });
```

- Biến môi trường bí mật: `defineSecret("STRIPE_KEY")` và `firebase functions:secrets:set STRIPE_KEY`.
- Trigger phải **idempotent** (chạy lại không gây sai), vì một sự kiện có thể được gửi hơn một lần.
- Tránh vòng lặp vô hạn: trigger `onDocumentUpdated` mà lại ghi vào chính document đó.
- Chọn region gần user (vd. `asia-southeast1` Singapore) để giảm độ trễ; `minInstances: 1` giảm cold start nhưng tốn phí.
- Deploy: `firebase deploy --only functions` hoặc `--only functions:addPoints`; xem log: `firebase functions:log`.

## 9. Hosting, Emulator và CLI

### Emulator Suite: luôn phát triển trên local trước

```javascript
import { connectAuthEmulator } from "firebase/auth";
import { connectFirestoreEmulator } from "firebase/firestore";
import { connectStorageEmulator } from "firebase/storage";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";

if (location.hostname === "localhost") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099");
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectStorageEmulator(storage, "127.0.0.1", 9199);
  connectFunctionsEmulator(getFunctions(app), "127.0.0.1", 5001);
}
```

Emulator UI chạy tại `http://127.0.0.1:4000`, xem và sửa dữ liệu giả lập, không tốn phí và không đụng dữ liệu thật.

### Hosting

```json
// firebase.json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/node_modules/**"],
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

Rewrite `**` → `/index.html` cần cho SPA (React, Vue) để F5 không bị 404. Với Next.js/SSR có thể cân nhắc Firebase App Hosting.

### Lệnh CLI hay dùng

| Lệnh | Tác dụng |
| --- | --- |
| `firebase login` / `logout` | Đăng nhập CLI |
| `firebase init` | Tạo cấu hình cho thư mục |
| `firebase use --add` | Thêm alias project (dev, prod) |
| `firebase use prod` | Chuyển project đang dùng |
| `firebase emulators:start` | Chạy emulator |
| `firebase emulators:start --import=./seed --export-on-exit` | Giữ dữ liệu emulator giữa các lần chạy |
| `firebase deploy` | Deploy tất cả |
| `firebase deploy --only hosting` | Chỉ deploy hosting |
| `firebase hosting:channel:deploy preview` | Tạo link preview tạm thời |
| `firebase functions:log` | Xem log functions |
| `firebase firestore:indexes` | Xuất cấu hình index hiện tại |

## 10. Nâng cao

### Data modeling cho Firestore

Thiết kế theo cách màn hình sẽ đọc dữ liệu, không theo bảng SQL. Chấp nhận trùng lặp dữ liệu (denormalize) để mỗi màn hình chỉ cần 1–2 query.

| Tình huống | Cách lưu |
| --- | --- |
| Dữ liệu nhỏ, luôn đọc cùng cha (địa chỉ, cài đặt) | Map lồng trong document |
| Danh sách có thể lớn (comment, tin nhắn) | Subcollection |
| Quan hệ nhiều-nhiều (user ↔ group) | Collection nối `memberships/{uid_groupId}` hoặc mảng `memberIds` + `array-contains` |
| Hiển thị tên tác giả trên bài viết | Copy `authorName` vào post, dùng Function cập nhật khi tên đổi |
| Đếm like, số bài | `increment()`; tần suất ghi rất cao thì dùng distributed counter |
| Tìm kiếm full-text | Extension Algolia / Typesense / Elastic, Firestore không hỗ trợ |

### Tối ưu chi phí và hiệu năng

- Mỗi document trả về = 1 lượt đọc; luôn `limit()` và phân trang.
- Gỡ `onSnapshot` khi không dùng; listener mở lại sau 30 phút offline bị tính đọc lại toàn bộ.
- Bật cache offline: `initializeFirestore(app, { localCache: persistentLocalCache() })`.
- Tránh ghi liên tục vào một document (khuyến nghị khoảng 1 lần/giây mỗi document).
- Tránh ID tăng dần tuần tự và field timestamp được index khi ghi khối lượng rất lớn (hotspot).
- Đặt Budget alert trong Google Cloud Billing; dùng TTL policy để tự xóa dữ liệu tạm.

### App Check

Xác minh request đến từ app thật (reCAPTCHA Enterprise cho web, Play Integrity cho Android, App Attest cho iOS), chặn script gọi trực tiếp bằng `apiKey`.

```javascript
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
initializeAppCheck(app, {
  provider: new ReCaptchaEnterpriseProvider("SITE_KEY"),
  isTokenAutoRefreshEnabled: true,
});
```

Bật chế độ theo dõi trước, xem tỉ lệ request hợp lệ, rồi mới bật Enforcement.

### Cloud Messaging (push notification)

```javascript
import { getMessaging, getToken, onMessage } from "firebase/messaging";
const messaging = getMessaging(app);
const token = await getToken(messaging, { vapidKey: "VAPID_KEY" }); // lưu token vào users/{uid}
onMessage(messaging, (payload) => console.log("Foreground:", payload));
// Background: cần file public/firebase-messaging-sw.js

// Server gửi
import { getMessaging as adminMessaging } from "firebase-admin/messaging";
await adminMessaging().send({ token, notification: { title: "Chào", body: "Bạn có tin mới" } });
```

### Analytics và Remote Config

```javascript
import { getAnalytics, logEvent } from "firebase/analytics";
logEvent(getAnalytics(app), "purchase", { value: 99000, currency: "VND" });

import { getRemoteConfig, fetchAndActivate, getValue } from "firebase/remote-config";
const rc = getRemoteConfig(app);
rc.defaultConfig = { new_checkout: false };
await fetchAndActivate(rc);
if (getValue(rc, "new_checkout").asBoolean()) { /* bật tính năng mới */ }
```

### Best practices khi lên production

- [ ] Tách project `dev` và `prod`, chuyển bằng `firebase use`.
- [ ] Rules đã khóa chặt, có test tự động trên Emulator.
- [ ] App Check đã bật Enforcement.
- [ ] Index cần thiết nằm trong `firestore.indexes.json` và được deploy cùng code.
- [ ] Budget alert và giới hạn `maxInstances` cho Functions.
- [ ] Backup Firestore định kỳ (scheduled export hoặc PITR).
- [ ] CI/CD deploy bằng GitHub Actions (`firebase init hosting:github`).

## 11. Lỗi thường gặp và lộ trình luyện tập

| Lỗi | Nguyên nhân | Cách sửa |
| --- | --- | --- |
| `permission-denied` / `Missing or insufficient permissions` | Rules chặn, hoặc query rộng hơn rule cho phép | Thêm `where` khớp với rule; kiểm tra bằng Rules Playground |
| `failed-precondition: The query requires an index` | Query nhiều field chưa có composite index | Bấm link trong thông báo lỗi để tạo index |
| `auth.currentUser` là `null` sau khi F5 | Auth chưa khôi phục session xong | Chờ `onAuthStateChanged` |
| `auth/unauthorized-domain` | Domain chưa được thêm | Console → Authentication → Settings → Authorized domains |
| `No document to update` | `updateDoc` trên document chưa tồn tại | Dùng `setDoc(..., { merge: true })` |
| Function báo lỗi CORS | Gọi `onRequest` từ trình duyệt | Thêm `cors: true` hoặc chuyển sang `onCall` |
| Hóa đơn tăng vọt | Listener vòng lặp, query không `limit`, trigger tự gọi lại | Kiểm tra Usage tab, đặt budget alert |
| Subcollection vẫn còn sau khi xóa cha | `deleteDoc` không xóa đệ quy | `firebase firestore:delete --recursive` hoặc Admin SDK `recursiveDelete` |

### Lộ trình luyện tập 4 tuần

1. Tuần 1: Setup, Auth (email + Google), Firestore CRUD. Dự án: app ghi chú cá nhân.
2. Tuần 2: Query, realtime listener, pagination, Storage. Dự án: blog có ảnh và comment.
3. Tuần 3: Security Rules, Emulator, test rules. Dự án: khóa chặt blog tuần 2.
4. Tuần 4: Cloud Functions, Hosting, FCM, App Check. Dự án: app chat realtime có push notification, deploy lên Hosting.

Tài liệu: [Firebase Docs](https://firebase.google.com/docs), [Firebase YouTube](https://www.youtube.com/@Firebase), [Codelabs](https://firebase.google.com/codelabs).
