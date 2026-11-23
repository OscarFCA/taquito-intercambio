<?php
/* Intercambio con Sabor · El Taquito — funciones comunes del servidor */
declare(strict_types=1);
require __DIR__ . '/config.php';
date_default_timezone_set('America/Mexico_City');

/* Los datos viven fuera de la carpeta pública */
const DATOS = '/home4/eliasosc/eltaquito_datos';

const PROMOS = [
  '2x1' => ['nombre' => '2×1 en bebidas', 'grande' => '2×1', 'sub' => 'EN BEBIDAS'],
  '10'  => ['nombre' => '10% de descuento en tu consumo', 'grande' => '10%', 'sub' => 'EN TU CONSUMO'],
];
const REDES = ['instagram' => 'Instagram', 'facebook' => 'Facebook', 'tiktok' => 'TikTok'];

function db(): PDO {
  static $pdo = null;
  if ($pdo) return $pdo;
  if (!is_dir(DATOS . '/postales')) mkdir(DATOS . '/postales', 0750, true);
  $pdo = new PDO('sqlite:' . DATOS . '/taquito.sqlite');
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  $pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
  $pdo->exec('PRAGMA busy_timeout=5000');
  $pdo->exec("CREATE TABLE IF NOT EXISTS postales(
      code TEXT PRIMARY KEY, para TEXT, de TEXT, postal TEXT, creada TEXT, ip TEXT,
      vistas INTEGER DEFAULT 0, descargas INTEGER DEFAULT 0)");
  $pdo->exec("CREATE TABLE IF NOT EXISTS solicitudes(
      id INTEGER PRIMARY KEY AUTOINCREMENT, red TEXT, usuario TEXT, promo TEXT, postal TEXT, origen TEXT,
      creada TEXT, estado TEXT DEFAULT 'pendiente', ticket TEXT, ip TEXT, UNIQUE(red, usuario))");
  $pdo->exec("CREATE TABLE IF NOT EXISTS tickets(
      token TEXT PRIMARY KEY, promo TEXT, red TEXT, usuario TEXT, solicitud INTEGER,
      creado TEXT, canjeado TEXT, mesero TEXT, mesa TEXT)");
  $pdo->exec("CREATE TABLE IF NOT EXISTS ajustes(k TEXT PRIMARY KEY, v TEXT)");
  return $pdo;
}

function ahora(): string { return date('Y-m-d H:i:s'); }
function h(?string $s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }
function codigo(int $n): string {
  $a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; $s = '';
  for ($i = 0; $i < $n; $i++) $s .= $a[random_int(0, strlen($a) - 1)];
  return $s;
}
function ip(): string { return $_SERVER['HTTP_CF_CONNECTING_IP'] ?? $_SERVER['REMOTE_ADDR'] ?? ''; }

/* Existencias: lo que se puede repartir menos los tickets ya emitidos */
function existencia(string $promo): int {
  $v = db()->prepare('SELECT v FROM ajustes WHERE k=?'); $v->execute(['stock_' . $promo]);
  $r = $v->fetchColumn();
  return $r === false ? (EXISTENCIA_INICIAL[$promo] ?? 0) : (int)$r;
}
function emitidos(string $promo): int {
  $q = db()->prepare('SELECT COUNT(*) FROM tickets WHERE promo=?'); $q->execute([$promo]);
  return (int)$q->fetchColumn();
}
function quedan(string $promo): int { return max(0, existencia($promo) - emitidos($promo)); }

/* Usuario de red social: sin @, minúsculas, solo caracteres válidos */
function limpiar_usuario(string $u): string {
  $u = mb_strtolower(trim($u), 'UTF-8');
  $u = ltrim($u, '@');
  $u = preg_replace('~^https?://(www\.)?(instagram|facebook|tiktok)\.com/@?~', '', $u);
  $u = trim($u, '/ ');
  return preg_match('~^[\p{L}0-9._ -]{2,50}$~u', $u) ? $u : '';
}
function perfil(string $red, string $u): string {
  $e = rawurlencode($u);
  return $red === 'instagram' ? "https://instagram.com/$e" : ($red === 'tiktok' ? "https://www.tiktok.com/@$e" : "https://www.facebook.com/search/top?q=$e");
}
function dia_habil(): bool { return (int)date('N') <= 5; }
function vigente(): bool { return date('Y-m-d') <= VIGENCIA_FIN; }

/* Sesión del personal: una cookie firmada que dura 180 días */
function firma(string $rol): string { return $rol . '.' . hash_hmac('sha256', $rol, SECRETO); }
function rol(): string {
  $c = $_COOKIE['tq_staff'] ?? '';
  foreach (['admin', 'mesero'] as $r) if (hash_equals(firma($r), $c)) return $r;
  return '';
}
function entrar(string $rol): void {
  setcookie('tq_staff', firma($rol), ['expires' => time() + 180 * 86400, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']);
  $_COOKIE['tq_staff'] = firma($rol);
}
function salir(): void { setcookie('tq_staff', '', ['expires' => time() - 3600, 'path' => '/', 'secure' => true, 'httponly' => true, 'samesite' => 'Lax']); }
function clave_ok(string $intento, string $hash): bool { return hash_equals($hash, hash('sha256', SECRETO . $intento)); }

/* Respuesta JSON con CORS para la landing y sus subdominios */
function json_cors(): void {
  $o = $_SERVER['HTTP_ORIGIN'] ?? '';
  if (preg_match('~^https://([a-z0-9-]+\.)?eltaquito\.com\.mx$|^https://oscarfca\.github\.io$|^http://localhost(:\d+)?$~', $o)) {
    header('Access-Control-Allow-Origin: ' . $o);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
  }
  header('Content-Type: application/json; charset=utf-8');
  header('Cache-Control: no-store');
  if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') exit;
}
function responder(array $d, int $status = 200): void { http_response_code($status); echo json_encode($d, JSON_UNESCAPED_UNICODE); exit; }

/* Cabecera HTML compartida por /p, /t y /panel */
function cabeza(string $titulo, string $extra = ''): void {
  echo '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">';
  echo '<title>' . h($titulo) . '</title><meta name="robots" content="noindex">';
  echo '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&family=Oswald:wght@500;700&display=swap" rel="stylesheet">';
  echo $extra;
  echo '<style>' . CSS_BASE . '</style></head><body>';
}
const CSS_BASE = ':root{--verde:#354A39;--rojo:#B52E2B;--crema:#EADDB6;--papel:#F3EBD3;--carbon:#101417;--tinta:#2B2A26}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:Montserrat,sans-serif;color:var(--tinta);background:var(--papel);line-height:1.55;min-height:100vh;
 background-image:radial-gradient(rgba(120,95,50,.07) 1px,transparent 1px);background-size:5px 5px}
img{max-width:100%;height:auto;display:block}a{color:inherit}
header.top{background:var(--verde);padding:14px 20px;display:flex;align-items:center;justify-content:space-between;gap:12px}
header.top img{height:40px}
.wrap{max-width:760px;margin:0 auto;padding:0 20px}
.eyebrow{font-weight:700;font-size:12.5px;letter-spacing:.28em;color:var(--rojo);text-transform:uppercase}
h1,h2{font-family:Oswald,sans-serif;font-weight:700;text-transform:uppercase;line-height:1.04;color:var(--verde)}
h1{font-size:clamp(34px,7vw,58px)}h2{font-size:clamp(26px,5vw,38px)}
.lead{font-family:Lora,serif;font-style:italic;font-size:clamp(17px,2.4vw,20px)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:10px;font:700 15px Montserrat;letter-spacing:.04em;padding:15px 24px;border-radius:999px;text-decoration:none;border:0;cursor:pointer}
.btn-rojo{background:var(--rojo);color:#fff}.btn-verde{background:var(--verde);color:var(--crema)}.btn-borde{background:transparent;border:2px solid var(--verde);color:var(--verde)}
.btn[disabled]{opacity:.5;cursor:not-allowed}
input,select{font:inherit;padding:12px 14px;border:2px solid #cdbf98;border-radius:8px;background:#fff;width:100%}
label{display:block;font-weight:700;font-size:12.5px;letter-spacing:.08em;margin:12px 0 6px;color:var(--verde)}
.nota{font-size:13px;color:#6b624b}
footer{background:var(--carbon);color:var(--crema);padding:28px 0;font-size:13.5px;margin-top:48px}';
