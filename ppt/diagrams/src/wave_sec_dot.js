const { C, t, tr, wire, curve, line, timing, svgDoc, FS } = require('./lib');
const spec = require('../wave_sec_dot.json');
module.exports = () => {
  const W = 1440, H = 560;
  const T = timing(spec, { x0: 175, y0: 80, cw: 104, lh: 70, amp: 34, nameSize: 26, dataSize: 26 });
  let s = T.svg;
  const xw = T.X(6);
  // the wrap edge : one red line through all lanes
  const top = T.lanes[0].top - 10, bot = T.lanes[5].lo + 10;
  s += `<line x1="${xw}" y1="${top}" x2="${xw}" y2="${bot}" stroke="${C.red}" stroke-width="2.5"/>`;
  s += t(xw, top - 30, '같은 클럭 엣지', { color: C.red, weight: 'bold', size: 28 });
  // tick that causes the wrap
  const tk = T.lanes[1];
  s += tr(T.X(6) - 12, tk.lo + 30, [['ms_cnt', { mono: true }], [' = 999 일 때의 ', {}], ['tick', { mono: true }], [' ↑', {}]], { size: 26, monoSize: 26, anchor: 'end' });
  // right-hand notes
  s += tr(10, 500, [['dot', { mono: true }], [' = (', {}], ['ms_cnt < 500', { mono: true }], [')  → 1초의 앞 0.5초만 켜짐', {}]], { anchor: 'start', size: 26, monoSize: 26 });
  s += tr(10, 540, [['tick', { mono: true }], [' 간격은 실제로 100,000 clk (그림은 2 clk 로 축약)', {}]], { anchor: 'start', size: 24, monoSize: 24, color: C.grey });
  return svgDoc(W, H, s);
};
