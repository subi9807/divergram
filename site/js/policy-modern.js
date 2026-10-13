(() => {
  const POLICY_LANG_KEY = "divergram-language";
  const normalize = (value) => value.replace(/\s+/g, " ").trim();
  const policyRoot = document.querySelector("main");
  const originalText = new Map();
  if (policyRoot) {
    const walker = document.createTreeWalker(policyRoot, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const key = normalize(node.nodeValue || "");
      if (key) originalText.set(node, key);
    }
  }
  const routeKey = location.pathname.replace(/\/$/, "").split("/").pop() || "terms";
  const sourceTitles = {
    "account-deletion": "계정 삭제 안내 | Divergram",
    consent: "Divergram | 개인정보 수집 및 이용 동의",
    cookie: "Divergram | 쿠키 정책",
    copyright: "Divergram | 저작권 정책",
    license: "Divergram | 오픈소스 라이선스",
    location: "Divergram | 위치기반서비스",
    marketing: "Divergram | 마케팅 정보 수신 동의",
    openapi: "Divergram | 플랫폼 API 이용약관",
    privacy: "Divergram | 개인정보",
    security: "Divergram | 정보보안 정책",
    sitemap: "Divergram | 사이트맵",
    terms: "Divergram | 이용약관",
    "third-party": "Divergram | 제3자 정보 제공 동의",
    youth: "Divergram | 청소년 보호정책",
  };
  const sourceDescriptions = {
    "account-deletion": "Divergram 계정 삭제 요청 방법, 30일 복구 기간 및 데이터 삭제 범위 안내",
    consent: "Divergram 개인정보 수집 및 이용 동의 안내",
    cookie: "Divergram 쿠키 정책",
    copyright: "Divergram 저작권 정책",
    license: "Divergram 오픈소스 라이선스",
    location: "Divergram 위치기반서비스 이용약관",
    marketing: "Divergram 마케팅 정보 수신 동의",
    openapi: "Divergram Open 플랫폼 API 이용약관",
    privacy: "Divergram 개인정보 처리방침",
    security: "Divergram 정보보안 정책",
    sitemap: "Divergram 사이트맵",
    terms: "Divergram 이용약관",
    "third-party": "Divergram 개인정보 제3자 제공 동의 안내",
    youth: "Divergram 청소년 보호정책",
  };
  const originalTitle = sourceTitles[routeKey] || document.title;
  const descriptionMeta = document.querySelector('meta[name="description"]');
  const originalDescription = sourceDescriptions[routeKey] || descriptionMeta?.content || "";
  const dictionaries = new Map();
  let requestId = 0;
  const currentLanguage = () => {
    try {
      const stored = localStorage.getItem(POLICY_LANG_KEY);
      return ["ko", "en", "ja", "zh"].includes(stored) ? stored : "ko";
    } catch { return "ko"; }
  };
  const applyPolicyLanguage = async () => {
    const language = currentLanguage();
    const id = ++requestId;
    if (!dictionaries.has(language)) {
      const response = await fetch(`./content/policies/${language}.json?v=20260924c`);
      if (!response.ok) return;
      dictionaries.set(language, await response.json());
    }
    if (id !== requestId) return;
    const dictionary = dictionaries.get(language);
    originalText.forEach((source, node) => {
      if (!node.isConnected) return;
      const translated = dictionary[source];
      if (!translated || translated === source) return;
      const current = node.nodeValue || "";
      const leading = current.match(/^\s*/)?.[0] || "";
      const trailing = current.match(/\s*$/)?.[0] || "";
      node.nodeValue = `${leading}${translated}${trailing}`;
    });
    document.title = (dictionary[originalTitle] || originalTitle).replace(/\s*\|\s*/g, " | ");
    if (descriptionMeta) descriptionMeta.content = dictionary[originalDescription] || originalDescription;
  };
  applyPolicyLanguage();
  window.addEventListener("storage", (event) => {
    if (event.key === POLICY_LANG_KEY) applyPolicyLanguage();
  });
  new MutationObserver(() => applyPolicyLanguage()).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });

  const headerInner = document.querySelector(".header .header__inner");
  if (!headerInner || headerInner.querySelector(".policy-nav")) return;
  const labels = {
    ko: ["홈", "주요 기능", "앱 화면", "서비스 안내", "고객지원·제휴"],
    en: ["Home", "Key features", "App screens", "Service", "Support & partnership"],
    ja: ["ホーム", "主な機能", "アプリ画面", "サービス案内", "サポート・提携"],
    zh: ["首页", "主要功能", "应用画面", "服务介绍", "支持与合作"],
  };
  const links = ["/", "/#features", "/#screens", "./service", "./contact"];
  const nav = document.createElement("nav");
  nav.className = "policy-nav";
  nav.setAttribute("aria-label", "Primary");
  links.forEach((href) => {
    const link = document.createElement("a");
    link.href = href;
    nav.appendChild(link);
  });
  headerInner.insertBefore(nav, headerInner.querySelector(".header__actions"));
  const style = document.createElement("style");
  style.textContent = ".policy-nav{display:flex;align-items:center;gap:28px;margin-left:auto;margin-right:20px;color:#0b1728;font-size:14px;font-weight:700}.policy-nav a{position:relative;text-decoration:none}.policy-nav a::after{content:'';position:absolute;left:0;right:100%;bottom:-7px;height:2px;background:#0866ff;transition:.2s}.policy-nav a:hover::after{right:0}@media(min-width:981px){.header.home-header .menu-toggle{display:none}}@media(max-width:980px){.policy-nav{display:none}}";
  document.head.appendChild(style);
  const update = () => {
    const raw = document.documentElement.lang || "ko";
    const lang = raw.startsWith("ja") ? "ja" : raw.startsWith("zh") ? "zh" : raw.startsWith("en") ? "en" : "ko";
    nav.querySelectorAll("a").forEach((link, index) => { link.textContent = labels[lang][index]; });
  };
  update();
  new MutationObserver(update).observe(document.documentElement, { attributes: true, attributeFilter: ["lang"] });
})();
