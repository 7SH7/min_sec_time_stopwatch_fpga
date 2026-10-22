const { C, t, tr, rect, wire, line, svgDoc } = require('./lib');
const F = 27, TT = 32;
module.exports = () => {
  const W = 1705, H = 410;
  const modes = [
    ['IDLE', '000', '0000', '0'],
    ['UP', '001', '0000~9999 ↑', 'count'],
    ['DOWN', '010', '9999~0000 ↓', 'count'],
    ['SW_READ', '011', null, 'sw'],
    ['STOPWATCH', '100', 'MM.SS', 'state'],
  ];
  const X0 = 165, BW = 230, GAP = 95, BY = 92, BH = 124;
  let s = '';
  const bx = i => X0 + i * (BW + GAP);
  modes.forEach(([n, code, fnd, led], i) => {
    const x = bx(i), red = i === 4;
    s += rect(x, BY, BW, BH, { stroke: red ? C.red : C.ink, sw: red ? 3 : 2 });
    s += t(x + BW / 2, BY + 42, n, { mono: true, weight: 'bold', size: TT, color: red ? C.red : C.ink });
    s += t(x + BW / 2, BY + 90, '(' + code + ')', { mono: true, size: F, color: C.grey });
    if (fnd) s += t(x + BW / 2, 282, fnd, { mono: true, size: F });
    else s += tr(x + BW / 2, 282, [['sw', { mono: true }], [' 값 (0~255)', {}]], { size: F, monoSize: F });
    s += t(x + BW / 2, 346, led, { mono: true, size: F });
    if (i < 4) {
      s += wire([[x + BW, BY + BH / 2], [x + BW + GAP, BY + BH / 2]]);
      s += t(x + BW + GAP / 2, BY + BH / 2 - 24, 'btnL', { mono: true, size: F });
    }
  });
  const xr = bx(4) + BW / 2, xu = bx(1) + BW / 2;
  s += wire([[xr, BY], [xr, 50], [xu, 50], [xu, BY]]);
  s += t((xr + xu) / 2, 24, 'btnL', { mono: true, size: F });
  s += t(10, 282, 'FND', { mono: true, anchor: 'start', size: F, color: C.grey });
  s += t(10, 346, 'led[12:0]', { mono: true, anchor: 'start', size: F, color: C.grey });
  s += line(10, 246, W - 10, 246, { stroke: C.grey, sw: 1 });
  s += line(10, 314, W - 10, 314, { stroke: C.grey, sw: 1 });
  s += t(bx(0) + BW / 2, 392, '리셋 직후에만', { size: F, color: C.grey });
  s += tr(W - 10, 392, [['괄호 안 = ', {}], ['led[15:13]', { mono: true }]], { size: F, monoSize: F, anchor: 'end', color: C.grey });
  return svgDoc(W, H, s);
};
