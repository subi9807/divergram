(function () {
  'use strict';

  var APP_STORE_URL = 'https://apps.apple.com/app/id6769253236';
  var PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.divergram.app';
  var path = window.location.pathname.replace(/^\/+|\/+$/g, '');
  var query = window.location.search || '';
  var userAgent = navigator.userAgent || '';
  var isAndroid = /Android/i.test(userAgent);
  var isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var platform = isAndroid ? 'android' : isIOS ? 'ios' : 'desktop';
  var normalizedPath = path.replace(/^posts\//, 'post/').replace(/^reels\//, 'reel/').replace(/^profiles\//, 'profile/').replace(/^resorts\//, 'resort/').replace(/^guides\//, 'guide/');
  var customUrl = 'divergram://' + normalizedPath + query;
  var storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  var fallbackTimer = 0;

  var copy = {
    ko: { title: 'Divergram에서 계속하기', description: '앱에서 공유된 콘텐츠를 바로 확인할 수 있습니다.', open: 'Divergram 열기', install: '앱 설치하기', status: '앱이 열리지 않으면 설치 화면으로 이동합니다.' },
    ja: { title: 'Divergramで続ける', description: '共有されたコンテンツをアプリですぐに確認できます。', open: 'Divergramを開く', install: 'アプリをインストール', status: 'アプリが開かない場合は、インストール画面に移動します。' },
    zh: { title: '在 Divergram 中继续', description: '在应用中立即查看共享内容。', open: '打开 Divergram', install: '安装应用', status: '如果应用未打开，将前往安装页面。' },
    en: { title: 'Continue in Divergram', description: 'Open the shared content directly in the app.', open: 'Open Divergram', install: 'Install the app', status: 'If the app does not open, you will be sent to the install page.' }
  };
  var language = String(navigator.language || 'en').slice(0, 2).toLowerCase();
  var text = copy[language] || copy.en;
  var title = document.getElementById('page-title');
  var description = document.getElementById('page-description');
  var status = document.getElementById('open-status');
  var openButton = document.getElementById('open-app');
  var installLink = document.getElementById('install-app');

  document.documentElement.lang = language in copy ? language : 'en';
  title.textContent = text.title;
  description.textContent = text.description;
  openButton.textContent = text.open;
  installLink.textContent = text.install;
  installLink.href = storeUrl;

  function cancelFallback() {
    if (fallbackTimer) window.clearTimeout(fallbackTimer);
    fallbackTimer = 0;
  }

  function openApp() {
    status.textContent = text.status;
    if (platform === 'desktop') {
      window.location.href = customUrl;
      return;
    }
    cancelFallback();
    fallbackTimer = window.setTimeout(function () {
      window.location.replace(storeUrl);
    }, 1600);
    window.location.href = customUrl;
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) cancelFallback();
  });
  window.addEventListener('pagehide', cancelFallback);
  openButton.addEventListener('click', openApp);

  if (platform === 'ios' || platform === 'android') {
    window.setTimeout(openApp, 350);
  } else {
    status.textContent = text.status;
  }
})();
