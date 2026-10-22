// Shared drawing helpers for the hand-written SVG diagrams.
// Every diagram uses the same palette, stroke width, font sizes and arrowheads.
const C = { ink: '#222', red: '#C8102E', grey: '#8A8F98', light: '#E6E7EA', paper: '#FFFFFF' };
const KO = "Apple SD Gothic Neo, Malgun Gothic, sans-serif";
const MONO = "Menlo, Consolas, monospace";
const FS = { label: 17, small: 14.5, mono: 15.5, big: 20 };

function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }

// rough text width: Hangul 1.0em, latin 0.55em (mono 0.6em), space 0.3em
function measure(str, size, mono) {
  let w = 0;
  for (const ch of String(str)) {
    const c = ch.codePointAt(0);
    if (c >= 0x1100 && (c <= 0x11ff || (c >= 0x3000 && c <= 0x9fff) || (c >= 0xac00 && c <= 0xd7af))) w += 1.0;
    else if (mono) w += 0.6;
    else if (ch === ' ') w += 0.3;
    else if ('ilI.,:;|!\'()[]'.includes(ch)) w += 0.32;
    else if ('mwMW'.includes(ch)) w += 0.85;
    else if (c > 0x2000) w += 0.9;
    else w += 0.56;
  }
  return w * size;
}

// t(x,y,str,{size,anchor,mono,color,weight,base})  y = baseline unless base:'middle'
function t(x, y, str, o = {}) {
  const size = o.size || (o.mono ? FS.mono : FS.label);
  const fam = o.mono ? MONO : KO;
  const anchor = o.anchor || 'middle';
  const col = o.color || C.ink;
  const dy = o.mid === false ? 0 : size * 0.35; // vertically centre on y by default
  const w = o.weight ? ` font-weight="${o.weight}"` : '';
  const st = o.italic ? ' font-style="italic"' : '';
  return `<text x="${x}" y="${(y + dy).toFixed(1)}" font-family="${fam}" font-size="${size}" fill="${col}" text-anchor="${anchor}"${w}${st}>${esc(str)}</text>`;
}
// mixed runs on one line: runs = [[str,{mono,color,weight}],...]; one <text> with tspans,
// so the renderer measures widths itself and anchoring applies to the whole line
function tr(x, y, runs, o = {}) {
  const size = o.size || FS.label;
  const anchor = o.anchor || 'middle';
  const msize = o.monoSize || +(size * 0.93).toFixed(1);
  let inner = runs.map(([str, ro = {}]) => {
    const fam = ro.mono ? MONO : KO;
    const fs = ro.mono ? msize : size;
    const col = ro.color || o.color || C.ink;
    const w = (ro.weight || o.weight) ? ` font-weight="${ro.weight || o.weight}"` : '';
    return `<tspan font-family="${fam}" font-size="${fs}" fill="${col}"${w}>${esc(str)}</tspan>`;
  }).join('');
  return `<text x="${x}" y="${(y + size * 0.35).toFixed(1)}" text-anchor="${anchor}" xml:space="preserve">${inner}</text>`;
}
function rect(x, y, w, h, o = {}) {
  const sw = o.sw || 2;
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
  const r = o.r ? ` rx="${o.r}"` : '';
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${o.fill || 'none'}" stroke="${o.stroke || C.ink}" stroke-width="${sw}"${dash}${r}/>`;
}
function line(x1, y1, x2, y2, o = {}) {
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${o.stroke || C.ink}" stroke-width="${o.sw || 2}"${dash}/>`;
}
// poly-line wire; arrow at end unless o.arrow===false. points = [[x,y],...]
function wire(pts, o = {}) {
  const col = o.stroke || C.ink;
  const sw = o.sw || 2;
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
  let p = pts.map(q => q.slice());
  let head = '';
  if (o.arrow !== false) {
    const [xa, ya] = p[p.length - 2], [xb, yb] = p[p.length - 1];
    const L = Math.hypot(xb - xa, yb - ya), ux = (xb - xa) / L, uy = (yb - ya) / L;
    const AL = 12, AW = 5.5;
    // shorten the shaft so it does not poke through the head
    p[p.length - 1] = [xb - ux * (AL - 2), yb - uy * (AL - 2)];
    const bx = xb - ux * AL, by = yb - uy * AL;
    head = `<path d="M${xb},${yb} L${(bx - uy * AW).toFixed(2)},${(by + ux * AW).toFixed(2)} L${(bx + uy * AW).toFixed(2)},${(by - ux * AW).toFixed(2)} Z" fill="${col}" stroke="none"/>`;
  }
  if (o.startArrow) {
    const [xb, yb] = pts[0], [xa, ya] = pts[1];
    const L = Math.hypot(xb - xa, yb - ya), ux = (xb - xa) / L, uy = (yb - ya) / L;
    const AL = 12, AW = 5.5; p[0] = [xb - ux * (AL - 2), yb - uy * (AL - 2)];
    const bx = xb - ux * AL, by = yb - uy * AL;
    head += `<path d="M${xb},${yb} L${(bx - uy * AW).toFixed(2)},${(by + ux * AW).toFixed(2)} L${(bx + uy * AW).toFixed(2)},${(by - ux * AW).toFixed(2)} Z" fill="${col}" stroke="none"/>`;
  }
  const d = 'M' + p.map(q => q.map(v => +v.toFixed(2)).join(',')).join(' L');
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-linejoin="miter"${dash}/>` + head;
}
// arrow along an arbitrary path 'd' with explicit end tangent (for curves)
function curve(d, end, dir, o = {}) {
  const col = o.stroke || C.ink;
  const [xb, yb] = end; const [ux, uy] = dir; const L = Math.hypot(ux, uy); const vx = ux / L, vy = uy / L;
  const AL = 12, AW = 5.5; const bx = xb - vx * AL, by = yb - vy * AL;
  const head = o.arrow === false ? '' : `<path d="M${xb},${yb} L${(bx - vy * AW).toFixed(2)},${(by + vx * AW).toFixed(2)} L${(bx + vy * AW).toFixed(2)},${(by - vx * AW).toFixed(2)} Z" fill="${col}"/>`;
  const dash = o.dash ? ` stroke-dasharray="${o.dash}"` : '';
  return `<path d="${d}" fill="none" stroke="${col}" stroke-width="${o.sw || 2}"${dash}/>` + head;
}
function dot(x, y, o = {}) { return `<circle cx="${x}" cy="${y}" r="${o.r || 4}" fill="${o.fill || C.ink}"/>`; }
// small white plate behind a label so it can sit near a line without touching it
function plate(x, y, w, h) { return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" fill="${C.paper}" stroke="none"/>`; }
// D flip-flop symbol: box with D / Q / clock triangle. returns {svg, d:[x,y], q:[x,y], clk:[x,y]}
function dff(x, y, o = {}) {
  const w = o.w || 70, h = o.h || 90, col = o.stroke || C.ink, p = o.pin || 15;
  const dy = Math.max(26, p + 12), tri = Math.max(8, p * 0.55);
  let s = rect(x, y, w, h, { stroke: col, fill: o.fill || C.paper });
  s += t(x + 8, y + dy, 'D', { mono: true, anchor: 'start', size: p, color: col });
  s += t(x + w - 8, y + dy, 'Q', { mono: true, anchor: 'end', size: p, color: col });
  const cy = y + h - Math.max(22, p);
  s += `<path d="M${x},${cy - tri} L${x + tri * 1.6},${cy} L${x},${cy + tri}" fill="none" stroke="${col}" stroke-width="2"/>`;
  if (o.label) s += t(x + w / 2, y + h + 18, o.label, { mono: o.labelMono !== false, size: o.labelSize || 14.5, color: o.labelColor || col });
  return { svg: s, d: [x, y + dy], q: [x + w, y + dy], clk: [x, cy], w, h };
}
function svgDoc(w, h, body) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n<rect x="0" y="0" width="${w}" height="${h}" fill="#FFFFFF"/>\n${body}\n</svg>\n`;
}
module.exports = { C, KO, MONO, FS, esc, measure, t, tr, rect, line, wire, curve, dot, plate, dff, svgDoc };
// AND gate, left edge x, centre y, half-height 40. returns {svg, a:[x,y-30], b:[x,y+30], out:[x+80,y]}
function andGate(x, y, o = {}) {
  const col = o.stroke || C.ink, h = o.h || 40;
  const svg = `<path d="M${x},${y - h} L${x + h},${y - h} A${h},${h} 0 0 1 ${x + h},${y + h} L${x},${y + h} Z" fill="#fff" stroke="${col}" stroke-width="2"/>`;
  return { svg, a: [x, y - h * 0.75], b: [x, y + h * 0.75], out: [x + 2 * h, y] };
}
// OR gate
function orGate(x, y, o = {}) {
  const col = o.stroke || C.ink, h = o.h || 40;
  const svg = `<path d="M${x},${y - h} Q${x + h * 1.3},${y - h} ${x + h * 2.1},${y} Q${x + h * 1.3},${y + h} ${x},${y + h} Q${x + h * 0.45},${y} ${x},${y - h} Z" fill="#fff" stroke="${col}" stroke-width="2"/>`;
  return { svg, a: [x + h * 0.25, y - h * 0.6], b: [x + h * 0.25, y + h * 0.6], out: [x + h * 2.1, y] };
}
// buffer / inverter triangle pointing right, left edge x, centre y
function bufGate(x, y, o = {}) {
  const col = o.stroke || C.ink, h = o.h || 22, w = h * 1.6;
  let svg = `<path d="M${x},${y - h} L${x + w},${y} L${x},${y + h} Z" fill="#fff" stroke="${col}" stroke-width="2"/>`;
  let out = x + w;
  if (o.invert) { svg += `<circle cx="${x + w + 6}" cy="${y}" r="6" fill="#fff" stroke="${col}" stroke-width="2"/>`; out += 12; }
  return { svg, in: [x, y], out: [out, y] };
}
module.exports.andGate = andGate; module.exports.orGate = orGate; module.exports.bufGate = bufGate;

// ---------------------------------------------------------------------------
// Timing-diagram renderer for a WaveDrom-compatible subset (signal/wave/data/node).
// Supported wave chars: p (clock), 0, 1, x, =, '.' (continue). {} = spacer lane.
// o: {x0 (wave start x), y0 (top), cw (cycle width), lh (lane height), gap (spacer height)}
// returns {svg, X(k), lane(i)->{top,hi,lo,mid}, node(ch)->[x,y], right, bottom}
function timing(spec, o = {}) {
  const x0 = o.x0 || 160, y0 = o.y0 || 40, cw = o.cw || 80, lh = o.lh || 58, gap = o.gap || 22;
  const amp = o.amp || 30;
  const X = k => x0 + k * cw;
  let svg = '', y = y0;
  const lanes = [], nodes = {};
  const n = Math.max(...spec.signal.filter(s => s.wave).map(s => s.wave.length));
  const laneTops = [];
  spec.signal.forEach(sig => { if (!sig.wave) { laneTops.push(null); y += gap; return; } laneTops.push(y); y += lh; });
  const bottom = y;
  // grid at every clock rising edge
  if (o.grid !== false) for (let k = 0; k <= n; k++) svg += `<line x1="${X(k)}" y1="${y0 - 6}" x2="${X(k)}" y2="${bottom - 6}" stroke="#D9DBDF" stroke-width="1" stroke-dasharray="3 4"/>`;
  spec.signal.forEach((sig, i) => {
    const top = laneTops[i];
    if (top == null) { lanes.push(null); return; }
    const hi = top + (lh - amp) / 2 - 4, lo = hi + amp, mid = (hi + lo) / 2;
    lanes.push({ top, hi, lo, mid });
    const col = sig.accent ? C.red : sig.clock || sig.wave[0] === 'p' ? C.grey : C.ink;
    const sw = sig.accent ? 2.5 : 2;
    svg += t(x0 - 18, mid, sig.name, { mono: true, anchor: 'end', size: o.nameSize || 16, color: sig.labelColor || (sig.wave[0] === 'p' ? C.grey : C.ink) });
    // expand wave into per-cycle symbols with segment starts
    const cells = []; let prev = 'x';
    for (let k = 0; k < n; k++) {
      const ch = sig.wave[k] || '.';
      if (ch === '.') cells.push({ v: prev, start: false }); else { cells.push({ v: ch, start: true }); prev = ch; }
    }
    if (cells[0].v === 'p') {
      let d = `M${X(0)},${lo}`;
      for (let k = 0; k < n; k++) d += ` L${X(k)},${lo} L${X(k)},${hi} L${X(k) + cw / 2},${hi} L${X(k) + cw / 2},${lo}`;
      d += ` L${X(n)},${lo}`;
      svg += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
      // small rising-edge ticks are implied by the grid
    } else {
      // bit runs and data runs
      const lvl = v => v === '1' ? hi : lo;
      let d = '', di = 0, k = 0;
      while (k < n) {
        let e = k + 1; while (e < n && !cells[e].start) e++;
        const v = cells[k].v, xs = X(k), xe = X(e);
        if (v === '0' || v === '1') {
          const yv = lvl(v);
          d += (d ? ` L${xs},${yv}` : `M${xs},${yv}`) + ` L${xe},${yv}`;
        } else {
          if (d) { svg += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}"/>`; d = ''; }
          const s = sig.slope != null ? sig.slope : (o.slope || 7), ls = k === 0 ? 0 : s, rs = e === n ? 0 : s;
          const fill = v === 'x' ? '#E6E7EA' : (sig.fills && sig.fills[di]) || '#fff';
          const scol = (sig.hl && sig.hl.includes(di)) ? C.red : col;
          svg += `<path d="M${xs},${mid} L${xs + ls},${hi} L${xe - rs},${hi} L${xe},${mid} L${xe - rs},${lo} L${xs + ls},${lo} Z" fill="${fill}" stroke="${scol}" stroke-width="${sw}" stroke-linejoin="miter"/>`;
          if (v === '=') {
            const txt = (sig.data || [])[di];
            if (txt != null && txt !== '') svg += t((xs + xe) / 2, mid, txt, { mono: true, size: sig.dataSize || o.dataSize || 16, color: (sig.hl && sig.hl.includes(di)) ? C.red : C.ink, weight: (sig.hl && sig.hl.includes(di)) ? 'bold' : null });
            di++;
          }
          // next bit run starts from the data's mid line
          if (e < n && (cells[e].v === '0' || cells[e].v === '1')) d = `M${xe},${mid}`;
        }
        k = e;
      }
      if (d) svg += `<path d="${d}" fill="none" stroke="${col}" stroke-width="${sw}"/>`;
    }
    if (sig.node) [...sig.node].forEach((ch, k) => { if (ch !== '.') nodes[ch] = [X(k), mid]; });
  });
  return { svg, X, lanes, node: ch => nodes[ch], right: X(n), bottom, n };
}
module.exports.timing = timing;
