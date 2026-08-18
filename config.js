/**
 * config.js — 接続先の設定
 *
 * ⚠️ ここだけ書き換えれば動く。他のファイルは触らないこと。
 *
 * GAS_URL：スプレッドシートのメニュー「🎁 プレゼント企画 > 🔗 ウェブアプリのURLを表示」
 *          で表示されるURLを貼り付ける（末尾が /exec のもの）。
 */
const GAS_URL = 'ここにGASのウェブアプリURLを貼る';

/* ------------------------------------------------------------------
 * プレビューモード（画面確認用）
 *
 * GAS_URL が未設定のあいだだけ、ダミーの応答を返して画面を動かす。
 * URLを設定すると自動的に無効になるので、公開前に消す作業は不要。
 *
 * 画面の切り替えは URL のパラメータで行う：
 *   index.html?phase=before  … 開始前
 *   index.html?phase=after   … 終了後
 *   index.html?phase=paused  … 受付停止中
 *   win.html?t=preview       … 当選者ページ（住所入力）
 *   win.html?t=expired       … 当選者ページ（期限切れ）
 * ---------------------------------------------------------------- */
const PREVIEW = (GAS_URL === 'ここにGASのウェブアプリURLを貼る');

/**
 * プレビュー中は画面上部に固定バーを出す。
 * このモードではフォームが「成功」しても実際には保存されないため、
 * 確認用URLを渡した相手が本当に応募したと誤解しないようにする。
 */
if (PREVIEW) {
  document.addEventListener('DOMContentLoaded', function () {
    const bar = document.createElement('div');
    bar.id = 'previewBar';
    bar.innerHTML =
      '<strong>⚠️ これは画面確認用のプレビューです</strong><br>' +
      '応募は受け付けていません。送信しても記録されません。';
    document.body.prepend(bar);
  });
}

function previewStatus_() {
  const phase = new URLSearchParams(location.search).get('phase') || 'open';
  return {
    ok: true,
    data: {
      phase: phase,
      title: '【プレビュー】OKL 視聴者プレゼント企画',
      startText: '2026年8月28日 12:00',
      endText: '2026年9月6日 23:59',
      winners: 20,
      sizes: ['S', 'M', 'L', 'XL'],
      contact: 'preview@example.com',
      shipTiming: '9月下旬',
      deadlineDays: 7,
      publishNick: false,
    },
  };
}

function previewVerify_(t) {
  if (t === 'expired') return { ok: false, error: 'expired' };
  if (t === 'done') return { ok: false, error: 'already_registered', data: { nick: 'なおと', prize: 'タオル' } };
  if (t !== 'preview') return { ok: false, error: 'invalid_token' };
  return {
    ok: true,
    data: {
      title: '【プレビュー】OKL 視聴者プレゼント企画',
      nick: 'なおと',
      prize: 'Tシャツ',
      size: 'M',
      needSize: true,
      sizes: ['S', 'M', 'L', 'XL'],
      deadlineText: '2026年9月13日 23:59',
      contact: 'preview@example.com',
      shipTiming: '9月下旬',
    },
  };
}

/* ------------------------------------------------------------------
 * 通信のヘルパー
 *
 * ⚠️ GASのウェブアプリは preflight（OPTIONS）に応答できないため、
 *    Content-Type を text/plain にして「単純リクエスト」として送る必要がある。
 *    application/json にすると必ず CORS エラーになる。ここは変えないこと。
 *
 * ⚠️ credentials: 'omit' は必須。
 *    Cookieを送らないことで、プライバシーポリシーの
 *    「Cookieおよび類似技術による情報の取得は行いません」を満たしている。
 * ---------------------------------------------------------------- */

async function apiGet(params) {
  if (PREVIEW) {
    await new Promise(function (r) { setTimeout(r, 300); }); // 読み込み表示の確認用
    if (params.action === 'status') return previewStatus_();
    if (params.action === 'verify') return previewVerify_(params.t);
    return { ok: false, error: 'bad_request' };
  }
  return apiGetReal_(params);
}

async function apiPost(payload) {
  if (PREVIEW) {
    await new Promise(function (r) { setTimeout(r, 600); });
    if (payload.email === 'dup@example.com') return { ok: false, error: 'duplicate' };
    return { ok: true, id: 'preview0001' };
  }
  return apiPostReal_(payload);
}

async function apiGetReal_(params) {
  const q = Object.keys(params)
    .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
    .join('&');
  const res = await fetch(GAS_URL + '?' + q, {
    method: 'GET',
    credentials: 'omit',
    redirect: 'follow',
  });
  return res.json();
}

async function apiPostReal_(payload) {
  const res = await fetch(GAS_URL, {
    method: 'POST',
    credentials: 'omit',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

/** サーバーが返すエラーコードを日本語にする */
const ERROR_TEXT = {
  closed_before: '応募期間はまだ始まっていません。',
  closed_after: '応募期間は終了しました。',
  paused: '現在、応募の受付を停止しています。',
  duplicate: 'このメールアドレスはすでに応募済みです。応募はお一人様1回限りです。',
  invalid_email: 'メールアドレスの形式が正しくありません。',
  invalid_nickname: 'ニックネームを20文字以内で入力してください。',
  invalid_prize: 'ご希望の賞品を選択してください。',
  invalid_size: 'Tシャツのサイズを選択してください。',
  age_required: '20歳以上であることをご確認ください。',
  agree_required: '応募規約とプライバシーポリシーへの同意が必要です。',
  invalid_name: 'お名前を50文字以内で入力してください。',
  invalid_zip: '郵便番号を正しく入力してください（例：123-4567）。',
  invalid_addr: 'ご住所を200文字以内で入力してください。',
  invalid_tel: '電話番号を正しく入力してください（半角数字10〜11桁）。',
  invalid_token: 'このURLは無効です。当選通知メールに記載のURLをご確認ください。',
  expired: 'ご登録の期限が過ぎています。お手数ですが事務局までご連絡ください。',
  already_registered: 'すでに発送先のご登録が完了しています。',
  too_fast: '送信が早すぎます。もう一度お試しください。',
  rate_limited: 'アクセスが集中しています。しばらく待ってからお試しください。',
  busy: '処理が混み合っています。もう一度お試しください。',
  invalid: '入力内容に誤りがあります。',
  bad_request: 'リクエストが正しくありません。',
  server: 'サーバーでエラーが発生しました。時間をおいてお試しください。',
};

function errorText(code) {
  return ERROR_TEXT[code] || 'エラーが発生しました。時間をおいてお試しください。';
}
