(() => {
  const main = document.querySelector('main');
  if (!main || main.dataset.policyShell === 'ready') return;
  main.dataset.policyShell = 'ready';
  const routes = ['terms','privacy','location','youth','security','cookie','marketing','third-party','consent','openapi','copyright','license','account-deletion','sitemap'];
  const labels = {
    ko: ['이용약관','개인정보처리방침','위치기반서비스','청소년보호정책','정보보안정책','쿠키정책','마케팅 수신 동의','제3자 제공 동의','개인정보 수집 동의','API 이용약관','저작권 정책','오픈소스 라이선스','계정 삭제 안내','사이트맵'],
    en: ['Terms of use','Privacy policy','Location services','Youth protection','Security policy','Cookie policy','Marketing consent','Third-party consent','Data collection consent','API terms','Copyright policy','Open-source licenses','Account deletion','Sitemap'],
    ja: ['利用規約','プライバシーポリシー','位置情報サービス','青少年保護','情報セキュリティ','Cookieポリシー','マーケティング同意','第三者提供同意','個人情報収集同意','API利用規約','著作権ポリシー','オープンソースライセンス','アカウント削除','サイトマップ'],
    zh: ['使用条款','隐私政策','位置服务','青少年保护','信息安全','Cookie政策','营销同意','第三方提供同意','个人信息收集同意','API条款','版权政策','开源许可证','账号删除','网站地图'],
  };
  const updates = {
    terms: {
      ko: '현재 서비스 범위에는 피드·릴스, 다이빙 로그, 생물도감, 지도·날씨·해양 정보, 리조트 및 교육 예약, 라이선스·장비 연동, 번역·음성·AI 보조 기능, 외부 SNS 공유, 연간 디지털 구독이 포함됩니다.',
      en: 'The current service includes feeds and reels, dive logs, marine-life collections, maps and environmental data, resort and training bookings, licenses and device integrations, translation, voice and AI assistance, external sharing, and annual digital subscriptions.',
      ja: '現在のサービスには、フィード・リール、ダイブログ、生物図鑑、地図・気象・海洋情報、リゾート・講習予約、ライセンス・機器連携、翻訳・音声・AI支援、外部SNS共有、年間デジタル購読が含まれます。',
      zh: '当前服务包括动态与短视频、潜水日志、海洋生物图鉴、地图与海洋环境信息、度假村及培训预约、证照与设备连接、翻译、语音和 AI 辅助、外部社交分享及年度数字订阅。',
    },
    privacy: {
      ko: '사진·영상, 음성, 위치, 다이빙 장비 데이터와 AI 입력은 사용자가 해당 기능을 요청한 경우에만 필요한 범위에서 처리합니다. 연락처 변경은 인증을 거치며 민감 연락처는 서버에서 암호화해 저장합니다.',
      en: 'Photos, video, voice, location, dive-device data and AI inputs are processed only as needed when the user requests the relevant feature. Contact changes require verification, and sensitive contact data is encrypted on the server.',
      ja: '写真・動画、音声、位置情報、ダイビング機器データ、AI入力は、ユーザーが該当機能を利用した場合に必要な範囲でのみ処理します。連絡先の変更には認証が必要で、機密性の高い連絡先情報はサーバーで暗号化して保存します。',
      zh: '照片、视频、语音、位置、潜水设备数据和 AI 输入仅在用户请求相关功能时按必要范围处理。联系方式变更需要验证，敏感联系方式会在服务器端加密保存。',
    },
    security: {
      ko: '로그인·연락처 인증, 접근 권한, 결제 영수증 검증, 콘텐츠 공개 범위, 업로드 제한, 감사 로그와 외부 API 비밀정보 분리를 현재 보안 통제에 포함합니다.',
      en: 'Current security controls cover sign-in and contact verification, authorization, purchase-receipt validation, content visibility, upload restrictions, audit logs, and separation of external API secrets.',
      ja: '現在のセキュリティ対策には、ログイン・連絡先認証、アクセス権限、購入レシート検証、コンテンツ公開範囲、アップロード制限、監査ログ、外部API秘密情報の分離が含まれます。',
      zh: '当前安全控制包括登录及联系方式验证、访问权限、购买凭证校验、内容可见范围、上传限制、审计日志以及外部 API 密钥隔离。',
    },
    openapi: {
      ko: '리조트 예약·체크인, 콘텐츠, 인증, 결제 웹훅 등 외부 연동 API는 발급된 자격증명과 허용된 콜백 URL을 사용해야 하며 요청 제한과 감사 대상이 됩니다.',
      en: 'External APIs for resort booking and check-in, content, authentication and payment webhooks require issued credentials and approved callback URLs, and are subject to rate limits and auditing.',
      ja: 'リゾート予約・チェックイン、コンテンツ、認証、決済Webhookなどの外部APIには、発行済み認証情報と許可されたコールバックURLが必要で、レート制限と監査の対象になります。',
      zh: '度假村预约与签到、内容、认证及支付 Webhook 等外部 API 必须使用已签发凭据和获准回调地址，并接受速率限制与审计。',
    },
    copyright: {
      ko: 'AI가 제안한 문구·생물 후보·번역 결과를 포함해 게시 전 최종 확인과 이용 권한 확보 책임은 사용자에게 있습니다. 외부 출처 콘텐츠는 라이선스와 표시 조건을 준수해야 합니다.',
      en: 'Users must review AI-suggested text, species candidates and translations before publishing and ensure they hold the necessary rights. External material must follow its license and attribution requirements.',
      ja: 'AIが提案した文章・生物候補・翻訳結果を含め、公開前の最終確認と利用権限の確保はユーザーの責任です。外部素材はライセンスと表示条件を守る必要があります。',
      zh: '包括 AI 建议文字、生物候选和翻译结果在内，用户须在发布前完成最终确认并确保拥有使用权。外部素材必须遵守许可及署名条件。',
    },
  };
  const locale = () => { const raw = document.documentElement.lang || 'ko'; return raw.startsWith('en') ? 'en' : raw.startsWith('ja') ? 'ja' : raw.startsWith('zh') ? 'zh' : 'ko'; };
  const current = location.pathname.replace(/\/$/, '').split('/').pop() || 'terms';
  if (document.body.classList.contains('account-policy')) return;
  document.body.classList.add('policy-shell-page');
  const hero = main.querySelector('.page-hero');
  const section = main.querySelector('.page-section');
  if (!hero || !section) return;
  const content = section.querySelector('.container') || section;
  const layout = document.createElement('div'); layout.className = 'policy-shell';
  const aside = document.createElement('aside'); aside.className = 'policy-shell__aside';
  aside.innerHTML = '<div class="policy-shell__aside-card"><p class="policy-shell__label">DIVERGRAM POLICY CENTER</p><nav aria-label="Policy documents"></nav></div>';
  const nav = aside.querySelector('nav');
  routes.forEach(route => { const link = document.createElement('a'); link.href = `./${route}`; link.dataset.route = route; if (route === current) link.setAttribute('aria-current','page'); nav.appendChild(link); });
  const article = document.createElement('article'); article.className = 'policy-shell__article';
  while (content.firstChild) article.appendChild(content.firstChild);
  const updatePanel = document.createElement('div'); updatePanel.className = 'policy-shell__update'; updatePanel.hidden = !updates[current]; article.prepend(updatePanel);
  layout.append(aside, article); content.appendChild(layout);
  const updateLanguage = () => {
    const lang = locale();
    nav.querySelectorAll('a').forEach((link,index) => { link.textContent = labels[lang][index]; });
    if (updates[current]) {
      const heading = { ko:'현재 서비스 반영', en:'Current service coverage', ja:'現在のサービス反映', zh:'当前服务范围' }[lang];
      updatePanel.innerHTML = `<strong>${heading}</strong><p>${updates[current][lang]}</p>`;
    }
  };
  updateLanguage();
  new MutationObserver(updateLanguage).observe(document.documentElement,{attributes:true,attributeFilter:['lang']});
})();
