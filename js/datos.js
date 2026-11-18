/**
 * Cerebro Grupo VIME · Acceso a datos.
 * Modo prueba: localStorage con datos ficticios.
 * Modo real: servidor de Google Apps Script (cada usuario entra con su clave personal;
 * el servidor nunca entrega los pagos a quien no sea la Directora).
 */
const COLECCIONES = ['clientes', 'inmuebles', 'servicios', 'eventos', 'pendientes', 'documentos', 'notas', 'responsables', 'ajustes', 'cursos', 'constancias', 'presupuestos'];
const COL_PRIVADA = 'cobros';

const Datos = (() => {
  const MODO_PRUEBA = !CONFIG.SERVIDOR_URL;
  const LLAVE_DEMO = 'cerebro_vime_demo_v8';
  const LLAVE_SESION = 'cerebro_vime_sesion';
  let db = null;
  let sesion = null;

  function nuevoId(pref) { return (pref || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function ahora() { return new Date().toISOString(); }

  /* ---------- sesión ---------- */
  function leerSesion() {
    try { sesion = JSON.parse(localStorage.getItem(LLAVE_SESION) || 'null'); } catch (e) { sesion = null; }
    if (MODO_PRUEBA && !sesion) sesion = { usuario: 'directora' };
    return sesion;
  }
  function guardarSesion(s) { sesion = s; try { localStorage.setItem(LLAVE_SESION, JSON.stringify(s)); } catch (e) { } }
  function cerrarSesion() { sesion = null; try { localStorage.removeItem(LLAVE_SESION); } catch (e) { } }
  function usuario() { return USUARIOS.find(u => sesion && u.id === sesion.usuario) || null; }
  function esDirectora() { const u = usuario(); return !!(u && u.pagos); }

  /* ---------- servidor ---------- */
  async function llamar(accion, extra) {
    const cuerpo = Object.assign({ accion, usuario: sesion && sesion.usuario, clave: sesion && sesion.clave }, extra || {});
    // Google a veces tarda o responde con una página de error momentánea: se reintenta hasta 2 veces
    let j = null, ultimo = null;
    for (let intento = 0; intento < 3 && !j; intento++) {
      try {
        if (intento) await new Promise(r => setTimeout(r, 1500 * intento));
        // Tiempo límite por intento: si Google deja la petición colgada, se corta y se reintenta
        const ctl = new AbortController();
        const limite = setTimeout(() => ctl.abort(), (accion === 'subir' || accion === 'archivo') ? 120000 : 25000);
        let texto;
        try {
          const r = await fetch(CONFIG.SERVIDOR_URL, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(cuerpo), signal: ctl.signal });
          texto = await r.text();
        } finally { clearTimeout(limite); }
        j = JSON.parse(texto);
      } catch (e) { ultimo = e; }
    }
    if (!j) throw new Error('No hay conexión con el servidor de Google. Revise su internet e intente de nuevo.' + (ultimo ? '' : ''));
    if (!j.ok) { const e = new Error(j.mensaje || 'Error del servidor'); e.codigo = j.error; throw e; }
    return j;
  }

  /* ---------- prueba ---------- */
  function guardarDemo() { try { localStorage.setItem(LLAVE_DEMO, JSON.stringify(db)); } catch (e) { console.warn(e); } }
  function cargarDemo() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(LLAVE_DEMO) || 'null'); } catch (e) { }
    if (!d) { d = crearDatosDemo(); }
    COLECCIONES.concat(COL_PRIVADA).forEach(c => { d[c] = d[c] || []; });
    db = d; guardarDemo();
  }

  /** Vista de los datos según quién entró (en prueba se simula el bloqueo de pagos). */
  function vista() {
    const v = {};
    COLECCIONES.forEach(c => { v[c] = db[c] || []; });
    v.cobros = esDirectora() ? (db.cobros || []) : null;
    return v;
  }

  async function cargar() {
    if (MODO_PRUEBA) { cargarDemo(); return vista(); }
    const j = await llamar('cargar');
    db = j.datos;
    COLECCIONES.forEach(c => { db[c] = db[c] || []; });
    db.cobros = j.datos.cobros || null;
    return vista();
  }

  async function guardar(col, obj) {
    obj = Object.assign({}, obj);
    if (!obj.id) { obj.id = nuevoId(col.slice(0, 3)); obj.creado = ahora(); obj.creadoPor = usuario() ? usuario().nombre : ''; }
    obj.actualizado = ahora();
    obj.actualizadoPor = usuario() ? usuario().nombre : '';
    if (MODO_PRUEBA) {
      if (col === COL_PRIVADA && !esDirectora()) throw new Error('Sin permiso.');
      const lista = db[col]; const i = lista.findIndex(x => x.id === obj.id);
      if (i >= 0) lista[i] = obj; else lista.push(obj);
      guardarDemo();
      return obj;
    }
    const j = await llamar('guardar', { coleccion: col, registro: obj });
    const g = j.registro;
    const lista = db[col] || (db[col] = []); const i = lista.findIndex(x => x.id === g.id);
    if (i >= 0) lista[i] = g; else lista.push(g);
    return g;
  }

  async function borrar(col, id) {
    if (MODO_PRUEBA) {
      db[col] = db[col].filter(x => x.id !== id); guardarDemo(); return;
    }
    await llamar('borrar', { coleccion: col, id });
    db[col] = (db[col] || []).filter(x => x.id !== id);
  }

  /** Sube un PDF o foto. Devuelve { nombre, url }. */
  async function subirArchivo(archivo, ruta) {
    if (archivo.size > 20 * 1024 * 1024) throw new Error('El archivo pesa más de 20 MB. Súbalo a Drive y pegue el enlace.');
    if (MODO_PRUEBA) {
      // En la prueba los archivos chicos se guardan dentro del navegador para que sigan disponibles
      if (archivo.size < 1500000) {
        const url = await new Promise((ok, mal) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = mal; fr.readAsDataURL(archivo); });
        return { nombre: archivo.name, url, prueba: true };
      }
      return { nombre: archivo.name, url: URL.createObjectURL(archivo), prueba: true };
    }
    const base64 = await new Promise((ok, mal) => {
      const fr = new FileReader();
      fr.onload = () => ok(String(fr.result).split(',')[1]);
      fr.onerror = mal; fr.readAsDataURL(archivo);
    });
    const tipo = archivo.type || (/\.pdf$/i.test(archivo.name) ? 'application/pdf' : /\.docx$/i.test(archivo.name) ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : /\.doc$/i.test(archivo.name) ? 'application/msword' : /\.(jpe?g)$/i.test(archivo.name) ? 'image/jpeg' : /\.png$/i.test(archivo.name) ? 'image/png' : '');
    const j = await llamar('subir', { nombre: archivo.name, tipo, base64, ruta });
    return { nombre: archivo.name, url: j.url, driveId: j.id };
  }

  /** Obtiene el contenido de un documento guardado (para verlo en pantalla). Devuelve un Blob o null. */
  async function obtenerArchivo(doc) {
    if (/^(data|blob):/.test(doc.url || '')) return await (await fetch(doc.url)).blob();
    if (!MODO_PRUEBA && doc.driveId) {
      const j = await llamar('archivo', { id: doc.driveId });
      const bin = atob(j.base64); const bytes = new Uint8Array(bin.length);
      for (let k = 0; k < bin.length; k++) bytes[k] = bin.charCodeAt(k);
      return new Blob([bytes], { type: j.tipo || '' });
    }
    return null;
  }

  async function entrar(usuarioId, clave) {
    if (MODO_PRUEBA) { guardarSesion({ usuario: usuarioId }); return; }
    sesion = { usuario: usuarioId, clave };
    await llamar('ping');
    guardarSesion(sesion);
  }

  /** Asigna folios a los participantes sin folio y registra las constancias (servidor: con candado, sin repetir). */
  async function emitir(curso, instructorNombre) {
    let r;
    if (MODO_PRUEBA) {
      const reg = (db.ajustes || []).find(x => x.id === 'folios') || { id: 'folios', contadores: {} };
      const ahora = new Date().toISOString();
      r = asignarFolios(JSON.parse(JSON.stringify(curso)), reg.contadores || (reg.contadores = {}), (db.constancias || []).map(x => x.folio), instructorNombre, usuario() ? usuario().nombre : '', ahora);
      r.curso.actualizado = ahora; r.folios = reg;
    } else {
      r = await llamar('emitir', { curso, instructor: instructorNombre });
    }
    const poner = (col, o) => { const l = db[col] || (db[col] = []); const i = l.findIndex(x => x.id === o.id); if (i >= 0) l[i] = o; else l.push(o); };
    poner('cursos', r.curso); poner('ajustes', r.folios); r.nuevos.forEach(x => poner('constancias', x));
    if (MODO_PRUEBA) guardarDemo();
    return r;
  }

  function reiniciarPrueba() { localStorage.removeItem(LLAVE_DEMO); }

  return { MODO_PRUEBA, vista, leerSesion, cerrarSesion, usuario, esDirectora, cargar, guardar, borrar, subirArchivo, obtenerArchivo, emitir, entrar, reiniciarPrueba, nuevoId };
})();
