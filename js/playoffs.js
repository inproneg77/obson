let ESTADO_P = null;
let categoriaActivaP = null;
let temporadaActivaP = null;

const ORDEN_RONDAS = ['Cuartos de Final', 'Semifinal', 'Final'];

async function iniciarPlayoffs() {
  ESTADO_P = await cargarDatos();
  renderPatrocinadores(ESTADO_P.patrocinadores);

  iniciarSelectorTemporada(ESTADO_P.temporadas, (temp) => {
    temporadaActivaP = temp;
    renderPlayoffs();
  });

  iniciarTabs(ESTADO_P.categorias, (cat) => {
    categoriaActivaP = cat;
    renderPlayoffs();
  });
}

// Cuenta victorias de cada equipo dentro de una serie (a partir de sus juegos)
function calcularSerie(serie) {
  let victoriasA = 0, victoriasB = 0;
  (serie.juegos ?? []).forEach(j => {
    if (String(j.jugado) !== 'true') return;
    if (j.marcador_a > j.marcador_b) victoriasA++;
    else if (j.marcador_b > j.marcador_a) victoriasB++;
  });
  const ganador = victoriasA >= 2 ? serie.equipoA : victoriasB >= 2 ? serie.equipoB : null;
  return { victoriasA, victoriasB, ganador };
}

function renderPlayoffs() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaP) return;

  const series = ESTADO_P.playoffs.filter(s =>
    s.categoria_id === categoriaActivaP &&
    (!temporadaActivaP || s.temporada === temporadaActivaP)
  );

  if (series.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no se han definido llaves de playoffs para esta categoría/temporada.</div>`;
    return;
  }

  const porRonda = {};
  series.forEach(s => { (porRonda[s.ronda] ??= []).push(s); });

  const rondas = Object.keys(porRonda).sort((a,b) => {
    const ia = ORDEN_RONDAS.indexOf(a), ib = ORDEN_RONDAS.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  cont.innerHTML = rondas.map(ronda => `
    <div class="jornada">
      <div class="jornada__head">
        <div class="jornada__fecha display">${ronda}</div>
      </div>
      ${porRonda[ronda].map(renderSerie).join('')}
    </div>
  `).join('');
}

function renderSerie(serie) {
  const equipoA = ESTADO_P.equiposPorId[serie.equipoA];
  const equipoB = ESTADO_P.equiposPorId[serie.equipoB];
  const { victoriasA, victoriasB, ganador } = calcularSerie(serie);
  const decidida = ganador !== null;

  const juegosHTML = (serie.juegos ?? []).map((j, i) => {
    if (String(j.jugado) !== 'true') {
      return `<div class="serie__juego serie__juego--pendiente">Juego ${j.numero ?? i+1}: por jugarse</div>`;
    }
    return `<div class="serie__juego">
      Juego ${j.numero ?? i+1}: <span class="${j.marcador_a > j.marcador_b ? 'gano' : ''}">${j.marcador_a}</span> – <span class="${j.marcador_b > j.marcador_a ? 'gano' : ''}">${j.marcador_b}</span>
    </div>`;
  }).join('');

  return `
    <div class="juego serie ${decidida ? 'is-jugado' : ''}">
      <div class="equipo equipo--local">
        <img src="${RUTA_IMG}${equipoA?.logo ?? 'img/equipos/placeholder.svg'}" alt="${equipoA?.nombre ?? ''}" loading="lazy">
        <span class="equipo__nombre">${equipoA?.nombre ?? 'Por definir'}${ganador === serie.equipoA ? ' 🏆' : ''}</span>
      </div>
      <div class="marcador">
        <div class="marcador__score">
          <span class="${victoriasA > victoriasB ? 'gano' : 'perdio'}">${victoriasA}</span>
          <span class="mono" style="color:var(--text-dim); font-size:16px;">–</span>
          <span class="${victoriasB > victoriasA ? 'gano' : 'perdio'}">${victoriasB}</span>
        </div>
        <div class="marcador__info mono" style="margin-top:6px;">${decidida ? 'Serie definida' : 'Serie a 2 de 3'}</div>
      </div>
      <div class="equipo equipo--visita">
        <img src="${RUTA_IMG}${equipoB?.logo ?? 'img/equipos/placeholder.svg'}" alt="${equipoB?.nombre ?? ''}" loading="lazy">
        <span class="equipo__nombre">${ganador === serie.equipoB ? '🏆 ' : ''}${equipoB?.nombre ?? 'Por definir'}</span>
      </div>
      <div class="serie__juegos">${juegosHTML}</div>
    </div>
  `;
}

iniciarPlayoffs();
