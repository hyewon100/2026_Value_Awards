/*
 * validation.js — 입력값 검증 규칙입니다.
 *
 * 화면(HTML)과 분리된 "순수 함수"라서 규칙만 따로 고치거나 테스트하기 쉽습니다.
 * (참고: 브라우저 검증은 작성 편의를 위한 것이므로, HR 담당자는 접수한 PDF 내용을 함께 확인해 주세요.)
 *
 * validate(state) → [{ field: '오류를 표시할 요소 id', message: '안내 문구' }, ...]
 * 오류가 없으면 빈 배열 [] 을 돌려줍니다.
 */
(function (App) {
  'use strict';

  var cfg = App.config;

  function isBlank(v) {
    return typeof v !== 'string' || v.trim() === '';
  }

  function validate(state) {
    var errors = [];
    var L = cfg.limits;

    function add(field, message) {
      errors.push({ field: field, message: message });
    }

    function requireText(field, value, label, limit) {
      if (isBlank(value)) {
        add(field, label + '을(를) 입력해 주세요.');
      } else if (limit && value.length > limit) {
        add(field, label + '은(는) ' + limit + '자 이내로 입력해 주세요.');
      }
    }

    // 1. 추천 부문: 정해진 4개 중 정확히 1개
    var validCategories = cfg.categories.map(function (c) { return c.value; });
    if (validCategories.indexOf(state.category) === -1) {
      add('category', '추천 부문을 1개 선택해 주세요.');
    }

    // 2. 추천 유형
    if (state.nominationType !== 'individual' && state.nominationType !== 'group') {
      add('nominationType', '추천 유형(개인 또는 단체)을 선택해 주세요.');
    }

    // 3/4. 추천 대상 — 유형에 따라 다르게 검증
    if (state.nominationType === 'individual') {
      requireText('target-name', state.target.name, '추천 대상 성명', L.name);
      requireText('target-org', state.target.org, '추천 대상 소속', L.org);
      requireText('target-rank', state.target.rank, '추천 대상 직급', L.rank);
    } else if (state.nominationType === 'group') {
      var members = state.members || [];
      if (members.length < cfg.members.min) {
        add('members', '단체 추천은 구성원을 ' + cfg.members.min + '명 이상 입력해 주세요.');
      }
      if (members.length > cfg.members.max) {
        add('members', '구성원은 최대 ' + cfg.members.max + '명까지 입력할 수 있습니다.');
      }
      members.forEach(function (m, i) {
        var prefix = 'member-' + m.uid + '-';
        var who = '구성원 ' + (i + 1) + ' ';
        requireText(prefix + 'name', m.name, who + '성명', L.name);
        requireText(prefix + 'org', m.org, who + '소속', L.org);
        requireText(prefix + 'rank', m.rank, who + '직급', L.rank);
        requireText(prefix + 'role', m.role, who + '맡은 역할', L.role);
      });
    }

    // 5. 추천인
    requireText('nominator-name', state.nominator.name, '추천인 성명', L.name);
    requireText('nominator-org', state.nominator.org, '추천인 소속', L.org);

    // 6. 관련 Winning Rules: 번호(1~2자리 숫자) + 내용
    var num = (state.winningRule.number || '').trim();
    if (num === '') {
      add('rule-number', 'Winning Rules 번호를 입력해 주세요.');
    } else if (!/^\d{1,2}$/.test(num) || Number(num) < 1) {
      add('rule-number', 'Winning Rules 번호는 숫자로 입력해 주세요. (예: 06)');
    }
    requireText('rule-text', state.winningRule.text, 'Winning Rules 내용', L.ruleText);

    // 7. 사례 기간: 2026년 1~12월, 시작 ≤ 종료
    var s = state.period.startMonth;
    var e = state.period.endMonth;
    if (!s || !e) {
      add('period', '사례 기간의 시작 월과 종료 월을 모두 선택해 주세요.');
    } else if (s < 1 || s > 12 || e < 1 || e > 12) {
      add('period', '사례 기간은 2026년 1월 ~ 12월 사이로 선택해 주세요.');
    } else if (s > e) {
      add('period', '종료 월은 시작 월과 같거나 그 이후여야 합니다.');
    }

    // 8~10. 추천 내용
    requireText('content-action', state.content.action, '무엇을 했나(행동)', L.action);
    requireText('content-change', state.content.change, '무엇이 달라졌나(변화)', L.change);
    requireText('content-evidence', state.content.evidence, '확인 근거', L.evidence);

    // 11. 사실 확인 체크
    if (state.factConfirmed !== true) {
      add('fact-confirm', '"사실에 근거해 작성했습니다"에 체크해 주세요.');
    }

    return errors;
  }

  App.validate = validate;
})(window.AwardApp);
