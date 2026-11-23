<?php
/* Cuántas promociones quedan de cada tipo */
require __DIR__ . '/../_priv/lib.php';
json_cors();
$r = [];
foreach (PROMOS as $k => $p) $r[$k] = ['nombre' => $p['nombre'], 'quedan' => quedan($k)];
responder(['promos' => $r, 'vigente' => vigente(), 'cuenta' => CUENTA_IG]);
