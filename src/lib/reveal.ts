// Cho các phần tử có [data-rv] trượt lên và hiện dần khi cuộn tới (mỗi phần tử một lần).
// Không chạy khi người xem bật giảm chuyển động hoặc trình duyệt thiếu IntersectionObserver:
// khi đó nội dung hiện sẵn, vì chỉ có class `rv-on` trên <html> mới làm chúng ẩn đi.
export function revealOnScroll(root: ParentNode = document) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
  const items = Array.from(root.querySelectorAll<HTMLElement>('[data-rv]'));
  if (!items.length) return;

  // Thứ tự trong cùng một nhóm cha, để các phần tử cạnh nhau hiện lệch nhau một chút
  const seen = new Map<Element | null, number>();
  for (const el of items) {
    const i = seen.get(el.parentElement) ?? 0;
    seen.set(el.parentElement, i + 1);
    el.style.setProperty('--rv-i', String(Math.min(i, 8)));
  }

  document.documentElement.classList.add('rv-on');
  const show = (el: Element) => el.classList.add('rv-in');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        // Hiện cả phần đã nằm phía trên màn hình (nhảy tới bằng anchor), để không có gì bị ẩn mãi
        if (e.isIntersecting || e.boundingClientRect.bottom < 0) {
          show(e.target);
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  );
  items.forEach((el) => io.observe(el));
}
