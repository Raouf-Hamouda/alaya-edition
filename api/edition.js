/* Mode edition du site : garde, par page, les textes et tailles modifies dans un fichier du Blob Vercel.
   GET  /api/edition?p=/chemin/   -> {"t":{chemin:html}, "i":{chemin:[l,h]}, "quand":iso}
   POST /api/edition  {p, t, i, quand} -> remplace ce qui est garde pour cette page
   ponytail: derniere ecriture gagne par page, pas de fusion entre deux personnes qui editent la meme page a la fois. */
import { put, get } from '@vercel/blob';

const VIDE = { t: {}, i: {}, quand: '' };
const nom = p => 'edition/' + p.replace(/[^\w.-]/g, '_') + '.json';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const p = String((req.method === 'GET' ? req.query.p : req.body && req.body.p) || '');
  if (!/^\/[\w.\/-]{0,200}$/.test(p)) return res.status(400).json({ ok: false, raison: 'page' });

  if (req.method === 'GET') {
    const r = await get(nom(p), { access: 'public', useCache: false });
    if (!r || r.statusCode !== 200) return res.json(VIDE);
    return res.send(await new Response(r.stream).text());
  }
  if (req.method === 'POST') {
    const d = req.body || {};
    const t = {}, i = {};
    for (const [k, v] of Object.entries(d.t || {})) if (/^[\d.]*$/.test(k) && typeof v === 'string') t[k] = v;
    for (const [k, v] of Object.entries(d.i || {})) if (/^[\d.]*$/.test(k) && Array.isArray(v) && v.length === 2 && v.every(Number.isFinite)) i[k] = v.map(Math.round);
    const corps = JSON.stringify({ t, i, quand: new Date().toISOString() });
    if (corps.length > 500000) return res.status(413).json({ ok: false, raison: 'taille' });
    await put(nom(p), corps, { access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json' });
    return res.json({ ok: true, n: Object.keys(t).length + Object.keys(i).length });
  }
  res.status(405).json({ ok: false });
}
