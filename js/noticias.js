let ESTADO_N = null;

async function iniciarNoticias() {
  const [datosBase, noticiasData] = await Promise.all([
    cargarDatos(),
    fetch('data/noticias.json').then(r => r.json()).catch(() => ({ avisos: [] })),
  ]);
  ESTADO_N = datosBase;
  renderPatrocinadores(ESTADO_N.patrocinadores);

  const avisos = (noticiasData.avisos ?? []).sort((a, b) => b.fecha.localeCompare(a.fecha));
  renderNoticias(avisos);
}

function renderNoticias(avisos) {
  const cont = document.getElementById('contenido');

  if (avisos.length === 0) {
    cont.innerHTML = `<div class="empty">Todavía no hay avisos publicados.</div>`;
    return;
  }

  cont.innerHTML = `
    <div class="noticias-lista">
      ${avisos.map(a => {
        const { texto, diaSemana } = formatearFecha(a.fecha);
        return `
          <article class="noticia-card">
            ${a.imagen ? `<img src="${RUTA_IMG}${a.imagen}" alt="${a.titulo}" class="noticia-card__imagen" loading="lazy">` : ''}
            <div class="noticia-card__cuerpo">
              <div class="noticia-card__fecha mono">${diaSemana} ${texto}</div>
              <h3 class="noticia-card__titulo display">${a.titulo}</h3>
              <p class="noticia-card__texto">${(a.cuerpo ?? '').replace(/\n/g, '<br>')}</p>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
}

iniciarNoticias();
