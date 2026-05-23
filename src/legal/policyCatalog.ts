import type { ConsentKey, PolicyDocument, PolicyType } from '../models';

const VERSION = '2026.05.22';
const EFFECTIVE_FROM = '2026-05-22T00:00:00.000Z';

function makePolicy(type: PolicyType, title: string, content: string, requiredForSignup: boolean): PolicyDocument {
  return {
    id: `policy-${type}-${VERSION}`,
    type,
    title,
    version: VERSION,
    locale: 'ko',
    content,
    requiredForSignup,
    effectiveFrom: EFFECTIVE_FROM,
    updatedAt: EFFECTIVE_FROM,
  };
}

export const policyDocumentsKo: PolicyDocument[] = [
  makePolicy(
    'terms',
    '이용약관',
    `## 1. 목적\n이 약관은 Divergram(이하 "회사")이 제공하는 다이빙 SNS 및 기록 서비스의 이용 조건, 권리·의무, 책임사항을 규정합니다.\n\n## 2. 서비스 범위\n회사는 피드, 릴스, 다이빙 로그, 지도 기반 포인트 탐색, 외부 장비/플랫폼 연동, AI 보조 기능을 제공합니다.\n\n## 3. 계정\n회원은 정확한 정보를 등록해야 하며, 계정 보안 책임은 회원에게 있습니다.\n\n## 4. 금지행위\n불법촬영, 음란물, 폭력·혐오 표현, 저작권 침해, 위험 다이빙 조장, 허위 정보 게시를 금지합니다.\n\n## 5. 서비스 변경/중단\n회사는 운영, 보안, 법령 준수를 위해 서비스 일부를 변경·중단할 수 있습니다.\n\n## 6. 책임 제한\n회사는 사용자 기기, 통신, 외부 API, 장비 연동 장애로 발생한 간접 손해에 대해 법령상 허용 범위 내에서 책임을 제한합니다.\n\n## 7. 준거법\n본 약관은 대한민국 법령을 준거법으로 합니다.`,
    true
  ),
  makePolicy(
    'privacy',
    '개인정보처리방침',
    `## 1. 수집 항목\n이메일, 닉네임, 프로필 이미지, 휴대폰 번호, 로그인 연동 정보, GPS 위치, 다이빙 위치, DiveLog, 장비 정보, Bluetooth 기기 정보, IP, 기기 정보, 푸시 토큰, 사진·영상, 자격증 정보, Instagram 링크, AI 기능 사용 데이터를 수집할 수 있습니다.\n\n## 2. 이용 목적\n회원 식별, 인증, 콘텐츠 제공, 안전 알림, 로그 동기화, 서비스 개선, 고객 지원, 법적 의무 이행을 위해 이용합니다.\n\n## 3. 보관 및 파기\n관련 법령 또는 서비스 목적 달성 시점까지 보관 후 안전하게 파기합니다.\n\n## 4. 제3자 제공 및 처리위탁\n필요 시 법적 근거와 최소 범위에 따라 제공/위탁하며, 상세 내용은 별도 고지 문서에서 확인할 수 있습니다.\n\n## 5. 이용자 권리\n열람, 정정, 삭제, 처리정지, 동의철회를 요청할 수 있으며 회사는 지체 없이 처리합니다.\n\n## 6. 국외 이전\n글로벌 클라우드 및 외부 연동 서비스 사용 시 국외 이전이 발생할 수 있으며, 이전 국가·항목·보관기간은 별도 고지합니다.`,
    true
  ),
  makePolicy(
    'location_terms',
    '위치정보 이용약관',
    `## 1. 목적\n위치기반 다이빙 포인트 추천, 로그 위치 표시, 주변 다이버/샵 탐색 기능 제공을 위해 위치정보를 이용합니다.\n\n## 2. 수집 방식\nGPS, 네트워크 기반 위치, 사용자가 직접 선택한 포인트 위치를 수집할 수 있습니다.\n\n## 3. 이용 범위\n지도 표시, 포인트 추천, 로그 입수·출수 위치 기록, 공개 범위 설정에 따른 공유 처리에 사용합니다.\n\n## 4. 이용자 통제\n사용자는 위치 수집/공유를 설정에서 언제든지 변경할 수 있습니다.\n\n## 5. 책임 제한\n위치정보는 통신·센서 환경에 따라 오차가 발생할 수 있습니다.`,
    true
  ),
  makePolicy(
    'location_privacy',
    '위치정보 처리방침',
    `## 1. 처리 항목\n현재 위치, 다이빙 포인트 좌표, 입수 위치, 출수 위치, 공개 범위 설정값.\n\n## 2. 보관 정책\n다이빙 로그에 연결된 위치는 로그 보관 기간과 동일하게 보관됩니다.\n\n## 3. 제공 및 공유\n사용자가 공개 범위를 public/followers/private로 설정한 정책에 따라 공유 범위가 결정됩니다.\n\n## 4. 거부권\n위치 권한 거부 시 수동 검색 모드가 제공되며 핵심 서비스 일부는 제한될 수 있습니다.`,
    false
  ),
  makePolicy(
    'community',
    '커뮤니티 운영정책',
    `## 1. 운영 원칙\nDivergram은 안전하고 신뢰 가능한 다이빙 커뮤니티를 지향합니다.\n\n## 2. 금지 콘텐츠\n음란물, 폭력물, 혐오·차별, 사칭, 스팸, 불법 광고, 허위 다이빙 정보, 위험행위 조장 콘텐츠를 금지합니다.\n\n## 3. 제재 기준\n위반 정도에 따라 경고, 임시 제한, 업로드 제한, 계정 정지, 영구 정지를 적용할 수 있습니다.\n\n## 4. 신고 처리\n이용자 신고는 정책 기준에 따라 검토 후 조치 결과를 안내합니다.`,
    false
  ),
  makePolicy(
    'content_upload',
    '콘텐츠 업로드 정책',
    `## 1. 업로드 권한\n사용자는 본인이 촬영하거나 적법하게 이용 권리를 가진 콘텐츠만 업로드할 수 있습니다.\n\n## 2. 금지사항\n불법촬영, 무단 도용, 타인 초상권 침해, 외설·폭력성 콘텐츠 업로드를 금지합니다.\n\n## 3. 안전성\n다이빙 안전을 해칠 수 있는 과장·허위 정보는 삭제 대상이 될 수 있습니다.`,
    false
  ),
  makePolicy(
    'copyright',
    '저작권 정책',
    `## 1. 권리 귀속\n사용자가 업로드한 콘텐츠 저작권은 원칙적으로 사용자에게 귀속됩니다.\n\n## 2. 서비스 이용 허락\n서비스 운영·전송·노출을 위해 필요한 범위에서 비독점적 이용 허락이 부여됩니다.\n\n## 3. 침해 신고\n저작권 침해 신고 접수 시 소명 절차를 거쳐 삭제/복원 여부를 결정합니다.`,
    false
  ),
  makePolicy(
    'youth',
    '청소년 보호 정책',
    `## 1. 연령 기준\n만 14세 미만은 법정대리인 동의 없이는 이용할 수 없습니다.\n\n## 2. 유해 콘텐츠 차단\n청소년에게 유해한 콘텐츠는 정책에 따라 제한됩니다.\n\n## 3. 신고 및 보호\n청소년 유해 행위가 확인되면 즉시 조치하며 관련 기관 요청에 협조합니다.`,
    false
  ),
  makePolicy(
    'safety_disclaimer',
    '다이빙 안전 면책 조항',
    `## 1. 위험 스포츠 고지\n다이빙은 본질적으로 위험을 수반하며 사고 가능성이 존재합니다.\n\n## 2. 사용자 책임\n입수 여부, 장비 점검, 버디 관리, 교육 수준 판단은 전적으로 사용자 책임입니다.\n\n## 3. 정보 참고용\n앱의 추천, 로그 요약, 지도/날씨 정보는 참고용이며 현장 판단을 대체하지 않습니다.\n\n## 4. 구조 보장 부인\n앱은 긴급 구조를 보장하지 않으며 응급상황 대응 책임은 사용자 및 현장 운영 주체에게 있습니다.`,
    false
  ),
  makePolicy(
    'medical_notice',
    '의료/안전 책임 고지',
    `## 1. 의료 자문 아님\n본 서비스의 정보는 의료 자문이 아니며 건강 상태 판단을 대체하지 않습니다.\n\n## 2. 건강 상태 확인\n사용자는 다이빙 전 개인 건강 상태와 적합성을 직접 확인해야 합니다.\n\n## 3. 사고 책임 제한\n의학적·신체적 상태로 인한 사고에 대해 회사는 법령상 허용 범위에서 책임을 제한합니다.`,
    false
  ),
  makePolicy(
    'ai_notice',
    'AI 기능 안내 및 책임 제한',
    `## 1. AI 기능 성격\nAI 요약/추천/캡션/위험도 설명은 OpenAI 기반 보조 기능으로 참고용입니다.\n\n## 2. 정확도 한계\nAI 결과는 오류, 지연, 문맥 누락이 발생할 수 있으며 정확성을 보장하지 않습니다.\n\n## 3. 사용자 검토 의무\n사용자는 게시 전 AI 결과를 직접 검토·수정해야 합니다.\n\n## 4. 책임 제한\nAI 결과를 신뢰해 발생한 손해에 대해 회사는 법령상 허용 범위 내 책임을 제한합니다.`,
    false
  ),
  makePolicy(
    'external_api_notice',
    '외부 API 연동 고지',
    `## 1. 연동 대상\nGoogle, Apple, Kakao, Facebook, Stormglass, Garmin, Suunto, Shearwater, Cloudinary, Firebase, OpenAI 등 외부 서비스를 사용할 수 있습니다.\n\n## 2. 데이터 전달\n기능 수행에 필요한 최소 항목이 외부 서비스로 전송될 수 있습니다.\n\n## 3. 장애 및 만료\n외부 API 장애, 정책 변경, 토큰 만료로 일부 기능이 제한될 수 있습니다.`,
    false
  ),
  makePolicy(
    'bluetooth_notice',
    'Bluetooth 기기 연동 고지',
    `## 1. BLE 연동\n다이빙 컴퓨터 로그 수집을 위해 Bluetooth 및 위치 권한이 필요할 수 있습니다.\n\n## 2. 데이터 누락/오차\n기기 제조사 프로토콜 차이로 동기화 누락, 지연, 오차가 발생할 수 있습니다.\n\n## 3. 책임 제한\n기기·OS·통신 상태로 인한 동기화 실패에 대해 회사는 책임을 제한합니다.`,
    false
  ),
  makePolicy(
    'cookie',
    '쿠키 정책',
    `## 1. 쿠키/유사기술\n웹/앱 서비스에서 로그인 유지, 보안, 통계 분석을 위해 쿠키 또는 유사 기술을 사용할 수 있습니다.\n\n## 2. 선택권\n사용자는 브라우저/OS 설정에서 저장 제한 또는 삭제가 가능합니다.`,
    false
  ),
  makePolicy(
    'data_retention',
    '데이터 보관 및 삭제 정책',
    `## 1. 보관 원칙\n서비스 제공 및 법령 준수를 위한 최소 기간만 보관합니다.\n\n## 2. 삭제 절차\n보관 목적 달성 또는 사용자 요청 시 파기 정책에 따라 안전 삭제합니다.\n\n## 3. 백업 데이터\n백업 시스템 반영 지연으로 즉시 완전 삭제가 어려울 수 있으며, 일정 기간 후 순차 삭제됩니다.`,
    false
  ),
  makePolicy(
    'account_deletion',
    '계정 삭제 정책',
    `## 1. 삭제 요청\n사용자는 설정에서 계정 삭제를 요청할 수 있습니다.\n\n## 2. 대기 기간\n삭제 요청 후 복구 가능 기간(예: 7~30일)을 둘 수 있으며 기간 경과 후 영구 삭제됩니다.\n\n## 3. 삭제 범위\n프로필, 로그, 미디어, 연동 토큰, Bluetooth 연결 정보, AI 생성 데이터가 정책에 따라 삭제됩니다.`,
    false
  ),
  makePolicy(
    'report_sanction',
    '신고 및 제재 정책',
    `## 1. 신고 대상\n사용자, 게시글, 댓글, DiveLog, 사진/영상을 신고할 수 있습니다.\n\n## 2. 제재 단계\n경고, 임시 제한, 업로드 제한, 계정 정지, 영구 정지를 적용할 수 있습니다.\n\n## 3. 이의 제기\n사용자는 제재 결과에 대해 소명 자료를 제출할 수 있습니다.`,
    false
  ),
  makePolicy(
    'illegal_content',
    '불법 콘텐츠 금지 정책',
    `## 1. 금지 범위\n불법 촬영물, 성착취물, 폭력선동, 혐오조장, 테러·범죄 조장 콘텐츠를 금지합니다.\n\n## 2. 즉시 조치\n중대한 위법 가능성이 있는 경우 즉시 차단·삭제될 수 있습니다.\n\n## 3. 기관 협조\n관련 법령에 따라 수사기관 요청에 협조할 수 있습니다.`,
    false
  ),
  makePolicy(
    'report_process',
    '이용자 신고 처리 정책',
    `## 1. 처리 절차\n접수 → 분류 → 검토 → 조치 → 결과 안내 순으로 진행합니다.\n\n## 2. 처리 기준\n커뮤니티 정책, 법령, 재발 이력, 피해 정도를 종합 판단합니다.\n\n## 3. 허위 신고\n반복적 악의 신고는 서비스 이용 제한 사유가 될 수 있습니다.`,
    false
  ),
  makePolicy(
    'privacy_third_party',
    '개인정보 제3자 제공 고지',
    `## 1. 제공 원칙\n법령 근거 또는 이용자 동의가 있는 경우에 한해 최소 범위로 제공합니다.\n\n## 2. 제공 항목\n제공받는 자, 목적, 항목, 보관기간을 별도 고지합니다.\n\n## 3. 제공 통제\n이용자는 동의 기반 제공에 대해 거부/철회할 수 있습니다.`,
    false
  ),
  makePolicy(
    'privacy_overseas_transfer',
    '개인정보 국외 이전 고지',
    `## 1. 이전 사유\n글로벌 클라우드/분석/알림/AI 서비스 연동 과정에서 국외 이전이 발생할 수 있습니다.\n\n## 2. 보호 조치\n전송 구간 암호화, 접근 통제, 최소 권한 원칙을 적용합니다.\n\n## 3. 고지 항목\n이전 국가, 수탁자, 목적, 항목, 보관기간을 고지합니다.`,
    false
  ),
  makePolicy(
    'marketing_consent',
    '마케팅 정보 수신 동의',
    `## 1. 선택 동의\n이 동의는 선택사항이며 거부해도 기본 서비스 이용이 가능합니다.\n\n## 2. 발송 정보\n이벤트, 혜택, 신규 기능 안내를 발송할 수 있습니다.\n\n## 3. 철회\n설정에서 언제든지 수신을 거부할 수 있습니다.`,
    false
  ),
  makePolicy(
    'push_consent',
    '푸시 알림 수신 동의',
    `## 1. 선택 동의\n푸시 알림 수신은 선택사항이며 설정에서 변경 가능합니다.\n\n## 2. 알림 범위\n좋아요/댓글/팔로우/날씨경고/동기화 상태/자격증 상태 알림을 포함할 수 있습니다.`,
    false
  ),
  makePolicy(
    'age14_notice',
    '만 14세 이상 이용 안내',
    `## 1. 연령 확인\n회원가입 시 만 14세 이상 여부를 확인합니다.\n\n## 2. 미성년 보호\n법령상 보호 조치가 필요한 경우 추가 확인 절차를 진행할 수 있습니다.`,
    true
  ),
  makePolicy(
    'ugc_policy',
    'UGC(User Generated Content) 정책',
    `## 1. UGC 책임\n게시물의 정확성, 적법성, 초상권·저작권 책임은 작성자에게 있습니다.\n\n## 2. 운영 권한\n정책 위반 또는 법적 리스크가 있는 콘텐츠는 사전/사후 조치될 수 있습니다.\n\n## 3. 안전 문화\n위험행위 미화, 무면허 다이빙 조장, 허위 안전정보는 엄격히 제한됩니다.`,
    false
  ),
];

export const policyTypeOrder: PolicyType[] = policyDocumentsKo.map((doc) => doc.type);

export const signupRequiredConsentMap: Record<ConsentKey, PolicyType> = {
  terms_required: 'terms',
  privacy_required: 'privacy',
  location_required: 'location_terms',
  age14_required: 'age14_notice',
  marketing_optional: 'marketing_consent',
  push_optional: 'push_consent',
};

export const signupRequiredConsentKeys: ConsentKey[] = ['terms_required', 'privacy_required', 'location_required', 'age14_required'];
export const signupOptionalConsentKeys: ConsentKey[] = ['marketing_optional', 'push_optional'];

export function buildPolicyVersionMap(locale: 'ko' | 'en' = 'ko'): Record<PolicyType, string> {
  const docs = locale === 'ko' ? policyDocumentsKo : policyDocumentsKo;
  return docs.reduce((acc, doc) => {
    acc[doc.type] = doc.version;
    return acc;
  }, {} as Record<PolicyType, string>);
}
