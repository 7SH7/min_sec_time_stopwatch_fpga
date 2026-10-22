const { C, t, tr, wire, curve, dot, svgDoc, FS } = require('./lib');
module.exports = () => {
  const W = 1100, H = 860, R = 98;
  const S = { STOP: [270, 600], RUN: [550, 235], ANIM: [830, 600] };
  let s = '';
  // straight transition between two circles, offset perpendicular by off
  const edge = (a, b, off, o = {}) => {
    const [x1, y1] = S[a], [x2, y2] = S[b];
    const L = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / L, uy = (y2 - y1) / L;
    const nx = -uy, ny = ux;
    const k = Math.sqrt(R * R - off * off) + 4;
    const p1 = [x1 + nx * off + ux * k, y1 + ny * off + uy * k];
    const p2 = [x2 + nx * off - ux * k, y2 + ny * off - uy * k];
    return wire([p1, p2], o);
  };
  const red = { stroke: C.red, sw: 2.5 };
  // edges
  s += edge('STOP', 'RUN', -14);           // STOP -> RUN (outer side)
  s += edge('RUN', 'STOP', -14);           // RUN -> STOP (inner side, offset flips with direction)
  s += edge('ANIM', 'RUN', 0);
  s += edge('STOP', 'ANIM', -14, red);     // upper line (screen) : y - 14
  s += edge('ANIM', 'STOP', -14);          // lower line
  // labels
  const M = { mono: true };
  s += t(372, 386, 'btn_run', { mono: true, anchor: 'end', size: 21 });             // outer (left-up) of STOP->RUN
  s += t(424, 452, 'btn_run', { mono: true, anchor: 'start', size: 21 });           // inner side, RUN->STOP
  s += t(700, 392, 'btn_run', { mono: true, anchor: 'start', size: 21 });
  s += tr(550, 560, [['idle 5초 ', { color: C.red }], ['(active)', { mono: true, color: C.red }]], { size: 22, monoSize: 21 });
  s += tr(550, 645, [['btn_clear', { mono: true }], [' 또는 모드 이탈', {}]], { size: 22, monoSize: 21 });
  // self loops
  // STOP: bottom loop
  {
    const [cx, cy] = S.STOP, a1 = (110) * Math.PI / 180, a2 = (70) * Math.PI / 180;
    const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + (R + 4) * Math.cos(a2), cy + (R + 4) * Math.sin(a2)];
    const d = `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} C${cx - 75},${cy + 200} ${cx + 75},${cy + 200} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    s += curve(d, p2, [p2[0] - (cx + 75), p2[1] - (cy + 200)]);
    s += tr(cx, cy + 192, [['btn_clear', { mono: true }], [' → ', {}], ['00:00', { mono: true }]], { size: 22, monoSize: 21 });
  }
  // RUN: top loop
  {
    const [cx, cy] = S.RUN, a1 = (-110) * Math.PI / 180, a2 = (-70) * Math.PI / 180;
    const p1 = [cx + R * Math.cos(a1), cy + R * Math.sin(a1)], p2 = [cx + (R + 4) * Math.cos(a2), cy + (R + 4) * Math.sin(a2)];
    const d = `M${p1[0].toFixed(1)},${p1[1].toFixed(1)} C${cx - 75},${cy - 200} ${cx + 75},${cy - 200} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
    s += curve(d, p2, [p2[0] - (cx + 75), p2[1] - (cy - 200)]);
    s += tr(cx, cy - 192, [['btn_clear', { mono: true }], [' 무시', {}]], { size: 22, monoSize: 21 });
  }
  // initial
  s += dot(80, 600, { r: 7 }) + wire([[80, 600], [S.STOP[0] - R - 2, 600]]);
  s += t(118, 574, 'reset', { mono: true, size: 20, color: C.grey });
  // states
  const state = (name, lines) => {
    const [cx, cy] = S[name];
    let g = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="#fff" stroke="${C.ink}" stroke-width="2.5"/>`;
    g += t(cx, cy - (lines.length > 1 ? 30 : 20), name, { mono: true, weight: 'bold', size: 27 });
    lines.forEach((l, i) => { g += t(cx, cy + (lines.length > 1 ? 10 : 18) + i * 28, l, { size: 20 }); });
    return g;
  };
  s += state('STOP', ['dot=1, 값 유지']);
  s += state('RUN', ['카운트,', 'dot 0.5s 깜박']);
  s += state('ANIM', ['a→f 회전, dot=0']);
  return svgDoc(W, H, s);
};
