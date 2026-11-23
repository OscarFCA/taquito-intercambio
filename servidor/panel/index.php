<?php
/* Panel de El Taquito: aprobar solicitudes, emitir tickets, ver canjes y existencias */
require __DIR__ . '/../_priv/lib.php';
header('Cache-Control: no-store');
$aviso = ''; $tipo = 'ok'; $nuevo = null;

function mensaje_dm(array $t): string {
  $p = PROMOS[$t['promo']]['nombre'] ?? $t['promo'];
  return "¡Gracias por compartir tu postal, @{$t['usuario']}! Aquí está tu ticket digital para tu {$p} en El Taquito: " . SITIO . "/t/{$t['token']}\n"
    . "Muéstralo a tu mesero de lunes a viernes. Es válido una sola vez, hasta el " . date('j/m/Y', strtotime(VIGENCIA_FIN)) . ". ¡Te esperamos!";
}
function emitir(string $red, string $usuario, string $promo, ?int $sol): array {
  $pdo = db(); $pdo->beginTransaction();
  try {
    if (quedan($promo) <= 0) throw new RuntimeException('Ya no quedan promociones de ' . PROMOS[$promo]['nombre'] . '. Sube la existencia o elige la otra.');
    $e = $pdo->prepare('SELECT token FROM tickets WHERE red=? AND usuario=?'); $e->execute([$red, $usuario]);
    if ($e->fetchColumn()) throw new RuntimeException("@$usuario ya tiene un ticket. Es uno por persona.");
    do { $tok = codigo(10); $x = $pdo->prepare('SELECT 1 FROM tickets WHERE token=?'); $x->execute([$tok]); } while ($x->fetchColumn());
    $pdo->prepare('INSERT INTO tickets(token,promo,red,usuario,solicitud,creado) VALUES(?,?,?,?,?,?)')->execute([$tok, $promo, $red, $usuario, $sol, ahora()]);
    if ($sol) $pdo->prepare("UPDATE solicitudes SET estado='aprobada', ticket=? WHERE id=?")->execute([$tok, $sol]);
    $pdo->commit();
    return ['token' => $tok, 'promo' => $promo, 'usuario' => $usuario, 'red' => $red];
  } catch (Throwable $ex) { $pdo->rollBack(); throw $ex; }
}

$acc = $_POST['accion'] ?? '';
if ($acc === 'login') {
  if (clave_ok((string)($_POST['clave'] ?? ''), PANEL_HASH)) entrar('admin');
  else { sleep(1); $aviso = 'Contraseña incorrecta.'; $tipo = 'error'; }
} elseif ($acc === 'salir') { salir(); $_COOKIE['tq_staff'] = ''; }

if (rol() !== 'admin') {
  cabeza('Panel · Intercambio con Sabor'); ?>
  <header class="top"><img src="/postal/img/logo-crema.png" alt="El Taquito"></header>
  <main class="wrap" style="max-width:420px;padding-top:60px">
    <div class="eyebrow">Intercambio con Sabor</div><h1 style="font-size:40px">Panel</h1>
    <?php if ($aviso): ?><p style="color:var(--rojo);font-weight:700;margin-top:10px"><?= h($aviso) ?></p><?php endif; ?>
    <form method="post" style="margin-top:16px"><input type="hidden" name="accion" value="login">
      <label for="clave">CONTRASEÑA</label><input type="password" id="clave" name="clave" autofocus required>
      <button class="btn btn-rojo" style="width:100%;margin-top:16px">Entrar</button></form>
  </main></body></html><?php
  exit;
}

try {
  if ($acc === 'aprobar') {
    $s = db()->prepare("SELECT * FROM solicitudes WHERE id=? AND estado='pendiente'"); $s->execute([(int)$_POST['id']]);
    $sol = $s->fetch();
    if (!$sol) throw new RuntimeException('Esa solicitud ya no está pendiente.');
    $promo = array_key_exists($_POST['promo'] ?? '', PROMOS) ? $_POST['promo'] : $sol['promo'];
    $nuevo = emitir($sol['red'], $sol['usuario'], $promo, (int)$sol['id']);
    $aviso = "Ticket creado para @{$sol['usuario']}. Copia el mensaje y mándaselo por DM.";
  } elseif ($acc === 'rechazar') {
    db()->prepare("UPDATE solicitudes SET estado='rechazada' WHERE id=? AND estado='pendiente'")->execute([(int)$_POST['id']]);
    $aviso = 'Solicitud rechazada. Si vuelve a compartir, puede pedirlo otra vez.';
  } elseif ($acc === 'manual') {
    $red = array_key_exists($_POST['red'] ?? '', REDES) ? $_POST['red'] : '';
    $promo = array_key_exists($_POST['promo'] ?? '', PROMOS) ? $_POST['promo'] : '';
    $u = limpiar_usuario((string)($_POST['usuario'] ?? ''));
    if (!$red || !$promo || !$u) throw new RuntimeException('Revisa la red, el usuario y la promoción.');
    $p = db()->prepare("SELECT id FROM solicitudes WHERE red=? AND usuario=? AND estado='pendiente'"); $p->execute([$red, $u]);
    $nuevo = emitir($red, $u, $promo, ($id = $p->fetchColumn()) ? (int)$id : null);
    $aviso = "Ticket creado para @$u. Copia el mensaje y mándaselo por DM.";
  } elseif ($acc === 'stock') {
    foreach (PROMOS as $k => $_) {
      $v = max(0, (int)($_POST["stock_$k"] ?? existencia($k)));
      db()->prepare('INSERT INTO ajustes(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v')->execute(["stock_$k", (string)$v]);
    }
    $aviso = 'Existencias actualizadas.';
  }
} catch (RuntimeException $ex) { $aviso = $ex->getMessage(); $tipo = 'error'; }

$pend = db()->query("SELECT * FROM solicitudes WHERE estado='pendiente' ORDER BY creada")->fetchAll();
$tickets = db()->query('SELECT * FROM tickets ORDER BY creado DESC LIMIT 300')->fetchAll();
$tot = db()->query('SELECT COUNT(*) n, COALESCE(SUM(vistas),0) v, COALESCE(SUM(descargas),0) d FROM postales')->fetch();
$canj = []; foreach (PROMOS as $k => $_) { $c = db()->prepare('SELECT COUNT(*) FROM tickets WHERE promo=? AND canjeado IS NOT NULL'); $c->execute([$k]); $canj[$k] = (int)$c->fetchColumn(); }

cabeza('Panel · Intercambio con Sabor');
?>
<style>
.wrap{max-width:1100px}
.bar{display:flex;justify-content:space-between;align-items:end;gap:12px;flex-wrap:wrap;margin:28px 0 18px}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px}
.kpi{background:#fffaf0;border:2px solid var(--verde);border-radius:14px;padding:16px}
.kpi .t{font:700 11.5px Montserrat;letter-spacing:.14em;color:var(--verde);text-transform:uppercase}
.kpi .n{font:700 40px/1.05 Oswald;color:var(--rojo);margin-top:4px}
.kpi .s{font-size:13px;color:#555}
.box{background:#fffaf0;border:2px solid var(--verde);border-radius:14px;padding:18px;margin-top:22px}
.box h2{font-size:24px;margin-bottom:10px}
table{width:100%;border-collapse:collapse;font-size:14px}
th{text-align:left;font-size:11.5px;letter-spacing:.1em;color:var(--verde);padding:8px 6px;border-bottom:2px solid var(--verde)}
td{padding:9px 6px;border-bottom:1px solid #e2d6b4;vertical-align:middle}
.tag{display:inline-block;padding:3px 9px;border-radius:999px;font:700 11px Montserrat;letter-spacing:.06em}
.tag.ok{background:var(--verde);color:var(--crema)}.tag.no{background:#e9dfc4;color:var(--carbon)}
.mini{padding:8px 12px;font-size:12.5px;border-radius:8px;border:0;font-weight:700;cursor:pointer}
.mini.v{background:var(--verde);color:var(--crema)}.mini.r{background:#e9dfc4;color:var(--carbon)}
.fila{display:grid;grid-template-columns:1fr 1.4fr 1.2fr auto;gap:10px;align-items:end}
@media(max-width:760px){.fila{grid-template-columns:1fr}.tabla{overflow-x:auto}}
.aviso{padding:14px 18px;border-radius:12px;font-weight:600;margin-top:18px}
.aviso.ok{background:#d8ecd5;color:#1d4d22}.aviso.error{background:#f6d6d3;color:#7d1c18}
textarea{width:100%;font:14px/1.5 Montserrat;padding:12px;border:2px solid #cdbf98;border-radius:8px;margin-top:10px;min-height:96px}
</style>
<header class="top"><img src="/postal/img/logo-crema.png" alt="El Taquito">
  <form method="post"><input type="hidden" name="accion" value="salir"><button class="mini r">Salir</button></form></header>
<main class="wrap">
  <div class="bar"><div><div class="eyebrow">Intercambio con Sabor</div><h1 style="font-size:40px">Panel de promociones</h1></div>
    <a class="mini v" style="text-decoration:none" href="">Actualizar</a></div>

  <?php if ($aviso): ?><div class="aviso <?= $tipo ?>"><?= h($aviso) ?></div><?php endif; ?>
  <?php if ($nuevo): $m = mensaje_dm($nuevo); ?>
  <div class="box" style="border-color:var(--rojo)">
    <h2>Mensaje para @<?= h($nuevo['usuario']) ?></h2>
    <a href="<?= h(perfil($nuevo['red'], $nuevo['usuario'])) ?>" target="_blank" rel="noopener">Abrir su perfil de <?= h(REDES[$nuevo['red']]) ?> →</a>
    <textarea id="dm" readonly><?= h($m) ?></textarea>
    <button class="btn btn-rojo" type="button" onclick="copiar(document.getElementById('dm').value,this)">Copiar mensaje</button>
  </div>
  <?php endif; ?>

  <div class="kpis" style="margin-top:22px">
    <?php foreach (PROMOS as $k => $p): ?>
    <div class="kpi"><div class="t"><?= h($p['nombre']) ?></div><div class="n"><?= $canj[$k] ?> <span style="font-size:20px;color:var(--verde)">canjeadas</span></div>
      <div class="s"><?= emitidos($k) ?> tickets enviados · quedan <?= quedan($k) ?> de <?= existencia($k) ?></div></div>
    <?php endforeach; ?>
    <div class="kpi"><div class="t">Solicitudes por revisar</div><div class="n"><?= count($pend) ?></div><div class="s">Revisa que su historia nos etiquete</div></div>
    <div class="kpi"><div class="t">Postales enviadas</div><div class="n"><?= (int)$tot['n'] ?></div><div class="s"><?= (int)$tot['v'] ?> abiertas · <?= (int)$tot['d'] ?> descargas</div></div>
  </div>

  <div class="box">
    <h2>Solicitudes por revisar</h2>
    <?php if (!$pend): ?><p class="nota">No hay solicitudes pendientes.</p><?php else: ?>
    <p class="nota" style="margin-bottom:10px">Abre su perfil, confirma que su historia nos etiqueta y aprueba. Puedes cambiar la promoción antes de aprobar si ya se agotó la que eligió.</p>
    <div class="tabla"><table><tr><th>FECHA</th><th>USUARIO</th><th>PROMOCIÓN</th><th>POSTAL</th><th></th></tr>
    <?php foreach ($pend as $s): ?>
      <tr><td><?= h(date('j/m H:i', strtotime($s['creada']))) ?></td>
        <td><a href="<?= h(perfil($s['red'], $s['usuario'])) ?>" target="_blank" rel="noopener"><b>@<?= h($s['usuario']) ?></b></a><br><span class="nota"><?= h(REDES[$s['red']] ?? $s['red']) ?></span></td>
        <td><form method="post" style="display:flex;gap:6px;flex-wrap:wrap;align-items:center"><input type="hidden" name="accion" value="aprobar"><input type="hidden" name="id" value="<?= (int)$s['id'] ?>">
          <select name="promo" style="width:auto;padding:7px 10px"><?php foreach (PROMOS as $k => $p): ?><option value="<?= $k ?>" <?= $k === $s['promo'] ? 'selected' : '' ?>><?= h($p['nombre']) ?></option><?php endforeach; ?></select>
          <button class="mini v">Aprobar y crear ticket</button></form></td>
        <td><?= $s['postal'] ? 'N.º ' . h($s['postal']) : '—' ?><?= $s['origen'] ? '<br><span class="nota">recibida</span>' : '' ?></td>
        <td><form method="post" onsubmit="return confirm('¿Rechazar esta solicitud?')"><input type="hidden" name="accion" value="rechazar"><input type="hidden" name="id" value="<?= (int)$s['id'] ?>"><button class="mini r">Rechazar</button></form></td></tr>
    <?php endforeach; ?></table></div><?php endif; ?>
  </div>

  <div class="box">
    <h2>Crear un ticket directo</h2>
    <p class="nota" style="margin-bottom:6px">Para quien nos etiquetó sin llenar el formulario.</p>
    <form method="post" class="fila"><input type="hidden" name="accion" value="manual">
      <div><label>RED</label><select name="red"><?php foreach (REDES as $k => $r): ?><option value="<?= $k ?>"><?= $r ?></option><?php endforeach; ?></select></div>
      <div><label>USUARIO</label><input name="usuario" placeholder="@usuario" required></div>
      <div><label>PROMOCIÓN</label><select name="promo"><?php foreach (PROMOS as $k => $p): ?><option value="<?= $k ?>"><?= h($p['nombre']) ?></option><?php endforeach; ?></select></div>
      <button class="btn btn-rojo">Crear ticket</button></form>
  </div>

  <div class="box">
    <h2>Tickets enviados</h2>
    <?php if (!$tickets): ?><p class="nota">Todavía no hay tickets.</p><?php else: ?>
    <div class="tabla"><table><tr><th>CREADO</th><th>USUARIO</th><th>PROMOCIÓN</th><th>ESTADO</th><th></th></tr>
    <?php foreach ($tickets as $t): ?>
      <tr><td><?= h(date('j/m H:i', strtotime($t['creado']))) ?></td>
        <td>@<?= h($t['usuario']) ?><br><span class="nota"><?= h(REDES[$t['red']] ?? $t['red']) ?></span></td>
        <td><?= h(PROMOS[$t['promo']]['nombre'] ?? $t['promo']) ?></td>
        <td><?php if ($t['canjeado']): ?><span class="tag ok">CANJEADO</span><br><span class="nota"><?= h(date('j/m H:i', strtotime($t['canjeado']))) ?><?= $t['mesero'] ? ' · ' . h($t['mesero']) : '' ?><?= $t['mesa'] ? ' · mesa ' . h($t['mesa']) : '' ?></span>
          <?php else: ?><span class="tag no">SIN USAR</span><?php endif; ?></td>
        <td style="white-space:nowrap"><a class="mini r" style="text-decoration:none" href="/t/<?= h($t['token']) ?>" target="_blank">Ver</a>
          <button class="mini v" type="button" data-m="<?= h(mensaje_dm($t)) ?>" onclick="copiar(this.dataset.m,this)">Copiar mensaje</button></td></tr>
    <?php endforeach; ?></table></div><?php endif; ?>
  </div>

  <div class="box">
    <h2>Existencias</h2>
    <p class="nota" style="margin-bottom:6px">Cuántas promociones se pueden repartir en total. Cuando se acaban, la landing muestra «Agotado».</p>
    <form method="post" class="fila" style="grid-template-columns:1fr 1fr auto"><input type="hidden" name="accion" value="stock">
      <?php foreach (PROMOS as $k => $p): ?><div><label><?= h(mb_strtoupper($p['nombre'], 'UTF-8')) ?></label><input type="number" min="0" name="stock_<?= $k ?>" value="<?= existencia($k) ?>"></div><?php endforeach; ?>
      <button class="btn btn-verde">Guardar</button></form>
  </div>
  <p class="nota" style="margin-top:18px">Los meseros entran con el PIN desde el primer ticket que escaneen. Vigencia: hasta el <?= h(date('j/m/Y', strtotime(VIGENCIA_FIN))) ?>, de lunes a viernes.</p>
</main>
<script>
function copiar(t, b) {
  var ok = function () { var o = b.textContent; b.textContent = '¡Copiado!'; setTimeout(function () { b.textContent = o; }, 1600); };
  if (navigator.clipboard) navigator.clipboard.writeText(t).then(ok, function () { prompt('Copia el mensaje:', t); });
  else prompt('Copia el mensaje:', t);
}
</script>
</body></html>
