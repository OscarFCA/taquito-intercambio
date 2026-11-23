<?php
/* Sirve la imagen de una postal enviada. ?dl=1 la descarga y la cuenta */
require __DIR__ . '/../_priv/lib.php';
$c = preg_match('~^[A-Z0-9]{6}$~', $_GET['c'] ?? '') ? $_GET['c'] : '';
$file = DATOS . "/postales/$c.jpg";
if (!$c || !is_file($file)) { http_response_code(404); exit('No encontrada'); }
if (!empty($_GET['dl'])) {
  db()->prepare('UPDATE postales SET descargas=descargas+1 WHERE code=?')->execute([$c]);
  header('Content-Disposition: attachment; filename="postal-el-taquito-' . $c . '.jpg"');
}
header('Content-Type: image/jpeg');
header('Content-Length: ' . filesize($file));
header('Cache-Control: public, max-age=86400');
header('Access-Control-Allow-Origin: *');
readfile($file);
