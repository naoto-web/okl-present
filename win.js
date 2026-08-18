/**
 * win.js — 当選者専用ページのロジック
 *
 * URLの ?t=トークン を検証し、有効なときだけお届け先の入力欄を出す。
 */

let token = '';
let winData = null;

document.addEventListener('DOMContentLoaded', init);

async function init() {
  token = new URLSearchParams(location.search).get('t') || '';

  if (!token) {
    fail('invalid_token');
    return;
  }

  try {
    const res = await apiGet({ action: 'verify', t: token });
    if (res && res.ok) {
      winData = res.data;
      render(winData);
    } else {
      fail(res && res.error, res && res.data);
    }
  } catch (e) {
    fail('server');
  }
}

function render(d) {
  if (d.title) document.title = 'お届け先のご登録｜' + d.title;
  setText('winNick', d.nick);
  setText('winPrize', d.prize + (d.needSize && d.size ? '（応募時のご希望：' + d.size + '）' : ''));
  setText('winDeadline', d.deadlineText + ' まで');
  setText('contactDone', d.contact || '事務局');

  if (d.shipTiming) {
    setText('winShip', d.shipTiming);
    show('shipRow', true);
    setText('doneShip', 'ご登録いただいた住所へ、' + d.shipTiming + 'に発送を予定しています。');
  }

  if (d.needSize) {
    const sel = document.getElementById('size');
    (d.sizes || []).forEach(function (s) {
      const opt = document.createElement('option');
      opt.value = s;
      opt.textContent = s;
      if (s === d.size) opt.selected = true;
      sel.appendChild(opt);
    });
    show('sizeField', true);
  }

  document.getElementById('regForm').addEventListener('submit', onSubmit);

  show('loading', false);
  show('formArea', true);
}

function fail(code, data) {
  show('loading', false);
  let msg = errorText(code);
  if (code === 'already_registered' && data && data.nick) {
    msg = data.nick + ' 様のお届け先は、すでにご登録が完了しています。';
  }
  setText('errorMsg', msg);
  setText('contactError', (winData && winData.contact) || '事務局');
  show('errorArea', true);
}

async function onSubmit(ev) {
  ev.preventDefault();
  hideError();

  const name = val('name');
  // スマホの日本語キーボードでは全角数字が入りやすいので、半角に直してから検証する
  const zip = toHalfWidth(val('zip'));
  const addr = val('addr');
  const tel = toHalfWidth(val('tel'));
  const size = val('size');

  if (!name) return showError('お名前を入力してください。');
  if (!/^\d{3}-?\d{4}$/.test(zip)) return showError('郵便番号を正しく入力してください（例：123-4567）。');
  if (!addr) return showError('ご住所を入力してください。');
  if (!/^[0-9+\-() ]{10,20}$/.test(tel)) return showError('電話番号を半角数字で正しく入力してください。');
  if (winData.needSize && !size) return showError('Tシャツのサイズを選択してください。');

  // 登録後は変更できないため、最終確認をはさむ
  const confirmText =
    'この内容で登録します。よろしいですか？\n\n' +
    'お名前：' + name + '\n' +
    '郵便番号：' + zip + '\n' +
    'ご住所：' + addr + '\n' +
    '電話番号：' + tel +
    (winData.needSize ? '\nサイズ：' + size : '') +
    '\n\n※登録後の変更はできません。';
  if (!window.confirm(confirmText)) return;

  const btn = document.getElementById('submitBtn');
  btn.disabled = true;
  btn.textContent = '登録中…';

  try {
    const res = await apiPost({
      action: 'register',
      t: token,
      name: name,
      zip: zip,
      addr: addr,
      tel: tel,
      size: size,
    });

    if (res && res.ok) {
      show('formArea', false);
      show('doneArea', true);
      window.scrollTo(0, 0);
      return;
    }
    showError(errorText(res && res.error));
  } catch (e) {
    showError('登録に失敗しました。通信環境をご確認のうえ、もう一度お試しください。');
  }

  btn.disabled = false;
  btn.textContent = 'この内容で登録する';
}

// ------------------------------------------------------------------
// 小物
// ------------------------------------------------------------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

/** 全角の数字・記号を半角に直す（郵便番号・電話番号にだけ使う） */
function toHalfWidth(s) {
  return String(s)
    .replace(/[０-９Ａ-Ｚａ-ｚ－＋（）]/g, function (ch) {
      return String.fromCharCode(ch.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[‐‑‒–—ー−]/g, '-')
    .replace(/　/g, ' ')
    .trim();
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
