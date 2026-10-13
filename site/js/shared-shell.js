(() => {
  let currentHeader = document.querySelector("header.header");
  if (!currentHeader && document.body.classList.contains("account-policy")) {
    currentHeader = document.createElement("div");
    document.body.prepend(currentHeader);
  }
  if (!currentHeader || document.querySelector(".dg-shared-header")) return;

  const languages = {
    ko: { label: "한국어", short: "KO", nav: ["홈", "주요 기능", "서비스 안내", "회사소개", "고객지원·제휴"], menu: "메뉴 열기" },
    en: { label: "English", short: "EN", nav: ["Home", "Key features", "Service", "About", "Support & partnership"], menu: "Open menu" },
    ja: { label: "日本語", short: "JA", nav: ["ホーム", "主な機能", "サービス案内", "会社紹介", "サポート・提携"], menu: "メニューを開く" },
    zh: { label: "中文", short: "ZH", nav: ["首页", "主要功能", "服务介绍", "公司介绍", "支持与合作"], menu: "打开菜单" },
  };
  const readLanguage = () => {
    try {
      const value = localStorage.getItem("divergram-language");
      return languages[value] ? value : "ko";
    } catch {
      return "ko";
    }
  };
  const language = readLanguage();
  const copy = languages[language];
  const pathname = location.pathname.replace(/\/$/, "") || "/";
  const pageTitles = {
    ko: { terms: "이용약관", privacy: "개인정보처리방침", location: "위치기반서비스 약관", youth: "청소년보호정책", security: "정보보안정책", cookie: "쿠키정책", marketing: "마케팅 정보 수신 동의", "third-party": "제3자 정보 제공 동의", consent: "개인정보 수집 및 이용 동의", openapi: "플랫폼 API 이용약관", copyright: "저작권 정책", license: "오픈소스 라이선스", "account-deletion": "계정 삭제 안내", sitemap: "사이트맵" },
    en: { terms: "Terms of Use", privacy: "Privacy Policy", location: "Location Services Terms", youth: "Youth Protection Policy", security: "Security Policy", cookie: "Cookie Policy", marketing: "Marketing Communications Consent", "third-party": "Third-party Data Consent", consent: "Personal Data Collection Consent", openapi: "Platform API Terms", copyright: "Copyright Policy", license: "Open-source Licenses", "account-deletion": "Account Deletion Guide", sitemap: "Sitemap" },
    ja: { terms: "利用規約", privacy: "プライバシーポリシー", location: "位置情報サービス利用規約", youth: "青少年保護ポリシー", security: "情報セキュリティポリシー", cookie: "Cookieポリシー", marketing: "マーケティング情報受信同意", "third-party": "第三者情報提供同意", consent: "個人情報収集・利用同意", openapi: "プラットフォームAPI利用規約", copyright: "著作権ポリシー", license: "オープンソースライセンス", "account-deletion": "アカウント削除案内", sitemap: "サイトマップ" },
    zh: { terms: "使用条款", privacy: "隐私政策", location: "位置服务条款", youth: "青少年保护政策", security: "信息安全政策", cookie: "Cookie政策", marketing: "营销信息接收同意", "third-party": "第三方信息提供同意", consent: "个人信息收集与使用同意", openapi: "平台API条款", copyright: "版权政策", license: "开源许可证", "account-deletion": "账号删除指南", sitemap: "网站地图" },
  };
  const pageKey = pathname.split("/").pop();
  if (pageTitles[language]?.[pageKey]) document.title = `Divergram | ${pageTitles[language][pageKey]}`;
  const items = [
    ["/", copy.nav[0]],
    ["/#features", copy.nav[1]],
    ["/service", copy.nav[2]],
    ["/about", copy.nav[3]],
    ["/contact", copy.nav[4]],
  ];
  const isActive = (href) => href === "/" ? pathname === "/" : pathname === href;
  const navLinks = items.map(([href, label]) => `<a${isActive(href) ? ' class="active" aria-current="page"' : ""} href="${href}">${label}</a>`).join("");
  const options = Object.entries(languages).map(([code, value]) => `<option value="${code}"${code === language ? " selected" : ""}>${value.label}</option>`).join("");

  const header = document.createElement("header");
  header.className = "dg-shared-header";
  header.innerHTML = `
    <a class="dg-shared-brand" href="/" aria-label="Divergram Home">
      <img src="/assets/divergram-logo-blue.png" alt="" width="40" height="40" />
      <strong>Divergram</strong>
    </a>
    <nav class="dg-shared-nav" id="dg-shared-nav" aria-label="Primary">${navLinks}</nav>
    <div class="dg-shared-actions">
      <label class="dg-shared-language" aria-label="Language">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3Z"></path></svg>
        <select aria-label="Language">${options}</select>
      </label>
      <button class="dg-shared-menu" type="button" aria-expanded="false" aria-controls="dg-shared-nav"><span></span><span></span><span></span><b class="dg-shared-sr">${copy.menu}</b></button>
    </div>`;
  currentHeader.replaceWith(header);
  document.body.classList.add("dg-shell-active");

  const menu = header.querySelector(".dg-shared-menu");
  const nav = header.querySelector(".dg-shared-nav");
  menu.addEventListener("click", () => {
    const open = menu.getAttribute("aria-expanded") !== "true";
    menu.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  });
  nav.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => {
    menu.setAttribute("aria-expanded", "false");
    nav.classList.remove("is-open");
  }));
  header.querySelector("select").addEventListener("change", (event) => {
    try { localStorage.setItem("divergram-language", event.target.value); } catch {}
    location.reload();
  });
})();
