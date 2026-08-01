let ESTADO_L = null;
let categoriaActivaL = null;
let temporadaActivaL = null;
let tipoActivoL = null;

const TIPOS_LIDERES = [
  { id: 'puntos',  icono: '🏀', titulo: 'Puntos' },
  { id: 'triples', icono: '🎯', titulo: 'Triples' },
  { id: 'faltas',  icono: '🟨', titulo: 'Faltas' },
];

async function iniciarLideres() {
  ESTADO_L = await cargarDatos();
  renderPatrocinadores(ESTADO_L.patrocinadores);
  tipoActivoL = TIPOS_LIDERES[0].id;

  iniciarSelectorTemporada(ESTADO_L.temporadas, (temp) => {
    temporadaActivaL = temp;
    renderLideres();
  });

  iniciarTabs(ESTADO_L.categorias, (cat) => {
    categoriaActivaL = cat;
    renderLideres();
  });
}

// Suma las estadísticas de todos los juegos jugados de la categoría/temporada
// activa, agrupadas por jugador.
function acumularEstadisticas() {
  const juegos = ESTADO_L.juegos.filter(j =>
    j.categoria_id === categoriaActivaL &&
    j.estatus === 'jugado' &&
    (!temporadaActivaL || j.temporada === temporadaActivaL)
  );

  const acumulado = {};
  juegos.forEach(j => {
    (j.estadisticas ?? []).forEach(e => {
      if (String(e.asistio) === 'false') return; // no jugó, no cuenta
      const jugador = ESTADO_L.jugadoresPorId[e.jugador];
      if (!jugador) return;
      const equipo = ESTADO_L.equiposPorId[jugador.equipo_id];

      const acc = (acumulado[e.jugador] ??= {
        jugador, equipo, juegos: 0, puntos: 0, triples: 0, faltas: 0
      });
      acc.juegos++;
      acc.puntos += Number(e.puntos ?? 0);
      acc.triples += Number(e.triples ?? 0);
      acc.faltas += Number(e.faltas ?? 0);
    });
  });

  return Object.values(acumulado);
}

function tablaTop10(filas, campo, titulo) {
  const top = [...filas].sort((a,b) => b[campo] - a[campo]).slice(0, 10);
  if (top.length === 0) {
    return `<div class="empty">Sin datos de ${titulo.toLowerCase()} todavía.</div>`;
  }
  return `
    <div class="table-scroll">
      <table class="standing-table">
        <thead><tr><th>#</th><th>Jugador</th><th>Equipo</th><th>JJ</th><th>${titulo}</th></tr></thead>
        <tbody>
          ${top.map((f,i) => `
            <tr>
              <td class="rank">${i+1}</td>
              <td style="text-align:left; font-weight:600; color:var(--navy);">${f.jugador.nombre}</td>
              <td style="text-align:left; font-size:12px; color:var(--text-dim);">${f.equipo?.nombre ?? '—'}</td>
              <td>${f.juegos}</td>
              <td class="mono" style="font-weight:700;">${f[campo]}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderLideres() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaL) return;

  const filas = acumularEstadisticas();

  const subtabsHTML = `
    <div class="tabs ranking-subtabs">
      ${TIPOS_LIDERES.map(t => `
        <button class="tab ${t.id === tipoActivoL ? 'is-active' : ''}" data-tipo="${t.id}">${t.icono} ${t.titulo}</button>
      `).join('')}
    </div>
  `;

  if (filas.length === 0) {
    cont.innerHTML = subtabsHTML + `<div class="empty">Todavía no hay estadísticas individuales capturadas para esta categoría/temporada.</div>`;
  } else {
    const seleccionado = TIPOS_LIDERES.find(t => t.id === tipoActivoL) ?? TIPOS_LIDERES[0];
    cont.innerHTML = subtabsHTML + tablaTop10(filas, seleccionado.id, seleccionado.titulo);
  }

  cont.querySelectorAll('.ranking-subtabs .tab').forEach(btn => {
    btn.addEventListener('click', () => {
      tipoActivoL = btn.dataset.tipo;
      renderLideres();
    });
  });
}

iniciarLideres();
