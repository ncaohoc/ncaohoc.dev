---
title: "Git từ cơ bản đến nâng cao"
description: "Lệnh Git hằng ngày, branch, merge, rebase, hoàn tác, Git LFS và những lưu ý riêng cho repo Unity."
date: 2026-10-13
tags: [Git, LFS, Unity]
---

## 1. Thiết lập & khái niệm cốt lõi

Git quản lý code qua 3 vùng cục bộ và 1 vùng từ xa: **Working directory → Staging (index) → Local repo → Remote**. Hiểu 4 vùng này là hiểu 80% Git.

| Vùng | Là gì | Lệnh đưa vào |
| --- | --- | --- |
| Working directory | File bạn đang sửa | (sửa file) |
| Staging / index | Những thay đổi sẽ vào commit kế tiếp | `git add` |
| Local repo | Lịch sử commit trên máy bạn | `git commit` |
| Remote | Repo trên GitHub/GitLab | `git push` |

**Cấu hình lần đầu (chạy 1 lần/máy):**

```bash
git config --global user.name "Tên Bạn"
git config --global user.email "ban@example.com"
git config --global init.defaultBranch main
git config --global core.editor "code --wait"   # dùng VS Code làm editor
git config --global pull.rebase true             # pull = fetch + rebase, lịch sử sạch hơn
git config --global fetch.prune true             # tự xóa nhánh remote đã bị xóa
git config --global rerere.enabled true          # nhớ cách giải conflict đã làm
git config --global core.autocrlf input          # macOS/Linux; Windows dùng true
git config --list --show-origin                  # xem toàn bộ config
```

**SSH key để push không cần mật khẩu:**

```bash
ssh-keygen -t ed25519 -C "ban@example.com"
cat ~/.ssh/id_ed25519.pub     # copy vào GitHub > Settings > SSH keys
ssh -T git@github.com         # kiểm tra kết nối
```

Thuật ngữ cần nhớ: **HEAD** = commit bạn đang đứng; **branch** = con trỏ di động tới 1 commit; **origin** = tên mặc định của remote; **upstream** = nhánh remote mà nhánh local theo dõi.

## 2. Lệnh cơ bản hằng ngày

Vòng lặp chuẩn: `status` → `add` → `commit` → `push`. Luôn chạy `git status` trước khi làm gì đó.

```bash
# Tạo / lấy repo
git init                         # tạo repo mới trong thư mục hiện tại
git clone <url>                  # tải repo về
git clone --depth 1 <url>        # chỉ lấy commit mới nhất (nhanh, nhẹ)

# Xem trạng thái
git status -sb                   # gọn, kèm tên nhánh
git diff                         # thay đổi chưa stage
git diff --staged                # thay đổi đã stage, sắp commit

# Stage
git add <file>
git add .                        # tất cả trong thư mục hiện tại
git add -p                       # chọn từng đoạn (hunk) — rất nên dùng
git restore --staged <file>      # bỏ khỏi staging, giữ thay đổi

# Commit
git commit -m "feat: add login"
git commit                       # mở editor để viết message dài
git commit --amend               # sửa commit cuối (chưa push)
git commit --amend --no-edit     # thêm file quên vào commit cuối

# Lịch sử
git log --oneline --graph --all  # cây lịch sử trực quan
git log -p <file>                # lịch sử thay đổi của 1 file
git log --author="Tên" --since="2 weeks ago"
git show <commit>                # chi tiết 1 commit
git blame <file>                 # ai sửa dòng nào

# File
git rm <file>                    # xóa và stage việc xóa
git rm --cached <file>           # ngừng theo dõi, giữ file trên đĩa
git mv <cũ> <mới>                 # đổi tên
```

**.gitignore** — tạo ngay khi init repo. Lấy mẫu theo ngôn ngữ/engine tại [github/gitignore](https://github.com/github/gitignore). File đã bị track rồi thì thêm vào .gitignore không có tác dụng — phải `git rm --cached` trước.

## 3. Branch, merge, rebase

Mỗi tính năng/bug làm trên 1 nhánh riêng, không commit thẳng vào `main`.

```bash
# Nhánh
git branch                       # liệt kê nhánh local
git branch -a                    # cả nhánh remote
git branch -vv                   # kèm upstream và ahead/behind
git switch -c feature/login      # tạo + chuyển sang nhánh mới
git switch main                  # chuyển nhánh
git switch -                     # quay lại nhánh trước
git branch -m tên-mới            # đổi tên nhánh hiện tại
git branch -d feature/login      # xóa (đã merge)
git branch -D feature/login      # xóa ép (chưa merge)
git branch --merged main         # nhánh đã merge, dọn được

# Merge
git switch main
git merge feature/login          # fast-forward nếu được
git merge --no-ff feature/login  # luôn tạo merge commit
git merge --squash feature/login # gộp thành 1 thay đổi, tự commit sau
git merge --abort                # hủy merge đang conflict

# Rebase
git switch feature/login
git rebase main                  # đặt commit của nhánh lên đỉnh main
git rebase --continue            # sau khi giải conflict
git rebase --abort               # quay về như trước khi rebase
```

|  | Merge | Rebase |
| --- | --- | --- |
| Lịch sử | Giữ nguyên, có merge commit | Thẳng hàng, không merge commit |
| Viết lại commit | Không | Có (đổi hash) |
| An toàn cho nhánh chung | Có | Không — chỉ rebase nhánh của riêng bạn |
| Dùng khi | Đưa feature vào main | Cập nhật nhánh feature theo main |

**Giải conflict:** mở file, tìm `<<<<<<<`, `=======`, `>>>>>>>`; giữ phần đúng, xóa dấu; rồi `git add <file>` và `git merge --continue` (hoặc `rebase --continue`). Lấy nguyên 1 phía: `git checkout --ours <file>` / `--theirs <file>`. Lưu ý: khi rebase, "ours" và "theirs" bị đảo ngược so với merge.

## 4. Remote & cộng tác

`fetch` chỉ tải về, không đụng code của bạn; `pull` = `fetch` + `merge`/`rebase`. Khi không chắc, hãy `fetch` rồi xem trước.

```bash
# Quản lý remote
git remote -v                              # xem remote
git remote add origin <url>
git remote set-url origin <url-mới>
git remote add upstream <url-repo-gốc>    # khi fork repo người khác

# Đồng bộ
git fetch                                  # tải về, không merge
git fetch --all --prune
git log main..origin/main --oneline        # xem remote có gì mới
git pull                                   # fetch + merge (hoặc rebase nếu đã config)
git pull --rebase

# Đẩy lên
git push -u origin feature/login           # lần đầu: gắn upstream
git push                                   # các lần sau
git push --force-with-lease                # force an toàn sau khi rebase
git push origin --delete feature/login     # xóa nhánh remote
git push --tags                            # đẩy tag

# Tag (đánh dấu phiên bản)
git tag -a v1.0.0 -m "Release 1.0.0"
git tag                                    # liệt kê
git push origin v1.0.0
```

**Quy trình Pull Request (GitHub Flow):**

1. `git switch main && git pull` — lấy main mới nhất.
2. `git switch -c feature/xyz` — tạo nhánh.
3. Commit nhỏ, thường xuyên.
4. `git fetch && git rebase origin/main` — cập nhật trước khi mở PR.
5. `git push -u origin feature/xyz` → mở PR trên GitHub.
6. Review xong → merge (thường là squash merge) → xóa nhánh.

Với CLI GitHub (`gh`): `gh pr create`, `gh pr checkout 123`, `gh pr list`, `gh repo clone owner/repo`.

## 5. Hoàn tác & cứu dữ liệu

Gần như mọi thứ đã commit đều cứu được bằng `git reflog`; thứ mất thật sự là thay đổi chưa bao giờ commit hoặc stash.

| Tình huống | Lệnh | Nguy hiểm? |
| --- | --- | --- |
| Bỏ thay đổi chưa stage của 1 file | `git restore <file>` | Mất thay đổi đó |
| Bỏ stage, giữ thay đổi | `git restore --staged <file>` | Không |
| Sửa message commit cuối | `git commit --amend` | Chỉ khi chưa push |
| Hủy commit cuối, giữ code đã stage | `git reset --soft HEAD~1` | Không |
| Hủy commit cuối, giữ code chưa stage | `git reset HEAD~1` (mặc định --mixed) | Không |
| Hủy commit cuối và xóa luôn code | `git reset --hard HEAD~1` | Có |
| Đảo ngược 1 commit đã push | `git revert <commit>` | Không — tạo commit mới |
| Đưa 1 file về phiên bản cũ | `git restore --source=<commit> <file>` | Mất bản hiện tại |
| Xóa file rác chưa track | `git clean -nd` (xem thử) rồi `git clean -fd` | Có |
| Khôi phục sau reset/rebase nhầm | `git reflog` rồi `git reset --hard HEAD@{n}` | Cẩn thận |
| Khôi phục nhánh lỡ xóa | `git reflog` tìm hash rồi `git branch <tên> <hash>` | Không |

**Stash — cất tạm việc đang làm:**

```bash
git stash push -m "wip: login form"   # cất (kèm tên)
git stash -u                          # cả file chưa track
git stash list
git stash pop                         # lấy ra và xóa khỏi stash
git stash apply stash@{1}             # lấy ra, vẫn giữ trong stash
git stash drop stash@{1}
git stash branch fix/xyz              # tạo nhánh từ stash
```

Quy tắc vàng: đã **push** lên nhánh chung thì dùng `revert`, không dùng `reset`/`amend`/`rebase`.

## 6. Nâng cao

Các lệnh dưới đây viết lại lịch sử hoặc thao tác sâu — làm trên nhánh riêng, và biết cách quay lại bằng `reflog`.

**Interactive rebase — dọn commit trước khi mở PR:**

```bash
git rebase -i HEAD~5
# Trong editor, đổi chữ đầu dòng:
#   pick   = giữ         reword = sửa message
#   squash = gộp vào trên, giữ message   fixup = gộp, bỏ message
#   edit   = dừng lại để sửa   drop = xóa commit

# Mẹo: tạo commit sửa cho commit cũ, rồi tự gộp
git commit --fixup <hash>
git rebase -i --autosquash main
```

**Cherry-pick, bisect, worktree:**

```bash
git cherry-pick <hash>               # chép 1 commit sang nhánh hiện tại
git cherry-pick A^..B                # chép dãy commit từ A đến B

git bisect start                     # tìm commit gây bug bằng tìm kiếm nhị phân
git bisect bad                       # commit hiện tại lỗi
git bisect good v1.0.0               # mốc còn tốt
# ...test rồi gõ good/bad cho đến khi Git chỉ ra commit thủ phạm
git bisect run ./test.sh             # tự động hóa
git bisect reset

git worktree add ../hotfix main      # mở nhánh thứ 2 ở thư mục khác, không cần stash
git worktree list
git worktree remove ../hotfix
```

**Tìm kiếm & so sánh:**

```bash
git log -S "tên_hàm" --oneline       # commit thêm/xóa chuỗi này (pickaxe)
git log -G "regex"                   # commit có diff khớp regex
git log --grep="fix"                 # tìm theo message
git grep "TODO"                      # tìm trong code đang track
git diff main...feature              # thay đổi của feature kể từ lúc tách nhánh
git shortlog -sn                     # thống kê commit theo người
```

**Khác:**

- **Alias** — rút ngắn lệnh hay dùng: `git config --global alias.lg "log --oneline --graph --all --decorate"`, sau đó gõ `git lg`.
- **Hooks** (`.git/hooks/` hoặc công cụ [pre-commit](https://pre-commit.com), Husky) — chạy lint/test tự động trước commit/push.
- **Submodule** — nhúng repo khác: `git submodule add <url> libs/x`, clone kèm `git clone --recurse-submodules`. Khá phiền; cân nhắc package manager trước.
- **Sparse checkout** — chỉ lấy 1 phần repo lớn: `git sparse-checkout set src/game`.
- **Ký commit** — `git config --global gpg.format ssh` + `commit.gpgsign true` để có nhãn Verified trên GitHub.
- **Xóa bí mật lỡ commit khỏi toàn bộ lịch sử** — dùng [git-filter-repo](https://github.com/newren/git-filter-repo), rồi **đổi ngay** key/mật khẩu đó (coi như đã lộ).

## 7. Git LFS & dự án Unity

Git LFS (Large File Storage) lưu file nhị phân lớn (texture, model, audio, video) ngoài repo, chỉ để lại 1 file con trỏ nhỏ — giúp repo game không phình to và clone nhanh.

```bash
git lfs install                          # 1 lần/máy
git lfs track "*.psd" "*.fbx" "*.png" "*.wav"
git add .gitattributes                   # luôn commit file này
git lfs ls-files                         # file đang do LFS quản lý
git lfs migrate import --include="*.psd" --everything   # chuyển file cũ sang LFS (viết lại lịch sử)
git lfs lock Assets/Scenes/Main.unity    # khóa file không merge được khi làm nhóm
git lfs unlock Assets/Scenes/Main.unity
```

**Checklist cho repo Unity:**

- [ ] Dùng mẫu `Unity.gitignore` từ [github/gitignore](https://github.com/github/gitignore/blob/main/Unity.gitignore) — bỏ `Library/`, `Temp/`, `Obj/`, `Build/`, `Logs/`, `UserSettings/`.
- [ ] Commit cả file `.meta` — thiếu `.meta` là mất liên kết giữa asset.
- [ ] Edit > Project Settings > Editor: **Asset Serialization = Force Text**, **Version Control Mode = Visible Meta Files**.
- [ ] Track bằng LFS các đuôi nhị phân: `*.png *.jpg *.psd *.tga *.fbx *.blend *.wav *.mp3 *.ogg *.mp4 *.ttf *.exr`.
- [ ] Cấu hình **UnityYAMLMerge** (Smart Merge, có sẵn trong Unity) làm mergetool cho `.unity` và `.prefab`.
- [ ] Chia nhỏ scene và dùng prefab để 2 người ít khi sửa cùng 1 file.

Lưu ý: GitHub gói miễn phí có hạn mức dung lượng/băng thông LFS khá nhỏ; dự án nhiều asset có thể cân nhắc GitLab, Azure DevOps hoặc tự host (Gitea/Forgejo có hỗ trợ LFS).

## 8. Git GUI

GUI giúp xem lịch sử, stage từng dòng và giải conflict trực quan; nên biết CLI trước để hiểu GUI đang làm gì.

| Công cụ | Nền tảng | Giá | Hợp với |
| --- | --- | --- | --- |
| VS Code (Source Control) + GitLens | Win/Mac/Linux | Miễn phí (GitLens có bản Pro) | Làm việc ngay trong editor, blame inline |
| [Fork](https://git-fork.com) | Win/Mac | Trả phí 1 lần, dùng thử không giới hạn | Nhanh, gọn, interactive rebase kéo-thả |
| [GitKraken](https://www.gitkraken.com) | Win/Mac/Linux | Miễn phí cho repo public, trả phí cho private | Graph đẹp, tích hợp GitHub/GitLab |
| [Sourcetree](https://www.sourcetreeapp.com) | Win/Mac | Miễn phí | Đầy đủ tính năng, hỗ trợ LFS |
| [GitHub Desktop](https://desktop.github.com) | Win/Mac | Miễn phí | Người mới, workflow GitHub đơn giản |
| JetBrains (Rider, IntelliJ…) | Win/Mac/Linux | Theo IDE | Merge tool 3 cột rất tốt; Rider hợp Unity |
| [lazygit](https://github.com/jesseduffield/lazygit) | Terminal | Miễn phí | Giao diện trong terminal, thao tác bằng phím |

Giá và gói có thể thay đổi — kiểm tra trang chủ trước khi mua. Gợi ý: VS Code + GitLens cho hằng ngày, Fork hoặc Rider khi cần giải conflict/rebase phức tạp.

**Dùng VS Code làm diff/merge tool mặc định:**

```bash
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait --merge $REMOTE $LOCAL $BASE $MERGED'
git config --global diff.tool vscode
git config --global difftool.vscode.cmd 'code --wait --diff $LOCAL $REMOTE'
# Dùng: git mergetool / git difftool
```

## 9. Rule, quy ước & mẹo

**Không bao giờ:**

- `git push --force` lên `main` hoặc nhánh người khác đang dùng. Cần force thì dùng `--force-with-lease` trên nhánh của riêng bạn.
- Rebase/amend commit đã push lên nhánh chung.
- Commit mật khẩu, API key, file `.env`, chứng chỉ. Thêm `.env` vào .gitignore từ đầu; dùng `.env.example` để chia sẻ mẫu.
- Commit file build, thư mục phụ thuộc (`node_modules/`, `Library/`, `bin/`, `obj/`).
- Chạy `reset --hard` hoặc `clean -fd` khi chưa xem `git status`.

**Commit message — theo [Conventional Commits](https://www.conventionalcommits.org):**

```text
<type>(<scope>): <mô tả ngắn, thì hiện tại, ≤ 50 ký tự>

<thân: giải thích TẠI SAO, không phải CÁI GÌ>

feat(player): add double jump
fix(shader): correct normal in toon lighting
```

| Type | Dùng khi |
| --- | --- |
| `feat` | Tính năng mới |
| `fix` | Sửa lỗi |
| `refactor` | Sửa cấu trúc, không đổi hành vi |
| `docs` | Tài liệu |
| `test` | Thêm/sửa test |
| `chore` | Việc vặt: config, dependency |
| `perf` | Tối ưu hiệu năng |
| `style` | Format, không đổi logic |

**Đặt tên nhánh:** `feature/<mô-tả>`, `fix/<mô-tả>`, `hotfix/<mô-tả>`, `release/v1.2.0` — chữ thường, nối bằng gạch ngang, có thể kèm số issue (`fix/123-crash-on-load`).

**Thói quen tốt:**

1. Commit nhỏ, mỗi commit 1 ý — dễ review, dễ revert, dễ bisect.
2. `git add -p` thay vì `git add .` để không lỡ commit thứ không muốn.
3. `git diff --staged` trước mỗi lần commit.
4. Pull/rebase từ `main` thường xuyên để conflict nhỏ và sớm.
5. Bảo vệ nhánh `main` trên GitHub (Settings > Branches): bắt buộc PR, cấm force push.
6. Tag mỗi bản release theo [SemVer](https://semver.org): `vMAJOR.MINOR.PATCH`.
7. Xóa nhánh sau khi merge.

**Mẹo nhanh:**

- `git switch -` / `git checkout -` — nhảy qua lại 2 nhánh gần nhất.
- `git log -1 --stat` — xem commit cuối đổi những file nào.
- `git commit -am "msg"` — stage + commit mọi file đã track (không gồm file mới).
- `git diff --word-diff` — so sánh theo từ, hợp với văn bản dài.
- `git config --global help.autocorrect 20` — tự sửa lệnh gõ sai sau 2 giây.
- Bị kẹt trong `vim` lúc commit: nhấn `Esc`, gõ `:wq` rồi Enter (hoặc đổi editor như mục 1).
- "detached HEAD": bạn đang đứng trên 1 commit, không phải nhánh. Muốn giữ việc đã làm: `git switch -c <tên-nhánh-mới>`.
