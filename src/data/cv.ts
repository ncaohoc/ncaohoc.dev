// Nội dung trang CV, lấy theo bản PDF "Hoc_Nguyen_Unity_Game_Developer_CV".
// Sửa file này để cập nhật CV, không cần đụng tới giao diện.
// Số điện thoại cố ý không đưa lên web (trang công khai). Muốn hiện thì điền vào `phone`.

export const cv = {
  name: 'Học Nguyễn',
  role: 'Unity Game Developer',
  location: 'Binh Thanh, Ho Chi Minh City, Vietnam',
  email: 'ncaohoc1996@gmail.com',
  phone: '',
  website: 'ncaohoc.dev',
  // File PDF trong public/, ví dụ '/cv/Hoc_Nguyen_CV.pdf'. Để trống thì ẩn nút tải.
  // Bản PDF gốc có số điện thoại nằm trong private/ (không commit). Xuất bản không có số rồi mới đưa vào public/.
  pdf: '',
  links: [{ label: 'LinkedIn', href: 'https://www.linkedin.com/in/nguyenhoc96' }],

  summary: [
    'Unity Game Developer with 6+ years of professional experience building games and interactive applications with Unity and C#, from gameplay and architecture to optimization, builds, and maintenance.',
    'At Aviron, developed and owned Unity games and the main application launcher for Android-based fitness devices, built a configurable build module for Android (APK) and iOS targets, and integrated backend APIs, game sockets, and Firebase Crashlytics.',
    'Strong in scalable, reusable code architecture (DI, state machines, data-driven systems), performance optimization for low-spec hardware, game AI, Animation/Animator, shaders, and custom editor tools. Use AI agent tools such as Claude Code and Codex every day to speed up coding, refactoring, debugging, and research, and quickly learn and apply new tools, libraries, and frameworks. Comfortable working independently and taking ownership of features from development to production.',
  ],

  skills: [
    { group: 'Core', items: 'Unity, C#, OOP, Gameplay Development, UI, Application Development' },
    { group: 'Unity', items: 'Addressables, AssetBundle, ScriptableObject, Custom Editor Tools, Physics 2D/3D, Animation & Animator (Animator Controller, state transitions, animation events)' },
    { group: 'Unity DOTS', items: 'Data-Oriented Technology Stack (DOTS), Entity Component System (ECS), C# Job System' },
    { group: 'Performance', items: 'Unity Profiler, Frame Debugger, Object Pooling, Sprite Atlas, Occlusion Culling, low-spec Android optimization' },
    { group: 'Game AI', items: 'Behaviour Tree, State Machine, Boids, Pathfinding, NavMesh' },
    { group: 'Architecture & Patterns', items: 'Dependency Injection, Observer, State, Factory, Command, Object Pool' },
    { group: 'Graphics & VFX', items: 'Unity Shaders (practical experience), Particle System, VFX' },
    { group: 'Libraries', items: 'UniTask (client-side async), VContainer, DOTween, Spine' },
    { group: 'Mobile & Platforms', items: 'Android & iOS builds, Android Studio, Android native integration, Background Services' },
    { group: 'Tools & Process', items: 'Git, GitHub, Bitbucket, REST APIs, Socket integration, Firebase Crashlytics, Agile/Scrum' },
    { group: 'AI Tools', items: 'AI agent tools such as Claude Code and Codex for code generation, refactoring, debugging, documentation, and technical research' },
    { group: 'Fundamentals', items: 'Data Structures & Algorithms' },
    { group: 'Learning & Adaptability', items: 'Quickly learning new tools, libraries, and frameworks and applying them in real projects' },
    { group: 'Problem Solving', items: 'Problem Solving, Critical Thinking, Working Backwards from Desired Outcomes' },
  ],

  experience: [
    {
      company: 'Aviron Active (Active Research Co., Ltd.)',
      title: 'Unity Developer',
      period: 'Sep 2023 – Sep 2026',
      intro:
        "Developed interactive fitness software for Aviron's rowing machines, exercise bikes, and treadmills, combining fitness hardware with game-based experiences.",
      points: [
        'Developed and maintained Unity-based games for Aviron fitness equipment.',
        'Took ownership of developing and maintaining the Unity-based application launcher used as the main interface for accessing games and applications on Aviron devices.',
        'Implemented gameplay features, UI, scene updates, and application functionality based on product requirements.',
        'Built a configurable scene/build module to select scenes for internal-device APK and iOS builds, with an extensible structure for additional targets such as Google Play Android builds.',
        'Implemented client-side API requests and response handling with backend services, and worked on game-socket integration for game-session management.',
        'Debugged, maintained, and optimized Unity applications for dedicated Android-based fitness hardware; used UniTask for client-side asynchronous workflows and resolved client-side async bugs.',
        'Designed dictionary-based event management with duplicate-registration checks to address repeated event subscriptions when entering or exiting games.',
        'Built a device-parameter abstraction with string-key access to device-specific metrics such as RPM, cadence, and strokes per minute, supporting shared games across rowers, bikes, and treadmills.',
        'Designed a friend-list state machine that rebinds a shared scroller and detail panel between friend-search and added-friends views, avoiding duplicated UI logic and cross-controller interference.',
        'Worked with Android native components when required, including background services supporting system-level functionality.',
        'Contributed to an Android Streaming Bar that displays workout metrics while users use third-party streaming applications such as YouTube.',
        'Investigated and resolved technical issues across Unity and Android layers; integrated Firebase Crashlytics to support crash reporting and bug investigation.',
      ],
      links: [
        { label: 'Aviron Interactive – Official YouTube', href: 'https://www.youtube.com/@avironactive' },
        { label: 'Aviron Games – Selected Contributions', href: 'https://shorturl.at/M9KLL' },
      ],
    },
    {
      company: 'EyeClick',
      title: 'Unity Developer',
      period: 'Oct 2020 – Sep 2023',
      intro: '',
      points: [
        'Developed interactive and educational games for children, seniors, and K-12 users across puzzle, simulation, sandbox, and racing genres.',
        'Built reusable gameplay templates for super-casual games, separating core gameplay logic from assets so new game variants could be created by swapping assets while reusing the same codebase.',
        'Implemented game AI including Behaviour Trees, Boids simulation, pathfinding, and obstacle avoidance.',
        'Created lightweight shaders, VFX, and gameplay systems for low-spec hardware.',
        'Profiled and optimized Unity applications using Unity Profiler and Frame Debugger.',
        'Built supporting tools and data-driven features, including custom Editor tools, ScriptableObject/Addressables workflows, and external data loading.',
        'Collaborated with artists and game designers on asset integration, gameplay implementation, maintenance, and bug fixing.',
      ],
      links: [{ label: 'EyeClick – Official YouTube', href: 'https://www.youtube.com/@EyeClick_Ltd' }],
    },
    {
      company: 'Fsoft',
      title: 'Web Developer',
      period: 'Jun 2018 – Sep 2018',
      intro: '',
      points: ['ASP.NET MVC web development.'],
      links: [] as { label: string; href: string }[],
    },
  ],

  education: [{ school: 'Ho Chi Minh City University of Technology', degree: "Bachelor's Degree", period: '2014 – 2020' }],

  languages: [{ name: 'English', level: 'Proficient in reading technical documentation; basic communication' }],
};
