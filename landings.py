#!/usr/bin/env python3
"""Genera una landing por postal: 01/index.html … 15/index.html.

Cada una es una copia de index.html con su propio título y vista previa para
WhatsApp, <base href="../"> para que las rutas relativas sigan funcionando, y
window.POSTAL_FIJA para que la página muestre siempre esa postal.

Correr después de cada cambio a index.html:  python3 landings.py
"""
import html
import os
import re

RAIZ = os.path.dirname(os.path.abspath(__file__))
SITIO = 'https://eltaquito.com.mx/postal/'

fuente = open(os.path.join(RAIZ, 'index.html'), encoding='utf-8').read()
postales = dict(
    (n, t) for n, t in re.findall(r'"(\d\d)":\{t:"([^"]+)"', fuente)
)
assert len(postales) == 15, postales

for n, titulo in sorted(postales.items()):
    t = html.escape(titulo.replace('«', '').replace('»', ''))
    nombre = f'{t} · Postal N.º {n} · El Taquito'
    desc = (f'Postal N.º {n} de Intercambio con Sabor. Descubre la historia detrás de la foto, '
            'crea tu postal personalizada y llévate una sorpresa en El Taquito, desde 1917.')
    cabeza = (
        '<meta charset="utf-8">\n'
        '<base href="../">\n'
        f'<script>window.POSTAL_FIJA="{n}"</script>\n'
        f'<meta name="description" content="{desc}">\n'
        f'<link rel="canonical" href="{SITIO}{n}/">\n'
        '<meta property="og:type" content="website">\n'
        f'<meta property="og:title" content="{nombre}">\n'
        f'<meta property="og:description" content="{desc}">\n'
        f'<meta property="og:image" content="{SITIO}img/frente-{n}.jpg">\n'
        f'<meta property="og:url" content="{SITIO}{n}/">\n'
        '<meta name="twitter:card" content="summary_large_image">'
    )
    pagina = fuente.replace('<meta charset="utf-8">', cabeza, 1)
    pagina = pagina.replace('<title>Intercambio con Sabor · El Taquito</title>', f'<title>{nombre}</title>', 1)
    carpeta = os.path.join(RAIZ, n)
    os.makedirs(carpeta, exist_ok=True)
    open(os.path.join(carpeta, 'index.html'), 'w', encoding='utf-8').write(pagina)
    print(f'{n}/index.html  {titulo}')
