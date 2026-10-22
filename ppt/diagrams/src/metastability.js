const { C, t, tr, rect, line, wire, dot, dff, svgDoc } = require('./lib');
const F = 28;
module.exports = () => {
  const W = 1500, H = 960;
  let s = '';
  const M = (x, y, str, o = {}) => t(x, y, str, { mono: true, size: F, ...o });
  // ---------- top : what happens ----------
  const X0 = 130, XE = 1000, EDGE = 380, R = 800;
  const lane = (top, amp) => ({ hi: top, lo: top + amp, mid: top + amp / 2 });
  const CK = lane(40, 44), D = lane(140, 44), Q = lane(250, 110);
  s += M(X0 - 20, CK.mid, 'clk', { anchor: 'end', color: C.grey });
  s += M(X0 - 20, D.mid, 'D', { anchor: 'end' });
  s += M(X0 - 20, Q.mid, 'Q', { anchor: 'end' });
  s += `<path d="M${X0},${CK.lo} L${EDGE},${CK.lo} L${EDGE},${CK.hi} L${EDGE + 300},${CK.hi} L${EDGE + 300},${CK.lo} L${XE},${CK.lo}" fill="none" stroke="${C.grey}" stroke-width="2"/>`;
  s += line(EDGE, 24, EDGE, Q.lo + 20, { stroke: C.ink, sw: 1.5, dash: '6 5' });
  s += `<path d="M${X0},${D.lo} L${EDGE - 8},${D.lo} L${EDGE - 8},${D.hi} L${XE},${D.hi}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  s += t(EDGE - 22, D.hi - 18, '엣지 직전에 변화', { size: F, anchor: 'end' });
  s += line(X0, Q.mid, XE, Q.mid, { stroke: '#D9DBDF', sw: 1, dash: '3 5' });
  s += `<path d="M${X0},${Q.lo} L${EDGE + 24},${Q.lo}" fill="none" stroke="${C.ink}" stroke-width="2"/>`;
  let d = `M${EDGE + 24},${Q.lo} L${EDGE + 42},${Q.mid}`;
  for (let x = EDGE + 42; x < R; x += 2) d += ` L${x},${(Q.mid + 8 * Math.sin((x - EDGE) / 13) * Math.exp(-(x - EDGE) / 600)).toFixed(1)}`;
  s += `<path d="${d}" fill="none" stroke="${C.red}" stroke-width="3.5"/>`;
  s += `<path d="M${R},${Q.mid} C${R + 40},${Q.mid} ${R + 30},${Q.hi} ${R + 80},${Q.hi} L${XE},${Q.hi}" fill="none" stroke="${C.grey}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
  s += `<path d="M${R},${Q.mid} C${R + 40},${Q.mid} ${R + 30},${Q.lo} ${R + 80},${Q.lo} L${XE},${Q.lo}" fill="none" stroke="${C.grey}" stroke-width="2.5" stroke-dasharray="7 5"/>`;
  s += M(XE + 16, Q.hi, '1 ?', { anchor: 'start', color: C.grey });
  s += M(XE + 16, Q.lo, '0 ?', { anchor: 'start', color: C.grey });
  const by = Q.lo + 40;
  s += `<path d="M${EDGE + 42},${by - 10} L${EDGE + 42},${by} L${R},${by} L${R},${by - 10}" fill="none" stroke="${C.red}" stroke-width="2"/>`;
  s += t((EDGE + 42 + R) / 2, by + 34, '준안정 상태', { color: C.red, weight: 'bold', size: 32 });
  s += t((EDGE + 42 + R) / 2, by + 80, 'resolution time 불확실', { color: C.red, size: F });
  ['0 도 1 도 아닌', '중간 전압에 머물다가', '언제, 어느 쪽으로', '갈지 모른다'].forEach((l, i) => { s += t(1130, 150 + i * 44, l, { anchor: 'start', size: F }); });

  s += line(10, 520, W - 10, 520, { stroke: '#D9DBDF', sw: 1 });

  // ---------- bottom : 2-FF synchronizer ----------
  const f1 = dff(330, 600, { w: 120, h: 160, pin: F }), f2 = dff(760, 600, { w: 120, h: 160, pin: F });
  s += f1.svg + f2.svg;
  const Y = f1.d[1];
  s += M(20, Y - 30, 'async_in', { anchor: 'start' });
  s += wire([[20, Y], f1.d]) + wire([f1.q, f2.d]) + wire([f2.q, [1180, Y]]);
  s += M(1180, Y - 30, 'sync_out', { anchor: 'end' });
  s += `<path d="M${f1.q[0] + 6},${Y - 26} L${f1.q[0] + 6},${Y - 36} L${f2.d[0] - 6},${Y - 36} L${f2.d[0] - 6},${Y - 26}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
  s += t((f1.q[0] + f2.d[0]) / 2, Y - 66, '1 클럭 안정 시간', { size: F });
  s += M(390, 790, 'FF1', { color: C.grey }) + M(820, 790, 'FF2', { color: C.grey });
  const CY = 830;
  s += line(80, CY, f2.clk[0] - 40, CY, { stroke: C.grey });
  s += M(70, CY, 'clk', { anchor: 'end', color: C.grey });
  s += wire([[f1.clk[0] - 40, CY], [f1.clk[0] - 40, f1.clk[1]], f1.clk], { stroke: C.grey }) + dot(f1.clk[0] - 40, CY, { fill: C.grey });
  s += wire([[f2.clk[0] - 40, CY], [f2.clk[0] - 40, f2.clk[1]], f2.clk], { stroke: C.grey });
  ['FF2 가 샘플링할 때쯤', 'FF1 출력은 대부분 안정', '→ MTBF 지수적 증가'].forEach((l, i) => { s += t(1000, 690 + i * 44, l, { anchor: 'start', size: F }); });
  s += tr(20, 900, [['debouncer.v', { mono: true }], [' : ', {}], ['btn_meta', { mono: true }], [', ', {}], ['btn_sync', { mono: true }], ['  (ASYNC_REG)', { mono: true, color: C.grey }]], { anchor: 'start', size: F, monoSize: F });
  return svgDoc(W, H, s);
};
