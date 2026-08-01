// Carga los archivos de datos del sitio. Equipos, juegos y playoffs viven
// separados por categoría (así el panel /admin solo ofrece equipos de esa
// categoría, y cada bracket de playoffs es independiente).

// RUTA_IMG: prefijo relativo hacia la raíz del sitio. La página principal
// no necesita nada (''), pero las páginas en subcarpetas (standing/,
// playoffs/, valiosos/) necesitan '../' para que las imágenes carguen bien.
const RUTA_IMG = window.RUTA_IMG || '';

// fetch con tiempo límite y reintento. En datos móviles (a diferencia de
// wifi) una petición se puede quedar "colgada" sin fallar ni responder
// nunca — como antes usábamos Promise.all sin límite de tiempo, bastaba con
// que UNA de las ~16 peticiones se trabara para que el sitio completo se
// quedara cargando para siempre. Con esto, cada una tiene máximo 9s por
// intento (2 intentos), y si de plano falla, se sigue con datos vacíos en
// vez de tronar toda la carga.
async function fetchJSON(url, valorPorDefecto = {}, intentos = 2) {
  for (let i = 0; i < intentos; i++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);
    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (err) {
      clearTimeout(timeoutId);
      if (i === intentos - 1) {
        console.warn('No se pudo cargar', url, err);
        return valorPorDefecto;
      }
      await new Promise(r => setTimeout(r, 500)); // pequeña pausa antes de reintentar
    }
  }
  return valorPorDefecto;
}

async function cargarDatos() {
  const CATS = ['1f', '2f', '3f', 'beg', 'dom', 'bot'];

  const [categoriasRaw, sedesData, patrociniosData, temporadasData, equiposData, rosterData, ...resto] = await Promise.all([
    fetchJSON('data/categorias.json', []),
    fetchJSON('data/sedes.json', { sedes: [] }),
    fetchJSON('data/patrocinadores.json', { patrocinadores: [] }),
    fetchJSON('data/temporadas.json', { temporadas: [] }),
    fetchJSON('data/equipos.json', { equipos: [] }),
    fetchJSON('data/roster.json', { jugadores: [] }),
    ...CATS.map(c => fetchJSON(`data/juegos_${c}.json`, { juegos: [] })),
    ...CATS.map(c => fetchJSON(`data/playoffs_${c}.json`, { series: [] })),
  ]);

  const categorias = Array.isArray(categoriasRaw) ? categoriasRaw : [];
  const temporadas = temporadasData.temporadas ?? [];

  const juegosPorCat = resto.slice(0, CATS.length);
  const playoffsPorCat = resto.slice(CATS.length);

  const sedes = sedesData.sedes ?? sedesData;
  const patrocinadores = patrociniosData.patrocinadores ?? patrociniosData ?? [];

  // Equipos: cada equipo vive en UN solo registro y puede pertenecer a
  // varias categorías a la vez (campo "categorias"). Para que el resto del
  // sitio (que sigue filtrando por una sola categoria_id, página por
  // página) no tenga que cambiar ni una línea, aquí "desplegamos" cada
  // equipo en una fila por cada categoría a la que pertenece.
  const equipos = (equiposData.equipos ?? []).flatMap(e =>
    (e.categorias ?? []).map(catId => ({ ...e, categoria_id: catId }))
  );

  // Jugadores: cada jugador vive en UN solo registro (su nombre no se
  // repite) y puede tener varias "membresías" — una por cada combinación de
  // categoría + equipo + temporada en la que haya jugado. Igual que con
  // equipos, se despliega una fila por membresía para mantener la misma
  // forma que usaba el resto del sitio.
  const jugadores = (rosterData.jugadores ?? []).flatMap(j =>
    (j.membresias ?? []).map(m => ({
      id: j.id,
      nombre: j.nombre,
      numero: j.numero,
      categoria_id: m.categoria_id,
      equipo_id: m.equipo_id,
      temporada: m.temporada,
    }))
  );

  const juegos = CATS.flatMap((cat, i) =>
    (juegosPorCat[i].juegos ?? []).map(j => ({ ...j, categoria_id: cat }))
  );
  const playoffs = CATS.flatMap((cat, i) =>
    (playoffsPorCat[i].series ?? []).map(s => ({ ...s, categoria_id: cat }))
  );

  const equiposPorId = Object.fromEntries(equipos.map(e => [e.id, e]));
  const sedesPorId = Object.fromEntries(sedes.map(s => [s.id, s]));
  const jugadoresPorId = Object.fromEntries(jugadores.map(j => [j.id, j]));

  return { categorias, sedes, equipos, juegos, playoffs, jugadores, temporadas, patrocinadores, equiposPorId, sedesPorId, jugadoresPorId };
}

// Genera un selector de temporada (<select>) dentro de #temporada-selector.
// callback(temporadaId) se llama al iniciar (con la temporada marcada como
// activa, o la más reciente si ninguna lo está) y cada vez que cambie.
// Resuelve el nombre a mostrar como MVP: prioriza el jugador seleccionado por
// relación (mvp_jugador); si el juego es viejo y solo tiene texto libre
// (mvp_nombre), usa eso como respaldo.
function nombreMVP(juego, jugadoresPorId) {
  if (juego.mvp_jugador && jugadoresPorId[juego.mvp_jugador]) {
    return jugadoresPorId[juego.mvp_jugador].nombre;
  }
  return juego.mvp_nombre || null;
}

// Hoja de estadísticas completa de un juego: marcador, colectivos por
// equipo, individuales de cada jugador, y líderes del encuentro.
// Se usa tanto en Calendario (al expandir un juego) como en Equipos.
function renderHojaEstadistica(juego, ESTADO) {
  const local = ESTADO.equiposPorId[juego.local];
  const visita = ESTADO.equiposPorId[juego.visita];

  // Cada línea de estadística ya viene guardada bajo el equipo correcto
  // desde la captura (no se infiere del roster actual del jugador), así que
  // el historial no se rompe si un jugador cambia de equipo más adelante.
  const statsLocal = juego.estadisticas_local ?? juego.estadisticas ?? [];
  const statsVisita = juego.estadisticas_visita ?? [];

  const totales = (lista) => lista.reduce((acc, e) => ({
    puntos: acc.puntos + Number(e.puntos ?? 0),
    triples: acc.triples + Number(e.triples ?? 0),
    faltas: acc.faltas + Number(e.faltas ?? 0),
  }), { puntos: 0, triples: 0, faltas: 0 });

  const totLocal = totales(statsLocal);
  const totVisita = totales(statsVisita);

  const tablaEquipo = (nombreEquipo, lista, totales) => `
    <div class="hoja__equipo">
      <h4 class="hoja__equipo-nombre">${nombreEquipo}</h4>
      ${lista.length === 0 ? '<div class="empty" style="padding:16px;">Sin estadísticas capturadas.</div>' : `
        <div class="table-scroll">
          <table class="standing-table">
            <thead><tr><th style="text-align:left;">Jugador</th><th>Pts</th><th>3pt</th><th>Faltas</th></tr></thead>
            <tbody>
              ${lista.map(e => `
                <tr>
                  <td style="text-align:left;">${ESTADO.jugadoresPorId[e.jugador]?.nombre ?? '—'}</td>
                  <td class="mono">${e.puntos ?? 0}</td>
                  <td class="mono">${e.triples ?? 0}</td>
                  <td class="mono">${e.faltas ?? 0}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:700; background:var(--baby-soft);">
                <td style="text-align:left;">Total</td>
                <td class="mono">${totales.puntos}</td>
                <td class="mono">${totales.triples}</td>
                <td class="mono">${totales.faltas}</td>
              </tr>
            </tbody>
          </table>
        </div>
      `}
    </div>
  `;

  // Líderes del encuentro (entre ambos equipos)
  const todos = [...statsLocal, ...statsVisita].map(e => ({ ...e, nombre: ESTADO.jugadoresPorId[e.jugador]?.nombre ?? '—' }));
  const lider = (campo) => todos.length ? [...todos].sort((a,b) => (b[campo]??0) - (a[campo]??0))[0] : null;
  const liderPts = lider('puntos');
  const liderTrip = lider('triples');
  const liderFaltas = lider('faltas');

  return `
    <div class="hoja">
      <div class="hoja__marcador">
        <span>${local?.nombre ?? ''}</span>
        <span class="mono" style="font-family:'Teko',sans-serif; font-size:26px;">${juego.marcador_local} – ${juego.marcador_visita}</span>
        <span>${visita?.nombre ?? ''}</span>
      </div>
      <div class="hoja__equipos">
        ${tablaEquipo(local?.nombre ?? 'Local', statsLocal, totLocal)}
        ${tablaEquipo(visita?.nombre ?? 'Visita', statsVisita, totVisita)}
      </div>
      ${todos.length > 0 ? `
        <div class="hoja__lideres">
          ${liderPts ? `<div>🏀 Más puntos: <b>${liderPts.nombre}</b> (${liderPts.puntos ?? 0})</div>` : ''}
          ${liderTrip && liderTrip.triples > 0 ? `<div>🎯 Más triples: <b>${liderTrip.nombre}</b> (${liderTrip.triples})</div>` : ''}
          ${liderFaltas && liderFaltas.faltas > 0 ? `<div>🟨 Más faltas: <b>${liderFaltas.nombre}</b> (${liderFaltas.faltas})</div>` : ''}
        </div>
      ` : ''}
    </div>
  `;
}

// Genera un selector de temporada (<select>) dentro de #temporada-selector.
// callback(temporadaId) se llama al iniciar (con la temporada marcada como
// activa, o la más reciente si ninguna lo está) y cada vez que cambie.
function iniciarSelectorTemporada(temporadas, callback) {
  const cont = document.getElementById('temporada-selector');
  if (!cont) return () => null;

  if (!temporadas || temporadas.length === 0) {
    cont.innerHTML = '';
    callback(null);
    return () => null;
  }

  const ordenadas = [...temporadas].sort((a,b) => b.id.localeCompare(a.id));
  const porDefecto = ordenadas.find(t => String(t.activa) === 'true')?.id ?? ordenadas[0].id;

  cont.innerHTML = `
    <select id="temporada-select" class="temporada-select">
      ${ordenadas.map(t => `<option value="${t.id}" ${t.id === porDefecto ? 'selected' : ''}>${t.nombre}</option>`).join('')}
    </select>
  `;

  const select = document.getElementById('temporada-select');
  select.addEventListener('change', () => callback(select.value));
  callback(porDefecto);
  return () => select.value;
}

function renderPatrocinadores(patrocinadores) {
  const cont = document.getElementById('patrocinadores');
  if (!cont || !patrocinadores || patrocinadores.length === 0) { if (cont) cont.innerHTML = ''; return; }
  cont.innerHTML = `
    <div class="patrocinadores__label">Con el apoyo de</div>
    <div class="patrocinadores__grid">
      ${patrocinadores.map(p => `
        <a href="${p.url || '#'}" target="_blank" rel="noopener">
          <img src="${RUTA_IMG}${p.logo}" alt="${p.nombre}" loading="lazy">
        </a>
      `).join('')}
    </div>
  `;
}

// Genera las pestañas de categoría y engancha el cambio de pestaña activa.
// callback(categoriaId) se llama al iniciar y cada vez que cambian de pestaña.
// opciones.incluirTodos: si es true, agrega una pestaña "Todos" al inicio
// (callback recibe null) y esa queda seleccionada por default. Si se omite
// (como en el resto del sitio), el comportamiento es exactamente el de antes:
// arranca en la primera categoría.
function iniciarTabs(categorias, callback, opciones = {}) {
  const cats = [...categorias].sort((a,b) => a.orden - b.orden);
  let activa = opciones.incluirTodos ? null : cats[0]?.id;

  const tabs = document.getElementById('tabs');
  const botonTodos = opciones.incluirTodos
    ? `<button class="tab ${activa === null ? 'is-active' : ''}" data-cat="">Todos</button>`
    : '';

  tabs.innerHTML = botonTodos + cats.map(c => `
    <button class="tab ${c.id === activa ? 'is-active' : ''}" data-cat="${c.id}">${c.nombre}</button>
  `).join('');

  tabs.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activa = btn.dataset.cat || null;
      tabs.querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b === btn));
      callback(activa);
    });
  });

  callback(activa);
  return () => activa;
}

const DIAS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];

function formatearFecha(fechaISO) {
  const [y,m,d] = fechaISO.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return {
    diaSemana: DIAS[fecha.getDay()],
    texto: `${d} de ${MESES[m - 1]}`,
    fecha
  };
}
