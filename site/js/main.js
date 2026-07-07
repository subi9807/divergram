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
    if (languageButton) languageButton.setAttribute("aria-label", `현재 언어: ${language.label}`);
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
