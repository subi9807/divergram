import type { ConsentKey, PolicyDocument, PolicyType } from '../models';

export type PolicyLocale = 'ko' | 'en' | 'ja' | 'zh';

const VERSION = '2026.09.11';
const EFFECTIVE_FROM = '2026-09-11T00:00:00.000Z';

function makePolicy(type: PolicyType, title: string, content: string, requiredForSignup: boolean, locale: PolicyLocale = 'ko'): PolicyDocument {
  return {
    id: `policy-${type}-${VERSION}`,
    type,
    title,
    version: VERSION,
    locale,
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
    `## 1. 목적 및 운영자\n이 약관은 METAbyTREE가 운영하는 Divergram의 이용 조건과 회원 및 운영자의 권리·의무를 정합니다. 문의는 support@metabytree.com으로 접수합니다.\n\n## 2. 서비스 범위\nDivergram은 피드·릴스, 다이빙 로그, 생물도감, 포인트 지도, 리조트 및 교육 탐색·예약, 라이선스 관리, 외부 장비·SNS 연동과 AI 보조 기능을 제공합니다. 일부 기능은 지역, 기기, 계정 상태 또는 외부 서비스 정책에 따라 제한될 수 있습니다.\n\n## 3. 계정과 회원 정보\n회원은 정확한 정보를 제공하고 로그인 수단과 기기를 안전하게 관리해야 합니다. 이메일 또는 전화번호 변경에는 별도 인증이 요구될 수 있으며, 타인의 계정을 사용하거나 인증 절차를 우회해서는 안 됩니다.\n\n## 4. 콘텐츠와 공개 범위\n회원은 적법한 권리를 가진 콘텐츠만 등록해야 합니다. 콘텐츠별 공개 범위를 선택할 수 있으며, 공개 콘텐츠는 다른 이용자에게 노출되거나 회원의 선택에 따라 외부 SNS로 공유될 수 있습니다.\n\n## 5. 리조트·교육 예약\n리조트 및 교육 예약은 현장에서 제공되는 외부 서비스입니다. 예약 가능 여부, 최종 확정, 제공 조건과 환불은 해당 화면에 표시된 정책 및 서비스 제공자의 확인을 따릅니다. 리조트 예약금은 PayPal을 통해 처리하며 App Store 또는 Google Play 인앱결제 대상이 아닙니다.\n\n## 6. 연간회원 및 인앱결제\n연간회원은 앱 내 디지털 기능과 AI 이용량을 제공하는 자동 갱신 구독입니다. 결제 금액과 통화는 App Store 또는 Google Play 구매 화면에 표시되며, 갱신·해지·환불은 각 스토어 계정과 정책을 따릅니다. 구매 완료 후 스토어 영수증 검증이 성공해야 혜택이 활성화됩니다.\n\n## 7. 금지행위\n불법 촬영물, 성적 착취, 폭력·혐오, 사칭, 스팸, 저작권 침해, 위험 다이빙 조장, 허위 안전정보, 결제·AI 이용량 조작 및 서비스 침해 행위를 금지합니다.\n\n## 8. 서비스 변경과 중단\n운영, 보안, 점검, 법령 준수 또는 외부 API·스토어 정책 변경을 위해 서비스 일부를 변경하거나 일시 중단할 수 있습니다. 중요한 변경은 앱 또는 적절한 채널로 안내합니다.\n\n## 9. 책임 제한\n앱의 지도, 날씨, 해양, AI 및 장비 데이터는 참고 정보이며 현장 안전 판단을 대체하지 않습니다. 운영자는 고의 또는 중대한 과실이 없는 한 기기, 통신, 외부 서비스 또는 사용자의 판단으로 발생한 간접 손해에 대해 법령상 허용되는 범위에서 책임을 제한합니다.\n\n## 10. 준거법 및 분쟁\n대한민국 법령을 준거법으로 하며, 분쟁은 당사자 간 협의를 우선합니다. 강행 소비자보호 법령이 적용되는 경우 해당 법령이 우선합니다.`,
    true
  ),
  makePolicy(
    'privacy',
    '개인정보처리방침 및 수집·이용 동의',
    `## 1. 개인정보처리자\nMETAbyTREE는 Divergram 서비스 제공을 위해 개인정보를 처리합니다. 개인정보 관련 문의와 권리 행사는 support@metabytree.com으로 접수합니다.\n\n## 2. 수집 항목\n필수 항목은 이메일 또는 SNS 제공자 식별값, 닉네임, 가입 방법과 약관 동의 이력입니다. 기능 이용 시 인증된 이메일·국가번호 포함 전화번호, 프로필·라이선스 정보, 다이빙 로그, 위치, 사진·영상·음성, 예약 신청정보, 기기·푸시 토큰과 오류·보안 로그를 선택 또는 자동으로 처리할 수 있습니다. 비밀번호는 복호화할 수 없는 해시로 저장합니다.\n\n## 3. 결제 관련 정보\n연간회원 결제는 Apple 또는 Google이 처리합니다. 회사는 전체 카드번호를 저장하지 않으며 상품 ID, 거래·구매 토큰, 결제 상태, 구매·만료 시각 및 스토어 검증 결과만 처리합니다. 리조트 예약금은 PayPal이 처리합니다. 회사는 전체 카드번호를 저장하지 않으며, 예약 관리에 필요한 결제사업자 거래 식별자, 결제자 정보, 금액, 통화, 상태, 정산 및 환불 기록만 처리합니다.\n\n## 4. 이용 목적\n회원 식별·인증, 계정 및 연락처 관리, 콘텐츠·로그 동기화, AI 분석, 예약 처리, 구독 혜택 제공, 구매 복원, 부정 이용 방지, 고객 지원, 통계·서비스 개선과 법적 의무 이행에 이용합니다.\n\n## 5. 외부 처리와 국외 이전\n로그인, 푸시, 지도, 미디어 저장, AI 분석, 스토어 결제 검증 등 기능 수행에 필요한 최소 정보가 Apple, Google, Firebase, OpenAI 및 앱에 표시된 외부 서비스로 전송될 수 있습니다. 구체적인 수탁자·이전 항목·국가·기간은 관련 고지에서 확인할 수 있습니다.\n\n## 6. 보유 기간\n계정 정보는 회원 탈퇴 유예기간 종료 후 삭제합니다. 콘텐츠와 다이빙 기록은 이용자가 삭제하거나 계정이 삭제될 때까지 보관하며, 인증코드·보안 로그는 목적 달성에 필요한 제한된 기간만 보관합니다. 결제·분쟁 등 법정 보존 대상은 관계 법령이 정한 기간 동안 분리 보관합니다.\n\n## 7. 안전성 확보\n전송 구간 암호화, 접근권한 제한, 인증 토큰 보호, 비밀번호 해시, 민감 연락처 암호화 및 감사 로그 등 합리적인 보호조치를 적용합니다. 다만 이용자는 기기 잠금과 계정 보안을 직접 관리해야 합니다.\n\n## 8. 이용자 권리\n이용자는 앱의 프로필·설정에서 정보를 조회·정정하고 공개 범위를 변경할 수 있으며, 열람·삭제·처리정지·동의 철회 또는 계정 삭제를 요청할 수 있습니다. 선택 정보 제공을 거부해도 기본 가입은 가능하지만 해당 기능은 제한될 수 있습니다.\n\n## 9. 아동의 개인정보\n현재 만 14세 미만 이용자를 위한 법정대리인 동의 절차를 제공하지 않으므로 만 14세 미만은 가입할 수 없습니다.`,
    true
  ),
  makePolicy(
    'location_terms',
    '위치정보 이용약관',
    `## 1. 이용 목적\n다이빙 포인트 검색·지도 표시, 주변 리조트 탐색, 로그의 입수·출수 위치 기록, 사진과 다이빙 시간의 매칭 및 안전·환경 정보 제공을 위해 위치정보를 이용합니다.\n\n## 2. 수집 방법\n기기의 GPS·네트워크 위치, 사용자가 지도에서 선택한 좌표, 다이빙 컴퓨터·가져오기 파일의 좌표, 이용자가 선택한 사진의 EXIF GPS를 처리할 수 있습니다. 백그라운드 위치는 사용자가 해당 기능과 권한을 명시적으로 허용한 경우에만 이용합니다.\n\n## 3. 저장과 공개\n로그와 연결된 좌표는 해당 로그의 보관 기간 동안 저장됩니다. 공개 범위가 전체·팔로워·비공개 중 어떻게 설정되었는지에 따라 다른 이용자에게 표시되는 범위가 달라집니다. 정확한 집 주소나 민감 장소는 공개하지 않는 것을 권장합니다.\n\n## 4. 제3자 지도와 환경정보\n지도 표시, 지오코딩, 날씨·해양 정보 조회를 위해 필요한 좌표가 외부 지도 또는 환경정보 제공자에게 전송될 수 있습니다. 제공 결과에는 지연이나 오차가 있을 수 있습니다.\n\n## 5. 이용자 통제\n기기 설정에서 위치 권한을 변경하고, 앱에서 위치 공개 범위를 조정하거나 저장된 로그·사진 정보를 삭제할 수 있습니다. 권한을 거부해도 수동 위치 입력은 가능하지만 일부 주변 검색과 자동 매칭 기능은 제한됩니다.\n\n## 6. 정확도와 안전\n위치는 센서, 수중 환경, 통신 상태와 원본 데이터에 따라 오차가 발생할 수 있으며 항법·구조용 정보가 아닙니다. 현장 안전 판단에는 공식 해도와 현지 운영자의 안내를 우선해야 합니다.`,
    false
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
    `## 1. 운영 원칙\nDivergram은 해양 생태계를 존중하고 안전한 다이빙 경험을 공유하는 커뮤니티를 지향합니다. 이용자는 서로의 수준, 문화, 신체 조건과 개인정보를 존중해야 합니다.\n\n## 2. 허용되지 않는 콘텐츠\n불법 촬영물, 성적 착취, 폭력·혐오·차별, 괴롭힘, 사칭, 스팸, 불법 거래·광고, 저작권·초상권 침해, 개인정보 노출, 야생생물 포획·훼손, 위험 다이빙 조장 및 허위 안전정보를 금지합니다.\n\n## 3. 다이빙·생물 정보의 책임\n로그, 생물 식별, 라이선스와 리조트 정보는 게시자가 확인해야 합니다. AI 후보나 자동 수집 정보는 확정 사실이 아니며, 잘못된 생물 식별 또는 안전 수치를 전문가 정보처럼 표시해서는 안 됩니다.\n\n## 4. 공개와 공유\n게시물, 릴스, 로그와 생물 발견 기록은 이용자가 지정한 공개 범위에 따라 노출됩니다. 외부 SNS 공유 전 저작권, 위치정보와 다른 사람의 초상권을 확인해야 합니다.\n\n## 5. 신고와 검토\n각 콘텐츠와 이용자는 앱에서 신고할 수 있습니다. 신고는 유형·위험도·반복성에 따라 검토하며 긴급하거나 명백한 위법 콘텐츠는 사전 통지 없이 임시 차단할 수 있습니다.\n\n## 6. 제재와 이의제기\n위반 정도에 따라 노출 제한, 콘텐츠 삭제, 기능 제한, 경고, 일시 정지 또는 영구 정지를 적용할 수 있습니다. 조치에 대한 소명과 이의제기는 support@metabytree.com으로 접수합니다.\n\n## 7. 상업 콘텐츠\n리조트·교육·장비 광고와 협찬 콘텐츠는 관계를 명확히 표시해야 하며, 기만적 후기·평점 조작·반복 홍보를 금지합니다.`,
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
    `## 1. 위험 스포츠 고지\n스쿠버다이빙과 프리다이빙은 감압질환, 압력 손상, 익수, 저산소증, 장비 고장, 조류·기상 변화와 해양생물 접촉 등 중대한 위험을 수반합니다.\n\n## 2. 교육과 자격\n자신의 교육·라이선스·경험 범위를 벗어난 다이빙을 해서는 안 됩니다. 앱에 표시된 라이선스, 최대 수심 또는 AI 설명은 교육기관의 원본 자격과 현장 운영자의 확인을 대체하지 않습니다.\n\n## 3. 현장 판단\n입수 전 건강상태, 버디, 장비, 기체, 감압계획, 날씨·파도·조류, 현지 법규와 비상절차를 직접 확인해야 합니다. 현장 전문가 또는 운영자의 중단 지시는 앱 정보보다 우선합니다.\n\n## 4. 앱 정보의 한계\n지도, 날씨, 해양 데이터, 자동 생성 로그, 사진·음성 분석과 AI 내러티브에는 누락·지연·오류가 있을 수 있으며 항법, 의료, 감압계획 또는 구조 지시로 사용해서는 안 됩니다.\n\n## 5. 건강과 응급상황\n앱은 의료 진단이나 긴급 구조 서비스를 제공하지 않습니다. 이상 증상이 있거나 사고가 발생하면 즉시 다이빙을 중단하고 현지 응급기관과 다이빙 의료 전문가에게 연락해야 합니다.\n\n## 6. 미성년자와 동행자\n미성년자 및 초보자는 법정대리인, 적절한 교육자와 현장 운영자의 감독 기준을 따라야 합니다. 버디 정보와 비상 연락처는 당사자의 동의를 받아 관리해야 합니다.`,
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
    `## 1. 제공 기능\nAI는 다이빙 로그 구조화·요약·내러티브, 사진·영상 속 해양생물 후보, 음성의 텍스트 변환, 번역과 콘텐츠 작성 보조에 사용됩니다. 기능별 제공 여부와 모델은 운영 상황에 따라 달라질 수 있습니다.\n\n## 2. 입력 데이터\n이용자가 기능 실행을 선택하면 텍스트, 로그 수치, 위치·환경정보, 사진, 영상의 대표 프레임 또는 음성이 분석 제공자에게 전송될 수 있습니다. 불필요한 얼굴, 연락처, 자격번호와 민감정보는 입력하지 않아야 합니다.\n\n## 3. 결과의 성격\nAI 결과는 확률적 후보이며 사실 확인, 생물학적 감정, 의료·안전·감압·항법 자문이 아닙니다. 같은 입력에도 결과가 달라질 수 있고 존재하지 않는 내용을 생성할 수 있습니다.\n\n## 4. 사용자 확인\n생물 후보, 로그 필드와 게시 문구는 저장·공개 전에 이용자가 직접 확인하고 수정해야 합니다. AI 후보를 선택했다는 사실은 전문가 검증을 의미하지 않습니다.\n\n## 5. 이용량과 연간회원\n무료 또는 연간회원별 월간 AI 크레딧이 적용될 수 있습니다. 사진·영상 등 기능마다 차감량이 다르며 캐시된 동일 결과는 정책에 따라 다시 차감하지 않을 수 있습니다. 실제 구독 가격과 갱신 조건은 스토어 구매 화면을 따릅니다.\n\n## 6. 캐시와 비용 관리\n중복 호출과 비용을 줄이기 위해 미디어 해시와 분석 결과를 제한적으로 캐시할 수 있습니다. 원본 미디어의 보관 여부와 기간은 업로드 기능 및 개인정보처리방침을 따릅니다.\n\n## 7. 실패와 제한\n네트워크, 이용량 한도, 외부 API 장애, 지원하지 않는 형식 또는 낮은 품질로 분석이 실패할 수 있습니다. 실패 시 수동 입력 또는 재시도를 제공하며 결제 검증 없이 유료 혜택을 임의로 활성화하지 않습니다.\n\n## 8. 문의\nAI 결과나 개인정보 처리에 관한 문의는 support@metabytree.com으로 접수합니다.`,
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
    `## 1. 선택 동의\n이 동의는 선택사항이며 거부해도 회원가입과 기본 서비스 이용이 가능합니다.\n\n## 2. 이용 목적과 수신 채널\n이벤트, 혜택 및 신규 기능 안내를 앱 알림 또는 등록된 이메일로 발송할 수 있습니다.\n\n## 3. 보유 기간과 철회\n동의일로부터 회원 탈퇴 또는 동의 철회 시까지 보관하며, 설정에서 언제든지 철회할 수 있습니다.`,
    false
  ),
  makePolicy(
    'push_consent',
    '푸시 알림 수신 동의',
    `## 1. 선택 동의\n푸시 알림 수신은 선택사항이며 거부해도 회원가입할 수 있습니다. 기기의 알림 권한은 앱 사용 중 별도로 요청합니다.\n\n## 2. 알림 범위\n좋아요, 댓글, 팔로우, 날씨 경고, 동기화 상태 및 라이선스 상태 알림을 포함할 수 있습니다.\n\n## 3. 철회\n앱 설정과 기기 설정에서 언제든지 수신을 중단할 수 있습니다.`,
    false
  ),
  makePolicy(
    'age14_notice',
    '만 14세 이상 이용 안내',
    `## 1. 연령 확인\n회원가입 신청자는 본인이 만 14세 이상임을 확인합니다.\n\n## 2. 가입 제한\nDivergram은 현재 만 14세 미만 사용자의 법정대리인 동의 절차를 제공하지 않으므로 만 14세 미만은 가입할 수 없습니다.`,
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

type LocalizedPolicyCopy = { title: string; content: string };

const localizedPolicyCopies: Record<Exclude<PolicyLocale, 'ko'>, Record<PolicyType, LocalizedPolicyCopy>> = {
  en: {
    terms: { title: 'Terms of Service', content: '## 1. Operator and scope\nThese Terms govern Divergram, operated by METAbyTREE. The service includes social feeds, dive logs, marine-life guides, maps, resort and training discovery and booking, license management, integrations, and AI-assisted features. Contact support@metabytree.com for service inquiries.\n\n## 2. Accounts and content\nMembers must provide accurate information, protect their sign-in methods, and upload only content they have the right to use. Visibility controls determine who can view content, and external sharing occurs only when initiated or enabled by the member.\n\n## 3. Resort and training bookings\nBookings concern services delivered outside the app. Availability, confirmation, cancellation, and refunds follow the policy shown during booking and the provider confirmation. Resort deposits are processed by PayPal and are not App Store or Google Play in-app purchases.\n\n## 4. Annual membership\nAnnual membership is an auto-renewing subscription for digital app features and AI usage. Price and currency are displayed by the App Store or Google Play. Renewal, cancellation, and refund handling follow the applicable store policy. Benefits activate only after server verification of a valid store purchase.\n\n## 5. Prohibited conduct\nIllegal imagery, exploitation, violence, hate, harassment, impersonation, spam, infringement, false safety information, unsafe-diving promotion, payment manipulation, and interference with the service are prohibited.\n\n## 6. Changes and liability\nFeatures may change or pause for operations, security, law, or external-service policy changes. Maps, weather, marine, AI, and equipment data are references and never replace on-site safety decisions. Liability is limited to the extent permitted by applicable law.\n\n## 7. Governing law\nThe laws of the Republic of Korea apply, subject to mandatory consumer protections in the user’s jurisdiction.' },
    privacy: { title: 'Privacy Policy and Collection Consent', content: '## 1. Controller and contact\nMETAbyTREE processes personal data for Divergram. Privacy requests may be sent to support@metabytree.com.\n\n## 2. Data processed\nRequired data includes an email or social-provider identifier, nickname, signup method, and consent history. Depending on features used, Divergram may process verified email and phone, profile and certification data, dive logs, location, photos, video, voice, booking details, device and push tokens, and security logs. Passwords are stored as non-reversible hashes.\n\n## 3. Payments\nApple or Google processes annual-membership payments. Divergram does not store full card numbers; it processes product IDs, transaction or purchase tokens, status, purchase and expiry times, and verification results. Resort deposits are processed by PayPal. Divergram stores only the provider identifiers, payer details returned by the provider, amount, currency, status, and settlement or refund records needed to manage the booking; it does not store full card numbers.\n\n## 4. Purposes\nData supports authentication, account and contact management, content and log sync, AI analysis, bookings, subscription benefits, purchase restoration, fraud prevention, support, analytics, service improvement, and legal compliance.\n\n## 5. Processors and international transfers\nMinimum necessary data may be sent to Apple, Google, Firebase, OpenAI, and displayed integration providers for sign-in, push, maps, media, AI, and store verification. Provider, country, fields, purpose, and retention are described in applicable notices.\n\n## 6. Retention and security\nAccount data is deleted after the withdrawal grace period, except legally required records. Divergram applies transport encryption, access controls, token protection, password hashing, encrypted sensitive contact data, and audit logging.\n\n## 7. Your rights\nUsers may view and correct profile data, adjust visibility, delete content, withdraw optional consent, and request access, deletion, restriction, or account closure. Declining optional data limits only the related feature. Users under 14 may not register because guardian-consent processing is not currently provided.' },
    location_terms: { title: 'Location-Based Service Terms', content: '## 1. Purposes\nLocation supports dive-point maps, nearby resorts, entry and exit points, photo-to-dive matching, and environmental information.\n\n## 2. Sources\nDivergram may process device GPS or network location, coordinates selected on a map, dive-computer or import-file coordinates, and EXIF GPS from media selected by the user. Background location is used only after explicit feature and permission choices.\n\n## 3. Storage and visibility\nCoordinates connected to a dive log are retained with that log. Public, followers, or private visibility determines exposure. Users should avoid publishing home addresses or sensitive sites.\n\n## 4. External providers and control\nCoordinates may be sent to map, geocoding, weather, or marine-data providers. Users can change device permission, edit visibility, or delete stored logs and media. Manual input remains available when permission is denied, but automatic and nearby features may be limited.\n\n## 5. Accuracy\nLocation may be inaccurate and is not navigation or rescue data. Official charts and local-operator instructions take priority.' },
    location_privacy: { title: 'Location Information Privacy Policy', content: '## Data and retention\nCurrent location, dive-point coordinates, entry and exit points, and visibility settings may be processed. Locations attached to dive logs are retained for the same period as the logs.\n\n## Sharing and choice\nSharing follows the public, followers, or private setting selected by the user. If location permission is denied, manual search remains available while location-based features may be limited.' },
    community: { title: 'Community Guidelines', content: '## 1. Principles\nDivergram promotes safe diving, respect for marine ecosystems, and respectful interaction across experience levels and cultures.\n\n## 2. Prohibited content\nIllegal imagery, exploitation, violence, hate, harassment, impersonation, spam, unlawful sales, infringement, personal-data exposure, wildlife harm, false safety information, and encouragement of unsafe diving are prohibited.\n\n## 3. Accuracy and sharing\nPublishers must review dive logs, species identifications, licenses, and resort information. AI candidates are not expert verification. Before external sharing, confirm copyright, location privacy, and image rights.\n\n## 4. Reports and enforcement\nUsers and content can be reported in-app. Depending on risk and repetition, actions may include reduced visibility, removal, feature restriction, warning, suspension, or permanent termination. Clearly unlawful or urgent content may be temporarily blocked before notice. Appeals may be sent to support@metabytree.com.\n\n## 5. Commercial content\nResort, training, equipment, sponsorship, and advertising relationships must be disclosed. Deceptive reviews, rating manipulation, and repetitive promotion are prohibited.' },
    content_upload: { title: 'Content Upload Policy', content: '## Rights and safety\nUpload only content you created or have the lawful right to use. Illegal filming, unauthorized copying, portrait-right violations, and sexual or violent content are prohibited. Misleading information that could endanger divers may be removed.' },
    copyright: { title: 'Copyright Policy', content: '## Ownership and license\nUsers generally retain copyright in uploaded content and grant Divergram a non-exclusive license only as needed to operate, transmit, and display the service.\n\n## Claims\nReported infringement is reviewed through a notice and response process before removal or restoration.' },
    youth: { title: 'Youth Protection Policy', content: '## Age and protection\nUsers under 14 may not use the service without legally valid guardian consent. Harmful content is restricted, and confirmed harmful conduct is addressed promptly with cooperation from competent authorities where required.' },
    safety_disclaimer: { title: 'Diving Safety Notice', content: '## 1. Inherent risk\nScuba and freediving involve serious risks including decompression illness, pressure injury, drowning, hypoxia, equipment failure, changing conditions, and wildlife encounters.\n\n## 2. Training and field decisions\nNever dive beyond your training, certification, health, or experience. Check buddies, equipment, gas, decompression plan, weather, currents, local law, and emergency procedures. Instructions from qualified on-site personnel take priority over app information.\n\n## 3. Information limitations\nMaps, weather, marine data, generated logs, photo or voice analysis, and AI narratives may be delayed, incomplete, or wrong. They must not be used as navigation, medical, decompression, or rescue instructions.\n\n## 4. Emergencies\nDivergram does not provide medical diagnosis or guarantee rescue. Stop diving and contact local emergency and dive-medicine services if symptoms or an incident occur. Minors and beginners must follow guardian, instructor, and operator supervision rules.' },
    medical_notice: { title: 'Medical and Safety Notice', content: '## Not medical advice\nService information is not medical advice and cannot replace professional assessment. Users must confirm their own health and fitness before diving. Liability for accidents related to personal medical conditions is limited as permitted by law.' },
    ai_notice: { title: 'AI Feature Notice', content: '## 1. Features and inputs\nAI may structure and narrate dive logs, suggest marine-life candidates from photos or video frames, transcribe voice, translate text, and assist writing. When requested, text, dive metrics, location or environment data, media frames, or voice may be sent to an AI provider.\n\n## 2. Limitations\nOutputs are probabilistic candidates, not expert species identification or medical, safety, decompression, navigation, or rescue advice. They can omit facts or generate incorrect information.\n\n## 3. User confirmation\nUsers must review and edit species candidates, log fields, and publication text before saving or sharing. Selecting an AI candidate does not mean expert verification.\n\n## 4. Credits and membership\nMonthly AI credits may differ between free and annual plans. Photos and videos can consume different amounts, while cached identical results may not consume another credit. Store pricing and renewal terms control the subscription.\n\n## 5. Caching and failure\nMedia hashes and results may be cached to reduce duplicate processing and cost. Network, quota, provider, format, or quality issues can cause failure, in which case manual entry or retry remains available. Paid benefits are never activated without verified store purchase.\n\n## 6. Contact\nSend AI or privacy questions to support@metabytree.com.' },
    external_api_notice: { title: 'External API Integration Notice', content: '## External services\nDivergram may use services such as Google, Apple, Meta, weather, device, media, notification, and AI providers. Only the minimum data needed for a feature may be transferred. Outages, policy changes, or expired tokens may limit features.' },
    bluetooth_notice: { title: 'Bluetooth Device Integration Notice', content: '## BLE integration\nBluetooth and location permission may be required to collect dive-computer logs. Protocol differences can cause missing, delayed, or inaccurate synchronization. Liability for failures caused by devices, operating systems, or connectivity is limited.' },
    cookie: { title: 'Cookie Policy', content: '## Cookies and similar technologies\nCookies or similar technologies may be used for login continuity, security, and analytics. Users may restrict or delete them in browser or operating-system settings.' },
    data_retention: { title: 'Data Retention and Deletion Policy', content: '## Retention and deletion\nData is kept only as long as necessary to provide the service and comply with law, then securely deleted when the purpose ends or on a valid request. Backup deletion may occur gradually because of synchronization delays.' },
    account_deletion: { title: 'Account Deletion Policy', content: '## Request and recovery\nUsers may request account deletion in Settings. The account may be restored during the stated recovery period; after that period, it is permanently deleted.\n\n## Scope\nProfiles, logs, media, linked tokens, device connections, and generated data are deleted according to this policy, subject to legal retention duties.' },
    report_sanction: { title: 'Reporting and Enforcement Policy', content: '## Reports and sanctions\nUsers, posts, comments, dive logs, photos, and videos may be reported. Warnings, temporary restrictions, upload limits, suspension, or permanent bans may apply. Users may submit supporting information to appeal a decision.' },
    illegal_content: { title: 'Illegal Content Prohibition Policy', content: '## Prohibited content\nIllegal recordings, sexual exploitation, incitement to violence or hatred, terrorism, and criminal promotion are prohibited. Serious suspected violations may be blocked or removed immediately, and Divergram may cooperate with authorities as required by law.' },
    report_process: { title: 'User Report Handling Policy', content: '## Process\nReports proceed through receipt, classification, review, action, and result notification. Community rules, law, repeat conduct, and severity are considered. Repeated malicious false reporting may lead to restrictions.' },
    privacy_third_party: { title: 'Third-Party Provision of Personal Information', content: '## Principles\nPersonal information is provided only where law permits or the user has consented, and only to the minimum extent. The recipient, purpose, items, and retention period are disclosed separately. Consent-based provision may be refused or withdrawn.' },
    privacy_overseas_transfer: { title: 'Overseas Transfer of Personal Information', content: '## Transfers and safeguards\nInternational transfer may occur when using global cloud, analytics, notification, or AI providers. Divergram applies transport encryption, access controls, and least privilege, and discloses the destination, recipient, purpose, items, and retention period.' },
    marketing_consent: { title: 'Consent to Receive Marketing Information', content: '## Optional consent\nYou may receive events, benefits, and new-feature notices through app notifications or registered email. Refusal does not affect basic service use. Consent is retained until account withdrawal or revocation and can be withdrawn in Settings.' },
    push_consent: { title: 'Consent to Receive Push Notifications', content: '## Optional consent\nPush notifications may include likes, comments, follows, weather warnings, synchronization, and license status. Device permission is requested separately. Refusal does not prevent signup, and notifications can be disabled at any time.' },
    age14_notice: { title: 'Age 14 or Older Confirmation', content: '## Age requirement\nThe applicant confirms that they are at least 14 years old. Divergram currently does not provide a guardian-consent process for children under 14, so they cannot register.' },
    ugc_policy: { title: 'User-Generated Content Policy', content: '## User responsibility\nAuthors are responsible for the accuracy, legality, portrait rights, and copyright of their posts. Policy-violating or legally risky content may be moderated. Glorification of dangerous behavior, unlicensed diving, and false safety information is strictly restricted.' },
  },
  ja: {} as Record<PolicyType, LocalizedPolicyCopy>,
  zh: {} as Record<PolicyType, LocalizedPolicyCopy>,
};

const localizedTitlesJa: Record<PolicyType, string> = {
  terms:'利用規約',privacy:'個人情報の収集・利用への同意',location_terms:'位置情報利用規約',location_privacy:'位置情報プライバシーポリシー',community:'コミュニティ運営ポリシー',content_upload:'コンテンツ投稿ポリシー',copyright:'著作権ポリシー',youth:'青少年保護ポリシー',safety_disclaimer:'ダイビング安全免責事項',medical_notice:'医療・安全に関する注意事項',ai_notice:'AI機能の案内と免責事項',external_api_notice:'外部API連携に関する告知',bluetooth_notice:'Bluetooth機器連携に関する告知',cookie:'Cookieポリシー',data_retention:'データ保持・削除ポリシー',account_deletion:'アカウント削除ポリシー',report_sanction:'通報・制裁ポリシー',illegal_content:'違法コンテンツ禁止ポリシー',report_process:'利用者通報処理ポリシー',privacy_third_party:'個人情報の第三者提供に関する告知',privacy_overseas_transfer:'個人情報の国外移転に関する告知',marketing_consent:'マーケティング情報受信への同意',push_consent:'プッシュ通知受信への同意',age14_notice:'14歳以上の利用確認',ugc_policy:'ユーザー生成コンテンツポリシー'
};
const localizedTitlesZh: Record<PolicyType, string> = {
  terms:'使用条款',privacy:'个人信息收集与使用同意',location_terms:'位置信息使用条款',location_privacy:'位置信息隐私政策',community:'社区运营政策',content_upload:'内容上传政策',copyright:'版权政策',youth:'青少年保护政策',safety_disclaimer:'潜水安全免责声明',medical_notice:'医疗与安全告知',ai_notice:'AI功能说明与免责声明',external_api_notice:'外部API连接告知',bluetooth_notice:'蓝牙设备连接告知',cookie:'Cookie政策',data_retention:'数据保留与删除政策',account_deletion:'账号删除政策',report_sanction:'举报与处罚政策',illegal_content:'非法内容禁止政策',report_process:'用户举报处理政策',privacy_third_party:'向第三方提供个人信息告知',privacy_overseas_transfer:'个人信息跨境传输告知',marketing_consent:'接收营销信息同意',push_consent:'接收推送通知同意',age14_notice:'年满14周岁确认',ugc_policy:'用户生成内容政策'
};

const localizedSummariesJa: Record<PolicyType, string> = {
  terms:'Divergramのサービス利用条件、会員と運営者の権利・義務、禁止行為、サービス変更、責任範囲および準拠法を定めます。',privacy:'アカウント認証とサービス提供に必要な識別情報、同意履歴、利用機能に応じたプロフィール・位置・メディア情報の処理目的、保持期間および利用者の権利を説明します。',location_terms:'ダイビングポイント推薦、地図表示、ログ記録のために許可された位置情報を利用します。位置共有は設定でいつでも変更できます。',location_privacy:'現在地、ポイント座標、入水・出水位置および公開範囲の処理、保持、共有方法を説明します。',community:'安全で信頼できるコミュニティのため、違法・暴力・差別・なりすまし・スパム・危険行為を禁止し、違反時の措置を定めます。',content_upload:'本人が権利を持つコンテンツのみ投稿でき、違法撮影、無断転載、肖像権侵害、有害または危険な情報を禁止します。',copyright:'投稿コンテンツの著作権、サービス運営に必要な利用許諾、および侵害申告の処理方法を定めます。',youth:'14歳未満の利用制限と、有害コンテンツ・行為から青少年を保護するための対応を定めます。',safety_disclaimer:'ダイビングには固有の危険があり、体調、装備、バディ、訓練範囲の判断は利用者の責任です。アプリ情報は現場判断の代替ではありません。',medical_notice:'アプリの情報は医療助言ではありません。ダイビング前に自身の健康状態と適性を専門家と確認してください。',ai_notice:'AIによる要約、推薦、説明は補助情報であり誤りが含まれる場合があります。公開前に利用者が確認・修正してください。',external_api_notice:'ログイン、地図、天気、メディア、通知、AIなどの機能で外部サービスへ必要最小限の情報が送信される場合があります。',bluetooth_notice:'ダイブコンピューター連携にはBluetooth等の権限が必要で、機器や通信状態により同期の遅延・欠落・誤差が生じる場合があります。',cookie:'ログイン維持、セキュリティ、統計のためCookie等を利用する場合があり、端末設定で制限または削除できます。',data_retention:'サービス提供と法令遵守に必要な期間のみデータを保持し、目的達成後または適法な要請により安全に削除します。',account_deletion:'設定から削除を申請でき、案内された猶予期間内は復旧できます。期間終了後、法定保存対象を除き関連データを削除します。',report_sanction:'利用者やコンテンツを通報でき、違反程度に応じて警告、制限、停止等を適用します。異議申立て資料を提出できます。',illegal_content:'違法撮影物、性的搾取、暴力・憎悪・犯罪を助長するコンテンツを禁止し、重大な場合は直ちに遮断・削除します。',report_process:'通報は受付、分類、審査、措置、結果通知の順で処理し、悪意ある虚偽通報は制限対象となる場合があります。',privacy_third_party:'法的根拠または同意がある場合に限り、提供先、目的、項目、保持期間を明示して必要最小限の情報を第三者へ提供します。',privacy_overseas_transfer:'グローバルサービス利用に伴う国外移転の国、受領者、目的、項目、保持期間と、暗号化・アクセス制御等の保護措置を説明します。',marketing_consent:'イベント、特典、新機能のお知らせを受け取るための任意同意です。拒否しても基本サービスを利用でき、設定で撤回できます。',push_consent:'いいね、コメント、フォロー、安全、同期等の通知を受け取るための任意同意です。端末設定でいつでも停止できます。',age14_notice:'登録者は14歳以上であることを確認します。現在、14歳未満向けの法定代理人同意手続は提供していません。',ugc_policy:'投稿の適法性、正確性、著作権・肖像権は投稿者が責任を負い、危険行為や虚偽の安全情報を厳しく制限します。'
};
const localizedSummariesZh: Record<PolicyType, string> = {
  terms:'本条款规定Divergram服务的使用条件、用户与运营方的权利义务、禁止行为、服务变更、责任范围及适用法律。',privacy:'说明账号认证和服务所需的身份信息、同意记录及按功能处理的头像、位置和媒体数据的目的、保存期限与用户权利。',location_terms:'经用户授权后，位置信息可用于潜点推荐、地图显示和潜水日志。用户可随时在设置中更改位置收集与共享。',location_privacy:'说明当前位置、潜点坐标、入水和出水位置及公开范围的处理、保存和共享方式。',community:'为维护安全可信的社区，禁止违法、暴力、歧视、冒充、垃圾信息和鼓励危险潜水的内容，并规定违规措施。',content_upload:'仅可上传本人创作或合法取得权利的内容，禁止非法拍摄、盗用、侵犯肖像权以及有害或危险信息。',copyright:'规定用户内容的版权归属、服务运营所需的非独占许可及版权侵权举报处理方式。',youth:'规定未满14周岁用户的使用限制，以及保护青少年免受有害内容和行为影响的措施。',safety_disclaimer:'潜水具有固有风险，健康、装备、潜伴和训练范围由用户自行判断。应用内信息不能替代现场判断。',medical_notice:'本服务信息不构成医疗建议。潜水前请确认自身健康状况和潜水适宜性，必要时咨询专业人员。',ai_notice:'AI摘要、推荐和说明仅供辅助参考，可能存在错误或遗漏，用户发布前应自行审核和修改。',external_api_notice:'登录、地图、天气、媒体、通知和AI等功能可能向外部服务传输实现功能所需的最少信息。',bluetooth_notice:'连接潜水电脑可能需要蓝牙等权限，设备、系统或网络状况可能导致同步延迟、缺失或误差。',cookie:'服务可能使用Cookie或类似技术维持登录、保障安全和进行统计，用户可在设备设置中限制或删除。',data_retention:'数据仅在提供服务和遵守法律所需期间保存，目的完成或收到合法请求后将安全删除。',account_deletion:'用户可在设置中申请删除账号，并可在提示的恢复期内恢复。期限届满后，除依法保存的数据外将删除相关数据。',report_sanction:'可举报用户或内容，并根据违规程度采取警告、限制或停用措施。用户可以提交材料申诉。',illegal_content:'禁止非法影像、性剥削、煽动暴力仇恨或犯罪的内容，严重疑似违法内容可被立即屏蔽或删除。',report_process:'举报按照受理、分类、审核、处理和结果通知的流程进行；恶意虚假举报可能受到限制。',privacy_third_party:'仅在法律允许或用户同意时，明确接收方、目的、项目和保存期限后，向第三方提供必要的最少信息。',privacy_overseas_transfer:'说明使用全球服务时跨境传输的国家、接收方、目的、项目、保存期限及加密和访问控制措施。',marketing_consent:'这是接收活动、优惠和新功能信息的可选同意。拒绝不影响基本服务，并可随时在设置中撤回。',push_consent:'这是接收点赞、评论、关注、安全和同步等推送的可选同意，可随时在设备设置中关闭。',age14_notice:'注册者确认已年满14周岁。Divergram目前不提供未满14周岁用户的监护人同意流程。',ugc_policy:'发布者对内容的合法性、准确性、版权和肖像权负责；平台严格限制危险行为和虚假安全信息。'
};

Object.assign(localizedSummariesJa, {
  terms: 'METAbyTREEが運営するDivergramのアカウント、コンテンツ、リゾート・教育予約、年間会員の自動更新型アプリ内課金、禁止行為、サービス変更、責任範囲を定めます。リゾート予約金は現地で提供されるサービスのため、PayPalで処理します。',
  privacy: '認証済みメール・電話番号、プロフィール、ダイブログ、位置、写真・動画・音声、予約、端末情報およびストア購入検証情報の処理目的、外部委託、保持期間、安全管理措置、利用者の権利を説明します。カード番号はDivergramに保存されません。',
  location_terms: '端末GPS、地図で選択した座標、ダイブコンピューター、インポートデータ、選択した写真のEXIF位置を、ポイント検索、ログ記録、写真マッチングに利用します。公開範囲と端末権限は利用者が変更できます。',
  community: '安全なダイビングと海洋環境の尊重を基本に、違法コンテンツ、嫌がらせ、権利侵害、野生生物への危害、虚偽の安全情報、広告関係の未表示を禁止し、通報、措置、異議申立ての基準を定めます。',
  safety_disclaimer: 'ダイビングには減圧障害、溺水、低酸素症、装備故障、環境変化など重大な危険があります。地図、天気、海洋データ、AI、ログは参考情報であり、医療・航法・減圧・救助判断の代わりにはなりません。',
  ai_notice: 'AIはログ、海洋生物候補、音声、翻訳、文章作成を補助します。入力が外部AI提供者へ送信される場合があり、結果は誤る可能性があります。利用者の確認、月間クレジット、キャッシュ、失敗時の手動入力について説明します。',
});

Object.assign(localizedSummariesZh, {
  terms: '本条款规定由METAbyTREE运营的Divergram账户、内容、度假村与培训预订、年度会员自动续订应用内购买、禁止行为、服务变更和责任范围。度假村订金属于线下服务，通过PayPal处理。',
  privacy: '说明已验证邮箱和电话、个人资料、潜水日志、位置、照片、视频、语音、预订、设备信息及商店购买验证数据的处理目的、外部处理方、保存期限、安全措施和用户权利。Divergram不保存完整卡号。',
  location_terms: '设备GPS、地图选择坐标、潜水电脑、导入数据及用户所选照片的EXIF位置可用于潜点搜索、日志记录和照片匹配。用户可调整公开范围和设备权限。',
  community: '以安全潜水和保护海洋环境为原则，禁止非法内容、骚扰、侵权、伤害野生生物、虚假安全信息及未披露商业关系，并规定举报、处置和申诉标准。',
  safety_disclaimer: '潜水可能导致减压病、溺水、缺氧、设备故障和环境风险。地图、天气、海洋数据、AI和自动日志仅供参考，不能替代医疗、导航、减压或救援判断。',
  ai_notice: 'AI用于辅助潜水日志、海洋生物候选、语音、翻译和写作。输入可能发送给外部AI提供商，结果可能错误。本文说明用户确认、月度额度、缓存和失败后的手动输入。',
});

const detailedPolicyCopiesJa: Partial<Record<PolicyType, LocalizedPolicyCopy>> = {
  terms: { title: '利用規約', content: '## 1. 運営者とサービス\nDivergramはMETAbyTREEが運営し、フィード、ダイブログ、海洋生物図鑑、地図、リゾート・教育予約、ライセンス管理、外部連携、AI補助機能を提供します。お問い合わせはsupport@metabytree.comで受け付けます。\n\n## 2. アカウントとコンテンツ\n会員は正確な情報を登録し、認証手段を安全に管理してください。適法な権利を持つコンテンツのみ投稿でき、公開範囲と外部共有は会員の設定に従います。\n\n## 3. 予約と決済\nリゾート・教育予約はアプリ外で提供されるサービスです。予約金はPayPalで処理し、App StoreまたはGoogle Playのアプリ内課金ではありません。\n\n## 4. 年間会員\n年間会員はデジタル機能とAI利用量を提供する自動更新購読です。価格、更新、解約、返金は各ストアの購入画面と規約に従い、購入検証後に特典が有効になります。\n\n## 5. 禁止行為と安全\n違法コンテンツ、嫌がらせ、なりすまし、権利侵害、虚偽の安全情報、危険行為、決済操作、サービス妨害を禁止します。地図、天気、AI、機器データは現場判断の代わりにはなりません。\n\n## 6. 変更と準拠法\n運営、安全、法令、外部サービスの変更により機能を変更・停止する場合があります。大韓民国法を準拠法とし、強行的な消費者保護法がある場合はこれを優先します。' },
  privacy: { title: 'プライバシーポリシーと収集・利用同意', content: '## 1. 管理者と連絡先\nMETAbyTREEはDivergramの提供に必要な個人情報を処理します。権利行使はsupport@metabytree.comへご連絡ください。\n\n## 2. 処理する情報\nメールまたはSNS識別子、ニックネーム、同意履歴のほか、機能に応じて認証済み電話番号、プロフィール、ライセンス、ダイブログ、位置、写真・動画・音声、予約、端末・通知・セキュリティ情報を処理します。パスワードは復元できないハッシュで保存します。\n\n## 3. 決済情報\n年間会員の決済はAppleまたはGoogleが処理します。Divergramは完全なカード番号を保存しません。年間会員については商品ID、取引・購入トークン、状態、購入・有効期限、検証結果を処理し、リゾート予約金についてはPayPalの取引識別子、決済者情報、金額、通貨、状態、精算・返金記録を処理します。\n\n## 4. 利用目的と外部処理\n認証、同期、AI分析、予約、購読特典、不正防止、サポート、改善、法令遵守に利用します。必要最小限の情報がApple、Google、Firebase、OpenAIおよび表示された連携先へ送信される場合があります。\n\n## 5. 保持と安全管理\n退会猶予期間後に削除し、法令上必要な記録のみ分離保管します。通信暗号化、アクセス制限、トークン保護、パスワードハッシュ、機密連絡先の暗号化、監査記録を適用します。\n\n## 6. 利用者の権利\n閲覧、訂正、削除、処理制限、任意同意の撤回、アカウント削除を請求できます。14歳未満向けの保護者同意手続は現在提供していません。' },
  location_terms: { title: '位置情報利用規約', content: '## 1. 目的\nポイント地図、周辺リゾート、入水・出水位置、写真とダイブログの照合、環境情報に位置を利用します。\n\n## 2. 情報源\n端末GPS・ネットワーク位置、地図で選択した座標、ダイブコンピューターやインポートデータ、選択した写真のEXIF GPSを処理する場合があります。\n\n## 3. 保存と公開\nログの座標はログと同じ期間保存され、公開・フォロワー・非公開の設定に従って表示されます。機密地点や住所の公開は避けてください。\n\n## 4. 外部提供と制御\n地図、ジオコーディング、天気、海洋情報のため座標を外部提供者へ送る場合があります。端末権限、公開範囲、保存データは利用者が変更・削除できます。\n\n## 5. 精度\n位置情報には誤差があり、航法・救助情報ではありません。公式海図と現地運営者の案内を優先してください。' },
  community: { title: 'コミュニティ運営ポリシー', content: '## 1. 原則\n安全なダイビング、海洋環境の尊重、経験や文化の違いを尊重する交流を基本とします。\n\n## 2. 禁止内容\n違法撮影、搾取、暴力、差別、嫌がらせ、なりすまし、スパム、権利侵害、個人情報公開、野生生物への危害、虚偽の安全情報を禁止します。\n\n## 3. 情報と共有\nログ、生物候補、ライセンス、リゾート情報は投稿者が確認してください。AI候補は専門家の検証ではありません。外部共有前に権利と位置情報を確認してください。\n\n## 4. 通報と措置\nアプリから通報でき、重大性に応じて表示制限、削除、機能制限、一時停止、永久停止を適用します。異議申立てはsupport@metabytree.comへ提出できます。\n\n## 5. 商業コンテンツ\n広告、協賛、リゾート・教育・器材との関係は明示し、虚偽レビューや評価操作を禁止します。' },
  safety_disclaimer: { title: 'ダイビング安全に関する告知', content: '## 1. 固有の危険\nスキューバとフリーダイビングには減圧障害、圧力障害、溺水、低酸素症、装備故障、環境変化など重大な危険があります。\n\n## 2. 教育と現場判断\n訓練、資格、健康、経験の範囲を超えて潜らないでください。バディ、装備、ガス、減圧計画、天候、潮流、現地規則、緊急手順を確認してください。\n\n## 3. アプリ情報の限界\n地図、天気、海洋データ、AI、写真・音声分析、生成ログは参考情報であり、医療、航法、減圧、救助の指示ではありません。\n\n## 4. 緊急時\nDivergramは診断や救助を保証しません。症状や事故時は直ちに中止し、現地の救急機関とダイビング医療専門家へ連絡してください。' },
  ai_notice: { title: 'AI機能の案内', content: '## 1. 機能と入力\nAIはログの構造化、海洋生物候補、音声認識、翻訳、文章作成を補助します。利用時にテキスト、ログ数値、位置・環境情報、写真、動画フレーム、音声をAI提供者へ送信する場合があります。\n\n## 2. 限界と確認\n結果は確率的な候補で、専門鑑定、医療、安全、減圧、航法、救助の助言ではありません。保存・公開前に利用者が必ず確認・修正してください。\n\n## 3. クレジットと購読\n無料・年間プランごとに月間AIクレジットが適用され、写真と動画で消費量が異なる場合があります。価格と更新条件はストア表示に従います。\n\n## 4. キャッシュと失敗\n重複処理を減らすためメディアハッシュと結果を限定的にキャッシュします。通信、上限、形式、品質、外部障害で失敗した場合は再試行または手動入力を利用できます。\n\n## 5. お問い合わせ\nAIまたは個人情報に関するお問い合わせはsupport@metabytree.comへお送りください。' },
};

const detailedPolicyCopiesZh: Partial<Record<PolicyType, LocalizedPolicyCopy>> = {
  terms: { title: '使用条款', content: '## 1. 运营方与服务\nDivergram由METAbyTREE运营，提供动态、潜水日志、海洋生物图鉴、地图、度假村与培训预订、证照管理、外部连接和AI辅助功能。服务咨询请联系support@metabytree.com。\n\n## 2. 账户与内容\n用户应提供准确信息并安全管理登录方式，只能上传拥有合法权利的内容。内容可见范围和外部分享遵循用户设置。\n\n## 3. 预订与付款\n度假村和培训预订属于在应用外提供的服务。订金通过PayPal处理，不属于App Store或Google Play应用内购买。\n\n## 4. 年度会员\n年度会员是提供数字功能和AI额度的自动续订订阅。价格、续订、取消和退款遵循商店购买页面及政策，权益仅在服务器验证购买后启用。\n\n## 5. 禁止行为与安全\n禁止非法内容、骚扰、冒充、侵权、虚假安全信息、危险行为、操纵付款和破坏服务。地图、天气、AI和设备数据不能替代现场判断。\n\n## 6. 变更与适用法律\n因运营、安全、法律或外部服务政策变化，部分功能可能变更或暂停。适用韩国法律，但用户所在地的强制消费者保护规定优先。' },
  privacy: { title: '隐私政策与收集使用同意', content: '## 1. 处理方与联系方式\nMETAbyTREE为提供Divergram处理个人信息。权利请求请发送至support@metabytree.com。\n\n## 2. 处理的信息\n除邮箱或社交登录标识、昵称和同意记录外，根据功能还可能处理已验证电话、个人资料、证照、潜水日志、位置、照片、视频、语音、预订、设备、推送和安全信息。密码以不可逆哈希保存。\n\n## 3. 付款信息\n年度会员付款由Apple或Google处理。Divergram不保存完整卡号。年度会员仅处理商品ID、交易或购买令牌、状态、购买和到期时间及验证结果；度假村订金仅处理PayPal交易标识、付款人信息、金额、币种、状态以及结算或退款记录。\n\n## 4. 用途与外部处理\n用于认证、同步、AI分析、预订、订阅权益、防欺诈、客服、改进和法律合规。必要的最少信息可能发送至Apple、Google、Firebase、OpenAI及页面显示的连接服务。\n\n## 5. 保存与安全\n账户退出宽限期结束后删除，法律要求的记录除外。采取传输加密、访问控制、令牌保护、密码哈希、敏感联系方式加密和审计日志。\n\n## 6. 用户权利\n用户可请求查询、更正、删除、限制处理、撤回可选同意或删除账户。目前不提供未满14周岁用户的监护人同意流程。' },
  location_terms: { title: '位置信息使用条款', content: '## 1. 使用目的\n位置用于潜点地图、附近度假村、入水与出水点、照片和潜水日志匹配以及环境信息。\n\n## 2. 信息来源\n可能处理设备GPS或网络位置、地图所选坐标、潜水电脑或导入数据坐标以及用户所选照片的EXIF GPS。\n\n## 3. 保存与公开\n日志坐标与日志保存期限一致，并根据公开、关注者或私密设置显示。请避免公开家庭地址和敏感地点。\n\n## 4. 外部服务与控制\n坐标可能发送给地图、地理编码、天气或海洋数据提供商。用户可更改设备权限和公开范围，或删除日志与媒体。\n\n## 5. 准确性\n位置信息可能存在误差，不可作为导航或救援数据。应优先使用官方海图和当地运营方指引。' },
  community: { title: '社区运营政策', content: '## 1. 原则\n社区以安全潜水、尊重海洋环境以及尊重不同经验和文化为原则。\n\n## 2. 禁止内容\n禁止非法拍摄、剥削、暴力、歧视、骚扰、冒充、垃圾信息、侵权、泄露个人信息、伤害野生生物和虚假安全信息。\n\n## 3. 信息与分享\n发布者应核对日志、生物候选、证照和度假村信息。AI候选不代表专家验证，外部分享前应确认版权和位置隐私。\n\n## 4. 举报与处置\n用户可在应用内举报。根据严重程度可限制展示、删除内容、限制功能、暂停或永久停用账户。申诉请联系support@metabytree.com。\n\n## 5. 商业内容\n广告、赞助和与度假村、培训或设备相关的商业关系必须明确披露，禁止虚假评价和评分操纵。' },
  safety_disclaimer: { title: '潜水安全告知', content: '## 1. 固有风险\n水肺和自由潜水可能导致减压病、压力损伤、溺水、缺氧、设备故障和环境风险。\n\n## 2. 培训与现场判断\n不得超出培训、证照、健康和经验范围潜水。入水前应检查潜伴、设备、气体、减压计划、天气、海流、当地规定和应急程序。\n\n## 3. 应用信息限制\n地图、天气、海洋数据、AI、照片或语音分析及自动日志仅供参考，不能作为医疗、导航、减压或救援指示。\n\n## 4. 紧急情况\nDivergram不提供医疗诊断或保证救援。如有症状或事故，应立即停止潜水并联系当地急救机构和潜水医学专业人员。' },
  ai_notice: { title: 'AI功能说明', content: '## 1. 功能与输入\nAI可辅助整理潜水日志、识别海洋生物候选、语音转文字、翻译和写作。使用时，文本、日志数值、位置和环境信息、照片、视频帧或语音可能发送给AI提供商。\n\n## 2. 限制与确认\n结果是概率候选，不构成专家鉴定、医疗、安全、减压、导航或救援建议。保存或发布前必须由用户核对和修改。\n\n## 3. 额度与订阅\n免费和年度方案可能有不同的每月AI额度，照片与视频消耗量可能不同。订阅价格和续订条件以商店页面为准。\n\n## 4. 缓存与失败\n为减少重复处理，可有限缓存媒体哈希和结果。网络、额度、格式、质量或外部服务问题可能导致失败，可重试或手动输入。\n\n## 5. 联系方式\nAI或隐私问题请发送至support@metabytree.com。' },
};

for (const doc of policyDocumentsKo) {
  localizedPolicyCopies.ja[doc.type] = detailedPolicyCopiesJa[doc.type] || { title: localizedTitlesJa[doc.type], content: `## ポリシーの概要\n${localizedSummariesJa[doc.type]}\n\n## 利用者の選択とお問い合わせ\n任意同意は設定から撤回できます。適用法令に基づく閲覧、訂正、削除等の請求はサポート窓口で受け付けます。` };
  localizedPolicyCopies.zh[doc.type] = detailedPolicyCopiesZh[doc.type] || { title: localizedTitlesZh[doc.type], content: `## 政策概要\n${localizedSummariesZh[doc.type]}\n\n## 用户选择与联系\n可选同意可在设置中撤回。用户可通过支持渠道依法申请查询、更正或删除个人信息。` };
}

export const policyDocumentsByLocale: Record<PolicyLocale, PolicyDocument[]> = {
  ko: policyDocumentsKo,
  en: policyDocumentsKo.map((doc) => makePolicy(doc.type, localizedPolicyCopies.en[doc.type].title, localizedPolicyCopies.en[doc.type].content, Boolean(doc.requiredForSignup), 'en')),
  ja: policyDocumentsKo.map((doc) => makePolicy(doc.type, localizedPolicyCopies.ja[doc.type].title, localizedPolicyCopies.ja[doc.type].content, Boolean(doc.requiredForSignup), 'ja')),
  zh: policyDocumentsKo.map((doc) => makePolicy(doc.type, localizedPolicyCopies.zh[doc.type].title, localizedPolicyCopies.zh[doc.type].content, Boolean(doc.requiredForSignup), 'zh')),
};

export function normalizePolicyLocale(locale?: string): PolicyLocale {
  const language = String(locale || 'ko').toLowerCase().split(/[-_]/)[0];
  return language === 'en' || language === 'ja' || language === 'zh' ? language : 'ko';
}

export const signupRequiredConsentMap: Record<ConsentKey, PolicyType> = {
  terms_required: 'terms',
  privacy_required: 'privacy',
  location_required: 'location_terms',
  age14_required: 'age14_notice',
  marketing_optional: 'marketing_consent',
  push_optional: 'push_consent',
};

export const signupRequiredConsentKeys: ConsentKey[] = ['terms_required', 'privacy_required', 'age14_required'];
export const signupOptionalConsentKeys: ConsentKey[] = ['marketing_optional', 'push_optional'];

export function buildPolicyVersionMap(locale: PolicyLocale = 'ko'): Record<PolicyType, string> {
  const docs = policyDocumentsByLocale[locale];
  return docs.reduce((acc, doc) => {
    acc[doc.type] = doc.version;
    return acc;
  }, {} as Record<PolicyType, string>);
}
