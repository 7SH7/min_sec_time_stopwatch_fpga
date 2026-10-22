const { C, t, tr, rect, wire, line, dot, svgDoc } = require('./lib');
// type sizes for a 1660-wide canvas (>= 24px at a 1500 base)
const F = 27, TT = 32;
module.exports = () => {
  const W = 1700, H = 1050;
  let s = '';
  const gapV = (x, y1, y2) => `<line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#fff" stroke-width="12"/>`;
  const gapH = (y, x1, x2) => `<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#fff" stroke-width="12"/>`;
  const M = (x, y, str, o = {}) => t(x, y, str, { mono: true, size: F, ...o });
  const block = (x, y, w, h, title, lines = [], o = {}) => {
    let b = rect(x, y, w, h, { fill: '#fff' });
    b += t(x + w / 2, y + 36, title, { mono: true, weight: 'bold', size: TT });
    lines.forEach((l, i) => { b += Array.isArray(l) ? tr(x + w / 2, y + 82 + i * 38, l, { size: F, monoSize: F }) : t(x + w / 2, y + 82 + i * 38, l, { size: F }); });
    return b;
  };
  const A = 190, AW = 340, B = 710, BW = 380, CC = 1220, CW = 260;
  // blocks
  s += block(A, 60, AW, 190, 'btn_debouncer', ['2단 FF 동기화', '→ 10ms 디바운스', '→ 엣지 검출 ×3']);
  s += block(A, 780, AW, 120, 'tick_generator', ['100 MHz → 1 kHz']);
  s += block(B, 60, BW, 110, 'mode_controller', ['btnL 로 순환']);
  s += block(B, 250, BW, 110, 'up_down_counter', ['10ms 마다 ±1']);
  s += rect(B, 440, BW, 320, { fill: '#fff' });
  s += t(B + BW / 2, 476, 'stopwatch', { mono: true, weight: 'bold', size: TT });
  const sub = (y, runs) => rect(B + 22, y, BW - 44, 52, { sw: 1.5 }) + tr(B + BW / 2, y + 26, runs, { size: F, monoSize: F });
  s += sub(504, [['FSM ', {}], ['STOP/RUN/ANIM', { mono: true }]]);
  s += sub(566, [['MM:SS BCD 카운터', {}]]);
  s += sub(628, [['idle 5s 타이머', {}]]);
  s += sub(690, [['anim 패턴 생성', {}]]);
  s += block(CC, 250, CW, 510, 'display_mux', []);
  s += t(CC + CW / 2, 480, 'mode 에 따라', { size: F }) + t(CC + CW / 2, 520, '표시 선택', { size: F });
  s += block(CC, 60, CW, 110, 'led 선택', [[['led[15:13]', { mono: true }]]]);
  s += block(1110, 850, 360, 160, 'fnd_controller', ['1ms 스캔, 7seg 디코더', '출력 FF']);

  // inputs
  s += M(16, 30, 'sw[7:0]', { anchor: 'start' });
  s += M(16, 115, 'btn[2:0]', { anchor: 'start' });
  s += M(16, 815, 'clk', { anchor: 'start', color: C.grey });
  s += M(16, 868, 'reset', { anchor: 'start', color: C.grey });
  s += wire([[146, 115], [A, 115]]);
  s += wire([[80, 815], [A, 815]], { stroke: C.grey }) + wire([[110, 868], [A, 868]], { stroke: C.grey });
  // sw -> display_mux (top)
  s += wire([[140, 30], [1200, 30], [1200, 222], [1280, 222], [1280, 250]]);

  // btn_pulse
  s += wire([[A + AW, 115], [B, 115]]);
  s += M(620, 52, 'btn_pulse') + M(620, 84, '[2:0]');
  s += dot(555, 115) + wire([[555, 115], [555, 530], [B, 530]]);
  s += M(680, 144, '[0]', { size: 26 });
  s += M(665, 504, '[2:0]', { size: 26 });

  // mode
  s += wire([[B + BW, 115], [CC, 115]]);
  s += M(1155, 147, 'mode');
  s += dot(1110, 115) + wire([[1110, 115], [1110, 282], [CC, 282]]);
  s += gapV(1200, 109, 121) + line(1190, 115, 1210, 115);   // sw crosses over mode
  s += wire([[900, 170], [900, 250]]);
  s += M(915, 210, 'en_up/down', { anchor: 'start', size: 26 });
  s += wire([[1040, 392], [1040, 440]], { stroke: C.grey });
  s += M(1026, 410, 'active ← mode', { anchor: 'end', size: 26, color: C.grey });

  // count, stopwatch outputs
  s += wire([[B + BW, 330], [CC, 330]]) + M(1158, 305, 'count');
  s += wire([[B + BW, 560], [CC, 560]]) + M(1150, 535, 'BCD×4');
  s += wire([[B + BW, 640], [CC, 640]]) + M(1150, 615, 'dot');
  s += wire([[B + BW, 720], [CC, 720]]) + M(1150, 695, 'anim');

  // display_mux -> fnd
  s += wire([[1350, 760], [1350, 850]]);
  s += tr(1333, 805, [['d1000..d1, dp, anim', { mono: true }]], { size: F, monoSize: F, anchor: 'end' });
  // outputs
  s += wire([[CC + CW, 115], [1520, 115]]) + M(1530, 115, 'led[15:0]', { anchor: 'start' });
  s += wire([[1470, 900], [1520, 900]]) + M(1530, 900, 'an[3:0]', { anchor: 'start' });
  s += wire([[1470, 960], [1520, 960]]) + M(1530, 960, 'seg[7:0]', { anchor: 'start' });

  // tick (accent)
  const R = { stroke: C.red, sw: 3.5 };
  s += gapH(530, 604, 616);
  s += wire([[A + AW, 840], [610, 840]], { ...R, arrow: false }) + dot(610, 840, { fill: C.red, r: 6 });
  s += wire([[610, 840], [610, 305], [B, 305]], R);
  s += dot(610, 650, { fill: C.red, r: 6 }) + wire([[610, 650], [B, 650]], R);
  s += wire([[610, 840], [610, 930], [1110, 930]], R);
  s += M(570, 812, 'tick', { color: C.red, weight: 'bold' });
  s += t(860, 965, 'tick = 1 kHz enable 펄스 (클럭 아님)', { color: C.red, size: F });
  s += t(16, 990, 'clk, reset 은 모든 FF 에 연결 (생략)', { anchor: 'start', color: C.grey, size: 26 });
  return svgDoc(W, H, s);
};
