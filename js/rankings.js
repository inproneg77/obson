let ESTADO_R = null;
let categoriaActivaR = null;
let temporadaActivaR = null;
let tipoActivoR = null;

async function iniciarRankings() {
  ESTADO_R = await cargarDatos();
  renderPatrocinadores(ESTADO_R.patrocinadores);
  tipoActivoR = TIPOS[0].id;

  iniciarSelectorTemporada(ESTADO_R.temporadas, (temp) => {
    temporadaActivaR = temp;
    renderRankings();
  });

  iniciarTabs(ESTADO_R.categorias, (cat) => {
    categoriaActivaR = cat;
    renderRankings();
  });
}

// Acumula, por equipo, todo lo necesario para los 5 rankings ofensivos/
// defensivos a partir de los juegos de temporada regular ya jugados
// (misma base que el Standing).
function calcularEstadisticasEquipos() {
  const equipos = ESTADO_R.equipos.filter(e => e.categoria_id === categoriaActivaR);
  const stats = {};
  equipos.forEach(e => { stats[e.id] = { equipo: e, jj: 0, pf: 0, pc: 0, triples: 0, triplesRival: 0, faltas: 0 }; });

  const juegos = ESTADO_R.juegos.filter(j =>
    j.categoria_id === categoriaActivaR &&
    j.estatus === 'jugado' &&
    (j.fase ?? 'regular') === 'regular' &&
    (!temporadaActivaR || j.temporada === temporadaActivaR)
  );

  const sumaCampo = (estadisticas, equipoId, campo) =>
    (estadisticas ?? [])
      .filter(e => ESTADO_R.jugadoresPorId[e.jugador]?.equipo_id === equipoId)
      .reduce((acc, e) => acc + Number(e[campo] ?? 0), 0);

  juegos.forEach(j => {
    const local = stats[j.local];
    const visita = stats[j.visita];
    if (!local || !visita) return;

    local.jj++; visita.jj++;
    local.pf += j.marcador_local; local.pc += j.marcador_visita;
    visita.pf += j.marcador_visita; visita.pc += j.marcador_local;

    const triplesLocal = sumaCampo(j.estadisticas, j.local, 'triples');
    const triplesVisita = sumaCampo(j.estadisticas, j.visita, 'triples');
    const faltasLocal = sumaCampo(j.estadisticas, j.local, 'faltas');
    const faltasVisita = sumaCampo(j.estadisticas, j.visita, 'faltas');

    local.triples += triplesLocal;       local.triplesRival += triplesVisita;  local.faltas += faltasLocal;
    visita.triples += triplesVisita;     visita.triplesRival += triplesLocal;  visita.faltas += faltasVisita;
  });

  return Object.values(stats)
    .filter(s => s.jj > 0)
    .map(s => ({
      ...s,
      promPF: s.pf / s.jj,
      promPC: s.pc / s.jj,
      promTriples: s.triples / s.jj,
      promTriplesRival: s.triplesRival / s.jj,
      promFaltas: s.faltas / s.jj,
    }));
}

const RANKINGS_EQUIPO = [
  { id: 'ofensivo',   icono: '🏀', titulo: 'Más Ofensivos',        campo: 'promPF',          sufijo: 'pts/juego', orden: 'desc', detalle: (f) => `${f.pf} pts en ${f.jj} juegos` },
  { id: 'defensivo',  icono: '🛡️', titulo: 'Más Defensivos',       campo: 'promPC',          sufijo: 'pts/juego', orden: 'asc',  detalle: (f) => `${f.pc} pts recibidos en ${f.jj} juegos` },
  { id: 'tripleros',  icono: '🎯', titulo: 'Más Tripleros',        campo: 'promTriples',     sufijo: '3pt/juego', orden: 'desc', detalle: (f) => `${f.triples} triples en ${f.jj} juegos` },
  { id: 'defensa3',   icono: '🚫', titulo: 'Mejor Defensa 3pt',    campo: 'promTriplesRival', sufijo: '3pt/juego permitidos', orden: 'asc', detalle: (f) => `${f.triplesRival} triples del rival en ${f.jj} juegos` },
  { id: 'fairplay',   icono: '🤝', titulo: 'Fair Play',            campo: 'promFaltas',      sufijo: 'faltas/juego', orden: 'asc', detalle: (f) => `${f.faltas} faltas en ${f.jj} juegos` },
];

// Todas las "pestañas" de esta sección: los 5 rankings de equipo + MVP +
// Campeón, todas filtradas igual (temporada + categoría activas).
const TIPOS = [
  ...RANKINGS_EQUIPO.map(r => ({ id: r.id, icono: r.icono, titulo: r.titulo, modo: 'ranking' })),
  { id: 'mvp',      icono: '⭐', titulo: 'Más Valioso(a)', modo: 'mvp' },
  { id: 'campeon',  icono: '🏆', titulo: 'Campeón',        modo: 'campeon' },
];

function renderRankings() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaR) return;

  const subtabsHTML = `
    <div class="tabs ranking-subtabs">
      ${TIPOS.map(t => `
        <button class="tab ${t.id === tipoActivoR ? 'is-active' : ''}" data-tipo="${t.id}">${t.icono} ${t.titulo}</button>
      `).join('')}
    </div>
  `;

  const seleccionado = TIPOS.find(t => t.id === tipoActivoR) ?? TIPOS[0];
  let contenidoHTML;

  if (seleccionado.modo === 'ranking') {
    const filas = calcularEstadisticasEquipos();
    contenidoHTML = filas.length === 0
      ? `<div class="empty">Todavía no hay juegos jugados con estadísticas para calcular rankings en esta categoría/temporada.</div>`
      : renderSeccionRanking(RANKINGS_EQUIPO.find(r => r.id === seleccionado.id), filas);
  } else if (seleccionado.modo === 'mvp') {
    contenidoHTML = renderSeccionMVP();
  } else {
    contenidoHTML = renderSeccionCampeon();
  }

  cont.innerHTML = subtabsHTML + contenidoHTML;

  cont.querySelectorAll('.ranking-subtabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActivoR = btn.dataset.tipo;
      renderRankings();
    });
  });
}

function renderSeccionRanking(r, filas) {
  const ordenadas = [...filas].sort((a, b) =>
    r.orden === 'desc' ? b[r.campo] - a[r.campo] : a[r.campo] - b[r.campo]
  );

  return `
    <section class="ranking-seccion">
      <div class="table-scroll">
        <table class="standing-table">
          <thead>
            <tr><th>#</th><th>Equipo</th><th>${r.sufijo}</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            ${ordenadas.map((f, i) => `
              <tr>
                <td class="rank">${i + 1}</td>
                <td>
                  <div class="equipo-cell">
                    <img src="${RUTA_IMG}${f.equipo.logo}" alt="${f.equipo.nombre}" loading="lazy">
                    <span>${f.equipo.nombre}</span>
                  </div>
                </td>
                <td class="mono" style="font-weight:700;">${f[r.campo].toFixed(1)}</td>
                <td class="mono" style="font-size:11px; color:var(--text-dim);">${r.detalle(f)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

// ===== MVP (antes /valiosos) =====
function renderSeccionMVP() {
  const juegos = ESTADO_R.juegos.filter(j =>
    j.categoria_id === categoriaActivaR &&
    j.estatus === 'jugado' &&
    (!temporadaActivaR || j.temporada === temporadaActivaR)
  );

  const conteo = {};
  juegos.forEach(j => {
    const nombre = nombreMVP(j, ESTADO_R.jugadoresPorId);
    if (!nombre) return;
    conteo[nombre] = (conteo[nombre] ?? 0) + 1;
  });

  const filas = Object.entries(conteo)
    .map(([nombre, veces]) => ({ nombre, veces }))
    .sort((a,b) => b.veces - a.veces || a.nombre.localeCompare(b.nombre));

  const etiqueta = ESTADO_R.categorias.find(c => c.id === categoriaActivaR)?.etiqueta_mvp ?? 'Jugador Más Valioso';

  if (filas.length === 0) {
    return `<div class="empty">Todavía no hay jugadores destacados capturados para esta categoría/temporada.</div>`;
  }

  return `
    <section class="ranking-seccion">
      <div class="table-scroll">
        <table class="standing-table">
          <thead><tr><th>#</th><th>${etiqueta}</th><th>Veces reconocido</th></tr></thead>
          <tbody>
            ${filas.map((f,i) => `
              <tr>
                <td class="rank">${i+1}</td>
                <td style="text-align:left; font-weight:600; color:var(--navy);">${f.nombre}</td>
                <td class="mono" style="font-weight:700;">${f.veces}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      <p style="color:var(--text-dim); font-size:12px; margin-top:14px;">
        Se cuenta cada vez que un jugador fue reconocido como ${etiqueta.toLowerCase()} en un juego capturado.
      </p>
    </section>
  `;
}

// ===== Campeón (antes /campeones), acotado a la categoría/temporada activas =====
function fechaDeCoronacion(serie) {
  const jugados = (serie.juegos ?? []).filter(j => String(j.jugado) === 'true' && j.fecha);
  if (jugados.length === 0) return null;
  return jugados.map(j => j.fecha).sort().at(-1);
}

function renderSeccionCampeon() {
  const serie = ESTADO_R.playoffs.find(s =>
    s.categoria_id === categoriaActivaR &&
    s.ronda === 'Final' &&
    (!temporadaActivaR || s.temporada === temporadaActivaR)
  );

  if (!serie) {
    return `<div class="empty">Todavía no se ha definido (o capturado) la serie de Final para esta categoría/temporada.</div>`;
  }

  let victoriasA = 0, victoriasB = 0;
  (serie.juegos ?? []).forEach(j => {
    if (String(j.jugado) !== 'true') return;
    if (j.marcador_a > j.marcador_b) victoriasA++;
    else if (j.marcador_b > j.marcador_a) victoriasB++;
  });
  const ganadorId = victoriasA >= 2 ? serie.equipoA : victoriasB >= 2 ? serie.equipoB : null;

  if (!ganadorId) {
    return `<div class="empty">La Final de esta categoría/temporada todavía está en curso — todavía no hay campeón definido.</div>`;
  }

  const equipo = ESTADO_R.equiposPorId[ganadorId];
  const categoria = ESTADO_R.categorias.find(c => c.id === categoriaActivaR);
  const temporada = ESTADO_R.temporadas.find(t => t.id === serie.temporada)?.nombre ?? serie.temporada ?? '—';
  const fecha = fechaDeCoronacion(serie);

  return `
    <div class="campeones-grid" style="max-width:280px;">
      <div class="campeon-card">
        <div class="campeon-card__trofeo">🏆</div>
        <img src="${RUTA_IMG}${equipo?.logo ?? 'img/equipos/placeholder.svg'}" alt="${equipo?.nombre ?? ''}" class="campeon-card__logo">
        <div class="campeon-card__nombre">${equipo?.nombre ?? 'Equipo'}</div>
        <div class="campeon-card__cat">${categoria?.nombre ?? ''}</div>
        <div class="campeon-card__temp mono">${temporada}</div>
        ${fecha ? `<div class="campeon-card__fecha mono">${formatearFecha(fecha).texto}</div>` : ''}
        ${serie.mvp_serie ? `<div class="campeon-card__mvp">★ ${categoria?.etiqueta_mvp ?? 'MVP'} de la Final: <b>${serie.mvp_serie}</b></div>` : ''}
      </div>
    </div>
  `;
}

iniciarRankings();
