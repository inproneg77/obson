let ESTADO_E = null;
let categoriaActivaE = null;
let temporadaActivaE = null;
let equipoActivoE = null;

async function iniciarEquipos() {
  ESTADO_E = await cargarDatos();
  renderPatrocinadores(ESTADO_E.patrocinadores);

  iniciarSelectorTemporada(ESTADO_E.temporadas, (temp) => {
    temporadaActivaE = temp;
    equipoActivoE = null;
    renderEquipos();
  });

  iniciarTabs(ESTADO_E.categorias, (cat) => {
    categoriaActivaE = cat;
    equipoActivoE = null;
    renderEquipos();
  });
}

function renderEquipos() {
  if (equipoActivoE) {
    renderDetalleEquipo(equipoActivoE);
  } else {
    renderListaEquipos();
  }
}

function renderListaEquipos() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaE) return;

  const equipos = ESTADO_E.equipos.filter(e => e.categoria_id === categoriaActivaE);

  if (equipos.length === 0) {
    cont.innerHTML = `<div class="empty">No hay equipos registrados en esta categoría todavía.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="equipos-grid">
      ${equipos.map(e => `
        <button class="equipo-card" data-id="${e.id}">
          <img src="${RUTA_IMG}${e.logo}" alt="${e.nombre}" loading="lazy">
          <span>${e.nombre}</span>
        </button>
      `).join('')}
    </div>
  `;

  cont.querySelectorAll('.equipo-card').forEach(btn => {
    btn.addEventListener('click', () => {
      equipoActivoE = btn.dataset.id;
      renderDetalleEquipo(equipoActivoE);
    });
  });
}

// Juegos de temporada regular, jugados, de este equipo/categoría/temporada
function juegosDelEquipo(equipoId) {
  return ESTADO_E.juegos.filter(j =>
    j.categoria_id === categoriaActivaE &&
    j.estatus === 'jugado' &&
    (!temporadaActivaE || j.temporada === temporadaActivaE) &&
    (j.local === equipoId || j.visita === equipoId)
  );
}

function resumenEquipo(equipoId) {
  const juegos = juegosDelEquipo(equipoId).filter(j => (j.fase ?? 'regular') === 'regular');
  const r = { jj: 0, jg: 0, jp: 0, pf: 0, pc: 0, pts: 0 };

  juegos.forEach(j => {
    const esLocal = j.local === equipoId;
    const propio = esLocal ? j.marcador_local : j.marcador_visita;
    const rival = esLocal ? j.marcador_visita : j.marcador_local;
    const forfeit = j.forfeit ?? 'ninguno';
    const forfeitPropio = (esLocal && forfeit === 'local') || (!esLocal && forfeit === 'visita');
    const forfeitRival = (esLocal && forfeit === 'visita') || (!esLocal && forfeit === 'local');

    r.jj++; r.pf += propio; r.pc += rival;

    if (forfeitPropio) { r.jp++; r.pts += 0; }
    else if (forfeitRival) { r.jg++; r.pts += 2; }
    else if (propio > rival) { r.jg++; r.pts += 2; }
    else if (rival > propio) { r.jp++; r.pts += 1; }
  });

  return r;
}

function totalesJugadores(equipoId) {
  const juegos = juegosDelEquipo(equipoId);
  const jugadoresEquipo = ESTADO_E.jugadores.filter(j => j.equipo_id === equipoId);
  const acumulado = {};
  jugadoresEquipo.forEach(j => { acumulado[j.id] = { jugador: j, jj: 0, puntos: 0, triples: 0, faltas: 0 }; });

  juegos.forEach(juego => {
    (juego.estadisticas ?? []).forEach(e => {
      if (String(e.asistio) === 'false') return;
      const acc = acumulado[e.jugador];
      if (!acc) return;
      acc.jj++;
      acc.puntos += Number(e.puntos ?? 0);
      acc.triples += Number(e.triples ?? 0);
      acc.faltas += Number(e.faltas ?? 0);
    });
  });

  return Object.values(acumulado).sort((a,b) => b.puntos - a.puntos);
}

function renderDetalleEquipo(equipoId) {
  const cont = document.getElementById('contenido');
  const equipo = ESTADO_E.equiposPorId[equipoId];
  if (!equipo) { equipoActivoE = null; renderListaEquipos(); return; }

  const r = resumenEquipo(equipoId);
  const jugadores = totalesJugadores(equipoId);
  const historial = juegosDelEquipo(equipoId).sort((a,b) => b.fecha.localeCompare(a.fecha));

  cont.innerHTML = `
    <button class="volver-btn" id="volver-equipos">← Todos los equipos</button>
    <button class="pdf-btn no-print" id="exportar-pdf">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><polyline points="9 15 12 18 15 15"/></svg>
      Exportar a PDF
    </button>

    <div class="equipo-detalle-header">
      <img src="${RUTA_IMG}${equipo.logo}" alt="${equipo.nombre}">
      <div>
        <h2 class="display" style="font-size:32px; color:var(--navy);">${equipo.nombre}</h2>
        <div class="mono" style="color:var(--text-dim); font-size:13px;">
          ${r.jj} JJ · ${r.jg}-${r.jp} · ${r.pts} pts en tabla · Dif ${r.pf - r.pc >= 0 ? '+' : ''}${r.pf - r.pc}
        </div>
      </div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:28px;">Estadísticas del Roster</h3>
    ${jugadores.length === 0 ? `<div class="empty">Sin jugadores en el roster todavía.</div>` : `
      <div class="table-scroll">
        <table class="standing-table">
          <thead><tr><th style="text-align:left;">Jugador</th><th>JJ</th><th>Pts</th><th>3pt</th><th>Faltas</th></tr></thead>
          <tbody>
            ${jugadores.map(j => `
              <tr>
                <td style="text-align:left; font-weight:600; color:var(--navy);">${j.jugador.nombre}${j.jugador.numero ? ` <span class="mono" style="color:var(--text-dim); font-weight:400;">#${j.jugador.numero}</span>` : ''}</td>
                <td>${j.jj}</td>
                <td class="mono">${j.puntos}</td>
                <td class="mono">${j.triples}</td>
                <td class="mono">${j.faltas}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}

    <h3 class="lideres__titulo display" style="margin-top:28px;">Historial de Juegos</h3>
    ${historial.length === 0 ? `<div class="empty">Sin juegos jugados todavía en esta temporada.</div>` : historial.map(j => renderJuegoHistorial(j, equipoId)).join('')}
  `;

  document.getElementById('volver-equipos').addEventListener('click', () => {
    equipoActivoE = null;
    renderListaEquipos();
  });

  document.getElementById('exportar-pdf').addEventListener('click', () => {
    const hoy = new Date().toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
    document.body.dataset.fechaImpresion = hoy;
    window.print();
  });
}

function renderJuegoHistorial(j, equipoId) {
  const esLocal = j.local === equipoId;
  const rival = ESTADO_E.equiposPorId[esLocal ? j.visita : j.local];
  const propio = esLocal ? j.marcador_local : j.marcador_visita;
  const marcadorRival = esLocal ? j.marcador_visita : j.marcador_local;
  const gano = propio > marcadorRival;
  const { texto } = formatearFecha(j.fecha);
  const tieneStats = (j.estadisticas ?? []).length > 0;

  const resumen = `
    <div class="historial-item">
      <span class="historial-item__resultado ${gano ? 'gano' : 'perdio'}">${gano ? 'G' : 'P'}</span>
      <span class="historial-item__rival">${esLocal ? 'vs' : '@'} ${rival?.nombre ?? '—'}</span>
      <span class="mono">${propio}-${marcadorRival}</span>
      <span class="historial-item__fecha mono">${texto}</span>
      ${tieneStats ? '<span class="historial-item__ver">Ver hoja ▾</span>' : ''}
    </div>
  `;

  if (!tieneStats) return resumen;

  return `
    <details class="juego-toggle">
      <summary>${resumen}</summary>
      <div class="juego-detalle">${renderHojaEstadistica(j, ESTADO_E)}</div>
    </details>
  `;
}

iniciarEquipos();
