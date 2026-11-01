// Nội dung trang CV. Sửa file này để cập nhật CV, không cần đụng tới giao diện.
// Ô nào để chuỗi rỗng '' sẽ không hiển thị.
// TODO: điền các mục có ghi chú TODO từ CV trong thư mục MyCV.

export const cv = {
  name: 'Nguyễn Lê Cao Học',
  role: 'Unity Game Developer',
  location: 'Ho Chi Minh City, Vietnam',
  email: 'ncaohoc1996@gmail.com',
  website: 'ncaohoc.dev',
  links: [
    { label: 'GitHub', href: '' }, // TODO: link GitHub
    { label: 'LinkedIn', href: '' }, // TODO: link LinkedIn
  ],

  summary:
    'Unity developer focused on gameplay programming. Most recently owned core gameplay for a multi-machine fitness game at Aviron Active. Comfortable designing event-driven systems, refactoring legacy code, and working with Unity Animation. Currently deepening shader skills (HLSL and Shader Graph) and building a 2D horror game on the side.',

  experience: [
    {
      company: 'Aviron Active',
      title: 'Unity Developer', // TODO: kiểm tra chức danh chính xác
      period: '', // TODO: ví dụ 'Mar 2022 – Sep 2026'
      points: [
        'Owned core gameplay for Quest, a multi-machine fitness game built by a team of three Unity developers.',
        'Refactored the MetricAdapter layer that feeds live machine metrics into gameplay.',
        'Designed and built an EventHandler system to decouple game systems from hardware and UI events.',
      ],
    },
    {
      company: 'EyeClick',
      title: 'Unity Developer', // TODO: kiểm tra chức danh chính xác
      period: '', // TODO
      points: [
        // TODO: 2–3 gạch đầu dòng về việc đã làm ở EyeClick
      ] as string[],
    },
  ],

  projects: [
    {
      name: '2D horror game (in progress)',
      href: '/projects/game-kinh-di-2d/',
      text: 'Side-scrolling horror game with a Chinese and Taiwanese folk art style. Solo project in Unity.',
    },
    {
      name: 'Home server',
      href: '/projects/homelab-beelink/',
      text: 'Ubuntu Server on a Beelink mini PC running Docker services, a NAS and a test server for my game.',
    },
  ],

  skills: [
    { group: 'Engine', items: ['Unity', 'C#', 'Animation / Animator', 'URP'] },
    { group: 'Graphics', items: ['HLSL', 'Shader Graph'] },
    { group: 'Tools', items: ['Git', 'Linux', 'Docker', 'Claude Code', 'Codex'] },
  ],

  education: [
    // TODO: { school: '...', degree: '...', period: '...' }
  ] as { school: string; degree: string; period: string }[],

  languages: [
    { name: 'Vietnamese', level: 'Native' },
    { name: 'English', level: '' }, // TODO: trình độ
  ],
};
