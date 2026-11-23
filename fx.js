/* =========================================================
   EXPERIENCIA · Intercambio con Sabor (El Taquito)
   Capa de animación encima de la página. No cambia la lógica:
   usa las variables de la página (P, ORDER, DROPS, cur, show).
   Si GSAP no carga o el visitante pidió "reducir movimiento",
   no hace nada y la página queda tal cual.
   ========================================================= */
(function () {
  'use strict';
  var D = document, W = window, root = D.documentElement;
  var reduce = W.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function listo() { root.classList.remove('fx-pre'); }
  if (!W.gsap || !W.ScrollTrigger || reduce || typeof P === 'undefined') { listo(); return; }

  gsap.registerPlugin(ScrollTrigger);
  root.classList.add('fx');

  var g = function (s, c) { return (c || D).querySelector(s); };
  var ga = function (s, c) { return Array.prototype.slice.call((c || D).querySelectorAll(s)); };
  var fino = W.matchMedia('(pointer:fine)').matches;
  var movil = W.innerWidth < 720;
  var COLORES = ['#B52E2B', '#354A39', '#EADDB6', '#E7A33E', '#C2477C', '#2F7F8F'];
  var dpr = Math.min(W.devicePixelRatio || 1, 2);
  function esc(s) { return s.replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function abiertas() {
    var t = today(), ids = [];
    DROPS.forEach(function (d) {
      if ((typeof TODAS_ABIERTAS !== 'undefined' && TODAS_ABIERTAS) || t >= new Date(d.d + 'T00:00:00')) ids = ids.concat(d.ids);
    });
    return (ids.length ? ids : ORDER).filter(function (x) { return P[x]; }).sort();
  }

  /* ---------- Confeti y destellos (un lienzo para toda la página) ---------- */
  var cv = D.createElement('canvas'); cv.className = 'fx-canvas'; D.body.appendChild(cv);
  var cx = cv.getContext('2d'), parts = [], corriendo = false;
  function medir() { cv.width = innerWidth * dpr; cv.height = innerHeight * dpr; cx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  medir(); W.addEventListener('resize', medir);
  function estrella(x, y, r) {
    cx.beginPath();
    for (var i = 0; i < 8; i++) { var rr = i % 2 ? r * .32 : r, a = i * Math.PI / 4; cx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    cx.closePath(); cx.fill();
  }
  function rafaga(x, y, o) {
    o = o || {};
    var n = o.n || 60, chispa = o.chispa == null ? .35 : o.chispa;
    for (var i = 0; i < n; i++) {
      var a = Math.random() * Math.PI * 2, v = (o.vel || 7) * (.35 + Math.random() * .9), es = Math.random() < chispa;
      parts.push({
        x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - (o.arriba || 3),
        g: es ? .04 : .16, dr: es ? .95 : .985, w: es ? 2 + Math.random() * 3.5 : 6 + Math.random() * 6, h: 4 + Math.random() * 4,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4, f: Math.random() * 6,
        c: es ? '#FFE7A3' : COLORES[(Math.random() * COLORES.length) | 0], es: es, vida: 0, max: es ? 40 + Math.random() * 30 : 90 + Math.random() * 60
      });
    }
    if (!corriendo) { corriendo = true; requestAnimationFrame(paso); }
  }
  function paso() {
    cx.clearRect(0, 0, innerWidth, innerHeight);
    parts = parts.filter(function (p) { return p.vida < p.max && p.y < innerHeight + 40; });
    parts.forEach(function (p) {
      p.vida++; p.vx *= p.dr; p.vy = p.vy * p.dr + p.g; p.x += p.vx; p.y += p.vy; p.r += p.vr; p.f += .18;
      cx.globalAlpha = 1 - Math.max(0, (p.vida - p.max * .6) / (p.max * .4));
      cx.fillStyle = p.c;
      if (p.es) { cx.shadowColor = '#FFD36B'; cx.shadowBlur = 10; estrella(p.x, p.y, p.w * (1 - p.vida / p.max * .6)); cx.shadowBlur = 0; }
      else { cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.scale(1, Math.cos(p.f)); cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); cx.restore(); }
    });
    cx.globalAlpha = 1;
    if (parts.length) requestAnimationFrame(paso); else { corriendo = false; cx.clearRect(0, 0, innerWidth, innerHeight); }
  }
  function centro(el) { var b = el.getBoundingClientRect(); return [b.left + b.width / 2, b.top + b.height / 2]; }
  /* Un toque deja destellos */
  D.addEventListener('pointerdown', function (e) {
    if (e.target.closest('input,textarea,select,.fx-intro')) return;
    rafaga(e.clientX, e.clientY, { n: 10, vel: 3.2, chispa: 1, arriba: 1 });
  }, { passive: true });

  /* ---------- Desplazamiento suave (solo con mouse o trackpad) ---------- */
  var lenis = null;
  if (fino && W.Lenis) {
    lenis = new Lenis({ lerp: .085 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function irA(el) {
    if (lenis) lenis.scrollTo(el, { offset: el === hero ? -200 : -72, duration: 1.4 });
    else el.scrollIntoView({ behavior: 'smooth' });
  }
  D.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]'); if (!a) return;
    var id = a.getAttribute('href').slice(1);
    if (!id || /^p\d\d$/.test(id)) return;
    var t = D.getElementById(id); if (!t) return;
    e.preventDefault(); irA(t);
  });

  /* ---------- Barra de avance ---------- */
  var prog = D.createElement('div'); prog.className = 'fx-prog'; D.body.appendChild(prog);
  gsap.to(prog, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });

  /* ---------- Texto partido en palabras ---------- */
  function partirMasc(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="fx-m"><span class="fx-wi">' + esc(w) + '</span></span>'; }).join(' ');
    return ga('.fx-wi', el);
  }
  function partir(el) {
    el.innerHTML = el.textContent.trim().split(/\s+/).map(function (w) { return '<span class="fx-w">' + esc(w) + '</span>'; }).join(' ');
    return ga('.fx-w', el);
  }

  /* =========================================================
     HERO
     ========================================================= */
  var hero = g('.hero'), postal = g('.hero .postal'), frente = g('#frente');

  /* Polvo dorado que flota */
  (function motas(host) {
    var c = D.createElement('canvas'); c.className = 'fx-motes'; host.insertBefore(c, host.firstChild);
    var x = c.getContext('2d'), w, h, ps = [], visible = true, girando = false;
    function rs() { w = host.clientWidth; h = host.clientHeight; c.width = w * dpr; c.height = h * dpr; x.setTransform(dpr, 0, 0, dpr, 0, 0); }
    rs(); W.addEventListener('resize', rs);
    for (var i = 0; i < (movil ? 22 : 40); i++) ps.push({ x: Math.random() * w, y: Math.random() * h, r: .8 + Math.random() * 2.4, s: .15 + Math.random() * .45, p: Math.random() * 6.28, k: .5 + Math.random() });
    function vuelta(t) {
      if (!visible) { girando = false; return; }
      x.clearRect(0, 0, w, h);
      ps.forEach(function (p) {
        p.y -= p.s; p.x += Math.sin(t / 1600 + p.p) * .25;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        x.globalAlpha = Math.max(0, .25 + .35 * Math.sin(t / 700 * p.k + p.p));
        var gr = x.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
        gr.addColorStop(0, 'rgba(231,163,62,.9)'); gr.addColorStop(1, 'rgba(231,163,62,0)');
        x.fillStyle = gr; x.beginPath(); x.arc(p.x, p.y, p.r * 4, 0, 6.29); x.fill();
      });
      requestAnimationFrame(vuelta);
    }
    new IntersectionObserver(function (es) {
      visible = es[0].isIntersecting;
      if (visible && !girando) { girando = true; requestAnimationFrame(vuelta); }
    }).observe(host);
  })(hero);

  /* Papel picado que se mece y siente el viento del scroll */
  var BANDERA = (function () {
    function circ(cx_, cy, r) { return 'M' + (cx_ - r) + ' ' + cy + 'a' + r + ' ' + r + ' 0 1 0 ' + 2 * r + ' 0a' + r + ' ' + r + ' 0 1 0 ' + (-2 * r) + ' 0Z'; }
    return 'M0 0H60V58L55 65L50 58L45 65L40 58L35 65L30 58L25 65L20 58L15 65L10 58L5 65L0 58Z' +
      'M30 17L41 30L30 43L19 30Z' + circ(30, 30, 3.2) +
      circ(12, 12, 3.2) + circ(48, 12, 3.2) + circ(12, 48, 3.2) + circ(48, 48, 3.2) +
      circ(30, 7, 2) + circ(30, 53, 2) + 'M5 22h4v16h-4Z M51 22h4v16h-4Z';
  })();
  var picado = D.createElement('div'); picado.className = 'fx-picado'; picado.setAttribute('aria-hidden', 'true');
  hero.insertBefore(picado, hero.firstChild);
  function colgar() {
    picado.innerHTML = '';
    var fw = movil ? 42 : 54, gap = movil ? 10 : 14, n = Math.ceil(picado.clientWidth / (fw + gap)) + 1;
    for (var i = 0; i < n; i++) {
      var f = D.createElement('div'); f.className = 'fx-flag'; f.style.left = (i * (fw + gap)) + 'px';
      f.innerHTML = '<i style="--d:' + (2.4 + Math.random() * 1.6).toFixed(2) + 's;--dl:-' + (Math.random() * 3).toFixed(2) + 's">' +
        '<svg viewBox="0 0 60 66"><path fill="' + COLORES[i % COLORES.length] + '" fill-rule="evenodd" d="' + BANDERA + '"/></svg></i>';
      picado.appendChild(f);
    }
  }
  colgar();
  var anchoPrev = innerWidth;
  W.addEventListener('resize', function () { if (Math.abs(innerWidth - anchoPrev) > 40) { anchoPrev = innerWidth; colgar(); } });
  ScrollTrigger.create({
    start: 0, end: 'max', onUpdate: function (s) {
      var v = gsap.utils.clamp(-16, 16, s.getVelocity() / 120);
      gsap.to(picado, { '--wind': v, duration: .35, overwrite: true, onComplete: function () { gsap.to(picado, { '--wind': 0, duration: 1.8, ease: 'elastic.out(1,.3)' }); } });
    }
  });

  /* Postal: columna con brillo, matasellos y controles */
  var col = D.createElement('div'); col.className = 'fx-pcol';
  postal.parentNode.insertBefore(col, postal); col.appendChild(postal);
  postal.insertAdjacentHTML('beforeend', '<div class="fx-sheen"></div><div class="fx-glare"></div><div class="fx-sello" aria-hidden="true"><div>POSTAL N.º<b></b><span></span></div></div>');
  col.insertAdjacentHTML('beforeend', '<div class="fx-nav"><button type="button" class="fx-prev" aria-label="Postal anterior">‹</button>' +
    '<div class="fx-count"><b></b> / <i></i><span>Desliza la postal para ver otra</span></div>' +
    '<button type="button" class="fx-next" aria-label="Postal siguiente">›</button></div>');
  var sello = g('.fx-sello', postal);
  gsap.set(postal, { rotation: -1.6, transformPerspective: 900 });

  function datos(n) {
    var p = P[n];
    g('b', sello).textContent = n; g('span', sello).textContent = p.y.toUpperCase();
    g('.fx-count b', col).textContent = 'N.º ' + n; g('.fx-count i', col).textContent = abiertas().length;
    if (anio) anio.textContent = p.y.toUpperCase();
  }
  function matasellos() {
    gsap.fromTo(sello, { scale: 2.6, opacity: 0, rotation: -40 }, {
      scale: 1, opacity: 1, rotation: -14, duration: .42, ease: 'power4.in', overwrite: true,
      onComplete: function () {
        gsap.fromTo(postal, { y: 0 }, { y: 4, duration: .06, yoyo: true, repeat: 3 });
        var c = centro(sello); rafaga(c[0], c[1], { n: 18, vel: 4, chispa: .7, arriba: 1 });
      }
    });
  }
  function brillo() { var s = g('.fx-sheen', postal); s.classList.remove('go'); void s.offsetWidth; s.classList.add('go'); }

  /* Inclinación 3D siguiendo el mouse */
  var arrastre = null, ocupado = false;
  if (fino) {
    var rx = gsap.quickTo(postal, 'rotationX', { duration: .6, ease: 'power3' }),
      ry = gsap.quickTo(postal, 'rotationY', { duration: .6, ease: 'power3' });
    postal.addEventListener('pointermove', function (e) {
      if (arrastre && arrastre.eje === 'x') return;
      var b = postal.getBoundingClientRect(), px = (e.clientX - b.left) / b.width, py = (e.clientY - b.top) / b.height;
      ry((px - .5) * 14); rx(-(py - .5) * 10);
      postal.style.setProperty('--gx', px * 100 + '%'); postal.style.setProperty('--gy', py * 100 + '%');
    });
    postal.addEventListener('pointerleave', function () { rx(0); ry(0); });
  }

  /* Deslizar la postal para cambiar de historia */
  postal.addEventListener('pointerdown', function (e) {
    if (ocupado) return;
    arrastre = { x: e.clientX, y: e.clientY, dx: 0, id: e.pointerId, eje: null };
  });
  W.addEventListener('pointermove', function (e) {
    if (!arrastre || e.pointerId !== arrastre.id) return;
    var dx = e.clientX - arrastre.x, dy = e.clientY - arrastre.y;
    if (arrastre.eje === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      arrastre.eje = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (arrastre.eje === 'x') { try { postal.setPointerCapture(e.pointerId); } catch (_) { } }
    }
    if (arrastre.eje !== 'x') return;
    arrastre.dx = dx;
    gsap.set(postal, { x: dx * .7, rotation: -1.6 + dx * .04 });
  });
  function soltar() {
    if (!arrastre) return;
    var dx = arrastre.dx, eje = arrastre.eje; arrastre = null;
    if (eje !== 'x') return;
    if (Math.abs(dx) > 70) ir(dx < 0 ? 1 : -1);
    else gsap.to(postal, { x: 0, rotation: -1.6, duration: .5, ease: 'back.out(2)' });
  }
  W.addEventListener('pointerup', soltar); W.addEventListener('pointercancel', soltar);

  var dirNav = 0;
  function ir(dir) {
    if (ocupado) return;
    var L = abiertas(), i = L.indexOf(cur), n = L[(i + dir + L.length) % L.length];
    if (!n || n === cur) { gsap.to(postal, { x: 0, rotation: -1.6, duration: .4 }); return; }
    dirNav = dir; if (W.irPostal) W.irPostal(n); else location.hash = 'p' + n;
  }
  g('.fx-prev', col).addEventListener('click', function () { ir(-1); });
  g('.fx-next', col).addEventListener('click', function () { ir(1); });
  D.addEventListener('keydown', function (e) {
    if (e.target.closest('input,textarea,select') || D.querySelector('.fx-intro')) return;
    if (e.key === 'ArrowRight') ir(1); else if (e.key === 'ArrowLeft') ir(-1);
  });

  /* =========================================================
     HISTORIA
     ========================================================= */
  var historia = g('#historia'), foto = g('.historia .foto'), fotoImg = g('#foto');
  var hT = g('#hTitle'), relato = g('#story'), dato = g('#dato'), curioso = g('.curioso');
  var anio = D.createElement('div'); anio.className = 'fx-year'; anio.setAttribute('aria-hidden', 'true');
  historia.insertBefore(anio, historia.firstChild);
  gsap.set(anio, { yPercent: -50 });
  gsap.fromTo(anio, { y: 140 }, { y: -140, ease: 'none', scrollTrigger: { trigger: historia, start: 'top bottom', end: 'bottom top', scrub: true } });
  var flash = D.createElement('div'); flash.className = 'fx-flash'; foto.appendChild(flash);

  /* La foto se revela como en el cuarto oscuro */
  var stFoto = { trigger: foto, start: 'top 92%', end: 'top 38%', scrub: .5 };
  gsap.fromTo(fotoImg, { filter: 'sepia(1) blur(8px) brightness(1.5) contrast(.8)' }, { filter: 'sepia(0) blur(0px) brightness(1) contrast(1.05)', ease: 'none', scrollTrigger: stFoto });
  gsap.fromTo(foto, { y: 90, rotation: 9, scale: .92 }, { y: 0, rotation: 1.4, scale: 1, ease: 'none', scrollTrigger: stFoto });

  /* El relato se enciende palabra por palabra al deslizar */
  var twRelato = null;
  function encenderRelato() {
    if (twRelato) { if (twRelato.scrollTrigger) twRelato.scrollTrigger.kill(); twRelato.kill(); }
    twRelato = gsap.fromTo(partir(relato), { opacity: .14 }, {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: relato, start: 'top 88%', end: 'bottom 50%', scrub: .6 }
    });
  }
  encenderRelato();
  gsap.from(partirMasc(hT), { yPercent: 110, stagger: .06, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: hT, start: 'top 88%', once: true } });
  gsap.from([g('.historia .eyebrow'), dato, curioso, g('.libro')], {
    opacity: 0, y: 36, stagger: .12, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity',
    scrollTrigger: { trigger: historia, start: 'top 60%', once: true }
  });
  gsap.from(curioso, { rotationX: -70, transformPerspective: 800, transformOrigin: '50% 0', duration: 1, ease: 'back.out(1.6)', scrollTrigger: { trigger: curioso, start: 'top 85%', once: true } });

  function recontar() {
    gsap.from(partirMasc(hT), { yPercent: 110, stagger: .05, duration: .7, ease: 'power3.out' });
    encenderRelato();
    gsap.fromTo(flash, { opacity: .9 }, { opacity: 0, duration: 1.1, ease: 'power2.out' });
    gsap.fromTo(anio, { opacity: 0 }, { opacity: 1, duration: 1.2 });
    gsap.fromTo([dato, curioso], { opacity: 0, y: 16 }, { opacity: 1, y: 0, stagger: .1, duration: .6, clearProps: 'transform' });
    ScrollTrigger.refresh();
  }

  /* =========================================================
     CAMBIO DE POSTAL: la actual sale volando y entra la nueva
     ========================================================= */
  function lista(img) {
    return Promise.race([img.decode ? img.decode().catch(function () { }) : Promise.resolve(), new Promise(function (r) { setTimeout(r, 1500); })]);
  }
  var showOriginal = W.show;
  W.show = function (n) {
    if (!P[n]) n = '06';
    if (n === cur) { showOriginal(n); datos(n); return; }
    var L = ORDER, dir = dirNav || (L.indexOf(n) > L.indexOf(cur) ? 1 : -1); dirNav = 0;
    var fuera = Math.min(innerWidth * .7, 700); ocupado = true;
    gsap.to(postal, {
      x: -dir * fuera, y: -30, rotation: -1.6 - dir * 16, opacity: 0, duration: .36, ease: 'power2.in', overwrite: true,
      onComplete: function () {
        showOriginal(n); datos(n); recontar();
        lista(frente).then(function () {
          gsap.fromTo(postal, { x: dir * fuera, y: -40, rotation: -1.6 + dir * 16, opacity: 0 }, {
            x: 0, y: 0, rotation: -1.6, opacity: 1, duration: .8, ease: 'back.out(1.3)',
            onComplete: function () { ocupado = false; matasellos(); brillo(); }
          });
        });
      }
    });
  };

  /* =========================================================
     RESTO DE LA PÁGINA
     ========================================================= */
  /* Títulos que suben palabra por palabra */
  ga('section:not(.hero) h2').forEach(function (h) {
    if (h === hT) return;
    gsap.from(partirMasc(h), { yPercent: 110, stagger: .06, duration: .8, ease: 'power3.out', scrollTrigger: { trigger: h, start: 'top 88%', once: true } });
  });
  function aparecer(els, extra, trig, ini) {
    els = els.filter(Boolean); if (!els.length) return;
    gsap.from(els, Object.assign({
      opacity: 0, y: 40, duration: .9, ease: 'power3.out', stagger: .1, clearProps: 'transform,opacity',
      scrollTrigger: { trigger: trig || els[0], start: ini || 'top 86%', once: true }
    }, extra || {}));
  }

  /* Crea tu postal */
  aparecer([g('#cz')], { y: 60, scale: .96 });

  /* Cupón: rayos que giran, contador y sello del código */
  var cupon = g('.cupon');
  if (cupon) {
    var rayos = D.createElement('div'); rayos.className = 'fx-rayos fx-rays'; cupon.insertBefore(rayos, cupon.firstChild);
    gsap.to(rayos, { rotation: 360, duration: 50, repeat: -1, ease: 'none' });
    gsap.to(g('.sun', cupon), { scale: 1.08, duration: 2.4, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    var opciones = g('.pr-opc', cupon);
    gsap.timeline({ scrollTrigger: { trigger: cupon, start: 'top 78%', once: true } })
      .from(cupon, { y: 80, scale: .92, opacity: 0, duration: .9, ease: 'power3.out', clearProps: 'transform,opacity' })
      .from(ga('.pr-card', cupon), {
        scale: 1.6, rotation: function (i) { return i ? 8 : -8; }, opacity: 0, duration: .45, stagger: .15, ease: 'power4.in', clearProps: 'transform,opacity',
        onComplete: function () {
          gsap.fromTo(cupon, { x: 0 }, { x: 5, duration: .05, yoyo: true, repeat: 5, clearProps: 'transform' });
          if (opciones) { var c = centro(opciones); rafaga(c[0], c[1], { n: 60, vel: 9, chispa: .4 }); }
        }
      }, '-=.2')
      .from(ga('.pr-pasos li, .pr-form, .pr-cond li', cupon), { opacity: 0, x: -20, stagger: .06, duration: .5, clearProps: 'transform,opacity' }, '-=.1');
    ga('.pr-card', cupon).forEach(function (l) {
      l.addEventListener('change', function () { var c = centro(l); rafaga(c[0], c[1], { n: 26, vel: 5, chispa: .6, arriba: 2 }); gsap.fromTo(l, { scale: .94 }, { scale: 1, duration: .5, ease: 'back.out(3)', clearProps: 'transform' }); });
    });
  }
  W.fxRafaga = function (el) { var c = centro(el); rafaga(c[0], c[1], { n: 90, vel: 11, chispa: .4, arriba: 4 }); };
  g('#copy') && g('#copy').addEventListener('click', function (e) { var c = centro(e.currentTarget); rafaga(c[0], c[1], { n: 50, vel: 8 }); });

  /* Reserva: las opciones caen como tarjetas */
  aparecer([g('.reserva .eyebrow'), g('.reserva .lead')]);
  aparecer(ga('.reserva .opt'), { y: 60, rotationX: -40, transformPerspective: 800, transformOrigin: '50% 0', stagger: .14, ease: 'back.out(1.5)' });
  ga('.reserva .opt').forEach(function (o) { o.addEventListener('click', function () { var c = centro(o); rafaga(c[0], c[1], { n: 40, vel: 7 }); }); });

  /* Colección: las postales se reparten como baraja */
  aparecer([g('.coleccion .eyebrow'), g('.coleccion .lead'), g('#prox')]);
  ScrollTrigger.create({
    trigger: '#drops', start: 'top 92%', once: true, onEnter: function () {
      gsap.from(ga('#drops .drop-h'), { opacity: 0, x: -40, stagger: .15, duration: .7, clearProps: 'transform,opacity' });
      gsap.from(ga('#drops .tile'), {
        y: -160, x: function () { return gsap.utils.random(-120, 120); }, rotation: function () { return gsap.utils.random(-30, 30); },
        opacity: 0, stagger: .05, duration: .8, ease: 'back.out(1.3)', clearProps: 'transform,opacity'
      });
    }
  });

  /* Capítulos a la derecha (pantallas grandes) */
  var caps = [[hero, 'Tu postal'], [historia, 'La historia'], [g('#crea'), 'Crea tu postal'], [g('#descuento'), 'Tu premio'], [g('#reserva'), 'Reserva'], [g('.coleccion'), 'La colección']]
    .filter(function (c) { return c[0]; });
  var puntos = D.createElement('nav'); puntos.className = 'fx-dots'; puntos.setAttribute('aria-label', 'Capítulos');
  caps.forEach(function (c, i) {
    var a = D.createElement('a'); a.href = '#'; a.innerHTML = '<span>' + c[1] + '</span>'; a.setAttribute('aria-label', c[1]);
    a.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); irA(c[0]); });
    puntos.appendChild(a);
    ScrollTrigger.create({
      trigger: c[0], start: 'top 55%', end: 'bottom 55%', onToggle: function (s) {
        if (!s.isActive) return;
        ga('a', puntos).forEach(function (x, j) { x.classList.toggle('on', j === i); });
        puntos.classList.toggle('dark', c[0].classList.contains('verde'));
      }
    });
  });
  D.body.appendChild(puntos);

  /* Música: un aro invita a tocarla */
  var mb = g('#musica'), au = g('#audio');
  if (mb) {
    mb.classList.add('fx-ring');
    var quitarAro = function () { mb.classList.remove('fx-ring'); };
    mb.addEventListener('click', quitarAro);
    au && au.addEventListener('play', quitarAro);
  }

  /* =========================================================
     ENTRADA: te llegó una postal
     ========================================================= */
  var h1 = g('.hero h1'), h1w = partirMasc(h1);
  var heroTxt = [g('.hero .eyebrow'), g('.hero .lead')];
  var pasos = ga('.hero .steps a'), nav = g('.fx-nav', col), banderas = ga('.fx-flag svg', picado);
  gsap.set(h1w, { yPercent: 110 });
  gsap.set(heroTxt.concat([nav]), { opacity: 0, y: 20 });
  gsap.set(pasos, { opacity: 0, x: -30 });
  gsap.set(banderas, { y: -90 });
  gsap.set(sello, { opacity: 0 });
  datos(cur);

  function entrarHero() {
    gsap.timeline()
      .to(banderas, { y: 0, stagger: { each: .035, from: 'center' }, duration: .9, ease: 'back.out(1.6)' }, 0)
      .to(h1w, { yPercent: 0, stagger: .07, duration: .9, ease: 'power3.out' }, .1)
      .to(heroTxt, { opacity: 1, y: 0, stagger: .12, duration: .7 }, .35)
      .to(pasos, { opacity: 1, x: 0, stagger: .08, duration: .6, ease: 'power2.out', clearProps: 'transform,opacity' }, .55)
      .to(nav, { opacity: 1, y: 0, duration: .6 }, .7)
      .add(function () { matasellos(); brillo(); }, .5);
  }

  var visto = false;
  try { visto = sessionStorage.getItem('fxIntro') === '1'; sessionStorage.setItem('fxIntro', '1'); } catch (_) { }
  var conIntro = (/demo\.html$/.test(location.pathname) || !visto) && location.hash !== '#crea';

  if (!conIntro) {
    gsap.from(postal, { scale: .85, rotation: -12, opacity: 0, duration: 1, ease: 'back.out(1.4)' });
    listo(); entrarHero();
  } else {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    W.scrollTo(0, 0);
    gsap.set(postal, { opacity: 0 });
    listo();
    apertura();
  }

  function apertura() {
    var n = cur;
    var ov = D.createElement('div'); ov.className = 'fx-intro';
    ov.innerHTML =
      '<div class="fx-bg"></div><button type="button" class="fx-skip">Saltar</button>' +
      '<div class="fx-intro-in"><div class="ey">Intercambio con Sabor · El Taquito</div><div class="ti">Te llegó una postal</div>' +
      '<div class="fx-stage"><div class="fx-card">' +
      '<div class="fx-face fx-back"><div class="l"><b>Esta historia continúa contigo</b><p>Alguien te regaló un pedazo de nuestra historia.</p><small>DESDE 1917</small></div>' +
      '<div class="sep"></div><div class="r"><div class="tim">EL TAQUITO<b>1917</b></div><div class="mat">CDMX<br>N.º ' + n + '</div>' +
      '<div class="lin">Para: ti</div><div class="lin"></div><div class="lin"></div></div></div>' +
      '<div class="fx-face fx-front"><img src="img/frente-' + n + '.jpg" alt=""></div>' +
      '</div></div><div class="fx-hint">Toca para voltearla</div></div>';
    D.body.appendChild(ov);
    if (lenis) lenis.stop();
    D.body.style.overflow = 'hidden';
    var card = g('.fx-card', ov), abierta = false;
    var tl = gsap.timeline()
      .from(g('.ey', ov), { opacity: 0, y: 14, duration: .6 })
      .from(g('.ti', ov), { opacity: 0, y: 30, duration: .7, ease: 'power3.out' }, '-=.3')
      .from(card, { y: innerHeight * .7, rotation: -22, rotationY: -30, opacity: 0, duration: 1.1, ease: 'power3.out' }, '-=.4')
      .from(g('.fx-hint', ov), { opacity: 0, duration: .5 })
      .to(card, { y: -8, duration: 1.6, yoyo: true, repeat: -1, ease: 'sine.inOut' });
    var auto = setTimeout(abrir, 4500);
    ov.addEventListener('click', function (e) {
      if (e.target.closest('.fx-skip')) { cerrar(true); return; }
      abrir();
    });
    function abrir() {
      if (abierta) return; abierta = true; clearTimeout(auto); tl.kill();
      gsap.set([g('.ey', ov), g('.ti', ov), g('.fx-hint', ov)], { clearProps: 'transform' });
      gsap.to([g('.fx-hint', ov), g('.ey', ov), g('.ti', ov), g('.fx-skip', ov)], { opacity: 0, y: -16, duration: .4 });
      gsap.timeline()
        .to(card, { y: 0, rotation: 0, rotationY: 0, opacity: 1, duration: .25 })
        .to(card, {
          rotationY: 180, scale: 1.08, duration: 1, ease: 'power3.inOut',
          onComplete: function () { var c = centro(card); rafaga(c[0], c[1], { n: movil ? 80 : 130, vel: movil ? 10 : 14, chispa: .4, arriba: 4 }); }
        })
        .to(card, { scale: 1, duration: .3 })
        .add(volar, '+=.6');
    }
    function volar() {
      var t = postal.getBoundingClientRect(), b = card.getBoundingClientRect();
      gsap.to(card, {
        x: '+=' + ((t.left + t.width / 2) - (b.left + b.width / 2)), y: '+=' + ((t.top + t.height / 2) - (b.top + b.height / 2)),
        scale: t.width / b.width, rotation: -1.6, duration: 1, ease: 'power3.inOut'
      });
      gsap.to(g('.fx-bg', ov), { opacity: 0, duration: .9, delay: .15, onComplete: function () { cerrar(false); } });
    }
    function cerrar(saltar) {
      clearTimeout(auto);
      var fin = function () {
        ov.remove(); D.body.style.overflow = ''; if (lenis) lenis.start();
        gsap.set(postal, { opacity: 1 });
        entrarHero(); ScrollTrigger.refresh();
      };
      if (saltar) { abierta = true; gsap.to(ov, { opacity: 0, duration: .4, onComplete: function () { gsap.from(postal, { scale: .85, rotation: -12, duration: .9, ease: 'back.out(1.4)' }); fin(); } }); }
      else fin();
    }
  }

  if (D.fonts && D.fonts.ready) D.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  W.addEventListener('load', function () { ScrollTrigger.refresh(); });
})();
