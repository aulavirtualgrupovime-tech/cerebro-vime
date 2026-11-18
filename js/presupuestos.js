/**
 * Cerebro Grupo VIME · Presupuestos (PDF generado en el navegador con pdf-lib).
 * Formato: «Presupuesto Huayacan 2» (2026): logotipo de Grupo VIME, «PRESUPUESTO · Servicio: …»,
 * establecimiento, tabla SERVICIO | DESCRIPCIÓN | COSTO, totales con impuestos opcionales,
 * condiciones generales y pie con teléfono, correo y página web.
 *
 * Letra: Arial Nova Light si el equipo la tiene instalada (Chrome o Edge en computadora la pueden leer
 * con permiso del usuario). Si no, se usa una letra parecida incluida en la app.
 */
const Presupuestos = (() => {
  const CDN = {
    pdflib: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    fontkit: 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js',
    recursos: 'js/constancia_recursos.js'
  };
  const cargados = {};
  function cargar(url) {
    if (cargados[url]) return cargados[url];
    cargados[url] = new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = url; s.onload = ok;
      s.onerror = () => { delete cargados[url]; mal(new Error('No se pudo cargar el generador de PDF. Revise su conexión a internet.')); };
      document.head.appendChild(s);
    });
    return cargados[url];
  }

  /* ======================= Datos predeterminados ======================= */
  const TASAS = { iva: 0.16, retIva: 0.106667, retIsr: 0.0125 };
  const ETIQUETAS_IMP = { iva: 'IVA (16 %)', retIva: 'Retención de IVA (10.6667 %)', retIsr: 'Retención de ISR (1.25 %)' };
  const PIE = { telefono: '7772130114', correo: 'contacto@grupovimeconsultoria.com', web: 'www.grupovimeconsultoria.com.mx' };

  const TIPOS_SERVICIO = [
    'Cumplimiento de Normatividad en Materia de Protección Civil',
    'Cumplimiento Normativo STPS',
    'Capacitación en Protección Civil',
    'Programa Anual de Simulacros'
  ];

  const CONDICIONES = [
    'La facturación para Personas Morales es costo más IVA y menos retenciones.',
    'La elaboración del PIPC requiere de la entrega, por parte del cliente, de la documentación solicitada por la autoridad de protección civil relacionada con la operación (Datos generales y UIPC) y condiciones de seguridad del establecimiento (dictámenes y estudios).',
    'Para la contratación de servicios, se requiere pago anticipado del 50% del costo total del servicio.',
    'El costo de servicio no incluye pago de derechos a la autoridad para la obtención de visto bueno correspondiente.'
  ];

  // {año} se cambia por el ejercicio del presupuesto. Los renglones que empiezan con «•» llevan viñeta.
  const CATALOGO = [
    { clave: 'pipc', nombre: 'PIPC (actualización)', servicio: 'ELABORACIÓN DE PROGRAMA INTERNO DE PROTECCIÓN CIVIL\n(Actualización)', costo: 13000,
      descripcion: '• Levantamiento físico y fotográfico del establecimiento.\n• Elaboración de PIPC {año} según guía de la Coordinación Estatal de Protección Civil Morelos.\n• Elaboración Programa anual de simulacros y capacitación.\n• Actualización de Procedimientos de atención de emergencias.\n• Ingreso de PIPC a la autoridad de PC.\n• Entrega física de PIPC impreso al establecimiento y explicación de su contenido para su correcta ejecución.\n• Inventario de Espacios reservados para PCD.' },
    { clave: 'capacitacion', nombre: 'Capacitación integral brigadista', servicio: 'CAPACITACIÓN INTEGRAL PERSONAL BRIGADISTA', costo: 3500, nota: '(Por curso)', cantidad: 4,
      descripcion: '• Cursos: Formación de Brigadas; Simulacros; Uso y Manejo de Extintores; Primeros Auxilios\nMáximo de participantes: 25\nDuración: 4-6 horas\nDC3 para cada participante' },
    { clave: 'asesoria', nombre: 'Asesoría en visita de inspección', servicio: 'ASESORÍA VISITA DE INSPECCIÓN', costo: 0,
      descripcion: '• Asesoría para atención y seguimiento a visita de inspección de autoridad estatal y/o municipal de PC.' },
    { clave: 'gestoria', nombre: 'Gestoría de trámites', servicio: 'GESTORÍA', costo: 2000,
      descripcion: '• Ingreso de Trámites {año} a la plataforma de la Coordinación Estatal de Protección Civil Morelos.\n• Trámite de Certificación de Bitácora de Simulacros.\n• Recepción de resoluciones de la Coordinación Estatal de Protección Civil Morelos.' },
    { clave: 'simulacros', nombre: 'Programa anual de simulacros', servicio: 'PROGRAMA ANUAL DE SIMULACROS', costo: '',
      descripcion: '• Planeación de cada simulacro (guion y cronología).\n• Ejecución y evaluación de cada simulacro.\n• Presentación de la evidencia ante la autoridad de Protección Civil.' },
    { clave: 'bitacora', nombre: 'Certificación de bitácora', servicio: 'CERTIFICACIÓN DE BITÁCORA DE SIMULACROS', costo: '',
      descripcion: '• Integración de la bitácora con los simulacros y sesiones de la UIPC del año anterior.\n• Trámite de certificación ante la Coordinación Estatal de Protección Civil Morelos.' },
    { clave: 'vistobueno', nombre: 'Gestoría de Visto Bueno', servicio: 'GESTORÍA DE VISTO BUENO', costo: '',
      descripcion: '• Integración de la solicitud y sus anexos.\n• Ingreso ante la autoridad de Protección Civil junto con el PIPC.\n• Seguimiento hasta la obtención del Visto Bueno.' },
    { clave: 'stps', nombre: 'Cumplimiento normativo STPS', servicio: 'CUMPLIMIENTO NORMATIVO STPS', costo: '',
      descripcion: '• Diagnóstico de cumplimiento de las Normas Oficiales Mexicanas aplicables.\n• Elaboración de programas, procedimientos y registros requeridos.\n• Acompañamiento en visitas de inspección de la STPS.' }
  ];
  const PLANTILLAS = {
    'Cumplimiento de Normatividad en Materia de Protección Civil': ['pipc', 'capacitacion', 'asesoria', 'gestoria'],
    'Cumplimiento Normativo STPS': ['stps'],
    'Capacitación en Protección Civil': ['capacitacion'],
    'Programa Anual de Simulacros': ['simulacros', 'bitacora']
  };

  function concepto(clave, anio) {
    const c = CATALOGO.find(x => x.clave === clave); if (!c) return null;
    return { servicio: c.servicio, descripcion: c.descripcion.replace(/\{año\}/g, anio), costo: c.costo, cantidad: c.cantidad || 1, nota: c.nota || '' };
  }
  function conceptosDe(tipo, anio) { return (PLANTILLAS[tipo] || []).map(k => concepto(k, anio)).filter(Boolean); }

  /* ======================= Cálculo ======================= */
  const r2 = n => Math.round((+n || 0) * 100) / 100;
  function importe(c) { return r2((+c.costo || 0) * (+c.cantidad || 1)); }
  function calcular(p) {
    const subtotal = r2((p.conceptos || []).reduce((a, c) => a + importe(c), 0));
    const imp = p.impuestos || {};
    const iva = imp.iva ? r2(subtotal * TASAS.iva) : 0;
    const retIva = imp.retIva ? r2(subtotal * TASAS.retIva) : 0;
    const retIsr = imp.retIsr ? r2(subtotal * TASAS.retIsr) : 0;
    return { subtotal, iva, retIva, retIsr, total: r2(subtotal + iva - retIva - retIsr) };
  }
  function pesos(n) { return '$ ' + (+n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

  /* ======================= Letras ======================= */
  let letrasCache = null;
  /** Lee Arial Nova Light del equipo (si está instalada y el navegador lo permite). */
  async function arialNovaLocal() {
    try {
      if (!('queryLocalFonts' in window)) return null;
      if (localStorage.getItem('cerebro_sin_fuente_local') === '1') return null;
      const lista = await window.queryLocalFonts();
      const buscar = re => lista.find(f => re.test(f.postscriptName || '') || re.test((f.fullName || '').replace(/\s+/g, '')));
      const ligera = buscar(/^ArialNova-?Light$/i), normal = buscar(/^ArialNova$/i) || buscar(/^ArialNova-?Regular$/i);
      if (!ligera) return null;
      const bytes = async f => new Uint8Array(await (await f.blob()).arrayBuffer());
      return { ligera: await bytes(ligera), media: normal ? await bytes(normal) : null };
    } catch (e) {
      try { if (e && e.name === 'NotAllowedError') localStorage.setItem('cerebro_sin_fuente_local', '1'); } catch (x) { }
      return null;
    }
  }
  // Se pide en cuanto el usuario pulsa «Ver PDF»: el navegador solo deja leer las letras del equipo justo después de un clic.
  let localPromesa = null;
  function prepararLetra() { if (!localPromesa) localPromesa = arialNovaLocal(); return localPromesa; }
  async function letras(doc) {
    const { fontkit } = window;
    doc.registerFontkit(fontkit);
    if (!letrasCache) {
      const local = await prepararLetra();
      if (local) letrasCache = { ligera: local.ligera, media: local.media || local.ligera, nombre: 'Arial Nova Light' };
      else {
        if (!window.CONSTANCIA_RECURSOS) await cargar(CDN.recursos);
        const f = window.CONSTANCIA_RECURSOS.fuentes;
        const b = s => { const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
        letrasCache = { ligera: b(f.Questrial), media: b(f['Montserrat-Medium']), nombre: 'Questrial (sustituta)' };
      }
    }
    return { L: await doc.embedFont(letrasCache.ligera, { subset: true }), M: await doc.embedFont(letrasCache.media, { subset: true }), nombre: letrasCache.nombre };
  }

  /* ======================= PDF ======================= */
  function partir(texto, font, tam, ancho) {
    const out = [];
    String(texto == null ? '' : texto).split('\n').forEach(par => {
      const palabras = par.split(/\s+/).filter(Boolean);
      if (!palabras.length) { out.push(''); return; }
      let linea = '';
      palabras.forEach(w => {
        const prueba = linea ? linea + ' ' + w : w;
        if (font.widthOfTextAtSize(prueba, tam) <= ancho) linea = prueba;
        else { if (linea) out.push(linea); linea = w; while (font.widthOfTextAtSize(linea, tam) > ancho && linea.length > 1) { let k = linea.length - 1; while (k > 1 && font.widthOfTextAtSize(linea.slice(0, k), tam) > ancho) k--; out.push(linea.slice(0, k)); linea = linea.slice(k); } }
      });
      out.push(linea);
    });
    return out;
  }

  /**
   * p: { folio, fecha (texto), tipoServicio, establecimiento, conceptos[], impuestos{}, condiciones[] }
   * Devuelve los bytes del PDF.
   */
  async function pdf(p) {
    await cargar(CDN.pdflib); await cargar(CDN.fontkit);
    const { PDFDocument, rgb } = window.PDFLib;
    const doc = await PDFDocument.create();
    doc.setTitle('Presupuesto ' + (p.folio || '') + ' · ' + (p.establecimiento || ''));
    doc.setAuthor('Grupo VIME'); doc.setCreator('Cerebro Grupo VIME');
    const { L, M, nombre } = await letras(doc);
    const b64 = s => { const bin = atob(s.split(',')[1]); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
    const logo = await doc.embedPng(b64(LOGOS_FIJOS.gv));

    const W = 612, H = 792, MG = 56.7, ANCHO = W - 2 * MG;
    const NEGRO = rgb(0, 0, 0), GRIS = rgb(0.35, 0.35, 0.35), GRIS_TABLA = rgb(0.749, 0.749, 0.749), LINEA = rgb(0.72, 0.72, 0.72);
    const NARANJA = rgb(0.93, 0.6, 0.27), AZUL = rgb(0.02, 0.39, 0.76);
    const COL = [118, 268]; COL.push(ANCHO - COL[0] - COL[1]);
    const PIE_Y = 40, FONDO = 84; // espacio reservado para el pie

    let page, y;
    const texto = (t, x, yy, f, tam, color) => page.drawText(String(t), { x, y: yy, font: f, size: tam, color: color || NEGRO });
    const derecha = (t, xd, yy, f, tam, color) => texto(t, xd - f.widthOfTextAtSize(String(t), tam), yy, f, tam, color);
    const centro = (t, xc, yy, f, tam, color) => texto(t, xc - f.widthOfTextAtSize(String(t), tam) / 2, yy, f, tam, color);

    function encabezadoTabla() {
      const h = 19;
      page.drawRectangle({ x: MG, y: y - h, width: ANCHO, height: h, color: GRIS_TABLA });
      let x = MG;
      ['SERVICIO', 'DESCRIPCIÓN', 'COSTO'].forEach((t, i) => { centro(t, x + COL[i] / 2, y - 13.5, L, 10.5); x += COL[i]; });
      y -= h;
    }
    function nuevaPagina(conTabla) {
      page = doc.addPage([W, H]);
      // Encabezado: logo a la izquierda; PRESUPUESTO y servicio a la derecha
      const lw = 168, lh = lw * logo.height / logo.width;
      page.drawImage(logo, { x: MG - 6, y: H - 30 - lh, width: lw, height: lh });
      const xd = W - MG; let yy = H - 64;
      derecha('PRESUPUESTO', xd, yy, L, 13);
      const anchoServ = 230;
      const lineas = partir('Servicio: ' + (p.tipoServicio || ''), L, 11, anchoServ);
      lineas.forEach((ln, i) => {
        yy -= 15;
        if (i === 0 && ln.indexOf('Servicio:') === 0) {
          const resto = ln.slice('Servicio:'.length);
          const wResto = L.widthOfTextAtSize(resto, 11), wEt = M.widthOfTextAtSize('Servicio:', 11);
          texto('Servicio:', xd - wResto - wEt, yy, M, 11);
          texto(resto, xd - wResto, yy, L, 11);
        } else derecha(ln, xd, yy, L, 11);
      });
      y = Math.min(yy, H - 30 - lh) - 20;
      // Pie
      page.drawLine({ start: { x: MG, y: PIE_Y + 36 }, end: { x: W - MG, y: PIE_Y + 36 }, thickness: 0.8, color: NARANJA });
      const partes = [['Tel. ' + PIE.telefono + '   e-mail:  ', NEGRO, false], [PIE.correo, AZUL, true], ['      ', NEGRO, false], [PIE.web, AZUL, true]];
      const total = partes.reduce((a, q) => a + L.widthOfTextAtSize(q[0], 9.5), 0);
      let x = W / 2 - total / 2;
      partes.forEach(([t, c, sub]) => {
        texto(t, x, PIE_Y, L, 9.5, c);
        const w = L.widthOfTextAtSize(t, 9.5);
        if (sub) page.drawLine({ start: { x, y: PIE_Y - 1.5 }, end: { x: x + w, y: PIE_Y - 1.5 }, thickness: 0.5, color: c });
        x += w;
      });
      if (conTabla) encabezadoTabla();
    }

    nuevaPagina(false);
    // Establecimiento, fecha y folio
    const wEst = M.widthOfTextAtSize('Establecimiento: ', 11);
    texto('Establecimiento: ', MG, y, M, 11);
    partir(p.establecimiento || '—', L, 11, ANCHO - wEst).forEach((ln, i) => { texto(ln, MG + wEst, y - i * 14, L, 11); if (i) y -= 14; });
    y -= 15;
    const meta = [p.fecha ? 'Fecha: ' + p.fecha : '', p.folio ? 'Folio: ' + p.folio : ''].filter(Boolean).join('      ');
    if (meta) { texto(meta, MG, y, L, 9, GRIS); }
    y -= 14;
    encabezadoTabla();

    // Conceptos
    (p.conceptos || []).forEach(c => {
      const servL = partir(c.servicio, L, 10.5, COL[0] - 12);
      const desc = [];
      String(c.descripcion || '').split('\n').forEach(linea => {
        const t = linea.trim(); if (!t) return;
        const vineta = /^[•▪\-]\s*/.test(t);
        const limpio = t.replace(/^[•▪\-]\s*/, '');
        partir(limpio, L, 9, COL[1] - 26).forEach((ln, k) => desc.push({ t: ln, vineta: vineta && k === 0 }));
      });
      const imp = importe(c);
      const costoL = [];
      if (c.costo === '' || c.costo == null) costoL.push({ t: 'Por definir', f: L, tam: 10.5 });
      else if (+c.costo === 0) costoL.push({ t: 'Sin costo.', f: L, tam: 10.5 });
      else costoL.push({ t: pesos(c.costo), f: L, tam: 10.5 });
      if (c.nota) partir(c.nota, L, 10, COL[2] - 12).forEach(t => costoL.push({ t, f: L, tam: 10 }));
      if (+c.cantidad > 1 && +c.costo > 0) { costoL.push({ t: '× ' + (+c.cantidad) + ' = ' + pesos(imp), f: L, tam: 9 }); }
      const altServ = servL.length * 14, altDesc = desc.length * 12.4, altCosto = costoL.reduce((a, q) => a + q.tam + 4, 0);
      const alto = Math.max(altServ, altDesc, altCosto) + 10;
      if (y - alto < FONDO) nuevaPagina(true);
      const arriba = y;
      // Servicio (centrado en vertical)
      let yy = arriba - (alto - altServ) / 2 - 11;
      servL.forEach(ln => { texto(ln, MG + 6, yy, L, 10.5); yy -= 14; });
      // Descripción
      yy = arriba - (alto - altDesc) / 2 - 9.5;
      desc.forEach(d => {
        const x = MG + COL[0] + 20;
        if (d.vineta) page.drawRectangle({ x: x - 13, y: yy + 2, width: 3.6, height: 3.6, color: NEGRO });
        texto(d.t, x, yy, L, 9); yy -= 12.4;
      });
      // Costo
      yy = arriba - (alto - altCosto) / 2 - 10.5;
      costoL.forEach(q => { centro(q.t, MG + COL[0] + COL[1] + COL[2] / 2, yy, q.f, q.tam); yy -= q.tam + 4; });
      y = arriba - alto;
      page.drawLine({ start: { x: MG, y }, end: { x: W - MG, y }, thickness: 0.6, color: LINEA });
    });

    // Totales
    const t = calcular(p), imp = p.impuestos || {};
    const filas = [];
    if (imp.iva || imp.retIva || imp.retIsr) {
      filas.push(['Subtotal', pesos(t.subtotal), false]);
      if (imp.iva) filas.push([ETIQUETAS_IMP.iva, pesos(t.iva), false]);
      if (imp.retIva) filas.push([ETIQUETAS_IMP.retIva, '- ' + pesos(t.retIva), false]);
      if (imp.retIsr) filas.push([ETIQUETAS_IMP.retIsr, '- ' + pesos(t.retIsr), false]);
    }
    if (p.mostrarTotal !== false) filas.push(['Total', pesos(t.total), true]);
    if (filas.length) {
      const alto = filas.length * 15 + 10;
      if (y - alto < FONDO) nuevaPagina(false);
      y -= 14;
      const xEt = MG + COL[0] + COL[1] - 6, xVal = W - MG - 6;
      filas.forEach(([e, v, fuerte]) => {
        if (fuerte) page.drawRectangle({ x: MG + COL[0] + 60, y: y - 4.5, width: ANCHO - COL[0] - 60, height: 15.5, color: rgb(0.93, 0.93, 0.93) });
        derecha(e, xEt, y, fuerte ? M : L, 10); derecha(v, xVal, y, fuerte ? M : L, 10);
        y -= 15;
      });
    }

    // Condiciones generales
    const conds = (p.condiciones || []).map(s => String(s).trim()).filter(Boolean);
    if (conds.length) {
      const lineas = conds.map(cn => partir(cn, L, 8, ANCHO - 22));
      const alto = 40 + lineas.reduce((a, l) => a + l.length * 10.5 + 3, 0);
      if (y - alto < FONDO) nuevaPagina(false); else y -= 24;
      texto('Condiciones Generales', MG, y, M, 10); texto(':', MG + M.widthOfTextAtSize('Condiciones Generales', 10), y, L, 10);
      y -= 15;
      lineas.forEach(ls => {
        page.drawRectangle({ x: MG + 4, y: y + 1.5, width: 3.4, height: 3.4, color: NEGRO });
        ls.forEach(ln => { texto(ln, MG + 18, y, L, 8); y -= 10.5; });
        y -= 3;
      });
    }
    return { bytes: await doc.save(), letra: nombre };
  }

  return { TIPOS_SERVICIO, CONDICIONES, CATALOGO, ETIQUETAS_IMP, TASAS, concepto, conceptosDe, importe, calcular, pesos, pdf, prepararLetra };
})();
if (typeof module !== 'undefined') module.exports = Presupuestos;
