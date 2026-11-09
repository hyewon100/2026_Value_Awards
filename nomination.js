/*
 * nomination.js — 입력값을 PDF(확인 화면)에 보여줄 형태로 정리합니다.
 *
 *  - normalize(state) : 앞뒤 공백 제거, 개인/단체에 맞는 정보만 남기기
 *  - baseName(n)      : PDF 파일 이름과 메일 제목에 쓸 "부문_대상자" 문구
 *
 * 이 파일은 데이터를 어디에도 보내거나 저장하지 않습니다.
 */
(function (App) {
  'use strict';

  var cfg = App.config;

  function t(v) { return (v || '').trim(); }

  function normalize(state) {
    var category = cfg.categories.filter(function (c) { return c.value === state.category; })[0];
    var isGroup = state.nominationType === 'group';
    return {
      category: state.category,
      categoryLabel: category ? category.label : '',
      nominationType: state.nominationType,
      nominee: isGroup ? null : {
        name: t(state.target.name), org: t(state.target.org), rank: t(state.target.rank)
      },
      groupMembers: isGroup ? state.members.map(function (m) {
        return { name: t(m.name), org: t(m.org), rank: t(m.rank), role: t(m.role) };
      }) : [],
      nominator: {
        name: t(state.nominator.name),
        org: t(state.nominator.org),
        isSelfNomination: !!state.nominator.isSelf
      },
      winningRule: {
        number: ('0' + t(state.winningRule.number)).slice(-2),
        text: t(state.winningRule.text)
      },
      casePeriod: { year: cfg.year, startMonth: state.period.startMonth, endMonth: state.period.endMonth },
      content: {
        action: t(state.content.action),
        change: t(state.content.change),
        evidence: t(state.content.evidence)
      },
      factConfirmed: state.factConfirmed === true
    };
  }

  // 예) "연결상_홍길동", "연결상_홍길동 외 2명"
  function baseName(n) {
    var who;
    if (n.nominationType === 'group') {
      var first = n.groupMembers[0] ? n.groupMembers[0].name : '단체';
      who = first + ' 외 ' + Math.max(n.groupMembers.length - 1, 0) + '명';
    } else {
      who = n.nominee ? n.nominee.name : '';
    }
    return n.categoryLabel + '_' + who;
  }

  // 파일 이름에 쓸 수 없는 문자(\ / : * ? " < > |)와 공백을 _ 로 바꿉니다.
  function fileName(n) {
    return (cfg.submission.fileNamePrefix + '_' + baseName(n)).replace(/[\\/:*?"<>|\s]+/g, '_');
  }

  function mailSubject(n) {
    return cfg.submission.subjectPrefix + ' ' + baseName(n);
  }

  App.nomination = { normalize: normalize, fileName: fileName, mailSubject: mailSubject };
})(window.AwardApp);
