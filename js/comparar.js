let ESTADO_CMP = null;
let categoriaActivaCmp = null;
let temporadaActivaCmp = null;
let equipoACmp = null;
let equipoBCmp = null;

async function iniciarComparar() {
  ESTADO_CMP = await cargarDatos();
  renderPatrocinadores(ESTADO_CMP.patrocinadores);

  iniciarSelectorTemporada(ESTADO_CMP.temporadas, (temp) => {
    temporadaActivaCmp = temp;
    equipoACmp = null; equipoBCmp = null;
    render();
  });

  iniciarTabs(ESTADO_CMP.categorias, (cat) => {
    categoriaActivaCmp = cat;
    equipoACmp = null; equipoBCmp = null;
    render();
  });
}

function render() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaCmp) return;

  const equipos = ESTADO_CMP.equipos.filter(e => e.categoria_id === categoriaActivaCmp);
  const opciones = equipos.map(e => `<option value="${e.id}">${e.nombre}</option>`).join('');

  cont.innerHTML = `
    <div class="comparar-selectores">
      <select id="cmp-a" class="temporada-select">
        <option value="">Elige el primer equipo…</option>
        ${opciones}
      </select>
      <div class="comparar-vs display">VS</div>
      <select id="cmp-b" class="temporada-select">
        <option value="">Elige el segundo equipo…</option>
        ${opciones}
      </select>
    </div>
    <div id="cmp-resultado"></div>
  `;

  document.getElementById('cmp-a').value = equipoACmp ?? '';
  document.getElementById('cmp-b').value = equipoBCmp ?? '';

  document.getElementById('cmp-a').addEventListener('change', (e) => { equipoACmp = e.target.value || null; renderResultado(); });
  document.getElementById('cmp-b').addEventListener('change', (e) => { equipoBCmp = e.target.value || null; renderResultado(); });

  renderResultado();
}

// Estadísticas de TODA la temporada regular de un equipo (no solo contra el
// rival elegido) — puntos, triples y faltas, propios y del rival, promedio
// por juego. Misma lógica que usa /rankings, aquí para un solo equipo.
function estadisticasTemporada(equipoId) {
  const juegos = ESTADO_CMP.juegos.filter(j =>
    j.categoria_id === categoriaActivaCmp &&
    j.estatus === 'jugado' &&
    (j.fase ?? 'regular') === 'regular' &&
    (!temporadaActivaCmp || j.temporada === temporadaActivaCmp) &&
    (j.local === equipoId || j.visita === equipoId)
  );

  const r = { jj: 0, jg: 0, jp: 0, pf: 0, pc: 0, triples: 0, triplesRival: 0, faltas: 0 };

  const sumaCampo = (estadisticas, elEquipoId, campo) =>
    (estadisticas ?? [])
      .filter(e => ESTADO_CMP.jugadoresPorId[e.jugador]?.equipo_id === elEquipoId)
      .reduce((acc, e) => acc + Number(e[campo] ?? 0), 0);

  juegos.forEach(j => {
    const esLocal = j.local === equipoId;
    const rivalId = esLocal ? j.visita : j.local;
    const propio = esLocal ? j.marcador_local : j.marcador_visita;
    const rival = esLocal ? j.marcador_visita : j.marcador_local;

    r.jj++; r.pf += propio; r.pc += rival;
    if (propio > rival) r.jg++; else if (rival > propio) r.jp++;

    r.triples += sumaCampo(j.estadisticas, equipoId, 'triples');
    r.triplesRival += sumaCampo(j.estadisticas, rivalId, 'triples');
    r.faltas += sumaCampo(j.estadisticas, equipoId, 'faltas');
  });

  return r;
}

function renderResultado() {
  const cont = document.getElementById('cmp-resultado');
  if (!cont) return;

  if (!equipoACmp || !equipoBCmp) {
    cont.innerHTML = `<div class="empty" style="margin-top:20px;">Elige dos equipos para ver su historial de enfrentamientos.</div>`;
    return;
  }
  if (equipoACmp === equipoBCmp) {
    cont.innerHTML = `<div class="empty" style="margin-top:20px;">Elige dos equipos distintos.</div>`;
    return;
  }

  const equipoA = ESTADO_CMP.equiposPorId[equipoACmp];
  const equipoB = ESTADO_CMP.equiposPorId[equipoBCmp];

  const statsA = estadisticasTemporada(equipoACmp);
  const statsB = estadisticasTemporada(equipoBCmp);

  // El historial de enfrentamientos abarca TODAS las temporadas registradas,
  // no solo la que está elegida en el selector (esa solo filtra el
  // "Comparativo de Temporada" de arriba).
  const juegos = ESTADO_CMP.juegos.filter(j =>
    j.categoria_id === categoriaActivaCmp &&
    j.estatus === 'jugado' &&
    ((j.local === equipoACmp && j.visita === equipoBCmp) || (j.local === equipoBCmp && j.visita === equipoACmp))
  ).sort((a,b) => b.fecha.localeCompare(a.fecha));

  const filaComparativo = (etiqueta, valA, valB, masAltoEsMejor = true) => {
    const mejorA = masAltoEsMejor ? valA > valB : valA < valB;
    const mejorB = masAltoEsMejor ? valB > valA : valB < valA;
    return `
      <tr>
        <td class="mono ${mejorA ? 'cmp-mejor' : ''}" style="text-align:right; width:30%;">${valA}</td>
        <td style="text-align:center; color:var(--text-dim); font-size:12px;">${etiqueta}</td>
        <td class="mono ${mejorB ? 'cmp-mejor' : ''}" style="text-align:left; width:30%;">${valB}</td>
      </tr>
    `;
  };

  const comparativoHTML = `
    <h3 class="lideres__titulo display" style="margin-top:6px;">Comparativo de Temporada</h3>
    <div class="cmp-encabezado">
      <div class="cmp-encabezado__equipo"><img src="${RUTA_IMG}${equipoA.logo}" alt="${equipoA.nombre}"><span>${equipoA.nombre}</span></div>
      <div class="cmp-encabezado__equipo"><img src="${RUTA_IMG}${equipoB.logo}" alt="${equipoB.nombre}"><span>${equipoB.nombre}</span></div>
    </div>
    <div class="table-scroll">
      <table class="standing-table cmp-tabla">
        <tbody>
          ${filaComparativo('Juegos Jugados', statsA.jj, statsB.jj)}
          ${filaComparativo('Récord (G-P)', `${statsA.jg}-${statsA.jp}`, `${statsB.jg}-${statsB.jp}`)}
          ${filaComparativo('Puntos a favor / juego', statsA.jj ? (statsA.pf/statsA.jj).toFixed(1) : '0.0', statsB.jj ? (statsB.pf/statsB.jj).toFixed(1) : '0.0')}
          ${filaComparativo('Puntos en contra / juego', statsA.jj ? (statsA.pc/statsA.jj).toFixed(1) : '0.0', statsB.jj ? (statsB.pc/statsB.jj).toFixed(1) : '0.0', false)}
          ${filaComparativo('Triples anotados / juego', statsA.jj ? (statsA.triples/statsA.jj).toFixed(1) : '0.0', statsB.jj ? (statsB.triples/statsB.jj).toFixed(1) : '0.0')}
          ${filaComparativo('Triples permitidos / juego', statsA.jj ? (statsA.triplesRival/statsA.jj).toFixed(1) : '0.0', statsB.jj ? (statsB.triplesRival/statsB.jj).toFixed(1) : '0.0', false)}
          ${filaComparativo('Faltas / juego', statsA.jj ? (statsA.faltas/statsA.jj).toFixed(1) : '0.0', statsB.jj ? (statsB.faltas/statsB.jj).toFixed(1) : '0.0', false)}
        </tbody>
      </table>
    </div>
  `;

  if (juegos.length === 0) {
    cont.innerHTML = comparativoHTML + `<div class="empty" style="margin-top:20px;">${equipoA.nombre} y ${equipoB.nombre} no se han enfrentado todavía (en ninguna temporada registrada).</div>`;
    return;
  }

  let victoriasA = 0, victoriasB = 0, ptsA = 0, ptsB = 0;
  juegos.forEach(j => {
    const esAlocal = j.local === equipoACmp;
    const marcadorA = esAlocal ? j.marcador_local : j.marcador_visita;
    const marcadorB = esAlocal ? j.marcador_visita : j.marcador_local;
    ptsA += marcadorA; ptsB += marcadorB;
    if (marcadorA > marcadorB) victoriasA++; else if (marcadorB > marcadorA) victoriasB++;
  });

  cont.innerHTML = comparativoHTML + `
    <div class="cmp-resumen">
      <div class="cmp-resumen__equipo">
        <img src="${RUTA_IMG}${equipoA.logo}" alt="${equipoA.nombre}">
        <span>${equipoA.nombre}</span>
        <div class="cmp-resumen__victorias">${victoriasA}</div>
      </div>
      <div class="cmp-resumen__centro">
        <div class="mono" style="font-size:11px; color:var(--text-dim);">ENFRENTAMIENTOS DIRECTOS</div>
        <div class="display" style="font-size:26px; color:var(--navy);">${juegos.length}</div>
        <div class="mono" style="font-size:11px; color:var(--text-dim);">${ptsA} – ${ptsB} pts totales</div>
      </div>
      <div class="cmp-resumen__equipo">
        <img src="${RUTA_IMG}${equipoB.logo}" alt="${equipoB.nombre}">
        <span>${equipoB.nombre}</span>
        <div class="cmp-resumen__victorias">${victoriasB}</div>
      </div>
    </div>

    <h3 class="lideres__titulo display" style="margin-top:26px;">Historial de Enfrentamientos <span style="font-size:13px; color:var(--text-dim); font-family:'Inter',sans-serif; font-weight:400;">(todas las temporadas)</span></h3>
    ${juegos.map(j => renderEnfrentamiento(j, equipoA, equipoB)).join('')}
  `;
}

function renderEnfrentamiento(j, equipoA, equipoB) {
  const esAlocal = j.local === equipoACmp;
  const marcadorA = esAlocal ? j.marcador_local : j.marcador_visita;
  const marcadorB = esAlocal ? j.marcador_visita : j.marcador_local;
  const { texto } = formatearFecha(j.fecha);
  const sede = ESTADO_CMP.sedesPorId[j.sede_id]?.nombre ?? '';
  const temporada = ESTADO_CMP.temporadas.find(t => t.id === j.temporada)?.nombre ?? j.temporada ?? '';
  const tieneStats = (j.estadisticas ?? []).length > 0;

  const resumen = `
    <div class="historial-item">
      <span class="historial-item__resultado ${marcadorA > marcadorB ? 'gano' : 'perdio'}">${marcadorA > marcadorB ? equipoA.nombre[0] : equipoB.nombre[0]}</span>
      <span class="historial-item__rival">${equipoA.nombre} vs ${equipoB.nombre}</span>
      <span class="mono">${marcadorA}-${marcadorB}</span>
      <span class="historial-item__fecha mono">${texto} · ${temporada} · ${sede}</span>
      ${tieneStats ? '<span class="historial-item__ver">Ver hoja ▾</span>' : ''}
    </div>
  `;

  if (!tieneStats) return resumen;

  return `
    <details class="juego-toggle">
      <summary>${resumen}</summary>
      <div class="juego-detalle">${renderHojaEstadistica(j, ESTADO_CMP)}</div>
    </details>
  `;
}

iniciarComparar();
