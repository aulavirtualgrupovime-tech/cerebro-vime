/**
 * Cerebro Grupo VIME · DC-3 «Constancia de competencias o de habilidades laborales» (PDF en el navegador).
 * Formato: el que usa Grupo VIME (p. ej. «DC3 2025. Formación de Brigadas», Constituyentes):
 * logotipo del asesor y del cliente, barras negras por sección, CURP y RFC en casillas, periodo en casillas,
 * firma del instructor y nombres del patrón o representante legal y del representante de los trabajadores.
 * Sin QR de validación (la DC-3 es un formato oficial de la STPS).
 *
 * Dc3.generar({ curso, participantes, instructor, empresa, logos }) → { lote, individuales[] }
 *   curso: { curso, horas, fechaInicio, fechaFin, areaTematica }
 *   participantes: [{ nombres, apellidoPaterno, apellidoMaterno, curp, ocupacion, puesto, empresa? }]
 *   instructor: { nombre, firma: { bytes, tipo } }
 *   empresa: { razonSocial, rfc, representanteLegal, representanteTrabajadores }  (vacío = queda en blanco)
 *   logos: { izq: { bytes, tipo } | null, der: { bytes, tipo } | null }
 */
const Dc3 = (() => {
  const CDN_PDFLIB = 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js';
  let carga = null;
  function cargarLib() {
    if (window.PDFLib) return Promise.resolve();
    if (!carga) carga = new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = CDN_PDFLIB; s.onload = ok;
      s.onerror = () => { carga = null; mal(new Error('No se pudo cargar el generador de PDF. Revise su conexión a internet.')); };
      document.head.appendChild(s);
    });
    return carga;
  }

  /** Catálogo de áreas temáticas de los cursos (reverso de la DC-3). */
  const AREAS = [
    ['1000', 'Producción general'], ['2000', 'Servicios'], ['3000', 'Administración, contabilidad y economía'],
    ['4000', 'Comercialización'], ['5000', 'Mantenimiento y reparación'], ['6000', 'Seguridad'],
    ['7000', 'Desarrollo personal y familiar'], ['8000', 'Uso de tecnologías de la información y comunicación'], ['9000', 'Participación social']
  ];

  /** Catálogo de áreas y subáreas ocupacionales (reverso de la DC-3). */
  const OCUPACIONES = [
    ['01', 'Cultivo, crianza y aprovechamiento', [['01.1', 'Agricultura y silvicultura'], ['01.2', 'Ganadería'], ['01.3', 'Pesca y acuacultura']]],
    ['02', 'Extracción y suministro', [['02.1', 'Exploración'], ['02.2', 'Extracción'], ['02.3', 'Refinación y beneficio'], ['02.4', 'Provisión de energía'], ['02.5', 'Provisión de agua']]],
    ['03', 'Construcción', [['03.1', 'Planeación y dirección de obras'], ['03.2', 'Edificación y urbanización'], ['03.3', 'Acabado'], ['03.4', 'Instalación y mantenimiento']]],
    ['04', 'Tecnología', [['04.1', 'Mecánica'], ['04.2', 'Electricidad'], ['04.3', 'Electrónica'], ['04.4', 'Informática'], ['04.5', 'Telecomunicaciones'], ['04.6', 'Procesos industriales']]],
    ['05', 'Procesamiento y fabricación', [['05.1', 'Minerales no metálicos'], ['05.2', 'Metales'], ['05.3', 'Alimentos y bebidas'], ['05.4', 'Textiles y prendas de vestir'], ['05.5', 'Materia orgánica'], ['05.6', 'Productos químicos'], ['05.7', 'Productos metálicos y de hule y plástico'], ['05.8', 'Productos eléctricos y electrónicos'], ['05.9', 'Productos impresos']]],
    ['06', 'Transporte', [['06.1', 'Ferroviario'], ['06.2', 'Autotransporte'], ['06.3', 'Aéreo'], ['06.4', 'Marítimo y fluvial'], ['06.5', 'Servicios de apoyo']]],
    ['07', 'Provisión de bienes y servicios', [['07.1', 'Comercio'], ['07.2', 'Alimentación y hospedaje'], ['07.3', 'Turismo'], ['07.4', 'Deporte y esparcimiento'], ['07.5', 'Servicios personales'], ['07.6', 'Reparación de artículos de uso doméstico y personal'], ['07.7', 'Limpieza'], ['07.8', 'Servicio postal y mensajería']]],
    ['08', 'Gestión y soporte administrativo', [['08.1', 'Bolsa, banca y seguros'], ['08.2', 'Administración'], ['08.3', 'Servicios legales']]],
    ['09', 'Salud y protección social', [['09.1', 'Servicios médicos'], ['09.2', 'Inspección sanitaria y del medio ambiente'], ['09.3', 'Seguridad social'], ['09.4', 'Protección de bienes y/o personas']]],
    ['10', 'Comunicación', [['10.1', 'Publicación'], ['10.2', 'Radio, cine, televisión y teatro'], ['10.3', 'Interpretación artística'], ['10.4', 'Traducción e interpretación lingüística'], ['10.5', 'Publicidad, propaganda y relaciones públicas']]],
    ['11', 'Desarrollo y extensión del conocimiento', [['11.1', 'Investigación'], ['11.2', 'Enseñanza'], ['11.3', 'Difusión cultural']]]
  ];
  /** «08.2» → «08.2 Administración». Si es texto libre de listas anteriores, se deja igual. */
  function textoOcupacion(v) {
    const c = String(v || '').trim(); if (!c) return '';
    for (const [, , subs] of OCUPACIONES) { const s = subs.find(x => x[0] === c); if (s) return s[0] + ' ' + s[1]; }
    return c;
  }
  /** Opciones agrupadas por área para los selectores del formulario. */
  function opcionesOcupacion(primera) {
    return (primera ? [primera] : []).concat(OCUPACIONES.map(([c, n, subs]) => ({ grupo: c + ' · ' + n, opciones: subs.map(([sc, sn]) => ({ v: sc, t: sc + ' ' + sn })) })));
  }

  const may = s => String(s || '').trim().toLocaleUpperCase('es-MX');
  const nombreDC3 = p => may([p.apellidoPaterno, p.apellidoMaterno, p.nombres].filter(Boolean).join(' '));

  async function embedImg(doc, img) {
    if (!img || !img.bytes) return null;
    const t = String(img.tipo || '');
    try { return /png/.test(t) ? await doc.embedPng(img.bytes) : /jpe?g/.test(t) ? await doc.embedJpg(img.bytes) : await doc.embedPng(img.bytes); }
    catch (e) { try { return await doc.embedJpg(img.bytes); } catch (x) { return null; } }
  }

  async function recursos(doc, instructor, logos) {
    const { StandardFonts } = window.PDFLib;
    return {
      H: await doc.embedFont(StandardFonts.Helvetica), HB: await doc.embedFont(StandardFonts.HelveticaBold),
      C: await doc.embedFont(StandardFonts.CourierBold),
      firma: await embedImg(doc, instructor.firma), izq: await embedImg(doc, logos && logos.izq), der: await embedImg(doc, logos && logos.der)
    };
  }

  /** Dibuja una DC-3 en una página nueva de «doc». */
  function pagina(doc, R, curso, p, instructor, empresa) {
    const { rgb } = window.PDFLib;
    const W = 612, H = 792, X0 = 20, X1 = 592, AN = X1 - X0;
    const NEGRO = rgb(0, 0, 0), BLANCO = rgb(1, 1, 1), AZUL = rgb(0.02, 0.32, 0.75);
    const pg = doc.addPage([W, H]);
    const Y = t => H - t; // coordenadas desde arriba
    const txt = (s, x, top, f, tam, color) => pg.drawText(String(s), { x, y: Y(top), font: f, size: tam, color: color || NEGRO });
    const ajusta = (s, f, tam, ancho) => { let t = tam; while (t > 5 && f.widthOfTextAtSize(String(s), t) > ancho) t -= 0.25; return t; };
    const centro = (s, xc, top, f, tam, color) => pg.drawText(String(s), { x: xc - f.widthOfTextAtSize(String(s), tam) / 2, y: Y(top), font: f, size: tam, color: color || NEGRO });
    const caja = (x, top, w, h, grosor) => pg.drawRectangle({ x, y: Y(top + h), width: w, height: h, borderColor: NEGRO, borderWidth: grosor || 0.6 });
    const linea = (x1, t1, x2, t2, g) => pg.drawLine({ start: { x: x1, y: Y(t1) }, end: { x: x2, y: Y(t2) }, thickness: g || 0.6, color: NEGRO });
    const barra = (top, t) => { pg.drawRectangle({ x: X0, y: Y(top + 17), width: AN, height: 17, color: NEGRO }); centro(t, W / 2, top + 12.3, R.HB, 10, BLANCO); };
    const etiqueta = (s, x, top, sup) => { txt(s, x, top, R.H, 7.6); if (sup) txt(sup, x + R.H.widthOfTextAtSize(s, 7.6) + 2, top - 3, R.H, 5); };
    const valor = (s, x, top, ancho) => txt(s, x, top, R.C, ajusta(s, R.C, 8.6, ancho), NEGRO);
    const casillas = (texto, x, top, n, w, h) => {
      const t = String(texto || '');
      for (let i = 0; i < n; i++) {
        const cx = x + i * w;
        linea(cx, top, cx, top + h, 0.5);
        if (t[i]) centro(t[i], cx + w / 2, top + h - 4, R.C, 8.6);
      }
      linea(x + n * w, top, x + n * w, top + h, 0.5);
    };

    // Logotipos y título
    const logo = (img, x, alinear) => {
      if (!img) return;
      const maxW = 150, maxH = 62, k = Math.min(maxW / img.width, maxH / img.height);
      const w = img.width * k, h = img.height * k;
      pg.drawImage(img, { x: alinear === 'der' ? x - w : x, y: Y(14 + h), width: w, height: h });
    };
    logo(R.izq, X0 + 30, 'izq'); logo(R.der, X1 - 10, 'der');
    centro('FORMATO DC-3', W / 2, 92, R.HB, 11.5);
    centro('CONSTANCIA DE COMPETENCIAS O DE HABILIDADES LABORALES', W / 2, 106, R.HB, 11.5);

    // DATOS DEL TRABAJADOR
    let t = 112;
    barra(t, 'DATOS DEL TRABAJADOR'); t += 17;
    caja(X0, t, AN, 28); etiqueta('Nombre (Anotar apellido paterno, apellido materno y nombre (s))', X0 + 3, t + 8.5);
    valor(nombreDC3(p), X0 + 4, t + 22, AN - 10); t += 28;
    const xOc = X0 + 330;
    caja(X0, t, AN, 30); linea(xOc, t, xOc, t + 30);
    etiqueta('Clave Única de Registro de Población', X0 + 3, t + 8.5);
    casillas(may(p.curp), X0, t + 12, 18, 17.6, 18);
    etiqueta('Ocupación específica (Catálogo Nacional de Ocupaciones)', xOc + 3, t + 8.5, '1/');
    valor(textoOcupacion(p.ocupacion), xOc + 4, t + 24, X1 - xOc - 10); t += 30;
    caja(X0, t, AN, 26); etiqueta('Puesto*', X0 + 3, t + 8.5); valor(may(p.puesto), X0 + 4, t + 21, AN - 10); t += 26;

    // DATOS DE LA EMPRESA
    t += 9; barra(t, 'DATOS DE LA EMPRESA'); t += 17;
    caja(X0, t, AN, 30); etiqueta('Nombre o razón social (En caso de persona física, anotar apellido paterno, apellido materno y nombre(s))', X0 + 3, t + 8.5);
    valor(may(p.empresa || empresa.razonSocial), X0 + 4, t + 23, AN - 10); t += 30;
    caja(X0, t, AN, 30); etiqueta('Registro Federal de Contribuyentes con homoclave (SHCP)', X0 + 3, t + 8.5);
    casillas(may(empresa.rfc), X0, t + 12, 13, 17.6, 18); t += 30;

    // DATOS DEL PROGRAMA
    t += 9; barra(t, 'DATOS DEL PROGRAMA DE CAPACITACIÓN, ADIESTRAMIENTO Y PRODUCTIVIDAD'); t += 17;
    caja(X0, t, AN, 26); etiqueta('Nombre del curso', X0 + 3, t + 8.5); valor(may(curso.curso), X0 + 4, t + 21, AN - 10); t += 26;
    caja(X0, t, AN, 30);
    etiqueta('Duración en horas', X0 + 3, t + 8.5); valor(String(curso.horas || '').replace(/\.0+$/, '') + ' HORAS', X0 + 4, t + 21, 150);
    const xP = X0 + 168; linea(xP, t, xP, t + 30);
    txt('Periodo de', xP + 4, t + 11, R.H, 7.6); txt('ejecución:', xP + 4, t + 20, R.H, 7.6);
    const fi = String(curso.fechaInicio || '').split('-'), ff = String(curso.fechaFin || curso.fechaInicio || '').split('-');
    const cw = 16.5, bloque = (f, x) => {
      centro('Año', x + cw * 2, t + 8, R.H, 7.6); centro('Mes', x + cw * 5, t + 8, R.H, 7.6); centro('Día', x + cw * 7, t + 8, R.H, 7.6);
      casillas((f[0] || '') + (f[1] || '') + (f[2] || ''), x, t + 11, 8, cw, 17);
    };
    txt('De', xP + 60, t + 26, R.H, 7.6); bloque(fi, xP + 74);
    txt('a', xP + 74 + 8 * cw + 8, t + 26, R.H, 7.6); bloque(ff, xP + 74 + 8 * cw + 18);
    t += 30;
    caja(X0, t, AN, 28); etiqueta('Área temática del curso', X0 + 3, t + 8.5, '2/'); valor(curso.areaTematica || '', X0 + 4, t + 22, AN - 10); t += 28;
    caja(X0, t, AN, 26); etiqueta('Nombre del agente capacitador o STPS', X0 + 3, t + 8.5, '3/'); valor(may(instructor.nombre), X0 + 4, t + 21, AN - 10); t += 26;

    // Protesta y firmas
    t += 12;
    const hF = 150;
    pg.drawRectangle({ x: X0, y: Y(t + hF), width: AN, height: hF, borderColor: NEGRO, borderWidth: 0.6 });
    centro('Los datos se asientan en esta constancia bajo protesta de decir verdad, apercibidos de la responsabilidad en que incurre todo', W / 2, t + 16, R.HB, 7.8);
    centro('aquel que no se conduce con verdad.', W / 2, t + 28, R.HB, 7.8);
    const colW = AN / 3, base = t + 118;
    const firmaCol = (i, titulo, sup, nombre) => {
      const xc = X0 + colW * i + colW / 2;
      centro(titulo, xc - (sup ? 4 : 0), t + 52, R.H, 7.8);
      if (sup) txt(sup, xc - 4 + R.H.widthOfTextAtSize(titulo, 7.8) / 2 + 2, t + 49, R.H, 5);
      linea(xc - colW / 2 + 14, base, xc + colW / 2 - 14, base, 0.7);
      if (nombre) centro(nombre, xc, base - 3, R.H, ajusta(nombre, R.H, 8, colW - 30));
      centro('Nombre y firma', xc, base + 11, R.H, 7.8);
    };
    if (R.firma) {
      const k = Math.min(110 / R.firma.width, 52 / R.firma.height);
      const w = R.firma.width * k, h = R.firma.height * k;
      pg.drawImage(R.firma, { x: X0 + colW / 2 - w / 2, y: Y(base - 4), width: w, height: h });
    }
    firmaCol(0, 'Instructor o tutor', '', may(instructor.nombre));
    firmaCol(1, 'Patrón o representante legal', '4/', may(empresa.representanteLegal));
    firmaCol(2, 'Representante de los trabajadores', '5/', may(empresa.representanteTrabajadores));

    // Instrucciones
    t += hF + 14;
    txt('INSTRUCCIONES', X0 + 50, t, R.HB, 8); t += 10;
    const ins = [
      ['-', 'Llenar a máquina o con letra de molde.'],
      ['-', 'Deberá entregarse al trabajador dentro de los veinte días hábiles siguientes al término del curso de capacitación aprobado.'],
      ['1/', 'Las áreas y subáreas ocupacionales del Catálogo Nacional de Ocupaciones se encuentran disponibles en el reverso de este formato y en la página www.stps.gob.mx'],
      ['2/', 'Las áreas temáticas de los cursos se encuentran disponibles en el reverso de este formato y en la página www.stps.gob.mx'],
      ['3/', 'Cursos impartidos por el área competente de la Secretaría del Trabajo y Previsión Social.'],
      ['4/', 'Para empresas con menos de 51 trabajadores. Para empresas con más de 50 trabajadores firmaría el representante del patrón ante la Comisión mixta de capacitación, adiestramiento y productividad.'],
      ['5/', 'Solo para empresas con más de 50 trabajadores.'],
      ['*', 'Dato no obligatorio.']
    ];
    const anchoIns = AN - 40;
    ins.forEach(([m, s]) => {
      txt(m, X0 + 8, t, R.H, 6.8);
      const palabras = s.split(' '); let l = '';
      const lineas = [];
      palabras.forEach(w => { const pr = l ? l + ' ' + w : w; if (R.H.widthOfTextAtSize(pr, 6.8) > anchoIns) { lineas.push(l); l = w; } else l = pr; });
      lineas.push(l);
      lineas.forEach((ln, k) => {
        const x = X0 + 22 + (k ? 18 : 0);
        // www.stps.gob.mx en azul, como en el formato
        const i = ln.indexOf('www.stps.gob.mx');
        if (i >= 0) { txt(ln.slice(0, i), x, t, R.H, 6.8); const x2 = x + R.H.widthOfTextAtSize(ln.slice(0, i), 6.8); txt('www.stps.gob.mx', x2, t, R.H, 6.8, AZUL); pg.drawLine({ start: { x: x2, y: Y(t + 1) }, end: { x: x2 + R.H.widthOfTextAtSize('www.stps.gob.mx', 6.8), y: Y(t + 1) }, thickness: 0.4, color: AZUL }); }
        else txt(ln, x, t, R.H, 6.8);
        t += 8.4;
      });
    });
  }

  async function generar({ curso, participantes, instructor, empresa, logos }) {
    await cargarLib();
    const { PDFDocument } = window.PDFLib;
    const meta = (doc, t) => { doc.setTitle(t); doc.setAuthor('Grupo VIME'); doc.setCreator('Cerebro Grupo VIME'); doc.setProducer('Cerebro Grupo VIME'); };
    const lote = await PDFDocument.create(); const RL = await recursos(lote, instructor, logos);
    meta(lote, 'DC-3 · ' + curso.curso);
    const individuales = [];
    for (const p of participantes) {
      pagina(lote, RL, curso, p, instructor, empresa);
      const doc = await PDFDocument.create(); const R = await recursos(doc, instructor, logos);
      meta(doc, 'DC-3 · ' + nombreDC3(p) + ' · ' + curso.curso);
      pagina(doc, R, curso, p, instructor, empresa);
      const archivo = ('DC3_' + [p.apellidoPaterno, p.apellidoMaterno, String(p.nombres || '').split(' ')[0]].filter(Boolean).join('-')).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '-').toUpperCase() + '.pdf';
      individuales.push({ archivo, bytes: await doc.save() });
    }
    return { lote: await lote.save(), individuales };
  }

  return { generar, AREAS, OCUPACIONES, textoOcupacion, opcionesOcupacion, nombreDC3 };
})();
if (typeof module !== 'undefined') module.exports = Dc3;
