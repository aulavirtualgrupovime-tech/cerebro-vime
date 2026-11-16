/**
 * Cerebro Grupo VIME · Documentos para el cliente (Word .docx generados en el navegador).
 *  - Guion y cronología de simulacro, con el formato oficial de Grupo VIME (2027).
 *  - Reporte de avance de cumplimiento (sin pagos), general o por inmueble.
 *  - Logotipos: izquierda = asesor, derecha = cliente (galería compartida).
 *  - Visor de .docx con encabezados y pies (docx-preview).
 */
const Docs = (() => {
  const LIB = {
    docx: 'https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js',
    jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    preview: 'https://cdn.jsdelivr.net/npm/docx-preview@0.3.5/dist/docx-preview.min.js'
  };
  const cargados = {};
  function cargar(url) {
    if (cargados[url]) return cargados[url];
    cargados[url] = new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = url; s.onload = ok;
      s.onerror = () => { delete cargados[url]; mal(new Error('No se pudo cargar el generador de Word. Revise su conexión a internet.')); };
      document.head.appendChild(s);
    });
    return cargados[url];
  }

  // La librería de Word y el visor publican el mismo nombre global («docx»); se guardan por separado.
  async function libWord() {
    if (window.__libWord) return window.__libWord;
    const previo = window.docx; await cargar(LIB.docx);
    window.__libWord = window.docx; if (previo) window.docx = previo;
    return window.__libWord;
  }
  async function libVisor() {
    if (window.__libVisor) return window.__libVisor;
    await cargar(LIB.jszip);
    const previo = window.docx; await cargar(LIB.preview);
    window.__libVisor = window.docx; window.docx = previo;
    return window.__libVisor;
  }

  /* ======================= Logotipos ======================= */
  // Los logotipos fijos van incorporados (js/logos_fijos.js): así también funcionan al abrir la app desde el disco,
  // donde el navegador no deja leer archivos de la carpeta «img» para meterlos al Word.
  const FIJOS = { gv: { nombre: 'Grupo VIME', src: LOGOS_FIJOS.gv }, aula: { nombre: 'Aula Virtual Grupo VIME', src: LOGOS_FIJOS.aula } };
  const urlCache = {};
  function galeria(db) { const r = (db.ajustes || []).find(x => x.id === 'logos'); return (r && r.lista) || []; }
  function opciones(db) { return [['gv', 'Grupo VIME'], ['aula', 'Aula Virtual Grupo VIME']].concat(galeria(db).map(l => [l.id, l.nombre || 'Logotipo']), [['', 'Ninguno']]); }
  function nombreLogo(db, v) { const o = opciones(db).find(x => x[0] === v); return o ? o[1] : ''; }
  /** URL para mostrar un logotipo en pantalla. */
  async function logoSrc(db, v) {
    if (!v) return '';
    if (FIJOS[v]) return FIJOS[v].src;
    if (urlCache[v]) return urlCache[v];
    const l = galeria(db).find(x => x.id === v); if (!l) return '';
    const blob = await Datos.obtenerArchivo(l);
    if (!blob) return l.url || '';
    return (urlCache[v] = URL.createObjectURL(blob));
  }
  /** Bytes y tamaño (en píxeles) de un logotipo para el Word. */
  async function logoDatos(db, v, maxW, maxH) {
    if (!v) return null;
    const falla = () => new Error('No se pudo cargar el logotipo «' + (nombreLogo(db, v) || 'seleccionado') + '» para el documento. Revise la galería de logotipos o elija otro.');
    const src = await logoSrc(db, v); if (!src) throw falla();
    try {
      const blob = await (await fetch(src)).blob();
      const url = URL.createObjectURL(blob);
      const dims = await new Promise((ok, mal) => { const im = new Image(); im.onload = () => ok({ w: im.naturalWidth, h: im.naturalHeight }); im.onerror = mal; im.src = url; });
      const r = Math.min(maxW / dims.w, maxH / dims.h);
      return { data: new Uint8Array(await blob.arrayBuffer()), w: Math.round(dims.w * r), h: Math.round(dims.h * r) };
    } catch (e) { throw falla(); }
  }

  /* ======================= Utilidades de Word ======================= */
  const AZUL = '1F4E79', GRIS = '808080', LINEA = 'B7B7B7', SOMBRA = 'E8E8E8';
  const FUENTE = 'Arial Nova Light';
  const W = 9360; // ancho útil: carta con márgenes de 2.54 cm

  function kit(D) {
    const { Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ShadingType, TableLayoutType, VerticalAlign } = D;
    const T = (text, o) => { o = o || {}; return new TextRun({ text: String(text == null ? '' : text), font: FUENTE, size: o.size || 22, bold: o.bold, color: o.color, italics: o.it }); };
    const P = (runs, o) => { o = o || {}; return new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { after: o.after == null ? 90 : o.after, before: o.before || 0 }, keepNext: o.keepNext, indent: o.indent }); };
    const linea = n => '_'.repeat(n || 50);
    const valor = (v, n) => (v != null && String(v).trim()) ? T(v) : T(linea(n), { color: GRIS });
    const borde = { style: BorderStyle.SINGLE, size: 4, color: LINEA };
    const bordes = { top: borde, bottom: borde, left: borde, right: borde };
    const celda = (contenido, o) => {
      o = o || {};
      const parrafos = (Array.isArray(contenido) ? contenido : [contenido]).map(c => typeof c === 'string' || typeof c === 'number' ? P([T(c, { bold: o.bold, size: o.size || 20, color: o.color })], { after: 0 }) : c);
      return new TableCell({ children: parrafos, width: o.w ? { size: o.w, type: WidthType.DXA } : undefined, shading: o.fill ? { type: ShadingType.CLEAR, color: 'auto', fill: o.fill } : undefined, margins: { top: 60, bottom: 60, left: 100, right: 100 }, verticalAlign: o.va || VerticalAlign.CENTER, borders: bordes, columnSpan: o.span });
    };
    const tabla = (anchos, cab, filas) => new Table({
      width: { size: W, type: WidthType.DXA }, columnWidths: anchos, layout: TableLayoutType.FIXED,
      rows: (cab ? [new TableRow({ tableHeader: true, children: cab.map((c, i) => celda(c, { w: anchos[i], fill: SOMBRA, bold: true })) })] : [])
        .concat(filas.map(f => new TableRow({ cantSplit: true, children: f.map((c, i) => celda(c, { w: anchos[i] })) })))
    });
    const seccion = t => new Paragraph({
      children: [T(t, { bold: true, size: 24 })], keepNext: true, spacing: { before: 260, after: 120 },
      shading: { type: ShadingType.CLEAR, color: 'auto', fill: SOMBRA }, border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: AZUL, space: 2 } }
    });
    const ayuda = t => P([T(t, { size: 18, color: GRIS })], { after: 60 });
    const campo = (et, v, n) => P([T(et + ':  ', { bold: true }), valor(v, n)]);
    const vineta = (et, v, n) => P([T('•  '), T(et + ':  '), valor(v, n)], { indent: { left: 360 } });
    return { T, P, linea, valor, celda, tabla, seccion, ayuda, campo, vineta, AlignmentType, BorderStyle };
  }

  /** Encabezado con logo del asesor (izq.), título y logo del cliente (der.); pie con página X de Y. */
  async function encabezadoYPie(D, db, logos, titulo, textoPie) {
    const { Header, Footer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, BorderStyle, ImageRun, VerticalAlign, TableLayoutType, PageNumber } = D;
    const [li, ld] = [await logoDatos(db, logos.izq, 150, 62), await logoDatos(db, logos.der, 150, 62)];
    const nada = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const sinBorde = { top: nada, bottom: nada, left: nada, right: nada };
    const anchos = [2600, W - 5200, 2600];
    const celda = (hijos, w, alin) => new TableCell({ borders: sinBorde, width: { size: w, type: WidthType.DXA }, verticalAlign: VerticalAlign.CENTER, children: [new Paragraph({ alignment: alin, children: hijos })] });
    const img = l => l ? [new ImageRun({ data: l.data, transformation: { width: l.w, height: l.h } })] : [];
    const header = new Header({
      children: [new Table({
        width: { size: W, type: WidthType.DXA }, columnWidths: anchos, layout: TableLayoutType.FIXED,
        borders: { top: nada, left: nada, right: nada, insideHorizontal: nada, insideVertical: nada, bottom: { style: BorderStyle.SINGLE, size: 8, color: AZUL } },
        rows: [new TableRow({ children: [celda(img(li), anchos[0], AlignmentType.LEFT), celda([new TextRun({ text: titulo, font: FUENTE, size: 28, bold: true, color: AZUL })], anchos[1], AlignmentType.CENTER), celda(img(ld), anchos[2], AlignmentType.RIGHT)] })]
      }), new Paragraph({ children: [], spacing: { after: 60 } })]
    });
    const g = { font: FUENTE, size: 16, color: GRIS };
    const footer = new Footer({
      children: [new Paragraph({
        alignment: AlignmentType.CENTER, border: { top: { style: BorderStyle.SINGLE, size: 4, color: LINEA, space: 4 } },
        children: [new TextRun(Object.assign({ text: textoPie + ' ·   Página ' }, g)), new TextRun(Object.assign({ children: [PageNumber.CURRENT] }, g)), new TextRun(Object.assign({ text: ' de ' }, g)), new TextRun(Object.assign({ children: [PageNumber.TOTAL_PAGES] }, g))]
      })]
    });
    return { header, footer };
  }

  function documento(D, header, footer, hijos) {
    return new D.Document({
      creator: 'Grupo VIME', title: 'Grupo VIME',
      styles: { default: { document: { run: { font: FUENTE, size: 22 } } } },
      sections: [{ properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 1083, bottom: 1083, left: 1440, right: 1440, header: 500, footer: 500 } } }, headers: { default: header }, footers: { default: footer }, children: hijos }]
    });
  }

  /* ======================= Guion y cronología ======================= */
  const ESTRUCTURA = [
    ['Coordinación General', 'Dirige el simulacro, activa SCI, supervisa seguridad'],
    ['Brigada de Evacuación', 'Guía a la población, verifica rutas de evacuación y zonas de menor riesgo'],
    ['Brigada de Primeros Auxilios', 'Atiende lesionados simulados'],
    ['Brigada Contra Incendios', 'Control de fuego simulado'],
    ['Brigada de Comunicación', 'Manejo de radios, megáfonos, alarmas, solicitud de auxilio externo'],
    ['Equipo de Simuladores', 'Representan lesiones y comportamientos'],
    ['Equipo de Evaluación', 'Observa, mide y registra desempeño'],
    ['Responsable de Seguridad', 'Supervisa riesgos reales'],
    ['Brigadistas Multifuncionales', 'Evacuación y atención de la emergencia según protocolo de actuación e indicaciones del Coordinador General.']
  ];
  const INSTALACIONES = [['pc', 'Puesto de Comando (PC)'], ['ae', 'Área de Espera (E)'], ['acv', 'Área de Concentración de Víctimas (ACV)']];
  const FENOMENOS = ['Geológico', 'Hidrometeorológico', 'Químico-tecnológico', 'Sanitario-ecológico', 'Socio-organizativo', 'Astronómico'];

  /** ctx: { ev, inmueble, numero, logos:{izq,der}, db } */
  async function guion(ctx) {
    const D = await libWord(), k = kit(D);
    const ev = ctx.ev, g = ev.guion || {}, inm = ctx.inmueble || {};
    const { header, footer } = await encabezadoYPie(D, ctx.db, ctx.logos, 'GUION Y CRONOLOGÍA DE SIMULACRO', 'Guion y Cronología del Simulacro');
    const marca = (si) => si ? '( X )' : '(   )';
    const f = String(ev.fecha || '').split('-');
    const b = [];
    b.push(k.campo('Inmueble / Establecimiento', inm.nombreComercial, 60));
    b.push(k.campo('Clasificación del riesgo', inm.riesgo ? (inm.riesgo === 'alto' ? 'Riesgo alto' : 'Riesgo ordinario') : '', 37));
    b.push(k.P([k.T('Fecha del simulacro:  ', { bold: true }), k.T(f.length === 3 ? f[2] + ' / ' + f[1] + ' / ' + f[0] : '____ / ____ / ______'), k.T('          Hora programada:  ', { bold: true }), k.valor(ev.hora ? ev.hora + ' hrs' : '', 12), k.T('          No:  ', { bold: true }), k.valor(ctx.numero, 10)]));
    b.push(k.P([k.T('Tipo de simulacro:   ', { bold: true }), k.T(marca(ev.tipoSimulacro === 'De gabinete') + ' Gabinete      ' + marca(ev.tipoSimulacro === 'De campo') + ' Campo')]));
    b.push(k.P([k.T('Alcance:                  ', { bold: true }), k.T(marca(ev.alcance === 'Parcial') + ' Parcial      ' + marca(ev.alcance === 'Total') + ' Total')]));
    b.push(k.P([k.T('Programación:        ', { bold: true }), k.T(marca(ev.programacion === 'Con previo aviso') + ' Con previo aviso      ' + marca(ev.programacion === 'Sin previo aviso') + ' Sin previo aviso')]));
    b.push(k.campo('Fenómeno perturbador simulado', ev.hipotesis + (ev.escenario && ev.escenario.toLowerCase() !== String(ev.hipotesis || '').toLowerCase() ? ' — ' + ev.escenario : ''), 55));

    b.push(k.seccion('1.  Objetivo(s) del simulacro'));
    if (g.objetivos && g.objetivos.trim()) g.objetivos.split(/\n+/).forEach(o => b.push(k.P([k.T(o.trim())], { align: k.AlignmentType.JUSTIFIED })));
    else { b.push(k.ayuda('Redactar objetivos claros, medibles y alineados a la hipótesis.')); b.push(k.P([k.T(k.linea(85), { color: GRIS })])); b.push(k.P([k.T(k.linea(85), { color: GRIS })])); }

    b.push(k.seccion('2.  Hipótesis del simulacro'));
    b.push(k.ayuda('Descripción técnica del fenómeno perturbador.'));
    b.push(k.vineta('Tipo de fenómeno', g.tipoFenomeno, 63));
    b.push(k.vineta('Magnitud / Intensidad', g.magnitud, 60));
    b.push(k.vineta('Área afectada', g.areaAfectada, 66));
    b.push(k.vineta('Fenómenos secundarios', g.secundarios, 57));

    b.push(k.seccion('3.  Escenario(s) del simulacro'));
    b.push(k.ayuda('Efectos y consecuencias simuladas.'));
    b.push(k.vineta('Daños simulados', g.danos, 64));
    b.push(k.vineta('Lesiones simuladas', g.lesiones, 62));
    b.push(k.vineta('Obstáculos en rutas', g.obstaculos, 61));
    b.push(k.vineta('Condiciones ambientales simuladas (humo, ruido, etc.)', g.condiciones, 32));

    b.push(k.seccion('4.  Estructura organizativa del simulacro'));
    const est = g.estructura || {};
    b.push(k.tabla([2600, 2900, W - 5500], ['Área', 'Responsable', 'Funciones principales'], ESTRUCTURA.map(([a, fn]) => [a, est[a] || k.linea(26), fn])));

    b.push(k.seccion('5.  Instalaciones del SCI'));
    const sci = g.sci || {};
    b.push(k.tabla([3400, 3000, W - 6400], ['Instalación', 'Ubicación', 'Responsable'], INSTALACIONES.map(([c, n]) => [n, (sci[c] && sci[c].ubicacion) || k.linea(28), (sci[c] && sci[c].responsable) || k.linea(28)])));

    b.push(k.seccion('6.  Cronología'));
    const crono = g.cronologia || [];
    if (!crono.length) { b.push(k.P([k.T(k.linea(85), { color: GRIS })])); b.push(k.P([k.T(k.linea(85), { color: GRIS })])); }
    crono.forEach(c => {
      if (c.fase) b.push(k.P([k.T(c.fase, { bold: true, color: AZUL })], { before: 120, after: 60, keepNext: true }));
      else b.push(k.P([k.T(c.hora ? c.hora + ' ' : '', { bold: true }), k.T(c.texto)], { align: k.AlignmentType.JUSTIFIED, after: 80 }));
    });
    return await D.Packer.toBlob(documento(D, header, footer, b));
  }

  /* ======================= Reporte de avance ======================= */
  /**
   * ctx: { db, logos, cliente, ejercicio, fechaCorte, alcance (texto), inmuebles: [{ inm, servicios: [{ nombre, estado, avance, etapas:[{t, hecha, fecha, espera}], resoluciones:[], eventos:[], pendientes:[], nota }] }] }
   */
  async function reporte(ctx) {
    const D = await libWord(), k = kit(D);
    const { header, footer } = await encabezadoYPie(D, ctx.db, ctx.logos, 'REPORTE DE AVANCE DE CUMPLIMIENTO', 'Reporte de avance · ' + (ctx.cliente.nombreComercial || ctx.cliente.razonSocial || ''));
    const b = [];
    const sub = t => k.P([k.T(t, { bold: true, color: AZUL, size: 22 })], { before: 160, after: 80, keepNext: true });
    b.push(k.campo('Cliente', ctx.cliente.razonSocial));
    if (ctx.cliente.nombreComercial) b.push(k.campo('Nombre comercial', ctx.cliente.nombreComercial));
    if (ctx.cliente.rfc) b.push(k.campo('RFC', ctx.cliente.rfc));
    b.push(k.campo('Alcance del reporte', ctx.alcance));
    b.push(k.campo('Ejercicio', String(ctx.ejercicio)));
    b.push(k.campo('Fecha de corte', ctx.fechaCorte));

    b.push(k.seccion('1.  Resumen de avance'));
    const filas = [];
    ctx.inmuebles.forEach(x => x.servicios.forEach(s => filas.push([x.inm.nombreComercial, s.nombre, s.estado, s.avance + ' %'])));
    if (filas.length) b.push(k.tabla([2700, 3460, 1700, 1500], ['Inmueble', 'Servicio', 'Estado', 'Avance'], filas));
    else b.push(k.P([k.T('Sin servicios registrados en el ejercicio ' + ctx.ejercicio + '.', { color: GRIS })]));

    ctx.inmuebles.forEach((x, n) => {
      const i = x.inm;
      b.push(k.seccion((n + 2) + '.  ' + i.nombreComercial));
      b.push(k.campo('Dirección', i.direccion));
      b.push(k.P([k.T('Clasificación del riesgo:  ', { bold: true }), k.T(i.riesgo === 'alto' ? 'Riesgo alto' : 'Riesgo ordinario'), k.T('        NRPC:  ', { bold: true }), k.T(i.nrpc || 'No aplica'), k.T('        Aforo:  ', { bold: true }), k.T(i.aforo || '—')]));
      if (!x.servicios.length) b.push(k.P([k.T('Sin servicios contratados en este ejercicio.', { color: GRIS })]));
      x.servicios.forEach(s => {
        b.push(sub(s.nombre + '  ·  ' + s.avance + ' %  (' + s.estado + ')'));
        if (s.nota) b.push(k.P([k.T(s.nota)]));
        if (s.etapas.length) b.push(k.tabla([6000, 1700, W - 7700], ['Etapa', 'Estado', 'Fecha'], s.etapas.map(e => [e.t, e.hecha ? 'Cumplida' : e.espera ? 'En espera' : 'Pendiente', e.fecha || '—'])));
        if (s.resoluciones && s.resoluciones.length) {
          b.push(k.P([k.T('Resoluciones de la autoridad', { bold: true, size: 20 })], { before: 100, after: 60, keepNext: true }));
          b.push(k.tabla([1900, 1500, 2000, W - 5400], ['Resolución', 'Notificación', 'Oficio', 'Seguimiento'], s.resoluciones.map(r => [r.tipo, r.fecha || '—', r.oficio || '—', r.seguimiento || '—'])));
        }
        if (s.eventos && s.eventos.length) {
          const esSim = s.eventos[0].clase === 'simulacro';
          b.push(k.P([k.T(esSim ? 'Simulacros' : 'Capacitaciones', { bold: true, size: 20 })], { before: 100, after: 60, keepNext: true }));
          b.push(esSim
            ? k.tabla([600, 2100, 900, 1500, 2700, W - 7800], ['No.', 'Fecha', 'Hora', 'Tipo', 'Hipótesis', 'Estado'], s.eventos.map((e, j) => [String(j + 1), e.fechaTxt, e.hora, e.tipoSimulacro || '—', e.hipotesis || '—', e.estado]))
            : k.tabla([2900, 2100, 900, 900, 1300, W - 8100], ['Curso', 'Fecha', 'Hora', 'Horas', 'Modalidad', 'Estado'], s.eventos.map(e => [e.curso || '—', e.fechaTxt, e.hora, String(e.cargaHoraria || '—'), e.modalidad || '—', e.estado])));
        }
        if (s.pendientes && s.pendientes.length) {
          b.push(k.P([k.T('Documentos pendientes de entrega por el cliente', { bold: true, size: 20 })], { before: 100, after: 60, keepNext: true }));
          b.push(k.tabla([5200, 2000, W - 7200], ['Documento', 'Fecha límite', 'Estado'], s.pendientes.map(p => [p.descripcion, p.fechaLimite || '—', p.entregado ? 'Entregado ' + p.entregado : 'Pendiente'])));
        }
      });
    });
    return await D.Packer.toBlob(documento(D, header, footer, b));
  }

  /* ======================= Visor de .docx ======================= */
  async function verDocx(blob, contenedor) {
    const V = await libVisor();
    contenedor.innerHTML = '';
    await V.renderAsync(blob, contenedor, null, { inWrapper: true, ignoreWidth: false, ignoreHeight: false, breakPages: true, renderHeaders: true, renderFooters: true });
  }

  return { galeria, opciones, nombreLogo, logoSrc, guion, reporte, verDocx, ESTRUCTURA, INSTALACIONES, FENOMENOS, cargar, LIB };
})();
