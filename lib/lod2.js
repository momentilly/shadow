// LoD2-Gebäude von Geobasis NRW laden und für Schattenlauf aufbereiten.
// Liefert Gebäude im Umkreis eines Punktes in lokalen Metern (x = Ost, z = Süd),
// bereits auf geografisch Nord gedreht.
import earcut from 'earcut';

const DEG = Math.PI / 180;
export const LOD2_BASE = 'https://www.opengeodata.nrw.de/produkte/geobasis/3dg/lod2_gml/lod2_gml/';

export function utm32(lat, lon) {
  const a = 6378137, f = 1 / 298.257222101, e2 = f * (2 - f), k0 = 0.9996;
  const phi = lat * DEG, lam = (lon - 9) * DEG, sn = Math.sin(phi), cs = Math.cos(phi), tn = Math.tan(phi);
  const N = a / Math.sqrt(1 - e2 * sn * sn), T2 = tn * tn, ep2 = e2 / (1 - e2), C = ep2 * cs * cs, A = lam * cs;
  const M = a * ((1 - e2 / 4 - 3 * e2 * e2 / 64 - 5 * e2 ** 3 / 256) * phi - (3 * e2 / 8 + 3 * e2 * e2 / 32 + 45 * e2 ** 3 / 1024) * Math.sin(2 * phi) + (15 * e2 * e2 / 256 + 45 * e2 ** 3 / 1024) * Math.sin(4 * phi) - (35 * e2 ** 3 / 3072) * Math.sin(6 * phi));
  return {
    E: k0 * N * (A + (1 - T2 + C) * A ** 3 / 6 + (5 - 18 * T2 + T2 * T2 + 72 * C - 58 * ep2) * A ** 5 / 120) + 500000,
    N: k0 * (M + N * tn * (A * A / 2 + (5 - T2 + 9 * C + 4 * C * C) * A ** 4 / 24 + (61 - 58 * T2 + T2 * T2 + 600 * C - 330 * ep2) * A ** 6 / 720)),
  };
}
export const gridConv = (lat, lon) => Math.atan(Math.tan((lon - 9) * DEG) * Math.sin(lat * DEG));

export function tilesFor(E, N, r) {
  const out = [];
  for (let e = Math.floor((E - r) / 1000); e <= Math.floor((E + r) / 1000); e++)
    for (let n = Math.floor((N - r) / 1000); n <= Math.floor((N + r) / 1000); n++)
      out.push(`LoD2_32_${e}_${n}_1_NW.gml`);
  return out;
}

function newell(pts) {
  let nx = 0, ny = 0, nz = 0; const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    nx += (a[1] - b[1]) * (a[2] + b[2]); ny += (a[2] - b[2]) * (a[0] + b[0]); nz += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [nx, ny, nz];
}
function triIdx(pts) {
  const n = pts.length; if (n < 3) return []; if (n === 3) return [0, 1, 2];
  const [nx, ny, nz] = newell(pts), ax = Math.abs(nx), ay = Math.abs(ny), az = Math.abs(nz);
  const flat = [];
  for (const p of pts) {
    if (ax >= ay && ax >= az) flat.push(p[1], p[2]);
    else if (ay >= az) flat.push(p[0], p[2]);
    else flat.push(p[0], p[1]);
  }
  try { return earcut(flat); } catch { return []; }
}
function pip(x, z, poly) {
  let ins = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if (((a[2] > z) !== (b[2] > z)) && (x < (b[0] - a[0]) * (z - a[2]) / (b[2] - a[2]) + a[0])) ins = !ins;
  }
  return ins;
}

function parseMember(chunk, E0, N0, radius, rot) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  chunk = chunk.replace(/<gml:interior>[\s\S]*?<\/gml:interior>/g, '');
  const surf = [], re = /<bldg:(RoofSurface|WallSurface|GroundSurface)\b[\s\S]*?<\/bldg:\1>/g; let m;
  while ((m = re.exec(chunk))) {
    const kind = m[1], pl = /<gml:posList[^>]*>([^<]+)<\/gml:posList>/g; let q;
    while ((q = pl.exec(m[0]))) {
      const v = q[1].trim().split(/\s+/).map(Number), pts = [];
      for (let i = 0; i + 2 < v.length; i += 3) { const e = v[i] - E0, n = v[i + 1] - N0; pts.push([e * ca - n * sa, v[i + 2], -(e * sa + n * ca)]); }
      if (pts.length > 3) { const f = pts[0], l = pts[pts.length - 1]; if (f[0] === l[0] && f[1] === l[1] && f[2] === l[2]) pts.pop(); }
      if (pts.length >= 3) surf.push({ kind, pts });
    }
  }
  if (!surf.length) return null;
  let gmin = Infinity, amin = Infinity, cx = 0, cz = 0, cn = 0, dmin = Infinity;
  for (const sf of surf) for (const pt of sf.pts) {
    amin = Math.min(amin, pt[1]); dmin = Math.min(dmin, Math.hypot(pt[0], pt[2]));
    if (sf.kind === 'GroundSurface') { gmin = Math.min(gmin, pt[1]); cx += pt[0]; cz += pt[2]; cn++; }
  }
  if (dmin > radius) return null;
  const base = isFinite(gmin) ? gmin : amin;
  if (!cn) for (const sf of surf) for (const pt of sf.pts) { cx += pt[0]; cz += pt[2]; cn++; }
  cx = Math.round(cx / cn * 10) / 10; cz = Math.round(cz / cn * 10) / 10;
  const walls = [], roofs = [], flats = [], r2 = v => Math.round(v * 100) / 100; let h = 0, own = false;
  for (const sf of surf) {
    if (sf.kind === 'GroundSurface') { if (pip(0, 0, sf.pts)) own = true; continue; }
    const loc = sf.pts.map(pt => [pt[0] - cx, pt[1] - base, pt[2] - cz]); for (const pt of loc) h = Math.max(h, pt[1]);
    let target = walls;
    if (sf.kind === 'RoofSurface') { const [nx, ny, nz] = newell(loc); target = Math.abs(ny) / (Math.hypot(nx, ny, nz) || 1) > 0.97 ? flats : roofs; }
    for (const i of triIdx(loc)) target.push(r2(loc[i][0]), r2(loc[i][1]), r2(loc[i][2]));
  }
  const nm = /<xal:ThoroughfareName>([^<]+)</.exec(chunk), nr = /<xal:ThoroughfareNumber>([^<]+)</.exec(chunk), id = /gml:id="([^"]+)"/.exec(chunk);
  return {
    type: 'lod2', name: nm ? (nm[1] + (nr ? ' ' + nr[1] : '')) : 'Gebäude ohne Adresse',
    x: cx, z: cz, h: Math.round(h * 10) / 10, base: Math.round(base * 100) / 100, own, walls, roofs, flats, gid: id ? id[1] : '', vis: true,
  };
}

export function parseLoD2(text, E0, N0, radius, rot) {
  const out = []; let pos = 0;
  for (;;) {
    const st = text.indexOf('<core:cityObjectMember', pos); if (st < 0) break;
    const en = text.indexOf('</core:cityObjectMember>', st); if (en < 0) break; pos = en + 24;
    const p0 = /<gml:posList[^>]*>\s*([\d.]+)\s+([\d.]+)/.exec(text.slice(st, Math.min(en, st + 20000)));
    if (p0 && Math.hypot(+p0[1] - E0, +p0[2] - N0) > radius + 80) continue;
    const b = parseMember(text.slice(st, en), E0, N0, radius, rot); if (b) out.push(b);
  }
  return out;
}

export async function loadBuildings(lat, lon, radius) {
  const u = utm32(lat, lon), rot = -gridConv(lat, lon), tiles = tilesFor(u.E, u.N, radius);
  const texts = await Promise.all(tiles.map(async name => {
    const r = await fetch(LOD2_BASE + name);
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`Geobasis NRW antwortet mit Fehler ${r.status}.`);
    return r.text();
  }));
  const seen = new Set(), buildings = [];
  for (const t of texts) {
    if (!t) continue;
    for (const b of parseLoD2(t, u.E, u.N, radius, rot)) {
      if (b.gid && seen.has(b.gid)) continue; seen.add(b.gid); buildings.push(b);
    }
  }
  return { tiles, found: texts.filter(Boolean).length, buildings };
}
