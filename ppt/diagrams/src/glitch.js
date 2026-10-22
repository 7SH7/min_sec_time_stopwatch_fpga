const { C, t, tr, rect, line, wire, dot, dff, andGate, bufGate, svgDoc } = require('./lib');
const F = 28;
module.exports = () => {
  const W = 1500, H = 940;
  let s = '';
  const M = (x, y, str, o = {}) => t(x, y, str, { mono: true, size: F, ...o });
  const P = (pts, col, sw) => `<path d="M${pts.map(p => p.join(',')).join(' L')}" fill="none" stroke="${col || C.ink}" stroke-width="${sw || 2}"/>`;
  const lane = top => ({ hi: top, lo: top + 40, mid: top + 20 });
  // ---------- top-left : hazard circuit Y = A · A' ----------
  const g = andGate(380, 150, { h: 50 });
  s += M(20, g.a[1] - 30, 'A', { anchor: 'start' });
  s += wire([[20, g.a[1]], g.a]);
  s += dot(130, g.a[1]) + wire([[130, g.a[1]], [130, 250], [170, 250]], { arrow: false });
  const inv = bufGate(170, 250, { h: 26, invert: true });
  s += inv.svg;
  s += wire([inv.out, [320, 250], [320, g.b[1]], g.b]);
  s += M(272, 222, "A'");
  s += t(205, 305, '지연 t_inv', { size: F, color: C.grey });
  s += g.svg + wire([g.out, [590, 150]]);
  s += M(590, 122, 'Y', { anchor: 'end' });
  s += t(500, 196, '이론상 항상 0', { size: F, anchor: 'start', color: C.grey });

  // ---------- top-right : waveforms ----------
  const X0 = 790, XE = 1480, RISE = 1010, DLY = 90;
  const LA = lane(80), LB = lane(170), LY = lane(260);
  s += M(X0 - 20, LA.mid, 'A', { anchor: 'end' }) + M(X0 - 20, LB.mid, "A'", { anchor: 'end' }) + M(X0 - 20, LY.mid, 'Y', { anchor: 'end' });
  s += P([[X0, LA.lo], [RISE, LA.lo], [RISE, LA.hi], [XE, LA.hi]]);
  s += P([[X0, LB.hi], [RISE + DLY, LB.hi], [RISE + DLY, LB.lo], [XE, LB.lo]]);
  s += P([[X0, LY.lo], [RISE, LY.lo]]) + P([[RISE, LY.lo], [RISE, LY.hi], [RISE + DLY, LY.hi], [RISE + DLY, LY.lo]], C.red, 3.5) + P([[RISE + DLY, LY.lo], [XE, LY.lo]]);
  s += line(RISE, 40, RISE, LY.lo + 10, { stroke: C.grey, sw: 1, dash: '3 5' });
  s += line(RISE + DLY, 40, RISE + DLY, LY.lo + 10, { stroke: C.grey, sw: 1, dash: '3 5' });
  s += wire([[RISE, 46], [RISE + DLY, 46]], { startArrow: true, sw: 1.5 });
  s += M(RISE - 14, 46, 't_inv', { anchor: 'end' });
  s += t(RISE + DLY + 20, LY.mid, 'glitch (hazard)', { anchor: 'start', color: C.red, weight: 'bold', size: F });
  s += t(20, 380, '두 경로의 지연 차이 → 잠깐 둘 다 1 → 원하지 않는 펄스', { anchor: 'start', size: F });

  s += line(10, 430, W - 10, 430, { stroke: '#D9DBDF', sw: 1 });

  // ---------- bottom-left : register the output ----------
  const f = dff(300, 490, { w: 120, h: 160, pin: F });
  s += f.svg;
  s += tr(20, f.d[1] - 32, [['Y', { mono: true }], [' (조합 출력)', {}]], { anchor: 'start', size: F, monoSize: F });
  s += wire([[20, f.d[1]], f.d]);
  s += wire([f.q, [640, f.q[1]]]);
  s += tr(640, f.q[1] - 32, [['Y_reg', { mono: true }], [' → 핀', {}]], { anchor: 'end', size: F, monoSize: F });
  s += wire([[200, f.clk[1]], f.clk], { stroke: C.grey }) + M(190, f.clk[1], 'clk', { anchor: 'end', color: C.grey });
  s += t(360, 690, '출력 FF', { size: F, color: C.grey });

  // ---------- bottom-right : waveforms ----------
  const RC = lane(500), RY = lane(590), RQ = lane(680);
  s += M(X0 - 20, RC.mid, 'clk', { anchor: 'end', color: C.grey }) + M(X0 - 20, RY.mid, 'Y', { anchor: 'end' }) + M(X0 - 20, RQ.mid, 'Y_reg', { anchor: 'end' });
  const edges = [840, 1060, 1280];
  let d = `M${X0},${RC.lo}`;
  for (const x of edges) d += ` L${x},${RC.lo} L${x},${RC.hi} L${Math.min(x + 110, XE)},${RC.hi}` + (x + 110 < XE ? ` L${x + 110},${RC.lo}` : '');
  d += ` L${XE},${RC.lo}`;
  s += `<path d="${d}" fill="none" stroke="${C.grey}" stroke-width="2"/>`;
  for (const x of edges) s += line(x, 490, x, RQ.lo + 10, { stroke: C.grey, sw: 1, dash: '3 5' });
  s += P([[X0, RY.lo], [935, RY.lo], [935, RY.hi], [975, RY.hi], [975, RY.lo], [XE, RY.lo]]);
  s += P([[X0, RQ.lo], [XE, RQ.lo]]);
  s += t(955, RY.hi - 22, '글리치', { size: F });
  s += t(1075, RQ.hi - 4, '무시됨', { size: F, anchor: 'start' });
  s += t(20, 790, '출력을 FF 로 받기 → 클럭 엣지에서만 샘플링', { anchor: 'start', size: F });
  s += tr(20, 840, [['fnd_controller.v', { mono: true }], [' : ', {}], ['an', { mono: true }], [', ', {}], ['seg', { mono: true }], [' 출력 FF', {}]], { anchor: 'start', size: F, monoSize: F });
  s += tr(20, 890, [['tick', { mono: true }], [' 은 클럭이 아니라 enable 로 사용', {}]], { anchor: 'start', size: F, monoSize: F });
  return svgDoc(W, H, s);
};
