/**
 * Cerebro Grupo VIME · Importar programa anual (PDF o Word).
 *
 * leerArchivo(file) → { filas, bloques }
 *   filas:   renglones de texto (celdas) para encontrar el calendario. null separa una tabla de otra.
 *   bloques: el documento en orden ({ texto, html, calendario }) para separar guion y cronología.
 * extraerEventos(filas, clase, ejercicio) → propuestas de fechas que el usuario revisa.
 * extraerGuiones(bloques, propuestas)     → { índice: { guion, cronologia } } en HTML.
 *
 * Todo se procesa en el navegador; el archivo no se envía a ningún servicio externo.
 */
const Importador = (() => {
  const CDN = {
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
    pdfWorker: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
    mammoth: 'https://cdnjs.cloudflare.com/ajax/libs/mammoth/1.8.0/mammoth.browser.min.js'
  };
  const cargados = {};
  function cargarScript(url) {
    if (cargados[url]) return cargados[url];
    cargados[url] = new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = url; s.onload = ok;
      s.onerror = () => { delete cargados[url]; mal(new Error('No se pudo cargar el lector de archivos. Revise su conexión a internet.')); };
      document.head.appendChild(s);
    });
    return cargados[url];
  }
  const escH = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ======================= Lectura ======================= */
  async function leerPDF(file) {
    await cargarScript(CDN.pdf);
    const lib = window.pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      // El trabajador se carga como blob para que funcione también al abrir la app desde el disco.
      const codigo = await (await fetch(CDN.pdfWorker)).text();
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
    }
    const doc = await lib.getDocument({ data: await file.arrayBuffer() }).promise;
    const renglones = [];
    for (let p = 1; p <= doc.numPages; p++) {
      const items = (await (await doc.getPage(p)).getTextContent()).items.filter(it => it.str && it.str.trim());
      const pag = [];
      items.forEach(it => {
        const y = it.transform[5], x = it.transform[4];
        let r = pag.find(r => Math.abs(r.y - y) < 3.5);
        if (!r) { r = { y, piezas: [] }; pag.push(r); }
        r.piezas.push({ x, fin: x + (it.width || it.str.length * 4), t: it.str });
      });
      pag.sort((a, b) => b.y - a.y).forEach(r => {
        r.piezas.sort((a, b) => a.x - b.x);
        const celdas = []; let actual = null;
        r.piezas.forEach(pz => {
          if (actual && pz.x - actual.fin < 12) { actual.t += (pz.x - actual.fin > 1.5 ? ' ' : '') + pz.t; actual.fin = pz.fin; }
          else { actual = { t: pz.t, x: pz.x, fin: pz.fin }; celdas.push(actual); }
        });
        const c = celdas.filter(c => c.t.trim());
        if (c.length) renglones.push(c);
      });
    }
    // Alinear con las columnas del encabezado del calendario (por posición) para que una celda vacía no recorra las demás.
    let columnas = null;
    const filas = [], bloques = [];
    renglones.forEach(celdas => {
      const textos = celdas.map(c => c.t.trim());
      const texto = textos.join('   ');
      if (mapaEncabezado(textos)) { columnas = celdas.map(c => c.x); filas.push(null, textos); bloques.push({ texto, html: '', calendario: true }); return; }
      if (columnas && esTitulo(texto)) { columnas = null; filas.push(null); }
      if (columnas) {
        const fila = columnas.map(() => '');
        celdas.forEach(c => { let k = 0; columnas.forEach((x, j) => { if (x <= c.x + 8) k = j; }); fila[k] = (fila[k] ? fila[k] + ' ' : '') + c.t.trim(); });
        filas.push(fila); bloques.push({ texto, html: '', calendario: true });
      } else {
        filas.push(textos);
        bloques.push({ texto, html: '<p>' + textos.map(escH).join(' &nbsp; ') + '</p>' });
      }
    });
    return { filas, bloques };
  }

  /** Texto de una celda de Word conservando los renglones (temarios en lista). */
  function textoCelda(td) {
    const ps = td.querySelectorAll('p, li');
    const t = ps.length ? Array.from(ps).map(p => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean).join('\n') : td.textContent.replace(/\s+/g, ' ').trim();
    return t;
  }

  async function leerWord(file) {
    if (/\.doc$/i.test(file.name)) throw new Error('El formato .doc (Word 97-2003) no se puede leer. Ábralo en Word y guárdelo como .docx o PDF.');
    await cargarScript(CDN.mammoth);
    const { value } = await window.mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
    const html = new DOMParser().parseFromString(value, 'text/html');
    const filas = [], bloques = [];
    Array.from(html.body.children).forEach(el => {
      if (el.tagName === 'TABLE') {
        const rows = Array.from(el.querySelectorAll('tr')).map(tr => Array.from(tr.children).map(textoCelda));
        const esCal = rows.some(r => mapaEncabezado(r));
        filas.push(null); rows.forEach(r => filas.push(r)); filas.push(null);
        bloques.push({ texto: rows.map(r => r.join(' | ')).join('\n'), html: el.outerHTML, calendario: esCal });
      } else if (el.tagName === 'UL' || el.tagName === 'OL') {
        // Cada viñeta es un renglón (equipamiento, recursos, actividades…)
        const items = Array.from(el.querySelectorAll('li')).map(li => li.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
        if (!items.length) return;
        items.forEach(t => filas.push([t]));
        bloques.push({ texto: items.join('\n'), html: el.outerHTML });
      } else {
        const t = el.textContent.replace(/\s+/g, ' ').trim();
        if (!t) return;
        filas.push([t]);
        bloques.push({ texto: t, html: el.outerHTML });
      }
    });
    return { filas, bloques };
  }

  async function leerArchivo(file) {
    const r = /\.pdf$/i.test(file.name) || file.type === 'application/pdf' ? await leerPDF(file) : await leerWord(file);
    if (!r.filas.some(f => f && f.some(c => String(c).trim()))) throw new Error('El archivo no tiene texto que se pueda leer (¿es un escaneo o una imagen?). Use la versión en Word o un PDF generado desde Word.');
    return r;
  }

  /* ======================= Interpretación ======================= */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const MES_IDX = { ene: 1, feb: 2, mar: 3, abr: 4, may: 5, jun: 6, jul: 7, ago: 8, sep: 9, set: 9, oct: 10, nov: 11, dic: 12 };
  const MES_RE = '(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre|ene|feb|mar|abr|may|jun|jul|ago|sept?|set|oct|nov|dic)\\.?';
  const valida = (a, m, d) => { const f = new Date(a, m - 1, d); return f.getFullYear() === a && f.getMonth() === m - 1 && f.getDate() === d; };
  const iso = (a, m, d) => a + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  const anio4 = (y, def) => !y ? def : (y.length === 2 ? 2000 + +y : +y);

  /** Busca una fecha. Devuelve { fecha, mes } (fecha '' si solo viene el mes). */
  function buscarFecha(texto, ejercicio) {
    const t = norm(texto);
    let m = t.match(new RegExp('\\b(\\d{1,2})\\s*(?:de\\s+|-|/|\\s)?' + MES_RE + '(?:\\s*(?:de|del|-|/)?\\s*(\\d{4}|\\d{2})\\b)?'));
    if (m) { const a = anio4(m[3], ejercicio), mes = MES_IDX[m[2].slice(0, 3)], d = +m[1]; if (valida(a, mes, d)) return { fecha: iso(a, mes, d), mes }; }
    m = t.match(/\b(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})\b/);
    if (m && valida(+m[1], +m[2], +m[3])) return { fecha: iso(+m[1], +m[2], +m[3]), mes: +m[2] };
    m = t.match(/\b(\d{1,2})([/.-])(\d{1,2})\2(\d{4}|\d{2})\b/) || t.match(/\b(\d{1,2})([/-])(\d{1,2})()(?![\d.,])/);
    if (m && !/[:\d]/.test(t.slice(m.index - 1, m.index))) { const a = anio4(m[4], ejercicio); if (valida(a, +m[3], +m[1])) return { fecha: iso(a, +m[3], +m[1]), mes: +m[3] }; }
    m = t.match(new RegExp('\\b' + MES_RE + '(?:\\s*(?:de|del)?\\s*(\\d{4}))?\\b'));
    if (m && m[1].length >= 4) return { fecha: '', mes: MES_IDX[m[1].slice(0, 3)] }; // solo el mes (palabra completa)
    return null;
  }

  /** Hora de inicio en formato HH:MM. */
  function buscarHora(texto) {
    const t = norm(texto);
    let m = t.match(/\b(\d{1,2})\s*[:.]\s*(\d{2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)?/);
    if (m && +m[2] < 60) { let h = +m[1]; if (m[3] && m[3][0] === 'p' && h < 12) h += 12; if (m[3] && m[3][0] === 'a' && h === 12) h = 0; if (h < 24) return String(h).padStart(2, '0') + ':' + m[2]; }
    m = t.match(/\b(\d{1,2})\s*(a\.?\s?m\.?|p\.?\s?m\.?)/);
    if (m) { let h = +m[1]; if (m[2][0] === 'p' && h < 12) h += 12; return String(h).padStart(2, '0') + ':00'; }
    return '';
  }
  function buscarDuracion(texto) {
    const t = norm(texto);
    const m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:h|hr|hrs|horas?)\b(?!\s*[:.]\d)/);
    if (m && !/\d\s*[:.]\s*\d{2}\s*(?:h|hr|hrs|horas)/.test(t.slice(Math.max(0, m.index - 4), m.index + m[0].length))) { const v = +m[1].replace(',', '.'); if (v > 0 && v <= 40) return v; }
    return '';
  }
  const PAL_HIP = [['sismo', 'Sismo'], ['terremoto', 'Sismo'], ['incendio', 'Incendio'], ['conato', 'Incendio'], ['fuego', 'Incendio'], ['fuga', 'Fuga de gas'], ['gas', 'Fuga de gas'],
    ['inundacion', 'Inundación'], ['bomba', 'Amenaza de bomba'], ['amenaza', 'Amenaza de bomba'], ['derrame', 'Derrame de materiales peligrosos'], ['quimic', 'Derrame de materiales peligrosos'],
    ['explosion', 'Explosión'], ['lesionad', 'Lesionado / primeros auxilios'], ['evacuacion', 'Evacuación general']];
  const PAL_CURSO = [['brigada', 'Formación de Brigadas'], ['extintor', 'Uso y Manejo de Extintores'], ['primeros auxilios', 'Primeros Auxilios'], ['comando de incidentes', 'Sistema de Comando de Incidentes'],
    ['sci', 'Sistema de Comando de Incidentes'], ['materiales peligrosos', 'Materiales Peligrosos'], ['matpel', 'Materiales Peligrosos'], ['evacuacion', 'Evacuación'], ['simulacro', 'Simulacros'], ['busqueda y rescate', 'Búsqueda y Rescate'], ['combate', 'Combate de Incendios']];
  const buscarEn = (t, lista) => { const n = norm(t); const r = lista.find(([k]) => new RegExp('\\b' + k).test(n)); return r ? r[1] : ''; };
  function buscarModalidad(t) { const n = norm(t); return /hibrid/.test(n) ? 'Híbrida' : /(en linea|virtual|online|zoom|meet|teams)/.test(n) ? 'En línea' : /presencial/.test(n) ? 'Presencial' : ''; }
  function buscarTipoSim(t) { const n = norm(t); return /gabinete/.test(n) ? 'De gabinete' : /campo/.test(n) ? 'De campo' : ''; }
  /** Encabezado de guion o cronología (termina la tabla del calendario). */
  function esTitulo(t) { const n = norm(t); return n.length < 160 && /(gui[o]n|libreto|cronolog)/.test(n); }

  /** Reconoce encabezados de tabla del calendario para saber qué columna es qué. */
  function mapaEncabezado(fila) {
    const mapa = {}; let n = 0;
    (fila || []).forEach((c, i) => {
      const t = norm(c).trim();
      if (t.length > 40) return;
      const asignar = k => { if (mapa[k] == null) { mapa[k] = i; n++; } };
      if (/^no\.?$|^num\.?$|^numero$|^#$|^n[°º]$/.test(t)) asignar('numero');
      else if (/fecha|dia\b|^mes$/.test(t)) asignar('fecha');
      else if (/duracion|carga|^horas$|^hrs\.?$|^no\.? de horas|^total de horas/.test(t)) asignar('duracion');
      else if (/^hora|horario/.test(t)) asignar('hora');
      else if (/temario|contenido|^temas$|objetivo/.test(t)) asignar('temario');
      else if (/hipotesis|escenario|fenomeno|agente|tematica/.test(t)) asignar('hipotesis');
      else if (/^tipo|modalidad del simulacro/.test(t)) asignar('tipo');
      else if (/curso|^tema$|capacitacion|nombre/.test(t)) asignar('curso');
      else if (/modalidad/.test(t)) asignar('modalidad');
      else if (/instructor|responsable|imparte|facilitador|coordina/.test(t)) asignar('responsable');
    });
    return n >= 2 && mapa.fecha != null ? mapa : null;
  }

  /**
   * filas: [[celda, …] | null, …] · clase: 'simulacro' | 'capacitacion' · ejercicio: año por omisión.
   * Si el documento tiene una tabla de calendario, solo se toman sus renglones
   * (así las fechas que aparecen en el guion o en notas no se confunden con eventos).
   */
  function extraerEventos(filas, clase, ejercicio) {
    const hayTabla = filas.some(f => f && mapaEncabezado(f));
    const res = []; let mapa = null, ultimo = null;
    filas.forEach(fila => {
      if (!fila) { mapa = null; ultimo = null; return; }
      const m = mapaEncabezado(fila);
      if (m) { mapa = m; ultimo = null; return; }
      if (hayTabla && !mapa) return;
      if (mapa && fila.length < 2) { mapa = null; ultimo = null; if (hayTabla) return; }
      const texto = fila.join(' | ');
      const col = k => mapa && mapa[k] != null ? String(fila[mapa[k]] || '') : '';
      const f = buscarFecha(mapa ? col('fecha') : texto, ejercicio);
      if (!f) {
        // Renglón de continuación (p. ej. el temario sigue en el renglón de abajo en un PDF)
        if (mapa && ultimo) {
          ['temario', 'hipotesis', 'curso'].forEach(k => { const v = col(k).trim(); if (!v) return; if (k === 'temario') ultimo.temario = (ultimo.temario ? ultimo.temario + '\n' : '') + v; else if (k === 'curso' && !ultimo.cursoCompleto) ultimo.cursoTexto = (ultimo.cursoTexto || '') + ' ' + v; });
          ultimo.texto += ' / ' + texto;
        }
        return;
      }
      const p = { fecha: f.fecha, mes: f.mes, texto, hora: buscarHora(mapa ? (col('hora') || col('fecha')) : texto.replace(/\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}/g, '')), responsable: col('responsable').trim(), numero: parseInt(col('numero'), 10) || 0 };
      if (clase === 'simulacro') {
        p.tipoSimulacro = buscarTipoSim(col('tipo') || texto) || 'De campo';
        // Si el programa trae la columna de hipótesis o temática, se respeta su redacción (p. ej. «Derrame SQP»)
        p.hipotesis = col('hipotesis').trim() ? oracion(col('hipotesis').replace(/\s*\n\s*/g, ' ').trim()) : buscarEn(texto, PAL_HIP);
        p.incluir = !!(p.hipotesis || (mapa && fila.length > 1));
      } else {
        const c = col('curso').replace(/\s*\n\s*/g, ' ').trim();
        p.curso = c || buscarEn(texto, PAL_CURSO);
        p.temario = col('temario').trim();
        p.cargaHoraria = buscarDuracion(col('duracion') || (mapa ? '' : texto)) || (col('duracion') && +String(col('duracion')).replace(/[^\d.,]/g, '').replace(',', '.')) || '';
        p.modalidad = buscarModalidad(col('modalidad') || texto) || 'Presencial';
        p.incluir = !!(p.curso || (mapa && fila.length > 1));
      }
      res.push(p); ultimo = p;
    });
    res.forEach(p => {
      if (p.cursoTexto) p.curso = (p.curso + p.cursoTexto).trim();
      delete p.cursoTexto;
      if (!p.fecha) p.nota = 'Solo indica el mes: elija el día.';
      else if (!p.hora) p.nota = 'Sin hora: indíquela.';
    });
    const vistos = {};
    return res.filter(p => { const k = [p.fecha || p.mes, p.hora, p.hipotesis || p.curso].join('|'); if (vistos[k]) return false; vistos[k] = 1; return true; });
  }

  /* ======================= Guion y cronología por simulacro ======================= */
  const ORD = { primer: 1, primero: 1, segundo: 2, tercer: 3, tercero: 3, cuarto: 4, quinto: 5, sexto: 6, septimo: 7, octavo: 8, noveno: 9, decimo: 10 };
  /** Número de simulacro mencionado en un título («Simulacro 2», «Segundo simulacro», «Simulacro No. 3», «1er simulacro»). */
  function numeroEnTitulo(t) {
    const n = norm(t);
    let m = n.match(/simulacro\s*(?:no\.?|num\.?|numero|n[°º]|#)?\s*(\d{1,2})\b/);
    if (m) return +m[1];
    m = n.match(/\b(\d{1,2})\s*(?:er|ro|do|o|°|º|\.)?\s*simulacro/);
    if (m) return +m[1];
    m = n.match(/\b(primer|primero|segundo|tercer|tercero|cuarto|quinto|sexto|septimo|octavo|noveno|decimo)\b/);
    if (m && /simulacro|gui[o]n|cronolog/.test(n)) return ORD[m[1]];
    return 0;
  }

  /**
   * Recorre el documento y junta, para cada simulacro, su guion y su cronología.
   * Reconoce dos formas de armar el programa:
   *  a) Un título por simulacro («PRIMER SIMULACRO», «Simulacro No. 2», o con su fecha) bajo un
   *     título general «GUION Y CRONOLOGÍA»: todo lo que sigue es de ese simulacro.
   *  b) Títulos separados «Guion del primer simulacro» / «Cronología del primer simulacro».
   * Devuelve { 0: { html, guion: bool, cronologia: bool, hipotesis }, 1: … } con índices de «propuestas».
   */
  function extraerGuiones(bloques, propuestas, ejercicio) {
    const out = {}; let n = 0; let tipos = { guion: false, cronologia: false };
    const porFecha = f => propuestas.findIndex(p => p.fecha && p.fecha === f) + 1;
    // Si el calendario tiene columna «No.», el «tercer simulacro» es el renglón con No. 3
    const conNumero = propuestas.some(p => p.numero);
    const indice = n => conNumero ? propuestas.findIndex(p => p.numero === n) : (n <= propuestas.length ? n - 1 : -1);
    const seccion = () => { const i = indice(n); return i < 0 ? null : (out[i] || (out[i] = { html: '', guion: false, cronologia: false, hipotesis: '', lineas: [] })); };
    (bloques || []).forEach(b => {
      if (b.calendario) { n = 0; return; }
      const t = norm(b.texto);
      if (b.texto.length < 160) {
        const k = { guion: /(gui[o]n|libreto)/.test(t), cronologia: /cronolog/.test(t) };
        let num = numeroEnTitulo(b.texto);
        if (!num && (k.guion || k.cronologia || /simulacro/.test(t)) && !/:/.test(b.texto)) { const f = buscarFecha(b.texto, ejercicio); if (f && f.fecha) { const i = porFecha(f.fecha); num = i ? (propuestas[i - 1].numero || i) : 0; } }
        if (k.guion || k.cronologia || (num && /simulacro/.test(t))) {
          if (k.guion || k.cronologia) tipos = k;
          if (num) n = num;
          else if (!n && propuestas.length === 1) n = 1;
          const s = n ? seccion() : null; if (s) s.html += '<h2>' + escH(b.texto) + '</h2>';
          return;
        }
      }
      const s = n ? seccion() : null;
      if (!s) return;
      s.html += b.html;
      String(b.texto).split(/\n/).forEach(l => { if (l.trim()) s.lineas.push(l.trim()); });
      if (!tipos.guion && !tipos.cronologia) s.guion = true;
      if (tipos.guion) s.guion = true;
      if (tipos.cronologia) s.cronologia = true;
      const h = b.texto.match(/^\s*hip[oó]tesis\s*:\s*(.+)$/i);
      if (h && !s.hipotesis) s.hipotesis = oracion(h[1].trim().replace(/\.$/, ''));
    });
    return out;
  }
  /**
   * Convierte el texto de un simulacro del PAS en los datos del formato de guion:
   * alcance, programación, equipamiento, recursos, magnitud y cronología (fases y horas).
   */
  function guionDesdeLineas(lineas) {
    const g = { cronologia: [], equipamiento: [], recursos: [], magnitud: '' };
    const r = { alcance: '', programacion: '', guion: g };
    let modo = '';
    (lineas || []).forEach(l => {
      const t = String(l).trim(); if (!t) return;
      const n = norm(t);
      if (/^(fecha|horario|hora)\s*:/.test(n) || /^hipotesis\s*:/.test(n)) return;
      if (/^tipo de simulacro\s*:/.test(n)) {
        if (/parcial/.test(n)) r.alcance = 'Parcial'; else if (/(total|integral)/.test(n)) r.alcance = 'Total';
        if (/sin previo aviso/.test(n)) r.programacion = 'Sin previo aviso'; else if (/previo aviso/.test(n)) r.programacion = 'Con previo aviso';
        return;
      }
      if (/^equipamiento/.test(n)) { modo = 'equipo'; return; }
      if (/^(recursos|integrantes)/.test(n)) { modo = 'recursos'; return; }
      if (/^fase\b/.test(n)) { modo = 'crono'; g.cronologia.push({ fase: t }); return; }
      const m = t.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:hrs?\.?)?\s*[-–:|]?\s*(.+)$/i);
      if (m) { modo = 'crono'; g.cronologia.push({ hora: m[1], texto: m[2].replace(/\s*\|\s*/g, ' — ').trim() }); return; }
      if (/^hora\s*\|/.test(n)) return; // encabezado de una tabla de cronología
      if (modo === 'crono') { const u = g.cronologia[g.cronologia.length - 1]; if (u && !u.fase) u.texto += ' ' + t; else g.cronologia.push({ hora: '', texto: t }); return; }
      if (modo === 'equipo') { g.equipamiento.push(t); return; }
      if (modo === 'recursos') { g.recursos.push(t); return; }
    });
    const mg = norm(lineas.join(' ')).match(/magnitud\s*(?:de\s*)?(\d+(?:[.,]\d+)?)/);
    if (mg) g.magnitud = 'Magnitud ' + mg[1].replace(',', '.');
    return r;
  }

  /** «DERRAME SQP» → «Derrame SQP»; respeta siglas cortas. */
  function oracion(t) {
    if (t !== t.toUpperCase()) return t;
    const r = t.toLowerCase().split(/(\s+)/).map(w => /^[a-záéíóúñü]{2,4}$/i.test(w) && !/[aeiouáéíóú]/i.test(w) ? w.toUpperCase() : w).join('');
    return r.charAt(0).toUpperCase() + r.slice(1);
  }

  /* ======================= Visor (sin descargar) ======================= */
  /** Convierte un .docx a HTML para mostrarlo en pantalla. */
  async function docxAHtml(arrayBuffer) {
    await cargarScript(CDN.mammoth);
    return (await window.mammoth.convertToHtml({ arrayBuffer })).value;
  }
  /** Dibuja todas las páginas de un PDF dentro de «contenedor» (funciona igual en PC y celular). */
  async function pdfEnPantalla(arrayBuffer, contenedor) {
    await cargarScript(CDN.pdf);
    const lib = window.pdfjsLib;
    if (!lib.GlobalWorkerOptions.workerSrc) {
      const codigo = await (await fetch(CDN.pdfWorker)).text();
      lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(new Blob([codigo], { type: 'text/javascript' }));
    }
    const doc = await lib.getDocument({ data: arrayBuffer }).promise;
    contenedor.innerHTML = '';
    const ancho = Math.max(280, contenedor.clientWidth - 44);
    for (let p = 1; p <= doc.numPages; p++) {
      const pag = await doc.getPage(p);
      const base = pag.getViewport({ scale: 1 });
      const vp = pag.getViewport({ scale: (ancho / base.width) * (window.devicePixelRatio || 1) });
      const cv = document.createElement('canvas');
      cv.width = vp.width; cv.height = vp.height;
      cv.style.cssText = 'width:' + ancho + 'px;display:block;margin:0 auto 12px;box-shadow:0 1px 6px rgba(0,0,0,.2);background:#fff';
      contenedor.appendChild(cv);
      await pag.render({ canvasContext: cv.getContext('2d'), viewport: vp }).promise;
    }
  }

  return { leerArchivo, extraerEventos, extraerGuiones, guionDesdeLineas, docxAHtml, pdfEnPantalla, buscarFecha, buscarHora, buscarDuracion, numeroEnTitulo };
})();
if (typeof module !== 'undefined') module.exports = Importador;
