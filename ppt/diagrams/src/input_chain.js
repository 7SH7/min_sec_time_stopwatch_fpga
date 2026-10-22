const { C, t, tr, rect, wire, line, dot, dff, andGate, svgDoc } = require('./lib');
const F = 28, TT = 32, P = 26;
module.exports = () => {
  const W = 1300, H = 860;
  let s = '';
  const M = (x, y, str, o = {}) => t(x, y, str, { mono: true, size: F, ...o });
  // ---------- row 1 : debouncer.v ----------
  const Y = 190;
  s += rect(180, 60, 885, 340, { stroke: C.grey, sw: 1.5, dash: '6 5' });
  s += M(1055, 378, 'debouncer.v', { anchor: 'end', color: C.grey });
  const f1 = dff(215, Y - 38, { w: 90, h: 120, pin: P }), f2 = dff(485, Y - 38, { w: 90, h: 120, pin: P });
  s += f1.svg + f2.svg;
  s += M(10, Y - 30, 'noisy_btn', { anchor: 'start' });
  s += wire([[10, Y], f1.d]);
  s += `<path d="M10,${Y - 66} L10,${Y - 76} L150,${Y - 76} L150,${Y - 66}" fill="none" stroke="${C.red}" stroke-width="2.5"/>`;
  s += t(80, Y - 102, '비동기 입력', { color: C.red, size: F, weight: 'bold' });
  s += wire([f1.q, f2.d]);
  s += M(395, Y - 30, 'btn_meta');
  s += `<path d="M215,${Y - 56} L215,${Y - 66} L575,${Y - 66} L575,${Y - 56}" fill="none" stroke="${C.ink}" stroke-width="1.5"/>`;
  s += tr(395, Y - 94, [['ASYNC_REG', { mono: true }], [' 2단 FF 동기화', {}]], { size: F, monoSize: F });
  const CX = 745, CWd = 300;
  s += rect(CX, Y - 40, CWd, 170);
  s += t(CX + CWd / 2, Y, 'r_count', { mono: true, weight: 'bold', size: TT });
  s += t(CX + CWd / 2, Y + 46, '10 ms 안정 판정', { size: F });
  s += M(CX + CWd / 2, Y + 92, 'LIMIT=999,999', { color: C.grey });
  s += wire([f2.q, [CX, Y]]);
  s += M(660, Y - 30, 'btn_sync');
  // clock rail row 1
  const CK1 = 350;
  s += line(120, CK1, CX + 60, CK1, { stroke: C.grey });
  s += M(110, CK1, 'clk', { anchor: 'end', color: C.grey });
  const clkTo = (f, rail) => wire([[f.clk[0] - 30, rail], [f.clk[0] - 30, f.clk[1]], f.clk], { stroke: C.grey }) + dot(f.clk[0] - 30, rail, { fill: C.grey });
  s += clkTo(f1, CK1) + clkTo(f2, CK1);
  s += wire([[CX + 60, CK1], [CX + 60, Y + 130]], { stroke: C.grey });

  // clean_btn snakes down to row 2
  const RY = 470;
  s += wire([[CX + CWd, Y], [1130, Y], [1130, RY], [120, RY], [120, 560], [200, 560]], { arrow: false });
  s += M(640, RY - 28, 'clean_btn');

  // ---------- row 2 : edge_detector.v ----------
  s += rect(180, 505, 885, 330, { stroke: C.grey, sw: 1.5, dash: '6 5' });
  s += M(1055, 813, 'edge_detector.v', { anchor: 'end', color: C.grey });
  const JY = 560;
  const g = andGate(720, JY + 40, { h: 54 });
  s += dot(200, JY);
  s += wire([[200, JY], [g.a[0], JY]]);
  const f3 = dff(330, 642, { w: 90, h: 120, pin: P });
  s += f3.svg;
  s += wire([[200, JY], [200, f3.d[1]], f3.d]);
  const BX = 640;
  s += wire([f3.q, [BX, f3.q[1]], [BX, g.b[1]], [g.b[0] - 14, g.b[1]]], { arrow: false });
  s += `<circle cx="${g.b[0] - 7}" cy="${g.b[1]}" r="7" fill="#fff" stroke="${C.ink}" stroke-width="2"/>`;
  s += M(530, f3.q[1] - 26, 'level_d');
  s += g.svg;
  s += wire([g.out, [1240, g.out[1]]]);
  s += M(1235, g.out[1] - 30, 'pulse', { anchor: 'end', weight: 'bold' });
  s += t(1235, g.out[1] + 34, '1클럭 폭', { anchor: 'end', size: F });
  s += M(895, 705, 'level & ~level_d');
  const CK2 = 800;
  s += line(120, CK2, 300, CK2, { stroke: C.grey });
  s += M(110, CK2, 'clk', { anchor: 'end', color: C.grey });
  s += clkTo(f3, CK2);
  return svgDoc(W, H, s);
};
