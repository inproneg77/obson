# Plantilla de sitio para liga de básquetbol

Copia genérica y funcional de un sitio de liga ya probado en producción.
Trae: calendario, standing con desempates oficiales, playoffs, campeones
automáticos, equipos multi-categoría, jugadores con membresías por
categoría/equipo/temporada, rankings, comparador, líderes, noticias,
banner de próximo juego, exportar a PDF, y panel de administración
sin código.

## Instalación

1. **GitHub**: crea cuenta en [github.com](https://github.com), crea un
   repositorio nuevo (Public, vacío)
2. Sube **todo el contenido de esta carpeta** (no la carpeta en sí) con
   "Add file → Upload files"
3. **GitHub Pages**: Settings → Pages → Source: "Deploy from a branch" →
   `main`, carpeta `/ (root)` → Save
4. **Panel de administración (DecapBridge)**:
   - Crea cuenta en [decapbridge.com](https://decapbridge.com)
   - Crea un token en GitHub (Settings → Developer settings →
     Fine-grained tokens), acceso solo a tu repo, permiso
     "Contents: Read and write"
   - En DecapBridge → "Add site" → conecta tu repo, pega el token,
     URL de login = `https://inproneg77.github.io/obson/admin/index.html`,
     Auth type: Classic
   - Copia el `identity_url` que te da y pégalo en `admin/config.yml`
     (reemplaza `TU-SITE-ID` y `repo:`)
   - Invita tu correo en "Manage collaborators", acepta, entra a `/admin`

## Primeros pasos en el panel (en este orden)

1. **📅 Temporadas** → crea la primera, márcala activa
2. **📍 Sedes**
3. **🏀 Equipos** → da de alta cada equipo (elige en qué categoría(s)
   participa — solo marca varias si es literalmente el mismo club)
4. **👤 Jugadores** → da de alta cada jugador con sus membresías
   (categoría + equipo + temporada)
5. **🏀 [Categoría] · Rol de Juegos** → programa los partidos
6. Al día siguiente de jugarse: Estatus → "Jugado", captura marcador y
   estadísticas individuales (separadas en Local/Visita)

## Categorías nuevas

Este sitio ya trae las 6 categorías de ADEMEBA configuradas en
`admin/config.yml` y `data/categorias.json`: Primera Fuerza (`1f`),
Segunda Fuerza (`2f`), Tercera Fuerza (`3f`), Beginners (`beg`),
Dominguera (`dom`) y Botanera (`bot`). Agregar una categoría más allá
de esas 6 requiere editar `admin/config.yml` y las páginas del sitio —
no es 100% posible desde el panel sin tocar código (limitación de la
herramienta). Pide ayuda a Claude para esto si lo necesitas.

## Dominio propio (opcional)
1. Registrador (Namecheap, etc.) → 4 registros A a
   `185.199.108.153` / `.109.153` / `.110.153` / `.111.153`, más 4 AAAA a
   `2606:50c0:8000::153` / `8001::153` / `8002::153` / `8003::153`
   (el AAAA es importante — sin él, algunos operadores móviles no cargan
   el sitio con datos móviles aunque WiFi sí funcione)
2. GitHub → Settings → Pages → Custom domain → tu dominio
3. Activa "Enforce HTTPS" en cuanto esté disponible (hasta 24h)
