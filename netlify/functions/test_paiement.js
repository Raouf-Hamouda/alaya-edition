// node netlify/functions/test_paiement.js : verifie la fonction sans toucher Stripe (fetch simule).
const assert = require('assert');
process.env.STRIPE_SECRET_KEY = 'sk_test_simulee';
const f = require('./creer-paiement.js'), CAT = require('./catalogue.json');
let envoi = null;
global.fetch = async (url, o) => { envoi = { url, o, p: new URLSearchParams(o.body) }; return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/c/pay/simulee' }) }; };
const appel = (corps, origine = 'https://alayafinejewelry.com', methode = 'POST') => f.handler({ httpMethod: methode, headers: { origin: origine }, body: JSON.stringify(corps) });
(async () => {
  let r;
  // 1. un panier normal : le montant vient du catalogue
  r = await appel({ panier: [{ slug: 'bague-carmen', options: 'Or blanc, taille 52' }], retour: 'https://alayafinejewelry.com', email: 'a@b.fr' });
  assert.strictEqual(r.statusCode, 200); assert.strictEqual(JSON.parse(r.body).url.startsWith('https://checkout.stripe.com/'), true);
  assert.strictEqual(envoi.p.get('line_items[0][price_data][unit_amount]'), String(CAT['bague-carmen'].centimes));
  assert.strictEqual(envoi.p.get('line_items[0][price_data][currency]'), 'eur');
  assert.strictEqual(envoi.o.headers.Authorization, 'Bearer sk_test_simulee');
  assert.strictEqual(envoi.p.get('customer_email'), 'a@b.fr');
  // 2. un prix envoye par le navigateur est ignore
  r = await appel({ panier: [{ slug: 'bague-zoe', prix: 1, centimes: 100, montant: 1 }], retour: 'https://alayafinejewelry.com' });
  assert.strictEqual(r.statusCode, 200); assert.strictEqual(envoi.p.get('line_items[0][price_data][unit_amount]'), String(CAT['bague-zoe'].centimes));
  // 3. piece inconnue, piece a prix sur demande, panier vide
  assert.strictEqual((await appel({ panier: [{ slug: 'nexiste-pas' }], retour: 'https://alayafinejewelry.com' })).statusCode, 400);
  assert.strictEqual((await appel({ panier: [{ slug: '__proto__' }], retour: 'https://alayafinejewelry.com' })).statusCode, 400);
  const surDemande = Object.keys(CAT).find(k => !CAT[k].centimes && !CAT[k].libre);
  assert.strictEqual((await appel({ panier: [{ slug: surDemande }], retour: 'https://alayafinejewelry.com' })).statusCode, 400);
  assert.strictEqual((await appel({ panier: [], retour: 'https://alayafinejewelry.com' })).statusCode, 400);
  // 4. carte cadeau : montant libre mais borne
  r = await appel({ panier: [{ slug: 'carte-cadeaux', montant: 500 }], retour: 'https://alayafinejewelry.com' });
  assert.strictEqual(r.statusCode, 200); assert.strictEqual(envoi.p.get('line_items[0][price_data][unit_amount]'), '50000');
  for (const m of [1, 49.99, 10001, -500, 'abc', null]) assert.strictEqual((await appel({ panier: [{ slug: 'carte-cadeaux', montant: m }], retour: 'https://alayafinejewelry.com' })).statusCode, 400, 'montant ' + m);
  // 5. origine et adresse de retour
  assert.strictEqual((await appel({ panier: [{ slug: 'bague-carmen' }], retour: 'https://alayafinejewelry.com' }, 'https://voleur.example')).statusCode, 403);
  assert.strictEqual((await appel({ panier: [{ slug: 'bague-carmen' }], retour: 'https://voleur.example' })).statusCode, 400);
  assert.strictEqual((await appel({ panier: [{ slug: 'bague-carmen' }], retour: 'https://alayafinejewelry.com.voleur.example' })).statusCode, 400);
  r = await appel({ panier: [{ slug: 'bague-carmen' }], retour: 'https://raouf-hamouda.github.io/alaya-fine-jewelry' }, 'https://raouf-hamouda.github.io');
  assert.strictEqual(r.statusCode, 200); assert.strictEqual(envoi.p.get('success_url'), 'https://raouf-hamouda.github.io/alaya-fine-jewelry/commande/index.html?paye=1&session={CHECKOUT_SESSION_ID}');
  // 6. methode, corps illisible, cle absente
  assert.strictEqual((await appel({}, 'https://alayafinejewelry.com', 'GET')).statusCode, 405);
  assert.strictEqual((await f.handler({ httpMethod: 'POST', headers: { origin: 'https://alayafinejewelry.com' }, body: '{' })).statusCode, 400);
  delete process.env.STRIPE_SECRET_KEY;
  assert.strictEqual((await appel({ panier: [{ slug: 'bague-carmen' }], retour: 'https://alayafinejewelry.com' })).statusCode, 500);
  // 7. les options sont nettoyees
  process.env.STRIPE_SECRET_KEY = 'sk_test_simulee';
  await appel({ panier: [{ slug: 'bague-carmen', options: '<script>x</script>' + 'a'.repeat(900) }], retour: 'https://alayafinejewelry.com' });
  const desc = envoi.p.get('line_items[0][price_data][product_data][description]'); assert.ok(desc.length <= 300 && !/[<>]/.test(desc));
  console.log('paiement : tous les controles passent');
})().catch(e => { console.error('ECHEC', e.message); process.exit(1); });
