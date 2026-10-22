const { C, t, tr, rect, line, wire, dot, dff, bufGate, svgDoc } = require('./lib');
const F = 28, TT = 30;
module.exports = () => {
  const W = 1500, H = 1010;
  let s = '';
  const M = (x, y, str, o = {}) => t(x, y, str, { mono: true, size: F, ...o });
  // ---------- top : one driver, eight loads ----------
  const ys = [...Array(8)].map((_, i) => 40 + i * 52);
  const CY = (ys[3] + ys[4]) / 2;
  const drv = bufGate(40, CY, { h: 36 });
  s += wire([[10, CY], drv.in], { arrow: false }) + drv.svg;
  s += t(70, CY + 66, '드라이버', { size: F, color: C.grey });
  const BX = 190, LX = 250;
  s += `<path d="M${drv.out[0]},${CY} L${BX},${CY}" stroke="${C.red}" stroke-width="3.5" fill="none"/>`;
  s += line(BX, ys[0], BX, ys[7], { stroke: C.red, sw: 3.5 });
  ys.forEach(y => { s += line(BX, y, LX, y, { stroke: C.red, sw: 3.5 }) + bufGate(LX, y, { h: 13 }).svg + dot(BX, y, { fill: C.red, r: 5 }); });
  s += `<path d="M${LX + 40},${ys[0] - 16} L${LX + 50},${ys[0] - 16} L${LX + 50},${ys[7] + 16} L${LX + 40},${ys[7] + 16}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
  s += t(LX + 64, CY, '부하 8개', { anchor: 'start', size: F });
  const TX = 520;
  s += t(TX, 80, '입력 커패시턴스 합 ↑', { anchor: 'start', size: F });
  s += t(TX, 132, '→ 상승/하강 시간 ↑', { anchor: 'start', size: F });
  s += t(TX, 184, '→ 지연 ↑', { anchor: 'start', size: F });
  s += t(TX, 236, '→ setup 위반 위험', { anchor: 'start', size: F, color: C.red, weight: 'bold' });
  // edge comparison
  const EX = 1000, EW = 420, EY = 60, EH = 80;
  s += `<path d="M${EX},${EY + EH} L${EX + 60},${EY + EH} L${EX + 70},${EY} L${EX + EW},${EY}" fill="none" stroke="${C.grey}" stroke-width="2.5"/>`;
  s += `<path d="M${EX},${EY + EH + 170} L${EX + 60},${EY + EH + 170} C${EX + 150},${EY + EH + 170} ${EX + 170},${EY + 170} ${EX + EW},${EY + 170}" fill="none" stroke="${C.red}" stroke-width="3.5"/>`;
  s += line(EX + 60, EY - 16, EX + 60, EY + EH + 186, { stroke: '#D9DBDF', sw: 1, dash: '3 5' });
  s += t(EX + 250, EY + 44, '부하 1', { size: F, color: C.grey });
  s += t(EX + 300, EY + 226, '부하 8', { size: F, color: C.red });
  s += t(EX + 60, EY + EH + 236, '같은 입력 변화 시점', { size: F, color: C.grey, anchor: 'start' });

  s += line(10, 470, W - 10, 470, { stroke: '#D9DBDF', sw: 1 });

  // ---------- bottom-left : buffer tree ----------
  const T0 = 560;
  s += t(20, 520, '버퍼 트리', { anchor: 'start', weight: 'bold', size: TT });
  const L3 = [...Array(8)].map((_, i) => T0 + 20 + i * 34);
  const L2 = [0, 1, 2, 3].map(i => (L3[2 * i] + L3[2 * i + 1]) / 2);
  const L1 = [0, 1].map(i => (L2[2 * i] + L2[2 * i + 1]) / 2);
  const L0 = (L1[0] + L1[1]) / 2;
  const fan = (fx, fy, tx, tys) => tys.map(y => `<path d="M${fx},${fy} L${fx + 18},${fy} L${fx + 18},${y} L${tx},${y}" fill="none" stroke="${C.ink}" stroke-width="2"/>`).join('');
  const b0 = bufGate(30, L0, { h: 20 }); s += b0.svg + fan(b0.out[0], L0, 140, L1);
  L1.forEach((y, i) => { const b = bufGate(140, y, { h: 17 }); s += b.svg + fan(b.out[0], y, 250, [L2[2 * i], L2[2 * i + 1]]); });
  L2.forEach((y, i) => { const b = bufGate(250, y, { h: 14 }); s += b.svg + fan(b.out[0], y, 360, [L3[2 * i], L3[2 * i + 1]]); });
  L3.forEach(y => { s += bufGate(360, y, { h: 11 }).svg; });
  s += M(20, 880, '1 → 2 → 4 → 8', { anchor: 'start' });

  // ---------- bottom-middle : register duplication ----------
  const RX = 540;
  s += t(RX, 520, '레지스터 복제', { anchor: 'start', weight: 'bold', size: TT });
  const fa = dff(RX + 60, 570, { w: 110, h: 120, pin: F }), fb = dff(RX + 60, 720, { w: 110, h: 120, pin: F });
  s += fa.svg + fb.svg;
  s += wire([[RX, fa.d[1]], fa.d]) + dot(RX + 25, fa.d[1]) + wire([[RX + 25, fa.d[1]], [RX + 25, fb.d[1]], fb.d]);
  const four = (q) => { const y0 = q[1] - 39; let o = wire([q, [RX + 230, q[1]]], { arrow: false }) + line(RX + 230, y0, RX + 230, y0 + 78); [0, 1, 2, 3].forEach(i => { const y = y0 + i * 26; o += line(RX + 230, y, RX + 262, y) + bufGate(RX + 262, y, { h: 10 }).svg; }); return o; };
  s += four(fa.q) + four(fb.q);
  s += t(RX, 880, '같은 FF 2개로 부하 분산', { anchor: 'start', size: F });

  // ---------- bottom-right : clock buffer ----------
  const KX = 1010, KY = 680;
  s += t(KX, 520, '클럭은 전용 버퍼', { anchor: 'start', weight: 'bold', size: TT });
  s += M(KX, KY - 36, 'clk', { anchor: 'start', color: C.grey });
  s += line(KX, KY, KX + 70, KY, { stroke: C.grey });
  const bg = bufGate(KX + 70, KY, { h: 26, stroke: C.grey });
  s += bg.svg + M(KX + 92, KY + 56, 'BUFG', { color: C.grey });
  s += line(bg.out[0], KY, 1470, KY, { stroke: C.grey });
  [1250, 1330, 1410].forEach(x => { s += dot(x, KY, { fill: C.grey }) + wire([[x, KY], [x, KY + 70]], { stroke: C.grey }); });
  s += t(1330, KY + 100, '모든 FF', { size: F, color: C.grey });
  s += t(KX, 880, '전용 배선, skew 최소', { anchor: 'start', size: F });

  s += tr(10, 950, [['이 설계에서 fan-out 큰 신호 : ', {}], ['tick', { mono: true }], [', ', {}], ['reset', { mono: true }], [', ', {}], ['state', { mono: true }]], { anchor: 'start', size: F, monoSize: F });
  s += t(10, 994, '필요하면 Vivado 가 복제 / 버퍼 삽입', { anchor: 'start', size: F, color: C.grey });
  return svgDoc(W, H, s);
};
