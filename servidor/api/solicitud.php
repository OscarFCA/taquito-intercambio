<?php
/* Alguien ya compartió su historia y pide su ticket */
require __DIR__ . '/../_priv/lib.php';
json_cors();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(['error' => 'Método no permitido'], 405);
$in = json_decode(file_get_contents('php://input'), true) ?: $_POST;
$red = array_key_exists($in['red'] ?? '', REDES) ? $in['red'] : '';
$promo = array_key_exists($in['promo'] ?? '', PROMOS) ? $in['promo'] : '';
$usuario = limpiar_usuario((string)($in['usuario'] ?? ''));
$postal = preg_match('~^\d\d$~', $in['postal'] ?? '') ? $in['postal'] : '';
$origen = preg_match('~^[A-Z0-9]{6}$~', $in['origen'] ?? '') ? $in['origen'] : '';
if (!vigente()) responder(['error' => 'La promoción ya terminó.'], 410);
if (!$red || !$promo) responder(['error' => 'Elige tu red social y tu promoción.'], 400);
if (!$usuario) responder(['error' => 'Escribe tu usuario tal como aparece en tu perfil.'], 400);
if (quedan($promo) <= 0) responder(['error' => 'Esa promoción ya se agotó. Elige la otra.', 'agotado' => $promo], 409);
$q = db()->prepare("SELECT COUNT(*) FROM solicitudes WHERE ip=? AND creada > ?");
$q->execute([ip(), date('Y-m-d H:i:s', time() - 3600)]);
if ((int)$q->fetchColumn() >= 10) responder(['error' => 'Demasiados intentos. Intenta más tarde.'], 429);
$t = db()->prepare('SELECT 1 FROM tickets WHERE red=? AND usuario=?'); $t->execute([$red, $usuario]);
$s = db()->prepare('SELECT estado FROM solicitudes WHERE red=? AND usuario=?'); $s->execute([$red, $usuario]);
$previa = $s->fetchColumn();
if ($t->fetchColumn() || $previa === 'aprobada') responder(['error' => 'Ese usuario ya tiene su ticket. La promoción es una por persona.'], 409);
if ($previa === 'pendiente') responder(['ok' => true, 'repetida' => true, 'mensaje' => 'Ya tenemos tu solicitud. En cuanto veamos tu historia te mandamos tu ticket.']);
if ($previa === 'rechazada') {
  db()->prepare("UPDATE solicitudes SET estado='pendiente', promo=?, creada=?, ip=? WHERE red=? AND usuario=?")->execute([$promo, ahora(), ip(), $red, $usuario]);
} else {
  db()->prepare('INSERT INTO solicitudes(red,usuario,promo,postal,origen,creada,ip) VALUES(?,?,?,?,?,?,?)')
    ->execute([$red, $usuario, $promo, $postal, $origen, ahora(), ip()]);
}
responder(['ok' => true, 'mensaje' => 'En cuanto veamos tu historia con nuestra etiqueta te mandamos tu ticket por mensaje a @' . $usuario . '.']);
