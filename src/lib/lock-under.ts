// Khoá mọi thứ nằm dưới một lớp phủ (menu điện thoại, sheet...): chỉ lớp trên cùng nhận input.
// Gọi lockUnder(layer) khi lớp mở; nó đặt `inert` lên các anh em của layer ngay dưới <body>
// và trả về hàm mở khoá. Lớp tự lo việc trả focus về phần tử đã mở nó.
export function lockUnder(layer: Element): () => void {
  const top = topLevel(layer);
  const locked: HTMLElement[] = [];
  for (const el of Array.from(document.body.children)) {
    if (el === top || !(el instanceof HTMLElement) || el.inert) continue;
    if (el.tagName === 'SCRIPT' || el.tagName === 'TEMPLATE') continue;
    el.inert = true;
    locked.push(el);
  }
  return () => locked.forEach((el) => (el.inert = false));
}

// Theo dõi một lớp mở/đóng bằng class (ví dụ `.nav.is-open` của kit Taste Skill) và khoá nền theo nó
export function lockWhileClass(layer: Element, openClass: string) {
  let unlock: (() => void) | null = null;
  const sync = () => {
    const open = layer.classList.contains(openClass);
    if (open && !unlock) unlock = lockUnder(layer);
    if (!open && unlock) {
      unlock();
      unlock = null;
    }
  };
  new MutationObserver(sync).observe(layer, { attributes: true, attributeFilter: ['class'] });
  sync();
}

function topLevel(el: Element): Element {
  let node = el;
  while (node.parentElement && node.parentElement !== document.body) node = node.parentElement;
  return node;
}
