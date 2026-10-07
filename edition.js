/* Mode edition : taper "alaya" puis Entree n'importe ou sur la page (hors champ de saisie).
   Tous les textes deviennent modifiables, chaque image carree a une poignee de redimensionnement
   en bas a droite. Les modifications restent dans ce navigateur (localStorage, une cle par page)
   et "Telecharger" donne le fichier HTML de la page avec les modifications dedans. */
(function () {
  var CLE = 'alaya', tampon = '', actif = false, barre = null;
  var MAGASIN = 'alaya-edition:' + location.pathname;
  var TEXTES = 'h1,h2,h3,h4,h5,p,li,span,a,button,figcaption,dt,dd,td,th,label,summary,legend,b,strong,em,small,blockquote,option';
  var IMAGES = 'main img';
  var sauve = {};
  try { sauve = JSON.parse(localStorage.getItem(MAGASIN) || '{}'); } catch (e) {}
  if (!sauve.t) sauve.t = {};
  if (!sauve.i) sauve.i = {};

  /* adresse stable d'un element : indices parmi les enfants, depuis body */
  function chemin(el) {
    var c = [];
    while (el && el !== document.body) {
      var p = el.parentElement, i = 0, n = el;
      while ((n = n.previousElementSibling)) i++;
      c.unshift(i); el = p;
    }
    return c.join('.');
  }
  function resoudre(ch) {
    var el = document.body, parts = ch === '' ? [] : ch.split('.');
    for (var k = 0; k < parts.length && el; k++) el = el.children[parts[k]];
    return el || null;
  }
  function ecrire() { try { localStorage.setItem(MAGASIN, JSON.stringify(sauve)); } catch (e) {} }

  /* application de ce qui a ete sauve, a chaque ouverture de la page */
  Object.keys(sauve.t).forEach(function (ch) { var el = resoudre(ch); if (el) el.innerHTML = sauve.t[ch]; });
  Object.keys(sauve.i).forEach(function (ch) {
    var el = resoudre(ch); if (!el) return;
    el.style.width = sauve.i[ch][0] + 'px'; el.style.height = sauve.i[ch][1] + 'px'; el.style.maxWidth = 'none';
  });

  var css = document.createElement('style'); css.id = 'edition-style';
  css.textContent =
    '[data-edition] [contenteditable="true"]{outline:1px dashed #c9b37a;outline-offset:2px;min-width:1ch;cursor:text}' +
    '[data-edition] [contenteditable="true"]:focus{outline:1px solid #111}' +
    '.edition-poignee{position:absolute;width:16px;height:16px;background:#fff;border:1px solid #111;cursor:nwse-resize;z-index:50;box-sizing:border-box}' +
    '.edition-poignee:after{content:"";position:absolute;right:3px;bottom:3px;width:6px;height:6px;border-right:1px solid #111;border-bottom:1px solid #111}' +
    '.edition-barre{position:fixed;left:0;right:0;bottom:0;z-index:1000;display:flex;align-items:center;gap:18px;padding:12px 24px;background:#fff;border-top:1px solid #111;font:500 11px/1 var(--font-mono,monospace);letter-spacing:.18em;text-transform:uppercase;color:#111}' +
    '.edition-barre button{font:inherit;letter-spacing:inherit;text-transform:inherit;background:none;border:0;padding:0;color:#111;cursor:pointer;text-decoration:underline;text-underline-offset:4px}' +
    '.edition-barre .edition-nom{margin-right:auto;text-decoration:none}' +
    '[data-edition] body,[data-edition] main{padding-bottom:60px}';
  document.head.appendChild(css);

  function editables() {
    var out = [];
    document.querySelectorAll(TEXTES).forEach(function (el) {
      if (el.closest('.edition-barre,script,style')) return;
      var direct = false;
      for (var n = el.firstChild; n; n = n.nextSibling) if (n.nodeType === 3 && n.nodeValue.trim()) { direct = true; break; }
      if (!direct) return;
      if (el.parentElement && el.parentElement.closest('[contenteditable="true"]')) return;
      out.push(el);
    });
    return out;
  }

  function poignee(img) {
    var parent = img.parentElement;
    if (getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    if (getComputedStyle(parent).display === 'inline') parent.style.display = 'inline-block';
    var h = document.createElement('div');
    h.className = 'edition-poignee';
    h.setAttribute('contenteditable', 'false');
    parent.appendChild(h);
    function placer() {
      h.style.left = (img.offsetLeft + img.offsetWidth - 16) + 'px';
      h.style.top = (img.offsetTop + img.offsetHeight - 16) + 'px';
    }
    placer();
    h.addEventListener('pointerdown', function (e) {
      e.preventDefault(); e.stopPropagation();
      var x0 = e.clientX, y0 = e.clientY, w0 = img.offsetWidth, h0 = img.offsetHeight;
      img.style.maxWidth = 'none';
      function bouge(ev) {
        var w = Math.max(40, w0 + ev.clientX - x0), hh = Math.max(40, h0 + ev.clientY - y0);
        if (ev.shiftKey) hh = w;
        img.style.width = w + 'px'; img.style.height = hh + 'px';
        placer();
      }
      function fin() {
        window.removeEventListener('pointermove', bouge); window.removeEventListener('pointerup', fin);
        sauve.i[chemin(img)] = [img.offsetWidth, img.offsetHeight]; ecrire(); placer();
      }
      window.addEventListener('pointermove', bouge); window.addEventListener('pointerup', fin);
    });
    h._placer = placer;
    return h;
  }

  function bloquerLiens(e) {
    if (!actif) return;
    var a = e.target.closest && e.target.closest('a[href]:not([download])');
    if (a) e.preventDefault();
  }
  function surSaisie(e) {
    var el = e.target.closest && e.target.closest('[contenteditable="true"]');
    if (!el) return;
    sauve.t[chemin(el)] = el.innerHTML; ecrire();
  }

  function entrer() {
    actif = true;
    document.documentElement.setAttribute('data-edition', '');
    editables().forEach(function (el) { el.setAttribute('contenteditable', 'true'); });
    document.querySelectorAll(IMAGES).forEach(function (img) { if (img.offsetWidth > 0) poignee(img); });
    document.addEventListener('click', bloquerLiens, true);
    document.addEventListener('input', surSaisie, true);
    window.addEventListener('resize', replacer);
    barre = document.createElement('div');
    barre.className = 'edition-barre';
    barre.innerHTML = '<span class="edition-nom">Mode édition</span>' +
      '<button type="button" data-act="telecharger">Télécharger la page</button>' +
      '<button type="button" data-act="retablir">Rétablir</button>' +
      '<button type="button" data-act="quitter">Quitter</button>';
    barre.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b) return;
      if (b.dataset.act === 'quitter') sortir();
      if (b.dataset.act === 'retablir' && confirm('Effacer toutes les modifications de cette page ?')) { localStorage.removeItem(MAGASIN); location.reload(); }
      if (b.dataset.act === 'telecharger') telecharger();
    });
    document.body.appendChild(barre);
  }
  function replacer() { document.querySelectorAll('.edition-poignee').forEach(function (h) { h._placer && h._placer(); }); }
  function sortir() {
    actif = false;
    document.documentElement.removeAttribute('data-edition');
    document.querySelectorAll('[contenteditable="true"]').forEach(function (el) { el.removeAttribute('contenteditable'); });
    document.querySelectorAll('.edition-poignee').forEach(function (h) { h.remove(); });
    document.removeEventListener('click', bloquerLiens, true);
    document.removeEventListener('input', surSaisie, true);
    window.removeEventListener('resize', replacer);
    if (barre) barre.remove(); barre = null;
  }
  function telecharger() {
    var doc = document.documentElement.cloneNode(true);
    doc.removeAttribute('data-edition');
    doc.querySelectorAll('.edition-barre,.edition-poignee,#edition-style').forEach(function (n) { n.remove(); });
    doc.querySelectorAll('[contenteditable]').forEach(function (n) { n.removeAttribute('contenteditable'); });
    var html = '<!DOCTYPE html>\n' + doc.outerHTML;
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    a.download = (location.pathname.split('/').pop() || 'index.html').replace(/^$/, 'index.html');
    document.body.appendChild(a); a.click(); a.remove();
  }

  document.addEventListener('keydown', function (e) {
    var t = e.target;
    if (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.key === 'Escape' && actif) { sortir(); return; }
    if (e.key === 'Enter') { if (tampon.slice(-CLE.length) === CLE) { e.preventDefault(); actif ? sortir() : entrer(); } tampon = ''; return; }
    if (e.key.length === 1) tampon = (tampon + e.key.toLowerCase()).slice(-20);
  });
})();
