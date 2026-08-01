Hola. Tengo el código base de un sitio web para una liga de básquetbol
amateur, ya construido y probado en producción con Claude en otro
proyecto. Está adjunto en este chat. Quiero que lo adaptes para MI liga,
sin reconstruir nada desde cero.

## Qué es el sitio (contexto para ti, Claude)

Sitio 100% estático (HTML/CSS/JS puro, sin build ni framework),
hospedado en GitHub Pages, con panel de administración sin código vía
Decap CMS + DecapBridge (backend: git-gateway sobre GitHub). Los datos
viven en archivos JSON dentro de `data/`, editables desde `/admin` o
directo en GitHub.

## Modelo de datos (IMPORTANTE, léelo antes de tocar nada)

- **Equipos y Jugadores son UNIFICADOS** (`data/equipos.json`,
  `data/roster.json`) — no hay un archivo por categoría. Un equipo tiene
  un campo `categorias` (lista, multi-select) y puede jugar en varias a
  la vez desde UN solo registro. Un jugador tiene un campo `membresias`
  (lista de `{categoria_id, equipo_id, temporada}`) y puede pertenecer a
  varios equipos/categorías sin duplicar su registro base.
- **Juegos y Playoffs SÍ siguen siendo un archivo por categoría**
  (`data/juegos_catA.json`, `data/playoffs_catA.json`, etc.) — esto es
  una limitación real de Decap CMS: el buscador de equipo/jugador al
  capturar un juego solo puede filtrarse automáticamente por categoría
  si cada una tiene su propio archivo. Unificar también juegos
  eliminaría ese filtro automático (ya lo intentamos con equipos/
  jugadores y aceptamos el trade-off: el buscador ahí SÍ muestra a
  todos, sin filtrar — mitigado con `display_fields` mostrando la
  categoría junto al nombre para evitar confusión).
- Cada juego, dentro de cada archivo por categoría, tiene
  `estadisticas_local` y `estadisticas_visita` como listas SEPARADAS
  (no una sola mezclada) — esto es crítico, no las unifiques, es lo que
  permite separar correctamente las estadísticas de cada equipo.
- `js/datos.js` centraliza toda la carga: lee los 2 archivos unificados
  (equipos/roster) y los archivos por categoría (juegos/playoffs), y los
  "despliega" (flatMap) para que el resto de páginas siga trabajando con
  la forma de datos de siempre (`{..., categoria_id: X}` por fila) sin
  tener que tocarlas. Si agregas algo nuevo al modelo de datos, sigue
  ese mismo patrón de compatibilidad hacia atrás.

## ⚠️ Lección aprendida (para que no se repita)

Si dos equipos con el MISMO NOMBRE pero de DISTINTA categoría son en
realidad equipos independientes (rosters distintos, no el mismo club),
NUNCA los fusiones en un solo registro con `categorias: [A, B]` — eso
mezcla sus jugadores. Solo usa un registro multi-categoría cuando de
verdad es el mismo club/organización fielding equipos en ambas
categorías. Ante la duda, pregúntale al usuario antes de fusionar o
separar equipos.

## Páginas / funcionalidad ya construida (8 en el nav)

1. **Calendario**: rol agrupado por mes (colapsable), resultados,
   forfeit (2/1/0 pts), fase (regular/playoffs/final/amistoso), vuelta,
   MVP (por relación, no texto libre), hoja de estadísticas expandible,
   banner de "Próximo Juego" (automático o "Juego Destacado" manual).
2. **Standing**: puntos con desempates oficiales (cabeza a cabeza /
   diferencial).
3. **Equipos**: por temporada/categoría — estadísticas del equipo,
   roster con totales, historial expandible, exportar a PDF.
4. **Rankings**: pestañas para Ofensivos/Defensivos/Tripleros/
   Defensa 3pt/Fair Play/MVP/Campeón, todo en una página.
5. **Comparador**: cualquier 2 equipos, comparativo de temporada +
   historial de TODAS las temporadas si existe.
6. **Playoffs**: series a ganar 2 de 3, por ronda.
7. **Líderes**: top 10 puntos/triples/faltas.
8. **Noticias**: avisos con imagen.

Favicon + Open Graph (vista previa al compartir) en las 8 páginas.
Selector de temporada en cada página relevante.

## Categorías nuevas — limitación pendiente

Agregar una categoría nueva completa (con su propio Rol de Juegos/
Playoffs) SÍ requiere tocar `admin/config.yml` y regenerar las páginas
(no es 100% self-service desde el panel todavía). Si el usuario pide
esto, avísale que es un cambio de código puntual, no algo que pueda
hacer solo desde `/admin`.

## Lo que necesito que hagas

1. Lee el `README.md` del proyecto (pasos de instalación completos:
   GitHub, GitHub Pages, DecapBridge, dominio propio).
2. Personaliza con estos datos:
   - **Nombre de la liga:** _______________
   - **Categorías** (reemplazar catA/catB/catC): _______________
   - **Día(s) de juego por categoría:** _______________
   - **Equipos por categoría:** _______________
   - **Sede(s):** _______________
   - **Colores:** _______________
   - **¿Ya tengo GitHub/repo?:** _______________
   - **¿Dominio propio?:** _______________
3. Ayúdame paso a paso a dejarlo publicado y el panel funcionando.

Empecemos por el punto 2 — dime qué necesitas que te conteste primero.
