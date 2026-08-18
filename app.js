/**
 * app.js — 応募ページのロジック
 */

const pageLoadedAt = Date.now();
let statusData = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  try {
    const res = await apiGet({ action: 'status' });
    if (!res || !res.ok) throw new Error('status failed');
    statusData = res.data;
    render(statusData);
  } catch (e) {
    show('loading', false);
    const box = document.createElement('div');
    box.className = 'msg error';
    box.textContent = 'ページの読み込みに失敗しました。通信環境をご確認のうえ、再読み込みしてください。';
    document.querySelector('.wrap').prepend(box);
  }
}

function render(d) {
  if (d.title) {
    document.getElementById('pageTitle').textContent = d.title;
    document.title = d.title + '｜OKL';
  }
  setText('contactClosed', d.contact || '事務局');
  setText('contactDone', d.contact || '事務局');
  setText('doneDeadline', d.deadlineDays);

  show('loading', false);

  if (d.phase !== 'open') {
    let msg;
    if (d.phase === 'before') {
      msg = '応募の受付は ' + d.startText + ' から開始します。';
    } else if (d.phase === 'after') {
      msg = '応募期間は終了しました。たくさんのご応募をありがとうございました。';
    } else {
      msg = '現在、応募の受付を一時停止しています。しばらくお待ちください。';
    }
    setText('closedMsg', msg);
    show('closedArea', true);
    return;
  }

  // 受付中
  setText('specWinners', d.winners);
  setText('specPeriod', d.startText + ' 〜 ' + d.endText);
  if (d.shipTiming) setText('specShip', d.shipTiming);

  const sizeSel = document.getElementById('size');
  (d.sizes || []).forEach(function (s) {
    const opt = document.createElement('option');
    opt.value = s;
    opt.textContent = s;
    sizeSel.appendChild(opt);
  });

  document.querySelectorAll('input[name="prize"]').forEach(function (r) {
    r.addEventListener('change', toggleSize);
  });
  document.getElementById('applyForm').addEventListener('submit', onSubmit);

  show('formArea', true);
}

/** Tシャツを選んだときだけサイズ欄を出す */
function toggleSize() {
  const prize = getPrize();
  show('sizeField', prize === 'Tシャツ');
  if (prize !== 'Tシャツ') document.getElementById('size').value = '';
}

async function onSubmit(ev) {
  ev.preventDefault();
  hideError();

  const email = val('email');
  const email2 = val('email2');
  const nickname = val('nickname');
  const prize = getPrize();
  const size = val('size');
  const ageOk = document.getElementById('ageOk').checked;
  const agree = document.getElementById('agree').checked;

  // 入力チェック（サーバー側でも同じ検証をしている）
  if (!email) return showError('メールアドレスを入力してください。');
  if (!/^[^\s@,;]+@[^\s@,;.]+(\.[^\s@,;.]+)+$/.test(email)) {
    return showError('メールアドレスの形式が正しくありません。');
  }
  if (email !== email2) return showError('確認用のメールアドレスが一致しません。');
  if (!nickname) return showError('ニックネームを入力してください。');
  if (nickname.length > 20) return showError('ニックネームは20文字以内で入力してください。');
  if (!prize) return showError('ご希望の賞品を選択してください。');
  if (prize === 'Tシャツ' && !size) return showError('Tシャツのサイズを選択してください。');
  if (!ageOk) return showError('満20歳以上であることをご確認のうえ、チェックしてください。');
  if (!agree) return showError('応募規約とプライバシーポリシーへの同意が必要です。');

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '送信中…';

  try {
    const res = await apiPost({
      action: 'apply',
      email: email,
      nickname: nickname,
      prize: prize,
      size: size,
      ageOk: ageOk,
      agree: agree,
      company: val('company'),          // honeypot
      elapsed: Date.now() - pageLoadedAt,
    });

    if (res && res.ok) {
      show('formArea', false);
      show('doneArea', true);
      window.scrollTo(0, 0);
      return;
    }
    showError(errorText(res && res.error));
  } catch (e) {
    showError('送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。');
  }

  btn.disabled = false;
  btn.textContent = '応募する';
}

// ------------------------------------------------------------------
// 小物
// ------------------------------------------------------------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function getPrize() {
  const el = document.querySelector('input[name="prize"]:checked');
  return el ? el.value : '';
}

function setText(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function show(id, visible) {
  const el = document.getElementById(id);
  if (el) el.classList.toggle('hidden', !visible);
}

function showError(msg) {
  const box = document.getElementById('formError');
  box.textContent = msg;
  box.classList.remove('hidden');
  box.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function hideError() {
  document.getElementById('formError').classList.add('hidden');
}
