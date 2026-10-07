// Cree une session Stripe Checkout pour le panier Alaya.
// Regle de securite : le MONTANT vient du catalogue embarque ici, jamais du navigateur.
// Le navigateur n'envoie que des identifiants de piece et des options (texte). Seule la carte cadeau
// porte un montant choisi par l'acheteur, borne ci-dessous.
// Variables d'environnement : STRIPE_SECRET_KEY (obligatoire), ALAYA_ORIGINES (liste separee par des virgules).
const CATALOGUE = require('./catalogue.json');
const ORIGINES = (process.env.ALAYA_ORIGINES || 'https://alayafinejewelry.com,https://www.alayafinejewelry.com,https://raouf-hamouda.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);
const PAYS = ['FR', 'BE', 'CH', 'IT', 'LU', 'MC', 'DE', 'ES', 'NL', 'PT', 'AT', 'IE', 'GB', 'US', 'CA', 'AE', 'TN'];

function reponse(code, corps, origine) {
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Vary': 'Origin' };
  if (origine) { h['Access-Control-Allow-Origin'] = origine; h['Access-Control-Allow-Headers'] = 'Content-Type'; h['Access-Control-Allow-Methods'] = 'POST, OPTIONS'; }
  return { statusCode: code, headers: h, body: JSON.stringify(corps) };
}

// options de la piece (taille, monture, pierre) : du texte libre cote client, donc nettoye et borne
function propre(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, max); }

function lignesDepuis(panier, carte) {
  if (!Array.isArray(panier) || !panier.length) throw { code: 400, message: 'Le panier est vide.' };
  if (panier.length > 20) throw { code: 400, message: 'Trop de pièces dans le panier.' };
  return panier.map(l => {
    const slug = propre(l && l.slug, 80), piece = Object.prototype.hasOwnProperty.call(CATALOGUE, slug) ? CATALOGUE[slug] : null;
    if (!piece) throw { code: 400, message: 'Pièce inconnue : ' + slug };
    let centimes = piece.centimes;
    if (piece.libre) {
      const m = Math.round(Number(l.montant) * 100);
      if (!Number.isFinite(m) || m < piece.libre.min || m > piece.libre.max) throw { code: 400, message: 'Montant de carte cadeau hors limites.' };
      centimes = m;
    }
    if (!centimes) throw { code: 400, message: piece.nom + ' : prix sur demande, pas de paiement en ligne.' };
    return { nom: piece.nom, centimes, description: propre(l.options, 300) };
  });
}

exports.lignesDepuis = lignesDepuis;
exports.handler = async (event) => {
  const origine = event.headers && (event.headers.origin || event.headers.Origin);
  const permise = origine && ORIGINES.includes(origine) ? origine : null;
  if (event.httpMethod === 'OPTIONS') return reponse(permise ? 204 : 403, {}, permise);
  if (event.httpMethod !== 'POST') return reponse(405, { erreur: 'Méthode non permise.' }, permise);
  if (origine && !permise) return reponse(403, { erreur: 'Origine non permise.' }, null);
  const cle = process.env.STRIPE_SECRET_KEY;
  if (!cle) return reponse(500, { erreur: 'Paiement non configuré : la clé Stripe manque côté serveur.' }, permise);
  let d;
  try { d = JSON.parse(event.body || '{}'); } catch (e) { return reponse(400, { erreur: 'Demande illisible.' }, permise); }
  let lignes;
  try { lignes = lignesDepuis(d.panier); } catch (e) { return reponse(e.code || 400, { erreur: e.message || 'Panier refusé.' }, permise); }

  // l'adresse de retour doit etre chez nous
  const base = propre(d.retour, 300);
  if (!ORIGINES.some(o => base === o || base.startsWith(o + '/'))) return reponse(400, { erreur: 'Adresse de retour refusée.' }, permise);
  const racine = base.replace(/\/+$/, '');

  const p = new URLSearchParams();
  p.set('mode', 'payment');
  p.set('locale', ['fr', 'en', 'it'].includes(d.langue) ? d.langue : 'fr');
  p.set('success_url', racine + '/commande/index.html?paye=1&session={CHECKOUT_SESSION_ID}');
  p.set('cancel_url', racine + '/panier/index.html');
  p.set('billing_address_collection', 'auto');
  p.set('phone_number_collection[enabled]', 'true');
  PAYS.forEach((c, i) => p.set('shipping_address_collection[allowed_countries][' + i + ']', c));
  const mail = propre(d.email, 200);
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) p.set('customer_email', mail);
  p.set('metadata[cadeau]', d.cadeau ? 'oui' : 'non');
  p.set('metadata[telephone]', propre(d.tel, 40));
  lignes.forEach((l, i) => {
    const k = 'line_items[' + i + ']';
    p.set(k + '[quantity]', '1');
    p.set(k + '[price_data][currency]', 'eur');
    p.set(k + '[price_data][unit_amount]', String(l.centimes));
    p.set(k + '[price_data][product_data][name]', l.nom);
    if (l.description) p.set(k + '[price_data][product_data][description]', l.description);
  });

  let r, j;
  try {
    r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + cle, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: p.toString(),
    });
    j = await r.json();
  } catch (e) { return reponse(502, { erreur: 'Stripe ne répond pas.' }, permise); }
  if (!r.ok || !j.url) return reponse(502, { erreur: (j && j.error && j.error.message) || 'Stripe a refusé la demande.' }, permise);
  return reponse(200, { url: j.url }, permise);
};
