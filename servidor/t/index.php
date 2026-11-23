<?php
/* Ticket digital. El cliente lo muestra; el mesero lo escanea y lo quema. */
require __DIR__ . '/../_priv/lib.php';
$k = strtoupper((string)($_GET['k'] ?? ''));
$k = preg_match('~^[A-Z0-9]{10}$~', $k) ? $k : '';
$q = db()->prepare('SELECT * FROM tickets WHERE token=?'); $q->execute([$k]);
$t = $k ? $q->fetch() : false;
$aviso = ''; $tipo = '';

if ($t && ($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
  $acc = $_POST['accion'] ?? '';
  if ($acc === 'pin') {
    if (clave_ok((string)($_POST['pin'] ?? ''), PIN_HASH)) { entrar('mesero'); $aviso = 'Listo, este teléfono quedó en modo mesero.'; $tipo = 'ok'; }
    else { sleep(1); $aviso = 'PIN incorrecto.'; $tipo = 'error'; }
  } elseif ($acc === 'salir') { salir(); $_COOKIE['tq_staff'] = ''; }
  elseif ($acc === 'quemar' && rol()) {
    if ($t['canjeado']) { $aviso = 'Este ticket ya se había usado.'; $tipo = 'error'; }
    elseif (!vigente()) { $aviso = 'La promoción terminó el ' . VIGENCIA_FIN . '.'; $tipo = 'error'; }
    elseif (!dia_habil()) { $aviso = 'Hoy no aplica: la promoción es solo de lunes a viernes.'; $tipo = 'error'; }
    else {
      $u = db()->prepare('UPDATE tickets SET canjeado=?, mesero=?, mesa=? WHERE token=? AND canjeado IS NULL');
      $u->execute([ahora(), mb_substr(trim((string)($_POST['mesero'] ?? '')), 0, 40), mb_substr(trim((string)($_POST['mesa'] ?? '')), 0, 20), $k]);
      if ($u->rowCount()) { $aviso = '¡Promoción aplicada! Ya quedó registrada.'; $tipo = 'ok'; }
      else { $aviso = 'Este ticket ya se había usado.'; $tipo = 'error'; }
    }
  }
  $q->execute([$k]); $t = $q->fetch();
}

if (!$t) {
  http_response_code(404);
  cabeza('Ticket no encontrado · El Taquito');
  echo '<header class="top"><img src="/postal/img/logo-crema.png" alt="El Taquito"></header><main class="wrap" style="padding:60px 20px;text-align:center">
  <h1>Ticket no válido</h1><p class="lead" style="margin:14px 0">Este enlace no corresponde a ningún ticket.</p></main></body></html>';
  exit;
}
$pr = PROMOS[$t['promo']] ?? ['nombre' => $t['promo'], 'grande' => $t['promo'], 'sub' => ''];
$staff = rol();
$url = SITIO . '/t/' . $k;
$dias = ['', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];
$fechaC = $t['canjeado'] ? date('j/m/Y \a \l\a\s H:i', strtotime($t['canjeado'])) : '';
cabeza('Tu ticket · ' . $pr['nombre'] . ' · El Taquito');
?>
<style>
.tk{max-width:440px;margin:28px auto 0;background:var(--carbon);color:var(--crema);border-radius:20px;overflow:hidden;position:relative;
 box-shadow:0 24px 50px rgba(0,0,0,.35);animation:sube .8s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes sube{from{opacity:0;transform:translateY(40px) scale(.94)}}
.tk-top{padding:24px 24px 18px;position:relative;overflow:hidden}
.tk-top:after{content:"";position:absolute;right:-70px;top:-70px;width:190px;height:190px;border-radius:50%;background:var(--rojo);opacity:.9}
.tk .ey{font:700 11px Montserrat;letter-spacing:.26em;opacity:.8;position:relative;z-index:1}
.tk .big{font:700 92px/0.9 Oswald;margin-top:12px;position:relative;z-index:1}
.tk .sub{font:700 20px Oswald;letter-spacing:.16em;position:relative;z-index:1}
.tk .who{margin-top:12px;font:italic 17px Lora;position:relative;z-index:1}
.tk-cut{height:22px;position:relative;background:radial-gradient(circle at 0 50%,var(--papel) 11px,transparent 12px),radial-gradient(circle at 100% 50%,var(--papel) 11px,transparent 12px)}
.tk-cut:after{content:"";position:absolute;left:22px;right:22px;top:50%;border-top:2px dashed rgba(234,221,182,.35)}
.tk-qr{padding:18px 24px 24px;text-align:center}
.tk-qr #qr{background:#fff;padding:12px;border-radius:12px;display:inline-block}
.tk-qr #qr img,.tk-qr #qr canvas{width:190px!important;height:190px!important}
.tk-qr p{font-size:13px;margin-top:10px;opacity:.85}
.tk ul{list-style:none;padding:0 24px 24px;font-size:13px;opacity:.9;display:grid;gap:4px}
.sello-c{position:absolute;inset:0;display:grid;place-items:center;background:rgba(16,20,23,.72);z-index:3}
.sello-c div{border:5px solid #e5534f;color:#e5534f;font:700 46px/1 Oswald;letter-spacing:.08em;padding:10px 20px;border-radius:10px;transform:rotate(-14deg);text-align:center;background:rgba(16,20,23,.6)}
.sello-c small{display:block;font:600 12px Montserrat;letter-spacing:.08em;margin-top:6px}
.aviso{max-width:440px;margin:18px auto 0;padding:14px 18px;border-radius:12px;font-weight:600;text-align:center}
.aviso.ok{background:#d8ecd5;color:#1d4d22}.aviso.error{background:#f6d6d3;color:#7d1c18}
.staff{max-width:440px;margin:22px auto 0;background:#fffaf0;border:2px solid var(--verde);border-radius:16px;padding:18px 20px}
.staff h2{font-size:22px}
.staff .btn{width:100%;margin-top:14px}
.mesero-link{display:block;margin:26px auto 0;text-align:center;font-size:13px;color:#6b624b;background:none;border:0;text-decoration:underline;cursor:pointer;font-family:inherit}
</style>
<header class="top"><img src="/postal/img/logo-crema.png" alt="El Taquito"></header>
<main class="wrap">
  <?php if ($aviso): ?><div class="aviso <?= $tipo ?>"><?= h($aviso) ?></div><?php endif; ?>
  <div class="tk">
    <div class="tk-top">
      <div class="ey">TICKET DIGITAL · INTERCAMBIO CON SABOR</div>
      <div class="big"><?= h($pr['grande']) ?></div>
      <div class="sub"><?= h($pr['sub']) ?></div>
      <div class="who">Para @<?= h($t['usuario']) ?> · <?= h(REDES[$t['red']] ?? $t['red']) ?></div>
    </div>
    <div class="tk-cut"></div>
    <div class="tk-qr">
      <div id="qr"></div>
      <p>Muéstrale este código a tu mesero.</p>
    </div>
    <ul>
      <li>· Válido de lunes a viernes.</li>
      <li>· Una sola vez, una promoción por persona.</li>
      <li>· Vigente hasta el <?= h(date('j/m/Y', strtotime(VIGENCIA_FIN))) ?>.</li>
      <li>· Miguel Noreña 25, San José Insurgentes, CDMX.</li>
    </ul>
    <?php if ($t['canjeado']): ?><div class="sello-c"><div>CANJEADO<small><?= h($fechaC) ?></small></div></div><?php endif; ?>
  </div>

  <?php if ($staff): ?>
  <div class="staff">
    <div class="eyebrow">Modo mesero</div>
    <?php if ($t['canjeado']): ?>
      <h2 style="margin-top:6px">Ya se usó</h2>
      <p style="margin-top:6px">El <?= h($fechaC) ?><?= $t['mesero'] ? ' · ' . h($t['mesero']) : '' ?><?= $t['mesa'] ? ' · mesa ' . h($t['mesa']) : '' ?>. No lo apliques otra vez.</p>
    <?php elseif (!dia_habil()): ?>
      <h2 style="margin-top:6px">Hoy no aplica</h2>
      <p style="margin-top:6px">Hoy es <?= $dias[(int)date('N')] ?>: la promoción es solo de lunes a viernes.</p>
    <?php elseif (!vigente()): ?>
      <h2 style="margin-top:6px">Promoción terminada</h2>
    <?php else: ?>
      <h2 style="margin-top:6px">Aplicar <?= h($pr['nombre']) ?></h2>
      <form method="post" onsubmit="return confirm('¿Aplicar la promoción? Ya no se podrá usar otra vez.')">
        <input type="hidden" name="accion" value="quemar">
        <label for="mesero">TU NOMBRE</label><input id="mesero" name="mesero" maxlength="40" required>
        <label for="mesa">MESA O CUENTA (OPCIONAL)</label><input id="mesa" name="mesa" maxlength="20">
        <button class="btn btn-rojo" type="submit">Quemar promoción</button>
      </form>
    <?php endif; ?>
    <form method="post"><input type="hidden" name="accion" value="salir"><button class="mesero-link" type="submit" style="margin-top:14px">Salir del modo mesero</button></form>
  </div>
  <?php else: ?>
  <button class="mesero-link" type="button" onclick="document.getElementById('pinBox').hidden=false;this.hidden=true">Soy mesero</button>
  <div class="staff" id="pinBox" hidden>
    <div class="eyebrow">Modo mesero</div>
    <form method="post">
      <input type="hidden" name="accion" value="pin">
      <label for="pin">PIN DEL RESTAURANTE</label><input id="pin" name="pin" inputmode="numeric" autocomplete="off" required>
      <button class="btn btn-verde" type="submit">Entrar</button>
    </form>
    <p class="nota" style="margin-top:10px">Solo se pide una vez en cada teléfono.</p>
  </div>
  <?php endif; ?>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<script>
try { new QRCode(document.getElementById('qr'), {text: <?= json_encode($url) ?>, width: 380, height: 380, correctLevel: QRCode.CorrectLevel.M}); } catch (e) {}
(function(){ var m = document.getElementById('mesero'); if (!m) return;
  try { m.value = localStorage.getItem('tqMesero') || ''; } catch (e) {}
  m.form.addEventListener('submit', function(){ try { localStorage.setItem('tqMesero', m.value); } catch (e) {} });
})();
</script>
</body></html>
