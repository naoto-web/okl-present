/**
 * doc.js — 応募規約・プライバシーポリシーの差し込み
 *
 * 企画名・応募期間・問い合わせ先などを「設定」シートの値で埋める。
 * 同じ内容をHTMLに直書きすると、設定を変えたときに規約だけ古くなって食い違うため。
 *
 * 使い方：HTML側に data-cfg="キー" を書いておくと、その中身が置き換わる。
 *   キー：title / period / start / end / contact / winners / deadlineDays / shipTiming
 * publishNick が「する」のときだけ表示したい要素には class="only-publish-nick" を付ける。
 */

document.addEventListener('DOMContentLoaded', async function () {
  try {
    const res = await apiGet({ action: 'status' });
    if (!res || !res.ok) return;
    const d = res.data;

    const map = {
      title: d.title,
      period: (d.startText && d.endText) ? d.startText + ' 〜 ' + d.endText : '',
      start: d.startText,
      end: d.endText,
      contact: d.contact,
      winners: d.winners,
      deadlineDays: d.deadlineDays,
      shipTiming: d.shipTiming,
    };

    document.querySelectorAll('[data-cfg]').forEach(function (el) {
      const v = map[el.getAttribute('data-cfg')];
      if (v !== undefined && v !== null && String(v) !== '') el.textContent = v;
    });

    if (d.title) {
      document.querySelectorAll('.doc-title').forEach(function (el) { el.textContent = d.title; });
    }

    if (d.publishNick) {
      document.querySelectorAll('.only-publish-nick').forEach(function (el) {
        el.classList.remove('hidden');
      });
    }
  } catch (e) {
    // 通信できなくても規約本文は読める（差し込み箇所が既定値のまま残るだけ）
    console.warn('設定の読み込みに失敗しました', e);
  }
});
