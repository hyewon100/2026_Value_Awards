/*
 * config.js — 화면과 규칙에 쓰이는 설정값을 한곳에 모아 둔 파일입니다.
 * 제출 기한, 제출 이메일, 글자 수 제한, 부문 설명 등은 이 파일만 고치면 됩니다.
 * (출처: 상상인_2026연말가치실천시상_Pilot운영계획안.pdf)
 *
 * 운영 방식: 웹페이지에서 작성 → PDF로 저장 → 임직원이 HR 담당자에게 이메일로 제출
 * 이 웹페이지는 입력 내용을 서버로 보내거나 저장하지 않습니다.
 */
window.AwardApp = window.AwardApp || {};

window.AwardApp.config = {
  year: 2026,

  /* ---------- 제출 안내 (필요 시 수정) ---------- */
  submission: {
    // 추천 접수 기간
    //  - start / deadline : 날짜 계산용 (접수 전·마감 후 안내에 사용)
    //  - periodLabel / deadlineLabel : 화면 표시용
    //  날짜를 바꿀 때는 계산용과 표시용을 함께 바꿔 주세요.
    start: '2026-11-10T00:00:00+09:00',
    deadline: '2026-11-20T23:59:59+09:00',
    periodLabel: '2026. 11. 10.(화) ~ 11. 20.(금)',
    deadlineLabel: '2026. 11. 20.(금) 23:59',

    // 추천서 PDF를 받을 HR 담당자 이메일
    email: 'hw.han@sangsanginworld.co.kr',
    contactName: '컬처앤피플실 한혜원 사원',

    // 메일 제목 / PDF 파일 이름 앞부분
    subjectPrefix: '[가치 실천 시상 추천]',
    fileNamePrefix: '가치실천시상_추천서'
  },

  // PDF 03쪽 "시상 부문과 심사 기준" (예시는 PDF의 가상 사례)
  categories: [
    {
      value: 'iroum',
      label: '이로움상',
      summary: '고객 · 사회에 만든 이로운 변화',
      example: '사회적 약자 지원, 공정한 문화 조성, 윤리적 의사결정 등으로 조직과 사회에 선한 영향을 준 사례'
    },
    {
      value: 'challenge',
      label: '도전상',
      summary: '새로운 시도 · 실험 · 학습',
      example: '관행을 바꾼 시도 후 실패를 분석하고 대안을 검증 · 공유함'
    },
    {
      value: 'connect',
      label: '연결상',
      summary: '조직 경계를 넘는 지식 · 경험 연결',
      example: '흩어진 경험을 모아 부서 간 공동 기준 · 협업 방식을 만듦'
    },
    {
      value: 'respect',
      label: '존중상',
      summary: '다른 관점 · 필요 반영',
      example: '현장 의견 · 소수 의견을 반영해 절차 · 접근성을 개선함'
    }
  ],

  // 입력 글자 수 제한 (필요하면 조정하세요)
  limits: {
    name: 30,
    org: 50,
    rank: 20,
    role: 100,
    ruleText: 150,
    action: 1500,
    change: 1500,
    evidence: 500
  },

  members: {
    min: 2,   // PDF: 단체는 2명 이상
    max: 50   // 화면 관리를 위한 상한
  }
};
