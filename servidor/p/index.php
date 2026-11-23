<?php
/* Página de quien recibe una postal: la ve, la descarga y entra a la dinámica */
require __DIR__ . '/../_priv/lib.php';
$c = strtoupper((string)($_GET['c'] ?? ''));
$c = preg_match('~^[A-Z0-9]{6}$~', $c) ? $c : '';
$q = db()->prepare('SELECT * FROM postales WHERE code=?'); $q->execute([$c]);
$p = $c ? $q->fetch() : false;
if (!$p || !is_file(DATOS . "/postales/$c.jpg")) {
  http_response_code(404);
  cabeza('Postal no encontrada · El Taquito');
  echo '<header class="top"><img src="/postal/img/logo-crema.png" alt="El Taquito"></header><main class="wrap" style="padding:60px 20px;text-align:center">
  <h1>No encontramos esta postal</h1><p class="lead" style="margin:14px 0 26px">Revisa que el enlace esté completo.</p>
  <a class="btn btn-rojo" href="/postal/">Conoce Intercambio con Sabor</a></main></body></html>';
  exit;
}
db()->prepare('UPDATE postales SET vistas=vistas+1 WHERE code=?')->execute([$c]);
$para = trim((string)$p['para']); $de = trim((string)$p['de']);
$img = SITIO . "/api/img.php?c=$c";
$imgOg = SITIO . "/api/img.php?c=$c&og=1";
$titulo = ($para ? "$para, te" : 'Te') . ' llegó una postal de El Taquito';
$desc = ($de ? "$de te mandó" : 'Alguien te mandó') . ' un pedazo de nuestra historia. Ábrela y descárgala.';
$og = '<meta property="og:type" content="website"><meta property="og:title" content="' . h($titulo) . '">'
  . '<meta property="og:description" content="' . h($desc) . '"><meta property="og:image" content="' . h($imgOg) . '">'
  . '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="800">'
  . '<meta property="og:url" content="' . h(SITIO . "/p/$c") . '"><meta name="twitter:card" content="summary_large_image">'
  . '<meta name="description" content="' . h($desc) . '">';
cabeza($titulo, $og);
?>
<style>
.recibe{padding:40px 0 10px;text-align:center}
.recibe h1{margin:10px auto 6px;max-width:16ch}
.de{font-family:Lora,serif;font-style:italic;font-size:20px;color:var(--rojo)}
.marco{margin:30px auto 0;max-width:640px;background:#fff;border:10px solid #fff;box-shadow:0 22px 46px rgba(40,28,10,.3);
 transform:rotate(-1.4deg);animation:llega 1.1s cubic-bezier(.2,.9,.3,1.25) both}
@keyframes llega{from{opacity:0;transform:translateY(60px) rotate(-12deg) scale(.85)}to{opacity:1;transform:rotate(-1.4deg)}}
.acciones{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin:34px 0 8px}
.historia-link{margin:34px auto 0;max-width:640px;background:var(--verde);color:var(--crema);border-radius:14px;padding:20px 22px;
 display:flex;gap:16px;align-items:center;justify-content:space-between;flex-wrap:wrap;text-align:left}
.historia-link b{font-family:Oswald;font-size:22px;text-transform:uppercase;display:block}
.historia-link span{font-family:Lora;font-style:italic;opacity:.9}
.otra{text-align:center;margin-top:44px;background:#fffaf0;border:2px dashed var(--rojo);border-radius:22px;padding:34px 22px}
.otra h2{margin:8px auto 0;max-width:20ch}
.otra p{margin:10px 0 22px}
.regalito{font-size:58px;line-height:1;animation:menea 3s ease-in-out infinite;display:inline-block}
@keyframes menea{0%,62%,100%{transform:rotate(0)}66%{transform:rotate(-9deg)}72%{transform:rotate(8deg)}78%{transform:rotate(-5deg)}84%{transform:rotate(2deg)}}
</style>
<header class="top"><a href="/postal/"><img src="/postal/img/logo-crema.png" alt="El Taquito"></a></header>
<main class="wrap">
  <section class="recibe">
    <div class="eyebrow">Intercambio con Sabor</div>
    <h1><?= $para ? h($para) . ', esta historia continúa contigo' : 'Esta historia continúa contigo' ?></h1>
    <?php if ($de): ?><p class="de">Con cariño, <?= h($de) ?></p><?php endif; ?>
    <div class="marco"><img src="<?= h($img) ?>" alt="Tu postal de El Taquito" width="1500" height="1000"></div>
    <div class="acciones">
      <a class="btn btn-rojo" href="/api/img.php?c=<?= $c ?>&amp;dl=1" download="postal-el-taquito-<?= $c ?>.jpg">Descargar mi postal</a>
      <button class="btn btn-borde" type="button" id="compartirPostal" hidden>Compartir</button>
    </div>
    <p class="nota">Desde 1917, las mejores historias se comparten alrededor de una mesa.</p>
    <?php if ($p['postal']): ?>
    <div class="historia-link">
      <div><b>Tu postal tiene historia</b><span>Descubre quién se sentó a nuestra mesa.</span></div>
      <a class="btn btn-crema" style="background:var(--crema);color:var(--carbon)" href="/postal/<?= h($p['postal']) ?>/">Conocer la historia</a>
    </div>
    <?php endif; ?>
  </section>

  <div class="otra">
    <div class="regalito" aria-hidden="true">🎁</div>
    <div class="eyebrow">Ahora te toca a ti</div>
    <h2>Crea tu postal personalizada y descubre una sorpresa</h2>
    <p class="lead">Con tu foto, para alguien especial. Toma menos de un minuto.</p>
    <a class="btn btn-rojo" href="/postal/<?= $p['postal'] ? h($p['postal']) . '/' : '' ?>?origen=<?= $c ?>#crea">Crear mi postal</a>
  </div>
</main>
<footer><div class="wrap">Miguel Noreña 25, San José Insurgentes, CDMX · Lunes a sábado 13:00 a 22:00 · Domingo 13:00 a 20:00</div></footer>
<script>
window.TQ = {origen: <?= json_encode($c) ?>, postal: <?= json_encode((string)$p['postal']) ?>, historia: <?= json_encode("/api/img.php?c=$c") ?>};
(function(){
  /* Compartir el ENLACE de la postal, no la imagen */
  var b = document.getElementById('compartirPostal');
  var texto = 'Mira la postal que me regalaron en El Taquito 💌';
  b.hidden = false;
  b.addEventListener('click', function(){
    var url = location.href.split('#')[0];
    if (navigator.share) { navigator.share({title: 'Mi postal de El Taquito', text: texto, url: url}).catch(function(){}); return; }
    window.open('https://wa.me/?text=' + encodeURIComponent(texto + ' ' + url), '_blank', 'noopener');
  });
})();
</script>
</body></html>
