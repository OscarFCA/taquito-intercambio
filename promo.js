/* =========================================================
   PROMOCIÓN POR COMPARTIR + ENVÍO DE POSTAL POR ENLACE
   Lo usan la landing (/postal/) y la página de quien recibe (/p/…).
   ========================================================= */
(function () {
  'use strict';
  var D = document, W = window;
  var API = 'https://eltaquito.com.mx/api/';
  var CUENTA = 'eltaquitotaurino';
  var TQ = W.TQ || {};
  var BASE = TQ.origen ? '/postal/' : '';            // en /p/ las imágenes viven en /postal/
  var app = D.getElementById('promoApp');
  function $(id) { return D.getElementById(id); }
  function postalActual() { return TQ.postal || (typeof cur !== 'undefined' ? cur : ''); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }

  /* ---------- 1. Bloque de la promoción ---------- */
  if (app) {
    app.innerHTML =
      '<div class="pr-in">' +
      '<div class="eyebrow">Paso 3 · Tu premio por compartir</div>' +
      '<h2>Comparte tu postal y elige tu premio</h2>' +
      '<div class="pr-opc" role="radiogroup" aria-label="Elige tu promoción">' +
      '<label class="pr-card"><input type="radio" name="tqPromo" value="2x1"><b>2×1</b><span>EN BEBIDAS</span><em data-q="2x1">&nbsp;</em></label>' +
      '<label class="pr-card"><input type="radio" name="tqPromo" value="10"><b>10%</b><span>EN TU CONSUMO</span><em data-q="10">&nbsp;</em></label>' +
      '</div>' +
      '<ol class="pr-pasos">' +
      '<li><i>1</i><div><b>Comparte tu postal en tu historia</b> de Instagram, Facebook o TikTok y <b>etiquétanos @' + CUENTA + '</b>.<br>' +
      '<button type="button" class="pr-story" id="prStory">Descargar imagen para mi historia</button></div></li>' +
      '<li><i>2</i><div><b>Avísanos aquí</b> con tu usuario y el premio que elegiste.</div></li>' +
      '<li><i>3</i><div><b>Te mandamos tu ticket digital</b> por mensaje. Muéstralo a tu mesero de lunes a viernes.</div></li>' +
      '</ol>' +
      '<form class="pr-form" id="prForm" novalidate>' +
      '<select id="prRed" aria-label="Red social"><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="tiktok">TikTok</option></select>' +
      '<input id="prUser" type="text" placeholder="@tu_usuario" maxlength="50" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Tu usuario">' +
      '<button class="btn btn-rojo" type="submit">Ya compartí · Quiero mi ticket</button>' +
      '</form>' +
      '<p class="pr-msg" id="prMsg" hidden></p>' +
      '<ul class="pr-cond"><li>Una promoción por persona</li><li>Lunes a viernes</li><li>Hasta agotar existencias</li><li>Vigencia al 28 de febrero de 2027</li></ul>' +
      '<p class="pr-legal">Usamos tu usuario solo para revisar tu historia y enviarte tu ticket.</p>' +
      '</div>';

    var radios = app.querySelectorAll('input[name=tqPromo]');
    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener('change', function () {
        Array.prototype.forEach.call(radios, function (x) { x.parentNode.classList.toggle('sel', x.checked); });
      });
    });

    /* Existencias en vivo */
    fetch(API + 'stock.php').then(function (r) { return r.json(); }).then(function (d) {
      Object.keys(d.promos || {}).forEach(function (k) {
        var q = d.promos[k].quedan, em = app.querySelector('[data-q="' + k + '"]');
        if (!em) return;
        if (q <= 0) {
          em.textContent = 'AGOTADO';
          var lab = em.parentNode, inp = lab.querySelector('input');
          lab.classList.add('agotado'); inp.disabled = true; inp.checked = false; lab.classList.remove('sel');
        } else em.textContent = q <= 30 ? '¡QUEDAN ' + q + '!' : 'DISPONIBLE';
      });
    }).catch(function () {
      Array.prototype.forEach.call(app.querySelectorAll('[data-q]'), function (e) { e.textContent = 'DISPONIBLE'; });
    });

    /* Pedir el ticket */
    var form = $('prForm'), msg = $('prMsg');
    function decir(t, ok) { msg.textContent = t; msg.className = 'pr-msg ' + (ok ? 'ok' : 'error'); msg.hidden = false; }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var sel = app.querySelector('input[name=tqPromo]:checked');
      var usuario = $('prUser').value.trim();
      if (!sel) return decir('Elige tu premio: 2×1 en bebidas o 10% en tu consumo.');
      if (usuario.replace('@', '').length < 2) { $('prUser').focus(); return decir('Escribe tu usuario tal como aparece en tu perfil.'); }
      var btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Enviando…';
      fetch(API + 'solicitud.php', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ red: $('prRed').value, usuario: usuario, promo: sel.value, postal: postalActual(), origen: TQ.origen || '' })
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (d.ok) {
          decir('¡Listo! ' + d.mensaje, true);
          form.hidden = true;
          if (typeof W.fxRafaga === 'function') W.fxRafaga(msg);
        } else decir(d.error || 'No pudimos registrar tu solicitud. Intenta de nuevo.');
      }).catch(function () { decir('No hay conexión. Intenta de nuevo en un momento.'); })
        .then(function () { btn.disabled = false; btn.textContent = 'Ya compartí · Quiero mi ticket'; });
    });

    /* ---------- 2. Imagen vertical para la historia ---------- */
    var historiaLista = null, fuenteLista = '';
    function fuenteHistoria() {
      if (TQ.historia) return TQ.historia;
      var pv = D.querySelector('#preview img');
      if (pv) return pv.src;
      return BASE + 'img/frente-' + (postalActual() || '06') + '.jpg';
    }
    function cargar(src) {
      return new Promise(function (ok, no) { var im = new Image(); im.crossOrigin = 'anonymous'; im.onload = function () { ok(im); }; im.onerror = no; im.src = src; });
    }
    function prepararHistoria() {
      var src = fuenteHistoria();
      if (src === fuenteLista && historiaLista) return historiaLista;
      fuenteLista = src;
      historiaLista = Promise.all([
        cargar(src), cargar(BASE + 'img/logo-crema.png').catch(function () { return null; }),
        D.fonts ? Promise.all([D.fonts.load('700 80px Oswald'), D.fonts.load('italic 40px Lora'), D.fonts.load('700 30px Montserrat')]).catch(function () { }) : null
      ]).then(function (r) { return dibujarHistoria(r[0], r[1]); });
      historiaLista.catch(function () { historiaLista = null; });
      return historiaLista;
    }
    function dibujarHistoria(foto, logo) {
      var Wd = 1080, Hd = 1920, c = D.createElement('canvas'); c.width = Wd; c.height = Hd;
      var x = c.getContext('2d');
      var g = x.createRadialGradient(Wd / 2, 760, 100, Wd / 2, 900, 1300);
      g.addColorStop(0, '#46604a'); g.addColorStop(.55, '#354A39'); g.addColorStop(1, '#1d2a20');
      x.fillStyle = g; x.fillRect(0, 0, Wd, Hd);
      x.fillStyle = 'rgba(234,221,182,.08)';
      for (var i = 0; i < Wd; i += 9) for (var j = 0; j < Hd; j += 9) x.fillRect(i, j, 2, 2);
      x.fillStyle = '#B52E2B'; x.beginPath(); x.arc(Wd - 60, 300, 230, 0, 7); x.fill();
      x.textAlign = 'center'; x.textBaseline = 'alphabetic';
      if (logo) { var lw = 330, lh = logo.height * lw / logo.width; x.drawImage(logo, Wd / 2 - lw / 2, 230, lw, lh); }
      x.fillStyle = '#EADDB6'; x.font = '700 30px Montserrat';
      if ('letterSpacing' in x) x.letterSpacing = '9px';
      x.fillText('INTERCAMBIO CON SABOR', Wd / 2, 470);
      if ('letterSpacing' in x) x.letterSpacing = '0px';
      x.font = '700 100px Oswald'; x.fillText('ESTA HISTORIA', Wd / 2, 600); x.fillText('CONTINÚA CONMIGO', Wd / 2, 710);
      /* La postal, con marco blanco y un poco girada */
      var pw = 920, ph = Math.round(pw * foto.height / foto.width); if (ph > 760) { ph = 760; pw = Math.round(ph * foto.width / foto.height); }
      x.save(); x.translate(Wd / 2, 790 + ph / 2 + 24); x.rotate(-0.035);
      x.shadowColor = 'rgba(0,0,0,.45)'; x.shadowBlur = 50; x.shadowOffsetY = 24;
      x.fillStyle = '#fff'; x.fillRect(-pw / 2 - 24, -ph / 2 - 24, pw + 48, ph + 48);
      x.shadowColor = 'transparent'; x.drawImage(foto, -pw / 2, -ph / 2, pw, ph); x.restore();
      var y = 790 + ph + 48 + 150;
      x.fillStyle = '#EADDB6'; x.font = 'italic 40px Lora'; x.fillText('Desde 1917, las mejores historias', Wd / 2, y); x.fillText('se comparten alrededor de una mesa.', Wd / 2, y + 54);
      x.font = '700 76px Oswald'; x.fillStyle = '#fff'; x.fillText('@' + CUENTA, Wd / 2, y + 190);
      x.font = '700 34px Montserrat'; x.fillStyle = '#E7A33E'; x.fillText('#IntercambioConSabor', Wd / 2, y + 248);
      return new Promise(function (ok) { c.toBlob(function (b) { ok(new File([b], 'mi-postal-el-taquito.jpg', { type: 'image/jpeg' })); }, 'image/jpeg', .9); });
    }
    function bajar(f) {
      var u = URL.createObjectURL(f), a = D.createElement('a');
      a.href = u; a.download = f.name; D.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(u); }, 4000);
    }
    var bStory = $('prStory');
    /* Se prepara antes de tocar para que el botón comparta al instante (iPhone lo exige) */
    if ('IntersectionObserver' in W) new IntersectionObserver(function (es) { if (es[0].isIntersecting) prepararHistoria(); }).observe(app);
    var pv = $('preview'); if (pv) new MutationObserver(function () { historiaLista = null; }).observe(pv, { childList: true });
    bStory.addEventListener('click', function () {
      var listo = historiaLista;
      if (!listo) { bStory.textContent = 'Preparando tu imagen…'; prepararHistoria(); }
      (listo || historiaLista).then(function (f) {
        bStory.textContent = 'Descargar imagen para mi historia';
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f] }).catch(function (e) { if (e && e.name === 'NotAllowedError') bajar(f); });
        } else bajar(f);
        if (navigator.clipboard) navigator.clipboard.writeText('@' + CUENTA + ' #IntercambioConSabor').catch(function () { });
        aviso('Copiamos @' + CUENTA + ' para que nos etiquetes');
      }).catch(function () { bStory.textContent = 'Descargar imagen para mi historia'; aviso('No pudimos preparar la imagen. Intenta de nuevo.'); });
    });
  }

  /* ---------- 3. Enviar mi postal por enlace (solo en la landing) ---------- */
  var bEnviar = $('enviarPostal'), envio = $('envio');
  if (bEnviar && envio) {
    var enlace = null, imgSubida = '';
    var pv2 = $('preview');
    if (pv2) new MutationObserver(function () { enlace = null; envio.hidden = true; }).observe(pv2, { childList: true });
    bEnviar.addEventListener('click', function () {
      var im = D.querySelector('#preview img');
      if (!im) { aviso('Primero crea tu postal con tu foto'); var fl = $('file'); if (fl) fl.click(); return; }
      if (enlace && imgSubida === im.src) { mostrar(enlace); return; }
      bEnviar.disabled = true; bEnviar.textContent = 'Preparando tu enlace…';
      fetch(im.src).then(function (r) { return r.blob(); }).then(function (b) {
        var fd = new FormData();
        fd.append('imagen', b, 'postal.jpg');
        fd.append('para', ($('para') || {}).value || '');
        fd.append('de', ($('de') || {}).value || '');
        fd.append('postal', postalActual());
        return fetch(API + 'postal.php', { method: 'POST', body: fd });
      }).then(function (r) { return r.json(); }).then(function (d) {
        if (!d.url) throw new Error(d.error || 'error');
        enlace = d.url; imgSubida = im.src; mostrar(enlace);
      }).catch(function (e) {
        aviso(e && e.message && e.message !== 'error' && e.message.indexOf('fetch') < 0 ? e.message : 'No pudimos crear el enlace. Revisa tu conexión.');
      }).then(function () { bEnviar.disabled = false; bEnviar.textContent = 'Enviar mi postal'; });
    });
    function mostrar(url) {
      var para = (($('para') || {}).value || '').trim();
      var texto = (para ? para + ', te' : 'Te') + ' mandé una postal de El Taquito 💌 Ábrela y descárgala aquí: ' + url;
      envio.innerHTML = '<b>Tu postal ya tiene enlace</b>' +
        '<div class="link"><input readonly value="' + url + '" aria-label="Enlace de tu postal"></div>' +
        '<div class="acc">' +
        (navigator.share ? '<button type="button" data-a="share">Compartir enlace</button>' : '') +
        '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texto) + '">WhatsApp</a>' +
        '<button type="button" data-a="copy">Copiar enlace</button></div>' +
        '<small>Quien lo abra verá su postal, podrá descargarla y ganar su 2×1 o 10%.</small>';
      envio.hidden = false;
      envio.querySelector('[data-a=copy]').onclick = function () {
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { aviso('Enlace copiado'); }, function () { envio.querySelector('input').select(); });
      };
      var sh = envio.querySelector('[data-a=share]');
      if (sh) sh.onclick = function () { navigator.share({ title: 'Una postal de El Taquito', text: texto }).catch(function () { }); };
    }
  }
})();
