const { C, t, tr, line, wire, svgDoc, FS } = require('./lib');
const OFF = '#ECEDF0';
// 7-segment digit. lit: string of segment letters; dp: false|'ink'|'red'; s: scale
function digit(x, y, lit, o = {}) {
  const s = o.s || 1, w = 100 * s, h = 180 * s, th = 15 * s, g = 3 * s;
  const on = o.on || C.ink, off = o.off || OFF;
  const H = (x1, x2, yy) => `${x1},${yy} ${x1 + th / 2},${yy - th / 2} ${x2 - th / 2},${yy - th / 2} ${x2},${yy} ${x2 - th / 2},${yy + th / 2} ${x1 + th / 2},${yy + th / 2}`;
  const V = (xx, y1, y2) => `${xx},${y1} ${xx + th / 2},${y1 + th / 2} ${xx + th / 2},${y2 - th / 2} ${xx},${y2} ${xx - th / 2},${y2 - th / 2} ${xx - th / 2},${y1 + th / 2}`;
  const L = x + th / 2, R = x + w - th / 2, T = y + th / 2, M = y + h / 2, B = y + h - th / 2;
  const segs = {
    a: H(L + g, R - g, T), g: H(L + g, R - g, M), d: H(L + g, R - g, B),
    f: V(L, T + g, M - g), b: V(R, T + g, M - g), e: V(L, M + g, B - g), c: V(R, M + g, B - g),
  };
  let out = '';
  for (const k of 'abcdefg') {
    const col = lit.includes(k) ? (o.litColor && o.litColor[k]) || on : off;
    out += `<polygon points="${segs[k]}" fill="${col}"/>`;
  }
  const dpc = o.dp === 'red' ? C.red : o.dp === 'ink' ? on : off;
  out += `<circle cx="${x + w + 15 * s}" cy="${B}" r="${9 * s}" fill="${dpc}"/>`;
  return { svg: out, w, h, L, R, T, M, B, dp: [x + w + 15 * s, B] };
}
module.exports = () => {
  const W = 1400, H = 800, F = 26;
  let s = '';
  const XS = [20, 165, 310, 455];
  const an = ['an[3]', 'an[2]', 'an[1]', 'an[0]'];
  const pat = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 7: 'abc' };
  // row 1 : 01.27
  [0, 1, 2, 7].forEach((d, i) => {
    s += digit(XS[i], 70, pat[d], { dp: i === 1 ? 'red' : false }).svg;
    s += t(XS[i] + 50, 290, an[i], { mono: true, size: F, color: i === 1 ? C.red : C.grey });
  });
  s += t(XS[0] + 122, 20, '분', { size: F, color: C.grey }) + t(XS[2] + 122, 20, '초', { size: F, color: C.grey });
  s += `<path d="M${XS[0]},50 L${XS[0]},42 L${XS[1] + 100},42 L${XS[1] + 100},50 M${XS[2]},50 L${XS[2]},42 L${XS[3] + 100},42 L${XS[3] + 100},50" fill="none" stroke="${C.grey}" stroke-width="1.5"/>`;
  s += tr(20, 345, [['an[2]', { mono: true }], [' 자리의 dp 만 사용 → ', {}], ['MM.SS', { mono: true }]], { anchor: 'start', size: F, monoSize: F });
  s += t(20, 385, '0.5초 켜짐 / 0.5초 꺼짐 = 1초에 1번 깜박', { anchor: 'start', size: F });

  // enlarged reference digit
  const ex = 900, ey = 58, sc = 1.24;
  const big = digit(ex, ey, '', { s: sc, dp: 'red', off: '#C9CCD1' });
  s += big.svg;
  const lab = (x, y, str, col) => t(x, y, str, { mono: true, size: 28, color: col || C.ink, weight: 'bold' });
  s += lab((big.L + big.R) / 2, ey - 22, 'a');
  s += lab(big.R + 30, (big.T + big.M) / 2, 'b');
  s += lab(big.R + 30, (big.M + big.B) / 2, 'c');
  s += lab((big.L + big.R) / 2, ey + big.h + 24, 'd');
  s += lab(big.L - 30, (big.M + big.B) / 2, 'e');
  s += lab(big.L - 30, (big.T + big.M) / 2, 'f');
  s += lab((big.L + big.R) / 2, big.M - 30, 'g');
  s += lab(big.dp[0] + 38, big.dp[1], 'dp', C.red);
  s += tr(760, 345, [['seg[7:0] = {dp,g,f,e,d,c,b,a}', { mono: true }]], { size: F, monoSize: F, anchor: 'start' });
  s += tr(760, 385, [['seg[7]', { mono: true, color: C.red }], [' = dp, active-low (0 = 켜짐)', {}]], { size: F, monoSize: F, anchor: 'start' });

  s += line(20, 430, W - 20, 430, { stroke: '#D9DBDF', sw: 1 });

  // row 2 : animation, only b lit
  XS.forEach(x => { s += digit(x, 470, 'b', {}).svg; });
  s += tr(20, 725, [["anim_seg = 7'b1 << idx", { mono: true }], ['  (', {}], ['idx', { mono: true }], [' 0~5)', {}]], { anchor: 'start', size: F, monoSize: F });
  s += tr(20, 765, [['→ ', {}], ['g', { mono: true }], [' 는 절대 안 켜짐 (테두리만 회전)', {}]], { anchor: 'start', size: F, monoSize: F });
  const TX = 900, TY = 510, CWd = 78;
  s += t(TX - 16, TY, 'idx', { mono: true, anchor: 'end', color: C.grey, size: F });
  s += t(TX - 16, TY + 62, 'seg', { mono: true, anchor: 'end', color: C.grey, size: F });
  s += t(TX - 16, TY + 124, 'anim_seg', { mono: true, anchor: 'end', color: C.grey, size: F });
  ['a', 'b', 'c', 'd', 'e', 'f'].forEach((c, i) => {
    const cx = TX + 26 + i * CWd;
    s += t(cx, TY, String(i), { mono: true, size: F });
    s += t(cx, TY + 62, c, { mono: true, size: F, weight: i === 1 ? 'bold' : null });
    s += t(cx, TY + 124, ['01', '02', '04', '08', '10', '20'][i], { mono: true, size: F });
    if (i < 5) s += wire([[cx + 14, TY + 62], [cx + CWd - 14, TY + 62]], { stroke: C.grey, sw: 1.5 });
  });
  s += `<rect x="${TX + 26 + CWd - 30}" y="${TY - 26}" width="60" height="176" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
  s += t(TX + 26 + CWd, TY + 182, '그림의 순간', { size: F, color: C.grey });
  s += tr(TX + 26 + 2.5 * CWd, TY + 230, [['100 ms 마다 ', {}], ['idx', { mono: true }], [' +1, 5 다음 0', {}]], { size: F, monoSize: F, color: C.grey });
  return svgDoc(W, H, s);
};
