let ESTADO_S = null;
let categoriaActivaS = null;
let temporadaActivaS = null;

async function iniciarStanding() {
  ESTADO_S = await cargarDatos();
  renderPatrocinadores(ESTADO_S.patrocinadores);

  iniciarSelectorTemporada(ESTADO_S.temporadas, (temp) => {
    temporadaActivaS = temp;
    renderStanding();
  });

  iniciarTabs(ESTADO_S.categorias, (cat) => {
    categoriaActivaS = cat;
    renderStanding();
  });
}

// Juegos de temporada regular, jugados, de la categoría y temporada activas.
function juegosRegularesVigentes() {
  return ESTADO_S.juegos.filter(j =>
    j.categoria_id === categoriaActivaS &&
    j.estatus === 'jugado' &&
    (j.fase ?? 'regular') === 'regular' &&
    (!temporadaActivaS || j.temporada === temporadaActivaS)
  );
}

// Reglas de la liga:
//  - Equipo que gana: 2 puntos
//  - Equipo que pierde: 1 punto
//  - Equipo que pierde por forfeit (no se presenta): 0 puntos
function calcularStanding() {
  const equipos = ESTADO_S.equipos.filter(e => e.categoria_id === categoriaActivaS);
  const tabla = Object.fromEntries(equipos.map(e => [e.id, {
    equipo: e, jj:0, jg:0, jp:0, pf:0, pc:0, pts:0
  }]));

  const juegos = juegosRegularesVigentes();

  juegos.forEach(j => {
    const local = tabla[j.local];
    const visita = tabla[j.visita];
    if (!local || !visita) return;

    local.jj++; visita.jj++;
    local.pf += j.marcador_local; local.pc += j.marcador_visita;
    visita.pf += j.marcador_visita; visita.pc += j.marcador_local;

    const forfeit = j.forfeit ?? 'ninguno';

    if (forfeit === 'local') {
      // Local no se presentó: visita gana (2 pts), local pierde por forfeit (0 pts)
      visita.jg++; visita.pts += 2;
      local.jp++;  local.pts += 0;
    } else if (forfeit === 'visita') {
      local.jg++; local.pts += 2;
      visita.jp++; visita.pts += 0;
    } else if (j.marcador_local > j.marcador_visita) {
      local.jg++; local.pts += 2;
      visita.jp++; visita.pts += 1;
    } else if (j.marcador_visita > j.marcador_local) {
      visita.jg++; visita.pts += 2;
      local.jp++; local.pts += 1;
    }
    // empate en el marcador no debería pasar en básquetbol, se ignora
  });

  return ordenarConDesempates(Object.values(tabla), juegos);
}

// Orden oficial: 1) puntos. Empates: 2 equipos -> quien ganó el enfrentamiento
// directo entre ellos; si se dividieron los juegos, o son 3+ equipos ->
// diferencial de puntos (PF-PC).
function ordenarConDesempates(filas, juegos) {
  const porPuntos = {};
  filas.forEach(f => { (porPuntos[f.pts] ??= []).push(f); });

  const puntosOrdenados = Object.keys(porPuntos).map(Number).sort((a,b) => b - a);
  let resultado = [];

  puntosOrdenados.forEach(pts => {
    const grupo = porPuntos[pts];

    if (grupo.length === 1) {
      resultado.push(...grupo);
      return;
    }

    if (grupo.length === 2) {
      const [a, b] = grupo;
      const entreElios = juegos.filter(j =>
        (j.local === a.equipo.id && j.visita === b.equipo.id) ||
        (j.local === b.equipo.id && j.visita === a.equipo.id)
      );
      let victoriasA = 0, victoriasB = 0;
      entreElios.forEach(j => {
        const aEsLocal = j.local === a.equipo.id;
        const marcadorA = aEsLocal ? j.marcador_local : j.marcador_visita;
        const marcadorB = aEsLocal ? j.marcador_visita : j.marcador_local;
        if (marcadorA > marcadorB) victoriasA++;
        else if (marcadorB > marcadorA) victoriasB++;
      });

      if (victoriasA > victoriasB) resultado.push(a, b);
      else if (victoriasB > victoriasA) resultado.push(b, a);
      else resultado.push(...[...grupo].sort((x,y) => (y.pf - y.pc) - (x.pf - x.pc)));
      return;
    }

    // 3 o más equipos empatados en puntos -> diferencial de puntos
    resultado.push(...[...grupo].sort((x,y) => (y.pf - y.pc) - (x.pf - x.pc)));
  });

  return resultado;
}

function renderStanding() {
  const cont = document.getElementById('contenido');
  if (!categoriaActivaS) return;
  const filas = calcularStanding();

  if (filas.length === 0) {
    cont.innerHTML = `<div class="empty">No hay equipos registrados en esta categoría todavía.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="table-scroll"><table class="standing-table">
      <thead>
        <tr>
          <th>#</th><th>Equipo</th><th>JJ</th><th>JG</th><th>JP</th><th>PF</th><th>PC</th><th>Dif</th><th>Pts</th>
        </tr>
      </thead>
      <tbody>
        ${filas.map((f, i) => `
          <tr>
            <td class="rank">${i + 1}</td>
            <td>
              <div class="equipo-cell">
                <img src="${RUTA_IMG}${f.equipo.logo}" alt="${f.equipo.nombre}" loading="lazy">
                <span>${f.equipo.nombre}</span>
              </div>
            </td>
            <td>${f.jj}</td>
            <td>${f.jg}</td>
            <td>${f.jp}</td>
            <td>${f.pf}</td>
            <td>${f.pc}</td>
            <td class="mono">${f.pf - f.pc >= 0 ? '+' : ''}${f.pf - f.pc}</td>
            <td class="mono" style="font-weight:700;">${f.pts}</td>
          </tr>
        `).join('')}
      </tbody>
    </table></div>
    <p style="color:var(--text-dim); font-size:12px; margin-top:14px;">
      Victoria = 2 pts · Derrota = 1 pt · Derrota por forfeit = 0 pts.
      En caso de empate en puntos: entre 2 equipos decide el resultado entre ellos;
      con 3 o más equipos empatados decide el diferencial de puntos.
    </p>
  `;
}

iniciarStanding();
