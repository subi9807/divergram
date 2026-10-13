(() => {
  const languages = { ko: "한국어", en: "English", ja: "日本語", zh: "中文" };
  const policyKo = ["약관 및 정책","이용약관","개인정보처리방침","위치기반서비스 약관","마케팅 정보 수신 동의","제3자 정보 제공 동의","개인정보 수집 및 이용 동의","청소년보호정책","정보보안정책","쿠키정책","저작권 정책","플랫폼 API 이용약관","오픈소스 라이선스","계정 삭제 안내","사이트맵"];
  const common = {
    en: ["Terms & policies","Terms of use","Privacy policy","Location-based service terms","Marketing communications consent","Third-party data provision consent","Personal data collection consent","Youth protection policy","Security policy","Cookie policy","Copyright policy","Platform API terms","Open-source licenses","Account deletion guide","Sitemap"],
    ja: ["規約・ポリシー","利用規約","プライバシーポリシー","位置情報サービス利用規約","マーケティング情報受信同意","第三者情報提供同意","個人情報収集・利用同意","青少年保護ポリシー","情報セキュリティポリシー","Cookieポリシー","著作権ポリシー","プラットフォームAPI利用規約","オープンソースライセンス","アカウント削除案内","サイトマップ"],
    zh: ["条款与政策","使用条款","隐私政策","位置服务条款","营销信息接收同意","第三方信息提供同意","个人信息收集与使用同意","青少年保护政策","信息安全政策","Cookie政策","版权政策","平台API条款","开源许可证","账号删除指南","网站地图"],
  };
  const ko = [
    ...policyKo,"홈","주요 기능","앱 화면","다운로드","서비스 안내","고객지원","고객지원·제휴","서비스","정책",
    "다이빙의 모든 순간을","한곳에.","기록하고, 발견하고,","함께 다이빙하세요.","나만의 다이빙 로그","포인트와 리조트 탐색","피드와 릴스로 연결","라이선스와 교육 관리","다이버의 일상까지 세심하게","프로필과 스탬프","교육 신청","알림과 메시지","내게 맞는 설정","바다를 닮은 경험","글로벌 피드","탐색","리조트","릴스","전 세계 모든 다이빙 파트너와","함께할 준비가 되어 있습니다.","글로벌 제휴문의","안전한 다이빙을 위한","정보와 기록","안전 정책 보기 →","당신의 다음 다이빙을","Divergram과 시작하세요.","출시 준비 중",
    "오늘의 바다를 기록하고, 세계의 새로운 포인트를 발견하고, 국경을 넘어 다이버들과 경험을 나누세요. Divergram은 전 세계 다이버의 다이빙 전과 후를 연결하는 글로벌 서비스입니다.",
    "종이 로그북과 지역마다 흩어진 정보는 이제 그만. Divergram 하나로 세계 어디서든 나의 다이빙 여정을 기록하고 글로벌 다이빙 커뮤니티와 연결할 수 있습니다.",
    "무엇을","도와드릴까요?","고객지원","제휴문의","앱 이용에 도움이 필요하신가요?","세계의 다이빙 경험을 함께 연결하세요.","문의 유형","이름","답변받을 이메일","제목","문의 내용","고객지원 문의 작성","제휴 유형","단체·회사명","국가·활동 지역","담당자","이메일","연락처","제휴 제안","제휴문의 작성","자주 찾는 도움말","이메일로 직접 문의하고 싶으신가요?",
    "Divergram은 전 세계 다이버에게 서비스를 제공합니다. 앱 이용 중 궁금한 점부터 국가와 분야에 제한 없는 글로벌 다이빙 제휴까지, 알맞은 문의 창구를 선택해 주세요.",
    "지역과 규모에 관계없이 전 세계 모든 다이빙 관련 제휴를 받고 있습니다. 교육 단체와 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠·미디어, 데이터·기술 파트너의 제안을 기다립니다.",
    "기록에서 시작해","세계의 바다로.","다이버에게 필요한 경험을","하나의 흐름으로 연결합니다.","기억을 넘어 데이터가 되는","다이빙 로그","국경을 넘어 연결되는 글로벌 피드","포인트와 리조트를 한눈에","생생한 바다를 담은 릴스","교육과 라이선스를 함께 관리","다이버와 파트너가","함께 성장하는 바다","좋은 다이빙 경험은","안전에서 시작됩니다.","세계 어디서든","Divergram과 함께 다이빙하세요.","App Store에서 시작하기","전 세계 제휴문의","안전 정책 확인"
  ];
  const translated = {
    en: [...common.en,"Home","Key features","App screens","Download","Service","Support","Support & partnership","Services","Policies","Every moment of diving","in one place.","Record, discover,","and dive together.","Your dive log","Explore points & resorts","Connect through feeds & reels","Manage licenses & education","Thoughtful tools for every diver","Profiles & stamps","Course applications","Notifications & messages","Personalized settings","An experience inspired by the ocean","Global feed","Explore","Resorts","Reels","Ready to work with every dive partner","around the world.","Global partnership","Information and records for","safer diving","View safety policy →","Start your next dive","with Divergram.","Coming soon","Record today's ocean, discover new dive points worldwide, and share experiences across borders. Divergram is a global service connecting divers before and after every dive.","Leave paper logbooks and fragmented local information behind. With Divergram, record your journey anywhere and connect with the global dive community.","How can we","help you?","Customer support","Partnership","Need help using the app?","Connect the world's diving experiences together.","Inquiry type","Name","Reply email","Subject","Message","Create support email","Partnership type","Organization","Country & region","Contact person","Email","Phone","Partnership proposal","Create partnership email","Quick help","Prefer to contact us directly by email?","Divergram serves divers worldwide. Choose customer support for app questions or global partnership for dive-related proposals across any country and sector.","We welcome every dive-related partnership worldwide, regardless of region or size—from agencies, instructors and resorts to shops, tour operators, brands, media, data and technology partners.","From every record","to oceans worldwide.","Everything a diver needs","connected in one seamless flow.","Dive records that become","valuable data","A global feed beyond borders","Points and resorts at a glance","Reels that bring the ocean to life","Manage education and licenses together","Divers and partners","growing together","Every great dive experience","starts with safety.","Dive anywhere in the world","with Divergram.","Start on the App Store","Worldwide partnership","View safety policy"],
    ja: [...common.ja,"ホーム","主な機能","アプリ画面","ダウンロード","サービス案内","サポート","サポート・提携","サービス","ポリシー","ダイビングのすべての瞬間を","ひとつに。","記録し、見つけ、","一緒に潜ろう。","自分だけのダイブログ","ポイントとリゾート検索","フィードとリールでつながる","ライセンスと教育を管理","ダイバーの日常まで丁寧に","プロフィールとスタンプ","講習申込","通知とメッセージ","自分に合う設定","海を感じる体験","グローバルフィード","検索","リゾート","リール","世界中のダイビングパートナーと","協業する準備ができています。","グローバル提携のお問い合わせ","安全なダイビングのための","情報と記録","安全ポリシーを見る →","次のダイビングを","Divergramと始めよう。","近日公開","今日の海を記録し、世界の新しいポイントを見つけ、国境を越えて体験を共有しましょう。Divergramは世界中のダイバーをつなぐグローバルサービスです。","紙のログブックや地域ごとに散らばる情報をひとつに。世界のどこからでも旅を記録し、グローバルなダイビングコミュニティとつながれます。","何を","お手伝いしますか？","カスタマーサポート","提携のお問い合わせ","アプリの利用でお困りですか？","世界のダイビング体験を一緒につなぎましょう。","お問い合わせ種別","お名前","返信用メール","件名","お問い合わせ内容","サポートメールを作成","提携種別","団体・会社名","国・活動地域","担当者","メール","連絡先","提携提案","提携メールを作成","よくあるヘルプ","メールで直接お問い合わせしますか？","Divergramは世界中のダイバーにサービスを提供しています。アプリに関するご質問から国や分野を問わない提携まで、窓口をお選びください。","地域や規模を問わず、世界中のダイビング関連提携を受け付けています。団体、インストラクター、リゾート、ショップ、ツアー、ブランド、メディア、データ、技術パートナーを歓迎します。","記録から始まり","世界の海へ。","ダイバーに必要な体験を","ひとつの流れにつなぎます。","思い出を超えてデータになる","ダイブログ","国境を越えてつながるグローバルフィード","ポイントとリゾートをひと目で","海の臨場感を伝えるリール","教育とライセンスを一緒に管理","ダイバーとパートナーが","共に成長する海","素晴らしいダイビング体験は","安全から始まります。","世界のどこからでも","Divergramとダイビング。","App Storeで始める","世界からの提携お問い合わせ","安全ポリシーを確認"],
    zh: [...common.zh,"首页","主要功能","应用画面","下载","服务介绍","客户支持","支持与合作","服务","政策","潜水的每一个瞬间","尽在一处。","记录、发现，","一起潜水。","我的潜水日志","探索潜点与度假村","通过动态与短视频连接","管理证照与培训","细致照顾潜水日常","个人主页与印章","课程申请","通知与消息","个性化设置","如海洋般的体验","全球动态","探索","度假村","短视频","我们已准备好与全球所有潜水伙伴","携手合作。","全球合作咨询","为了更安全潜水的","信息与记录","查看安全政策 →","与 Divergram 开启","下一次潜水。","即将推出","记录今天的海洋，探索世界的新潜点，跨越国界分享体验。Divergram 是连接全球潜水员潜水前后旅程的全球服务。","告别纸质日志与分散的本地信息。无论身在何处，都能记录旅程并连接全球潜水社区。","需要我们","如何帮助？","客户支持","合作咨询","使用应用时需要帮助吗？","共同连接全球潜水体验。","咨询类型","姓名","回复邮箱","主题","咨询内容","创建支持邮件","合作类型","机构·公司名称","国家·活动地区","负责人","邮箱","联系方式","合作提案","创建合作邮件","常用帮助","希望直接通过邮件联系我们吗？","Divergram 面向全球潜水员提供服务。无论是应用问题，还是不受国家与领域限制的全球潜水合作，请选择相应入口。","我们接受来自全球、不限地区与规模的所有潜水相关合作，包括机构、教练、度假村、潜店、旅行运营商、品牌、媒体、数据与技术伙伴。","从每一次记录出发","走向世界的海洋。","潜水员需要的一切体验","连接为顺畅流程。","超越回忆、成为数据的","潜水日志","跨越国界的全球动态","潜点与度假村一目了然","让海洋鲜活起来的短视频","统一管理培训与证照","潜水员与合作伙伴","共同成长的海洋","每一次美好潜水体验","都始于安全。","无论身在世界何处","都与 Divergram 一起潜水。","在 App Store 开始","全球合作咨询","查看安全政策"]
  };
  const maps = Object.fromEntries(Object.entries(translated).map(([lang, values]) => [lang, Object.fromEntries(ko.map((key, i) => [key, values[i] || key]))]));
  const serviceExtra = {
    en: {
      "Divergram은 로그북, 글로벌 피드, 포인트와 리조트 탐색, 교육과 라이선스를 하나로 연결합니다. 다이빙 전부터 바다를 떠난 뒤까지 모든 여정을 더 선명하게 경험하세요.": "Divergram brings together logbooks, global feeds, dive points, resorts, education, and licenses. Experience a clearer journey from planning your dive to sharing the memories afterward.",
      "여러 앱과 종이 기록에 흩어진 다이빙 정보를 한곳에 모으고, 전 세계 다이버와 파트너가 함께 성장하는 생태계를 만듭니다.": "Bring information scattered across apps and paper logs into one place, building an ecosystem where divers and partners worldwide grow together.",
      "날짜, 위치, 수심, 수온, 시간, 장비와 버디를 기록하고 사진과 함께 나만의 다이빙 히스토리를 완성합니다.": "Record date, location, depth, temperature, time, gear, and buddies, then complete your personal dive history with photos.",
      "수중 사진과 영상을 공유하고 세계 곳곳의 다이버에게 새로운 영감을 받으세요.": "Share underwater photos and videos and find inspiration from divers around the world.",
      "지역별 다이빙 포인트와 리조트의 사진, 위치, 편의시설과 운영 정보를 탐색합니다.": "Explore regional dive points and resorts with photos, locations, amenities, and operating information.",
      "짧은 영상으로 다이빙의 감동을 전하고 글로벌 커뮤니티와 실시간으로 반응을 나눕니다.": "Share the emotion of diving through short videos and engage with the global community in real time.",
      "교육 정보를 찾고 신청 내역과 보유 라이선스를 관리하며 다음 단계의 다이빙을 준비합니다.": "Find education, manage applications and licenses, and prepare for your next level of diving.",
      "지역과 규모에 관계없이 전 세계 다이빙 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠와 기술 파트너를 연결합니다.": "We connect dive agencies, instructors, resorts, shops, tour operators, equipment brands, content, and technology partners worldwide.",
      "Divergram의 정보는 계획을 돕기 위한 참고 자료입니다. 현장 상황과 개인의 자격 및 경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.": "Divergram information is for planning reference. Always verify local conditions and personal qualifications, and prioritize certified training and the buddy system."
    },
    ja: {
      "Divergram은 로그북, 글로벌 피드, 포인트와 리조트 탐색, 교육과 라이선스를 하나로 연결합니다. 다이빙 전부터 바다를 떠난 뒤까지 모든 여정을 더 선명하게 경험하세요.": "Divergramはログブック、グローバルフィード、ポイント、リゾート、教育、ライセンスをひとつにつなぎます。計画から思い出の共有まで、すべての旅をより鮮明に体験できます。",
      "여러 앱과 종이 기록에 흩어진 다이빙 정보를 한곳에 모으고, 전 세계 다이버와 파트너가 함께 성장하는 생태계를 만듭니다.": "複数のアプリや紙に散らばる情報をひとつにまとめ、世界中のダイバーとパートナーが共に成長するエコシステムを作ります。",
      "날짜, 위치, 수심, 수온, 시간, 장비와 버디를 기록하고 사진과 함께 나만의 다이빙 히스토리를 완성합니다.": "日付、場所、水深、水温、時間、装備、バディを記録し、写真と共に自分だけのダイビングヒストリーを完成させます。",
      "수중 사진과 영상을 공유하고 세계 곳곳의 다이버에게 새로운 영감을 받으세요.": "水中写真や動画を共有し、世界中のダイバーから新しいインスピレーションを得ましょう。",
      "지역별 다이빙 포인트와 리조트의 사진, 위치, 편의시설과 운영 정보를 탐색합니다.": "地域ごとのポイントとリゾートの写真、場所、設備、運営情報を探せます。",
      "짧은 영상으로 다이빙의 감동을 전하고 글로벌 커뮤니티와 실시간으로 반응을 나눕니다.": "短い動画でダイビングの感動を伝え、グローバルコミュニティとリアルタイムに交流します。",
      "교육 정보를 찾고 신청 내역과 보유 라이선스를 관리하며 다음 단계의 다이빙을 준비합니다.": "教育情報を探し、申込履歴と保有ライセンスを管理して、次のステップを準備します。",
      "지역과 규모에 관계없이 전 세계 다이빙 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠와 기술 파트너를 연결합니다.": "地域や規模を問わず、世界中の団体、インストラクター、リゾート、ショップ、ツアー、ブランド、コンテンツ、技術パートナーをつなぎます。",
      "Divergram의 정보는 계획을 돕기 위한 참고 자료입니다. 현장 상황과 개인의 자격 및 경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.": "Divergramの情報は計画の参考資料です。現地状況と資格・経験を確認し、公認教育やバディシステムなどの安全規則を優先してください。"
    },
    zh: {
      "Divergram은 로그북, 글로벌 피드, 포인트와 리조트 탐색, 교육과 라이선스를 하나로 연결합니다. 다이빙 전부터 바다를 떠난 뒤까지 모든 여정을 더 선명하게 경험하세요.": "Divergram 将日志、全球动态、潜点、度假村、培训与证照连接在一起。从潜水前的规划到离开海洋后的分享，让每段旅程更加清晰。",
      "여러 앱과 종이 기록에 흩어진 다이빙 정보를 한곳에 모으고, 전 세계 다이버와 파트너가 함께 성장하는 생태계를 만듭니다.": "将分散在不同应用和纸质记录中的信息集中到一处，打造全球潜水员与合作伙伴共同成长的生态。",
      "날짜, 위치, 수심, 수온, 시간, 장비와 버디를 기록하고 사진과 함께 나만의 다이빙 히스토리를 완성합니다.": "记录日期、地点、深度、水温、时间、装备与潜伴，并通过照片完成个人潜水历程。",
      "수중 사진과 영상을 공유하고 세계 곳곳의 다이버에게 새로운 영감을 받으세요.": "分享水下照片和视频，从世界各地的潜水员那里获得灵感。",
      "지역별 다이빙 포인트와 리조트의 사진, 위치, 편의시설과 운영 정보를 탐색합니다.": "探索各地区潜点和度假村的照片、位置、设施及运营信息。",
      "짧은 영상으로 다이빙의 감동을 전하고 글로벌 커뮤니티와 실시간으로 반응을 나눕니다.": "通过短视频传递潜水的感动，并与全球社区实时互动。",
      "교육 정보를 찾고 신청 내역과 보유 라이선스를 관리하며 다음 단계의 다이빙을 준비합니다.": "查找培训信息，管理申请记录与持有证照，为下一阶段潜水做好准备。",
      "지역과 규모에 관계없이 전 세계 다이빙 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠와 기술 파트너를 연결합니다.": "无论地区或规模，我们连接全球潜水机构、教练、度假村、潜店、旅行运营商、装备品牌、内容与技术伙伴。",
      "Divergram의 정보는 계획을 돕기 위한 참고 자료입니다. 현장 상황과 개인의 자격 및 경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.": "Divergram 信息仅供规划参考。请确认现场条件和个人资质经验，并始终优先遵守认证培训与潜伴制度等安全规范。"
    }
  };
  Object.entries(serviceExtra).forEach(([lang, values]) => Object.assign(maps[lang], values));
  const homeExtra = {
    en: {
      "본문으로 이동":"Skip to content","iPhone · iPad · Android 지원":"Available for iPhone · iPad · Android","다이빙 피드":"Dive feed","경험을 사진과 영상으로":"Share experiences in photos and video","포인트 탐색":"Discover dive points","바다로 향하는 새로운 방법":"A new way to reach the ocean",
      "수심, 수온, 시간, 버디, 장비와 위치를 기록하고 사진과 함께 오래 간직하세요.":"Record depth, temperature, time, buddies, gear, and location, then keep every memory with photos.","지도에서 다이빙 포인트를 찾고, 리조트의 위치와 사진, 편의시설, 가격 정보를 확인하세요.":"Find dive points on the map and explore resort locations, photos, facilities, and pricing.","수중 사진, 영상, 리뷰와 생생한 경험을 공유하고 전 세계 다이버에게 영감을 받으세요.":"Share underwater photos, videos, reviews, and vivid experiences with divers worldwide.","보유 라이선스를 등록하고 레벨별 교육 정보를 확인해 다음 다이빙을 준비하세요.":"Register your licenses, explore training by level, and prepare for your next dive.",
      "게시물, 릴스, 로그, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.":"See posts, reels, logs, favorites, and dive stamps at a glance.","관심 있는 다이빙 교육을 찾고 신청 내역과 진행 상태를 관리합니다.":"Find dive courses and manage applications and progress.","중요한 활동 알림을 놓치지 않고 다른 다이버와 편하게 소통합니다.":"Stay on top of important activity and connect easily with other divers.","한국어·영어·일본어·중국어와 라이트·다크 테마를 지원합니다.":"Supports Korean, English, Japanese, Chinese, and light or dark themes.","필요한 기능은 빠르게, 다이빙의 기억은 더 선명하게.":"Fast access to what you need, with clearer memories of every dive.","교육 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠·미디어, 데이터·기술까지. 국가와 규모에 관계없이 모든 다이빙 관련 제휴 제안을 환영합니다.":"From training agencies and instructors to resorts, dive shops, tour operators, gear brands, media, data, and technology—we welcome dive partnerships of every size, worldwide.","Divergram의 정보는 다이빙 계획을 돕기 위한 참고 자료입니다. 현장 조건과 개인의 자격·경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.":"Divergram information is for planning reference. Check local conditions and your qualifications, and always prioritize certified training and the buddy system.","전 세계 다이버의 모든 순간을 기록하고 연결하는 글로벌 다이빙 서비스.":"A global diving service that records and connects every moment for divers worldwide."
    },
    ja: {
      "본문으로 이동":"本文へ移動","iPhone · iPad · Android 지원":"iPhone・iPad・Android対応","다이빙 피드":"ダイビングフィード","경험을 사진과 영상으로":"体験を写真と動画で共有","포인트 탐색":"ポイント検索","바다로 향하는 새로운 방법":"海へ向かう新しい方法",
      "수심, 수온, 시간, 버디, 장비와 위치를 기록하고 사진과 함께 오래 간직하세요.":"水深、水温、時間、バディ、装備、場所を記録し、写真と共に大切に残しましょう。","지도에서 다이빙 포인트를 찾고, 리조트의 위치와 사진, 편의시설, 가격 정보를 확인하세요.":"地図からポイントを探し、リゾートの場所、写真、設備、料金情報を確認できます。","수중 사진, 영상, 리뷰와 생생한 경험을 공유하고 전 세계 다이버에게 영감을 받으세요.":"水中写真、動画、レビュー、リアルな体験を共有し、世界中のダイバーとつながりましょう。","보유 라이선스를 등록하고 레벨별 교육 정보를 확인해 다음 다이빙을 준비하세요.":"保有ライセンスを登録し、レベル別の講習情報を確認して次のダイビングに備えましょう。",
      "게시물, 릴스, 로그, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.":"投稿、リール、ログ、お気に入り、ダイビングスタンプをひと目で確認できます。","관심 있는 다이빙 교육을 찾고 신청 내역과 진행 상태를 관리합니다.":"興味のある講習を探し、申込履歴と進行状況を管理します。","중요한 활동 알림을 놓치지 않고 다른 다이버와 편하게 소통합니다.":"大切な通知を見逃さず、ほかのダイバーと気軽につながれます。","한국어·영어·일본어·중국어와 라이트·다크 테마를 지원합니다.":"韓国語、英語、日本語、中国語とライト・ダークテーマに対応します。","필요한 기능은 빠르게, 다이빙의 기억은 더 선명하게.":"必要な機能へすばやくアクセスし、ダイビングの記憶をより鮮明に。","교육 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠·미디어, 데이터·기술까지. 국가와 규모에 관계없이 모든 다이빙 관련 제휴 제안을 환영합니다.":"教育団体、インストラクター、リゾート、ダイビングショップ、ツアー、器材ブランド、メディア、データ、技術まで。国や規模を問わず、あらゆる提携提案を歓迎します。","Divergram의 정보는 다이빙 계획을 돕기 위한 참고 자료입니다. 현장 조건과 개인의 자격·경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.":"Divergramの情報は計画の参考資料です。現地の状況と資格・経験を確認し、公認講習やバディシステムなどの安全を常に優先してください。","전 세계 다이버의 모든 순간을 기록하고 연결하는 글로벌 다이빙 서비스.":"世界中のダイバーのすべての瞬間を記録し、つなぐグローバルダイビングサービス。"
    },
    zh: {
      "본문으로 이동":"跳至正文","iPhone · iPad · Android 지원":"支持 iPhone · iPad · Android","다이빙 피드":"潜水动态","경험을 사진과 영상으로":"用照片和视频分享体验","포인트 탐색":"探索潜点","바다로 향하는 새로운 방법":"前往海洋的新方式",
      "수심, 수온, 시간, 버디, 장비와 위치를 기록하고 사진과 함께 오래 간직하세요.":"记录深度、水温、时间、潜伴、装备和地点，并用照片珍藏每段回忆。","지도에서 다이빙 포인트를 찾고, 리조트의 위치와 사진, 편의시설, 가격 정보를 확인하세요.":"在地图上寻找潜点，查看度假村位置、照片、设施与价格。","수중 사진, 영상, 리뷰와 생생한 경험을 공유하고 전 세계 다이버에게 영감을 받으세요.":"分享水下照片、视频、评价和真实体验，与全球潜水员互相启发。","보유 라이선스를 등록하고 레벨별 교육 정보를 확인해 다음 다이빙을 준비하세요.":"登记持有证照，查看各等级培训信息，为下一次潜水做好准备。",
      "게시물, 릴스, 로그, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.":"一览帖子、短视频、日志、收藏与潜水印章。","관심 있는 다이빙 교육을 찾고 신청 내역과 진행 상태를 관리합니다.":"寻找感兴趣的潜水培训，管理申请与进度。","중요한 활동 알림을 놓치지 않고 다른 다이버와 편하게 소통합니다.":"不错过重要动态，轻松与其他潜水员交流。","한국어·영어·일본어·중국어와 라이트·다크 테마를 지원합니다.":"支持韩语、英语、日语、中文以及浅色和深色主题。","필요한 기능은 빠르게, 다이빙의 기억은 더 선명하게.":"快速使用所需功能，让潜水记忆更加清晰。","교육 단체, 강사, 리조트, 다이빙샵, 투어 운영사, 장비 브랜드, 콘텐츠·미디어, 데이터·기술까지. 국가와 규모에 관계없이 모든 다이빙 관련 제휴 제안을 환영합니다.":"从培训机构、教练、度假村、潜店、旅行运营商到装备品牌、媒体、数据与技术，我们欢迎全球各种规模的潜水合作。","Divergram의 정보는 다이빙 계획을 돕기 위한 참고 자료입니다. 현장 조건과 개인의 자격·경험을 확인하고, 공인 교육과 버디 시스템 등 안전 수칙을 항상 우선해 주세요.":"Divergram 信息仅供规划参考。请确认现场条件与个人资质经验，并始终优先遵守认证培训和潜伴制度等安全规则。","전 세계 다이버의 모든 순간을 기록하고 연결하는 글로벌 다이빙 서비스.":"记录并连接全球潜水员每一个瞬间的国际潜水服务。"
    }
  };
  const currentFeatureExtra = {
    en: {
      "사진, 음성, 다이빙 컴퓨터와 환경 정보를 한곳에 모으고 AI 제안을 확인해 나만의 기록을 완성하세요.": "Bring together photos, voice, dive-computer and environmental data, then review AI suggestions to complete your log.",
      "생물도감과 어종 검색": "Marine life collection and species search", "사진과 동영상의 AI 후보를 사용자가 확인하고, 언어에 관계없이 해양생물 정보를 찾아보세요.": "Review AI candidates from photos and videos and search marine-life information in any supported language.", "발견한 바다 생물을 기록하세요": "Record the marine life you discover", "안전·장비·기술을 한곳에서": "Safety, equipment and skills in one place", "안전·장비·기술 콘텐츠": "Safety, equipment and skills",
      "다이빙 가이드": "Dive guides", "안전, 장비, 기술과 해양환경에 대한 Divergram 제작 콘텐츠를 한국어·영어·일본어·중국어로 확인합니다.": "Read Divergram-created guides on safety, equipment, skills and marine environments in Korean, English, Japanese and Chinese.",
      "리조트 예약과 내역": "Resort bookings and history", "예약 가능한 리조트의 일정과 정보를 확인하고, 예약 내역과 진행 상태를 관리합니다.": "Check schedules and information for participating resorts, then manage booking history and status.",
      "게시물, 릴스, 로그, 도감, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.": "See posts, reels, logs, collections, favorites and dive stamps at a glance.",
      "사진·음성·다이빙 컴퓨터·환경 데이터를 한곳에 모으고, AI가 정리한 제안을 사용자가 확인해 나만의 다이빙 히스토리를 완성합니다.": "Bring photos, voice, dive-computer and environmental data together, then review AI-organized suggestions to complete your personal dive history.",
      "생물도감과 다국어 어종 검색": "Marine life collection and multilingual species search", "사진과 동영상의 AI 후보를 사용자가 확인하고, 발견한 해양생물과 정보를 나만의 도감으로 모으세요.": "Review AI candidates from photos and videos, then collect confirmed marine life and information in your own collection.",
      "다이빙 가이드와 리조트 예약": "Dive guides and resort booking", "Divergram이 제작한 안전·장비·기술·해양환경 콘텐츠를 읽고, 예약 가능한 리조트의 일정과 내역을 관리하세요.": "Read Divergram-created safety, equipment, skills and marine-environment guides, then manage schedules and bookings at participating resorts."
    },
    ja: {
      "사진, 음성, 다이빙 컴퓨터와 환경 정보를 한곳에 모으고 AI 제안을 확인해 나만의 기록을 완성하세요.": "写真・音声・ダイブコンピュータ・環境情報をひとつにまとめ、AIの提案を確認して記録を完成させます。", "생물도감과 어종 검색": "海洋生物図鑑と種検索", "사진과 동영상의 AI 후보를 사용자가 확인하고, 언어에 관계없이 해양생물 정보를 찾아보세요.": "写真や動画のAI候補を確認し、対応言語に関係なく海洋生物情報を検索できます。", "발견한 바다 생물을 기록하세요": "発見した海洋生物を記録しましょう", "안전·장비·기술을 한곳에서": "安全・器材・技術をひとつに", "안전·장비·기술 콘텐츠": "安全・器材・技術コンテンツ", "다이빙 가이드": "ダイビングガイド", "안전, 장비, 기술과 해양환경에 대한 Divergram 제작 콘텐츠를 한국어·영어·일본어·중국어로 확인합니다.": "Divergramが制作した安全・器材・技術・海洋環境のガイドを4言語で確認できます。", "리조트 예약과 내역": "リゾート予約と履歴", "예약 가능한 리조트의 일정과 정보를 확인하고, 예약 내역과 진행 상태를 관리합니다.": "対応リゾートの日程と情報を確認し、予約履歴と進行状況を管理できます。", "게시물, 릴스, 로그, 도감, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.": "投稿、リール、ログ、図鑑、お気に入り、スタンプをひと目で確認できます。", "사진·음성·다이빙 컴퓨터·환경 데이터를 한곳에 모으고, AI가 정리한 제안을 사용자가 확인해 나만의 다이빙 히스토리를 완성합니다.": "写真・音声・ダイブコンピュータ・環境データを集め、AIの提案を確認して履歴を完成させます。", "생물도감과 다국어 어종 검색": "海洋生物図鑑と多言語種検索", "사진과 동영상의 AI 후보를 사용자가 확인하고, 발견한 해양생물과 정보를 나만의 도감으로 모으세요.": "写真や動画のAI候補を確認し、発見した海洋生物を自分の図鑑に集めましょう。", "다이빙 가이드와 리조트 예약": "ダイビングガイドとリゾート予約", "Divergram이 제작한 안전·장비·기술·해양환경 콘텐츠를 읽고, 예약 가능한 리조트의 일정과 내역을 관리하세요.": "Divergram制作の安全・器材・技術・海洋環境ガイドを読み、対応リゾートの日程と予約を管理できます。"
    },
    zh: {
      "사진, 음성, 다이빙 컴퓨터와 환경 정보를 한곳에 모으고 AI 제안을 확인해 나만의 기록을 완성하세요.": "汇集照片、语音、潜水电脑与环境信息，确认 AI 建议后完成个人日志。", "생물도감과 어종 검색": "海洋生物图鉴与种类搜索", "사진과 동영상의 AI 후보를 사용자가 확인하고, 언어에 관계없이 해양생물 정보를 찾아보세요.": "确认照片和视频中的 AI 候选结果，并使用任何支持的语言搜索海洋生物信息。", "발견한 바다 생물을 기록하세요": "记录你发现的海洋生物", "안전·장비·기술을 한곳에서": "安全、装备与技术尽在一处", "안전·장비·기술 콘텐츠": "安全、装备与技术内容", "다이빙 가이드": "潜水指南", "안전, 장비, 기술과 해양환경에 대한 Divergram 제작 콘텐츠를 한국어·영어·일본어·중국어로 확인합니다.": "以韩语、英语、日语和中文阅读 Divergram 制作的安全、装备、技术与海洋环境指南。", "리조트 예약과 내역": "度假村预订与记录", "예약 가능한 리조트의 일정과 정보를 확인하고, 예약 내역과 진행 상태를 관리합니다.": "查看参与度假村的日程与信息，管理预订记录和进度。", "게시물, 릴스, 로그, 도감, 즐겨찾기와 다이빙 스탬프를 한눈에 확인합니다.": "一览帖子、短视频、日志、图鉴、收藏与潜水印章。", "사진·음성·다이빙 컴퓨터·환경 데이터를 한곳에 모으고, AI가 정리한 제안을 사용자가 확인해 나만의 다이빙 히스토리를 완성합니다.": "汇集照片、语音、潜水电脑与环境数据，确认 AI 建议后完成潜水历程。", "생물도감과 다국어 어종 검색": "海洋生物图鉴与多语种类搜索", "사진과 동영상의 AI 후보를 사용자가 확인하고, 발견한 해양생물과 정보를 나만의 도감으로 모으세요.": "确认照片和视频中的 AI 候选结果，将发现的海洋生物收录到个人图鉴。", "다이빙 가이드와 리조트 예약": "潜水指南与度假村预订", "Divergram이 제작한 안전·장비·기술·해양환경 콘텐츠를 읽고, 예약 가능한 리조트의 일정과 내역을 관리하세요.": "阅读 Divergram 制作的安全、装备、技术与海洋环境指南，并管理参与度假村的日程和预订。"
    }
  };
  Object.entries(currentFeatureExtra).forEach(([lang, values]) => Object.assign(maps[lang], values));
  Object.assign(maps.en, { "생물도감": "Marine life", "리조트 탐색": "Resort discovery" });
  Object.assign(maps.ja, { "생물도감": "海洋生物図鑑", "리조트 탐색": "リゾート検索" });
  Object.assign(maps.zh, { "생물도감": "海洋生物图鉴", "리조트 탐색": "度假村探索" });
  Object.assign(maps.en, { "회사소개": "About METAbyTREE" });
  Object.assign(maps.ja, { "회사소개": "会社紹介" });
  Object.assign(maps.zh, { "회사소개": "公司介绍" });
  homeExtra.en["메뉴 열기"] = "Open menu";
  homeExtra.ja["메뉴 열기"] = "メニューを開く";
  homeExtra.zh["메뉴 열기"] = "打开菜单";
  Object.entries(homeExtra).forEach(([lang, values]) => Object.assign(maps[lang], values));
  const originals = new WeakMap();
  const placeholders = {
    en: {"선택해 주세요":"Please select","이름을 입력해 주세요":"Enter your name","문의 제목을 입력해 주세요":"Enter a subject","단체 또는 회사명":"Organization or company","예: Indonesia · Bali":"e.g. Indonesia · Bali","담당자 이름":"Contact name","선택 입력":"Optional"},
    ja: {"선택해 주세요":"選択してください","이름을 입력해 주세요":"お名前を入力","문의 제목을 입력해 주세요":"件名を入力","단체 또는 회사명":"団体・会社名","예: Indonesia · Bali":"例：Indonesia · Bali","담당자 이름":"担当者名","선택 입력":"任意"},
    zh: {"선택해 주세요":"请选择","이름을 입력해 주세요":"请输入姓名","문의 제목을 입력해 주세요":"请输入主题","단체 또는 회사명":"机构或公司名称","예: Indonesia · Bali":"例如：Indonesia · Bali","담당자 이름":"负责人姓名","선택 입력":"选填"}
  };
  const screenType = (src) => {
    const name = (src.split("/").pop() || "").split("?")[0].replace(/-v2(?=\.)/, "").replace(/\.[^.]+$/, "");
    return name === "hero-feed" ? "feed" : name === "reels" ? "reels" : name;
  };
  const localizeScreens = (lang) => document.querySelectorAll('img[src*="assets/screens/"], img[data-original-src]').forEach((image) => {
    if (!image.dataset.originalSrc) image.dataset.originalSrc = image.getAttribute("src");
    const type = screenType(image.dataset.originalSrc);
    const supported = ["feed", "explore", "resorts", "profile", "reels", "dive-log", "license"];
    image.src = supported.includes(type) ? `./assets/screens/${lang}/${type}.png?v=20260812i` : image.dataset.originalSrc;
  });
  const heroTitleHtml = {
    ko: '다이빙의 모든<br>순간을 <em>한곳에.</em>',
    en: 'Every moment of<br><em>diving in one place.</em>',
    ja: 'ダイビングのすべての瞬間を<br><em>ひとつに。</em>',
    zh: '潜水的每一个瞬间<br><em>尽在一处。</em>',
  };
  const apply = (lang) => {
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode(node) { return /^(SCRIPT|STYLE|OPTION)$/.test(node.parentElement?.tagName || "") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (!originals.has(node)) originals.set(node, node.nodeValue);
      const source = originals.get(node);
      const trimmed = source.trim();
      const value = lang === "ko" ? trimmed : maps[lang]?.[trimmed];
      if (value) node.nodeValue = source.replace(trimmed, value); else node.nodeValue = source;
    }
    document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach((field) => {
      if (!field.dataset.koPlaceholder) field.dataset.koPlaceholder = field.placeholder;
      field.placeholder = lang === "ko" ? field.dataset.koPlaceholder : placeholders[lang]?.[field.dataset.koPlaceholder] || field.dataset.koPlaceholder;
    });
    const homeHeroTitle = document.querySelector(".hero .hero-copy h1");
    if (homeHeroTitle) homeHeroTitle.innerHTML = heroTitleHtml[lang] || heroTitleHtml.ko;
    localizeScreens(lang);
    try { localStorage.setItem("divergram-language", lang); } catch {}
  };
  const header = document.querySelector(".header");
  if (!header || header.querySelector(".site-language")) return;
  const control = document.createElement("div");
  control.className = "site-language-control";
  control.title = "Language";
  control.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"></circle><path d="M3 12h18M12 3c2.4 2.5 3.7 5.5 3.7 9S14.4 18.5 12 21c-2.4-2.5-3.7-5.5-3.7-9S9.6 5.5 12 3Z"></path></svg>';
  const select = document.createElement("select");
  select.className = "site-language";
  select.setAttribute("aria-label", "Language");
  Object.entries(languages).forEach(([code, label]) => select.add(new Option(label, code)));
  let saved = "ko";
  try { saved = localStorage.getItem("divergram-language") || "ko"; } catch {}
  select.value = languages[saved] ? saved : "ko";
  control.appendChild(select);
  header.insertBefore(control, header.querySelector("[data-menu]") || header.querySelector("nav"));
  const syncControl = () => { control.dataset.language = select.value.toUpperCase(); };
  select.addEventListener("change", () => { syncControl(); apply(select.value); });
  syncControl();
  apply(select.value);
  // The shared shell is injected after this deferred script on some pages.
  // Reapply once all deferred scripts finish so newly mounted header/footer text is localized too.
  window.addEventListener("DOMContentLoaded", () => apply(select.value), { once: true });
})();
