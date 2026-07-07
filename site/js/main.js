(() => {
  const root = document.documentElement;
  const body = document.body;
  const isHomePage = body.classList.contains("home-page");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const loader = document.querySelector(".loader");
  let header = document.querySelector(".header");
  let navActions = document.querySelector(".nav__actions");
  let primaryNavigation = document.querySelector("#primary-navigation");
  let menuToggle = document.querySelector(".menu-toggle");
  let languageSwitcher = document.querySelector(".language-switcher");
  let languageToggle = document.querySelector(".language-toggle");
  let languageMenu = document.querySelector(".language-menu");
  const footer = document.querySelector(".footer");
  const currentPath = `${location.pathname.replace(/\/$/, "") || "/"}`;
  const supportedLanguages = [
    { code: "ko", label: "한국어", short: "KO", lang: "ko" },
    { code: "en", label: "English", short: "EN", lang: "en" },
    { code: "ja", label: "日本語", short: "JA", lang: "ja" },
    { code: "zh", label: "中文", short: "ZH", lang: "zh-Hans" },
  ];
  const readStoredLanguage = () => {
    try {
      return localStorage.getItem("divergram-language");
    } catch {
      return null;
    }
  };
  const writeStoredLanguage = (value) => {
    try {
      localStorage.setItem("divergram-language", value);
    } catch {
      // Local storage can be unavailable on some file:// or privacy-restricted contexts.
    }
  };
  const storedLanguage = readStoredLanguage();
  let currentLanguage = supportedLanguages.some((item) => item.code === storedLanguage) ? storedLanguage : "ko";
  const navItems = [
    { href: "./service", label: "서비스 소개", group: "플랫폼" },
    { href: "./service#logbook", label: "디지털 로그북", group: "플랫폼" },
    { href: "./service#education", label: "교육·라이센스", group: "플랫폼" },
    { href: "./about", label: "회사 소개", group: "회사" },
    { href: "./news", label: "뉴스", group: "회사" },
    { href: "./career", label: "채용", group: "회사" },
    { href: "./terms", label: "이용약관", group: "정책" },
    { href: "./privacy", label: "개인정보처리방침", group: "정책" },
    { href: "./security", label: "정보보안정책", group: "정책" },
  ];

  const languageAriaLabels = {
    ko: "현재 언어",
    en: "Current language",
    ja: "現在の言語",
    zh: "当前语言",
  };

  const localizedCopy = {
    ko: {
      header: {
        brandSub: "다이버를 위한 로그북 플랫폼",
        introKicker: "Explore Divergram",
        introTitle: "기록, 교육, 라이센스, 예약을 한 곳에서",
        introDesc: "다이버를 위한 플랫폼을 더 빠르게 탐색하고, 필요한 기능으로 바로 이동하세요.",
        introPrimary: "제휴 문의",
        introSecondary: "로그인",
        miniCards: [
          ["로그북", "피드형 기록"],
          ["교육 연결", "라이센스 관리"],
          ["리조트 예약", "제휴 확장"],
        ],
        groups: [
          { title: "플랫폼", items: ["서비스 소개", "디지털 로그북", "교육·라이센스"] },
          { title: "회사", items: ["회사 소개", "뉴스", "채용"] },
          {
            title: "정책",
            items: ["이용약관", "개인정보처리방침", "위치기반서비스", "청소년보호정책", "정보보안정책", "쿠키정책", "마케팅 정보 수신 동의", "제3자 정보 제공 동의", "개인정보 수집 및 이용 동의", "플랫폼 API 이용약관", "오픈소스 라이선스", "사이트맵"],
          },
        ],
        footerLinks: ["문의하기", "사이트맵", "뉴스룸"],
      },
      footer: {
        topCopy: "다이빙 기록, 교육, 라이센스와 여정을 제품으로 만듭니다.",
        columns: [
          { title: "플랫폼", items: ["서비스 소개", "디지털 로그북", "교육·라이센스", "안전 정책", "제휴 문의"] },
          { title: "회사", items: ["Divergram 소개", "뉴스룸", "채용", "문의하기"] },
          { title: "정책", items: ["이용약관", "개인정보처리방침", "위치기반서비스", "청소년보호정책", "정보보안정책", "쿠키정책", "마케팅 정보 수신 동의", "제3자 정보 제공 동의", "개인정보 수집 및 이용 동의", "플랫폼 API 이용약관", "오픈소스 라이선스", "사이트맵"] },
        ],
        bottomLinks: ["문의하기", "사이트맵"],
      },
      home: {
        meta: {
          title: "Divergram | 모든 다이빙의 기록과 연결",
          description: "Divergram은 스쿠버다이빙과 프리다이빙 유저를 위한 디지털 로그북, 다이빙 피드, 버디 찾기, 포인트 검색, 교육 연결, 라이센스 관리, 리조트 탐색과 예약을 연결하는 다이빙 전문 플랫폼입니다.",
        },
        heroOverline: "Dive logbook and social platform",
        heroTitle: "모든 다이빙을 더 선명하게 기록하다",
        heroLead: "Divergram은 스쿠버다이빙과 프리다이빙 유저를 위한 모바일 로그북입니다. 손으로 쓰던 다이빙 기록을 피드처럼 남기고, 버디와 포인트, 교육 과정, 라이센스, 리조트 예약까지 하나의 흐름으로 연결합니다.",
        heroPrimary: "서비스 살펴보기",
        heroSecondary: "단체·리조트·브랜드 제휴 문의",
        heroFoot: "다이버의 기록, 커뮤니티, 교육, 라이센스, 예약을 위한 하나의 바다",
        institutions: ["Scuba", "Freediving", "Logbook", "License", "Resort"],
        statementOverline: "One ocean, one platform",
        statementTitle: "기록은 더 간편하게. 다이빙 경험은 더 풍부하게.",
        statementCopy: "다이빙이 끝난 뒤 로그북을 꺼내 수기로 적던 과정을 모바일 경험으로 바꿉니다. 수심, 시간, 버디, 포인트, 사진과 영상을 하나의 피드로 남기고, 교육 이수와 라이센스까지 함께 관리해 더 신뢰도 높은 다이빙 프로필을 만듭니다.",
        identityOverline: "For divers",
        identityTitle: "수기로 쓰던 로그북을 감각적인 피드로",
        identityCopy: "다이빙 횟수, 최대 수심, 잠수 시간, 수온, 장비, 버디, 다이빙 포인트를 빠르게 기록합니다. 사진과 짧은 영상, 교육 이력, 라이센스까지 함께 남겨 나만의 다이빙 히스토리를 만듭니다.",
        identityLink: "디지털 로그북 보기",
        institutionOverline: "For agencies, resorts and brands",
        institutionTitle: "교육에서 라이센스, 검색에서 예약까지",
        institutionCopy: "다이빙 단체와 교육기관은 교육 과정과 라이센스를 연결하고, 리조트와 브랜드는 포인트·예약·상품 정보를 소개할 수 있습니다. 다이버가 배우고, 기록하고, 떠나는 전 과정을 하나의 접점으로 만듭니다.",
        institutionLink: "다이빙 단체 제휴 문의",
        featureOverline: "Built for divers",
        featureTitle: "다이버의 하루를 완성하는 기능",
        featureCopy: "기록, 공유, 교육, 라이센스, 탐색, 예약, 쇼핑까지. 다이빙 전후의 모든 순간을 하나의 앱으로 연결합니다.",
        featureTitles: ["피드처럼 남기는 다이빙 로그", "교육 과정과 강사를 연결", "라이센스를 한곳에서 관리", "포인트, 예약, 쇼핑으로 확장"],
        featureCopyItems: ["수심, 시간, 수온, 장비, 버디, 사진과 영상을 한 번에 기록하고 SNS 피드로 공유합니다.", "초급부터 프로 레벨까지 다이빙 교육을 찾고, 강사·단체·리조트와 자연스럽게 연결됩니다.", "단체별 자격, 교육 이수, 스페셜티, 만료일을 정리해 버디·리조트·교육 연결의 신뢰도를 높입니다.", "포인트와 리조트 검색, 교육 예약, 체험 프로그램, 장비와 다이빙 상품까지 연결되는 플랫폼으로 확장합니다."],
        featureLinks: ["디지털 로그북 자세히 보기", "다이빙 교육 연결 자세히 보기", "라이센스 관리 자세히 보기", "예약 및 쇼핑 제휴 자세히 보기"],
        valueOverline: "Designed to grow",
        valueTitle: "다이버의 경험은 기록될수록 커집니다",
        valueStats: ["누적 다이빙 로그 처리 목표", "다이빙 포인트, 교육, 리조트 데이터", "언제든 기록하고 공유하는 모바일 경험", "로그북, SNS, 교육, 라이센스, 탐색, 예약의 통합"],
        valueNote: "* 수치는 Divergram의 제품 로드맵과 운영 목표 기준입니다. 실제 제공 범위는 출시 단계에 따라 달라질 수 있습니다.",
        useOverline: "Use cases",
        useTitle: "다이빙을 즐기는 방식이 하나의 플랫폼으로",
        useCta: "제휴와 입점 문의하기",
        useTitles: ["다이빙 로그를 모바일 피드로 기록", "수심과 컨디션을 감각적으로 아카이빙", "교육 과정과 라이센스를 다이버 프로필에 연결", "예약과 상품을 관심 있는 다이버에게"],
        trustOverline: "Divergram trust",
        trustTitle: "다이빙 기록은 신뢰 위에서 연결됩니다",
        trustCopy: "로그북, 교육, 라이센스, 리조트, 버디 정보는 서로 연결될 때 더 정확해집니다. Divergram은 기록의 정합성, 공유 범위, 파트너 연동을 명확하게 설계해 다이버와 기관이 같은 기준으로 협업할 수 있게 합니다.",
        trustButton: "연결 구조 보기",
        trustLayers: ["로그 정합성", "교육·라이센스", "공유 범위", "파트너 협업"],
        trustLayerCopies: ["한 번의 다이빙이 하나의 기록으로 남도록", "기관 정보와 다이버 프로필을 자연스럽게 연결", "피드, 버디, 단체 공개를 세밀하게 제어", "리조트와 브랜드 운영을 하나로 연결"],
        newsOverline: "What’s new",
        newsTitle: "Divergram의 새로운 소식",
        newsCta: "전체 소식 보기",
        newsTitles: ["모바일 로그북과 다이빙 피드 설계 공개", "다이버가 포인트를 선택하는 방식", "버디 찾기와 안전한 커뮤니티"],
        newsCopies: ["수기 로그북의 감성과 SNS 피드 경험을 연결한 제품 방향을 소개합니다.", "수심, 시즌, 리뷰, 버디 경험이 검색 UX에서 왜 중요한지 정리했습니다.", "신뢰할 수 있는 다이빙 모임을 만들기 위한 커뮤니티 원칙을 소개합니다."],
        finalPre: "READY TO DIVE?",
        finalTitle: "다이버가 기록하고 발견하고 다시 떠나는 모든 순간을 연결하세요.",
        finalButton: "제휴 문의하기",
        finalLink: "서비스 자세히 보기",
      },
    },
    en: {
      header: {
        brandSub: "Dive logbook platform",
        introKicker: "Explore Divergram",
        introTitle: "Record, education, license, and booking in one place",
        introDesc: "Browse the diver journey faster and jump straight to the tools you need.",
        introPrimary: "Partnership inquiry",
        introSecondary: "Log in",
        miniCards: [["Logbook", "Feed-style records"], ["Education", "License management"], ["Resort booking", "Partner growth"]],
        groups: [
          { title: "Platform", items: ["Service overview", "Digital logbook", "Education & license"] },
          { title: "Company", items: ["About Divergram", "News", "Careers"] },
          { title: "Policies", items: ["Terms of use", "Privacy policy", "Location-based service terms", "Youth protection policy", "Security policy", "Cookie policy", "Marketing consent", "Third-party data consent", "Personal data collection consent", "Open API terms", "Open source licenses", "Sitemap"] },
        ],
        footerLinks: ["Contact", "Sitemap", "Newsroom"],
      },
      footer: {
        topCopy: "We turn dive logs, education, licenses, and journeys into products.",
        columns: [
          { title: "Platform", items: ["Service overview", "Digital logbook", "Education & license", "Safety policy", "Partnership inquiry"] },
          { title: "Company", items: ["About Divergram", "Newsroom", "Careers", "Contact"] },
          { title: "Policies", items: ["Terms of use", "Privacy policy", "Location-based service terms", "Youth protection policy", "Security policy", "Cookie policy", "Marketing consent", "Third-party data consent", "Personal data collection consent", "Open API terms", "Open source licenses", "Sitemap"] },
        ],
        bottomLinks: ["Contact", "Sitemap"],
      },
      home: {
        meta: { title: "Divergram | Record and connect every dive", description: "Divergram is a dive-focused platform that connects digital logbooks, dive feeds, buddy search, point discovery, education, license management, resort discovery, and booking for scuba and freedive users." },
        heroOverline: "Dive logbook and social platform",
        heroTitle: "Record every dive more clearly",
        heroLead: "Divergram is a mobile logbook for scuba and freedive users. Turn handwritten dive logs into a feed, and connect buddies, dive points, courses, licenses, and resort bookings in one flow.",
        heroPrimary: "Explore the service",
        heroSecondary: "Partnership inquiry",
        heroFoot: "One ocean for records, community, education, licenses, and booking",
        institutions: ["Scuba", "Freediving", "Logbook", "License", "Resort"],
        statementOverline: "One ocean, one platform",
        statementTitle: "Logging is simpler. Dive experiences are richer.",
        statementCopy: "Turn the end-of-dive logbook ritual into a modern mobile experience. Record depth, time, buddies, points, photos, and video in one feed while managing education and licenses together for a more trustworthy dive profile.",
        identityOverline: "For divers",
        identityTitle: "From handwritten logbook to a vibrant feed",
        identityCopy: "Record dive count, max depth, bottom time, water temperature, gear, buddies, and dive points quickly. Add photos, short clips, education history, and licenses to build your personal dive story.",
        identityLink: "View digital logbook",
        institutionOverline: "For agencies, resorts and brands",
        institutionTitle: "From education to licenses, from search to booking",
        institutionCopy: "Dive agencies and schools can connect courses and licenses, while resorts and brands can showcase points, bookings, and product information. It brings the whole diver journey into one touchpoint.",
        institutionLink: "Partnership inquiry",
        featureOverline: "Built for divers",
        featureTitle: "Everything your dive day needs",
        featureCopy: "Records, sharing, education, licenses, discovery, booking, and shopping. One app for every moment before and after the dive.",
        featureTitles: ["Log dives like a feed", "Connect courses and instructors", "Manage certifications in one place", "Expand into points, bookings, and shopping"],
        featureCopyItems: ["Capture depth, time, temperature, gear, buddies, photos, and video, then share them as a social feed.", "Find dive education from beginner to pro level and connect naturally with instructors, agencies, and resorts.", "Organize agency-specific qualifications, education credits, specialties, and expiry dates in one trusted profile.", "Grow into a platform that connects dive points, resort searches, lesson bookings, and dive gear shopping."],
        featureLinks: ["Explore digital logbook", "Explore education connections", "Explore license management", "Explore booking & commerce"],
        valueOverline: "Designed to grow",
        valueTitle: "A diver's experience grows with every record",
        valueStats: ["target dive logs processed", "dive points, education, and resort data", "mobile experience for anytime sharing", "logbook, social, education, license, discovery, and booking in one"],
        valueNote: "* The figures reflect Divergram's product roadmap and operational targets. Actual availability may change by release phase.",
        useOverline: "Use cases",
        useTitle: "Dive the way you love, on one platform",
        useCta: "Partnership and onboarding inquiry",
        useTitles: ["Log dives in a mobile feed", "Archive depth and conditions beautifully", "Connect courses and licenses to diver profiles", "Reach interested divers with bookings and products"],
        trustOverline: "Divergram trust",
        trustTitle: "Dive records are connected on trust",
        trustCopy: "Logbooks, education, licenses, resorts, and buddy data become more accurate when they are connected. Divergram is designed around data integrity, sharing scope, and partner integration so divers and organizations can collaborate on the same standard.",
        trustButton: "See the connection model",
        trustLayers: ["Log integrity", "Education & license", "Sharing scope", "Partner collaboration"],
        trustLayerCopies: ["So each dive becomes one trusted record", "Connect agency data with diver profiles", "Control feed, buddy, and group visibility with precision", "Unify resort and brand operations"],
        newsOverline: "What’s new",
        newsTitle: "Latest from Divergram",
        newsCta: "See all updates",
        newsTitles: ["Introducing the mobile logbook and dive feed", "How divers choose a point", "Buddy search and safer communities"],
        newsCopies: ["See the product direction that connects handwritten logbook emotion with a modern social feed experience.", "We break down why depth, season, reviews, and buddy experience matter in search UX.", "Our community principles for building trusted dive meetups."],
        finalPre: "READY TO DIVE?",
        finalTitle: "Connect every moment of the diver journey - record, discover, and go again.",
        finalButton: "Contact us",
        finalLink: "See the service",
      },
    },
    ja: {
      header: {
        brandSub: "ダイブログブックプラットフォーム",
        introKicker: "Explore Divergram",
        introTitle: "記録、教育、ライセンス、予約をひとつに",
        introDesc: "ダイバー向けの機能を素早く探し、必要な場所へすぐ移動できます。",
        introPrimary: "提携のお問い合わせ",
        introSecondary: "ログイン",
        miniCards: [["ログブック", "フィード型の記録"], ["教育連携", "ライセンス管理"], ["リゾート予約", "パートナー拡張"]],
        groups: [
          { title: "プラットフォーム", items: ["サービス概要", "デジタルログブック", "教育・ライセンス"] },
          { title: "会社", items: ["会社紹介", "ニュース", "採用"] },
          { title: "ポリシー", items: ["利用規約", "プライバシーポリシー", "位置情報サービス利用規約", "青少年保護ポリシー", "情報セキュリティポリシー", "Cookieポリシー", "マーケティング情報受信同意", "第三者情報提供同意", "個人情報収集・利用同意", "Open API利用規約", "オープンソースライセンス", "サイトマップ"] },
        ],
        footerLinks: ["お問い合わせ", "サイトマップ", "ニュースルーム"],
      },
      footer: {
        topCopy: "ダイブログブック、教育、ライセンス、旅をプロダクトに変えます。",
        columns: [
          { title: "プラットフォーム", items: ["サービス概要", "デジタルログブック", "教育・ライセンス", "安全ポリシー", "提携のお問い合わせ"] },
          { title: "会社", items: ["Divergramについて", "ニュースルーム", "採用", "お問い合わせ"] },
          { title: "ポリシー", items: ["利用規約", "プライバシーポリシー", "位置情報サービス利用規約", "青少年保護ポリシー", "情報セキュリティポリシー", "Cookieポリシー", "マーケティング情報受信同意", "第三者情報提供同意", "個人情報収集・利用同意", "Open API利用規約", "オープンソースライセンス", "サイトマップ"] },
        ],
        bottomLinks: ["お問い合わせ", "サイトマップ"],
      },
      home: {
        meta: { title: "Divergram | すべてのダイブを記録してつなぐ", description: "Divergramは、スキューバダイバーとフリーダイバーのためのデジタルログブック、ダイブフィード、バディ検索、ポイント検索、教育連携、ライセンス管理、リゾート検索と予約をつなぐダイビング専用プラットフォームです。" },
        heroOverline: "Dive logbook and social platform",
        heroTitle: "すべてのダイブをより鮮明に記録する",
        heroLead: "Divergramは、スキューバダイビングとフリーダイビングのユーザー向けのモバイルログブックです。手書きの記録をフィードのように残し、バディ、ポイント、教育、ライセンス、リゾート予約まで一連でつなぎます。",
        heroPrimary: "サービスを見る",
        heroSecondary: "団体・リゾート・ブランド提携",
        heroFoot: "記録、コミュニティ、教育、ライセンス、予約のためのひとつの海",
        institutions: ["Scuba", "Freediving", "Logbook", "License", "Resort"],
        statementOverline: "One ocean, one platform",
        statementTitle: "記録はもっと簡単に。ダイブ体験はもっと豊かに。",
        statementCopy: "ダイブ後にログブックへ書き込む手間を、モバイル体験へと変えます。水深、時間、バディ、ポイント、写真、動画をひとつのフィードに残し、教育履歴とライセンスも一緒に管理できます。",
        identityOverline: "For divers",
        identityTitle: "手書きのログブックを、感覚的なフィードへ",
        identityCopy: "ダイブ回数、最大水深、潜水時間、水温、装備、バディ、ポイントを素早く記録。写真や短い動画、教育履歴、ライセンスも一緒に残して、自分だけのダイビングヒストリーを作ります。",
        identityLink: "デジタルログブックを見る",
        institutionOverline: "For agencies, resorts and brands",
        institutionTitle: "教育からライセンス、検索から予約まで",
        institutionCopy: "ダイビング団体と教育機関はコースとライセンスをつなぎ、リゾートとブランドはポイント・予約・商品情報を紹介できます。学ぶ・記録する・旅立つ、その全工程をひとつの接点にまとめます。",
        institutionLink: "団体提携のお問い合わせ",
        featureOverline: "Built for divers",
        featureTitle: "ダイバーの一日を完成させる機能",
        featureCopy: "記録、共有、教育、ライセンス、検索、予約、ショッピングまで。ダイブ前後のすべてをひとつのアプリでつなぎます。",
        featureTitles: ["フィードのように残すダイブログ", "コースとインストラクターをつなぐ", "資格をひとつに管理", "ポイント、予約、ショッピングへ拡張"],
        featureCopyItems: ["水深、時間、水温、装備、バディ、写真、動画をまとめて記録し、SNSフィードのように共有します。", "入門からプロまでの教育を探し、インストラクター、団体、リゾートにつなげます。", "団体ごとの資格、教育履歴、スペシャルティ、有効期限をひとつの信頼できるプロフィールで整理します。", "ダイブポイント、リゾート検索、レッスン予約、ダイビング用品のショッピングまで広げます。"],
        featureLinks: ["デジタルログブックを見る", "教育連携を見る", "ライセンス管理を見る", "予約とコマースを見る"],
        valueOverline: "Designed to grow",
        valueTitle: "記録するほど、ダイバーの体験は大きくなる",
        valueStats: ["累計ダイブログ処理目標", "ダイブポイント、教育、リゾートデータ", "いつでも記録して共有できるモバイル体験", "ログブック、SNS、教育、ライセンス、検索、予約を統合"],
        valueNote: "* 数値は Divergram の製品ロードマップと運営目標に基づきます。実際の提供範囲はリリース段階によって変わる場合があります。",
        useOverline: "Use cases",
        useTitle: "ダイビングを楽しむ方法が、ひとつのプラットフォームに",
        useCta: "提携と掲載のお問い合わせ",
        useTitles: ["ダイブログをモバイルフィードで記録", "水深とコンディションを美しくアーカイブ", "コースとライセンスをプロフィールに接続", "予約や商品を興味のあるダイバーへ"],
        trustOverline: "Divergram trust",
        trustTitle: "ダイブログは信頼の上でつながる",
        trustCopy: "ログブック、教育、ライセンス、リゾート、バディ情報は、つながるほど正確になります。Divergramは記録の整合性、共有範囲、パートナー連携を明確に設計し、ダイバーと組織が同じ基準で協力できるようにします。",
        trustButton: "接続構造を見る",
        trustLayers: ["ログ整合性", "教育・ライセンス", "共有範囲", "パートナー連携"],
        trustLayerCopies: ["ひとつのダイブがひとつの記録として残るように", "団体情報とダイバーのプロフィールを自然に接続", "フィード、バディ、グループ公開を細かく制御", "リゾートとブランド運営をひとつに"],
        newsOverline: "What’s new",
        newsTitle: "Divergramの最新情報",
        newsCta: "すべての更新を見る",
        newsTitles: ["モバイルログブックとダイブフィードを公開", "ダイバーはどうポイントを選ぶのか", "バディ検索と安全なコミュニティ"],
        newsCopies: ["手書きログブックの感性とSNSフィード体験をつなぐプロダクト方針を紹介します。", "水深、季節、レビュー、バディ体験が検索UXで重要な理由を整理しました。", "信頼できるダイブコミュニティを作るための原則を紹介します。"],
        finalPre: "READY TO DIVE?",
        finalTitle: "ダイバーが記録し、見つけ、また海へ向かうすべての瞬間をつなげよう。",
        finalButton: "提携のお問い合わせ",
        finalLink: "サービスの詳細を見る",
      },
    },
    zh: {
      header: {
        brandSub: "潜水日志平台",
        introKicker: "Explore Divergram",
        introTitle: "记录、培训、证照、预约，一站完成",
        introDesc: "更快浏览潜水员旅程，直接进入所需功能。",
        introPrimary: "合作咨询",
        introSecondary: "登录",
        miniCards: [["日志本", "信息流式记录"], ["培训连接", "证照管理"], ["度假村预约", "合作拓展"]],
        groups: [
          { title: "平台", items: ["服务介绍", "数字日志本", "培训与证照"] },
          { title: "公司", items: ["公司介绍", "新闻", "招聘"] },
          { title: "政策", items: ["使用条款", "隐私政策", "位置服务条款", "青少年保护政策", "信息安全政策", "Cookie 政策", "营销信息同意", "第三方信息提供同意", "个人信息收集与使用同意", "Open API 条款", "开源许可证", "站点地图"] },
        ],
        footerLinks: ["联系我们", "站点地图", "新闻室"],
      },
      footer: {
        topCopy: "我们把潜水记录、培训、证照和旅程变成产品。",
        columns: [
          { title: "平台", items: ["服务介绍", "数字日志本", "培训与证照", "安全政策", "合作咨询"] },
          { title: "公司", items: ["关于 Divergram", "新闻室", "招聘", "联系我们"] },
          { title: "政策", items: ["使用条款", "隐私政策", "位置服务条款", "青少年保护政策", "信息安全政策", "Cookie 政策", "营销信息同意", "第三方信息提供同意", "个人信息收集与使用同意", "Open API 条款", "开源许可证", "站点地图"] },
        ],
        bottomLinks: ["联系我们", "站点地图"],
      },
      home: {
        meta: { title: "Divergram | 记录并连接每一次潜水", description: "Divergram 是面向水肺与自由潜用户的潜水专业平台，连接数字日志本、潜水信息流、潜伴查找、潜点搜索、培训连接、证照管理、度假村发现与预约。" },
        heroOverline: "Dive logbook and social platform",
        heroTitle: "更清晰地记录每一次潜水",
        heroLead: "Divergram 是面向水肺与自由潜用户的移动日志本。把手写潜水记录变成信息流，并把潜伴、潜点、课程、证照、度假村预约连接成一条流畅体验。",
        heroPrimary: "查看服务",
        heroSecondary: "合作咨询",
        heroFoot: "记录、社区、培训、证照与预约的同一片海",
        institutions: ["Scuba", "Freediving", "Logbook", "License", "Resort"],
        statementOverline: "One ocean, one platform",
        statementTitle: "记录更简单，潜水体验更丰富。",
        statementCopy: "把潜水结束后填写日志本的动作，变成现代化的移动体验。把深度、时间、潜伴、潜点、照片与视频一起记录到信息流中，同时管理培训与证照，让个人档案更可信。",
        identityOverline: "For divers",
        identityTitle: "把手写日志本，变成有质感的信息流",
        identityCopy: "快速记录潜水次数、最大深度、潜水时间、水温、装备、潜伴与潜点。加入照片、短视频、培训经历与证照，建立专属潜水历史。",
        identityLink: "查看数字日志本",
        institutionOverline: "For agencies, resorts and brands",
        institutionTitle: "从培训到证照，从搜索到预约",
        institutionCopy: "潜水团体与培训机构可以连接课程与证照，度假村与品牌则能展示潜点、预约与商品信息。让整个潜水旅程在一个入口完成。",
        institutionLink: "团体合作咨询",
        featureOverline: "Built for divers",
        featureTitle: "完成潜水日常的一切功能",
        featureCopy: "记录、分享、培训、证照、探索、预约、购物，一款应用连接潜水前后的全部瞬间。",
        featureTitles: ["像信息流一样记录潜水", "连接课程与教练", "集中管理证照", "扩展到潜点、预约和购物"],
        featureCopyItems: ["记录深度、时间、水温、装备、潜伴、照片与视频，并以社交信息流方式分享。", "从入门到进阶，找到潜水培训并自然连接教练、团体与度假村。", "整理各团体资格、培训记录、专项证照与到期时间，建立可信个人档案。", "连接潜点搜索、度假村预约、体验课程与潜水装备购物。"],
        featureLinks: ["查看数字日志本", "查看培训连接", "查看证照管理", "查看预约与电商"],
        valueOverline: "Designed to grow",
        valueTitle: "记录越多，潜水体验越成长",
        valueStats: ["累计潜水日志处理目标", "潜点、培训与度假村数据", "随时记录并分享的移动体验", "日志本、社交、培训、证照、搜索与预约的一体化"],
        valueNote: "* 这些数字来自 Divergram 的产品路线图与运营目标，实际范围会因版本阶段而变化。",
        useOverline: "Use cases",
        useTitle: "在一个平台上，以你喜欢的方式潜水",
        useCta: "合作与入驻咨询",
        useTitles: ["用移动信息流记录潜水", "优雅地归档深度与状态", "把课程与证照连接到档案", "把预约与商品展示给感兴趣的潜水员"],
        trustOverline: "Divergram trust",
        trustTitle: "潜水记录建立在信任之上",
        trustCopy: "当日志本、培训、证照、度假村与潜伴信息彼此连接时，数据会更加准确。Divergram 围绕数据完整性、分享范围与合作伙伴整合进行设计，让潜水员与机构以同一标准协作。",
        trustButton: "查看连接结构",
        trustLayers: ["日志完整性", "培训与证照", "分享范围", "合作伙伴协作"],
        trustLayerCopies: ["让每次潜水都成为一条可信记录", "将机构数据自然接入潜水员档案", "精细控制信息流、潜伴与群组可见性", "统一度假村与品牌运营"],
        newsOverline: "What’s new",
        newsTitle: "Divergram 最新动态",
        newsCta: "查看全部更新",
        newsTitles: ["发布移动日志本与潜水信息流", "潜水员如何选择潜点", "潜伴查找与安全社区"],
        newsCopies: ["介绍连接手写日志本情感与现代信息流体验的产品方向。", "整理深度、季节、评价与潜伴体验为何会影响搜索体验。", "介绍构建可信潜水社区的核心原则。"],
        finalPre: "READY TO DIVE?",
        finalTitle: "连接潜水员记录、发现、再出发的每一个瞬间。",
        finalButton: "合作咨询",
        finalLink: "查看服务详情",
      },
    },
  };

  const visualLocalizedCopy = {
    ko: {
      hero: {
        badge: "Dive logged",
        status: "오늘의 다이빙 기록 완료",
        cards: ["로그북", "다이빙 포인트", "버디 매칭"],
      },
      identity: {
        title: "문섬 로그가 저장됐어요",
        copy: "버디와 피드에 공유하고 라이센스에 연결할 수 있습니다.",
        depth: "최대 수심",
        time: "잠수 시간",
        button: "피드에 공유",
        topNote: "오늘의 버디",
        bottomNote: "누적 다이브",
      },
      console: {
        title: "divergram travel board",
        live: "Live",
        sidebarTitle: "개요",
        sidebarItems: ["교육", "라이센스", "리조트", "예약"],
        mainLabel: "이번 주 교육·포인트 조회",
        stats: ["저장 로그", "협업 단체", "운영"],
      },
      institutions: ["스쿠버", "프리다이빙", "로그북", "라이센스", "리조트"],
    },
    en: {
      hero: {
        badge: "Dive logged",
        status: "Today's dive recorded",
        cards: ["Logbook", "Dive point", "Buddy match"],
      },
      identity: {
        title: "The Munseom log is saved",
        copy: "Share it to your feed and connect it to your license.",
        depth: "Max depth",
        time: "Dive time",
        button: "Share to feed",
        topNote: "Today's buddy",
        bottomNote: "Total dives",
      },
      console: {
        title: "divergram travel board",
        live: "Live",
        sidebarTitle: "Overview",
        sidebarItems: ["Courses", "Licenses", "Resorts", "Bookings"],
        mainLabel: "This week's education & point views",
        stats: ["Saved logs", "Partner groups", "Operations"],
      },
      institutions: ["Scuba", "Freediving", "Logbook", "License", "Resort"],
    },
    ja: {
      hero: {
        badge: "ダイブ記録",
        status: "本日のダイブ記録が完了しました",
        cards: ["ログブック", "ダイブポイント", "バディマッチ"],
      },
      identity: {
        title: "文島のログが保存されました",
        copy: "バディとフィードで共有し、ライセンスにも接続できます。",
        depth: "最大水深",
        time: "潜水時間",
        button: "フィードに共有",
        topNote: "今日のバディ",
        bottomNote: "累計ダイブ",
      },
      console: {
        title: "divergram travel board",
        live: "公開中",
        sidebarTitle: "概要",
        sidebarItems: ["講習", "ライセンス", "リゾート", "予約"],
        mainLabel: "今週の教育・ポイント確認",
        stats: ["保存ログ", "提携団体", "運営"],
      },
      institutions: ["スキューバ", "フリーダイビング", "ログブック", "ライセンス", "リゾート"],
    },
    zh: {
      hero: {
        badge: "潜水已记录",
        status: "今日潜水记录已完成",
        cards: ["日志本", "潜点", "潜伴匹配"],
      },
      identity: {
        title: "文岛日志已保存",
        copy: "可分享至动态，并连接到你的证照。",
        depth: "最大深度",
        time: "潜水时长",
        button: "分享到动态",
        topNote: "今日潜伴",
        bottomNote: "累计潜水",
      },
      console: {
        title: "divergram travel board",
        live: "运行中",
        sidebarTitle: "概览",
        sidebarItems: ["课程", "证照", "度假村", "预约"],
        mainLabel: "本周教育与积分查询",
        stats: ["已保存日志", "合作机构", "运营"],
      },
      institutions: ["水肺", "自由潜水", "日志本", "证照", "度假村"],
    },
  };

  const getLocalized = () => localizedCopy[currentLanguage] || localizedCopy.ko;
  const getVisualLocalized = () => visualLocalizedCopy[currentLanguage] || visualLocalizedCopy.ko;

  const setText = (selector, value, scope = document) => {
    if (value == null) return;
    const element = scope.querySelector(selector);
    if (element) element.textContent = value;
  };

  const setHTML = (selector, value, scope = document) => {
    if (value == null) return;
    const element = scope.querySelector(selector);
    if (element) element.innerHTML = value;
  };

  const setOverline = (selector, value, scope = document) => {
    if (value == null) return;
    const element = scope.querySelector(selector);
    if (element) element.innerHTML = `<span></span> ${value}`;
  };

  const setAllTexts = (selector, values, scope = document) => {
    if (!Array.isArray(values)) return;
    scope.querySelectorAll(selector).forEach((element, index) => {
      if (values[index] != null) element.textContent = values[index];
    });
  };

  const updateMeta = (language) => {
    const meta = localizedCopy[language]?.home?.meta;
    if (!meta) return;
    const updateNamed = (selector, value) => {
      const element = document.querySelector(selector);
      if (element) element.setAttribute("content", value);
    };
    document.title = meta.title;
    updateNamed('meta[name="description"]', meta.description);
    updateNamed('meta[property="og:title"]', meta.title);
    updateNamed('meta[property="og:description"]', meta.description);
    updateNamed('meta[name="twitter:title"]', meta.title);
    updateNamed('meta[name="twitter:description"]', meta.description);
  };

  const applyLocalizedCopy = () => {
    const copy = getLocalized();
    const visual = getVisualLocalized();
    updateMeta(currentLanguage);

    if (header) {
      setText(".brand__text span", copy.header.brandSub, header);
      setText(".nav__intro .nav__kicker", copy.header.introKicker, header);
      setText(".nav__intro h2", copy.header.introTitle, header);
      setText(".nav__intro p", copy.header.introDesc, header);
      setText(".nav__intro .nav__intro-actions .button--primary", copy.header.introPrimary, header);
      setText(".nav__intro .nav__intro-actions .button--ghost", copy.header.introSecondary, header);
      setAllTexts(".nav__mini-card span", copy.header.miniCards.map((item) => item[0]), header);
      setAllTexts(".nav__mini-card small", copy.header.miniCards.map((item) => item[1]), header);
      header.querySelectorAll(".nav__group").forEach((group, index) => {
        const groupCopy = copy.header.groups[index];
        if (!groupCopy) return;
        setText(".nav__title", groupCopy.title, group);
        setAllTexts(".nav__link", groupCopy.items, group);
      });
      setAllTexts(".nav__foot-link", copy.header.footerLinks, header);
      setText(".menu-toggle .sr-only", currentLanguage === "ko" ? "메뉴 열기" : currentLanguage === "en" ? "Open menu" : currentLanguage === "ja" ? "メニューを開く" : "打开菜单", header);
      setText(".language-toggle .sr-only", currentLanguage === "ko" ? "언어 선택" : currentLanguage === "en" ? "Choose language" : currentLanguage === "ja" ? "言語を選択" : "选择语言", header);
    }

    if (footer) {
      setText(".footer__top p", copy.footer.topCopy, footer);
      footer.querySelectorAll(".footer__links").forEach((column, index) => {
        const columnCopy = copy.footer.columns[index];
        if (!columnCopy) return;
        setText("h3", columnCopy.title, column);
        setAllTexts("a", columnCopy.items, column);
      });
      setAllTexts(".footer__bottom div a", copy.footer.bottomLinks, footer);
      setText(".footer__top .brand__text span", copy.header.brandSub, footer);
    }

    if (!isHomePage) return;

    setOverline(".dg-hero .dg-overline", copy.home.heroOverline, body);
    setHTML(".dg-hero h1", currentLanguage === "en" ? "Record every dive <em>more clearly</em>" : currentLanguage === "ja" ? "すべてのダイブを<em>より鮮明に</em>記録する" : currentLanguage === "zh" ? "更清晰地记录每一次<em>潜水</em>" : "모든 다이빙을 <em>더 선명하게</em> 기록하다", body);
    setText(".dg-hero__lead", copy.home.heroLead, body);
    setHTML(".dg-hero__actions .button--primary", `${copy.home.heroPrimary} <span aria-hidden="true">→</span>`, body);
    setHTML(".dg-hero__actions .text-link", `${copy.home.heroSecondary} <span aria-hidden="true">↗</span>`, body);
    setText(".dg-hero__foot p", copy.home.heroFoot, body);
    setAllTexts(".institution-list span", visual.institutions, body);
    setText(".trust-core strong", visual.hero.badge, body);
    setText(".trust-core small", visual.hero.status, body);
    setText(".float-card--identity small", visual.hero.cards[0], body);
    setText(".float-card--document small", visual.hero.cards[1], body);
    setText(".float-card--api small", visual.hero.cards[2], body);

    setOverline(".dg-statement .dg-overline", copy.home.statementOverline, body);
    setText(".dg-statement h2", copy.home.statementTitle, body);
    setText(".dg-statement__copy", copy.home.statementCopy, body);

    setOverline(".story-section--identity .dg-overline", copy.home.identityOverline, body);
    setText(".story-section--identity h2", copy.home.identityTitle, body);
    setText(".story-section--identity .story-copy > p:last-of-type", copy.home.identityCopy, body);
    setHTML(".story-section--identity .text-link", `${copy.home.identityLink} <span aria-hidden="true">→</span>`, body);
    setText(".story-section--identity .phone-content h3", visual.identity.title, body);
    setText(".story-section--identity .phone-content > p", visual.identity.copy, body);
    setAllTexts(".story-section--identity .phone-detail span", [visual.identity.depth, visual.identity.time], body);
    setText(".story-section--identity .phone-content button", visual.identity.button, body);
    setText(".story-section--identity .scene-note--top span", visual.identity.topNote, body);
    setText(".story-section--identity .scene-note--bottom span", visual.identity.bottomNote, body);

    setOverline(".story-section--institution .dg-overline", copy.home.institutionOverline, body);
    setText(".story-section--institution h2", copy.home.institutionTitle, body);
    setText(".story-section--institution .story-copy > p:last-of-type", copy.home.institutionCopy, body);
    setHTML(".story-section--institution .text-link", `${copy.home.institutionLink} <span aria-hidden="true">→</span>`, body);
    setText(".story-section--institution .console-bar > span", visual.console.title, body);
    setText(".story-section--institution .console-bar small", visual.console.live, body);
    setText(".story-section--institution .console-body aside strong", visual.console.sidebarTitle, body);
    setAllTexts(".story-section--institution .console-body aside span", visual.console.sidebarItems, body);
    setText(".story-section--institution .console-main > p", visual.console.mainLabel, body);
    setAllTexts(".story-section--institution .console-stats span", visual.console.stats, body);

    setOverline(".feature-section__head .dg-overline", copy.home.featureOverline, body);
    setText(".feature-section__head h2", copy.home.featureTitle, body);
    setText(".feature-section__head > p", copy.home.featureCopy, body);
    const bentoLabels =
      currentLanguage === "ko"
        ? ["Digital Logbook", "Education", "License Wallet", "Dive Map & Commerce"]
        : currentLanguage === "en"
          ? ["Digital Logbook", "Education", "License Wallet", "Dive Map & Commerce"]
          : currentLanguage === "ja"
            ? ["デジタルログブック", "教育", "ライセンスウォレット", "ダイブマップ＆コマース"]
            : ["数字日志本", "培训", "证照钱包", "潜点与电商"];
    setAllTexts(".bento-card .bento-copy > span", bentoLabels, body);
    setAllTexts(".bento-card .bento-copy h3", copy.home.featureTitles, body);
    setAllTexts(".bento-card .bento-copy p", copy.home.featureCopyItems, body);
    document.querySelectorAll(".bento-card .bento-copy a").forEach((link, index) => {
      const label = copy.home.featureLinks[index];
      if (!label) return;
      link.textContent = "→";
      link.setAttribute("aria-label", label);
    });

    setOverline(".value-intro .dg-overline", copy.home.valueOverline, body);
    setText(".value-intro h2", copy.home.valueTitle, body);
    setAllTexts(".value-stats p", copy.home.valueStats, body);
    setText(".value-note", copy.home.valueNote, body);

    setOverline(".use-section__head .dg-overline", copy.home.useOverline, body);
    setText(".use-section__head h2", copy.home.useTitle, body);
    setHTML(".use-section__head .text-link", `${copy.home.useCta} <span aria-hidden="true">↗</span>`, body);
    const useRoleLabels =
      currentLanguage === "ko"
        ? ["스쿠버다이버", "프리다이버", "다이빙 단체 · 강사", "리조트 · 브랜드"]
        : currentLanguage === "en"
          ? ["Scuba diver", "Freediver", "Dive agencies · instructors", "Resorts · brands"]
          : currentLanguage === "ja"
            ? ["スキューバダイバー", "フリーダイバー", "ダイビング団体・インストラクター", "リゾート・ブランド"]
            : ["水肺潜水员", "自由潜水员", "潜水团体·教练", "度假村·品牌"];
    setAllTexts(".use-card p", useRoleLabels, body);
    setAllTexts(".use-card h3", copy.home.useTitles, body);
    document.querySelectorAll(".use-card a").forEach((link) => {
      const label = currentLanguage === "ko" ? "자세히 보기" : currentLanguage === "en" ? "Learn more" : currentLanguage === "ja" ? "詳しく見る" : "查看详情";
      link.innerHTML = `${label} <span aria-hidden="true">→</span>`;
    });

    setOverline(".trust-copy .dg-overline", copy.home.trustOverline, body);
    setText(".trust-copy h2", copy.home.trustTitle, body);
    setText(".trust-copy > p:not(.dg-overline)", copy.home.trustCopy, body);
    setHTML(".trust-copy .button", `${copy.home.trustButton} <span aria-hidden="true">→</span>`, body);
    setAllTexts(".trust-layers .layer strong", copy.home.trustLayers, body);
    setAllTexts(".trust-layers .layer small", copy.home.trustLayerCopies, body);

    setOverline(".news-section__head .dg-overline", copy.home.newsOverline, body);
    setText(".news-section__head h2", copy.home.newsTitle, body);
    setText(".news-section__head .text-link", copy.home.newsCta, body);
    setAllTexts(".news-card .news-copy > span", ["PRODUCT · 2026.07.01", "INSIGHT · 2026.06.18", "COMMUNITY · 2026.05.30"], body);
    setAllTexts(".news-card .news-copy h3", copy.home.newsTitles, body);
    setAllTexts(".news-card .news-copy p", copy.home.newsCopies, body);
    setAllTexts(".news-card .news-copy b", copy.home.newsTitles.map(() => currentLanguage === "ko" ? "읽어보기" : currentLanguage === "en" ? "Read more" : currentLanguage === "ja" ? "読む" : "阅读"), body);

    setText(".final-cta p", copy.home.finalPre, body);
    setText(".final-cta h2", copy.home.finalTitle, body);
    setHTML(".final-cta .button", `${copy.home.finalButton} <span aria-hidden="true">↗</span>`, body);
    setHTML(".final-cta .cta-link", `${copy.home.finalLink} →`, body);
  };

  const getLanguage = (code) => supportedLanguages.find((item) => item.code === code) || supportedLanguages[0];

  const syncLanguageUI = (code = currentLanguage) => {
    const language = getLanguage(code);
    currentLanguage = language.code;
    writeStoredLanguage(language.code);
    root.lang = language.lang;
    document.documentElement.lang = language.lang;

    const languageLabel = header?.querySelector(".language-toggle__label");
    const languageButton = header?.querySelector(".language-toggle");
    if (languageLabel) languageLabel.textContent = language.short;
    if (languageButton) languageButton.setAttribute("aria-label", `${languageAriaLabels[language.code] || "Current language"}: ${language.label}`);
    header?.querySelectorAll(".language-option").forEach((optionButton) => {
      const active = optionButton.dataset.language === language.code;
      optionButton.setAttribute("aria-pressed", String(active));
      optionButton.classList.toggle("is-active", active);
    });
  };

  const renderHeader = () => {
    if (!header) return;

    header.classList.add("home-header");
    const groups = ["플랫폼", "회사", "정책"]
      .map((group) => {
        const items = navItems
          .filter((item) => item.group === group)
          .map((item) => `<a class="nav__link" href="${item.href}">${item.label}</a>`)
          .join("");
        return `
          <section class="nav__group">
            <span class="nav__title">${group}</span>
            ${items}
          </section>
        `;
      })
      .join("");
    const languageButtons = supportedLanguages
      .map(
        (option) => `
          <button class="language-option${option.code === currentLanguage ? " is-active" : ""}" type="button" role="menuitemradio" aria-pressed="${option.code === currentLanguage}" data-language="${option.code}">
            <span>${option.label}</span>
            <small>${option.short}</small>
          </button>
        `,
      )
      .join("");
    header.innerHTML = `
      <div class="container header__inner">
        <a class="brand" href="/" aria-label="Divergram 홈">
          <img class="brand__mark" src="./assets/divergram-logo-blue.png" alt="" width="44" height="44" />
          <span class="brand__text">Divergram<span>다이버를 위한 로그북 플랫폼</span></span>
        </a>
        <div class="header__actions">
          <div class="language-switcher">
            <button class="language-toggle" type="button" aria-haspopup="menu" aria-expanded="false" aria-controls="language-menu" aria-label="현재 언어: ${getLanguage(currentLanguage).label}">
              <span class="language-toggle__label" aria-hidden="true">${getLanguage(currentLanguage).short}</span>
              <span class="language-toggle__caret" aria-hidden="true">⌄</span>
              <span class="sr-only">언어 선택</span>
            </button>
            <div class="language-menu" id="language-menu" role="menu" hidden>
              ${languageButtons}
            </div>
          </div>
          <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="primary-navigation">
            <span class="menu-toggle__lines" aria-hidden="true"><i></i><i></i><i></i></span>
            <span class="sr-only">메뉴 열기</span>
          </button>
        </div>
        <nav class="nav" id="primary-navigation" aria-label="주요 메뉴" hidden>
          <div class="nav__sheet">
            <section class="nav__intro">
              <span class="nav__kicker">Explore Divergram</span>
              <h2>기록, 교육, 라이센스, 예약을 한 곳에서</h2>
              <p>다이버를 위한 플랫폼을 더 빠르게 탐색하고, 필요한 기능으로 바로 이동하세요.</p>
              <div class="nav__intro-actions">
                <a class="button button--primary" data-ripple href="./contact">제휴 문의</a>
                <a class="button button--ghost" data-ripple href="./contact">로그인</a>
              </div>
              <div class="nav__mini">
                <div class="nav__mini-card"><span>로그북</span><small>피드형 기록</small></div>
                <div class="nav__mini-card"><span>교육 연결</span><small>라이센스 관리</small></div>
                <div class="nav__mini-card"><span>리조트 예약</span><small>제휴 확장</small></div>
              </div>
            </section>
            <div class="nav__panel">
              ${groups}
            </div>
          </div>
          <div class="nav__foot">
            <a class="nav__foot-link" href="./contact">문의하기</a>
            <a class="nav__foot-link" href="./sitemap">사이트맵</a>
            <a class="nav__foot-link" href="./news">뉴스룸</a>
          </div>
        </nav>
      </div>
    `;

    navActions = header.querySelector(".header__actions");
    primaryNavigation = header.querySelector("#primary-navigation");
    menuToggle = header.querySelector(".menu-toggle");
    languageSwitcher = header.querySelector(".language-switcher");
    languageToggle = header.querySelector(".language-toggle");
    languageMenu = header.querySelector(".language-menu");
  };

  const renderFooter = () => {
    if (!footer) return;

    footer.classList.add("home-footer");
    footer.innerHTML = `
      <div class="container">
        <div class="footer__top">
          <a class="brand" href="/">
            <img class="brand__mark" src="./assets/divergram-logo-blue.png" alt="" width="44" height="44" />
            <span class="brand__text">Divergram<span>다이버를 위한 로그북 플랫폼</span></span>
          </a>
          <p>다이빙 기록, 교육, 라이센스와 여정을 제품으로 만듭니다.</p>
        </div>
        <div class="footer__grid">
          <div class="footer__links">
            <h3>플랫폼</h3>
            <a href="./service">서비스 소개</a>
            <a href="./service#logbook">디지털 로그북</a>
            <a href="./service#education">교육·라이센스</a>
            <a href="./security">안전 정책</a>
            <a href="./contact">제휴 문의</a>
          </div>
          <div class="footer__links">
            <h3>회사</h3>
            <a href="./about">Divergram 소개</a>
            <a href="./news">뉴스룸</a>
            <a href="./career">채용</a>
            <a href="./contact">문의하기</a>
          </div>
          <div class="footer__links" data-generated-footer="true">
            <h3>정책</h3>
            <a href="./terms">이용약관</a>
            <a href="./privacy">개인정보처리방침</a>
            <a href="./location">위치기반서비스</a>
            <a href="./youth">청소년보호정책</a>
            <a href="./security">정보보안정책</a>
            <a href="./cookie">쿠키정책</a>
            <a href="./marketing">마케팅 정보 수신 동의</a>
            <a href="./third-party">제3자 정보 제공 동의</a>
            <a href="./consent">개인정보 수집 및 이용 동의</a>
            <a href="./openapi">플랫폼 API 이용약관</a>
            <a href="./license">오픈소스 라이선스</a>
            <a href="./sitemap">사이트맵</a>
          </div>
        </div>
        <div class="footer__bottom">
          <span>© <span data-year></span> Divergram. All rights reserved.</span>
          <div>
            <a href="./contact">문의하기</a>
            <a href="./sitemap">사이트맵</a>
          </div>
        </div>
      </div>
    `;
  };

  renderHeader();
  renderFooter();
  syncLanguageUI();
  applyLocalizedCopy();

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute("content", theme === "dark" ? "#0B1020" : "#ffffff");
    }
  };

  applyTheme("light");

  const onReady = () => {
    body.classList.remove("is-loading");
    loader?.classList.add("is-hidden");
  };

  if (document.readyState === "complete") {
    onReady();
  } else {
    window.addEventListener("load", onReady, { once: true });
  }

  const splitText = (el) => {
    if (el.children.length > 0) return;
    const text = el.textContent.trim();
    if (!text) return;
    const words = text.split(/\s+/);
    el.textContent = "";
    el.classList.add("split-text");
    words.forEach((word, index) => {
      const span = document.createElement("span");
      span.className = "word";
      span.textContent = word;
      span.style.transitionDelay = `${index * 65}ms`;
      el.appendChild(span);
    });
  };

  document.querySelectorAll("[data-split-text]").forEach(splitText);

  const revealItems = Array.from(document.querySelectorAll("[data-reveal], .split-text"));
  if ("IntersectionObserver" in window && !reducedMotion) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );

    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  const counters = Array.from(document.querySelectorAll("[data-counter]"));
  const animateCounter = (el) => {
    if (el.dataset.counted === "true") return;
    el.dataset.counted = "true";

    const target = Number(el.dataset.counter || 0);
    const duration = Number(el.dataset.duration || 1600);
    const decimals = Number(el.dataset.decimals || 0);
    const suffix = el.dataset.suffix || "";
    const formatter = el.dataset.format || "number";

    const formatValue = (value) => {
      if (formatter === "compact") {
        if (value >= 1000000) return `${(value / 1000000).toFixed(1).replace(/\.0$/, "")}M`;
        if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
      }
      return value.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    };

    if (reducedMotion) {
      el.textContent = `${formatValue(target)}${suffix}`;
      return;
    }

    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target * eased;
      el.textContent = `${formatValue(value)}${suffix}`;
      if (progress < 1) {
        requestAnimationFrame(step);
      } else if (formatter === "compact" && target >= 1000000) {
        el.textContent = `${formatValue(target)}${suffix}`;
      }
    };

    requestAnimationFrame(step);
  };

  if ("IntersectionObserver" in window && counters.length && !reducedMotion) {
    const counterObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            counterObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.45 },
    );
    counters.forEach((counter) => counterObserver.observe(counter));
  } else {
    counters.forEach(animateCounter);
  }

  const setActiveHeader = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  setActiveHeader();
  window.addEventListener("scroll", setActiveHeader, { passive: true });

  if (menuToggle && primaryNavigation) {
    const closeLanguageMenu = () => {
      if (!languageSwitcher || !languageToggle || !languageMenu) return;
      languageSwitcher.classList.remove("is-open");
      languageToggle.setAttribute("aria-expanded", "false");
      languageMenu.hidden = true;
    };

    const closeMenu = () => {
      menuToggle.setAttribute("aria-expanded", "false");
      primaryNavigation.classList.remove("is-open");
      primaryNavigation.hidden = true;
      body.classList.remove("menu-open");
    };

    menuToggle.addEventListener("click", () => {
      const isOpen = menuToggle.getAttribute("aria-expanded") === "true";
      closeLanguageMenu();
      menuToggle.setAttribute("aria-expanded", String(!isOpen));
      primaryNavigation.classList.toggle("is-open", !isOpen);
      primaryNavigation.hidden = isOpen;
      body.classList.toggle("menu-open", !isOpen);
    });

    primaryNavigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
    window.addEventListener("resize", () => {
      if (window.innerWidth > 820) closeMenu();
    });
    document.addEventListener("click", (event) => {
      if (!primaryNavigation.classList.contains("is-open")) return;
      if (menuToggle.contains(event.target) || primaryNavigation.contains(event.target)) return;
      closeMenu();
    });
    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeMenu();
    });
  }

  if (languageSwitcher && languageToggle && languageMenu) {
    const closeLanguageMenu = () => {
      languageSwitcher.classList.remove("is-open");
      languageToggle.setAttribute("aria-expanded", "false");
      languageMenu.hidden = true;
    };

    languageToggle.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const isOpen = languageToggle.getAttribute("aria-expanded") === "true";
      if (isOpen) {
        closeLanguageMenu();
      } else {
        languageSwitcher.classList.add("is-open");
        languageToggle.setAttribute("aria-expanded", "true");
        languageMenu.hidden = false;
        if (primaryNavigation?.classList.contains("is-open")) {
          menuToggle?.click();
        }
      }
    });

    languageMenu.querySelectorAll("[data-language]").forEach((optionButton) => {
      optionButton.addEventListener("click", () => {
        const code = optionButton.dataset.language;
        if (!code) return;
        syncLanguageUI(code);
        closeLanguageMenu();
        window.location.reload();
      });
    });

    document.addEventListener("click", (event) => {
      if (!languageSwitcher.classList.contains("is-open")) return;
      if (languageSwitcher.contains(event.target)) return;
      closeLanguageMenu();
    });

    window.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLanguageMenu();
    });
  }

  document.querySelectorAll("[data-ripple]").forEach((button) => {
    button.addEventListener("pointerdown", (event) => {
      const rect = button.getBoundingClientRect();
      const ripple = document.createElement("span");
      ripple.className = "button__ripple";
      ripple.style.left = `${event.clientX - rect.left}px`;
      ripple.style.top = `${event.clientY - rect.top}px`;
      button.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 650);
    });
  });

  document.querySelectorAll("[data-tilt]").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      card.style.setProperty("--card-x", `${x}%`);
      card.style.setProperty("--card-y", `${y}%`);
      card.style.setProperty("--mouse-x", `${x}%`);
      card.style.setProperty("--mouse-y", `${y}%`);
    });
  });

  const heroMockup = document.querySelector("[data-mouse-glow]");
  if (heroMockup && !reducedMotion) {
    const moveGlow = (event) => {
      const rect = heroMockup.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      heroMockup.style.setProperty("--mouse-x", `${x}%`);
      heroMockup.style.setProperty("--mouse-y", `${y}%`);
    };
    heroMockup.addEventListener("pointermove", moveGlow);
    heroMockup.addEventListener("pointerleave", () => {
      heroMockup.style.setProperty("--mouse-x", "50%");
      heroMockup.style.setProperty("--mouse-y", "20%");
    });
  }

  const faqItems = Array.from(document.querySelectorAll(".faq__item"));
  faqItems.forEach((item, index) => {
    const button = item.querySelector(".faq__button");
    const panel = item.querySelector(".faq__panel");
    if (!button || !panel) return;

    if (index === 0) item.classList.add("is-open");
    button.setAttribute("aria-expanded", index === 0 ? "true" : "false");
    panel.id = panel.id || `faq-panel-${index}`;
    button.setAttribute("aria-controls", panel.id);

    button.addEventListener("click", () => {
      const open = !item.classList.contains("is-open");
      faqItems.forEach((other) => {
        other.classList.remove("is-open");
        const otherBtn = other.querySelector(".faq__button");
        otherBtn?.setAttribute("aria-expanded", "false");
      });
      item.classList.toggle("is-open", open);
      button.setAttribute("aria-expanded", open ? "true" : "false");
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (event) => {
      const href = anchor.getAttribute("href");
      if (!href || href === "#") return;
      const target = document.querySelector(href);
      if (!target) return;
      event.preventDefault();
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    });
  });

  const contactForm = document.querySelector("[data-contact-form]");
  if (contactForm) {
    const status = contactForm.querySelector("[data-form-status]");
    contactForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = new FormData(contactForm).get("name");
      contactForm.reset();
      if (status) {
        status.textContent = `${name || "문의"} 접수 완료. 영업일 기준 24시간 이내에 회신드리겠습니다.`;
      }
    });
  }

  document.querySelectorAll(".nav__link").forEach((link) => {
    const url = new URL(link.href);
    const path = `${url.pathname.replace(/\/$/, "")}`;
    const currentPath = `${location.pathname.replace(/\/$/, "")}`;
    const isSameDocumentSection = path === currentPath && Boolean(url.hash);
    if (path === currentPath && !isSameDocumentSection) link.classList.add("is-active");
  });

  const year = String(new Date().getFullYear());
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = year;
  });

  const footerGrid = footer?.querySelector(".footer__grid");
  if (footerGrid && !footerGrid.querySelector("[data-generated-footer]")) {
    const section = document.createElement("div");
    section.className = "footer__links";
    section.dataset.generatedFooter = "true";
    section.innerHTML = `
      <h3>정책</h3>
      <a href="./terms">이용약관</a>
      <a href="./privacy">개인정보처리방침</a>
      <a href="./location">위치기반서비스</a>
      <a href="./youth">청소년보호정책</a>
      <a href="./security">정보보안정책</a>
      <a href="./cookie">쿠키정책</a>
      <a href="./marketing">마케팅 정보 수신 동의</a>
      <a href="./third-party">제3자 정보 제공 동의</a>
      <a href="./consent">개인정보 수집 및 이용 동의</a>
      <a href="./openapi">플랫폼 API 이용약관</a>
      <a href="./license">오픈소스 라이선스</a>
      <a href="./sitemap">사이트맵</a>
    `;
    footerGrid.appendChild(section);
  }

  root.classList.add("js-ready");
})();
