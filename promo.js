/* =========================================================
   PROMOCIÓN POR COMPARTIR + ENVÍO DE POSTAL POR ENLACE
   Lo usan la landing (/postal/) y la página de quien recibe (/p/…).
   ========================================================= */
(function () {
  'use strict';
  var D = document, W = window;
  var API = 'https://eltaquito.com.mx/api/';
  var CUENTA = 'eltaquitotaurino';
  var WA_NUM = '525554327820';   /* WhatsApp de Rafa: aquí llegan las capturas */
  var TQ = W.TQ || {};
  var BASE = TQ.origen ? '/postal/' : '';            // en /p/ las imágenes viven en /postal/
  var app = D.getElementById('promoApp');
  var REF = (function () { try { var r = new URLSearchParams(location.search).get('origen') || ''; return /^[A-Z0-9]{6}$/.test(r) ? r : ''; } catch (e) { return ''; } })();
  function $(id) { return D.getElementById(id); }
  function postalActual() { return TQ.postal || (typeof cur !== 'undefined' ? cur : ''); }
  function aviso(t) { if (typeof toast === 'function') toast(t); else alert(t); }

  /* ---------- 1. Bloque de la promoción ---------- */
  if (app) {
    app.innerHTML =
      '<div class="pr-in">' +
      '<div class="eyebrow">¡Sorpresa! · Tu premio por compartir</div>' +
      '<h2>Comparte tu postal y elige tu premio</h2>' +
      '<div class="pr-opc" role="radiogroup" aria-label="Elige tu promoción">' +
      '<label class="pr-card"><input type="radio" name="tqPromo" value="2x1"><b>2×1</b><span>EN BEBIDAS</span></label>' +
      '<label class="pr-card"><input type="radio" name="tqPromo" value="10"><b>10%</b><span>EN TU CONSUMO</span></label>' +
      '</div>' +
      '<ol class="pr-pasos">' +
      '<li><i>1</i><div><b>Comparte tu postal personalizada en tu historia</b> de Instagram, Facebook o TikTok y <b>etiquétanos @' + CUENTA + '</b>.<br>' +
      '<button type="button" class="pr-story" id="prStory">Compartir mi postal en redes</button></div></li>' +
      '<li><i>2</i><div><b>Toma una captura</b> de tu historia ya publicada.</div></li>' +
      '<li><i>3</i><div><b>Mándanos la captura por WhatsApp</b> con el cupón que elegiste. Te confirmamos tu cupón por ahí; muéstralo a tu mesero de lunes a viernes.</div></li>' +
      '</ol>' +
      '<a class="pr-wa" id="prWa" href="https://wa.me/' + WA_NUM + '" target="_blank" rel="noopener">' +
      '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.3-.4.8-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3 1 2.6 1.1 2.8.1.2 1.9 2.9 4.6 4 1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>' +
      'Enviar mi captura por WhatsApp</a>' +
      '<p class="pr-msg" id="prMsg" hidden></p>' +
      '<p class="pr-nota">Cuando se abra el chat, adjunta la captura de tu historia con el clip 📎 y envía el mensaje.</p>' +
      '<ul class="pr-cond"><li>Una promoción por persona</li><li>Lunes a viernes</li><li>Hasta agotar existencias</li><li>Vigencia al 28 de febrero de 2027</li></ul>' +
      '</div>';

    var radios = app.querySelectorAll('input[name=tqPromo]');
    Array.prototype.forEach.call(radios, function (r) {
      r.addEventListener('change', function () {
        Array.prototype.forEach.call(radios, function (x) { x.parentNode.classList.toggle('sel', x.checked); });
      });
    });

    /* Mandar la captura por WhatsApp con el cupón elegido */
    var msg = $('prMsg'), bWa = $('prWa');
    function decir(t, ok) { msg.textContent = t; msg.className = 'pr-msg ' + (ok ? 'ok' : 'error'); msg.hidden = false; }
    function mensajeWa(promo) {
      var de = (($('de') || {}).value || '').trim(), n = postalActual();
      return '¡Hola! Ya compartí mi postal de El Taquito en mi historia y los etiqueté en @' + CUENTA + ' 🎉\n' +
        'Elegí mi cupón: *' + promo + '*.\n' +
        'Te adjunto la captura de mi historia.' +
        (n ? '\nPostal N.º ' + n : '') + (de ? '\nMi nombre: ' + de : '');
    }
    bWa.addEventListener('click', function (e) {
      var sel = app.querySelector('input[name=tqPromo]:checked');
      if (!sel) {
        e.preventDefault();
        decir('Primero elige tu cupón: 2×1 en bebidas o 10% en tu consumo.');
        app.querySelector('.pr-opc').scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      var nombre = sel.value === '2x1' ? '2×1 en bebidas' : '10% de descuento en mi consumo';
      bWa.href = 'https://wa.me/' + WA_NUM + '?text=' + encodeURIComponent(mensajeWa(nombre));
      decir('¡Listo! No olvides adjuntar la captura de tu historia en el chat.', true);
      if (typeof W.fxRafaga === 'function') W.fxRafaga(bWa);
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
    W.tqPrepararHistoria = prepararHistoria;
    var pv = $('preview'); if (pv) new MutationObserver(function () { historiaLista = null; }).observe(pv, { childList: true });
    bStory.addEventListener('click', function () {
      var listo = historiaLista;
      if (!listo) { bStory.textContent = 'Preparando tu imagen…'; prepararHistoria(); }
      (listo || historiaLista).then(function (f) {
        bStory.textContent = 'Compartir mi postal en redes';
        if (navigator.canShare && navigator.canShare({ files: [f] })) {
          navigator.share({ files: [f] }).catch(function (e) { if (e && e.name === 'NotAllowedError') bajar(f); });
        } else bajar(f);
        if (navigator.clipboard) navigator.clipboard.writeText('@' + CUENTA + ' #IntercambioConSabor').catch(function () { });
        aviso('Copiamos @' + CUENTA + ' para que nos etiquetes');
      }).catch(function () { bStory.textContent = 'Compartir mi postal en redes'; aviso('No pudimos preparar la imagen. Intenta de nuevo.'); });
    });
  }

  /* ---------- 3. Enviar mi postal por enlace: se prepara sola al revelarse ---------- */
  var envio = $('envio');
  if (envio) {
    var enlace = null, imgSubida = '', subiendo = false;
    var pv2 = $('preview');
    if (pv2) new MutationObserver(function () { enlace = null; envio.hidden = true; }).observe(pv2, { childList: true });
    function nombrePara() { return (($('para') || {}).value || '').trim(); }
    function titulo() { var p = nombrePara(); return p ? '¿Quieres mandársela a ' + esc(p) + '?' : '¿Quieres mandar tu postal?'; }
    W.tqEnlace = function () {
      var im = D.querySelector('#preview img');
      if (!im || subiendo) return;
      if (enlace && imgSubida === im.src) { mostrar(enlace); return; }
      subiendo = true;
      envio.innerHTML = '<b>' + titulo() + '</b><p class="cargando">Preparando tu enlace…</p>';
      envio.hidden = false;
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
        var t = e && e.message && e.message !== 'error' && e.message.indexOf('fetch') < 0 ? e.message : 'No pudimos crear el enlace. Revisa tu conexión.';
        envio.innerHTML = '<b>No se pudo preparar el enlace</b><p class="cargando">' + esc(t) + '</p><div class="acc"><button type="button" data-a="retry">Intentar de nuevo</button></div>';
        envio.querySelector('[data-a=retry]').onclick = W.tqEnlace;
      }).then(function () { subiendo = false; });
    };
    function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function mostrar(url) {
      var para = nombrePara();
      var texto = (para ? para + ', te' : 'Te') + ' mandé una postal de El Taquito 💌 Ábrela y descárgala aquí: ' + url;
      envio.innerHTML = '<b>' + titulo() + '</b><p class="cargando-no">Mándale tu postal también por mensaje.</p>' +
        '<div class="acc">' +
        '<a class="wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(texto) + '">Enviar por WhatsApp</a>' +
        (navigator.share ? '<button type="button" data-a="share">Compartir</button>' : '') +
        '<button type="button" data-a="copy">Copiar enlace</button></div>' +
        '<div class="link"><input readonly value="' + url + '" aria-label="Enlace de tu postal"></div>' +
        '<small>Le llega un enlace donde verá su postal y podrá descargarla.</small>';
      envio.hidden = false;
      envio.querySelector('[data-a=copy]').onclick = function () {
        (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(function () { aviso('Enlace copiado'); }, function () { envio.querySelector('input').select(); });
      };
      var sh = envio.querySelector('[data-a=share]');
      if (sh) sh.onclick = function () { navigator.share({ title: 'Una postal de El Taquito', text: texto }).catch(function () { }); };
    }
  }
  /* ---------- 4. Recorrido: crea tu postal y descubre la sorpresa ---------- */
  var cz = $('cz');
  if (cz) {
    var pasos = cz.querySelectorAll('.cz-step'), paso = 0, esperando = false;
    var paso3 = cz.querySelector('[data-s="3"]'), oscuro = $('czDark'), prev = $('preview');
    function ir(n) {
      paso = +n;
      Array.prototype.forEach.call(pasos, function (p) { p.classList.toggle('cz-on', +p.dataset.s === paso); });
      var top = $('crea').getBoundingClientRect().top + W.scrollY - 76;
      if (Math.abs(W.scrollY - top) > 60) W.scrollTo({ top: top, behavior: 'smooth' });
      if (paso === 2) setTimeout(function () { var p = $('para'); if (p && !p.value) p.focus({ preventScroll: true }); }, 450);
      if (typeof ScrollTrigger !== 'undefined') setTimeout(function () { ScrollTrigger.refresh(); }, 600);
    }
    cz.addEventListener('click', function (e) {
      var b = e.target.closest('[data-go]'); if (!b || b.disabled) return;
      ir(b.dataset.go);
      if (b.classList.contains('cz-cta') && (typeof userImg === 'undefined' || !userImg)) { var f = $('file'); if (f) f.click(); }
    });
    function fotoActual() { try { return typeof userImg !== 'undefined' && userImg ? userImg : null; } catch (e) { return null; } }
    /* Cada vez que la página arma la postal */
    new MutationObserver(function () {
      var im = D.querySelector('#preview img'); if (!im) return;
      var u = fotoActual();
      if (u) {
        $('czNext').disabled = false;
        var th = $('czThumb');
        th.innerHTML = '<img src="' + u.src + '" alt=""><div><b>¡Qué buena foto!</b><span class="nota">Toca arriba si quieres cambiarla.</span></div>';
        th.hidden = false;
      }
      if (esperando) {
        esperando = false;
        im.classList.add('revela');
        setTimeout(function () {
          oscuro.style.opacity = 0;
          setTimeout(function () { oscuro.hidden = true; oscuro.style.opacity = ''; }, 600);
          paso3.classList.remove('cz-revelando');
          if (W.fxRafaga) W.fxRafaga(im);
          if (!$('prBox').hidden && W.tqEnlace) W.tqEnlace();
          if (!$('prBox').hidden && W.tqPrepararHistoria) W.tqPrepararHistoria();
        }, 1500);
      }
    }).observe(prev, { childList: true });
    /* «Crear mi postal»: la página arma la imagen y aquí se revela */
    $('make').addEventListener('click', function () {
      if (!fotoActual()) return;
      esperando = true;
      oscuro.hidden = false; paso3.classList.add('cz-revelando');
      ir(3);
    });
    /* Abrir el regalo */
    $('abrirRegalo').addEventListener('click', function () {
      var b = this; b.classList.add('abierto');
      setTimeout(function () { if (W.fxRafaga) W.fxRafaga(b); }, 380);
      setTimeout(function () {
        b.hidden = true; $('prBox').hidden = false; $('czEnvio').hidden = false;
        if (W.tqEnlace) W.tqEnlace();
        if (W.tqPrepararHistoria) W.tqPrepararHistoria();
        var y = $('prBox').getBoundingClientRect().top + W.scrollY - 90;
        W.scrollTo({ top: y, behavior: 'smooth' });
        if (typeof ScrollTrigger !== 'undefined') ScrollTrigger.refresh();
      }, 1000);
    });
  }
})();
