const { C, t, tr, line, timing, svgDoc, FS } = require('./lib');
const spec = JSON.parse(JSON.stringify(require('../wave_anim.json')));
spec.signal[1].slope = 3; spec.signal[1].dataSize = 24;
module.exports = () => {
  const W = 1600, H = 660;
  const T = timing(spec, { x0: 150, y0: 80, cw: 40, lh: 66, amp: 34, gap: 44, nameSize: 26, dataSize: 26, slope: 5 });
  let s = T.svg;
  const L = T.lanes, top = L[0].top - 8, bot = L[7].lo + 8;
  // ANIM entry (accent)
  s += line(T.X(4), top, T.X(4), bot, { stroke: C.red, sw: 2.5 });
  s += tr(T.X(4) - 6, top - 30, [['5000', { mono: true }], ['번째 ', {}], ['tick', { mono: true }], [' → ANIM', {}]], { color: C.red, weight: 'bold', anchor: 'start', size: 27, monoSize: 27 });
  // button -> RUN
  s += line(T.X(31), top, T.X(31), bot, { stroke: C.ink, sw: 1.5, dash: '5 4' });
  s += t(T.X(31) + 6, top - 30, '버튼 → 즉시 RUN', { anchor: 'end', size: 27 });
  // rotation label in spacer above anim_seg
  s += tr((T.X(4) + T.X(28)) / 2, L[5].hi - 26, [['a→b→c→d→e→f', { mono: true }], ['  (스텝마다 한 세그먼트)', {}]], { size: 26, monoSize: 26 });
  s += tr(10, 625, [['애니메이션 1 스텝 = 100 ', {}], ['tick', { mono: true }], [' (그림은 2 ', {}], ['tick', { mono: true }], [' 으로 축약).  RUN 에서는 ', {}], ['anim_en', { mono: true }], ['=0 이라 ', {}], ['anim_seg', { mono: true }], [' 무시', {}]], { anchor: 'start', size: 26, monoSize: 26, color: C.grey });
  return svgDoc(W, H, s);
};
