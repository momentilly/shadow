import { loadBuildings } from '../lib/lod2.js';

// GET /api/lod2?lat=50.94&lon=6.96&r=150
export default async function handler(req, res) {
  const lat = parseFloat(req.query.lat), lon = parseFloat(req.query.lon);
  const r = Math.min(Math.max(parseFloat(req.query.r) || 150, 30), 250);
  if (!isFinite(lat) || !isFinite(lon)) return res.status(400).json({ error: 'Breiten- und Längengrad fehlen.' });
  if (lat < 50.3 || lat > 52.6 || lon < 5.8 || lon > 9.5) {
    return res.status(422).json({ error: 'LoD2-Daten gibt es hier nur für Nordrhein-Westfalen.', outside: true });
  }
  try {
    const out = await loadBuildings(lat, lon, r);
    if (!out.found) return res.status(422).json({ error: 'Für diesen Standort gibt es keine LoD2-Kachel von Geobasis NRW.', outside: true });
    res.setHeader('Cache-Control', 'public, s-maxage=604800, stale-while-revalidate=86400');
    res.status(200).json({ source: 'Geobasis NRW, dl-de/zero-2-0', radius: r, buildings: out.buildings });
  } catch (e) {
    res.status(502).json({ error: e.message || 'Die Gebäudedaten konnten nicht geladen werden.' });
  }
}
