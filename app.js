/*
 * app.js — 화면 동작을 담당합니다.
 *  - 부문 카드/월 선택 목록 만들기
 *  - 개인/단체 전환, 구성원 추가/삭제
 *  - 입력값 모으기 → 검증(validation.js) → 확인 화면 → PDF로 저장(브라우저 인쇄 기능)
 *
 * 이 페이지는 입력 내용을 서버로 보내거나 브라우저 저장소에 남기지 않습니다.
 * 보안 메모: 사용자가 입력한 글은 항상 textContent 로만 화면에 넣습니다.
 * (innerHTML 을 쓰면 입력값 속 HTML/스크립트가 실행될 위험이 있습니다.)
 */
(function (App) {
  'use strict';

  var cfg = App.config;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function byId(id) { return document.getElementById(id); }

  var els = {
    formView: byId('form-view'),
    reviewView: byId('review-view'),
    form: byId('nomination-form'),
    categoryOptions: byId('category-options'),
    individual: byId('individual-target'),
    group: byId('group-target'),
    memberList: byId('member-list'),
    memberTpl: byId('member-row-template'),
    memberCount: byId('member-count'),
    addMember: byId('add-member'),
    periodStart: byId('period-start'),
    periodEnd: byId('period-end'),
    errorSummary: byId('error-summary'),
    errorList: byId('error-list'),
    reviewContent: byId('review-content'),
    afterPrint: byId('after-print')
  };

  var memberSeq = 0;      // 구성원 줄마다 고유 번호를 붙이기 위한 카운터
  var attempted = false;  // 한 번이라도 [작성 완료]를 눌렀는가
  var isDirty = false;    // 입력한 내용이 있는가 (페이지 이탈 경고용)
  var current = null;     // 확인 화면에 표시 중인 정리된 추천서 데이터
  var printing = false;
  var originalTitle = document.title;

  /* =========================================================
   * 1. 초기 화면 구성
   * ========================================================= */
  function renderCategories() {
    cfg.categories.forEach(function (c) {
      var label = document.createElement('label');
      label.className = 'option-card';

      var input = document.createElement('input');
      input.type = 'radio';
      input.name = 'category';  // 같은 name 의 radio 는 1개만 선택됩니다.
      input.value = c.value;

      var body = document.createElement('span');
      body.className = 'option-body';
      [['option-title', c.label], ['option-summary', c.summary], ['option-example', '예) ' + c.example]]
        .forEach(function (pair) {
          var s = document.createElement('span');
          s.className = pair[0];
          s.textContent = pair[1];
          body.appendChild(s);
        });

      label.appendChild(input);
      label.appendChild(body);
      els.categoryOptions.appendChild(label);
    });
  }

  function renderMonths(select, placeholder) {
    var opt = document.createElement('option');
    opt.value = '';
    opt.textContent = placeholder;
    select.appendChild(opt);
    for (var m = 1; m <= 12; m++) {
      var o = document.createElement('option');
      o.value = String(m);
      o.textContent = m + '월';
      select.appendChild(o);
    }
  }

  function applyLimits(root) {
    $$('[data-limit]', root).forEach(function (el) {
      var n = cfg.limits[el.getAttribute('data-limit')];
      if (n) el.maxLength = n;
    });
  }

  function formatDate(d) {
    return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.';
  }

  // data-config="email" 처럼 표시된 곳에 config.js 의 제출 안내 값을 채웁니다.
  function renderConfigText() {
    $$('[data-config]').forEach(function (el) {
      var v = cfg.submission[el.getAttribute('data-config')];
      if (v != null) el.textContent = v;
    });
    // 접수 기간 전 / 마감 후 안내
    var now = Date.now();
    var notice = '';
    if (now < new Date(cfg.submission.start).getTime()) {
      notice = '아직 접수 기간 전입니다. 미리 작성해 PDF로 저장한 뒤, 접수 기간에 이메일로 제출해 주세요.';
    } else if (now > new Date(cfg.submission.deadline).getTime()) {
      notice = '추천 접수가 마감되었습니다. 제출 가능 여부는 담당자에게 문의해 주세요.';
    }
    if (notice) {
      $$('[data-deadline-notice]').forEach(function (n) { n.textContent = notice; n.hidden = false; });
    }
  }

  /* =========================================================
   * 2. 개인 / 단체 전환과 구성원 추가·삭제
   * ========================================================= */
  function getType() {
    var r = $('input[name="nominationType"]:checked', els.form);
    return r ? r.value : '';
  }

  function updateTypeUI() {
    var isGroup = getType() === 'group';
    els.individual.hidden = isGroup;
    els.group.hidden = !isGroup;
    // 단체로 처음 바꾸면 최소 인원(2명)만큼 빈 줄을 만들어 둡니다.
    if (isGroup) {
      while (els.memberList.children.length < cfg.members.min) addMember();
    }
    refreshMembers();
  }

  function addMember() {
    if (els.memberList.children.length >= cfg.members.max) return null;
    var uid = ++memberSeq;
    var node = els.memberTpl.content.firstElementChild.cloneNode(true);
    node.setAttribute('data-uid', String(uid));

    $$('[data-field]', node).forEach(function (input) {
      input.id = 'member-' + uid + '-' + input.getAttribute('data-field');
    });
    $$('[data-for]', node).forEach(function (label) {
      label.setAttribute('for', 'member-' + uid + '-' + label.getAttribute('data-for'));
    });
    $$('[data-error]', node).forEach(function (p) {
      p.id = 'member-' + uid + '-' + p.getAttribute('data-error') + '-error';
    });
    applyLimits(node);
    els.memberList.appendChild(node);
    refreshMembers();
    return node;
  }

  function removeMember(row) {
    if (els.memberList.children.length <= cfg.members.min) return;
    row.parentNode.removeChild(row);
    refreshMembers();
    isDirty = true;
    if (attempted) runValidation(false);
  }

  function refreshMembers() {
    var rows = $$('.member-row', els.memberList);
    rows.forEach(function (row, i) {
      $('.member-no', row).textContent = '구성원 ' + (i + 1);
      var btn = $('[data-action="remove"]', row);
      btn.disabled = rows.length <= cfg.members.min;
      btn.setAttribute('aria-label', '구성원 ' + (i + 1) + ' 삭제');
    });
    els.memberCount.textContent = '현재 ' + rows.length + '명';
    els.addMember.disabled = rows.length >= cfg.members.max;
  }

  /* =========================================================
   * 3. 입력값 모으기 (화면 → 데이터)
   * ========================================================= */
  function val(id) { return byId(id).value; }

  function collectState() {
    var cat = $('input[name="category"]:checked', els.form);
    return {
      category: cat ? cat.value : '',
      nominationType: getType(),
      target: { name: val('target-name'), org: val('target-org'), rank: val('target-rank') },
      members: $$('.member-row', els.memberList).map(function (row) {
        var get = function (f) { return $('[data-field="' + f + '"]', row).value; };
        return { uid: row.getAttribute('data-uid'), name: get('name'), org: get('org'), rank: get('rank'), role: get('role') };
      }),
      nominator: {
        name: val('nominator-name'),
        org: val('nominator-org'),
        isSelf: byId('nominator-self').checked
      },
      winningRule: { number: val('rule-number'), text: val('rule-text') },
      period: {
        startMonth: els.periodStart.value ? Number(els.periodStart.value) : null,
        endMonth: els.periodEnd.value ? Number(els.periodEnd.value) : null
      },
      content: {
        action: val('content-action'),
        change: val('content-change'),
        evidence: val('content-evidence')
      },
      factConfirmed: byId('fact-confirm').checked
    };
  }

  /* =========================================================
   * 4. 검증 결과를 화면에 표시
   * ========================================================= */
  function clearErrors() {
    $$('.field-error').forEach(function (p) { p.hidden = true; p.textContent = ''; });
    $$('[aria-invalid="true"]').forEach(function (el) {
      el.removeAttribute('aria-invalid');
      el.removeAttribute('aria-describedby');
    });
    $$('.is-invalid').forEach(function (el) { el.classList.remove('is-invalid'); });
  }

  function showErrors(errors) {
    clearErrors();
    errors.forEach(function (err) {
      var target = byId(err.field);
      var msg = byId(err.field + '-error');
      if (msg) { msg.textContent = err.message; msg.hidden = false; }
      if (!target) return;
      if (target.matches('input, select, textarea')) {
        target.setAttribute('aria-invalid', 'true');
        if (msg) target.setAttribute('aria-describedby', msg.id);
      } else {
        target.classList.add('is-invalid');
      }
    });
  }

  function renderSummary(errors) {
    els.errorList.textContent = '';
    if (!errors.length) { els.errorSummary.hidden = true; return; }
    errors.forEach(function (err) {
      var li = document.createElement('li');
      var a = document.createElement('a');
      a.href = '#' + err.field;
      a.textContent = err.message;
      a.addEventListener('click', function (e) {
        e.preventDefault();
        focusField(err.field);
      });
      li.appendChild(a);
      els.errorList.appendChild(li);
    });
    els.errorSummary.hidden = false;
  }

  function focusField(id) {
    var el = byId(id);
    if (!el) return;
    var focusable = el.matches('input, select, textarea') ? el : $('input, select, textarea', el);
    (focusable || el).focus();
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function runValidation(withSummary) {
    var state = collectState();
    var errors = App.validate(state);
    showErrors(errors);
    if (withSummary || !els.errorSummary.hidden) renderSummary(errors);
    return { state: state, errors: errors };
  }

  /* =========================================================
   * 5. 확인 화면 (= PDF로 저장되는 내용)
   * ========================================================= */
  function showView(view) {
    els.formView.hidden = view !== 'form';
    els.reviewView.hidden = view !== 'review';
    window.scrollTo(0, 0);
  }

  function addRow(dl, label, value) {
    var wrap = document.createElement('div');
    wrap.className = 'review-row';
    var dt = document.createElement('dt');
    dt.textContent = label;
    var dd = document.createElement('dd');
    if (typeof value === 'string') dd.textContent = value; else dd.appendChild(value);
    wrap.appendChild(dt);
    wrap.appendChild(dd);
    dl.appendChild(wrap);
  }

  function reviewCard(title) {
    var sec = document.createElement('section');
    sec.className = 'card review-card';
    var h = document.createElement('h2');
    h.className = 'card-title';
    h.textContent = title;
    var dl = document.createElement('dl');
    dl.className = 'review-list';
    sec.appendChild(h);
    sec.appendChild(dl);
    els.reviewContent.appendChild(sec);
    return dl;
  }

  // 단체 구성원 명단 표 (PDF에서도 표로 출력)
  function memberTable(members) {
    var table = document.createElement('table');
    table.className = 'member-table';
    var thead = document.createElement('thead');
    var hr = document.createElement('tr');
    ['No', '성명', '소속', '직급', '사례에서 맡은 역할'].forEach(function (h) {
      var th = document.createElement('th');
      th.scope = 'col';
      th.textContent = h;
      hr.appendChild(th);
    });
    thead.appendChild(hr);
    var tbody = document.createElement('tbody');
    members.forEach(function (m, i) {
      var tr = document.createElement('tr');
      [String(i + 1), m.name, m.org, m.rank, m.role].forEach(function (v) {
        var td = document.createElement('td');
        td.textContent = v;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  function renderReview(n) {
    els.reviewContent.textContent = '';

    var basic = reviewCard('① 기본 정보');
    addRow(basic, '추천 부문', n.categoryLabel);
    addRow(basic, '추천 유형', n.nominationType === 'group'
      ? '단체 (' + n.groupMembers.length + '명)' : '개인');
    if (n.nominationType === 'individual') {
      addRow(basic, '추천 대상', '성명 ' + n.nominee.name + '  /  소속 ' + n.nominee.org + '  /  직급 ' + n.nominee.rank);
    }
    addRow(basic, '추천인', '성명 ' + n.nominator.name + '  /  소속 ' + n.nominator.org +
      '  /  본인 추천 ' + (n.nominator.isSelfNomination ? '예' : '아니오'));
    addRow(basic, '관련 Winning Rules', '번호 ' + n.winningRule.number + '  /  ' + n.winningRule.text);
    addRow(basic, '사례 기간', n.casePeriod.year + '년 ' + n.casePeriod.startMonth + '월 ~ ' +
      n.casePeriod.year + '년 ' + n.casePeriod.endMonth + '월');

    if (n.nominationType === 'group') {
      var sec = document.createElement('section');
      sec.className = 'card review-card';
      var h = document.createElement('h2');
      h.className = 'card-title';
      h.textContent = '단체 추천 구성원 명단 (' + n.groupMembers.length + '명)';
      var wrap = document.createElement('div');
      wrap.className = 'table-wrap';
      wrap.appendChild(memberTable(n.groupMembers));
      sec.appendChild(h);
      sec.appendChild(wrap);
      els.reviewContent.appendChild(sec);
    }

    var content = reviewCard('② 추천 내용');
    addRow(content, '무엇을 했나 (행동)', n.content.action);
    addRow(content, '무엇이 달라졌나 (변화)', n.content.change);
    addRow(content, '확인 근거', n.content.evidence);

    var confirm = reviewCard('작성 확인');
    addRow(confirm, '사실 확인', '☑ 위 내용은 사실에 근거해 작성했습니다.');
    addRow(confirm, '작성일', formatDate(new Date()));
    addRow(confirm, '추천인', n.nominator.name);

    byId('pdf-file-name').textContent = App.nomination.fileName(n) + '.pdf';
    byId('mail-subject').textContent = App.nomination.mailSubject(n);
  }

  function resetForm() {
    els.form.reset();
    els.memberList.textContent = '';
    attempted = false;
    isDirty = false;
    current = null;
    clearErrors();
    els.errorSummary.hidden = true;
    els.afterPrint.hidden = true;
    updateTypeUI();
    updateCounters();
    updateSign();
    showView('form');
  }

  /* =========================================================
   * 6. PDF로 저장 — 브라우저의 인쇄 기능 사용
   *    인쇄 창에서 'PDF로 저장'을 고르면 파일이 사용자 PC에만 저장됩니다. (외부 전송 없음)
   *    인쇄용 모양은 style.css 의 @media print 부분에서 정합니다.
   * ========================================================= */
  function savePdf() {
    if (!current) return;
    renderReview(current);                                   // 최신 날짜로 다시 그리기
    document.title = App.nomination.fileName(current);       // PDF 기본 파일 이름 = 페이지 제목
    printing = true;
    window.print();
  }

  // 인쇄 창이 닫히면(afterprint) 제목을 되돌리고 다음 단계를 안내합니다.
  function finishPrint() {
    if (!printing) return;
    printing = false;
    document.title = originalTitle;
    // 저장 여부는 브라우저가 알려주지 않으므로 "제출 완료"가 아니라 다음 단계만 안내합니다.
    els.afterPrint.hidden = false;
  }

  /* =========================================================
   * 7. 보조 기능: 글자 수 표시, 서명란
   * ========================================================= */
  function updateCounters() {
    ['content-action', 'content-change', 'content-evidence'].forEach(function (id) {
      var el = byId(id);
      byId(id + '-count').textContent = el.value.length + ' / ' + el.maxLength + '자';
    });
  }

  function updateSign() {
    var name = val('nominator-name').trim();
    var sign = byId('sign-name');
    sign.textContent = name || '추천인 성명을 입력하면 표시됩니다';
    sign.classList.toggle('muted', !name);
  }

  /* =========================================================
   * 8. 이벤트 연결
   * ========================================================= */
  function bindEvents() {
    els.form.addEventListener('input', function (e) {
      isDirty = true;
      if (e.target.id === 'rule-number') e.target.value = e.target.value.replace(/\D/g, ''); // 숫자만
      if (e.target.tagName === 'TEXTAREA') updateCounters();
      if (e.target.id === 'nominator-name') updateSign();
      if (attempted) runValidation(false);
    });

    els.form.addEventListener('change', function (e) {
      isDirty = true;
      if (e.target.name === 'nominationType') updateTypeUI();
      if (attempted) runValidation(false);
    });

    els.addMember.addEventListener('click', function () {
      var row = addMember();
      isDirty = true;
      if (row) $('input', row).focus();
      if (attempted) runValidation(false);
    });

    els.memberList.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action="remove"]');
      if (btn) removeMember(btn.closest('.member-row'));
    });

    els.form.addEventListener('submit', function (e) {
      e.preventDefault(); // 브라우저 기본 전송을 막습니다 (어디에도 보내지 않음)
      attempted = true;
      var r = runValidation(true);
      if (r.errors.length) {
        els.errorSummary.focus();
        els.errorSummary.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      current = App.nomination.normalize(r.state);
      els.afterPrint.hidden = true;
      renderReview(current);
      showView('review');
      byId('review-title').focus();
    });

    byId('reset-form').addEventListener('click', function () {
      if (!isDirty || window.confirm('작성 중인 내용이 모두 지워집니다. 처음부터 다시 작성할까요?')) resetForm();
    });

    $$('.js-edit').forEach(function (b) {
      b.addEventListener('click', function () { showView('form'); });
    });
    $$('.js-save-pdf').forEach(function (b) { b.addEventListener('click', savePdf); });

    byId('new-form').addEventListener('click', function () {
      if (window.confirm('작성한 내용이 지워집니다. PDF로 저장하셨나요?\n[확인]을 누르면 새 추천서를 작성합니다.')) resetForm();
    });

    window.addEventListener('afterprint', finishPrint);

    // 작성 중에 창을 닫으려 하면 경고 (이 페이지는 내용을 저장하지 않으므로 사라짐)
    window.addEventListener('beforeunload', function (e) {
      if (isDirty) { e.preventDefault(); e.returnValue = ''; }
    });
  }

  /* =========================================================
   * 시작
   * ========================================================= */
  function init() {
    renderCategories();
    renderMonths(els.periodStart, '시작 월');
    renderMonths(els.periodEnd, '종료 월');
    applyLimits(document);
    renderConfigText();
    byId('write-date').textContent = formatDate(new Date());
    updateTypeUI();
    updateCounters();
    bindEvents();
  }

  init();
})(window.AwardApp);
