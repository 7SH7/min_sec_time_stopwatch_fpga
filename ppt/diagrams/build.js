// node diagrams/build.js [stem ...]   (run from ppt/)
// JS sources in diagrams/src/<stem>.js export () => svgString; written to diagrams/<stem>.svg
// WaveDrom sources diagrams/<stem>.json are rendered with wavedrom-cli, then restyled.
const fs = require('fs'), path = require('path'), sharp = require('sharp');
const { execFileSync } = require('child_process');
const D = __dirname, A = path.join(D, '..', 'assets');
const want = process.argv.slice(2);
const TARGET = 3000; // px on the long side
async function raster(svgPath, stem) {
  // render big, trim the white border, add a uniform ~2.5% margin, scale to TARGET on the long side
  const svg = fs.readFileSync(svgPath, 'utf8');
  const m = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const w = +m[1], h = +m[2];
  const density = 72 * TARGET * 1.1 / Math.max(w, h);
  const big = await sharp(Buffer.from(svg), { density }).flatten({ background: '#ffffff' }).png().toBuffer();
  const trimmed = await sharp(big).trim({ background: '#ffffff', threshold: 10 }).toBuffer({ resolveWithObject: true });
  const tw = trimmed.info.width, th = trimmed.info.height;
  const pad = Math.round(Math.max(tw, th) * 0.025);
  const framed = await sharp(trimmed.data).extend({ top: pad, bottom: pad, left: pad, right: pad, background: '#ffffff' }).png().toBuffer();
  const long = Math.max(tw, th) + 2 * pad;
  const info = await sharp(framed).resize(Math.round((tw + 2 * pad) * TARGET / long), Math.round((th + 2 * pad) * TARGET / long)).png().toFile(path.join(A, stem + '.png'));
  // effective scale: how many final px per SVG unit, and the canvas width the content really uses
  console.log(stem, info.width + 'x' + info.height, 'used-width(svg units)=' + (tw / (density / 72)).toFixed(0));
}
function restyleWave(svg, accent) {
  svg = svg.replace(/font-family:Helvetica/g, "font-family:Menlo, Consolas, monospace")
           .replace(/stroke:#000/g, 'stroke:#222').replace(/fill:#000/g, 'fill:#222')
           .replace(/stroke:#00f/g, 'stroke:#222').replace(/fill:#00f/g, 'fill:#222')
           .replace(/fill:#0041c4/g, 'fill:#222').replace(/stroke:#0041c4/g, 'stroke:#222')
           .replace(/stroke:#0000ff/gi, 'stroke:#222').replace(/fill:#0000ff/gi, 'fill:#222');
  return accent ? accent(svg) : svg;
}
(async () => {
  const stems = new Set();
  for (const f of fs.readdirSync(path.join(D, 'src'))) if (f.endsWith('.js') && f !== 'lib.js' && !f.includes('.post')) stems.add(f.slice(0, -3));
  for (const f of fs.readdirSync(D)) if (f.endsWith('.json')) stems.add(f.slice(0, -5));
  for (const stem of stems) {
    if (want.length && !want.includes(stem)) continue;
    const js = path.join(D, 'src', stem + '.js');
    const out = path.join(D, stem + '.svg');
    if (fs.existsSync(js)) {
      delete require.cache[require.resolve(js)];
      fs.writeFileSync(out, require(js)());
    } else {
      const raw = path.join(D, stem + '.raw.svg');
      execFileSync(path.join(D, '..', 'node_modules', '.bin', 'wavedrom-cli'), ['-i', path.join(D, stem + '.json'), '-s', raw]);
      const post = path.join(D, 'src', stem + '.post.js');
      const accent = fs.existsSync(post) ? require(post) : null;
      fs.writeFileSync(out, restyleWave(fs.readFileSync(raw, 'utf8'), accent));
      fs.unlinkSync(raw);
    }
    await raster(out, stem);
  }
})();
