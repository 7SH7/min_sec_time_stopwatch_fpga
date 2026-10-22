const { C, t, tr, wire, line, timing, svgDoc, FS } = require('./lib');
const spec = JSON.parse(JSON.stringify(require('../wave_button_chain.json')));
module.exports = () => {
  spec.signal[5].hl = [2];                 // r_count reset by chatter
  const W = 1460, H = 600;
  const T = timing(spec, { x0: 180, y0: 20, cw: 57, lh: 70, amp: 34, gap: 36, nameSize: 26, dataSize: 26, slope: 6 });
  let s = T.svg;
  const L = T.lanes;
  // chatter -> reset (accent)
  s += tr(T.X(6) + 6, L[3].lo + 38, [['↓ 채터링 → ', {}], ['r_count', { mono: true }], [' 리셋', {}]], { anchor: 'start', size: 26, monoSize: 26, color: C.red, weight: 'bold' });
  // LIMIT clocks stable -> clean_btn
  s += tr(T.X(11) - 12, L[6].hi + 4, [['r_count', { mono: true }], [' 가 ', {}], ['LIMIT', { mono: true }], [' 까지 안정 → 반영', {}]], { size: 26, monoSize: 26, anchor: 'end' });
  // 1-clock pulse
  s += t(T.X(12) + 12, L[7].hi + 6, '1 클럭 펄스', { size: 26, anchor: 'start' });
  s += tr(10, 580, [['LIMIT', { mono: true }], [' = 4 로 축약 (실제 999,999 clk = 10 ms).  ', {}], ['pulse = clean_btn & ~level_d', { mono: true }]], { anchor: 'start', size: 24, monoSize: 24, color: C.grey });
  return svgDoc(W, H, s);
};
