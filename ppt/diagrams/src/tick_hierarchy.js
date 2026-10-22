const { C, t, tr, rect, wire, line, dot, svgDoc } = require('./lib');
const F = 26, TT = 34;
module.exports = () => {
  const W = 1500, H = 720;
  let s = '';
  const leaves = [
    ['×1', '1 ms', 'FND 1자리 스캔', 'fnd_digit_select'],
    ['×10', '10 ms', '업/다운 스텝', 'up_down_counter'],
    ['×100', '100 ms', '애니메이션 1 스텝', 'anim_cnt'],
    ['×500', '0.5 s', 'dot 토글', 'ms_cnt < 500'],
    ['×1000', '1 s', '초 증가', 'ms_cnt 999→0'],
    ['×5000', '5 s', 'idle 타임아웃', 'idle_cnt'],
  ];
  const Y0 = 10, DY = 104, LH = 88, LX = 920, LW = 570, TX = 800;
  const ys = leaves.map((_, i) => Y0 + i * DY + LH / 2);
  const CY = (ys[2] + ys[3]) / 2;
  s += rect(10, CY - 55, 230, 110);
  s += t(125, CY - 18, 'clk', { mono: true, weight: 'bold', size: TT });
  s += t(125, CY + 26, '100 MHz', { size: F });
  s += wire([[240, CY], [500, CY]]);
  s += t(370, CY - 26, '÷100,000', { mono: true, size: F });
  s += t(370, CY + 28, 'tick_generator', { mono: true, size: 24, color: C.grey });
  s += rect(500, CY - 55, 240, 110, { stroke: C.red, sw: 3 });
  s += t(620, CY - 18, 'tick', { mono: true, weight: 'bold', size: TT, color: C.red });
  s += t(620, CY + 26, '1 kHz (1 ms)', { size: F });
  s += wire([[740, CY], [TX, CY]], { arrow: false }) + dot(TX, CY);
  s += line(TX, ys[0], TX, ys[5]);
  leaves.forEach(([mul, per, what, who], i) => {
    const cy = ys[i], y = cy - LH / 2;
    if (i > 0 && i < 5) s += dot(TX, cy);
    s += wire([[TX, cy], [LX, cy]]);
    s += t(860, cy - 22, mul, { mono: true, size: F });
    s += rect(LX, y, LW, LH);
    s += t(LX + 18, cy, per, { mono: true, weight: 'bold', size: 28, anchor: 'start' });
    s += line(LX + 150, y, LX + 150, y + LH, { stroke: C.grey, sw: 1 });
    s += t(LX + 172, cy - 17, what, { anchor: 'start', size: F });
    s += t(LX + 172, cy + 21, who, { mono: true, size: 24, anchor: 'start', color: C.grey });
  });
  s += tr(10, 680, [['모든 FF 는 100 MHz ', {}], ['clk', { mono: true }], [' 하나로 동작. ', {}], ['tick', { mono: true, color: C.red }], [' 은 1클럭 폭 enable 펄스', {}]], { anchor: 'start', size: F, monoSize: F });
  return svgDoc(W, H, s);
};
