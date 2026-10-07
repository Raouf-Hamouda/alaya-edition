// Alaya, phase 1. Menu, emplacement et langue, filtres, galerie, options, panier,
// recherche. Les pages restent lisibles sans JavaScript.

(function () {
  var BASE = window.BASE || '/';
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return [].slice.call((c || document).querySelectorAll(s)); };

  // ================================================================
  // Les langues. Le francais est la source, l'anglais et l'italien
  // sont poses par-dessus : phrases entieres d'abord, puis le
  // vocabulaire de joaillerie dans les textes de piece.
  // ================================================================
  // sans JavaScript, rien ne bouge et tout reste lisible
  if (window.matchMedia && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) document.documentElement.classList.add('js');

  var LANG = 'fr';
  try { LANG = localStorage.getItem('alaya-langue') || 'fr'; } catch (e) {}
  var L = window.ALAYA_LANGUES || { PHRASES: {}, TERMES: {}, noms: { fr: 'Français' }, html: { fr: 'fr' } };   // le dictionnaire (318 Ko) n'est charge que pour l'anglais et l'italien
  if (!L.PHRASES[LANG]) LANG = 'fr';

  function norm(t) { return t.replace(/[’‘]/g, "'").replace(/\s+/g, ' ').trim(); }

  var DICO = {};
  if (LANG !== 'fr') {
    Object.keys(L.PHRASES[LANG]).forEach(function (k) { DICO[norm(k)] = L.PHRASES[LANG][k]; });
  }
  function T(t) {
    if (LANG === 'fr' || !t) return t;
    var v = DICO[norm(t)];
    return v === undefined ? t : v;
  }

  var motifTermes = null, tableTermes = {};
  function TT(t) {
    if (LANG === 'fr' || !t) return t;
    var direct = DICO[norm(t)];
    if (direct !== undefined) return direct;
    if (!motifTermes) {
      var liste = (L.TERMES[LANG] || []).slice().sort(function (a, b) { return b[0].length - a[0].length; });
      if (!liste.length) return t;
      var morceaux = liste.map(function (pair) {
        tableTermes[norm(pair[0])] = pair[1];
        return norm(pair[0]).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      });
      motifTermes = new RegExp(morceaux.join('|'), 'g');
    }
    return norm(t).replace(motifTermes, function (m) { return tableTermes[m] !== undefined ? tableTermes[m] : m; });
  }

  function traduirePage() {
    if (LANG === 'fr') return;
    document.documentElement.lang = (L.html && L.html[LANG]) || LANG;
    var zonesTermes = ['FICHE-TEXTE', 'ACC-CORPS', 'ATTRIBUTS'];
    var marche = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
    var noeuds = [];
    while (marche.nextNode()) noeuds.push(marche.currentNode);
    noeuds.forEach(function (n) {
      var brut = n.nodeValue;
      if (!brut || !brut.trim()) return;
      var parent = n.parentNode;
      if (parent && (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE')) return;
      var v = DICO[norm(brut)];
      if (v !== undefined) { n.nodeValue = brut.replace(brut.trim(), v); return; }
      var dansTexte = parent && parent.closest &&
        parent.closest('.fiche-texte, .acc-corps, .attributs, .liste-intro, .block-seo, .grid-seo-text, .sel, .achat-note, .note-specs');
      if (dansTexte) {
        var tr = TT(brut);
        if (tr !== norm(brut)) n.nodeValue = brut.replace(brut.trim(), tr);
      }
    });
    ['placeholder', 'aria-label', 'title', 'alt'].forEach(function (attr) {
      $$('[' + attr + ']').forEach(function (el) {
        var v = DICO[norm(el.getAttribute(attr))];
        if (v !== undefined) el.setAttribute(attr, v);
      });
    });
    $$('.topbar-btn[data-panel="langue"]').forEach(function (b) {
      b.childNodes[0].nodeValue = (L.noms && L.noms[LANG]) || LANG;
    });
  }


  // --- menu mobile
  var panneau = $('.menu-vertical'), scrim = $('.menu-scrim');
  function ouvrir(v) {
    if (!panneau) return;
    panneau.classList.toggle('is-open', v);
    if (scrim) scrim.classList.toggle('is-on', v);
    document.documentElement.classList.toggle('menu-ouvert', !!v);
  }
  if ($('.menu-burger')) $('.menu-burger').addEventListener('click', function () { ouvrir(true); });

  // le menu mobile a deux niveaux : une vue a la fois, la pastille Retour ramene
  function vue(cle) {
    $$('.mv-vue').forEach(function (v) { v.hidden = !(cle ? v.id === 'mv-' + cle : v.classList.contains('mv-racine')); });
    if (panneau) panneau.scrollTop = 0;
  }
  $$('.mv-vers').forEach(function (b) { b.addEventListener('click', function () { vue(b.dataset.vers); }); });
  $$('.btn-retour').forEach(function (b) { b.addEventListener('click', function () { vue(null); }); });
  if ($('.menu-close')) $('.menu-close').addEventListener('click', function () { ouvrir(false); });
  if (scrim) scrim.addEventListener('click', function () { ouvrir(false); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') ouvrir(false); });

  // --- emplacement et langue
  $$('.topbar-btn').forEach(function (b) {
    b.addEventListener('click', function () {
      var cible = document.getElementById('panel-' + b.dataset.panel);
      if (!cible) return;
      var ouvertDeja = !cible.hidden;
      $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
      cible.hidden = ouvertDeja;
      var enFeuille = window.matchMedia && window.matchMedia('(max-width: 900px)').matches;
      if (!cible.hidden) { ouvrir(false); if (!enFeuille) window.scrollTo({ top: 0, behavior: 'smooth' }); }
    });
  });
  // sur telephone le panneau est une feuille : toucher a cote la referme
  document.addEventListener('click', function (e) {
    if (e.target.closest('.topbar-panel, .topbar-btn')) return;
    $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
  });
  function poserChoix(cle, valeur) {
    try { localStorage.setItem('alaya-' + cle, valeur); } catch (e) {}
    if (cle === 'langue') { location.reload(); return; }
    if (cle === 'emplacement') {
      $$('.topbar-btn[data-panel="emplacement"] b').forEach(function (b) { b.textContent = valeur; });
    }
  }
  $$('.choix-btn[data-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      $$('.choix-btn[data-set="' + b.dataset.set + '"]').forEach(function (o) { o.classList.remove('is-on'); });
      b.classList.add('is-on');
      poserChoix(b.dataset.set, b.dataset.value);
      $$('.topbar-panel').forEach(function (p) { p.hidden = true; });
    });
  });
  try {
    var emp = localStorage.getItem('alaya-emplacement');
    if (emp) {
      $$('.topbar-btn[data-panel="emplacement"] b').forEach(function (b) { b.textContent = emp; });
      $$('.choix-btn[data-set="emplacement"]').forEach(function (o) {
        o.classList.toggle('is-on', o.dataset.value === emp);
      });
    }
    $$('.choix-btn[data-set="langue"]').forEach(function (o) {
      o.classList.toggle('is-on', o.dataset.value === LANG);
    });
  } catch (e) {}

  // --- filtres de rayon
  var boiteFiltres = $('.filtres'), btnFiltrer = $('.btn-filtrer');
  if (boiteFiltres && btnFiltrer) {
    btnFiltrer.hidden = false;
    btnFiltrer.addEventListener('click', function () { boiteFiltres.hidden = !boiteFiltres.hidden; });
  }
  var chips = $$('.chip[data-filtre]'), reset = $('.chip--reset'),
      cartes = $$('.grid-results .product-card'), compte = $('.liste-tete .count');
  function appliquer() {
    var actifs = chips.filter(function (c) { return c.classList.contains('is-on'); })
                      .map(function (c) { return c.dataset.filtre; });
    var vus = 0;
    cartes.forEach(function (carte) {
      var f = (carte.dataset.filtres || '').split(';').map(function (s) { return s.trim(); });
      var ok = actifs.every(function (a) { return f.indexOf(a) !== -1; });
      carte.classList.toggle('is-hidden', !ok);
      if (ok) vus++;
    });
    if (compte) compte.textContent = '(' + vus + ')';
    if (reset) reset.hidden = actifs.length === 0;
    var url = new URL(window.location);
    if (actifs.length) url.searchParams.set('filtre', actifs.join(',')); else url.searchParams.delete('filtre');
    history.replaceState(null, '', url);
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { c.classList.toggle('is-on'); appliquer(); }); });
  if (reset) reset.addEventListener('click', function () {
    chips.forEach(function (c) { c.classList.remove('is-on'); }); appliquer();
  });
  var depart = new URL(window.location).searchParams.get('filtre');
  if (depart && chips.length) {
    if (boiteFiltres) boiteFiltres.hidden = false;
    depart.split(',').forEach(function (f) {
      chips.forEach(function (c) { if (c.dataset.filtre === f) c.classList.add('is-on'); });
    });
    appliquer();
  }

  // --- galerie de la fiche, une variante a la fois
  var groupes = $$('.gal-groupe'), vigns = $$('.gal-vign');
  var etat = { couleur: null, pierre: null };
  if (groupes.length) {
    etat.couleur = groupes[0].dataset.couleur || null;
    etat.pierre = groupes[0].dataset.pierre || null;
  }
  function syncSelecteurs(g) {
    $$('.sel').forEach(function (sel) {
      var opt = $$('.opt', sel).filter(function (o) {
        return (o.dataset.couleur && o.dataset.couleur === g.dataset.couleur) ||
               (o.dataset.pierre && o.dataset.pierre === g.dataset.pierre);
      })[0];
      if (!opt) return;
      $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
      opt.classList.add('is-on');
      var val = $('.sel-val', sel);
      if (val.textContent !== opt.dataset.value) {
        val.textContent = opt.dataset.value;
        val.classList.remove('vif'); void val.offsetWidth; val.classList.add('vif');
      }
      $('.sel-label', sel).textContent = opt.dataset.axe;
    });
  }
  function montrerGroupe(couleur, pierre, axe) {
    if (!groupes.length) return;
    var g = groupes.filter(function (x) {
      return x.dataset.couleur === couleur && x.dataset.pierre === pierre;
    })[0];
    if (!g && axe) {
      var v = axe === 'couleur' ? couleur : pierre;
      g = groupes.filter(function (x) { return x.dataset[axe] === v; })[0];
    }
    if (!g) return;
    groupes.forEach(function (x) { x.hidden = x !== g; });
    vigns.forEach(function (v) {
      v.classList.toggle('is-on', v.dataset.couleur === g.dataset.couleur &&
                                  v.dataset.pierre === g.dataset.pierre);
    });
    etat.couleur = g.dataset.couleur || null;
    etat.pierre = g.dataset.pierre || null;
    syncSelecteurs(g);
  }
  vigns.forEach(function (v) {
    v.addEventListener('click', function () { montrerGroupe(v.dataset.couleur, v.dataset.pierre); });
  });
  if (groupes.length) syncSelecteurs(groupes[0]);

  // --- options de la fiche
  $$('.sel').forEach(function (sel) {
    var tete = $('.sel-tete', sel), corps = $('.sel-corps', sel);
    tete.addEventListener('click', function () {
      var ferme = corps.hidden;
      $$('.sel-corps').forEach(function (c) { c.hidden = true; });
      $$('.sel').forEach(function (s) { s.classList.remove('is-open'); });
      corps.hidden = !ferme;
      sel.classList.toggle('is-open', ferme);
    });
    $$('.opt', sel).forEach(function (o) {
      o.addEventListener('click', function () {
        $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
        o.classList.add('is-on');
        if (o.dataset.prix) { var bl = $('.achat'), px = $('.achat-prix'); bl.dataset.prix = o.dataset.prix; px.textContent = euros(parseFloat(o.dataset.prix)); px.classList.remove('achat-prix--vide'); var ml = $('.montant-libre input'); if (ml) ml.value = ''; }
        if (o.dataset.couleur) montrerGroupe(o.dataset.couleur, etat.pierre, 'couleur');
        if (o.dataset.pierre) montrerGroupe(etat.couleur, o.dataset.pierre, 'pierre');
        $('.sel-val', sel).textContent = o.dataset.value;
        $('.sel-label', sel).textContent = o.dataset.axe;
        if (!o.dataset.couleur && !o.dataset.pierre) { corps.hidden = true; sel.classList.remove('is-open'); }
      });
    });
  });

  // --- guide des tailles
  var modale = $('#modale-tailles');
  if (modale) {
    var basculer = function (v) {
      if (v) {
        modale.hidden = false;
        requestAnimationFrame(function () { requestAnimationFrame(function () { modale.classList.add('is-open'); }); });
        document.body.style.overflow = 'hidden';
      } else {
        modale.classList.remove('is-open');
        document.body.style.overflow = '';
        setTimeout(function () { if (!modale.classList.contains('is-open')) modale.hidden = true; }, 380);
      }
    };
    $$('.lien-guide').forEach(function (b) { b.addEventListener('click', function () { basculer(true); }); });
    $('.modale-fermer', modale).addEventListener('click', function () { basculer(false); });
    modale.addEventListener('click', function (e) { if (e.target === modale) basculer(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') basculer(false); });
  }

  // --- panier local, le paiement Stripe arrive en phase 2
  function euros(v) {
    return String(Math.round(v)).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + '\u00a0€';
  }
  function lirePanier() {
    try { return JSON.parse(localStorage.getItem('alaya-panier') || '[]'); } catch (e) { return []; }
  }
  function ecrirePanier(v) {
    try { localStorage.setItem('alaya-panier', JSON.stringify(v)); } catch (e) {}
    majCompte();
  }
  // la meme piece : meme fiche, memes choix. Le panier garde une entree par exemplaire (la commande et le paiement
  // n'ont pas a changer) ; c'est l'affichage qui les reunit en une ligne « × 2 ».
  function clePanier(l) { return l.url + '|' + (l.options || []).join('|'); }
  function combien(p, l) { var k = clePanier(l); return p.filter(function (x) { return clePanier(x) === k; }).length; }
  function grouper(p) {
    var vus = {}, out = [];
    p.forEach(function (l) { var k = clePanier(l); if (vus[k]) vus[k].qte++; else out.push(vus[k] = { l: l, qte: 1, cle: k }); });
    return out;
  }
  function majCompte() {
    var n = lirePanier().length, el = $('.panier-compte');
    if (el) {
      var avant = el.textContent; el.hidden = n === 0; el.textContent = '(' + n + ')';
      if (avant && avant !== el.textContent) { el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
    }
  }
  majCompte();

  // une ligne de reponse sous les boutons : sans elle, un clic sans taille ne
  // donnait aucun signe et le panier semblait inaccessible.
  function flash(html, erreur) {
    var zone = $('.achat-flash');
    if (!zone) {
      var boutons = $('.achat-boutons');
      if (!boutons) return;
      zone = document.createElement('p');
      zone.className = 'achat-flash';
      zone.setAttribute('role', 'status');
      boutons.parentNode.insertBefore(zone, boutons.nextSibling);
    }
    zone.className = 'achat-flash' + (erreur ? ' achat-flash--erreur' : '');
    zone.innerHTML = html;
  }

  var btnAjout = $('.btn-panier[data-slug]');
  if (btnAjout) {
    btnAjout.addEventListener('click', function () {
      var bloc = $('.achat');
      var options = $$('.sel').map(function (s) {
        var v = $('.sel-val', s).textContent;
        return v ? (s.dataset.axe + ' : ' + v) : null;
      }).filter(Boolean);
      var chk = $('.chk-offrir');
      if (chk && chk.checked) options.push('Cadeau : écrin, mot joint, prix masqué');
      var manquant = $$('.sel').filter(function (s) { return !$('.sel-val', s).textContent; });
      if (manquant.length) {
        manquant[0].classList.add('is-open');
        $('.sel-corps', manquant[0]).hidden = false;
        manquant[0].scrollIntoView({ block: 'center', behavior: 'smooth' });
        var libelle = $('.sel-label', manquant[0]);
        flash((libelle ? libelle.textContent.trim() : T('Une option')) + '\u00a0: ' + T('à choisir avant d’ajouter au panier.'), true);
        return;
      }
      var p = lirePanier();
      var ligne = { nom: bloc.dataset.nom, prix: parseFloat(bloc.dataset.prix || 0),
                    img: bloc.dataset.img, url: bloc.dataset.url, options: options };
      var deja = combien(p, ligne);
      if (deja && !btnAjout.dataset.encore) {
        // paiement express : la piece y est deja, on va payer sans la doubler
        if (btnAjout.dataset.pay) { window.location = BASE + 'commande/index.html'; return; }
        flash(T('Cette pièce est déjà dans votre panier') + (deja > 1 ? ' (×\u00a0' + deja + ')' : '') + '. ' +
          T(deja > 1 ? 'En ajouter une autre ?' : 'En ajouter une seconde ?') +
          ' <button class="flash-oui" type="button">' + T('Oui, l’ajouter') + '</button>' +
          '<a href="' + BASE + 'panier/index.html">' + T('Voir le panier') + '</a>', false);
        $('.flash-oui').addEventListener('click', function () { btnAjout.dataset.encore = '1'; btnAjout.click(); });
        return;
      }
      delete btnAjout.dataset.encore;
      p.push(ligne);
      ecrirePanier(p);
      btnAjout.classList.add('is-ok');
      btnAjout.innerHTML = '<span class="bp-mot">' + T('Ajouté au panier') + '</span>';   // le mot se pose (animation .bp-mot)
      flash(T('Ajouté au panier') + (deja ? ' ×\u00a0' + (deja + 1) : '') + '. <a href="' + BASE + 'panier/index.html">' + T('Voir le panier') + '</a>', false);
      setTimeout(function () {
        btnAjout.classList.remove('is-ok');
        btnAjout.innerHTML = '<span class="bp-mot">' + T('Ajouter au panier') + '</span>';
      }, 3200);
    });
  }
  var libre = $('.montant-libre input');
  if (libre) {
    libre.addEventListener('input', function () {
      var v = parseFloat(libre.value), sel = libre.closest('.sel'), px = $('.achat-prix');
      if (v >= 300) {
        $('.achat').dataset.prix = v; px.textContent = euros(v); px.classList.remove('achat-prix--vide');
        $$('.opt', sel).forEach(function (x) { x.classList.remove('is-on'); });
        $('.sel-val', sel).textContent = euros(v);
      }
    });
  }
  var btnPay = $('.btn-pay');
  if (btnPay) btnPay.addEventListener('click', function () {
    var avant = lirePanier().length, ajout = $('.btn-panier');
    if (ajout) { ajout.dataset.pay = '1'; ajout.click(); delete ajout.dataset.pay; }   // memes controles : taille, monture, pierre
    if (lirePanier().length > avant) window.location = BASE + 'commande/index.html';
  });

  var ICONE_SAC = '<svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" stroke-width="1.1" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

  function ligneHTML(g, i, court) {
    var l = g.l;
    return '<div class="panier-ligne">' +
      (l.img ? '<img src="' + BASE + l.img + '" alt="">' : '<div class="media"></div>') +
      '<div><a href="' + BASE + l.url + '">' + l.nom + '</a>' + (g.qte > 1 ? '<span class="qte">×\u00a0' + g.qte + '</span>' : '') +
      (l.options && l.options.length ? '<p class="opts">' + l.options.join(' &middot; ') + '</p>' : '') +
      (court ? '' : (g.qte > 1
        ? '<button class="retirer" data-g="' + i + '">' + T('En retirer une') + '</button><button class="retirer" data-g="' + i + '" data-tout="1">' + T('Tout retirer') + '</button>'
        : '<button class="retirer" data-g="' + i + '">' + T('Retirer') + '</button>')) +
      '</div>' +
      '<div>' + (l.prix ? euros(l.prix * g.qte) : T('Prix sur demande')) + '</div>' +
      '</div>';
  }

  // panier vide : quatre pieces parmi les plus accessibles, chacune avec son ajout rapide
  function premieresPieces() {
    var P = window.ALAYA_PIECES || {};
    var liste = Object.keys(P).filter(function (k) { return P[k].p > 0 && !/carte/.test(k); })
      .sort(function (a, b) { return P[a].p - P[b].p; }).slice(0, 4);
    if (!liste.length) return '';
    return '<section class="panier-idees"><p class="surtitre">' + T('Une idée') + '</p>' +
      '<h2 class="panier-idees-titre">' + T('Pour commencer') + '</h2>' +
      '<p class="panier-idees-ligne">' + T('Quatre pièces, à partir de') + ' ' + euros(P[liste[0]].p) + '.</p>' +
      '<div class="grid-results">' + liste.map(function (k) {
        var x = P[k];
        return '<article class="product-card"><a href="' + BASE + x.u + '"><img src="' + BASE + x.i + '" alt="' + x.n + '" loading="lazy">' +
          '<p class="name">' + x.n + '</p><p class="price">' + euros(x.p) + '</p></a></article>';
      }).join('') + '</div>' +
      '<a class="cta panier-idees-suite" href="' + BASE + 'toute-la-collection/index.html">' + T('Voir toute la collection') + '</a></section>';
  }

  var boitePanier = $('#panier');
  if (boitePanier) {
    var rendre = function () {
      var p = lirePanier();
      if (!p.length) {
        boitePanier.innerHTML = '<div class="panier-vide">' + ICONE_SAC +
          '<p>' + T('Votre panier est vide') + '</p>' +
          '<a class="btn-panier" href="' + BASE + 'toute-la-collection/index.html">' + T('Continuer mes achats') + '</a></div>' +
          premieresPieces();
        return;
      }
      var total = p.reduce(function (s, l) { return s + (l.prix || 0); }, 0);
      var groupes = grouper(p);
      boitePanier.innerHTML = groupes.map(function (g, i) { return ligneHTML(g, i, false); }).join('') +
        '<div class="panier-total"><span>' + T('Total') + '</span><span class="fete">' + euros(total) + '<i class="etincelle etincelle--3"></i><i class="etincelle etincelle--2"></i></span></div>' +
        '<a class="btn-panier btn-panier--plein" href="' + BASE + 'commande/index.html">' + T('Passer commande') + '</a>';
      $$('.retirer', boitePanier).forEach(function (b) {
        b.addEventListener('click', function () {
          // un exemplaire de moins (le dernier ajoute), ou toute la ligne
          var cle = groupes[parseInt(b.dataset.g, 10)].cle, p2 = lirePanier();
          if (b.dataset.tout) p2 = p2.filter(function (x) { return clePanier(x) !== cle; });
          else for (var k = p2.length - 1; k >= 0; k--) if (clePanier(p2[k]) === cle) { p2.splice(k, 1); break; }
          ecrirePanier(p2); rendre();
        });
      });
    };
    rendre();
  }

  // --- recherche
  var champ = $('#q'), sortie = $('#resultats');
  if (champ && sortie && window.CATALOGUE) {
    var sansAccent = function (s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    };
    var chercher = function (q) {
      q = sansAccent(q).trim();
      if (!q) { sortie.innerHTML = ''; return; }
      var mots = q.split(/\s+/);
      var res = window.CATALOGUE.filter(function (p) {
        var champs = sansAccent(p.n + ' ' + p.r + ' ' + p.c);
        return mots.every(function (m) { return champs.indexOf(m) !== -1; });
      });
      sortie.innerHTML = res.map(function (p) {
        return '<article class="product-card"><a href="' + BASE + p.u + '">' +
          (p.i ? '<img src="' + BASE + p.i + '" alt="" loading="lazy">' : '<div class="media"></div>') +
          '<p class="name">' + p.n + '</p><p class="price">' + p.p + '</p></a></article>';
      }).join('') || '<p class="empty-state">Aucune pièce ne correspond.</p>';
    };
    champ.addEventListener('input', function () { chercher(champ.value); });
    var q0 = new URL(window.location).searchParams.get('q');
    if (q0) { champ.value = q0; chercher(q0); }
  }
  // ================================================================
  // Ajout rapide depuis la grille, tunnel de commande, mouvement.
  // ================================================================

  var ICO_SAC_MINI = '<svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>';

  function slugDeLien(href) {
    var m = (href || '').match(/piece\/([^\/]+)\//);
    return m ? m[1] : null;
  }

  // --- le panneau d'ajout rapide, un seul pour toute la page
  var panneauRapide = null, choixRapide = {}, pieceRapide = null;

  function fermerRapide() {
    if (!panneauRapide) return;
    panneauRapide.classList.remove('is-open');
    setTimeout(function () { panneauRapide.hidden = true; }, 320);
  }

  function construireRapide() {
    panneauRapide = document.createElement('div');
    panneauRapide.className = 'ajout-rapide';
    panneauRapide.hidden = true;
    panneauRapide.innerHTML = '<div class="voile"></div><div class="ar-boite" role="dialog" aria-modal="true"></div>';
    document.body.appendChild(panneauRapide);
    panneauRapide.querySelector('.voile').addEventListener('click', fermerRapide);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') fermerRapide(); });
  }

  function dessinerRapide() {
    var b = panneauRapide.querySelector('.ar-boite'), p = pieceRapide;
    var axes = (p.o || []).map(function (ax) {
      var opts = ax.v.map(function (v) {
        return '<button class="opt' + (choixRapide[ax.a] === v ? ' is-on' : '') + '" type="button" data-axe="' + ax.a + '" data-value="' + v + '">' + TT(v) + '</button>';
      }).join('');
      return '<div class="ar-tailles"><p>' + T(ax.a) + '</p><div class="ar-liste">' + opts + '</div></div>';
    }).join('');
    var manque = (p.o || []).some(function (ax) { return !choixRapide[ax.a]; });
    b.innerHTML =
      '<div class="ar-tete"><img src="' + BASE + p.i + '" alt="">' +
        '<div><p class="ar-nom">' + p.n + '</p><p class="ar-prix">' + (p.p ? euros(p.p) : T('Prix sur demande')) + '</p></div>' +
        '<button class="ar-fermer" aria-label="Fermer">&#10005;</button></div>' +
      axes +
      '<div class="ar-pied"><button class="btn-panier" type="button" id="ar-ajouter">' + ICO_SAC_MINI + '<span>' + (manque ? T('Choisir pour ajouter') : T('Ajouter au panier')) + '</span></button>' +
      '<a class="ar-lien" href="' + BASE + p.u + '"><span>' + T('Voir la fiche complète') + '</span></a></div>';

    b.querySelector('.ar-fermer').addEventListener('click', fermerRapide);
    $$('.opt', b).forEach(function (o) {
      o.addEventListener('click', function () {
        choixRapide[o.dataset.axe] = o.dataset.value;
        dessinerRapide();
      });
    });
    b.querySelector('#ar-ajouter').addEventListener('click', function () {
      var reste = (p.o || []).filter(function (ax) { return !choixRapide[ax.a]; });
      if (reste.length) {
        var titres = $$('.ar-tailles p', b);
        titres.forEach(function (t) { if (t.textContent === reste[0].a) t.style.color = '#9c2b2b'; });
        return;
      }
      var options = (p.o || []).map(function (ax) { return ax.a + ' : ' + choixRapide[ax.a]; });
      var panier = lirePanier(), ligneR = { nom: p.n, prix: p.p, img: p.i, url: p.u, options: options };
      if (combien(panier, ligneR) && !this.dataset.encore) {
        this.dataset.encore = '1';
        (this.querySelector('span') || this).textContent = T('En ajouter une seconde ?');
        return;
      }
      panier.push(ligneR);
      ecrirePanier(panier);
      // sur la page panier, le panier se redessine aussitot avec la piece
      if (boitePanier) { fermerRapide(); rendre(); return; }
      var pied = b.querySelector('.ar-pied');
      pied.innerHTML = '<a class="btn-panier" href="' + BASE + 'panier/index.html">' + T('Voir le panier') + '</a>' +
        '<button class="pf-continuer" type="button" id="ar-continuer">' + T('Continuer mes achats') + '</button>';
      b.querySelector('#ar-continuer').addEventListener('click', fermerRapide);
    });
  }

  function ouvrirRapide(slug) {
    var p = (window.ALAYA_PIECES || {})[slug];
    if (!p) return false;
    if (!panneauRapide) construireRapide();
    pieceRapide = p; choixRapide = {};
    // un seul choix possible : on le pose d'avance
    (p.o || []).forEach(function (ax) { if (ax.v.length === 1) choixRapide[ax.a] = ax.v[0]; });
    dessinerRapide();
    panneauRapide.hidden = false;
    requestAnimationFrame(function () { panneauRapide.classList.add('is-open'); });
    return true;
  }

  // le bouton rond sur chaque vignette de grille
  if (window.ALAYA_PIECES) {
    $$('.product-card').forEach(function (carte) {
      var lien = $('a', carte), slug = slugDeLien(lien && lien.getAttribute('href'));
      if (!slug || !window.ALAYA_PIECES[slug]) return;
      var b = document.createElement('button');
      b.className = 'btn-rapide';
      b.type = 'button';
      b.setAttribute('aria-label', 'Ajouter au panier');
      b.innerHTML = ICO_SAC_MINI;
      b.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); ouvrirRapide(slug); });
      carte.appendChild(b);
    });
  }

  // --- le recapitulatif et le formulaire de commande
  var recap = $('#recap');
  if (recap) {
    var lignes = lirePanier();
    if (!lignes.length) {
      recap.innerHTML = '<p class="opts">' + T('Votre panier est vide') + '</p>';
    } else {
      var t = lignes.reduce(function (s, l) { return s + (l.prix || 0); }, 0);
      recap.innerHTML = grouper(lignes).map(function (g, i) { return ligneHTML(g, i, true); }).join('') +
        '<div class="panier-total"><span>' + T('Total') + '</span><span class="fete">' + euros(t) + '<i class="etincelle etincelle--3"></i><i class="etincelle etincelle--2"></i></span></div>';
      var bp = $('#btn-payer');
      if (bp) bp.textContent = T('Payer') + ' ' + euros(t);
    }
  }

  if (/[?&]paye=1/.test(window.location.search) && $('#etape-confirmation')) {
    ecrirePanier([]);
    $('#etape-formulaire').hidden = true; $('#etape-confirmation').hidden = false;
    var et = $$('.etapes li'); if (et.length === 3) { et[1].className = 'est-faite'; et[2].className = 'est-la'; }
  }
  var formCommande = $('#form-commande');
  if (formCommande) {
    formCommande.addEventListener('submit', function (e) {
      e.preventDefault();
      var erreur = $('#erreur-form'), manquants = [];
      $$('input[required]', formCommande).forEach(function (c) {
        var vide = !c.value.trim();
        c.classList.toggle('est-vide', vide);
        if (vide) manquants.push(c);
      });
      if (!lirePanier().length) {
        erreur.hidden = false;
        erreur.textContent = T('Votre panier est vide');
        return;
      }
      if (manquants.length) {
        erreur.hidden = false;
        erreur.textContent = T('Il manque un renseignement.');
        manquants[0].focus();
        return;
      }
      erreur.hidden = true;
      // le navigateur n'envoie que les identifiants des pieces et leurs options ; le prix est fixe par le serveur
      var panier = lirePanier().map(function (l) {
        var m = /piece\/([^\/]+)\//.exec(l.url || '');
        var ligne = { slug: m ? m[1] : '', options: (l.options || []).join(' · ') };
        if (ligne.slug === 'carte-cadeaux') ligne.montant = l.prix;
        return ligne;
      });
      var bouton = $('#btn-payer'), libelle = bouton.textContent, champ = function (n) { var c = formCommande.elements[n]; return c ? c.value.trim() : ''; };
      bouton.disabled = true; bouton.textContent = T('Un instant…');
      var echec = function (msg) {
        bouton.disabled = false; bouton.textContent = libelle;
        erreur.hidden = false; erreur.textContent = msg || T('Le paiement en ligne n’est pas encore ouvert. Écrivez-nous, on finalise la commande ensemble.');
      };
      var retour = new URL(BASE || './', window.location.href).href.replace(/\/+$/, '');
      fetch(window.ALAYA_PAIEMENT_URL || '/.netlify/functions/creer-paiement', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ panier: panier, retour: retour, langue: LANG, email: champ('email'), tel: champ('tel'), cadeau: !!(formCommande.elements.cadeau && formCommande.elements.cadeau.checked) })
      }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
        .then(function (x) { if (x.ok && x.d && x.d.url) { window.location = x.d.url; } else { echec(x.d && x.d.erreur); } })
        .catch(function () { echec(); });
      ecrirePanier([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // --- les blocs montent en arrivant, comme chez eux (slide-in-up)
  var doux = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doux && 'IntersectionObserver' in window) {
    var aAnimer = $$('.page-home main > section, .block-merchandising, .apparentees, .deux-voies, .page-edito .js-anim, .taille-scene, .couleur-scene, .purete-scene, .carat-scene');
    if (aAnimer.length) {
      var oeil = new IntersectionObserver(function (entrees) {
        entrees.forEach(function (en) {
          if (en.isIntersecting) { en.target.classList.add('est-la'); oeil.unobserve(en.target); }
        });
      }, { rootMargin: '0px 0px -12% 0px' });
      aAnimer.forEach(function (el, i) {
        if (i === 0 && el.classList.contains('block-text-on-full-media')) return; // le hero reste en place
        el.classList.add('js-anim');
        oeil.observe(el);
      });
    }
  }



  // ================================================================
  // La loupe, la seconde image au survol, la barre d'achat qui suit.
  // ================================================================

  // --- la loupe : on clique le bijou, il prend toute la page
  var vues = $$('.gal-groupe:not([hidden]) .gal-vue img, .gal-vue img');
  if (vues.length) {
    var loupe = null, iLoupe = 0, imagesLoupe = [];

    function majLoupe() {
      var img = $('img', loupe);
      img.src = imagesLoupe[iLoupe];
      loupe.classList.remove('est-zoom');
      img.style.transform = '';
      var compte = $('.loupe-compte', loupe);
      compte.textContent = imagesLoupe.length > 1 ? (iLoupe + 1) + ' / ' + imagesLoupe.length : '';
      $$('.loupe-nav', loupe).forEach(function (b) { b.hidden = imagesLoupe.length < 2; });
    }
    function fermerLoupe() {
      loupe.classList.remove('is-open');
      setTimeout(function () { loupe.hidden = true; }, 300);
      document.body.style.overflow = '';
    }
    function construireLoupe() {
      loupe = document.createElement('div');
      loupe.className = 'loupe';
      loupe.hidden = true;
      loupe.innerHTML = '<button class="loupe-fermer" aria-label="' + T('Fermer') + '">&#10005;</button>' +
        '<button class="loupe-nav loupe-prec" aria-label="' + T('Précédent') + '">&lsaquo;</button>' +
        '<div class="loupe-cadre"><img alt=""></div>' +
        '<button class="loupe-nav loupe-suiv" aria-label="' + T('Suivant') + '">&rsaquo;</button>' +
        '<p class="loupe-compte"></p>';
      document.body.appendChild(loupe);
      $('.loupe-fermer', loupe).addEventListener('click', fermerLoupe);
      $('.loupe-prec', loupe).addEventListener('click', function () {
        iLoupe = (iLoupe - 1 + imagesLoupe.length) % imagesLoupe.length; majLoupe();
      });
      $('.loupe-suiv', loupe).addEventListener('click', function () {
        iLoupe = (iLoupe + 1) % imagesLoupe.length; majLoupe();
      });
      loupe.addEventListener('click', function (e) { if (e.target === loupe || e.target.className === 'loupe-cadre') fermerLoupe(); });
      var img = $('img', loupe);
      // un clic de plus : on entre dans la pierre, la souris promene le cadrage
      img.addEventListener('click', function (e) {
        e.stopPropagation();
        var zoom = loupe.classList.toggle('est-zoom');
        img.style.transform = zoom ? 'scale(2.2)' : '';
      });
      img.addEventListener('mousemove', function (e) {
        if (!loupe.classList.contains('est-zoom')) return;
        var r = img.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
        img.style.transform = 'scale(2.2) translate(' + (-x * 26) + '%, ' + (-y * 26) + '%)';
      });
      document.addEventListener('keydown', function (e) {
        if (loupe.hidden) return;
        if (e.key === 'Escape') fermerLoupe();
        if (e.key === 'ArrowRight') { iLoupe = (iLoupe + 1) % imagesLoupe.length; majLoupe(); }
        if (e.key === 'ArrowLeft') { iLoupe = (iLoupe - 1 + imagesLoupe.length) % imagesLoupe.length; majLoupe(); }
      });
    }
    function ouvrirLoupe(src) {
      if (!loupe) construireLoupe();
      imagesLoupe = $$('.gal-vue img').map(function (i) { return i.src; });
      iLoupe = Math.max(0, imagesLoupe.indexOf(src));
      majLoupe();
      loupe.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { loupe.classList.add('is-open'); });
    }
    $$('.gal-vue img').forEach(function (img) {
      img.addEventListener('click', function () { ouvrirLoupe(img.src); });
    });
  }

  // --- la barre d'achat qui suit, quand la carte est passee
  var carteAchat = $('.achat');
  if (carteAchat && $('.btn-panier[data-slug]')) {
    var barre = document.createElement('div');
    barre.className = 'barre-achat';
    var img0 = $('.gal-vue img');
    barre.innerHTML = (img0 ? '<img src="' + img0.src + '" alt="">' : '') +
      '<div><p class="ba-nom">' + carteAchat.dataset.nom + '</p><p class="ba-opts"></p></div>' +
      '<div class="ba-espace"></div>' +
      '<span class="ba-prix">' + ($('.achat-prix') ? $('.achat-prix').textContent : '') + '</span>' +
      '<button class="btn-panier" type="button">' + T('Ajouter au panier') + '</button>';
    document.body.appendChild(barre);
    $('.btn-panier', barre).addEventListener('click', function () {
      $('.btn-panier[data-slug]').click();
      carteAchat.scrollIntoView({ block: 'center', behavior: 'smooth' });
    });
    var suivreOptions = function () {
      var choisies = $$('.sel').map(function (s) { return $('.sel-val', s).textContent; }).filter(Boolean);
      $('.ba-opts', barre).textContent = choisies.join(' · ');
      var px = $('.achat-prix');
      if (px) $('.ba-prix', barre).textContent = px.textContent;
      var vue = $('.gal-groupe:not([hidden]) .gal-vue img') || img0;
      if (vue && $('img', barre)) $('img', barre).src = vue.src;
    };
    document.addEventListener('click', function () { setTimeout(suivreOptions, 60); });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (e) {
        barre.classList.toggle('est-la', !e[0].isIntersecting && e[0].boundingClientRect.top < 0);
      }, { threshold: 0 }).observe($('.achat-boutons') || carteAchat);   // la barre arrive quand les boutons sont passes
    }
  }


  // ================================================================
  // Le guide du diamant : les trois echelles qui bougent, et le rail.
  // Donnees : echelles GIA, diametres d'un brillant rond standard.
  // ================================================================
  var glisseurCouleur = $('#glisseur-couleur');
  if (glisseurCouleur) {
    var LETTRES = 'DEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    var FAMILLES = [
      [0, 2, 'Incolore', 'Aucune teinte, même sous la loupe du gemmologue. La plus rare.'],
      [3, 6, 'Quasi incolore', 'La teinte ne se voit pas une fois la pierre montée. Le meilleur rapport à la lumière.'],
      [7, 9, 'Teinte faible', 'Une pointe de chaleur, surtout visible sur les grandes pierres.'],
      [10, 14, 'Teinte claire', 'La teinte se voit à l’œil nu sur fond blanc.'],
      [15, 22, 'Teinte visible', 'Jaune ou brun franc. Un autre parti pris, un autre prix.']
    ];
    var majCouleur = function () {
      var i = parseInt(glisseurCouleur.value, 10);
      $('#couleur-lettre').textContent = LETTRES[i];
      $('#couleur-curseur').style.left = ((i + .5) / LETTRES.length * 100) + '%';
      $$('.couleur-lettres li').forEach(function (l, k) { l.classList.toggle('est-la', k === i); });
      var c1 = $('#couleur-c1'), c2 = $('#couleur-c2'), c3 = $('#couleur-c3');
      if (c1 && c2 && c3) { // trois photos de la meme pierre, de plus en plus teintee : K, puis Q, puis Z
        c1.style.opacity = Math.min(1, i / 7); c2.style.opacity = Math.max(0, Math.min(1, (i - 7) / 6)); c3.style.opacity = Math.max(0, Math.min(1, (i - 13) / 9));
      }
      for (var k = 0; k < FAMILLES.length; k++) {
        if (i >= FAMILLES[k][0] && i <= FAMILLES[k][1]) {
          $('#couleur-famille').textContent = FAMILLES[k][2];
          $('#couleur-dit').textContent = FAMILLES[k][3];
          break;
        }
      }
    };
    glisseurCouleur.addEventListener('input', majCouleur);
    // les lettres se touchent aussi : un doigt sur K pose le curseur sur K
    $$('.couleur-lettres li').forEach(function (l, k) {
      l.addEventListener('click', function () { glisseurCouleur.value = k; majCouleur(); });
    });
    majCouleur();
  }

  var glisseurPurete = $('#glisseur-purete');
  if (glisseurPurete) {
    var PURETES = [
      ['FL', 'Flawless', 'Aucune inclusion, aucune trace en surface, à dix fois. Une pierre sur des milliers.', 0],
      ['IF', 'Internally Flawless', 'Rien à l’intérieur. Tout au plus une trace de polissage en surface.', 1],
      ['VVS1', 'Very Very Slightly Included 1', 'Des inclusions que même un gemmologue peine à trouver à dix fois.', 2],
      ['VVS2', 'Very Very Slightly Included 2', 'Très difficiles à voir à dix fois. Invisibles à l’œil nu.', 3],
      ['VS1', 'Very Slightly Included 1', 'Visibles à la loupe avec un peu d’effort. Invisibles à l’œil nu.', 5],
      ['VS2', 'Very Slightly Included 2', 'Visibles à la loupe. Invisibles à l’œil nu : c’est souvent le bon compromis.', 7],
      ['SI1', 'Slightly Included 1', 'Faciles à voir à dix fois. Encore discrètes à l’œil nu.', 10],
      ['SI2', 'Slightly Included 2', 'Évidentes à la loupe, parfois visibles à l’œil nu selon l’endroit.', 14]
    ];
    var boite = $('#inclusions');
    var majPurete = function () {
      var d = PURETES[parseInt(glisseurPurete.value, 10)];
      // trois photos de la meme pierre : VVS, VS, SI, fondues l'une sur l'autre
      var fondu = [[0, 0, 0], [0, 0, 0], [.55, 0, 0], [1, 0, 0], [1, .55, 0], [1, 1, 0], [1, 1, .6], [1, 1, 1]][parseInt(glisseurPurete.value, 10)];
      ['#pur-1', '#pur-2', '#pur-3'].forEach(function (s, k) { var e = $(s); if (e) { e.style.opacity = fondu[k]; } });
      $('#purete-code').textContent = d[0];
      $('#purete-nom').textContent = d[1];
      $('#purete-dit').textContent = d[2];
      Array.prototype.forEach.call(boite.children, function (c, i) { c.classList.toggle('est-la', i < d[3]); });
    };
    glisseurPurete.addEventListener('input', majPurete);
    majPurete();
  }

  var glisseurCarat = $('#glisseur-carat');
  if (glisseurCarat) {
    // poids en carats, diametre reel d'un brillant rond, en millimetres
    var CARATS = [[0.30, 4.3], [0.50, 5.2], [0.70, 5.75], [1.00, 6.5], [1.25, 6.9], [1.50, 7.4], [2.00, 8.2], [2.50, 8.8], [3.00, 9.4]];
    // pixels par millimetre : regle par l'utilisateur avec une vraie piece, sinon estime d'apres le type d'ecran
    var pxParMm = function () {
      var v = 0; try { v = parseFloat(localStorage.getItem('alaya_px_mm')); } catch (e) {}
      if (v >= 3 && v <= 9) { return v; }
      var tactile = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
      return tactile ? (Math.min(screen.width, screen.height) < 500 ? 6.4 : 5.2) : 4.7;
    };
    var majCarat = function () {
      var d = CARATS[parseInt(glisseurCarat.value, 10)];
      var piece = $('.carat-piece'); var k = pxParMm();
      k = Math.min(k, (window.innerWidth - 72) / 32.65); // la piece et la plus grosse pierre tiennent toujours cote a cote
      if (piece) { piece.style.width = piece.style.height = (23.25 * k) + 'px'; }
      var taille = d[1] * k; // meme echelle que la piece de 1 euro (23,25 mm)
      var cercle = $('#carat-cercle');
      cercle.style.width = taille + 'px';
      cercle.style.height = taille + 'px';
      $('#carat-mm').textContent = String(d[1]).replace('.', ',') + ' mm';
      $('#carat-valeur').textContent = d[0].toFixed(2).replace('.', ',');
    };
    var glisseurEchelle = $('#glisseur-echelle'), btnEchelle = $('#btn-echelle');
    if (glisseurEchelle && btnEchelle) {
      glisseurEchelle.value = pxParMm();
      btnEchelle.addEventListener('click', function () { var c = $('#echelle-corps'); c.hidden = !c.hidden; });
      glisseurEchelle.addEventListener('input', function () {
        try { localStorage.setItem('alaya_px_mm', glisseurEchelle.value); } catch (e) {}
        majCarat();
      });
    }
    glisseurCarat.addEventListener('input', majCarat);
    window.addEventListener('resize', majCarat);
    majCarat();
  }

  // le rail suit la lecture
  var rail = $('.guide-rail');
  if (rail && 'IntersectionObserver' in window) {
    var liens = $$('a', rail);
    var oeilRail = new IntersectionObserver(function (entrees) {
      entrees.forEach(function (en) {
        if (!en.isIntersecting) return;
        liens.forEach(function (a) { a.classList.toggle('est-la', a.getAttribute('href') === '#' + en.target.id); });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    $$('.guide-bloc').forEach(function (b) { oeilRail.observe(b); });
    liens.forEach(function (a) {
      a.addEventListener('click', function (e) {
        var cible = document.querySelector(a.getAttribute('href'));
        if (!cible) return;
        e.preventDefault();
        window.scrollTo({ top: cible.getBoundingClientRect().top + window.scrollY - 200, behavior: 'smooth' });
      });
    });
  }

  // le mot par e-mail, sans serveur
  var formContact = $('#form-contact');
  if (formContact) {
    formContact.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = formContact.elements;
      if (!f.nom.value.trim() || !f.email.value.trim() || !f.message.value.trim()) return;
      window.location.href = 'mailto:contact@alayafinejewelry.com?subject=' +
        encodeURIComponent('Message de ' + f.nom.value.trim()) + '&body=' +
        encodeURIComponent(f.message.value.trim() + '\n\n' + f.nom.value.trim() + '\n' + f.email.value.trim());
    });
  }

  // la demande de rendez-vous, par e-mail, sans serveur
  var formRdv = $('#form-rdv');
  if (formRdv) {
    formRdv.addEventListener('submit', function (e) {
      e.preventDefault();
      var f = formRdv.elements;
      if (!f.nom.value.trim() || !f.email.value.trim()) return;
      var corps = 'Bonjour,\n\nJe souhaite prendre rendez-vous.\n\nObjet : ' + f.objet.value +
        '\nDate souhaitée : ' + (f.date.value || 'à convenir') + '\nCréneau : ' + f.moment.value +
        (f.message.value.trim() ? '\n\n' + f.message.value.trim() : '') +
        '\n\n' + f.nom.value.trim() + '\n' + f.email.value.trim() + (f.tel.value.trim() ? '\n' + f.tel.value.trim() : '');
      window.location.href = 'mailto:contact@alayafinejewelry.com?subject=' +
        encodeURIComponent('Rendez-vous, ' + f.objet.value + ' : ' + f.nom.value.trim()) + '&body=' + encodeURIComponent(corps);
    });
  }

  // --- les titres s'ecrivent mot a mot, et Celebrations a son etincelle
  var doux2 = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!doux2) {
    var TITRES = '.block-text h2, .guide-tete h2, .edito-fin h2, .apparentees h2, .rdv-voie h2, .edito-deux h2, .edito-ouverture-texte h1, .block-text-on-full-media h1, .liste-ouverture-texte h1, .commande-fin h1, .contact-form h2, .liste-tete h1';
    $$(TITRES).forEach(function (t) {
      if (t.querySelector('*') && !t.querySelector('.count')) return;   // deja structure : on ne touche pas
      var count = t.querySelector('.count'); var compte = count ? count.outerHTML : '';
      var texte = count ? t.textContent.replace(count.textContent, '') : t.textContent;
      texte = T(texte.replace(/\s+/g, ' ').trim());   // le titre se traduit entier, avant d'etre decoupe en mots
      var mots = texte.trim().split(/\s+/), i = 0;
      t.innerHTML = mots.map(function (m) {
        var brille = /^(C[ée]l[ée]brations|Offrir|Merci|Fian[çc]ailles|Toujours|Diamant|diamant|pierre|lumi[èe]re)/.test(m);
        var cl = 'mot' + (brille ? ' fete' : '');
        var et = brille ? '<i class="etincelle"></i><i class="etincelle etincelle--2"></i><i class="etincelle etincelle--3"></i>' : '';
        return '<span class="' + cl + '" style="--i:' + (i++) + '">' + m + et + '</span>';
      }).join(' ') + (compte ? ' ' + compte : '');
      t.classList.add('ecrit');
    });
    if ('IntersectionObserver' in window) {
      var oeilTitres = new IntersectionObserver(function (es) {
        es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('est-la'); oeilTitres.unobserve(e.target); } });
      }, { threshold: .4 });
      $$('.ecrit').forEach(function (t) { oeilTitres.observe(t); });
    } else { $$('.ecrit').forEach(function (t) { t.classList.add('est-la'); }); }
  }

  // --- pied de page : « S'inscrire » ouvre la lettre de la maison, un panneau ou l'on laisse son adresse.
  // L'adresse part vers le formulaire « newsletter » de l'hebergeur (Netlify Forms) ; si l'envoi echoue, on le dit.
  var lienLettre = $('.fs-news a');
  if (lienLettre) {
    var lettre = null;
    var fermerLettre = function () {
      lettre.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { if (!lettre.classList.contains('is-open')) lettre.hidden = true; }, 380);
    };
    lienLettre.addEventListener('click', function (e) {
      e.preventDefault();
      if (!lettre) {
        lettre = document.createElement('div');
        lettre.className = 'modale modale--lettre';
        lettre.innerHTML = '<div class="modale-boite" role="dialog" aria-modal="true" aria-label="Newsletter">' +
          '<button class="modale-fermer" type="button" aria-label="' + T('Fermer') + '">&#10005;</button>' +
          '<p class="surtitre">Newsletter</p>' +
          '<h2>' + T('La lettre de la maison') + '</h2>' +
          '<p class="lettre-texte">' + T('Les nouvelles pièces et les rendez-vous de l’atelier, par e-mail.') + '</p>' +
          '<form class="lettre-form" novalidate><input type="email" name="email" required autocomplete="email" inputmode="email" placeholder="' + T('Votre adresse e-mail') + '" aria-label="' + T('Votre adresse e-mail') + '">' +
          '<button class="btn-panier" type="submit">' + T("S'inscrire") + '</button></form>' +
          '<p class="lettre-note" role="status">' + T('Votre adresse ne sert qu’à cet envoi. Désinscription à tout moment.') + '</p></div>';
        document.body.appendChild(lettre);
        $('.modale-fermer', lettre).addEventListener('click', fermerLettre);
        lettre.addEventListener('click', function (ev) { if (ev.target === lettre) fermerLettre(); });
        document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && lettre.classList.contains('is-open')) fermerLettre(); });
        $('.lettre-form', lettre).addEventListener('submit', function (ev) {
          ev.preventDefault();
          var champ = $('input', lettre), note = $('.lettre-note', lettre), bouton = $('.btn-panier', lettre);
          if (!champ.value.trim() || !champ.checkValidity()) { note.textContent = T('Cette adresse ne semble pas complète.'); champ.focus(); return; }
          bouton.disabled = true;
          // l'adresse est prise : le panneau devient un mot de remerciement (Merci et son etincelle, un fil d'or, l'adresse relue)
          var merci = function () {
            $('.modale-boite', lettre).classList.add('est-merci');
            $('.lettre-form', lettre).hidden = true;
            $('h2', lettre).innerHTML = '<span class="bp-mot fete">' + T('Merci') + '<i class="etincelle"></i><i class="etincelle etincelle--2"></i></span>';
            $('.lettre-texte', lettre).innerHTML = '<span class="bp-mot">' + T('Votre adresse est enregistrée. La prochaine lettre de la maison vous parviendra.') + '</span>';
            note.innerHTML = '<span class="bp-mot lettre-adresse"></span><button class="lettre-fin bp-mot" type="button">' + T('Continuer') + '</button>';
            $('.lettre-adresse', lettre).textContent = champ.value.trim();
            $('.lettre-fin', lettre).addEventListener('click', fermerLettre);
          };
          // apercu sur l'ordinateur de la maison (fichier ouvert en double-clic) : aucun visiteur ne passe par la, on montre le remerciement
          if (location.protocol === 'file:') return merci();
          var echec = function () {
            bouton.disabled = false;
            note.innerHTML = T('L’inscription n’a pas pu être enregistrée. Écrivez-nous :') + ' <a href="mailto:contact@alayafinejewelry.com?subject=Newsletter&body=' + encodeURIComponent(champ.value.trim()) + '">contact@alayafinejewelry.com</a>';
          };
          fetch('/', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                       body: 'form-name=newsletter&email=' + encodeURIComponent(champ.value.trim()) })
            .then(function (r) {
              if (!r.ok) return echec();
              merci();
            }, echec);
        });
      }
      lettre.hidden = false;
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(function () { requestAnimationFrame(function () { lettre.classList.add('is-open'); }); });
      setTimeout(function () { var c = $('input', lettre); if (c && !$('.lettre-form', lettre).hidden) c.focus(); }, 420);
    });
  }

  traduirePage();
})();

// --- Voir plus d'objets (grille longue)
(function () {
  var btn = document.querySelector('.btn-voir-plus'), grid = document.querySelector('.grid-results[data-page]');
  if (!btn || !grid) return;
  var pas = parseInt(grid.dataset.page, 10) || 24, vus = document.querySelector('.grid-compteur .vus');
  function maj() {
    var caches = grid.querySelectorAll('.product-card.is-more');
    var total = grid.querySelectorAll('.product-card').length;
    if (vus) vus.textContent = total - caches.length;
    if (!caches.length) btn.hidden = true;
  }
  btn.addEventListener('click', function () {
    var caches = grid.querySelectorAll('.is-more'), n = 0;
    for (var i = 0; i < caches.length && n < pas; i++) {
      caches[i].classList.remove('is-more');
      if (caches[i].classList.contains('product-card')) n++;
    }
    maj();
  });
  maj();
})();
(function () {
  var hd = document.querySelector('.header');
  function hdr() { if (hd) document.documentElement.style.setProperty('--hdr', hd.offsetHeight + 'px'); }
  hdr(); addEventListener('resize', hdr); addEventListener('load', hdr);
  var bar = document.querySelector('.topbar');
  if (!bar) return;
  var inner = bar.querySelector('.topbar-inner');
  function tb() { document.documentElement.style.setProperty('--tb', (inner || bar).offsetHeight + 'px'); }
  tb(); addEventListener('resize', tb); addEventListener('load', tb);
  document.addEventListener('mousemove', function (e) {
    var ouvert = bar.querySelector('.topbar-panel:not([hidden])');
    var proche = e.clientY < 40 || (document.documentElement.classList.contains('topbar-vue') && e.clientY < bar.offsetHeight + 10);
    document.documentElement.classList.toggle('topbar-vue', !!(proche || ouvert));
  });
})();
/* telephone : le bas de l'ecran ne coupe jamais rien a l'ouverture d'une page.
   Une image d'ouverture descend jusqu'au bas de l'ecran ; sinon l'espace le plus
   large du premier ecran s'agrandit jusqu'a ce que le bas tombe entre deux elements. */
(function () {
  if (!window.matchMedia) return;
  var mq = matchMedia('(max-width: 900px)');
  var ATOMES = 'img,svg,video,input,select,textarea,button,tr,hr,.product-card,.cta';
  var largeur = 0;

  function haut(r) { return r.top + scrollY; }
  function fixe(el) { for (; el && el !== document.body; el = el.parentElement) { if (getComputedStyle(el).position === 'fixed') return true; } return false; }

  function atomes(H) {
    var zone = document.querySelectorAll('.breadcrumb, main, footer'), out = [];
    zone.forEach(function (z) {
      z.querySelectorAll(ATOMES).forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (r.height && r.width && haut(r) < H + 400 && !el.closest('[hidden]')) out.push([haut(r), haut(r) + r.height, el]);
      });
      var w = document.createTreeWalker(z, NodeFilter.SHOW_TEXT), t, rg = document.createRange();
      while ((t = w.nextNode())) {
        if (!t.nodeValue.trim() || t.parentElement.closest('svg,button,.cta,[hidden]')) continue;
        rg.selectNodeContents(t);
        var rs = rg.getClientRects();
        for (var i = 0; i < rs.length; i++) if (rs[i].height && haut(rs[i]) < H + 400) out.push([haut(rs[i]), haut(rs[i]) + rs[i].height, t.parentElement]);
      }
    });
    return out.filter(function (a) { return !fixe(a[2]); });
  }

  // vrai si l'element est dans une case de grille ou de rangee (y ajouter de l'espace casserait l'alignement)
  function dansRangee(el) {
    for (; el && el.parentElement && !/^(MAIN|BODY)$/.test(el.parentElement.tagName); el = el.parentElement) {
      var cs = getComputedStyle(el.parentElement);
      if (/grid/.test(cs.display) && cs.gridTemplateColumns.split(' ').length > 1) return true;
      if (/flex/.test(cs.display) && !/column/.test(cs.flexDirection) && el.parentElement.children.length > 1) return true;
    }
    return false;
  }

  function propre(y, at) { return at.every(function (a) { return !(a[0] < y - .5 && a[1] > y + .5); }); }

  function reset() {
    document.querySelectorAll('[data-pli-mt]').forEach(function (el) { el.style.marginTop = el.getAttribute('data-pli-mt'); el.removeAttribute('data-pli-mt'); el.removeAttribute('data-pli-gap'); });
    document.querySelectorAll('[data-pli-mb]').forEach(function (el) { el.style.marginBottom = el.getAttribute('data-pli-mb'); el.removeAttribute('data-pli-mb'); });
    document.querySelectorAll('[data-pli]').forEach(function (el) { el.style.height = ''; el.style.aspectRatio = ''; el.style.objectFit = ''; el.style.rowGap = ''; el.removeAttribute('data-pli'); });
  }

  function plier() {
    reset();
    if (!mq.matches) return;
    var H = document.documentElement.clientHeight;
    // l'image d'ouverture : premier bloc de la page, apres le fil d'ariane s'il y en a un
    var premier = document.querySelector('main > :not(.breadcrumb)');
    var img = premier && premier.matches('.block-text-on-full-media') && premier.querySelector('.hero, img');
    // l'image d'ouverture descend jusqu'au bas de l'ecran, sauf si cela la grossirait trop (on ne coupe pas le bijou)
    // elle remplit deja l'ecran par la feuille de style : rien a faire (avant : rognee de 24 px, une bande blanche en bas)
    if (img && Math.abs(haut(img.getBoundingClientRect()) + img.getBoundingClientRect().height - H) < 1.5) return;
    if (img && img.naturalWidth && (H - haut(img.getBoundingClientRect())) / (img.getBoundingClientRect().width * img.naturalHeight / img.naturalWidth) > 1.45) img = null;
    if (img) {
      img.setAttribute('data-pli', '');
      img.style.aspectRatio = 'auto';
      img.style.objectFit = 'cover';
      img.style.height = Math.round(H - haut(img.getBoundingClientRect())) + 'px';
      return;
    }
    var MARGE = 24, MINI = 20;
    var F = H - MARGE;
    // d'abord remonter (prendre sur un grand blanc plus haut), sinon descendre ; chaque essai repart de zero
    rogner();
    if (grille() || (reset(), rogner(), essai(true)) || (reset(), rogner(), essai(false))) return;
    reset(); rogner();

    // une grande photo d'ambiance (deja cadree en "cover") coupee par le bas : elle s'arrete au-dessus de la marge,
    // plutot que de pousser tout le bloc et de laisser un trou. Jamais les photos de bijoux.
    function rogner() {
      var ok = function (el) {
        return el.tagName === 'IMG' && !el.closest('.product-card, .block-category') && getComputedStyle(el).objectFit === 'cover' &&
          (el.getBoundingClientRect().width >= innerWidth * .6 || !!el.closest('.gal-vue--porte'));
      };
      var at = atomes(H).filter(function (a) { return ok(a[2]) && a[0] < H - .5; }).sort(function (x, y) { return x[0] - y[0]; });
      var c = at.filter(function (a) { return a[1] > F + .5; })[0];
      if (!c) return;
      // les photos empilees du meme bloc partagent la reduction (deux tuiles l'une sous l'autre)
      var bloc = c[2].parentElement.parentElement;
      var lot = at.filter(function (a) { return a[0] <= c[0] && a[2].parentElement.parentElement === bloc; });
      var part = (c[1] - F) / lot.length;
      if (lot.some(function (a) { return part > (a[1] - a[0]) * (a[2].closest('.gal-vue--porte') ? .5 : .35) || a[1] - a[0] - part < 160; })) return;
      lot.forEach(function (a) {
        a[2].setAttribute('data-pli', '');
        a[2].style.aspectRatio = 'auto';
        a[2].style.height = (a[1] - a[0] - part) + 'px';
      });
    }

    // une grille de bijoux coupee : le blanc se repartit entre les rangees, calcule une fois, verifie
    function grille() {
      var at = atomes(H), g = null;
      at.some(function (a) {
        if (!(a[0] < H - .5 && a[1] > F + .5)) return false;
        for (var e = a[2]; e && e.tagName !== 'MAIN'; e = e.parentElement) {
          var cs = getComputedStyle(e);
          if (/grid/.test(cs.display) && cs.gridTemplateColumns.split(' ').length > 1) { g = e; return true; }
        }
        return false;
      });
      if (!g) return false;
      var rangs = {};
      Array.prototype.forEach.call(g.children, function (c) {
        var r = c.getBoundingClientRect(); if (!r.height) return;
        var t = Math.round(haut(r)); rangs[t] = Math.max(rangs[t] || 0, haut(r) + r.height);
      });
      var tops = Object.keys(rangs).map(Number).sort(function (x, y) { return x - y; });
      var k = 0; while (k < tops.length && rangs[tops[k]] <= F) k++;
      if (k >= tops.length || tops[k] >= H) return false;
      // la rangee tient presque : la grille remonte un peu sous le titre, la rangee finit au-dessus de la marge
      // elle ne remonte que dans le blanc qui la separe de ce qui est au-dessus (jamais sur un titre ou une etiquette) ;
      // si la marge de 24 px ne tient pas, 12 px suffisent : le prix de la rangee reste entier
      var cs0 = getComputedStyle(g), prec = g.previousElementSibling;
      while (prec && !prec.getClientRects().length) prec = prec.previousElementSibling;
      var libre = (parseFloat(cs0.paddingTop) || 0) + (prec ? Math.max(0, g.getBoundingClientRect().top - prec.getBoundingClientRect().bottom) : 0);
      var besoins = [rangs[tops[k]] - F, rangs[tops[k]] - (H - 12)];
      for (var b = 0; b < besoins.length; b++) {
        var besoin = besoins[b];
        if (besoin > 24 || besoin > libre) continue;
        var mt0 = g.style.marginTop;
        g.style.marginTop = ((parseFloat(cs0.marginTop) || 0) - besoin) + 'px';
        if (atomes(H).every(function (a) { return !(a[0] < H - .5 && a[1] > H + .5); })) { g.setAttribute('data-pli-mt', mt0); return true; }
        g.style.marginTop = mt0;
      }
      if (k < 1) return false;
      var pas = (H - tops[k]) / k;
      if (pas > H * .3 || rangs[tops[k - 1]] + (k - 1) * pas > F) return false;
      g.setAttribute('data-pli', '');
      g.style.rowGap = (parseFloat(getComputedStyle(g).rowGap) || 0) + pas + 'px';
      var at2 = atomes(H);
      return at2.every(function (a) { return !(a[0] < H - .5 && a[1] > H + .5); });
    }

    function essai(remonter) {
      var avant = null;
      for (var tour = 0; tour < 5; tour++) {
        var at = atomes(H).sort(function (a, b) { return a[0] - b[0]; });
        var apres = function (y) { var t = Infinity; at.forEach(function (a) { if (a[0] >= y - .5 && a[1] > y + .5 && a[0] < t) t = a[0]; }); return t; };
        // genant : coupe par le bas de l'ecran, ou fini trop pres du bas alors qu'il y a du blanc apres lui
        var genants = at.filter(function (a) { return (a[0] < H - .5 && a[1] > H + .5) || (a[1] > H - 12 + .5 && a[1] <= H + .5 && apres(a[1]) - a[1] >= MARGE); });
        if (!genants.length) return true;
        var haut1 = Math.min.apply(null, genants.map(function (a) { return a[0]; }));
        if (avant !== null && Math.abs(haut1 - avant) < .5) return false; // le dernier intercalaire n'a rien change
        avant = haut1;
        if (remonter) {
          // le groupe coupe remonte entierement ; rangees serrees : la suivante commence juste sous l'ecran
          var p = null;
          at.forEach(function (a) {
            var z = a[1]; if (z <= F || !propre(z, at)) return;
            var n = apres(z), q = n - z >= MARGE ? z - F : n - H;
            if (q > 0 && (p === null || q < p)) p = q;
          });
          var e1 = p !== null && p < H * .35 && espaces(at, haut1 + .5).filter(function (g) { return g.taille - MINI >= p; }).sort(function (x, y) { return y.taille - x.taille; })[0];
          if (!e1) return false;
          espacer(e1.el, -p);
        } else {
          // le dernier element entier reste, le suivant passe juste sous l'ecran
          var y = 0;
          at.forEach(function (a) { var z = a[1]; if (z <= H && z > y && propre(z, at) && apres(z) < H) y = z; });
          var delta = H - apres(y);
          if (!y || delta <= 0 || delta > H * .5) return false;
          var gs = espaces(at, apres(y) + .5);
          var g = gs.sort(function (x, z) { return z.taille - x.taille; })[0];
          if (!g) return false;
          // un grand deplacement se partage entre tous les blancs du premier ecran : pas de trou
          if (delta > 70 && gs.length > 1) { gs.forEach(function (x) { espacer(x.el, delta / gs.length); }); continue; }
          espacer(g.el, delta);
        }
      }
      return false;
    }
  }

  // les blancs entre deux blocs d'un flux normal, au-dessus de "jusqua", jamais sous l'en-tete ni sous le fil d'ariane
  function espaces(at, jusqua) {
    var pris = at.filter(function (a) { return a[0] < jusqua; });
    if (!pris.length) return [];
    var fil = document.querySelector('.breadcrumb');
    var fin = pris[0][1], out = [], sousFil = -1;
    if (fil && fil.offsetHeight) { sousFil = haut(fil.getBoundingClientRect()) + fil.offsetHeight; fin = Math.max(fin, sousFil); }
    var grande = null;
    pris.forEach(function (a) { if (a[2].tagName === 'IMG' && (!grande || a[1] - a[0] > grande[1] - grande[0])) grande = a; });
    pris.forEach(function (a) {
      if (a[0] < fin - .5) { fin = Math.max(fin, a[1]); return; }
      if (a[0] > fin + 1 && Math.abs(fin - sousFil) > .5) {
        var el = a[2];
        while (el.parentElement && el.parentElement !== document.body && !/^(MAIN|FOOTER)$/.test(el.parentElement.tagName) && haut(el.parentElement.getBoundingClientRect()) >= fin - .5) el = el.parentElement;
        if (el.parentElement && !/^(TABLE|THEAD|TBODY|TFOOT|TR|UL|OL|DL)$/.test(el.parentElement.tagName) && !dansRangee(el) && haut(el.getBoundingClientRect()) >= fin - .5)
          out.push({ el: el, taille: a[0] - fin, apresImage: !!grande && Math.abs(fin - grande[1]) < 40 });
      }
      fin = Math.max(fin, a[1]);
    });
    return out;
  }

  // agrandir (d > 0) ou reduire (d < 0) le blanc juste au-dessus de el, en reglant sa marge
  // (pas d'element ajoute : les regles "bloc + bloc" de la feuille de style restent intactes)
  function espacer(el, d) {
    var prev = el.previousElementSibling;
    while (prev && !prev.getClientRects().length) prev = prev.previousElementSibling;   // un voisin cache (filtres fermes) ne compte pas
    var top = el.getBoundingClientRect().top;
    var gap = prev ? top - prev.getBoundingClientRect().bottom : parseFloat(getComputedStyle(el).marginTop) || 0;
    if (!el.hasAttribute('data-pli-mt')) el.setAttribute('data-pli-mt', el.style.marginTop);
    if (prev) {
      if (!prev.hasAttribute('data-pli-mb')) prev.setAttribute('data-pli-mb', prev.style.marginBottom);
      prev.style.marginBottom = '0px';
    }
    var depart = parseFloat(el.getAttribute('data-pli-gap') || gap);
    el.setAttribute('data-pli-gap', depart);
    var voulu = Math.max(0, gap + d);
    if (Math.abs(voulu - depart) > document.documentElement.clientHeight * .3) return;
    el.style.marginTop = voulu + 'px';
  }

  // on mesure les places definitives : les blocs qui glissent a l'apparition sont tenus immobiles le temps du calcul
  function lancer() {
    largeur = innerWidth;
    var r = document.documentElement;
    r.classList.add('pli-mesure');
    try { plier(); } finally { r.classList.remove('pli-mesure'); }
  }
  if (document.readyState === 'complete') lancer(); else addEventListener('load', lancer);
  if (document.fonts) document.fonts.ready.then(lancer);
  setTimeout(lancer, 1200);
  // la barre d'adresse du telephone change la hauteur en defilant : on ne recalcule qu'au changement de largeur
  addEventListener('resize', function () { if (innerWidth !== largeur) lancer(); });
  window.alayaPli = lancer;
})();
/* telephone : le menu tient dans l'ecran, les lignes se resserrent juste ce qu'il faut */
(function () {
  var nav = document.querySelector('.menu-vertical');
  if (!nav || !window.MutationObserver) return;
  var occupe = false;
  function ajuster() {
    if (occupe) return; occupe = true;
    var liens = nav.querySelectorAll('.mv-vue:not([hidden]) a, .mv-vue:not([hidden]) .mv-vers');
    liens.forEach(function (a) { a.style.paddingTop = a.style.paddingBottom = ''; });
    if (matchMedia('(max-width: 900px)').matches && liens.length) {
      // plusieurs passes : les lignes n'ont pas toutes la meme marge de depart (noms des collections), une seule ne suffisait pas
      for (var tour = 0; tour < 4; tour++) {
        var trop = nav.scrollHeight - nav.clientHeight;
        if (trop <= 0) break;
        var p = Math.max.apply(null, Array.prototype.map.call(liens, function (a) { return parseFloat(getComputedStyle(a).paddingTop) || 0; }));
        if (p <= 7) break;
        var q = Math.max(7, p - Math.ceil(trop / (2 * liens.length))) + 'px';
        liens.forEach(function (a) { a.style.paddingTop = a.style.paddingBottom = q; });
      }
    }
    requestAnimationFrame(function () { occupe = false; });
  }
  new MutationObserver(ajuster).observe(nav, { attributes: true, subtree: true, attributeFilter: ['class', 'hidden'] });
  addEventListener('resize', ajuster);
})();
/* clic sur un lien du site : la page s'efface doucement avant la suivante */
(function () {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || a.target === '_blank' || a.hasAttribute('download')) return;
    var h = a.getAttribute('href');
    if (/^(#|mailto:|tel:|https?:|javascript:)/i.test(h)) return;
    e.preventDefault();
    // pendant que la page s'efface, la suivante se telecharge deja
    if (/^https?:/.test(location.protocol) && window.fetch) fetch(a.href, { credentials: 'same-origin' }).catch(function () {});
    var carte = a.closest('.product-card, .block-category li, .tuiles a');
    if (carte) carte.classList.add('carte-choisie');
    document.body.classList.add('page-part');
    setTimeout(function () { location.href = a.href; }, 480);
  });
  // retour arriere : la page revient visible
  addEventListener('pageshow', function () { document.body.classList.remove('page-part'); document.querySelectorAll('.carte-choisie').forEach(function (c) { c.classList.remove('carte-choisie'); }); });
})();
/* telephone : les bijoux d'une grille apparaissent en douceur quand ils entrent dans l'ecran */
(function () {
  if (!window.IntersectionObserver || !matchMedia('(max-width: 900px)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var oeil = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('carte-la'); oeil.unobserve(e.target); } });
  }, { rootMargin: '0px 0px -6% 0px' });
  document.querySelectorAll('.grid-results .product-card, .block-category li').forEach(function (c) { c.classList.add('carte-anim'); oeil.observe(c); });
})();
/* un rayon vide n'affiche pas "(0)" a cote de son titre */
(function () {
  document.querySelectorAll('h1 .count').forEach(function (c) { if (/^\(0\)$/.test(c.textContent.trim())) c.hidden = true; });
})();

/* telephone : les photos d'une piece se feuillettent ; des points disent combien il y en a et laquelle on regarde */
(function () {
  document.querySelectorAll('.page-fiche .gal-groupe').forEach(function (g) {
    var n = g.querySelectorAll('.gal-vue').length;
    if (n < 2) return;
    var pts = document.createElement('div');
    pts.className = 'gal-points';
    pts.setAttribute('aria-hidden', 'true');
    pts.innerHTML = new Array(n + 1).join('<i></i>');
    g.after(pts);
    function marquer() {
      var k = Math.round(g.scrollLeft / (g.clientWidth || 1));
      Array.prototype.forEach.call(pts.children, function (p, i) { p.classList.toggle('is-on', i === k); });
    }
    g.addEventListener('scroll', marquer, { passive: true });
    marquer();
  });
})();

/* iPhone : sans ecouteur tactile, Safari n'applique pas :active ; avec, chaque bouton repond sous le doigt */
document.addEventListener('touchstart', function () {}, { passive: true });

/* la page suivante se precharge des que la souris ou le doigt s'attarde sur un lien (navigateurs qui le permettent) :
   au clic elle est deja la. Seul le document est precharge, ses animations d'arrivee restent intactes. */
(function () {
  if (!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('speculationrules'))) return;
  var s = document.createElement('script');
  s.type = 'speculationrules';
  s.textContent = JSON.stringify({ prefetch: [{ where: { href_matches: '/*' }, eagerness: 'moderate' }] });
  document.head.appendChild(s);
})();
