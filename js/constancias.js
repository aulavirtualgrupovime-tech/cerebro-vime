/**
 * Cerebro Grupo VIME · Constancias de participación (PDF generado en el navegador).
 *
 * Diseño: plantilla «Constancia de participación» de Aula Virtual Grupo VIME (Canva), ya limpia:
 * solo logos de Aula Virtual y Grupo VIME, un capacitador con su firma digital, folio y QR de validación.
 * El fondo y las fuentes viven en js/constancia_recursos.js (se carga solo cuando se necesita).
 *
 * Constancias.generar({ curso, participantes, instructor, urlVerificacion }) → { lote, individuales[] }
 *   Para toda la empresa: participantes = [{ folio, leyenda: 'El personal brigadista de', empresa: 'Razón social' }]
 * Constancias.leerArchivo(file) / Constancias.deTexto(texto) → participantes
 * Constancias.validarCURP(curp) → '' si está bien, o el problema
 */
const Constancias = (() => {
  const CDN = {
    pdflib: 'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
    fontkit: 'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js',
    qr: 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js',
    jszip: 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js',
    xlsx: 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js',
    recursos: 'js/constancia_recursos.js'
  };
  const URL_VERIFICACION = 'https://aulavirtualgrupovime-tech.github.io/cerebro-vime/verifica.html?f=';

  const cargados = {};
  function cargar(url) {
    if (cargados[url]) return cargados[url];
    cargados[url] = new Promise((ok, mal) => {
      const s = document.createElement('script'); s.src = url; s.onload = ok;
      s.onerror = () => { delete cargados[url]; mal(new Error('No se pudo cargar un componente de las constancias. Revise su conexión a internet.')); };
      document.head.appendChild(s);
    });
    return cargados[url];
  }
  async function libs() {
    const g = globalThis;
    if (!g.PDFLib) await cargar(CDN.pdflib);
    if (!g.fontkit) await cargar(CDN.fontkit);
    if (!g.qrcode) await cargar(CDN.qr);
    if (!g.CONSTANCIA_RECURSOS) await cargar(CDN.recursos);
    return { PDFLib: g.PDFLib, fontkit: g.fontkit, qrcode: g.qrcode, R: g.CONSTANCIA_RECURSOS };
  }
  const b64 = s => { if (typeof atob === 'undefined') return Uint8Array.from(Buffer.from(s, 'base64')); const bin = atob(s); const u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

  /* Medidas en puntos desde el borde superior (igual que generar_participacion.py de la skill). */
  const CFG = {
    centroX: 297.75, ancho: 430,
    nombre: { fuente: 'GreatVibes', tam: 46, min: 22, color: '#F3AF33', base: 389 },
    empresa: { tam1: 30, base1: 356, tam2: 40, min2: 18, base2: 398 },
    curso: { fuente: 'GildaDisplay', tam: 22, min: 15, color: '#111111', base: 494.5, inter: 30, maxLineas: 2 },
    desc: { fuente: 'Questrial', tam: 13, min: 10.5, color: '#111111', inter: 19.5, sep: 24, limite: 640 },
    folio: { fuente: 'Questrial', tam: 10.5, color: '#FFFFFF', xDer: 519, base: 816.3 },
    qr: [526, 786.5, 568.5, 829],
    capacitador: {
      centroX: 262, firmaCaja: [172, 604, 352, 684], lineaY: 688, lineaAncho: 210,
      nombre: { fuente: 'Montserrat-Bold', tam: 11.5, color: '#0C3B6F', base: 703 },
      cargo: { fuente: 'Montserrat-Medium', tam: 8.5, color: '#F05A22', base: 716 },
      registros: { fuente: 'Questrial', tam: 8.5, color: '#333333', base: 729, inter: 11 }
    }
  };

  /* ---------- textos ---------- */
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const dd = n => String(n).padStart(2, '0');
  function fechasTexto(fi, ff) {
    if (!fi) return '';
    const [a1, m1, d1] = fi.slice(0, 10).split('-').map(Number); const [a2, m2, d2] = (ff || fi).slice(0, 10).split('-').map(Number);
    if (fi === (ff || fi)) return 'el día ' + dd(d1) + ' de ' + MESES[m1 - 1] + ' de ' + a1;
    if (a1 === a2 && m1 === m2) return 'los días ' + dd(d1) + ' al ' + dd(d2) + ' de ' + MESES[m1 - 1] + ' de ' + a1;
    if (a1 === a2) return 'del ' + dd(d1) + ' de ' + MESES[m1 - 1] + ' al ' + dd(d2) + ' de ' + MESES[m2 - 1] + ' de ' + a1;
    return 'del ' + dd(d1) + ' de ' + MESES[m1 - 1] + ' de ' + a1 + ' al ' + dd(d2) + ' de ' + MESES[m2 - 1] + ' de ' + a2;
  }
  const MINUS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'e', 'da', 'van', 'von']);
  function nombrePropio(s) { return String(s || '').toLowerCase().split(/\s+/).filter(Boolean).map((w, i) => i && MINUS.has(w) ? w : w[0].toUpperCase() + w.slice(1)).join(' '); }
  function nombreCompleto(p) { return nombrePropio([p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ')); }
  function descripcion(c) {
    if (c.descripcionConstancia) return c.descripcionConstancia;
    const mod = (c.modalidad || 'presencial').toLowerCase();
    const horas = String(c.horas || '').replace(/\.0+$/, '');
    return 'llevado a cabo en la modalidad ' + mod + ' ' + (c.fechasTexto || fechasTexto(c.fechaInicio, c.fechaFin)) +
      (c.sede && mod === 'presencial' ? ' en ' + c.sede : '') + ', con una duración total de ' + horas + ' horas.';
  }
  function partir(texto, font, tam, ancho) {
    const lineas = []; let actual = '';
    String(texto).split(/\s+/).forEach(w => {
      const prueba = actual ? actual + ' ' + w : w;
      if (font.widthOfTextAtSize(prueba, tam) <= ancho || !actual) actual = prueba; else { lineas.push(actual); actual = w; }
    });
    if (actual) lineas.push(actual);
    return lineas;
  }

  /* ---------- CURP ---------- */
  const CURP_RE = /^[A-Z][AEIOUX][A-Z]{2}\d{6}[HMX](AS|BC|BS|CC|CL|CM|CS|CH|DF|DG|GT|GR|HG|JC|MC|MN|MS|NT|NL|OC|PL|QT|QR|SP|SL|SR|TC|TS|TL|VZ|YN|ZS|NE)[B-DF-HJ-NP-TV-Z]{3}[A-Z\d]\d$/;
  const ALF = '0123456789ABCDEFGHIJKLMNÑOPQRSTUVWXYZ';
  function validarCURP(c) {
    c = String(c || '').trim().toUpperCase();
    if (!c) return '';
    if (!CURP_RE.test(c)) return 'CURP con formato inválido';
    const yy = +c.slice(4, 6), mm = +c.slice(6, 8), d = +c.slice(8, 10), anio = (/[A-Z]/.test(c[16]) ? 2000 : 1900) + yy;
    const f = new Date(anio, mm - 1, d); if (f.getMonth() !== mm - 1 || f.getDate() !== d) return 'CURP con fecha inválida';
    let s = 0; for (let i = 0; i < 17; i++) s += ALF.indexOf(c[i]) * (18 - i);
    if (String((10 - s % 10) % 10) !== c[17]) return 'CURP con dígito verificador incorrecto';
    return '';
  }

  /* ---------- lista de participantes ---------- */
  const ALIAS = {
    nombres: ['nombres', 'nombre', 'nombre(s)', 'nombre s'], apellidoPaterno: ['apellido_paterno', 'apellido paterno', 'paterno', 'primer apellido'],
    apellidoMaterno: ['apellido_materno', 'apellido materno', 'materno', 'segundo apellido'], curp: ['curp'],
    puesto: ['puesto', 'cargo'], ocupacion: ['ocupacion', 'ocupación', 'ocupacion_especifica'], empresa: ['empresa', 'empresa_razon_social', 'razon social', 'razón social'],
    nombreCompleto: ['nombre completo', 'participante', 'nombre_completo']
  };
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[_\s]+/g, ' ').trim();
  function deFilas(filas) {
    filas = filas.filter(f => f && f.some(x => String(x || '').trim()));
    if (!filas.length) return [];
    const cab = filas[0].map(norm); const mapa = {};
    Object.entries(ALIAS).forEach(([k, al]) => { const i = cab.findIndex(h => al.map(norm).includes(h)); if (i >= 0) mapa[k] = i; });
    let datos = filas.slice(1);
    if (!Object.keys(mapa).length) { // sin encabezados: Apellido paterno, Apellido materno, Nombre(s), CURP, Puesto, Empresa
      ['apellidoPaterno', 'apellidoMaterno', 'nombres', 'curp', 'puesto', 'empresa'].forEach((k, i) => { mapa[k] = i; }); datos = filas;
    }
    datos = datos.filter(f => !/^obligatorio/i.test(String(f[mapa.nombres] || f[mapa.apellidoPaterno] || '')));
    return datos.map(f => {
      const v = k => mapa[k] === undefined ? '' : String(f[mapa[k]] == null ? '' : f[mapa[k]]).trim();
      const p = { nombres: v('nombres'), apellidoPaterno: v('apellidoPaterno'), apellidoMaterno: v('apellidoMaterno'), curp: v('curp').toUpperCase(), puesto: v('puesto'), ocupacion: v('ocupacion'), empresa: v('empresa') };
      if (!p.nombres && v('nombreCompleto')) { const t = v('nombreCompleto').split(/\s+/); p.apellidoMaterno = t.length > 2 ? t.pop() : ''; p.apellidoPaterno = t.length > 1 ? t.pop() : ''; p.nombres = t.join(' '); }
      return p;
    }).filter(p => p.nombres || p.apellidoPaterno);
  }
  function deTexto(t) { return deFilas(String(t || '').split(/\r?\n/).map(l => l.split(l.includes('\t') ? '\t' : /[,;]/))); }
  async function leerArchivo(file) {
    if (/\.(csv|txt)$/i.test(file.name)) return deTexto(await file.text());
    if (!globalThis.XLSX) await cargar(CDN.xlsx);
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const hoja = wb.Sheets[wb.SheetNames.find(n => /particip/i.test(n)) || wb.SheetNames[0]];
    return deFilas(XLSX.utils.sheet_to_json(hoja, { header: 1, raw: false }));
  }

  /* ---------- PDF ---------- */
  function color(PDFLib, hex) { const n = parseInt(hex.slice(1), 16); return PDFLib.rgb((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); }
  function dibujarQR(PDFLib, qrcode, page, texto, caja, H) {
    const [x0, y0t, x1, y1t] = caja; const lado = x1 - x0;
    page.drawRectangle({ x: x0, y: H - y1t, width: lado, height: y1t - y0t, color: PDFLib.rgb(1, 1, 1) });
    const q = qrcode(0, 'M'); q.addData(texto); q.make();
    const n = q.getModuleCount(), m = lado * 0.06, t = (lado - 2 * m) / n, negro = PDFLib.rgb(0, 0, 0);
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) page.drawRectangle({ x: x0 + m + c * t, y: H - y1t + m + (n - 1 - r) * t, width: t + 0.05, height: t + 0.05, color: negro });
  }
  async function preparar(doc, L, firma) {
    doc.registerFontkit(L.fontkit);
    const F = {};
    for (const k of Object.keys(L.R.fuentes)) F[k] = await doc.embedFont(b64(L.R.fuentes[k]), { subset: true });
    const [fondo] = await doc.embedPdf(b64(L.R.base));
    let img = null;
    if (firma && firma.bytes) img = /png/i.test(firma.tipo || '') || (firma.bytes[0] === 0x89) ? await doc.embedPng(firma.bytes) : await doc.embedJpg(firma.bytes);
    return { F, fondo, img };
  }
  function pagina(doc, L, rec, curso, p, ins, url) {
    const { PDFLib } = L; const { F, fondo, img } = rec; const W = fondo.width, H = fondo.height; const Y = yt => H - yt;
    const page = doc.addPage([W, H]); page.drawPage(fondo, { x: 0, y: 0, width: W, height: H });
    const centrado = (txt, f, tam, yt, col, cx) => page.drawText(txt, { x: (cx || CFG.centroX) - f.widthOfTextAtSize(txt, tam) / 2, y: Y(yt), size: tam, font: f, color: color(PDFLib, col) });
    // nombre
    let n = CFG.nombre, tam;
    if (p.empresa) { // constancia para toda la empresa: leyenda + razón social en dos renglones
      const e = CFG.empresa; tam = e.tam1;
      while (F[n.fuente].widthOfTextAtSize(p.leyenda, tam) > CFG.ancho + 20 && tam > 18) tam -= 1;
      centrado(p.leyenda, F[n.fuente], tam, e.base1, n.color);
      tam = e.tam2;
      while (F[n.fuente].widthOfTextAtSize(p.empresa, tam) > CFG.ancho + 30 && tam > e.min2) tam -= 1;
      centrado(p.empresa, F[n.fuente], tam, e.base2, n.color);
    } else {
      const nombre = nombreCompleto(p); tam = n.tam;
      while (F[n.fuente].widthOfTextAtSize(nombre, tam) > CFG.ancho + 20 && tam > n.min) tam -= 1;
      centrado(nombre, F[n.fuente], tam, n.base, n.color);
    }
    // curso
    const k = CFG.curso; tam = k.tam; let lineas;
    while (true) { lineas = partir(String(curso.curso || '').toUpperCase(), F[k.fuente], tam, CFG.ancho); if (lineas.length <= k.maxLineas || tam <= k.min) break; tam -= 0.5; }
    let y = k.base; lineas.forEach(l => { centrado(l, F[k.fuente], tam, y, k.color); y += k.inter * tam / k.tam; });
    const ultimo = y - k.inter * tam / k.tam;
    // descripción
    const d = CFG.desc; tam = d.tam; let lns;
    while (true) { lns = partir(descripcion(curso), F[d.fuente], tam, CFG.ancho); if (ultimo + d.sep + (lns.length - 1) * d.inter * tam / d.tam <= d.limite || tam <= d.min) break; tam -= 0.5; }
    y = ultimo + d.sep; lns.forEach(l => { centrado(l, F[d.fuente], tam, y, d.color); y += d.inter * tam / d.tam; });
    // folio y QR
    const fo = CFG.folio, tf = 'FOLIO: ' + p.folio;
    page.drawText(tf, { x: fo.xDer - F[fo.fuente].widthOfTextAtSize(tf, fo.tam), y: Y(fo.base), size: fo.tam, font: F[fo.fuente], color: color(PDFLib, fo.color) });
    dibujarQR(PDFLib, L.qrcode, page, url, CFG.qr, H);
    // capacitador
    const c = CFG.capacitador, cx = c.centroX;
    if (img) {
      const [x0, y0, x1, y1] = c.firmaCaja; const e = Math.min((x1 - x0) / img.width, (y1 - y0) / img.height);
      page.drawImage(img, { x: cx - img.width * e / 2, y: Y(y1), width: img.width * e, height: img.height * e });
    }
    page.drawLine({ start: { x: cx - c.lineaAncho / 2, y: Y(c.lineaY) }, end: { x: cx + c.lineaAncho / 2, y: Y(c.lineaY) }, thickness: 0.8, color: color(PDFLib, '#1F2A44') });
    const nom = ((ins.titulo || '') + ' ' + (ins.nombre || '')).trim(); tam = c.nombre.tam;
    while (F[c.nombre.fuente].widthOfTextAtSize(nom, tam) > c.lineaAncho + 30 && tam > 8) tam -= 0.5;
    centrado(nom, F[c.nombre.fuente], tam, c.nombre.base, c.nombre.color, cx);
    centrado((ins.cargo || 'Capacitador').toUpperCase().split('').join(' '), F[c.cargo.fuente], c.cargo.tam, c.cargo.base, c.cargo.color, cx);
    y = c.registros.base;
    (ins.registros || []).filter(Boolean).slice(0, 2).forEach(r => {
      let t = c.registros.tam; while (F[c.registros.fuente].widthOfTextAtSize(r, t) > c.lineaAncho + 40 && t > 6.5) t -= 0.25;
      centrado(r, F[c.registros.fuente], t, y, c.registros.color, cx); y += c.registros.inter;
    });
  }

  /** participantes: con .folio asignado. instructor: { nombre, titulo, cargo, registros[], firma: { bytes, tipo } } */
  async function generar({ curso, participantes, instructor, urlVerificacion }) {
    const L = await libs(); const { PDFLib } = L;
    const base = urlVerificacion || URL_VERIFICACION;
    const urlDe = f => base + encodeURIComponent(f);
    const meta = (doc, t) => { doc.setTitle(t); doc.setAuthor('Aula Virtual Grupo VIME'); doc.setCreator('Cerebro Grupo VIME'); doc.setProducer('Cerebro Grupo VIME'); };
    const lote = await PDFLib.PDFDocument.create(); const recLote = await preparar(lote, L, instructor.firma);
    meta(lote, 'Constancias de participación · ' + curso.curso);
    const individuales = [];
    for (const p of participantes) {
      pagina(lote, L, recLote, curso, p, instructor, urlDe(p.folio));
      const doc = await PDFLib.PDFDocument.create(); const rec = await preparar(doc, L, instructor.firma);
      meta(doc, 'Constancia de participación ' + p.folio + ' · ' + (p.empresa ? p.leyenda + ' ' + p.empresa : nombreCompleto(p)));
      pagina(doc, L, rec, curso, p, instructor, urlDe(p.folio));
      const archivo = (p.folio + '_' + (p.empresa ? p.empresa.split(',')[0] : [p.apellidoPaterno, String(p.nombres || '').split(' ')[0]].join('-'))).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w.\-]+/g, '-').toUpperCase().replace(/^AV\./, 'AV.') + '.pdf';
      individuales.push({ folio: p.folio, archivo, bytes: await doc.save() });
    }
    return { lote: await lote.save(), individuales };
  }

  async function zip(resultado, nombreLote) {
    if (!globalThis.JSZip) await cargar(CDN.jszip);
    const z = new JSZip();
    z.file(nombreLote, resultado.lote);
    const c = z.folder('Individuales'); resultado.individuales.forEach(i => c.file(i.archivo, i.bytes));
    return z.generateAsync({ type: 'blob' });
  }

  return { generar, zip, leerArchivo, deTexto, validarCURP, nombreCompleto, fechasTexto, URL_VERIFICACION, CFG };
})();
if (typeof module !== 'undefined') module.exports = Constancias;
