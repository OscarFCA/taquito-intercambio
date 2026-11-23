<?php
/* Guarda la postal personalizada y devuelve el enlace para mandarla */
require __DIR__ . '/../_priv/lib.php';
json_cors();
if ($_SERVER['REQUEST_METHOD'] !== 'POST') responder(['error' => 'Método no permitido'], 405);
$f = $_FILES['imagen'] ?? null;
if (!$f || $f['error'] !== UPLOAD_ERR_OK || $f['size'] > 5 * 1024 * 1024) responder(['error' => 'No recibimos la imagen'], 400);
$info = @getimagesize($f['tmp_name']);
if (!$info || !in_array($info[2], [IMAGETYPE_JPEG, IMAGETYPE_PNG], true) || $info[0] > 4000 || $info[1] > 4000) responder(['error' => 'La imagen no es válida'], 400);
$q = db()->prepare("SELECT COUNT(*) FROM postales WHERE ip=? AND creada > ?");
$q->execute([ip(), date('Y-m-d H:i:s', time() - 3600)]);
if ((int)$q->fetchColumn() >= 30) responder(['error' => 'Demasiadas postales en una hora. Intenta más tarde.'], 429);
/* Se vuelve a codificar: así solo queda la imagen, sin datos ocultos */
$im = $info[2] === IMAGETYPE_JPEG ? @imagecreatefromjpeg($f['tmp_name']) : @imagecreatefrompng($f['tmp_name']);
if (!$im) responder(['error' => 'La imagen no es válida'], 400);
do { $code = codigo(6); $e = db()->prepare('SELECT 1 FROM postales WHERE code=?'); $e->execute([$code]); } while ($e->fetchColumn());
imagejpeg($im, DATOS . "/postales/$code.jpg", 86);
imagedestroy($im);
$corta = fn($s) => mb_substr(trim((string)$s), 0, 28, 'UTF-8');
$postal = preg_match('~^\d\d$~', $_POST['postal'] ?? '') ? $_POST['postal'] : '';
db()->prepare('INSERT INTO postales(code,para,de,postal,creada,ip) VALUES(?,?,?,?,?,?)')
  ->execute([$code, $corta($_POST['para'] ?? ''), $corta($_POST['de'] ?? ''), $postal, ahora(), ip()]);
responder(['code' => $code, 'url' => SITIO . '/p/' . $code]);
