/* Cerebro Grupo VIME · Interfaz */
(() => {
  let DB = null;
  const $ = s => document.querySelector(s);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const estado = { ejercicio: +hoyISO().slice(0, 4), calMes: hoyISO().slice(0, 7), pestanaServicio: 'etapas', mesPagos: hoyISO().slice(0, 7), filtroClientes: '' };

  /* ======================= Utilidades de datos ======================= */
  const porId = (col, id) => (DB[col] || []).find(x => x.id === id);
  const cliente = id => porId('clientes', id) || {};
  const inmueble = id => porId('inmuebles', id) || {};
  const servicio = id => porId('servicios', id);
  const nombreCli = c => c.nombreComercial || c.razonSocial || '(sin nombre)';
  const cadena = s => { const i = inmueble(s.inmuebleId); const c = cliente(i.clienteId); return { i, c }; };
  const quienEvento = ev => { const s = servicio(ev.servicioId) || {}; const { i, c } = cadena(s); return nombreCli(c) + ' · ' + (i.nombreComercial || ''); };
  const avance = s => avanceServicio(s, DB.eventos);
  const tituloEvento = ev => ev.clase === 'simulacro' ? 'Simulacro' + (ev.hipotesis ? ': ' + ev.hipotesis : '') + (TIPOS_SIMULACRO.indexOf(ev.tipoSimulacro) >= 0 ? ' (' + ev.tipoSimulacro.toLowerCase() + ')' : '') : (ev.curso || 'Capacitación');

  function firmaWhatsApp() { return Object.assign({}, FIRMA_WHATSAPP, (DB.ajustes || []).find(x => x.id === 'firmaWhatsApp') || {}); }
  function etiquetaTipo(tipo) { const t = TIPOS[tipo]; return '<span class="etiqueta" style="background:' + t.color + '">' + esc(t.corto) + '</span>'; }
  function barra(p) { return '<div class="barra-avance' + (p >= 100 ? ' listo' : '') + '"><i style="width:' + p + '%"></i></div>'; }
  function promedio(arr) { return arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0; }
  function nombreServicio(s) {
    let n = TIPOS[s.tipo].nombre;
    if (s.tipo === 'PIPC') n += ' · riesgo ' + (s.modalidad || inmueble(s.inmuebleId).riesgo || '');
    if (s.tipo === 'STPS' && s.datos && s.datos.servicioStps) n += ' · ' + s.datos.servicioStps;
    return n;
  }

  function toast(msg, error) {
    const t = $('#aviso'); t.textContent = msg; t.className = 'toast' + (error ? ' error' : ''); t.hidden = false;
    clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, error ? 5000 : 2600);
  }
  function sinc(msg) { $('#estadoSinc').textContent = msg || ''; }

  async function guardar(col, obj, msg) {
    try {
      sinc('Guardando…');
      const g = await Datos.guardar(col, obj);
      refrescarDB(); sinc(Datos.MODO_PRUEBA ? '' : 'Guardado');
      if (msg) toast(msg);
      return g;
    } catch (e) { sinc(''); toast(e.message, true); throw e; }
  }
  async function borrar(col, id, msg) {
    try { await Datos.borrar(col, id); refrescarDB(); if (msg) toast(msg); }
    catch (e) { toast(e.message, true); throw e; }
  }
  function refrescarDB() {
    // Datos mantiene la copia local; tomamos de nuevo la vista según el usuario
    DB = Datos.vista(); pintar();
  }

  /* ======================= Modal y formularios ======================= */
  function abrirModal(titulo, html) { document.querySelector(".modal").classList.remove("ancha"); $('#modalTitulo').textContent = titulo; $('#modalCuerpo').innerHTML = html; $('#capaModal').hidden = false; const f = $('#modalCuerpo input,#modalCuerpo select,#modalCuerpo textarea'); if (f) setTimeout(() => f.focus(), 30); }
  function cerrarModal() { $('#capaModal').hidden = true; $('#modalCuerpo').innerHTML = ''; }

  /**
   * campos: [{k, t, tipo, opciones, req, ancho, ayuda, lista}]
   * tipo: text | number | date | time | select | textarea | check | moneda
   */
  function htmlCampos(campos, val) {
    return campos.map(c => {
      const v = val[c.k] == null ? (c.def == null ? '' : c.def) : val[c.k];
      const id = 'f_' + c.k;
      let inp;
      if (c.tipo === 'select') inp = '<select id="' + id + '" name="' + c.k + '">' + c.opciones.map(o => { const ov = typeof o === 'object' ? o.v : o, ot = typeof o === 'object' ? o.t : o; return '<option value="' + esc(ov) + '"' + (String(ov) === String(v) ? ' selected' : '') + '>' + esc(ot) + '</option>'; }).join('') + '</select>';
      else if (c.tipo === 'textarea') inp = '<textarea id="' + id + '" name="' + c.k + '" rows="' + (c.filas || 3) + '">' + esc(v) + '</textarea>';
      else if (c.tipo === 'check') return '<div class="campo check' + (c.ancho ? ' ancho' : '') + '"><input type="checkbox" id="' + id + '" name="' + c.k + '"' + (v ? ' checked' : '') + '><label for="' + id + '">' + esc(c.t) + '</label></div>';
      else {
        const tipo = c.tipo === 'moneda' ? 'number' : (c.tipo || 'text');
        inp = '<input id="' + id + '" name="' + c.k + '" type="' + tipo + '" value="' + esc(v) + '"' + (c.tipo === 'moneda' ? ' step="0.01" min="0"' : '') + (c.min != null ? ' min="' + c.min + '"' : '') + (c.max != null ? ' max="' + c.max + '"' : '') + (c.paso ? ' step="' + c.paso + '"' : '') + (c.lista ? ' list="l_' + c.k + '"' : '') + '>' +
          (c.lista ? '<datalist id="l_' + c.k + '">' + c.lista.map(o => '<option value="' + esc(o) + '">').join('') + '</datalist>' : '');
      }
      return '<div class="campo' + (c.ancho ? ' ancho' : '') + '"><label for="' + id + '">' + esc(c.t) + (c.req ? ' *' : '') + '</label>' + inp + (c.ayuda ? '<span class="ayuda">' + esc(c.ayuda) + '</span>' : '') + '</div>';
    }).join('');
  }
  function leerCampos(campos) {
    const o = {};
    campos.forEach(c => {
      const el = document.getElementById('f_' + c.k); if (!el) return;
      if (c.tipo === 'check') o[c.k] = el.checked;
      else if (c.tipo === 'number' || c.tipo === 'moneda') o[c.k] = el.value === '' ? '' : +el.value;
      else o[c.k] = el.value.trim();
    });
    return o;
  }
  function formulario(titulo, campos, val, alGuardar, opciones) {
    opciones = opciones || {};
    abrirModal(titulo, '<form class="form" id="formModal" novalidate>' + htmlCampos(campos, val || {}) +
      (opciones.extraHtml || '') + '<div class="error-form" id="errForm" hidden></div>' +
      '<div class="form-pie">' + (opciones.borrar ? '<button type="button" class="btn peligro izq" id="btnBorrar">Eliminar</button>' : '') +
      (opciones.extraPie || '') +
      '<button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button class="btn" type="submit">Guardar</button></div></form>');
    if (opciones.alAbrir) opciones.alAbrir();
    $('#formModal').addEventListener('submit', async e => {
      e.preventDefault();
      const datos = leerCampos(campos);
      const falta = campos.filter(c => c.req && (datos[c.k] === '' || datos[c.k] == null)).map(c => c.t);
      const err = $('#errForm');
      if (falta.length) { err.textContent = 'Falta: ' + falta.join(', ') + '.'; err.hidden = false; return; }
      try {
        const r = await alGuardar(datos);
        if (r && r.error) { err.textContent = r.error; err.hidden = false; return; }
        cerrarModal();
      } catch (ex) { err.textContent = ex.message; err.hidden = false; }
    });
    if (opciones.borrar) $('#btnBorrar').addEventListener('click', async () => {
      if (!confirm(opciones.borrarPregunta || '¿Eliminar este registro? No se puede deshacer.')) return;
      await opciones.borrar(); cerrarModal();
    });
  }

  /* ======================= Formularios de registro ======================= */
  const CAMPOS_CLIENTE = [
    { k: 'razonSocial', t: 'Razón social', req: true, ancho: true },
    { k: 'nombreComercial', t: 'Nombre comercial', req: true },
    { k: 'rfc', t: 'RFC' },
    { k: 'notas', t: 'Notas', tipo: 'textarea', ancho: true }
  ];
  function formCliente(c) {
    formulario(c ? 'Editar cliente' : 'Nuevo cliente', CAMPOS_CLIENTE, c, async d => {
      d.rfc = (d.rfc || '').toUpperCase();
      const g = await guardar('clientes', Object.assign({}, c || {}, d), 'Cliente guardado');
      if (!c) location.hash = '#/cliente/' + g.id;
    }, c ? {
      borrar: async () => {
        if (DB.inmuebles.some(i => i.clienteId === c.id)) { toast('Primero elimine los inmuebles de este cliente.', true); return; }
        await borrar('clientes', c.id, 'Cliente eliminado'); location.hash = '#/clientes';
      }
    } : null);
  }

  const CAMPOS_INMUEBLE = [
    { k: 'nombreComercial', t: 'Nombre comercial del inmueble', req: true, ancho: true },
    { k: 'direccion', t: 'Dirección', ancho: true },
    { k: 'nrpc', t: 'NRPC (si aplica)', ayuda: 'Número de Registro de Protección Civil' },
    { k: 'riesgo', t: 'Tipo de riesgo', tipo: 'select', opciones: [{ v: 'ordinario', t: 'Ordinario' }, { v: 'alto', t: 'Alto' }], req: true },
    { k: 'm2Superficie', t: 'm² de superficie', tipo: 'number', min: 0 },
    { k: 'm2Construccion', t: 'm² de construcción', tipo: 'number', min: 0 },
    { k: 'aforo', t: 'Aforo (personas)', tipo: 'number', min: 0 },
    { k: 'contactoNombre', t: 'Persona de contacto' },
    { k: 'contactoTel', t: 'Teléfono / WhatsApp del contacto', ayuda: '10 dígitos' }
  ];
  function formInmueble(inm, clienteId) {
    const sel = { izq: inm && inm.logoIzq !== undefined ? inm.logoIzq : 'gv', der: inm && inm.logoDer !== undefined ? inm.logoDer : '' };
    formulario(inm ? 'Editar inmueble' : 'Nuevo inmueble o establecimiento', CAMPOS_INMUEBLE, inm || { riesgo: 'ordinario' }, async d => {
      const g = await guardar('inmuebles', Object.assign({ clienteId }, inm || {}, d, { logoIzq: sel.izq, logoDer: sel.der }), 'Inmueble guardado');
      if (!inm) location.hash = '#/inmueble/' + g.id;
    }, Object.assign({
      extraHtml: '<div class="campo ancho" id="cajaLogos"></div>',
      alAbrir: () => pintarLogos(sel)
    }, inm ? {
      borrar: async () => {
        if (DB.servicios.some(s => s.inmuebleId === inm.id)) { toast('Primero elimine los servicios de este inmueble.', true); return; }
        await borrar('inmuebles', inm.id, 'Inmueble eliminado'); location.hash = '#/cliente/' + inm.clienteId;
      }
    } : {}));
  }

  /* ---------- Logotipos de los documentos (galería compartida) ---------- */
  function htmlSelLogo(id, valor) { return '<select id="' + id + '">' + Docs.opciones(DB).map(([v, n]) => '<option value="' + esc(v) + '"' + (v === valor ? ' selected' : '') + '>' + esc(n) + '</option>').join('') + '</select>'; }
  async function ponerLogo(el, v) {
    if (!el) return;
    if (!v) { el.innerHTML = '<span class="sub">Sin logotipo</span>'; return; }
    const src = await Docs.logoSrc(DB, v);
    el.innerHTML = src ? '<img src="' + esc(src) + '" alt="' + esc(Docs.nombreLogo(DB, v)) + '" style="max-height:56px;max-width:100%">' : '<span class="sub">No disponible</span>';
  }
  /** Pinta (o repinta) el apartado de logotipos dentro de #cajaLogos. «sel» guarda la elección {izq, der}. */
  function pintarLogos(sel) {
    const caja = $('#cajaLogos'); if (!caja) return;
    const gal = Docs.galeria(DB);
    caja.innerHTML = '<label>Logotipos de los documentos para el cliente</label>' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:72px;padding:10px 14px;border:1.5px dashed #CDD5DF;border-bottom:3px solid var(--dorado);border-radius:10px;background:#fff">' +
      '<div style="flex:1;min-width:0" id="vistaIzq"></div><div style="flex:1;min-width:0;text-align:right" id="vistaDer"></div></div>' +
      '<div class="form" style="margin-top:8px"><div class="campo"><label for="logoIzq">Izquierda (asesor)</label>' + htmlSelLogo('logoIzq', sel.izq) + '</div>' +
      '<div class="campo"><label for="logoDer">Derecha (cliente)</label>' + htmlSelLogo('logoDer', sel.der) + '</div></div>' +
      '<span class="ayuda">Se usan en el guion y cronología y en el reporte de avance de este inmueble.</span>' +
      '<details style="margin-top:6px"' + (gal.length ? '' : ' open') + '><summary style="cursor:pointer;font-weight:600;color:var(--marino);font-size:12px">Galería de logotipos (' + gal.length + ')</summary>' +
      '<div style="display:grid;gap:8px;margin-top:8px">' + gal.map(l => '<div style="display:flex;align-items:center;gap:8px;border:1px solid var(--gris-claro);border-radius:8px;padding:6px 8px;background:#fff"><span data-logo-vista="' + esc(l.id) + '" style="width:110px;height:40px;display:flex;align-items:center"></span>' +
        '<input type="text" data-logo-nombre="' + esc(l.id) + '" value="' + esc(l.nombre) + '" style="flex:1;min-width:100px;font:inherit;border:1px solid #CDD5DF;border-radius:6px;padding:5px 8px" aria-label="Nombre del logotipo">' +
        '<button type="button" class="btn peligro chico" data-logo-quitar="' + esc(l.id) + '">Quitar</button></div>').join('') +
      '<div><label class="btn sec chico" for="logoArchivo" style="display:inline-flex">⬆ Subir logotipo(s)</label><input type="file" id="logoArchivo" accept="image/png,image/jpeg,image/webp" multiple hidden> <span class="sub" id="logoProg"></span></div></div></details>';
    ponerLogo($('#vistaIzq'), sel.izq); ponerLogo($('#vistaDer'), sel.der);
    caja.querySelectorAll('[data-logo-vista]').forEach(el => ponerLogo(el, el.dataset.logoVista));
    $('#logoIzq').onchange = e => { sel.izq = e.target.value; ponerLogo($('#vistaIzq'), sel.izq); };
    $('#logoDer').onchange = e => { sel.der = e.target.value; ponerLogo($('#vistaDer'), sel.der); };
    const guardarGaleria = lista => guardar('ajustes', Object.assign({}, (DB.ajustes || []).find(x => x.id === 'logos') || { id: 'logos' }, { lista }));
    $('#logoArchivo').onchange = async e => {
      const fs = Array.from(e.target.files || []); if (!fs.length) return;
      const lista = Docs.galeria(DB).slice(); let ultimo = '';
      try {
        for (const f of fs) {
          $('#logoProg').textContent = 'Subiendo ' + f.name + '…';
          const r = await Datos.subirArchivo(f, ['Logotipos']);
          ultimo = Datos.nuevoId('logo');
          lista.push({ id: ultimo, nombre: f.name.replace(/\.[^.]+$/, ''), url: r.url, driveId: r.driveId || '' });
        }
        await guardarGaleria(lista);
        if (!sel.der) sel.der = ultimo;
        toast(fs.length > 1 ? fs.length + ' logotipos agregados a la galería' : 'Logotipo agregado. Elíjalo a la izquierda o a la derecha.');
      } catch (ex) { toast(ex.message, true); }
      pintarLogos(sel);
    };
    caja.querySelectorAll('[data-logo-nombre]').forEach(inp => inp.onchange = async () => {
      await guardarGaleria(Docs.galeria(DB).map(l => l.id === inp.dataset.logoNombre ? Object.assign({}, l, { nombre: inp.value.trim() }) : l)); pintarLogos(sel);
    });
    caja.querySelectorAll('[data-logo-quitar]').forEach(b => b.onclick = async () => {
      const id = b.dataset.logoQuitar; const l = Docs.galeria(DB).find(x => x.id === id);
      if (!confirm('¿Quitar «' + (l ? l.nombre : 'logotipo') + '» de la galería? Los documentos ya descargados no cambian.')) return;
      await guardarGaleria(Docs.galeria(DB).filter(x => x.id !== id));
      for (const i of DB.inmuebles.filter(x => x.logoIzq === id || x.logoDer === id)) await Datos.guardar('inmuebles', Object.assign({}, i, i.logoIzq === id ? { logoIzq: 'gv' } : {}, i.logoDer === id ? { logoDer: '' } : {}));
      if (sel.izq === id) sel.izq = 'gv'; if (sel.der === id) sel.der = '';
      refrescarDB(); pintarLogos(sel);
    });
  }

  function formServicio(inmuebleId, s) {
    const inm = inmueble(inmuebleId);
    const campos = [
      { k: 'tipo', t: 'Servicio', tipo: 'select', opciones: ORDEN_TIPOS.map(k => ({ v: k, t: TIPOS[k].nombre })), req: true, ancho: true },
      { k: 'ejercicio', t: 'Ejercicio (año)', tipo: 'number', req: true, min: 2020, max: 2100 },
      { k: 'modalidad', t: 'Modalidad del PIPC', tipo: 'select', opciones: [{ v: 'ordinario', t: 'Riesgo ordinario' }, { v: 'alto', t: 'Riesgo alto' }] },
      { k: 'numSimulacros', t: 'Simulacros contratados al año', tipo: 'select', opciones: [1, 2, 3, 4, 5, 6] },
      { k: 'numCursos', t: 'Capacitaciones contratadas al año', tipo: 'number', min: 0, ayuda: 'Déjelo en 0 si aún no se define.' },
      { k: 'servicioStps', t: 'Servicio STPS', tipo: 'select', opciones: SERVICIOS_STPS },
      { k: 'descripcion', t: 'Descripción', tipo: 'textarea', ancho: true }
    ];
    if (Datos.esDirectora()) campos.push({ k: 'precio', t: 'Precio total del servicio', tipo: 'moneda', ayuda: 'Privado: solo lo ve la Directora.' }, { k: 'requiereFactura', t: 'El cliente requiere factura', tipo: 'check' });
    const d = s ? (s.datos || {}) : {};
    const cobro = s && DB.cobros ? (DB.cobros.find(c => c.id === s.id) || {}) : {};
    const val = s ? Object.assign({ tipo: s.tipo, ejercicio: s.ejercicio, modalidad: s.modalidad }, d, { precio: cobro.precio, requiereFactura: cobro.requiereFactura }) : { tipo: 'PIPC', ejercicio: estado.ejercicio, modalidad: inm.riesgo || 'ordinario', numSimulacros: 1, numCursos: 0 };
    formulario(s ? 'Editar servicio' : 'Contratar servicio · ' + (inm.nombreComercial || ''), campos, val, async v => {
      const datos = Object.assign({}, d);
      if (v.tipo === 'SIMULACROS') datos.numSimulacros = +v.numSimulacros || 1;
      if (v.tipo === 'CAPACITACIONES') datos.numCursos = +v.numCursos || 0;
      if (v.tipo === 'STPS') { datos.servicioStps = v.servicioStps; datos.avance = datos.avance || 0; }
      datos.descripcion = v.descripcion;
      if (!s && DB.servicios.some(x => x.inmuebleId === inmuebleId && x.tipo === v.tipo && +x.ejercicio === +v.ejercicio && v.tipo !== 'STPS')) {
        return { error: 'Este inmueble ya tiene ' + TIPOS[v.tipo].nombre + ' en el ejercicio ' + v.ejercicio + '.' };
      }
      const obj = Object.assign({ inmuebleId, etapas: {} }, s || {}, { tipo: v.tipo, ejercicio: +v.ejercicio, modalidad: v.tipo === 'PIPC' ? v.modalidad : '', datos });
      const g = await guardar('servicios', obj, 'Servicio guardado');
      if (Datos.esDirectora() && (v.precio !== '' || v.requiereFactura || cobro.id)) {
        await guardar('cobros', Object.assign({ movimientos: [] }, cobro, { id: g.id, precio: +v.precio || 0, requiereFactura: !!v.requiereFactura }));
      }
      if (!s) location.hash = '#/servicio/' + g.id;
    }, {
      alAbrir: () => {
        const ajustar = () => {
          const t = $('#f_tipo').value;
          const ver = (k, si) => { const el = $('#f_' + k); if (el) el.closest('.campo').hidden = !si; };
          ver('modalidad', t === 'PIPC'); ver('numSimulacros', t === 'SIMULACROS'); ver('numCursos', t === 'CAPACITACIONES'); ver('servicioStps', t === 'STPS');
          if (s) $('#f_tipo').disabled = true;
        };
        $('#f_tipo').addEventListener('change', ajustar); ajustar();
      },
      borrar: s ? async () => {
        for (const col of ['eventos', 'pendientes', 'documentos', 'notas']) for (const x of DB[col].filter(x => x.servicioId === s.id)) await Datos.borrar(col, x.id);
        if (DB.cobros && DB.cobros.some(c => c.id === s.id)) await Datos.borrar('cobros', s.id);
        await borrar('servicios', s.id, 'Servicio eliminado'); location.hash = '#/inmueble/' + s.inmuebleId;
      } : null,
      borrarPregunta: '¿Eliminar este servicio con todos sus simulacros/capacitaciones, documentos y notas? No se puede deshacer.'
    });
  }

  function listaResponsables() {
    return USUARIOS.map(u => u.nombre).concat((DB.responsables || []).map(r => r.nombre), ['El cliente']);
  }
  function formEvento(servicioId, ev, fechaSugerida) {
    const s = servicio(servicioId);
    const clase = ev ? ev.clase : (s.tipo === 'SIMULACROS' ? 'simulacro' : 'capacitacion');
    const campos = clase === 'simulacro' ? [
      { k: 'fecha', t: 'Fecha', tipo: 'date', req: true },
      { k: 'hora', t: 'Hora', tipo: 'time', req: true },
      { k: 'tipoSimulacro', t: 'Tipo de simulacro', tipo: 'select', opciones: TIPOS_SIMULACRO, req: true },
      { k: 'hipotesis', t: 'Hipótesis', req: true, lista: HIPOTESIS, ayuda: 'Aparece en el aviso de WhatsApp, por ejemplo: Incendio.' },
      { k: 'responsable', t: 'Quién lo atiende', req: true, lista: listaResponsables(), ayuda: 'Alguien del equipo, un tercero o el propio cliente.' },
      { k: 'escenario', t: 'Descripción del escenario (uso interno)', tipo: 'textarea', ancho: true },
      { k: 'cancelado', t: 'Cancelado (no cuenta en el calendario)', tipo: 'check', ancho: true }
    ] : [
      { k: 'curso', t: 'Nombre del curso', req: true, lista: CURSOS, ancho: true },
      { k: 'temario', t: 'Temario', tipo: 'textarea', ancho: true },
      { k: 'fecha', t: 'Fecha', tipo: 'date', req: true },
      { k: 'hora', t: 'Hora de inicio', tipo: 'time', req: true },
      { k: 'cargaHoraria', t: 'Carga horaria (horas)', tipo: 'number', req: true, min: 0.5, paso: 0.5 },
      { k: 'modalidad', t: 'Modalidad', tipo: 'select', opciones: MODALIDADES },
      { k: 'responsable', t: 'Quién la imparte', req: true, lista: listaResponsables(), ayuda: 'Alguien del equipo, un tercero o el propio cliente.', ancho: true },
      { k: 'cancelado', t: 'Cancelada (no cuenta en el calendario)', tipo: 'check', ancho: true }
    ];
    const val = ev || { fecha: fechaSugerida || '', hora: '10:00', cargaHoraria: 2, modalidad: 'Presencial', tipoSimulacro: 'De campo', hipotesis: '' };
    formulario((ev ? 'Editar ' : 'Programar ') + (clase === 'simulacro' ? 'simulacro' : 'capacitación') + ' · ' + quienEvento({ servicioId }), campos, val, async d => {
      const obj = Object.assign({ servicioId, clase, etapas: {} }, ev || {}, d);
      if (ev && (ev.fecha !== obj.fecha || ev.hora !== obj.hora)) obj.avisoEnviado = '';
      const problema = validarEvento(obj, DB.eventos, quienEvento);
      if (problema) return { error: problema };
      const contratados = clase === 'simulacro' ? (+(s.datos || {}).numSimulacros || 1) : (+(s.datos || {}).numCursos || 0);
      const yaHay = DB.eventos.filter(e => e.servicioId === servicioId && !e.cancelado && e.id !== obj.id).length;
      if (!obj.cancelado && contratados && yaHay >= contratados && !confirm('Este servicio tiene ' + contratados + ' contratado(s) y ya hay ' + yaHay + ' programado(s). ¿Programar uno adicional?')) return { error: 'No se guardó: excede lo contratado.' };
      await guardar('eventos', obj, clase === 'simulacro' ? 'Simulacro guardado' : 'Capacitación guardada');
    }, ev ? { borrar: async () => { await borrar('eventos', ev.id, 'Eliminado'); } } : null);
  }

  /* ======================= Vistas ======================= */
  const RUTAS = {
    panel: vistaPanel, clientes: vistaClientes, cliente: vistaCliente, inmueble: vistaInmueble, servicio: vistaServicio,
    calendario: vistaCalendario, avisos: vistaAvisos, pagos: vistaPagos, ajustes: vistaAjustes,
    capacitaciones: vistaCapacitaciones, curso: vistaCurso
  };
  function ruta() { const p = (location.hash || '#/panel').slice(2).split('/'); return { nombre: RUTAS[p[0]] ? p[0] : 'panel', id: p[1] }; }

  function pintar() {
    if (!DB) return;
    const r = ruta();
    document.querySelectorAll('#menu a').forEach(a => a.classList.toggle('activo', a.dataset.ruta === r.nombre || (r.nombre === 'cliente' || r.nombre === 'inmueble' || r.nombre === 'servicio') && a.dataset.ruta === 'clientes' || r.nombre === 'curso' && a.dataset.ruta === 'capacitaciones'));
    $('#menuPagos').hidden = !Datos.esDirectora();
    const avisos = calcularAvisos(DB, hoyISO(), Datos.esDirectora());
    const nUrg = avisos.filter(a => a.nivel !== 'azul').length + avisosWhatsApp(DB).length;
    const b = $('#burbujaAvisos'); b.textContent = nUrg; b.hidden = !nUrg;
    const scroll = window.scrollY;
    const html = RUTAS[r.nombre](r.id);
    $('#principal').innerHTML = html;
    if (pintar._ultima === location.hash) window.scrollTo(0, scroll); else window.scrollTo(0, 0);
    pintar._ultima = location.hash;
  }
  function titulo(t) { $('#titulo').textContent = t; document.title = t + ' · Cerebro Grupo VIME'; }

  function htmlAviso(a) {
    return '<div class="aviso-it ' + a.nivel + '" data-acc="ir" data-h="#/servicio/' + a.servicioId + '"><div><b>' + esc(a.titulo) + (a.para === 'directora' ? '<span class="privado">PRIVADO</span>' : '') + '</b><span>' + esc(a.detalle) + '</span></div></div>';
  }
  function htmlWhatsApp(lista) {
    if (!lista.length) return '<div class="vacio">No hay avisos de simulacro para enviar hoy.</div>';
    return lista.map(ev => {
      const s = servicio(ev.servicioId) || {}; const { i } = cadena(s);
      return '<div class="fila"><div class="crece"><b>' + esc(quienEvento(ev)) + '</b><div class="sub">' + esc(tituloEvento(ev)) + ' · ' + esc(fechaLarga(ev.fecha)) + ', ' + esc(ev.hora) + ' h · ' + esc(i.contactoNombre || 'sin contacto') + '</div></div>' +
        (i.contactoTel ? '<button class="btn wa chico" data-acc="whatsapp" data-id="' + ev.id + '">WhatsApp</button>' : '<span class="sub">Falta teléfono</span>') +
        '<button class="btn sec chico" data-acc="avisoHecho" data-id="' + ev.id + '" title="Marcar como enviado">✓</button></div>';
    }).join('');
  }
  /** Enlace que abre el documento en el visor de la app (no lo descarga). */
  function enlaceDoc(d, etiqueta) {
    return '<a href="#" data-acc="verDoc" data-id="' + d.id + '" class="etiqueta borde" style="color:var(--azul)" title="Ver ' + esc(d.nombre) + '">' + (etiqueta || ((/\.pdf$/i.test(d.nombre) ? '📄 ' : /\.(jpe?g|png|webp|heic)$/i.test(d.nombre) ? '🖼 ' : /\.docx?$/i.test(d.nombre) ? '📝 ' : '🔗 ') + esc(d.nombre))) + '</a>';
  }
  function htmlEventoFila(ev, conQuien, sinDocs) {
    const hecho = (ev.etapas || {})[ev.clase === 'simulacro' ? 'ejecucion' : 'impartida'];
    const guiones = sinDocs ? [] : DB.documentos.filter(d => d.eventoId === ev.id && d.categoria === 'guion');
    return '<div class="fila clic" data-acc="evento" data-id="' + ev.id + '"><div style="width:6px;align-self:stretch;border-radius:3px;background:' + (ev.clase === 'simulacro' ? 'var(--naranja)' : 'var(--azul)') + '"></div>' +
      '<div class="crece"><b>' + esc(tituloEvento(ev)) + '</b>' + (ev.cancelado ? ' <span class="etiqueta" style="background:#999">Cancelado</span>' : hecho ? ' <span class="etiqueta" style="background:var(--verde)">Realizado</span>' : '') +
      '<div class="sub">' + (conQuien ? esc(quienEvento(ev)) + ' · ' : '') + esc(fechaLarga(ev.fecha)) + ', ' + esc(ev.hora) + ' h' + (ev.cargaHoraria ? ' · ' + ev.cargaHoraria + ' h' : '') + ' · Atiende: ' + esc(ev.responsable || '—') + '</div>' +
      (ev.temario ? '<div class="sub" style="white-space:pre-line;margin-top:3px"><b>Temario:</b> ' + esc(ev.temario.length > 220 ? ev.temario.slice(0, 220) + '…' : ev.temario) + '</div>' : '') +
      (ev.clase === 'simulacro' && !sinDocs && (tieneGuion(ev) || guiones.length) ? '<div style="margin-top:4px">' + (tieneGuion(ev) ? '<a href="#" data-acc="verGuion" data-id="' + ev.id + '" class="etiqueta borde" style="color:var(--azul)">📄 Guion y cronología</a> ' : '') + guiones.map(d => enlaceDoc(d)).join(' ') + '</div>' : '') + '</div></div>';
  }

  function vistaPanel() {
    titulo('Panel');
    const hoy = hoyISO(), anio = estado.ejercicio;
    const serv = DB.servicios.filter(s => +s.ejercicio === anio && !s.archivado);
    const avisos = calcularAvisos(DB, hoy, Datos.esDirectora());
    const wa = avisosWhatsApp(DB, hoy);
    const prox = DB.eventos.filter(e => !e.cancelado && e.fecha >= hoy && e.fecha <= sumarDias(hoy, 14)).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
    const u = Datos.usuario();
    return '<h2 style="margin-bottom:14px">Buen día, ' + esc(u.nombre) + '</h2>' +
      '<div class="kpis">' +
      '<div class="kpi"><b>' + DB.clientes.length + '</b><span>Clientes</span></div>' +
      '<div class="kpi"><b>' + DB.inmuebles.length + '</b><span>Inmuebles</span></div>' +
      '<div class="kpi"><b>' + serv.length + '</b><span>Servicios ' + anio + '</span></div>' +
      '<div class="kpi"><b>' + promedio(serv.map(avance)) + '%</b><span>Avance promedio ' + anio + '</span></div></div>' +
      '<div class="rejilla dos"><div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Avisos de simulacro para enviar por WhatsApp</h3><span class="sub">2 días hábiles antes</span></div>' + htmlWhatsApp(wa) + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Atención requerida</h3><a href="#/avisos">Ver todos</a></div>' +
      (avisos.length ? avisos.slice(0, 8).map(htmlAviso).join('') : '<div class="vacio">Sin pendientes urgentes.</div>') + '</div></div>' +
      '<div><div class="tarjeta"><div class="tarjeta-cab"><h3>Próximos 14 días</h3><a href="#/calendario">Calendario</a></div>' +
      (prox.length ? '<div class="lista">' + prox.map(e => htmlEventoFila(e, true)).join('') + '</div>' : '<div class="vacio">No hay simulacros ni capacitaciones programados.</div>') + '</div></div></div>';
  }

  function vistaAvisos() {
    titulo('Avisos');
    const avisos = calcularAvisos(DB, hoyISO(), Datos.esDirectora());
    const pend = DB.pendientes.filter(p => !p.entregado);
    return '<div class="tarjeta"><div class="tarjeta-cab"><h3>WhatsApp a clientes: avisos de simulacro</h3></div>' + htmlWhatsApp(avisosWhatsApp(DB)) + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Plazos, pendientes y seguimiento</h3><span class="sub">' + avisos.length + ' avisos</span></div>' +
      (avisos.length ? avisos.map(htmlAviso).join('') : '<div class="vacio">Todo al día.</div>') + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Documentos pendientes de entrega por los clientes</h3></div>' +
      (pend.length ? '<div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Documento</th><th>Cliente · inmueble</th><th>Servicio</th><th>Fecha límite</th></tr></thead><tbody>' +
        pend.sort((a, b) => String(a.fechaLimite || '9').localeCompare(String(b.fechaLimite || '9'))).map(p => { const s = servicio(p.servicioId) || {}; const { i, c } = cadena(s); return '<tr class="clic" data-acc="ir" data-h="#/servicio/' + s.id + '"><td>' + esc(p.descripcion) + '</td><td>' + esc(nombreCli(c) + ' · ' + (i.nombreComercial || '')) + '</td><td>' + (s.tipo ? etiquetaTipo(s.tipo) : '') + '</td><td>' + esc(fechaCorta(p.fechaLimite) || '—') + '</td></tr>'; }).join('') +
        '</tbody></table></div>' : '<div class="vacio">Ningún documento pendiente.</div>') + '</div>';
  }

  function vistaClientes() {
    titulo('Clientes');
    const f = estado.filtroClientes.toLowerCase();
    const lista = DB.clientes.filter(c => !f || [c.razonSocial, c.nombreComercial, c.rfc].concat(DB.inmuebles.filter(i => i.clienteId === c.id).map(i => i.nombreComercial)).join(' ').toLowerCase().includes(f))
      .sort((a, b) => nombreCli(a).localeCompare(nombreCli(b)));
    return '<div class="tarjeta"><div class="tarjeta-cab"><input class="buscador" id="buscarCliente" placeholder="Buscar cliente, RFC o inmueble…" value="' + esc(estado.filtroClientes) + '"><button class="btn" data-acc="nuevoCliente">+ Nuevo cliente</button></div>' +
      '<div class="lista">' + (lista.length ? lista.map(c => {
        const inms = DB.inmuebles.filter(i => i.clienteId === c.id);
        const serv = DB.servicios.filter(s => inms.some(i => i.id === s.inmuebleId) && +s.ejercicio === estado.ejercicio);
        const tipos = Array.from(new Set(serv.map(s => s.tipo)));
        const av = promedio(serv.map(avance));
        return '<div class="fila clic" data-acc="ir" data-h="#/cliente/' + c.id + '"><div class="crece"><b>' + esc(nombreCli(c)) + '</b><div class="sub">' + esc(c.razonSocial) + (c.rfc ? ' · ' + esc(c.rfc) : '') + ' · ' + inms.length + ' inmueble' + (inms.length === 1 ? '' : 's') + '</div><div class="chips" style="margin-top:5px">' + tipos.map(etiquetaTipo).join('') + '</div></div>' +
          '<div style="width:130px">' + barra(av) + '</div><div class="avance-num">' + av + '%</div></div>';
      }).join('') : '<div class="vacio">No hay clientes' + (f ? ' que coincidan' : '') + '.</div>') + '</div></div>';
  }

  function vistaCliente(id) {
    const c = porId('clientes', id); if (!c) return '<div class="vacio">Cliente no encontrado.</div>';
    titulo(nombreCli(c));
    const inms = DB.inmuebles.filter(i => i.clienteId === id).sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));
    return '<div class="migas"><a href="#/clientes">Clientes</a> › ' + esc(nombreCli(c)) + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h2>' + esc(nombreCli(c)) + '</h2><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn acento chico" data-acc="reporteAvance" data-id="' + id + '">📄 Reporte de avance</button><button class="btn sec chico" data-acc="editarCliente" data-id="' + id + '">Editar</button></div></div>' +
      '<div class="datos"><div class="dato"><small>Razón social</small><div>' + esc(c.razonSocial) + '</div></div><div class="dato"><small>RFC</small><div>' + esc(c.rfc || '—') + '</div></div>' +
      (c.notas ? '<div class="dato" style="grid-column:1/-1"><small>Notas</small><div>' + esc(c.notas) + '</div></div>' : '') + '</div></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Inmuebles y establecimientos (' + inms.length + ')</h3><button class="btn" data-acc="nuevoInmueble" data-id="' + id + '">+ Nuevo inmueble</button></div><div class="lista">' +
      (inms.length ? inms.map(i => {
        const serv = DB.servicios.filter(s => s.inmuebleId === i.id && +s.ejercicio === estado.ejercicio);
        const av = promedio(serv.map(avance));
        return '<div class="fila clic" data-acc="ir" data-h="#/inmueble/' + i.id + '"><div class="crece"><b>' + esc(i.nombreComercial) + '</b> <span class="etiqueta borde" style="color:' + (i.riesgo === 'alto' ? 'var(--rojo)' : 'var(--verde)') + '">Riesgo ' + esc(i.riesgo) + '</span><div class="sub">' + esc(i.direccion || '') + '</div><div class="chips" style="margin-top:5px">' + serv.map(s => etiquetaTipo(s.tipo)).join('') + '</div></div><div style="width:120px">' + barra(av) + '</div><div class="avance-num">' + av + '%</div></div>';
      }).join('') : '<div class="vacio">Registre el primer inmueble o establecimiento de este cliente.</div>') + '</div></div>';
  }

  function selectorEjercicio() {
    const anios = Array.from(new Set(DB.servicios.map(s => +s.ejercicio).concat([+hoyISO().slice(0, 4), +hoyISO().slice(0, 4) + 1]))).sort();
    return '<select id="selEjercicio" class="buscador" style="min-width:0">' + anios.map(a => '<option' + (a === estado.ejercicio ? ' selected' : '') + '>' + a + '</option>').join('') + '</select>';
  }

  function vistaInmueble(id) {
    const i = porId('inmuebles', id); if (!i) return '<div class="vacio">Inmueble no encontrado.</div>';
    const c = cliente(i.clienteId);
    titulo(i.nombreComercial);
    const serv = DB.servicios.filter(s => s.inmuebleId === id && +s.ejercicio === estado.ejercicio).sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo));
    const num = n => (n === '' || n == null) ? '—' : (+n).toLocaleString('es-MX');
    return '<div class="migas"><a href="#/clientes">Clientes</a> › <a href="#/cliente/' + c.id + '">' + esc(nombreCli(c)) + '</a> › ' + esc(i.nombreComercial) + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h2>' + esc(i.nombreComercial) + '</h2><button class="btn sec chico" data-acc="editarInmueble" data-id="' + id + '">Editar</button></div><div class="datos">' +
      [['Dirección', i.direccion], ['NRPC', i.nrpc || 'No aplica'], ['Tipo de riesgo', i.riesgo === 'alto' ? 'Alto' : 'Ordinario'], ['m² de superficie', num(i.m2Superficie)], ['m² de construcción', num(i.m2Construccion)], ['Aforo', num(i.aforo)], ['Contacto', i.contactoNombre], ['Teléfono', i.contactoTel]]
        .map(x => '<div class="dato"><small>' + x[0] + '</small><div>' + esc(x[1] || '—') + '</div></div>').join('') + '</div></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Servicios contratados · ejercicio ' + selectorEjercicio() + '</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      (serv.length ? '<button class="btn sec chico" data-acc="copiarEjercicio" data-id="' + id + '">Copiar al ejercicio ' + (estado.ejercicio + 1) + '</button>' : '') +
      '<button class="btn" data-acc="nuevoServicio" data-id="' + id + '">+ Contratar servicio</button></div></div><div class="lista">' +
      (serv.length ? serv.map(s => { const av = avance(s); return '<div class="fila clic" data-acc="ir" data-h="#/servicio/' + s.id + '">' + etiquetaTipo(s.tipo) + '<div class="crece"><b>' + esc(nombreServicio(s)) + '</b><div class="sub">' + esc(estadoServicio(s, DB.eventos)) + resumenServicio(s) + '</div></div><div style="width:120px">' + barra(av) + '</div><div class="avance-num">' + av + '%</div></div>'; }).join('')
        : '<div class="vacio">Sin servicios en el ejercicio ' + estado.ejercicio + '.</div>') + '</div></div>';
  }
  function resumenServicio(s) {
    const d = s.datos || {};
    if (s.tipo === 'PIPC') { const r = resolucionesPIPC(s); return r.length ? ' · ' + r.map(x => RESULTADOS_PIPC[x.tipo]).join(' → ') : ''; }
    if (s.tipo === 'SIMULACROS' || s.tipo === 'CAPACITACIONES') { const n = DB.eventos.filter(e => e.servicioId === s.id && !e.cancelado).length; return ' · ' + n + ' programado' + (n === 1 ? '' : 's') + (s.tipo === 'SIMULACROS' ? ' de ' + (d.numSimulacros || 1) : (d.numCursos ? ' de ' + d.numCursos : '')); }
    return '';
  }

  function vistaServicio(id) {
    const s = servicio(id); if (!s) return '<div class="vacio">Servicio no encontrado.</div>';
    const { i, c } = cadena(s);
    titulo(TIPOS[s.tipo].corto + ' · ' + i.nombreComercial);
    const av = avance(s);
    const pest = [['etapas', 'Avance'], ['documentos', 'Documentos'], ['pendientes', 'Pendientes del cliente'], ['notas', 'Bitácora de notas']];
    if (Datos.esDirectora()) pest.push(['pagos', 'Pagos 🔒']);
    if (!pest.some(p => p[0] === estado.pestanaServicio)) estado.pestanaServicio = 'etapas';
    const cuerpo = { etapas: tabEtapas, documentos: tabDocumentos, pendientes: tabPendientes, notas: tabNotas, pagos: tabPagos }[estado.pestanaServicio](s);
    return '<div class="migas"><a href="#/clientes">Clientes</a> › <a href="#/cliente/' + c.id + '">' + esc(nombreCli(c)) + '</a> › <a href="#/inmueble/' + i.id + '">' + esc(i.nombreComercial) + '</a> › ' + esc(TIPOS[s.tipo].corto) + ' ' + s.ejercicio + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><div>' + etiquetaTipo(s.tipo) + ' <span class="etiqueta borde" style="color:var(--marino)">Ejercicio ' + s.ejercicio + '</span><h2 style="margin-top:8px">' + esc(nombreServicio(s)) + '</h2><div class="sub">' + esc(nombreCli(c)) + ' · ' + esc(i.nombreComercial) + '</div></div>' +
      '<button class="btn sec chico" data-acc="editarServicio" data-id="' + id + '">Editar</button></div>' +
      '<div style="display:flex;align-items:center;gap:12px"><div style="flex:1">' + barra(av) + '</div><div class="avance-num" style="font-size:18px">' + av + '%</div></div>' +
      ((s.datos || {}).descripcion ? '<p class="sub" style="margin:10px 0 0">' + esc(s.datos.descripcion) + '</p>' : '') + '</div>' +
      '<div class="pestanas">' + pest.map(p => '<button data-acc="pestana" data-p="' + p[0] + '" class="' + (p[0] === estado.pestanaServicio ? 'activa' : '') + '">' + p[1] + '</button>').join('') + '</div>' + cuerpo;
  }

  function htmlEtapas(obj, etapas, col) {
    return etapas.map(e => {
      const hecha = etapaHecha(obj, e);
      const f = (obj.etapas || {})[e.k] || '';
      const bloqueada = e.auto || e.espera;
      return '<div class="etapa' + (hecha ? ' hecha' : '') + (e.espera ? ' espera' : '') + '"><input type="checkbox" data-cambio="etapa" data-col="' + col + '" data-id="' + obj.id + '" data-k="' + e.k + '"' + (hecha ? ' checked' : '') + (bloqueada ? ' disabled' : '') + '>' +
        '<span class="txt">' + esc(e.t) + (e.espera ? ' <span class="sub">(cuando la autoridad emita APROBADO)</span>' : '') + (e.auto ? ' <span class="sub">(se marca en el historial de resoluciones)</span>' : '') + '</span>' +
        (!e.auto && hecha ? '<input type="date" value="' + f + '" data-cambio="etapaFecha" data-col="' + col + '" data-id="' + obj.id + '" data-k="' + e.k + '" title="Fecha en que se cumplió">' : '') + '</div>';
    }).join('');
  }

  function tabEtapas(s) {
    let h = '';
    const et = etapasServicio(s);
    if (s.tipo === 'STPS') {
      const d = s.datos || {};
      h += '<div class="tarjeta"><h3>Avance de atención y cumplimiento</h3><div class="datos" style="margin-bottom:12px"><div class="dato"><small>Servicio</small><div>' + esc(d.servicioStps || '—') + '</div></div></div>' +
        '<div style="display:flex;align-items:center;gap:14px"><input type="range" min="0" max="100" step="5" value="' + (+d.avance || 0) + '" data-cambio="avanceStps" data-id="' + s.id + '" style="flex:1;accent-color:var(--marino)"><b class="avance-num" id="numStps" style="font-size:18px">' + (+d.avance || 0) + '%</b></div>' +
        '<p class="sub">Mueva la barra para registrar el avance y deje el detalle en la bitácora de notas.</p></div>';
      return h;
    }
    h += '<div class="tarjeta"><h3>Etapas</h3>' + htmlEtapas(s, et, 'servicios') + '</div>';
    if (s.tipo === 'PIPC') h += tarjetaResolucionPIPC(s);
    if (s.tipo === 'SIMULACROS' || s.tipo === 'CAPACITACIONES') {
      const evs = DB.eventos.filter(e => e.servicioId === s.id).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
      const esSim = s.tipo === 'SIMULACROS';
      const n = esSim ? (+(s.datos || {}).numSimulacros || 1) : (+(s.datos || {}).numCursos || 0);
      h += '<div class="tarjeta"><div class="tarjeta-cab"><h3>' + (esSim ? 'Simulacros' : 'Capacitaciones') + ' (' + evs.filter(e => !e.cancelado).length + (n ? ' de ' + n : '') + ')</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec" data-acc="importarPrograma" data-id="' + s.id + '">📄 Importar programa (PDF o Word)</button><button class="btn acento" data-acc="nuevoEvento" data-id="' + s.id + '">+ Programar ' + (esSim ? 'simulacro' : 'capacitación') + '</button></div></div>' +
        (evs.length ? evs.map(ev => '<div style="border:1px solid var(--gris-claro);border-radius:8px;padding:4px 12px;margin-bottom:10px">' + htmlEventoFila(ev, false, true) + (ev.cancelado ? '' : htmlEtapas(ev, etapasEvento(ev), 'eventos')) +
          (ev.clase !== 'simulacro' && !ev.cancelado ? (() => { const cu = (DB.cursos || []).find(x => x.eventoId === ev.id); const n = cu ? (cu.participantes || []).length : 0, f = cu ? (cu.participantes || []).filter(p => p.folio).length : 0;
            return '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 2px"><span class="sub" style="font-weight:600">Participantes y constancias:</span>' + (cu ? '<span class="etiqueta" style="background:' + (n && f === n ? 'var(--verde)' : 'var(--azul)') + '">' + n + ' participante' + (n === 1 ? '' : 's') + ' · ' + f + ' constancia' + (f === 1 ? '' : 's') + '</span>' : '<span class="sub">sin lista</span>') +
              '<button class="btn sec chico" data-acc="constanciasEvento" data-id="' + ev.id + '">🎓 ' + (cu ? 'Abrir' : 'Crear lista') + '</button></div>'; })() : '') +
          (ev.clase === 'simulacro' && !ev.cancelado ? '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:8px 0 2px"><span class="sub" style="font-weight:600">Guion y cronología:</span>' +
            (tieneGuion(ev) ? '<span class="etiqueta" style="background:var(--verde)">' + (ev.guion.cronologia || []).filter(c => !c.fase).length + ' actividades</span>' : '<span class="sub">sin capturar</span>') +
            '<button class="btn sec chico" data-acc="verGuion" data-id="' + ev.id + '">👁 Ver</button><button class="btn sec chico" data-acc="editarGuion" data-id="' + ev.id + '">✎ Editar</button></div>' +
            htmlDocsMini(s, { eventoId: ev.id, categoria: 'guion' }, 'Archivos del guion') : '') +
          (ev.clase === 'simulacro' && !ev.cancelado && ev.fecha >= hoyISO() ? '<div class="etapa"><span class="txt sub">Aviso al cliente: ' + (ev.avisoEnviado ? 'enviado el ' + esc(fechaCorta(ev.avisoEnviado)) : 'se envía el ' + esc(fechaCorta(fechaAviso(ev)))) + '</span><button class="btn wa chico" data-acc="whatsapp" data-id="' + ev.id + '">WhatsApp</button></div>' : '') + '</div>').join('')
          : '<div class="vacio">Aún no hay fechas programadas.</div>') + '</div>';
    }
    return h;
  }

  const COLOR_RES = { no_aprobado: 'var(--rojo)', condicionado: 'var(--ambar)', aprobado: 'var(--verde)' };
  function docsDe(s, filtro) { return DB.documentos.filter(d => d.servicioId === s.id && Object.keys(filtro).every(k => (d[k] || '') === filtro[k])); }
  function htmlDocsMini(s, filtro, etiqueta) {
    const docs = docsDe(s, filtro);
    const attrs = ' data-id="' + s.id + '" data-ev="' + esc(filtro.eventoId || '') + '" data-res="' + esc(filtro.resolucionId || '') + '" data-cat="' + esc(filtro.categoria || '') + '" data-esc="' + esc(filtro.escritoMes || '') + '" data-tit="' + esc(etiqueta) + '"';
    return '<div style="margin:6px 0 4px"><div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="sub" style="font-weight:600">' + esc(etiqueta) + ':</span>' +
      (docs.length ? docs.map(d => enlaceDoc(d)).join('') : '<span class="sub">sin archivos</span>') +
      '<button class="btn sec chico" data-acc="docRes" data-modo="archivo"' + attrs + '>⬆ Subir</button><button class="btn sec chico" data-acc="docRes" data-modo="enlace"' + attrs + '>🔗 Enlace</button></div></div>';
  }

  function tarjetaResolucionPIPC(s) {
    const et = s.etapas || {};
    if (!et.entregaAcuse && !et.ingreso) return '<div class="tarjeta"><h3>Resoluciones de la autoridad</h3><div class="vacio">Se registran después de ingresar el PIPC.</div></div>';
    const resols = resolucionesPIPC(s);
    const hayAprobado = resols.some(r => r.tipo === 'aprobado');
    let h = '<div class="tarjeta"><div class="tarjeta-cab"><h3>Resoluciones de la autoridad (historial)</h3>' +
      (hayAprobado ? '' : '<button class="btn acento" data-acc="nuevaResolucion" data-id="' + s.id + '">+ Registrar resolución</button>') + '</div>' +
      (resols.length ? '' : '<div class="vacio">Aún no hay resolución. Cuando la autoridad notifique NO APROBADO, CONDICIONADO o APROBADO, regístrela aquí con su oficio.</div>');
    resols.forEach((r, n) => {
      const ultima = n === resols.length - 1;
      h += '<div style="border:1px solid var(--gris-claro);border-left:5px solid ' + COLOR_RES[r.tipo] + ';border-radius:8px;padding:10px 14px;margin-bottom:12px">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap"><span class="sub">' + (n + 1) + '.</span><span class="etiqueta" style="background:' + COLOR_RES[r.tipo] + '">' + RESULTADOS_PIPC[r.tipo] + '</span>' +
        '<b>Notificada el ' + esc(fechaCorta(r.fecha) || '—') + '</b>' + (r.oficio ? '<span class="sub">Oficio ' + esc(r.oficio) + '</span>' : '') + (ultima ? '<span class="etiqueta borde" style="color:var(--marino)">Vigente</span>' : '') +
        '<span style="margin-left:auto"><button class="btn-icono" data-acc="editarResolucion" data-id="' + s.id + '" data-r="' + r.id + '" title="Editar">✎</button></span></div>' +
        (r.nota ? '<div class="sub" style="margin:6px 0">' + esc(r.nota) + '</div>' : '') +
        htmlDocsMini(s, { resolucionId: r.id, categoria: 'oficio' }, 'Oficio de resolución');
      if (r.tipo === 'no_aprobado') {
        const lim = plazoSubsanar(r), dias = lim ? difDias(hoyISO(), lim) : 0;
        h += '<div style="background:var(--fondo);border-radius:8px;padding:8px 12px;margin-top:8px"><b style="color:var(--marino)">Cumplimiento de observaciones</b>' +
          (lim ? '<div class="sub">Plazo de 20 días hábiles: vence el <b>' + esc(fechaLarga(lim)) + '</b>' + (r.subsanado ? '' : dias < 0 ? ' · <b style="color:var(--rojo)">VENCIDO</b>' : ' · faltan ' + dias + ' días naturales') + '</div>' : '') +
          '<div class="etapa' + (r.subsanado ? ' hecha' : '') + '" style="border:0"><input type="checkbox" data-cambio="resCampo" data-campo="subsanado" data-id="' + s.id + '" data-r="' + r.id + '"' + (r.subsanado ? ' checked' : '') + '><span class="txt">Observaciones subsanadas y presentadas a la autoridad</span>' +
          (r.subsanado ? '<input type="date" value="' + esc(r.subsanado) + '" data-cambio="resFecha" data-campo="subsanado" data-id="' + s.id + '" data-r="' + r.id + '">' : '') + '</div>' +
          htmlDocsMini(s, { resolucionId: r.id, categoria: 'cumplimiento' }, 'Evidencia del cumplimiento') + '</div>';
      }
      if (r.tipo === 'condicionado') {
        const escs = (r.escritos || []).slice().sort((a, b) => a.fecha.localeCompare(b.fecha));
        h += '<div style="background:var(--fondo);border-radius:8px;padding:8px 12px;margin-top:8px"><div class="tarjeta-cab" style="margin-bottom:4px"><b style="color:var(--marino)">Escritos mensuales de avance (días 1 a 5 de cada mes)</b>' +
          (r.cumplido ? '' : '<button class="btn chico" data-acc="nuevoEscrito" data-id="' + s.id + '" data-r="' + r.id + '">+ Registrar escrito</button>') + '</div>' +
          (escs.length ? escs.map(x => {
            const mes = x.fecha.slice(0, 7);
            return '<div style="border-bottom:1px dashed var(--gris-claro);padding:4px 0"><div style="display:flex;align-items:center;gap:8px"><b style="text-transform:capitalize">' + esc(MESES[+mes.slice(5) - 1]) + ' ' + mes.slice(0, 4) + '</b><span class="sub">presentado el ' + esc(fechaCorta(x.fecha)) + (x.nota ? ' · ' + esc(x.nota) : '') + '</span><button class="btn-icono" style="margin-left:auto" data-acc="borrarEscrito" data-id="' + s.id + '" data-r="' + r.id + '" data-f="' + x.fecha + '" title="Quitar">✕</button></div>' +
              htmlDocsMini(s, { resolucionId: r.id, categoria: 'escrito', escritoMes: mes }, 'Acuse del escrito') + '</div>';
          }).join('') : '<div class="sub">Aún no se registran escritos.</div>') +
          '<div class="etapa' + (r.cumplido ? ' hecha' : '') + '" style="border:0;margin-top:6px"><input type="checkbox" data-cambio="resCampo" data-campo="cumplido" data-id="' + s.id + '" data-r="' + r.id + '"' + (r.cumplido ? ' checked' : '') + '><span class="txt">Condicionantes cumplidas en su totalidad</span>' +
          (r.cumplido ? '<input type="date" value="' + esc(r.cumplido) + '" data-cambio="resFecha" data-campo="cumplido" data-id="' + s.id + '" data-r="' + r.id + '">' : '') + '</div>' +
          htmlDocsMini(s, { resolucionId: r.id, categoria: 'cumplimiento' }, 'Evidencia del cumplimiento') + '</div>';
      }
      if (r.tipo === 'aprobado') h += '<div class="sub" style="margin-top:6px">' + (et.entregaAprobado ? 'Entregado al cliente el ' + esc(fechaCorta(et.entregaAprobado)) + '.' : 'Pendiente: entregar el APROBADO al cliente (márquelo en Etapas).') + '</div>';
      h += '</div>';
    });
    const u = resols[resols.length - 1];
    if (u && !hayAprobado) h += '<p class="sub">' + (u.tipo === 'no_aprobado' ? 'Cuando la autoridad responda a las observaciones, registre la nueva resolución (CONDICIONADO o APROBADO). El NO APROBADO queda en el historial.' : 'Cuando la autoridad emita el APROBADO, regístrelo como nueva resolución. El CONDICIONADO queda en el historial.') + '</p>';
    return h + '</div>';
  }

  function guardarResoluciones(s, lista, msg) {
    const d = Object.assign({}, s.datos, { resoluciones: lista });
    delete d.resultado; delete d.fechaNotificacion; delete d.escritos;
    return guardar('servicios', Object.assign({}, s, { datos: d }), msg);
  }
  function formResolucion(s, r) {
    const lista = resolucionesPIPC(s);
    const ult = lista[lista.length - 1];
    formulario(r ? 'Editar resolución' : 'Registrar resolución de la autoridad', [
      { k: 'tipo', t: 'Resolución', tipo: 'select', req: true, opciones: [{ v: 'no_aprobado', t: 'NO APROBADO' }, { v: 'condicionado', t: 'CONDICIONADO' }, { v: 'aprobado', t: 'APROBADO' }] },
      { k: 'fecha', t: 'Fecha de notificación', tipo: 'date', req: true, ayuda: 'En un NO APROBADO, desde esta fecha corren los 20 días hábiles.' },
      { k: 'oficio', t: 'Número de oficio o folio' },
      { k: 'nota', t: 'Observaciones o condicionantes', tipo: 'textarea', ancho: true }
    ], r || { tipo: ult ? (ult.tipo === 'no_aprobado' ? 'condicionado' : 'aprobado') : 'no_aprobado', fecha: hoyISO() }, async v => {
      if (!r && ult && ult.fecha > v.fecha) return { error: 'La fecha es anterior a la última resolución registrada (' + fechaCorta(ult.fecha) + ').' };
      const nueva = Object.assign({ id: Datos.nuevoId('rsl'), escritos: [] }, r || {}, v);
      await guardarResoluciones(s, r ? lista.map(x => x.id === r.id ? nueva : x) : lista.concat([nueva]), 'Resolución ' + RESULTADOS_PIPC[v.tipo] + ' registrada');
    }, r ? {
      borrar: async () => {
        if (docsDe(s, { resolucionId: r.id }).length) { toast('Primero quite los documentos de esta resolución (pestaña Documentos).', true); return; }
        await guardarResoluciones(servicio(s.id), lista.filter(x => x.id !== r.id), 'Resolución eliminada');
      },
      borrarPregunta: '¿Eliminar esta resolución del historial? No se puede deshacer.'
    } : null);
  }
  function cambiarResolucion(sid, rid, cambios, msg) {
    const s = servicio(sid);
    return guardarResoluciones(s, resolucionesPIPC(s).map(x => x.id === rid ? Object.assign({}, x, cambios) : x), msg);
  }

  function etiquetaDocRes(s, d) {
    if (d.categoria === 'programa') return ' · <span class="etiqueta" style="background:var(--dorado)">Programa anual</span>';
    if (!d.resolucionId) return '';
    const r = resolucionesPIPC(s).find(x => x.id === d.resolucionId);
    const cat = { oficio: 'Oficio de resolución', cumplimiento: 'Evidencia del cumplimiento', escrito: 'Acuse del escrito ' + (d.escritoMes ? MESES[+d.escritoMes.slice(5) - 1] : '') }[d.categoria] || '';
    return r ? ' · <span class="etiqueta" style="background:' + COLOR_RES[r.tipo] + '">' + RESULTADOS_PIPC[r.tipo] + '</span> ' + esc(cat) : '';
  }
  function tabDocumentos(s) {
    const docs = DB.documentos.filter(d => d.servicioId === s.id).sort((a, b) => String(b.fecha).localeCompare(String(a.fecha)));
    const evs = DB.eventos.filter(e => e.servicioId === s.id);
    return '<div class="tarjeta"><div class="tarjeta-cab"><h3>Evidencias y documentos</h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" data-acc="subirDoc" data-id="' + s.id + '">⬆ Subir PDF o foto</button><button class="btn sec" data-acc="enlaceDoc" data-id="' + s.id + '">🔗 Agregar enlace de Drive</button></div></div>' +
      (Datos.MODO_PRUEBA ? '<p class="sub">Versión de prueba: los archivos de más de 1.5 MB solo se ven mientras esta pestaña esté abierta. En la versión real todo se guarda en Google Drive.</p>' : '') +
      '<p class="sub">Toque un documento para verlo. Solo se descarga si usted pulsa «Descargar».</p>' +
      (docs.length ? '<div class="lista">' + docs.map(d => { const ev = evs.find(e => e.id === d.eventoId); return '<div class="fila clic" data-acc="verDoc" data-id="' + d.id + '"><span style="font-size:20px">' + (/\.(jpe?g|png|webp|heic)$/i.test(d.nombre) ? '🖼' : /\.pdf$/i.test(d.nombre) ? '📄' : /\.docx?$/i.test(d.nombre) ? '📝' : '🔗') + '</span><div class="crece"><b style="color:var(--azul)">' + esc(d.nombre) + '</b><div class="sub">' + esc(fechaCorta(d.fecha)) + ' · ' + esc(d.autor || '') + (ev ? ' · ' + esc(tituloEvento(ev)) + ' ' + esc(fechaCorta(ev.fecha)) : '') + etiquetaDocRes(s, d) + '</div></div><button class="btn-icono" data-acc="borrarDoc" data-id="' + d.id + '" title="Quitar">✕</button></div>'; }).join('') + '</div>' : '<div class="vacio">Sin documentos todavía.</div>') + '</div>';
  }
  function tabPendientes(s) {
    const ps = DB.pendientes.filter(p => p.servicioId === s.id).sort((a, b) => (a.entregado ? 1 : 0) - (b.entregado ? 1 : 0) || String(a.fechaLimite || '9').localeCompare(String(b.fechaLimite || '9')));
    return '<div class="tarjeta"><div class="tarjeta-cab"><h3>Documentos que debe entregar el cliente</h3><button class="btn" data-acc="nuevoPendiente" data-id="' + s.id + '">+ Agregar</button></div>' +
      (ps.length ? ps.map(p => '<div class="etapa' + (p.entregado ? ' hecha' : '') + '"><input type="checkbox" data-cambio="pendiente" data-id="' + p.id + '"' + (p.entregado ? ' checked' : '') + '><span class="txt clic" data-acc="editarPendiente" data-id="' + p.id + '">' + esc(p.descripcion) + '<br><span class="sub">' + (p.entregado ? 'Entregado el ' + esc(fechaCorta(p.entregado)) : p.fechaLimite ? 'Fecha límite: ' + esc(fechaCorta(p.fechaLimite)) : 'Sin fecha límite') + '</span></span></div>').join('') : '<div class="vacio">Sin documentos pendientes.</div>') + '</div>';
  }
  function tabNotas(s) {
    const ns = DB.notas.filter(n => n.servicioId === s.id).sort((a, b) => String(b.creado || b.fecha).localeCompare(String(a.creado || a.fecha)));
    return '<div class="tarjeta"><h3>Bitácora de notas</h3><div class="campo"><textarea id="txtNota" rows="3" placeholder="Escriba una nota de seguimiento…"></textarea></div><div style="text-align:right;margin:8px 0 14px"><button class="btn" data-acc="agregarNota" data-id="' + s.id + '">Agregar nota</button></div>' +
      (ns.length ? ns.map(n => '<div class="nota"><small>' + esc(fechaCorta(n.fecha)) + ' · ' + esc(n.autor) + '</small><div>' + esc(n.texto).replace(/\n/g, '<br>') + '</div></div>').join('') : '<div class="vacio">Sin notas.</div>') + '</div>';
  }
  function tabPagos(s) {
    const c = (DB.cobros || []).find(x => x.id === s.id) || { id: s.id, precio: 0, requiereFactura: false, movimientos: [] };
    const r = resumenCobro(c);
    const movs = (c.movimientos || []).slice().sort((a, b) => String(a.fecha).localeCompare(String(b.fecha)));
    return '<div class="tarjeta"><div class="tarjeta-cab"><h3>Control de pagos <span class="privado">SOLO DIRECTORA</span></h3><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sec chico" data-acc="editarServicio" data-id="' + s.id + '">Precio y factura</button><button class="btn chico" data-acc="nuevoMov" data-id="' + s.id + '" data-t="pago">+ Pago / anticipo</button>' + (r.requiereFactura ? '<button class="btn sec chico" data-acc="nuevoMov" data-id="' + s.id + '" data-t="factura">+ Factura emitida</button>' : '') + '</div></div>' +
      '<div class="kpis" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))"><div class="kpi"><b>' + dinero(r.precio) + '</b><span>Precio total</span></div><div class="kpi"><b>' + dinero(r.pagado) + '</b><span>Pagado</span></div><div class="kpi"><b>' + dinero(r.saldo) + '</b><span>Saldo</span></div>' +
      '<div class="kpi"><b>' + (r.requiereFactura ? dinero(r.facturado) : 'No') + '</b><span>' + (r.requiereFactura ? 'Facturado' + (r.porFacturar ? ' · por facturar ' + dinero(r.porFacturar) : '') : 'Requiere factura') + '</span></div></div>' +
      (movs.length ? '<div class="envoltura-tabla"><table class="tabla"><thead><tr><th>Fecha</th><th>Movimiento</th><th>Folio / nota</th><th class="num">Monto</th><th></th></tr></thead><tbody>' + movs.map(m => '<tr><td>' + esc(fechaCorta(m.fecha)) + '</td><td>' + (m.tipo === 'pago' ? 'Pago / anticipo' : 'Factura emitida') + '</td><td>' + esc([m.folio, m.nota].filter(Boolean).join(' · ')) + '</td><td class="num">' + dinero(m.monto) + '</td><td><button class="btn-icono" data-acc="borrarMov" data-id="' + s.id + '" data-m="' + m.id + '">✕</button></td></tr>').join('') + '</tbody></table></div>' : '<div class="vacio">Sin movimientos.</div>') + '</div>';
  }

  /* ---------- Calendario ---------- */
  function vistaCalendario() {
    titulo('Calendario');
    const [a, m] = estado.calMes.split('-').map(Number);
    const primero = new Date(a, m - 1, 1, 12);
    const inicio = sumarDias(aISO(primero), -((primero.getDay() + 6) % 7)); // lunes
    const hoy = hoyISO();
    let celdas = '';
    for (let k = 0; k < 42; k++) {
      const f = sumarDias(inicio, k);
      if (k === 35 && f.slice(0, 7) !== estado.calMes) break;
      const evs = DB.eventos.filter(e => e.fecha === f && !e.cancelado).sort((x, y) => x.hora.localeCompare(y.hora));
      celdas += '<div class="dia' + (f.slice(0, 7) !== estado.calMes ? ' fuera' : '') + (!esHabil(f) ? ' inhabil' : '') + (f === hoy ? ' hoy' : '') + '" data-acc="dia" data-f="' + f + '"><div class="num">' + (+f.slice(8)) + '</div>' +
        evs.map(e => '<div class="ev ' + e.clase + ((e.etapas || {})[e.clase === 'simulacro' ? 'ejecucion' : 'impartida'] ? ' hecho' : '') + '" title="' + esc(e.hora + ' ' + tituloEvento(e) + ' · ' + quienEvento(e)) + '">' + esc(e.hora + ' ' + (cadena(servicio(e.servicioId) || {}).c.nombreComercial || '')) + '</div>').join('') + '</div>';
    }
    return '<div class="tarjeta"><div class="tarjeta-cab"><div class="cal-cab"><button class="btn sec chico" data-acc="mes" data-d="-1">‹</button><h2>' + MESES[m - 1] + ' ' + a + '</h2><button class="btn sec chico" data-acc="mes" data-d="1">›</button><button class="btn sec chico" data-acc="mes" data-d="0">Hoy</button></div>' +
      '<div class="leyenda"><span><i style="background:var(--naranja)"></i>Simulacro</span><span><i style="background:var(--azul)"></i>Capacitación</span><span><i style="background:#FBF7EF;border:1px solid #E5D9BF"></i>Inhábil</span></div></div>' +
      '<div class="cal">' + ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map(d => '<div class="dsem">' + d + '</div>').join('') + celdas + '</div>' +
      '<p class="sub" style="margin-top:10px">Reglas del equipo: máximo ' + LIMITES.simulacrosPorDia + ' simulacros por día sin empalmarse (cada uno ocupa ' + LIMITES.duracionSimulacroMin + ' min) y máximo ' + LIMITES.capacitacionesPorDia + ' capacitaciones por día sin empalmar horarios. Toque un día para ver el detalle o programar.' + (Datos.MODO_PRUEBA ? '' : ' Todo se copia al calendario compartido de Google «Cerebro Grupo VIME».') + '</p></div>';
  }
  function abrirDia(f) {
    const evs = DB.eventos.filter(e => e.fecha === f).sort((x, y) => x.hora.localeCompare(y.hora));
    const prog = DB.servicios.filter(s => (s.tipo === 'SIMULACROS' || s.tipo === 'CAPACITACIONES') && +s.ejercicio === +f.slice(0, 4))
      .map(s => ({ s, n: (s.tipo === 'SIMULACROS' ? 'Simulacro · ' : 'Capacitación · ') + quienEvento({ servicioId: s.id }) })).sort((a, b) => a.n.localeCompare(b.n));
    abrirModal(fechaLarga(f), (!esHabil(f) ? '<p class="sub">Día inhábil (fin de semana o festivo oficial).</p>' : '') +
      (evs.length ? '<div class="lista">' + evs.map(e => htmlEventoFila(e, true)).join('') + '</div>' : '<div class="vacio">Sin eventos este día.</div>') +
      (prog.length ? '<div class="campo" style="margin-top:14px"><label>Programar en este día</label><div style="display:flex;gap:8px"><select id="selProg" style="flex:1">' + prog.map(p => '<option value="' + p.s.id + '">' + esc(p.n) + '</option>').join('') + '</select><button class="btn acento" data-acc="programarDia" data-f="' + f + '">Programar</button></div><span class="ayuda">Solo aparecen los inmuebles con programa de simulacros o capacitaciones del ejercicio ' + f.slice(0, 4) + '.</span></div>' : ''));
  }

  /* ---------- Pagos ---------- */
  function vistaPagos() {
    titulo('Pagos');
    if (!Datos.esDirectora() || !DB.cobros) return '<div class="vacio">Sección privada.</div>';
    const mes = estado.mesPagos;
    const filas = DB.cobros.map(c => { const s = servicio(c.id); if (!s) return null; const { i, c: cl } = cadena(s); return { c, s, i, cl, r: resumenCobro(c), av: avance(s) }; }).filter(Boolean);
    const movMes = []; filas.forEach(f => (f.c.movimientos || []).forEach(m => { if (String(m.fecha).slice(0, 7) === mes) movMes.push({ m, f }); }));
    const ingresos = movMes.filter(x => x.m.tipo === 'pago').reduce((a, x) => a + (+x.m.monto || 0), 0);
    const facturadoMes = movMes.filter(x => x.m.tipo === 'factura').reduce((a, x) => a + (+x.m.monto || 0), 0);
    const tot = k => filas.reduce((a, f) => a + f.r[k], 0);
    const porCliente = {};
    filas.forEach(f => { const k = f.cl.id; porCliente[k] = porCliente[k] || { cl: f.cl, precio: 0, pagado: 0, saldo: 0, porFacturar: 0 }; ['precio', 'pagado', 'saldo', 'porFacturar'].forEach(x => { porCliente[k][x] += f.r[x]; }); });
    const sinCobrar = filas.filter(f => f.av >= 100 && f.r.saldo > 0.009);
    const porFact = filas.filter(f => f.r.porFacturar > 0.009);
    const [a, m] = mes.split('-').map(Number);
    const tabla = (cab, cuerpo, pie) => '<div class="envoltura-tabla"><table class="tabla"><thead><tr>' + cab + '</tr></thead><tbody>' + cuerpo + '</tbody>' + (pie ? '<tfoot><tr>' + pie + '</tr></tfoot>' : '') + '</table></div>';
    const linkS = f => '<a href="#/servicio/' + f.s.id + '" data-acc="irPagos">' + esc(nombreCli(f.cl) + ' · ' + f.i.nombreComercial) + '</a>';
    return '<div class="tarjeta" style="border-top:3px solid var(--dorado)"><div class="tarjeta-cab"><h2>Control de pagos <span class="privado">PRIVADO</span></h2><div class="cal-cab"><button class="btn sec chico" data-acc="mesPagos" data-d="-1">‹</button><b style="min-width:130px;text-align:center;text-transform:capitalize">' + MESES[m - 1] + ' ' + a + '</b><button class="btn sec chico" data-acc="mesPagos" data-d="1">›</button></div></div>' +
      '<div class="kpis"><div class="kpi"><b>' + dinero(ingresos) + '</b><span>Ingresos del mes</span></div><div class="kpi"><b>' + dinero(facturadoMes) + '</b><span>Facturado en el mes</span></div><div class="kpi"><b>' + dinero(tot('saldo')) + '</b><span>Saldo total por cobrar</span></div><div class="kpi"><b>' + dinero(tot('porFacturar')) + '</b><span>Pagado sin facturar</span></div></div>' +
      (movMes.length ? tabla('<th>Fecha</th><th>Cliente · inmueble</th><th>Servicio</th><th>Movimiento</th><th class="num">Monto</th>', movMes.sort((x, y) => String(x.m.fecha).localeCompare(String(y.m.fecha))).map(x => '<tr><td>' + esc(fechaCorta(x.m.fecha)) + '</td><td>' + linkS(x.f) + '</td><td>' + etiquetaTipo(x.f.s.tipo) + '</td><td>' + (x.m.tipo === 'pago' ? 'Pago' : 'Factura ' + esc(x.m.folio || '')) + '</td><td class="num">' + dinero(x.m.monto) + '</td></tr>').join('')) : '<div class="vacio">Sin movimientos en este mes.</div>') + '</div>' +
      '<div class="rejilla dos"><div class="tarjeta"><h3>Servicios concluidos sin cobrar</h3>' + (sinCobrar.length ? tabla('<th>Cliente · inmueble</th><th>Servicio</th><th class="num">Saldo</th>', sinCobrar.map(f => '<tr><td>' + linkS(f) + '</td><td>' + etiquetaTipo(f.s.tipo) + '</td><td class="num">' + dinero(f.r.saldo) + '</td></tr>').join('')) : '<div class="vacio">Ninguno.</div>') + '</div>' +
      '<div class="tarjeta"><h3>Facturas pendientes de emitir</h3>' + (porFact.length ? tabla('<th>Cliente · inmueble</th><th>Servicio</th><th class="num">Por facturar</th>', porFact.map(f => '<tr><td>' + linkS(f) + '</td><td>' + etiquetaTipo(f.s.tipo) + '</td><td class="num">' + dinero(f.r.porFacturar) + '</td></tr>').join('')) : '<div class="vacio">Ninguna.</div>') + '</div></div>' +
      '<div class="tarjeta"><h3>Saldos por cliente</h3>' + tabla('<th>Cliente</th><th class="num">Contratado</th><th class="num">Pagado</th><th class="num">Saldo</th><th class="num">Por facturar</th>',
        Object.values(porCliente).sort((x, y) => y.saldo - x.saldo).map(x => '<tr class="clic" data-acc="ir" data-h="#/cliente/' + x.cl.id + '"><td>' + esc(nombreCli(x.cl)) + '</td><td class="num">' + dinero(x.precio) + '</td><td class="num">' + dinero(x.pagado) + '</td><td class="num">' + dinero(x.saldo) + '</td><td class="num">' + dinero(x.porFacturar) + '</td></tr>').join(''),
        '<td>Total</td><td class="num">' + dinero(tot('precio')) + '</td><td class="num">' + dinero(tot('pagado')) + '</td><td class="num">' + dinero(tot('saldo')) + '</td><td class="num">' + dinero(tot('porFacturar')) + '</td>') +
      '<p class="sub">Los servicios sin precio capturado no aparecen aquí. Capture el precio en cada servicio (botón Editar o pestaña «Pagos»).</p></div>';
  }

  /* ---------- Ajustes ---------- */
  function vistaAjustes() {
    titulo('Ajustes');
    return '<div class="tarjeta"><h3>Equipo</h3><div class="lista">' + USUARIOS.map(u => '<div class="fila"><div class="avatar">' + esc(u.nombre[0]) + '</div><div class="crece"><b>' + esc(u.nombre) + '</b><div class="sub">' + esc(u.rol) + ' · ' + esc(u.correo) + '</div></div>' + (u.pagos ? '<span class="privado">VE PAGOS</span>' : '') + '</div>').join('') + '</div></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Responsables externos</h3><button class="btn chico" data-acc="nuevoResp">+ Agregar</button></div><p class="sub">Terceros que pueden atender simulacros o impartir capacitaciones (aparecen como sugerencia al programar).</p>' +
      ((DB.responsables || []).length ? DB.responsables.map(r => '<div class="fila"><div class="crece">' + esc(r.nombre) + '</div><button class="btn-icono" data-acc="borrarResp" data-id="' + r.id + '">✕</button></div>').join('') : '<div class="vacio">Ninguno.</div>') + '</div>' +
      tarjetaFirma() +
      '<div class="tarjeta"><h3>Días inhábiles considerados (' + estado.ejercicio + ')</h3><p class="sub">Sábados, domingos y días de descanso obligatorio de la Ley Federal del Trabajo:</p><div class="chips">' + festivos(estado.ejercicio).map(f => '<span class="etiqueta borde" style="color:var(--marino)">' + esc(fechaCorta(f)) + '</span>').join('') + '</div></div>' +
      '<div class="tarjeta"><h3>Acerca de</h3><p>Cerebro Grupo VIME · versión ' + esc(CONFIG.VERSION) + '</p>' +
      (Datos.MODO_PRUEBA ? '<p class="sub">Está usando la <b>versión de prueba</b>: los datos son ficticios y se guardan solo en este navegador.</p><button class="btn peligro" data-acc="reiniciar">Reiniciar datos de prueba</button>' : '<button class="btn sec" data-acc="salir">Cerrar sesión</button>') + '</div>';
  }

  /* ---------- Importar programa anual (PDF o Word) ---------- */
  function dialogoImportar(servicioId) {
    const s = servicio(servicioId);
    const esSim = s.tipo === 'SIMULACROS';
    abrirModal('Importar programa de ' + (esSim ? 'simulacros' : 'capacitaciones') + ' · ' + quienEvento({ servicioId }),
      '<form class="form" id="formImp"><div class="campo ancho"><label>Programa anual en PDF o Word (.docx)</label><input type="file" id="impArchivo" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" required>' +
      '<span class="ayuda">La app lee fechas, horas, ' + (esSim ? 'tipo (de campo o de gabinete) e hipótesis' : 'nombre del curso, carga horaria y modalidad') + '. Antes de guardar podrá revisar y corregir cada renglón. Funciona mejor si el programa está en una tabla.</span></div>' +
      '<div class="campo check ancho"><input type="checkbox" id="impGuardar" checked><label for="impGuardar">Guardar el archivo en Documentos como evidencia del programa</label></div>' +
      '<div class="error-form" id="errImp" hidden></div><div class="form-pie"><button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button class="btn acento" type="submit">Leer programa</button></div></form>');
    $('#formImp').addEventListener('submit', async e => {
      e.preventDefault();
      const btn = e.submitter, err = $('#errImp'), f = $('#impArchivo').files[0];
      if (!f) return;
      btn.disabled = true; btn.textContent = 'Leyendo…'; err.hidden = true;
      try {
        const leido = await Importador.leerArchivo(f);
        const props = Importador.extraerEventos(leido.filas, esSim ? 'simulacro' : 'capacitacion', +s.ejercicio);
        if (!props.length) throw new Error('No se encontraron fechas en el archivo. Revise que el programa indique día y mes de cada ' + (esSim ? 'simulacro' : 'curso') + '.');
        if (esSim) {
          const g = Importador.extraerGuiones(leido.bloques, props, +s.ejercicio);
          Object.keys(g).forEach(k => {
            const p = props[k];
            const gd = Importador.guionDesdeLineas(g[k].lineas);
            p.guionDatos = gd.guion; p.alcance = gd.alcance; p.programacion = gd.programacion;
            p.tieneGuion = g[k].guion; p.tieneCronologia = g[k].cronologia && gd.guion.cronologia.length > 0;
            // La hipótesis detallada del guion (p. ej. «Incendio con un lesionado») queda como escenario
            if (g[k].hipotesis && g[k].hipotesis.toLowerCase() !== String(p.hipotesis || '').toLowerCase()) p.escenario = g[k].hipotesis;
          });
        }
        revisarImportacion(s, props, $('#impGuardar').checked ? f : null);
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = 'Leer programa'; }
    });
  }

  function revisarImportacion(s, props, archivo) {
    const esSim = s.tipo === 'SIMULACROS';
    const resp = listaResponsables();
    const yo = Datos.usuario().nombre;
    props.forEach(p => { if (!p.responsable) p.responsable = yo; });
    const celda = (k, i, tipo, extra) => '<input data-imp="' + k + '" data-i="' + i + '" type="' + tipo + '" value="' + esc(props[i][k] == null ? '' : props[i][k]) + '"' + (extra || '') + ' style="width:100%;font:inherit;font-size:12px;border:1px solid #CDD5DF;border-radius:6px;padding:4px 6px">';
    const cab = esSim ? '<th></th><th>Fecha</th><th>Hora</th><th>Tipo</th><th>Hipótesis</th><th>Guion / cronología</th><th>Atiende</th><th>Estado</th>'
      : '<th></th><th>Fecha</th><th>Hora</th><th>Curso</th><th>Temario</th><th>Horas</th><th>Modalidad</th><th>Imparte</th><th>Estado</th>';
    const filas = props.map((p, i) => '<tr title="' + esc(p.texto) + '"><td><input type="checkbox" data-imp="incluir" data-i="' + i + '"' + (p.incluir ? ' checked' : '') + '></td>' +
      '<td style="min-width:130px">' + celda('fecha', i, 'date') + (p.nota && !p.fecha ? '<div class="sub" style="color:var(--ambar)">' + esc(MESES[(p.mes || 1) - 1]) + ': elija el día</div>' : '') + '</td>' +
      '<td style="min-width:95px">' + celda('hora', i, 'time') + '</td>' +
      (esSim ? '<td><select data-imp="tipoSimulacro" data-i="' + i + '" style="font:inherit;font-size:12px">' + TIPOS_SIMULACRO.map(t => '<option' + (t === p.tipoSimulacro ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></td>' +
        '<td style="min-width:140px">' + celda('hipotesis', i, 'text', ' list="l_imp_hip"') + '</td>' +
        '<td class="sub" style="min-width:120px">' + (p.tieneGuion ? '<span style="color:var(--verde)">✓ Guion</span>' : '— sin guion') + '<br>' + (p.tieneCronologia ? '<span style="color:var(--verde)">✓ Cronología</span>' : '— sin cronología') + '</td>'
        : '<td style="min-width:170px">' + celda('curso', i, 'text', ' list="l_imp_cur"') + '</td>' +
        '<td style="min-width:220px"><textarea data-imp="temario" data-i="' + i + '" rows="3" style="width:100%;font:inherit;font-size:12px;border:1px solid #CDD5DF;border-radius:6px;padding:4px 6px">' + esc(p.temario || '') + '</textarea></td><td style="width:70px">' + celda('cargaHoraria', i, 'number', ' min="0.5" step="0.5"') + '</td>' +
        '<td><select data-imp="modalidad" data-i="' + i + '" style="font:inherit;font-size:12px">' + MODALIDADES.map(t => '<option' + (t === p.modalidad ? ' selected' : '') + '>' + t + '</option>').join('') + '</select></td>') +
      '<td style="min-width:120px">' + celda('responsable', i, 'text', ' list="l_imp_resp"') + '</td><td class="sub" data-estado="' + i + '" style="min-width:150px"></td></tr>').join('');
    abrirModal('Revisar fechas encontradas (' + props.length + ')',
      '<p class="sub">Revise y corrija cada renglón. Solo se crean los marcados que estén en verde; se aplican las reglas del calendario (máximo ' + LIMITES.simulacrosPorDia + ' simulacros y ' + LIMITES.capacitacionesPorDia + ' capacitaciones por día, sin empalmes). Pase el cursor sobre un renglón para ver el texto original.</p>' +
      '<datalist id="l_imp_hip">' + HIPOTESIS.map(h => '<option value="' + esc(h) + '">').join('') + '</datalist><datalist id="l_imp_cur">' + CURSOS.map(h => '<option value="' + esc(h) + '">').join('') + '</datalist><datalist id="l_imp_resp">' + resp.map(h => '<option value="' + esc(h) + '">').join('') + '</datalist>' +
      '<div class="envoltura-tabla"><table class="tabla" id="tablaImp"><thead><tr>' + cab + '</tr></thead><tbody>' + filas + '</tbody></table></div>' +
      '<div class="error-form" id="errImp2" hidden style="margin-top:10px"></div><div class="form-pie" style="margin-top:12px"><span class="sub izq" id="resumenImp"></span><button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button type="button" class="btn acento" id="btnCrearImp">Crear</button></div>');
    document.querySelector('.modal').classList.add('ancha');

    const nombreDe = o => o._nuevo ? 'otro renglón de este programa' : quienEvento(o);
    function evaluar() {
      const aceptados = [];
      let n = 0;
      props.forEach((p, i) => {
        const el = document.querySelector('[data-estado="' + i + '"]');
        if (!p.incluir) { el.innerHTML = '<span style="color:#9AA1AA">No se importa</span>'; p.ok = false; return; }
        const ev = { id: 'imp' + i, _nuevo: true, servicioId: s.id, clase: esSim ? 'simulacro' : 'capacitacion', fecha: p.fecha, hora: p.hora, cargaHoraria: +p.cargaHoraria || 0 };
        let problema = !p.fecha ? 'Falta el día.' : !p.hora ? 'Falta la hora.' : esSim && !p.hipotesis ? 'Falta la hipótesis.' : !esSim && !p.curso ? 'Falta el curso.' : !esSim && !(+p.cargaHoraria > 0) ? 'Falta la carga horaria.' : !p.responsable ? 'Falta quién atiende.' : null;
        if (!problema && String(p.fecha).slice(0, 4) !== String(s.ejercicio)) problema = 'La fecha no es del ejercicio ' + s.ejercicio + '.';
        if (!problema) problema = validarEvento(ev, DB.eventos.concat(aceptados), nombreDe);
        p.ok = !problema;
        el.innerHTML = problema ? '<span style="color:var(--rojo)">' + esc(problema) + '</span>' : '<span style="color:var(--verde);font-weight:600">✓ Listo</span>';
        if (!problema) { aceptados.push(ev); n++; }
      });
      $('#resumenImp').textContent = n + ' de ' + props.length + ' listos para crear';
      $('#btnCrearImp').textContent = 'Crear ' + n + ' ' + (esSim ? 'simulacro' : 'capacitación') + (n === 1 ? '' : (esSim ? 's' : 'es'));
      $('#btnCrearImp').disabled = !n;
    }
    $('#tablaImp').addEventListener('input', e => {
      const t = e.target, i = +t.dataset.i, k = t.dataset.imp; if (!k) return;
      props[i][k] = t.type === 'checkbox' ? t.checked : t.value; evaluar();
    });
    $('#tablaImp').addEventListener('change', e => { const t = e.target; if (t.dataset.imp) { props[+t.dataset.i][t.dataset.imp] = t.type === 'checkbox' ? t.checked : t.value; evaluar(); } });
    evaluar();

    $('#btnCrearImp').addEventListener('click', async () => {
      const btn = $('#btnCrearImp'), err = $('#errImp2');
      const listos = props.filter(p => p.incluir && p.ok);
      const contratados = esSim ? (+(s.datos || {}).numSimulacros || 1) : (+(s.datos || {}).numCursos || 0);
      const yaHay = DB.eventos.filter(e => e.servicioId === s.id && !e.cancelado).length;
      if (contratados && yaHay + listos.length > contratados && !confirm('El servicio tiene ' + contratados + ' contratado(s), ya hay ' + yaHay + ' y se agregarían ' + listos.length + '. ¿Continuar?')) return;
      btn.disabled = true;
      try {
        let k = 0;
        for (const p of listos) {
          btn.textContent = 'Creando ' + (++k) + ' de ' + listos.length + '…';
          const ev = esSim ? { tipoSimulacro: p.tipoSimulacro, hipotesis: p.hipotesis, escenario: p.escenario || '', alcance: p.alcance || '', programacion: p.programacion || 'Con previo aviso',
            guion: Object.assign({ tipoFenomeno: claseFenomeno((p.escenario || '') + ' ' + p.hipotesis) }, p.guionDatos || {}) } : { curso: p.curso, temario: p.temario || '', cargaHoraria: +p.cargaHoraria, modalidad: p.modalidad };
          const g = await Datos.guardar('eventos', Object.assign({ servicioId: s.id, clase: esSim ? 'simulacro' : 'capacitacion', fecha: p.fecha, hora: p.hora, responsable: p.responsable, etapas: {}, importado: true }, ev));
        }
        if (archivo) {
          btn.textContent = 'Guardando el programa…';
          const { i, c } = cadena(s);
          const r = await Datos.subirArchivo(archivo, [nombreCli(c), i.nombreComercial, String(s.ejercicio), TIPOS[s.tipo].corto]);
          await Datos.guardar('documentos', { servicioId: s.id, categoria: 'programa', nombre: r.nombre, url: r.url, driveId: r.driveId || '', autor: Datos.usuario().nombre, fecha: hoyISO() });
        }
        cerrarModal(); refrescarDB(); toast(listos.length + ' fecha(s) agregadas al calendario');
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; refrescarDB(); }
    });
  }

  /* ---------- Visor de documentos: se ven en pantalla; solo se descargan si se pide ---------- */
  function idDrive(url) { const m = String(url || '').match(/\/d\/([\w-]{20,})|[?&]id=([\w-]{20,})/); return m ? (m[1] || m[2]) : ''; }
  async function verDocumento(id) {
    const d = porId('documentos', id); if (!d) return;
    verArchivo({ nombre: d.nombre || 'documento', sub: fechaCorta(d.fecha) + (d.autor ? ' · ' + d.autor : ''), url: d.url, obtener: () => Datos.obtenerArchivo(d) });
  }
  /** Muestra un archivo en pantalla; solo se descarga con el botón «Descargar». */
  async function verArchivo(o) {
    const nombre = o.nombre;
    abrirModal(nombre, '<div style="display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap;margin-bottom:10px"><span class="sub" style="margin-right:auto;align-self:center">' + esc(o.sub || '') + '</span>' +
      (o.extraBotones || '') + '<button class="btn sec chico" id="visorDescargar" disabled>⬇ Descargar</button></div>' +
      '<div id="visorCuerpo" style="background:#E9ECF1;border-radius:8px;padding:12px;min-height:200px;max-height:72vh;overflow:auto"><div class="vacio">' + esc(o.cargando || 'Abriendo documento…') + '</div></div>');
    document.querySelector('.modal').classList.add('ancha');
    const cuerpo = $('#visorCuerpo'), btn = $('#visorDescargar');
    const marco = (html) => {
      const f = document.createElement('iframe');
      f.setAttribute('sandbox', '');
      f.style.cssText = 'width:100%;height:68vh;border:0;background:#fff;border-radius:6px';
      f.srcdoc = '<!doctype html><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;font-size:14px;line-height:1.45;padding:18px 24px;color:#222}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:4px 6px;vertical-align:top}h1,h2{color:#0C3B6F}img{max-width:100%}</style>' + html;
      cuerpo.innerHTML = ''; cuerpo.style.padding = '0'; cuerpo.appendChild(f);
    };
    try {
      const blob = await o.obtener();
      if (!blob) {
        const idd = idDrive(o.url);
        if (idd) { cuerpo.innerHTML = '<iframe src="https://drive.google.com/file/d/' + idd + '/preview" style="width:100%;height:68vh;border:0;border-radius:6px;background:#fff" allow="autoplay"></iframe>'; cuerpo.style.padding = '0'; }
        else cuerpo.innerHTML = '<div class="vacio">Este enlace no se puede mostrar dentro de la app.</div>';
        btn.disabled = false; btn.textContent = '↗ Abrir en otra pestaña';
        btn.onclick = () => window.open(o.url, '_blank', 'noopener');
        return;
      }
      const url = URL.createObjectURL(blob);
      btn.disabled = false;
      btn.onclick = () => { const a = document.createElement('a'); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove(); };
      const tipo = blob.type || '';
      if (/pdf/.test(tipo) || /\.pdf$/i.test(nombre)) await Importador.pdfEnPantalla(await blob.arrayBuffer(), cuerpo);
      else if (/^image\//.test(tipo) || /\.(jpe?g|png|webp|gif)$/i.test(nombre)) cuerpo.innerHTML = '<img src="' + url + '" alt="" style="max-width:100%;display:block;margin:0 auto;border-radius:6px">';
      else if (/\.docx$/i.test(nombre) || /wordprocessingml/.test(tipo)) { cuerpo.style.padding = '0'; await Docs.verDocx(blob, cuerpo); }
      else if (/\.doc$/i.test(nombre) || /msword|html/.test(tipo)) {
        const texto = await blob.text();
        if (/<html|<body|<table|<p/i.test(texto)) marco(texto.replace(/^\ufeff/, ''));
        else cuerpo.innerHTML = '<div class="vacio">Este documento de Word antiguo no se puede mostrar en pantalla. Use «Descargar».</div>';
      } else cuerpo.innerHTML = '<div class="vacio">Este tipo de archivo no se puede mostrar en pantalla. Use «Descargar».</div>';
    } catch (ex) {
      cuerpo.innerHTML = '<div class="error-form">No se pudo abrir el documento: ' + esc(ex.message) + '</div>';
    }
  }

  /* ---------- Guion y cronología (formato oficial) ---------- */
  function tieneGuion(ev) { const g = ev.guion || {}; return !!((g.cronologia && g.cronologia.length) || g.objetivos || g.tipoFenomeno || Object.keys(g.estructura || {}).length); }
  function logosDe(inm) { return { izq: inm && inm.logoIzq !== undefined ? inm.logoIzq : 'gv', der: (inm && inm.logoDer) || '' }; }
  function nombreArchivo(t) { return t.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function verGuion(evId) {
    const ev = porId('eventos', evId); const s = servicio(ev.servicioId) || {}; const { i } = cadena(s);
    const n = numeroSimulacro(ev, DB.eventos);
    verArchivo({
      nombre: nombreArchivo('Guion y cronologia - ' + (i.nombreComercial || '') + ' - Simulacro ' + n + ' - ' + ev.fecha + '.docx'),
      sub: tituloEvento(ev) + ' · ' + fechaLarga(ev.fecha), cargando: 'Generando el guion con el formato de Grupo VIME…',
      extraBotones: '<button class="btn sec chico" data-acc="editarGuion" data-id="' + ev.id + '">✎ Editar</button>',
      obtener: () => Docs.guion({ ev, inmueble: i, numero: n, logos: logosDe(i), db: DB })
    });
  }
  function textoCronologia(lista) { return (lista || []).map(c => c.fase ? c.fase : ((c.hora ? c.hora + ' ' : '') + c.texto)).join('\n'); }
  function cronologiaDeTexto(t) {
    return String(t || '').split(/\n+/).map(l => l.trim()).filter(Boolean).map(l => {
      if (/^fase\b/i.test(l)) return { fase: l };
      const m = l.match(/^(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:hrs?\.?)?\s*[-–:]?\s*(.*)$/i);
      return m ? { hora: m[1], texto: m[2] } : { hora: '', texto: l };
    });
  }
  function formGuion(evId) {
    const ev = porId('eventos', evId); const g = ev.guion || {}; const est = g.estructura || {}; const sci = g.sci || {};
    const campos = [
      { k: 'alcance', t: 'Alcance', tipo: 'select', opciones: ['', 'Parcial', 'Total'] },
      { k: 'programacion', t: 'Programación', tipo: 'select', opciones: ['Con previo aviso', 'Sin previo aviso'] },
      { k: 'objetivos', t: '1. Objetivo(s) del simulacro', tipo: 'textarea', ancho: true, ayuda: 'Claros, medibles y alineados a la hipótesis. Un objetivo por renglón.' },
      { k: 'tipoFenomeno', t: '2. Tipo de fenómeno', lista: Docs.FENOMENOS },
      { k: 'magnitud', t: 'Magnitud / Intensidad' },
      { k: 'areaAfectada', t: 'Área afectada' },
      { k: 'secundarios', t: 'Fenómenos secundarios' },
      { k: 'danos', t: '3. Daños simulados' },
      { k: 'lesiones', t: 'Lesiones simuladas' },
      { k: 'obstaculos', t: 'Obstáculos en rutas' },
      { k: 'condiciones', t: 'Condiciones ambientales simuladas' }
    ];
    Docs.ESTRUCTURA.forEach(([a], j) => campos.push({ k: 'est' + j, t: (j === 0 ? '4. ' : '') + 'Responsable · ' + a }));
    Docs.INSTALACIONES.forEach(([c, n], j) => { campos.push({ k: 'sciU_' + c, t: (j === 0 ? '5. ' : '') + n + ' · ubicación' }, { k: 'sciR_' + c, t: n + ' · responsable' }); });
    campos.push({ k: 'cronologia', t: '6. Cronología', tipo: 'textarea', filas: 14, ancho: true, ayuda: 'Una actividad por renglón, empezando con la hora (p. ej. «11:00:05 Se inicia la evacuación…»). Los renglones que empiezan con «FASE» se muestran como subtítulo.' });
    const val = Object.assign({}, g, { alcance: ev.alcance || '', programacion: ev.programacion || 'Con previo aviso', cronologia: textoCronologia(g.cronologia) });
    Docs.ESTRUCTURA.forEach(([a], j) => { val['est' + j] = est[a] || ''; });
    Docs.INSTALACIONES.forEach(([c]) => { val['sciU_' + c] = (sci[c] || {}).ubicacion || ''; val['sciR_' + c] = (sci[c] || {}).responsable || ''; });
    formulario('Guion y cronología · ' + tituloEvento(ev) + ' · ' + fechaCorta(ev.fecha), campos, val, async v => {
      const nuevo = Object.assign({}, g, { objetivos: v.objetivos, tipoFenomeno: v.tipoFenomeno, magnitud: v.magnitud, areaAfectada: v.areaAfectada, secundarios: v.secundarios, danos: v.danos, lesiones: v.lesiones, obstaculos: v.obstaculos, condiciones: v.condiciones, estructura: {}, sci: {}, cronologia: cronologiaDeTexto(v.cronologia) });
      Docs.ESTRUCTURA.forEach(([a], j) => { if (v['est' + j]) nuevo.estructura[a] = v['est' + j]; });
      Docs.INSTALACIONES.forEach(([c]) => { if (v['sciU_' + c] || v['sciR_' + c]) nuevo.sci[c] = { ubicacion: v['sciU_' + c], responsable: v['sciR_' + c] }; });
      await guardar('eventos', Object.assign({}, porId('eventos', evId), { alcance: v.alcance, programacion: v.programacion, guion: nuevo }), 'Guion guardado');
    });
    document.querySelector('.modal').classList.add('ancha');
  }

  /* ---------- Reporte de avance de cumplimiento (sin pagos) ---------- */
  function datosReporte(c, inmIds, ejercicio) {
    const estadoEv = e => e.cancelado ? 'Cancelado' : (e.etapas || {})[e.clase === 'simulacro' ? 'ejecucion' : 'impartida'] ? ((e.etapas || {}).evidencia ? 'Realizado con evidencia' : 'Realizado') : (e.fecha < hoyISO() ? 'Sin registrar' : 'Programado');
    return DB.inmuebles.filter(i => inmIds.indexOf(i.id) >= 0).sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial)).map(i => ({
      inm: i,
      servicios: DB.servicios.filter(s => s.inmuebleId === i.id && +s.ejercicio === +ejercicio).sort((a, b) => ORDEN_TIPOS.indexOf(a.tipo) - ORDEN_TIPOS.indexOf(b.tipo)).map(s => {
        const d = s.datos || {};
        const r = {
          nombre: nombreServicio(s), estado: estadoServicio(s, DB.eventos), avance: avance(s),
          etapas: etapasServicio(s).map(e => ({ t: e.t, hecha: etapaHecha(s, e), espera: !!e.espera && !etapaHecha(s, e), fecha: fechaCorta((s.etapas || {})[e.k]) })),
          pendientes: DB.pendientes.filter(p => p.servicioId === s.id).map(p => ({ descripcion: p.descripcion, fechaLimite: fechaCorta(p.fechaLimite), entregado: fechaCorta(p.entregado) })),
          nota: s.tipo === 'STPS' ? (d.servicioStps ? 'Servicio: ' + d.servicioStps + '. ' : '') + (d.descripcion || '') : ''
        };
        if (s.tipo === 'PIPC') r.resoluciones = resolucionesPIPC(s).map(x => ({
          tipo: RESULTADOS_PIPC[x.tipo], fecha: fechaCorta(x.fecha), oficio: x.oficio,
          seguimiento: x.tipo === 'no_aprobado' ? (x.subsanado ? 'Observaciones subsanadas el ' + fechaCorta(x.subsanado) : 'Plazo para subsanar: ' + fechaCorta(plazoSubsanar(x))) :
            x.tipo === 'condicionado' ? ((x.escritos || []).length + ' escrito(s) mensual(es) presentados' + (x.cumplido ? '; condicionantes cumplidas el ' + fechaCorta(x.cumplido) : '')) : 'Aprobado'
        }));
        if (s.tipo === 'SIMULACROS' || s.tipo === 'CAPACITACIONES') r.eventos = DB.eventos.filter(e => e.servicioId === s.id).sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora))
          .map(e => Object.assign({}, e, { fechaTxt: fechaCorta(e.fecha), estado: estadoEv(e) }));
        return r;
      })
    }));
  }
  function dialogoReporte(clienteId) {
    const c = cliente(clienteId);
    const inms = DB.inmuebles.filter(i => i.clienteId === clienteId).sort((a, b) => a.nombreComercial.localeCompare(b.nombreComercial));
    if (!inms.length) { toast('Este cliente aún no tiene inmuebles.', true); return; }
    const primero = inms.find(i => i.logoDer) || inms[0];
    const sel = logosDe(primero);
    abrirModal('Reporte de avance · ' + nombreCli(c), '<form class="form" id="formRep">' +
      '<div class="campo ancho"><label for="repAlcance">¿Qué incluye?</label><select id="repAlcance"><option value="">General: todos los inmuebles (' + inms.length + ')</option>' + inms.map(i => '<option value="' + i.id + '">Solo ' + esc(i.nombreComercial) + '</option>').join('') + '</select></div>' +
      '<div class="campo"><label for="repEjercicio">Ejercicio</label>' + selectorEjercicio().replace('id="selEjercicio"', 'id="repEjercicio"') + '</div>' +
      '<div class="campo"><label>Contenido</label><span class="sub">Avance de cada servicio, etapas, resoluciones de la autoridad, simulacros, capacitaciones y documentos pendientes del cliente. <b>No incluye pagos.</b></span></div>' +
      '<div class="campo ancho" id="cajaLogos"></div>' +
      '<div class="form-pie"><button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button class="btn acento" type="submit">👁 Ver reporte</button></div></form>');
    pintarLogos(sel);
    $('#repAlcance').onchange = e => { const i = inms.find(x => x.id === e.target.value); if (i) { const l = logosDe(i); sel.izq = l.izq; sel.der = l.der; pintarLogos(sel); } };
    $('#formRep').addEventListener('submit', e => {
      e.preventDefault();
      const unico = $('#repAlcance').value, ejercicio = +$('#repEjercicio').value;
      const ids = unico ? [unico] : inms.map(i => i.id);
      const titulo = unico ? inmueble(unico).nombreComercial : 'General';
      const logos = { izq: sel.izq, der: sel.der };
      verArchivo({
        nombre: nombreArchivo('Reporte de avance - ' + nombreCli(c) + ' - ' + titulo + ' - ' + ejercicio + '.docx'),
        sub: (unico ? 'Inmueble: ' + titulo : 'Todos los inmuebles') + ' · ejercicio ' + ejercicio, cargando: 'Generando el reporte…',
        obtener: () => Docs.reporte({ db: DB, logos, cliente: c, ejercicio, fechaCorte: fechaLarga(hoyISO()), alcance: unico ? 'Inmueble: ' + titulo : 'General (' + ids.length + ' inmueble' + (ids.length === 1 ? '' : 's') + ')', inmuebles: datosReporte(c, ids, ejercicio) })
      });
    });
  }

  /** Muestra un texto con formato de WhatsApp (*negritas*, _cursivas_, ```monoespaciado```). */
  function formatoWhatsApp(t) {
    return esc(t).replace(/\*([^*\n]+)\*/g, '<b>$1</b>').replace(/_([^_\n]+)_/g, '<i>$1</i>')
      .replace(/```([^`]+)```/g, '<code style="color:#178c46;font-weight:700">$1</code>').replace(/\n/g, '<br>');
  }
  function tarjetaFirma() {
    const ejemplo = mensajeSimulacro({ id: 'x', servicioId: 'x', clase: 'simulacro', fecha: sumarDias(hoyISO(), 7), hora: '10:30', tipoSimulacro: 'De campo', hipotesis: 'Incendio' }, { nombreComercial: 'Nombre del inmueble' }, [], firmaWhatsApp());
    return '<div class="tarjeta"><div class="tarjeta-cab"><h3>Aviso de simulacro por WhatsApp</h3><button class="btn sec chico" data-acc="editarFirma">Cambiar firma</button></div>' +
      '<p class="sub">Así se verá el mensaje. El número de simulacro del año (primer, segundo… quinto) se calcula solo.</p>' +
      '<div style="background:#DCF8C6;border-radius:10px;padding:12px 14px;max-width:460px;font-size:14px;line-height:1.5">' + formatoWhatsApp(ejemplo) + '</div></div>';
  }

  /* ======================= Acciones ======================= */
  const ACC = {
    cerrarModal, recargar: () => cargarTodo(true),
    ir: el => { location.hash = el.dataset.h; },
    irPagos: () => { estado.pestanaServicio = 'pagos'; },
    nuevoCliente: () => formCliente(),
    nuevoCurso: () => formCurso(),
    editarCurso: el => formCurso(cursoPorId(el.dataset.id)),
    nuevoInstructor: () => formInstructor(),
    editarInstructor: el => formInstructor(instructorDe(el.dataset.id)),
    importarLista: el => dialogoLista(el.dataset.id),
    nuevoParticipante: el => formParticipante(el.dataset.id),
    editarParticipante: el => formParticipante(el.dataset.id, +el.dataset.k),
    quitarParticipante: async el => { const cu = cursoPorId(el.dataset.id); const p = cu.participantes[+el.dataset.k]; if (!confirm('¿Quitar a ' + nombreParticipante(p) + ' de la lista?')) return; await guardar('cursos', Object.assign({}, cu, { participantes: cu.participantes.filter((x, j) => j !== +el.dataset.k) }), 'Participante quitado'); },
    emitirCurso: el => emitirCurso(el.dataset.id),
    generarConstancias: el => generarConstancias(el.dataset.id),
    bajarLote: () => { if (ultimoLote) descargar(new Blob([ultimoLote.res.lote], { type: 'application/pdf' }), ultimoLote.nombreLote); },
    bajarZip: async () => { if (!ultimoLote) return; try { descargar(await Constancias.zip(ultimoLote.res, ultimoLote.nombreLote), ultimoLote.nombreZip); } catch (e) { toast(e.message, true); } },
    loteDrive: () => loteDrive(),
    ordenClaude: el => ordenClaude(el.dataset.id),
    cancelarConst: el => estadoConstancia(el.dataset.id, true),
    reactivarConst: el => estadoConstancia(el.dataset.id, false),
    constanciasEvento: el => constanciasEvento(el.dataset.id),
    editarCliente: el => formCliente(porId('clientes', el.dataset.id)),
    nuevoInmueble: el => formInmueble(null, el.dataset.id),
    editarInmueble: el => { const i = porId('inmuebles', el.dataset.id); formInmueble(i, i.clienteId); },
    nuevoServicio: el => formServicio(el.dataset.id),
    editarServicio: el => { const s = servicio(el.dataset.id); formServicio(s.inmuebleId, s); },
    nuevoEvento: el => formEvento(el.dataset.id),
    evento: el => { const ev = porId('eventos', el.dataset.id); formEvento(ev.servicioId, ev); },
    pestana: el => { estado.pestanaServicio = el.dataset.p; pintar(); },
    copiarEjercicio: async el => {
      const sig = estado.ejercicio + 1;
      const actuales = DB.servicios.filter(s => s.inmuebleId === el.dataset.id && +s.ejercicio === estado.ejercicio);
      const nuevos = actuales.filter(s => s.tipo === 'STPS' || !DB.servicios.some(x => x.inmuebleId === s.inmuebleId && x.tipo === s.tipo && +x.ejercicio === sig));
      if (!nuevos.length) { toast('Esos servicios ya existen en ' + sig + '.'); return; }
      if (!confirm('¿Copiar ' + nuevos.length + ' servicio(s) al ejercicio ' + sig + '? Se crean en cero, sin fechas ni avance.')) return;
      for (const s of nuevos) {
        const d = Object.assign({}, s.datos || {}); delete d.resultado; delete d.fechaNotificacion; delete d.escritos; delete d.resoluciones; if (s.tipo === 'STPS') d.avance = 0;
        await Datos.guardar('servicios', { inmuebleId: s.inmuebleId, tipo: s.tipo, ejercicio: sig, modalidad: s.modalidad, etapas: {}, datos: d });
      }
      estado.ejercicio = sig; refrescarDB(); toast('Servicios copiados a ' + sig);
    },
    whatsapp: async el => {
      const ev = porId('eventos', el.dataset.id); const s = servicio(ev.servicioId); const { i, c } = cadena(s);
      const tel = telWhatsApp(i.contactoTel);
      if (!tel) { toast('El inmueble no tiene teléfono de contacto.', true); return; }
      window.open('https://wa.me/' + tel + '?text=' + encodeURIComponent(mensajeSimulacro(ev, i, DB.eventos, firmaWhatsApp())), '_blank', 'noopener');
      await guardar('eventos', Object.assign({}, ev, { avisoEnviado: hoyISO() }), 'Aviso marcado como enviado');
    },
    avisoHecho: async el => { const ev = porId('eventos', el.dataset.id); await guardar('eventos', Object.assign({}, ev, { avisoEnviado: hoyISO() }), 'Aviso marcado como enviado'); },
    mes: el => { const d = +el.dataset.d; if (!d) estado.calMes = hoyISO().slice(0, 7); else estado.calMes = sumarDias(estado.calMes + '-15', d * 30).slice(0, 7); pintar(); },
    mesPagos: el => { estado.mesPagos = sumarDias(estado.mesPagos + '-15', +el.dataset.d * 30).slice(0, 7); pintar(); },
    dia: el => abrirDia(el.dataset.f),
    programarDia: el => { const sid = $('#selProg').value; cerrarModal(); formEvento(sid, null, el.dataset.f); },
    importarPrograma: el => dialogoImportar(el.dataset.id),
    verDoc: el => verDocumento(el.dataset.id),
    verGuion: el => verGuion(el.dataset.id),
    editarGuion: el => formGuion(el.dataset.id),
    reporteAvance: el => dialogoReporte(el.dataset.id),
    nuevaResolucion: el => formResolucion(servicio(el.dataset.id)),
    editarResolucion: el => { const s = servicio(el.dataset.id); formResolucion(s, resolucionesPIPC(s).find(r => r.id === el.dataset.r)); },
    nuevoEscrito: el => {
      const s = servicio(el.dataset.id), rid = el.dataset.r;
      formulario('Escrito mensual de avance (PIPC CONDICIONADO)', [{ k: 'fecha', t: 'Fecha de presentación', tipo: 'date', req: true }, { k: 'nota', t: 'Nota', ancho: true }], { fecha: hoyISO() }, async v => {
        const r = resolucionesPIPC(s).find(x => x.id === rid);
        await cambiarResolucion(s.id, rid, { escritos: (r.escritos || []).filter(x => x.fecha.slice(0, 7) !== v.fecha.slice(0, 7)).concat([v]) }, 'Escrito registrado. Suba el acuse como evidencia.');
      });
    },
    borrarEscrito: async el => {
      if (!confirm('¿Quitar este escrito?')) return;
      const r = resolucionesPIPC(servicio(el.dataset.id)).find(x => x.id === el.dataset.r);
      await cambiarResolucion(el.dataset.id, el.dataset.r, { escritos: (r.escritos || []).filter(x => x.fecha !== el.dataset.f) });
    },
    docRes: el => dialogoDoc(el.dataset.id, el.dataset.modo === 'archivo', { eventoId: el.dataset.ev, resolucionId: el.dataset.res, categoria: el.dataset.cat, escritoMes: el.dataset.esc, titulo: el.dataset.tit }),
    subirDoc: el => dialogoDoc(el.dataset.id, true),
    enlaceDoc: el => dialogoDoc(el.dataset.id, false),
    borrarDoc: async el => { if (confirm('¿Quitar este documento de la lista? (El archivo en Drive no se borra.)')) await borrar('documentos', el.dataset.id, 'Documento quitado'); },
    nuevoPendiente: el => formPendiente(el.dataset.id),
    editarPendiente: el => { const p = porId('pendientes', el.dataset.id); formPendiente(p.servicioId, p); },
    agregarNota: async el => {
      const t = $('#txtNota').value.trim(); if (!t) return;
      await guardar('notas', { servicioId: el.dataset.id, texto: t, autor: Datos.usuario().nombre, fecha: hoyISO() }, 'Nota agregada');
    },
    nuevoMov: el => {
      const tipo = el.dataset.t, sid = el.dataset.id;
      const campos = [{ k: 'fecha', t: 'Fecha', tipo: 'date', req: true }, { k: 'monto', t: 'Monto', tipo: 'moneda', req: true }, { k: 'folio', t: tipo === 'factura' ? 'Folio de la factura' : 'Forma de pago / referencia' }, { k: 'nota', t: 'Nota', ancho: true }];
      formulario(tipo === 'pago' ? 'Registrar pago o anticipo' : 'Registrar factura emitida', campos, { fecha: hoyISO() }, async v => {
        const c = (DB.cobros || []).find(x => x.id === sid) || { id: sid, precio: 0, requiereFactura: false, movimientos: [] };
        await guardar('cobros', Object.assign({}, c, { movimientos: (c.movimientos || []).concat([Object.assign({ id: Datos.nuevoId('mov'), tipo }, v)]) }), 'Movimiento registrado');
      });
    },
    borrarMov: async el => {
      if (!confirm('¿Eliminar este movimiento?')) return;
      const c = DB.cobros.find(x => x.id === el.dataset.id);
      await guardar('cobros', Object.assign({}, c, { movimientos: c.movimientos.filter(m => m.id !== el.dataset.m) }), 'Movimiento eliminado');
    },
    editarFirma: () => formulario('Firma del aviso de WhatsApp', [
      { k: 'empresa', t: 'Empresa', req: true }, { k: 'area', t: 'Área (en negritas)', req: true },
      { k: 'telefono', t: 'Teléfono', req: true }, { k: 'nombre', t: 'Nombre (en cursivas)', req: true }
    ], firmaWhatsApp(), async v => {
      await guardar('ajustes', Object.assign({}, (DB.ajustes || []).find(x => x.id === 'firmaWhatsApp') || { id: 'firmaWhatsApp' }, v), 'Firma guardada');
    }),
    nuevoResp: () => formulario('Responsable externo', [{ k: 'nombre', t: 'Nombre (persona o empresa)', req: true, ancho: true }], {}, async v => { await guardar('responsables', v, 'Agregado'); }),
    borrarResp: async el => { if (confirm('¿Quitar de la lista?')) await borrar('responsables', el.dataset.id); },
    reiniciar: () => { if (confirm('¿Borrar todo y volver a los datos ficticios de prueba?')) { Datos.reiniciarPrueba(); cargarTodo(); } },
    salir: () => { Datos.cerrarSesion(); location.reload(); }
  };

  function formPendiente(servicioId, p) {
    formulario(p ? 'Editar documento pendiente' : 'Documento que debe entregar el cliente', [
      { k: 'descripcion', t: 'Documento', req: true, ancho: true },
      { k: 'fechaLimite', t: 'Fecha límite', tipo: 'date' },
      { k: 'entregado', t: 'Fecha de entrega', tipo: 'date', ayuda: 'Déjelo vacío si aún no lo entrega.' }
    ], p || {}, async v => { await guardar('pendientes', Object.assign({ servicioId }, p || {}, v), 'Guardado'); }, p ? { borrar: async () => borrar('pendientes', p.id) } : null);
  }

  function dialogoDoc(servicioId, archivo, extra) {
    extra = extra || null;
    const evs = DB.eventos.filter(e => e.servicioId === servicioId && !e.cancelado);
    const selEv = !extra && evs.length ? '<div class="campo ancho"><label>Relacionado con</label><select id="docEvento"><option value="">Todo el servicio</option>' + evs.map(e => '<option value="' + e.id + '">' + esc(tituloEvento(e) + ' · ' + fechaCorta(e.fecha)) + '</option>').join('') + '</select></div>' : '';
    abrirModal((archivo ? 'Subir PDF o foto' : 'Agregar enlace de Drive') + (extra ? ' · ' + extra.titulo : ''), '<form class="form" id="formDoc">' +
      (archivo ? '<div class="campo ancho"><label>Archivos (PDF o fotos, hasta 20 MB cada uno)</label><input type="file" id="docArchivo" accept="' + (extra && extra.categoria === 'guion' ? '.pdf,.doc,.docx,application/pdf,image/*' : 'application/pdf,image/*') + '" multiple required></div>'
        : '<div class="campo ancho"><label>Nombre del documento *</label><input id="docNombre" required></div><div class="campo ancho"><label>Enlace (Google Drive) *</label><input id="docUrl" type="url" placeholder="https://drive.google.com/…" required></div>') +
      selEv + '<div class="error-form" id="errDoc" hidden></div><div class="form-pie"><button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button class="btn" type="submit">' + (archivo ? 'Subir' : 'Agregar') + '</button></div></form>');
    $('#formDoc').addEventListener('submit', async e => {
      e.preventDefault();
      const evId = $('#docEvento') ? $('#docEvento').value : '';
      const err = $('#errDoc'); const btn = e.submitter; btn.disabled = true;
      try {
        const s = servicio(servicioId); const { i, c } = cadena(s);
        const base = Object.assign({ servicioId, eventoId: evId, autor: Datos.usuario().nombre, fecha: hoyISO() }, extra ? { eventoId: extra.eventoId || evId, resolucionId: extra.resolucionId || '', categoria: extra.categoria, escritoMes: extra.escritoMes || '' } : {});
        if (archivo) {
          const fs = Array.from($('#docArchivo').files);
          if (!fs.length) throw new Error('Elija al menos un archivo.');
          for (const f of fs) {
            btn.textContent = 'Subiendo ' + f.name + '…';
            const r = await Datos.subirArchivo(f, [nombreCli(c), i.nombreComercial, String(s.ejercicio), TIPOS[s.tipo].corto].concat(extra ? [extra.resolucionId ? 'Resoluciones' : extra.eventoId ? 'Guiones' : 'Otros'] : []));
            await Datos.guardar('documentos', Object.assign({ nombre: r.nombre, url: r.url, driveId: r.driveId || '' }, base));
          }
        } else {
          const url = $('#docUrl').value.trim(); if (!/^https?:\/\//.test(url)) throw new Error('El enlace debe empezar con https://');
          await Datos.guardar('documentos', Object.assign({ nombre: $('#docNombre').value.trim(), url }, base));
        }
        cerrarModal(); refrescarDB(); toast('Documento agregado');
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; btn.textContent = archivo ? 'Subir' : 'Agregar'; }
    });
  }

  /* ======================= Capacitaciones: cursos, participantes y constancias ======================= */
  const MODALIDADES = ['Presencial', 'En línea', 'Mixta'];
  const regAjuste = id => (DB.ajustes || []).find(x => x.id === id);
  function instructores() { return (regAjuste('instructores') || {}).lista || []; }
  function instructorDe(id) { return instructores().find(x => x.id === id) || null; }
  async function guardarInstructores(lista, msg) { await guardar('ajustes', Object.assign({ id: 'instructores' }, regAjuste('instructores') || {}, { lista }), msg); }
  const cursoPorId = id => porId('cursos', id);
  function quienCurso(cu) {
    const s = cu.servicioId && servicio(cu.servicioId);
    if (s) { const { i, c } = cadena(s); return nombreCli(c) + ' · ' + (i.nombreComercial || ''); }
    return cu.empresa || 'Grupo abierto';
  }
  function fechasCurso(cu) { return cu.fechasTexto || textoFechasCurso(cu.fechaInicio, cu.fechaFin); }
  function registroDe(folio) { return (DB.constancias || []).find(x => x.folio === folio); }
  const aplicaDC3 = cu => cu.aplicaDC3 !== 'no';
  const esEmpresa = cu => cu.tipoConstancia === 'empresa';
  const tieneFolios = cu => !!cu.folioEmpresa || (cu.participantes || []).some(p => p.folio);
  function problemas(p, todos, dc3) {
    const e = [];
    if (!p.nombres) e.push('Falta nombre');
    if (!p.apellidoPaterno) e.push('Falta apellido paterno');
    if (dc3) {
      const v = Constancias.validarCURP(p.curp); if (v) e.push(v);
      if (!p.curp) e.push('Falta CURP (DC-3)');
    }
    if (p.curp && todos.filter(x => x.curp === p.curp).length > 1) e.push('CURP repetida');
    return e;
  }
  function descargar(blob, nombre) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }
  function urlValidacion(folio) { return 'verifica.html' + (folio ? '?f=' + encodeURIComponent(folio) : ''); } // misma página pública que abre el QR

  function vistaCapacitaciones() {
    titulo('Capacitaciones');
    const cursos = (DB.cursos || []).slice().sort((a, b) => String(b.fechaInicio || '').localeCompare(String(a.fechaInicio || '')));
    const regs = DB.constancias || [];
    const nPart = cursos.reduce((t, c) => t + (c.participantes || []).length, 0);
    const f = norm(estado.filtroConst || '');
    const lista = regs.filter(r => !f || norm(r.folio + ' ' + r.nombre + ' ' + r.curso).includes(f)).sort((a, b) => String(b.emitida || '').localeCompare(String(a.emitida || '')) || String(b.folio).localeCompare(String(a.folio)));
    return '<div class="kpis">' +
      '<div class="kpi"><b>' + cursos.length + '</b><span>Cursos registrados</span></div>' +
      '<div class="kpi"><b>' + nPart + '</b><span>Participantes</span></div>' +
      '<div class="kpi"><b>' + regs.filter(r => r.estado !== 'cancelada').length + '</b><span>Constancias vigentes</span></div>' +
      '<div class="kpi"><b>' + instructores().length + '</b><span>Capacitadores</span></div></div>' +
      '<div class="rejilla dos"><div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Cursos impartidos</h3><button class="btn" data-acc="nuevoCurso">+ Nuevo curso</button></div>' +
      '<p class="sub">Cada curso guarda su lista de participantes, el capacitador y los folios de sus constancias. Desde una capacitación del calendario también puede abrir su curso con «Participantes y constancias».</p>' +
      (cursos.length ? '<div class="lista">' + cursos.map(cu => {
        const ps = cu.participantes || []; const em = ps.filter(p => p.folio).length;
        return '<div class="fila clic" data-acc="ir" data-h="#/curso/' + cu.id + '"><div style="width:6px;align-self:stretch;border-radius:3px;background:var(--azul)"></div><div class="crece"><b>' + esc(cu.curso) + '</b>' +
          (esEmpresa(cu) ? (cu.folioEmpresa ? ' <span class="etiqueta" style="background:var(--verde)">Constancia de empresa emitida</span>' : ' <span class="etiqueta borde" style="color:var(--marino)">Constancia para toda la empresa</span>')
            : ps.length && em === ps.length ? ' <span class="etiqueta" style="background:var(--verde)">Constancias emitidas</span>' : em ? ' <span class="etiqueta" style="background:var(--ambar)">' + em + ' de ' + ps.length + ' emitidas</span>' : '') +
          (aplicaDC3(cu) ? '' : ' <span class="etiqueta borde" style="color:var(--gris)">Sin DC-3</span>') +
          '<div class="sub">' + esc(quienCurso(cu)) + ' · ' + esc(fechaCorta(cu.fechaInicio)) + (cu.fechaFin && cu.fechaFin !== cu.fechaInicio ? ' al ' + esc(fechaCorta(cu.fechaFin)) : '') + ' · ' + esc(cu.modalidad || '') + ' · ' + esc(cu.horas || '—') + ' h · ' + ps.length + ' participante' + (ps.length === 1 ? '' : 's') + '</div></div></div>';
      }).join('') + '</div>' : '<div class="vacio">Aún no hay cursos. Cree uno con «+ Nuevo curso».</div>') + '</div></div>' +
      '<div><div class="tarjeta"><div class="tarjeta-cab"><h3>Capacitadores</h3><button class="btn chico" data-acc="nuevoInstructor">+ Agregar</button></div>' +
      '<p class="sub">Nombre, registros y firma digital que se imprimen en la constancia (un capacitador por constancia).</p>' +
      (instructores().length ? instructores().map(x => '<div class="fila"><div class="avatar">' + esc((x.nombre || '?')[0]) + '</div><div class="crece"><b>' + esc(((x.titulo || '') + ' ' + x.nombre).trim()) + '</b><div class="sub">' + esc((x.registros || []).filter(Boolean).join(' · ') || 'Sin registros') + '</div></div>' +
        ((x.firmaData || x.firmaDriveId) ? '<span class="etiqueta" style="background:var(--verde)">Firma ✓</span>' : '<span class="etiqueta" style="background:var(--rojo)">Sin firma</span>') +
        '<button class="btn sec chico" data-acc="editarInstructor" data-id="' + x.id + '">Editar</button></div>').join('') : '<div class="vacio">Agregue al menos un capacitador con su firma.</div>') + '</div>' +
      '<div class="tarjeta"><h3>Validación pública</h3><p class="sub">Cada constancia lleva un folio y un código QR. Cualquier persona puede escanearlo o abrir la página de validación y escribir el folio: verá el nombre, el curso, las fechas, las horas, el capacitador y si la constancia está vigente. La CURP nunca se muestra.</p>' +
      '<a class="btn sec" href="' + esc(urlValidacion('')) + '" target="_blank" rel="noopener">Abrir página de validación</a></div></div></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Registro de constancias emitidas (' + regs.length + ')</h3><input class="buscador" id="buscarConst" placeholder="Buscar folio, nombre o curso…" value="' + esc(estado.filtroConst || '') + '"></div>' +
      (lista.length ? '<div style="overflow-x:auto"><table class="tabla"><thead><tr><th>Folio</th><th>Participante</th><th>Curso</th><th>Emitida</th><th>Estado</th><th></th></tr></thead><tbody>' +
        lista.slice(0, 200).map(r => '<tr><td><b>' + esc(r.folio) + '</b></td><td>' + esc(r.nombre) + '</td><td>' + esc(r.curso) + '</td><td>' + esc(fechaCorta(String(r.emitida || '').slice(0, 10))) + '</td><td>' +
          (r.estado === 'cancelada' ? '<span class="etiqueta" style="background:var(--rojo)">Cancelada</span>' : '<span class="etiqueta" style="background:var(--verde)">Vigente</span>') + '</td><td style="white-space:nowrap">' +
          '<a class="btn-icono" href="' + esc(urlValidacion(r.folio)) + '" target="_blank" rel="noopener" title="Ver validación pública">🔎</a>' +
          (r.estado === 'cancelada' ? '<button class="btn sec chico" data-acc="reactivarConst" data-id="' + esc(r.folio) + '">Reactivar</button>' : '<button class="btn sec chico" data-acc="cancelarConst" data-id="' + esc(r.folio) + '">Cancelar</button>') + '</td></tr>').join('') +
        '</tbody></table></div>' : '<div class="vacio">' + (regs.length ? 'Sin resultados.' : 'Aún no se ha emitido ninguna constancia.') + '</div>') + '</div>';
  }
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  function vistaCurso(id) {
    const cu = cursoPorId(id); if (!cu) return '<div class="vacio">Curso no encontrado.</div>';
    titulo('Curso · ' + cu.curso);
    const ins = instructorDe(cu.instructorId);
    const ps = cu.participantes || [];
    const pend = ps.filter(p => !p.folio && !p.excluir);
    const dc3 = aplicaDC3(cu), emp = esEmpresa(cu);
    const conErr = ps.filter(p => problemas(p, ps, dc3).length);
    const regEmp = cu.folioEmpresa && registroDe(cu.folioEmpresa);
    const emitidas = ps.filter(p => p.folio);
    const anio = String(cu.fechaFin || cu.fechaInicio || '').slice(0, 4);
    const dato = (t, v) => '<div class="dato"><small>' + t + '</small><div>' + v + '</div></div>';
    return '<div class="migas"><a href="#/capacitaciones">Capacitaciones</a> › ' + esc(cu.curso) + '</div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><div><span class="etiqueta" style="background:var(--azul)">Curso</span><h2 style="margin-top:8px">' + esc(cu.curso) + '</h2><div class="sub">' + esc(quienCurso(cu)) + '</div></div>' +
      '<button class="btn sec chico" data-acc="editarCurso" data-id="' + cu.id + '">Editar</button></div>' +
      '<div class="datos">' + dato('Modalidad', esc(cu.modalidad || '—')) + dato('Fechas', esc(fechasCurso(cu) || '—')) + dato('Duración', esc(cu.horas || '—') + ' horas') +
      dato('Sede', esc(cu.sede || '—')) + dato('Capacitador', ins ? esc(((ins.titulo || '') + ' ' + ins.nombre).trim()) + ((ins.firmaData || ins.firmaDriveId) ? '' : ' <span class="etiqueta" style="background:var(--rojo)">sin firma</span>') : '<span style="color:var(--rojo)">Sin asignar</span>') +
      dato('Constancia de participación', emp ? 'Una para toda la empresa: «' + esc(textoEmpresa(cu)) + '»' : 'Una por participante') +
      dato('DC-3', dc3 ? '<b style="color:var(--verde)">APLICA</b>' : '<b style="color:var(--gris)">NO APLICA</b>') +
      dato('Folios', 'AV.' + esc(claveCurso(cu)) + esc(anio) + (emp ? '-NNN (uno para la empresa)' : '-001, -002…')) + '</div></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>Participantes (' + ps.length + ')</h3><div style="display:flex;gap:8px;flex-wrap:wrap">' +
      '<button class="btn sec" data-acc="importarLista" data-id="' + cu.id + '">📥 Importar lista (Excel, Word o foto)</button><button class="btn acento" data-acc="nuevoParticipante" data-id="' + cu.id + '">+ Agregar</button></div></div>' +
      (emp ? '<p class="sub">Con constancia para toda la empresa la lista es opcional' + (dc3 ? ', pero se necesita para las DC-3.' : '; sirve como registro de asistencia.') + '</p>' : '') +
      (conErr.length ? '<div class="aviso-it ambar"><div><b>' + conErr.length + ' participante' + (conErr.length === 1 ? '' : 's') + ' con datos por revisar</b><span>' + (dc3 ? 'La CURP correcta es obligatoria para la DC-3.' : 'Revise nombres y apellidos.') + '</span></div></div>' : '') +
      (ps.length ? '<div style="overflow-x:auto"><table class="tabla"><thead><tr><th>#</th><th>Nombre</th><th>CURP</th><th>Puesto</th><th>Folio</th><th></th></tr></thead><tbody>' +
        ps.map((p, k) => {
          const pr = problemas(p, ps, dc3); const r = p.folio && registroDe(p.folio);
          return '<tr><td>' + (k + 1) + '</td><td><b>' + esc(nombreParticipante(p)) + '</b>' + (pr.length ? '<div class="sub" style="color:var(--rojo)">' + esc(pr.join(' · ')) + '</div>' : '') + '</td><td>' + esc(p.curp || '—') + '</td><td>' + esc(p.puesto || '') + '</td><td>' +
            (p.folio ? '<b>' + esc(p.folio) + '</b>' + (r && r.estado === 'cancelada' ? ' <span class="etiqueta" style="background:var(--rojo)">Cancelada</span>' : '') : '<span class="sub">' + (emp ? 'En la de empresa' : 'Por emitir') + '</span>') + '</td><td style="white-space:nowrap">' +
            '<button class="btn-icono" data-acc="editarParticipante" data-id="' + cu.id + '" data-k="' + k + '" title="Editar">✎</button>' +
            (p.folio ? '' : '<button class="btn-icono" data-acc="quitarParticipante" data-id="' + cu.id + '" data-k="' + k + '" title="Quitar">✕</button>') + '</td></tr>';
        }).join('') + '</tbody></table></div>' : '<div class="vacio">Importe la lista de asistencia desde Excel, Word o una foto, o péguela desde la hoja de cálculo.</div>') + '</div>' +
      '<div class="tarjeta"><h3>Constancias de participación</h3>' +
      '<div class="etapa' + (ins && (ins.firmaData || ins.firmaDriveId) ? ' hecha' : '') + '"><span class="txt">1. Capacitador con firma digital asignado</span></div>' +
      (emp ? '<div class="etapa' + (cu.folioEmpresa ? ' hecha' : '') + '"><span class="txt">2. Folio de la constancia para toda la empresa' + (cu.folioEmpresa ? ': <b>' + esc(cu.folioEmpresa) + '</b>' + (regEmp && regEmp.estado === 'cancelada' ? ' <span class="etiqueta" style="background:var(--rojo)">Cancelada</span>' : '') : '') + '<div class="sub">«' + esc(textoEmpresa(cu)) + '»</div></span>' +
          (cu.folioEmpresa ? '' : '<button class="btn chico" data-acc="emitirCurso" data-id="' + cu.id + '">Asignar folio</button>') + '</div>'
        : '<div class="etapa' + (ps.length && !pend.length ? ' hecha' : '') + '"><span class="txt">2. Folios asignados y registrados para validación (' + emitidas.length + ' de ' + ps.length + ')</span>' +
          (pend.length ? '<button class="btn chico" data-acc="emitirCurso" data-id="' + cu.id + '">Asignar ' + pend.length + ' folio' + (pend.length === 1 ? '' : 's') + '</button>' : '') + '</div>') +
      '<div class="etapa' + (cu.generadas ? ' hecha' : '') + '"><span class="txt">3. ' + (emp ? 'Constancia de la empresa en PDF' : 'Constancias en PDF (lote para imprimir + una por participante)') + (cu.generadas ? ' <span class="sub">· última vez ' + esc(fechaCorta(String(cu.generadas).slice(0, 10))) + '</span>' : '') + '</span>' +
      ((emp ? cu.folioEmpresa : emitidas.length) ? '<button class="btn acento chico" data-acc="generarConstancias" data-id="' + cu.id + '">⬇ Generar PDF</button>' : '') + '</div>' +
      '<p class="sub" style="margin-top:10px">El PDF se arma en este equipo con el diseño oficial (logos de Aula Virtual y Grupo VIME, un capacitador, folio y QR). Los folios nunca se repiten: los asigna el servidor.</p></div>' +
      '<div class="tarjeta"><div class="tarjeta-cab"><h3>' + (dc3 ? 'DC-3 y material didáctico' : 'Material didáctico <span class="sub">(este curso no lleva DC-3)</span>') + '</h3><button class="btn sec" data-acc="ordenClaude" data-id="' + cu.id + '">🤖 Orden para Claude</button></div>' +
      '<p class="sub">' + (dc3 ? 'Las DC-3 (formato STPS en Word) y el' : 'El') + ' material didáctico (Manual del Participante, Guía Visual y póster) ' + (dc3 ? 'los genera' : 'lo genera') + ' la skill «Aula Virtual Grupo VIME» en Claude. Este botón arma la orden con los datos del curso, el capacitador, la lista y los folios para que solo la pegue en el chat junto con el contenido del curso y la firma.</p></div>';
  }

  function formCurso(cu, pre) {
    const servs = DB.servicios.filter(s => s.tipo === 'CAPACITACIONES' && !s.archivado);
    const val = Object.assign({ modalidad: 'Presencial', instructorId: (instructores()[0] || {}).id || '', tipoConstancia: 'individual', aplicaDC3: 'si', leyendaEmpresa: 'El personal brigadista de' }, pre || {}, cu || {});
    const campos = [
      { k: 'curso', t: 'Nombre del curso', req: true, ancho: true },
      { k: 'clave', t: 'Clave para el folio', ayuda: 'Letras o números, p. ej. PCO o FBR. Si la deja vacía se forma con las iniciales del curso.' },
      { k: 'modalidad', t: 'Modalidad', tipo: 'select', opciones: MODALIDADES },
      { k: 'fechaInicio', t: 'Fecha de inicio', tipo: 'date', req: true },
      { k: 'fechaFin', t: 'Fecha de término', tipo: 'date', ayuda: 'Déjela vacía si fue un solo día.' },
      { k: 'fechasTexto', t: 'Fechas como deben leerse (opcional)', ancho: true, ayuda: 'Solo si no fueron días seguidos. Ej.: «los días 25 al 29 de mayo y del 01 al 05 de junio de 2026».' },
      { k: 'horas', t: 'Duración total (horas)', tipo: 'number', req: true, min: 1, paso: 0.5 },
      { k: 'sede', t: 'Sede (si fue presencial)' },
      { k: 'instructorId', t: 'Capacitador', tipo: 'select', req: true, opciones: [{ v: '', t: instructores().length ? 'Elija…' : 'Primero agregue un capacitador' }].concat(instructores().map(x => ({ v: x.id, t: ((x.titulo || '') + ' ' + x.nombre).trim() }))) },
      { k: 'servicioId', t: 'Cliente (servicio de capacitaciones)', tipo: 'select', opciones: [{ v: '', t: 'Grupo abierto / sin cliente' }].concat(servs.map(s => { const { i, c } = cadena(s); return { v: s.id, t: nombreCli(c) + ' · ' + (i.nombreComercial || '') + ' · ' + s.ejercicio }; })) },
      { k: 'empresa', t: 'Razón social de la empresa', ancho: true, ayuda: 'Se usa en la DC-3 y en la constancia para toda la empresa.' },
      { k: 'aplicaDC3', t: 'DC-3', tipo: 'select', opciones: [{ v: 'si', t: 'APLICA' }, { v: 'no', t: 'NO APLICA (solo constancia de participación)' }] },
      { k: 'tipoConstancia', t: 'Constancia de participación', tipo: 'select', opciones: [{ v: 'individual', t: 'Una por participante' }, { v: 'empresa', t: 'Una para toda la empresa' }] },
      { k: 'leyendaEmpresa', t: 'Leyenda de la constancia para toda la empresa', ancho: true, ayuda: 'Va antes de la razón social. Ej.: «El personal brigadista de» → «El personal brigadista de Hotelera Tlahuica, S.A. de C.V.»' }
    ];
    formulario(cu ? 'Editar curso' : 'Nuevo curso', campos, val, async v => {
      if (v.clave) v.clave = String(v.clave).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
      if (v.fechaFin && v.fechaFin < v.fechaInicio) return { error: 'La fecha de término es anterior a la de inicio.' };
      if (cu && tieneFolios(cu) && v.clave !== (cu.clave || '') ) return { error: 'Ya hay folios emitidos con la clave anterior; no se puede cambiar la clave.' };
      if (cu && tieneFolios(cu) && v.tipoConstancia !== (cu.tipoConstancia || 'individual')) return { error: 'Ya hay folios emitidos; no se puede cambiar el tipo de constancia de este curso.' };
      if (!v.empresa && v.servicioId) { const { c } = cadena(servicio(v.servicioId)); v.empresa = c.razonSocial || ''; }
      if (v.tipoConstancia === 'empresa' && !v.empresa) return { error: 'Para la constancia de toda la empresa escriba la razón social.' };
      if (cu && cu.folioEmpresa && (v.empresa !== cu.empresa || v.leyendaEmpresa !== cu.leyendaEmpresa)) return { error: 'La constancia de la empresa ya tiene folio con esa razón social y leyenda; no se pueden cambiar.' };
      v.leyendaEmpresa = v.leyendaEmpresa || 'El personal brigadista de';
      const g = await guardar('cursos', Object.assign({ participantes: [] }, pre || {}, cu || {}, v), cu ? 'Curso actualizado' : 'Curso creado');
      if (!cu) location.hash = '#/curso/' + g.id;
    }, cu && !tieneFolios(cu) ? { borrar: async () => { await borrar('cursos', cu.id, 'Curso eliminado'); location.hash = '#/capacitaciones'; }, borrarPregunta: '¿Eliminar este curso y su lista de participantes?' } : null);
  }

  /** Reduce la firma a un PNG ligero (máx. 900 px de ancho) conservando la transparencia. */
  function prepararFirma(file) {
    return new Promise((ok, mal) => {
      const img = new Image(); const u = URL.createObjectURL(file);
      img.onload = () => {
        const k = Math.min(1, 900 / img.width); const cv = document.createElement('canvas');
        cv.width = Math.round(img.width * k); cv.height = Math.round(img.height * k);
        cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height); URL.revokeObjectURL(u);
        cv.toBlob(b => b ? ok(b) : mal(new Error('No se pudo leer la imagen de la firma.')), 'image/png');
      };
      img.onerror = () => mal(new Error('La firma debe ser una imagen PNG o JPG.')); img.src = u;
    });
  }
  function formInstructor(ins) {
    const campos = [
      { k: 'titulo', t: 'Título (opcional)', ayuda: 'Ej.: Lic., Ing., Mtra.' },
      { k: 'nombre', t: 'Nombre completo', req: true },
      { k: 'cargo', t: 'Leyenda bajo el nombre', def: 'Capacitador' },
      { k: 'reg1', t: 'Registro 1', ancho: true, ayuda: 'Ej.: Registro STPS (agente capacitador): XXXX-000000-XXX-0000' },
      { k: 'reg2', t: 'Registro 2', ancho: true, ayuda: 'Ej.: Registro de Protección Civil: CEPC/RT/0000/2026' }
    ];
    const val = Object.assign({}, ins || {}, { reg1: ((ins || {}).registros || [])[0] || '', reg2: ((ins || {}).registros || [])[1] || '' });
    formulario(ins ? 'Editar capacitador' : 'Nuevo capacitador', campos, val, async v => {
      const arch = $('#insFirma').files[0];
      const nuevo = Object.assign({ id: (ins && ins.id) || Datos.nuevoId('ins') }, ins || {}, { titulo: v.titulo, nombre: v.nombre, cargo: v.cargo || 'Capacitador', registros: [v.reg1, v.reg2].filter(Boolean) });
      if (arch) {
        const png = await prepararFirma(arch);
        if (Datos.MODO_PRUEBA) nuevo.firmaData = await new Promise(r => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(png); });
        else { const f = new File([png], 'Firma_' + v.nombre.replace(/\s+/g, '_') + '.png', { type: 'image/png' }); const r = await Datos.subirArchivo(f, ['Capacitaciones', 'Firmas']); nuevo.firmaDriveId = r.driveId; nuevo.firmaUrl = r.url; delete nuevo.firmaData; }
      } else if (!nuevo.firmaData && !nuevo.firmaDriveId) return { error: 'Suba la firma digital (imagen PNG, de preferencia con fondo transparente).' };
      const lista = instructores().filter(x => x.id !== nuevo.id).concat([nuevo]);
      await guardarInstructores(lista, 'Capacitador guardado');
    }, Object.assign({ extraHtml: '<div class="campo ancho"><label>Firma digital' + (ins && (ins.firmaData || ins.firmaDriveId) ? ' (ya cargada; suba otra solo para reemplazarla)' : ' *') + '</label><input type="file" id="insFirma" accept="image/png,image/jpeg"><span class="ayuda">PNG con fondo transparente de preferencia. Se imprime arriba del nombre en cada constancia.</span>' +
      (ins && ins.firmaData ? '<img src="' + esc(ins.firmaData) + '" alt="Firma" style="max-height:70px;margin-top:6px;background:#fff;border:1px solid var(--gris-claro);border-radius:6px;padding:4px">' : '') + '</div>' },
      ins ? { borrar: async () => guardarInstructores(instructores().filter(x => x.id !== ins.id), 'Capacitador eliminado'), borrarPregunta: '¿Eliminar este capacitador? Las constancias ya emitidas no cambian.' } : {}));
  }

  const CAMPOS_PART = [
    { k: 'nombres', t: 'Nombre(s)', req: true }, { k: 'apellidoPaterno', t: 'Apellido paterno', req: true }, { k: 'apellidoMaterno', t: 'Apellido materno' },
    { k: 'curp', t: 'CURP', ayuda: 'Obligatoria solo para la DC-3.' }, { k: 'puesto', t: 'Puesto' }, { k: 'ocupacion', t: 'Ocupación específica (DC-3)' }
  ];
  function formParticipante(cuId, k) {
    const cu = cursoPorId(cuId); const p = k == null ? null : cu.participantes[k];
    formulario(p ? 'Editar participante' : 'Agregar participante', CAMPOS_PART, p || {}, async v => {
      v.curp = String(v.curp || '').toUpperCase().replace(/\s+/g, '');
      const e = Constancias.validarCURP(v.curp); if (e) return { error: e + '. Corríjala o déjela vacía.' };
      const lista = (cu.participantes || []).slice();
      if (v.curp && lista.some((x, j) => j !== k && x.curp === v.curp)) return { error: 'Esa CURP ya está en la lista.' };
      if (p) lista[k] = Object.assign({}, p, v); else lista.push(v);
      await guardar('cursos', Object.assign({}, cu, { participantes: lista }), 'Participante guardado');
    });
  }
  function dialogoLista(cuId) {
    const cu = cursoPorId(cuId); let filas = [];
    abrirModal('Importar lista de asistencia · ' + cu.curso, '<form class="form" id="formLista">' +
      '<div class="campo ancho"><label>Lista en Excel, Word o imagen</label><input type="file" id="lisArchivo" accept=".xlsx,.xls,.csv,.txt,.docx,image/*">' +
      '<span class="ayuda">Excel o CSV (la plantilla de la skill o cualquier tabla con Nombre(s), Apellidos y CURP) · Word (.docx) con la lista en tabla · Foto o escaneo de la lista firmada (JPG o PNG). La foto se lee en este equipo; funciona mejor con lista impresa o letra de molde clara, bien iluminada y derecha.</span></div>' +
      '<div class="campo ancho"><label>…o pegue aquí las celdas copiadas de Excel</label><textarea id="lisTexto" rows="4" placeholder="Apellido paterno	Apellido materno	Nombre(s)	CURP	Puesto"></textarea></div>' +
      '<div class="form-pie" style="justify-content:flex-start"><button type="button" class="btn sec" id="lisLeer">Leer lista</button><span class="sub" id="lisEstado"></span></div>' +
      '<div id="lisRevision"></div>' +
      '<div class="error-form" id="errLista" hidden></div><div class="form-pie"><button type="button" class="btn sec" data-acc="cerrarModal">Cancelar</button><button class="btn" type="submit" id="lisGuardar" disabled>Guardar participantes</button></div></form>');
    document.querySelector('.modal').classList.add('ancha');
    const err = $('#errLista'), est = $('#lisEstado');
    const campos = [['nombres', 'Nombre(s)'], ['apellidoPaterno', 'Apellido paterno'], ['apellidoMaterno', 'Apellido materno'], ['curp', 'CURP'], ['puesto', 'Puesto']];
    function pintarRevision(origenFoto) {
      const dc3 = aplicaDC3(cu);
      $('#lisRevision').innerHTML = filas.length ? '<div class="aviso-it ' + (origenFoto ? 'ambar' : 'azul') + '"><div><b>Revise antes de guardar (' + filas.length + ' encontrados)</b><span>' +
        (origenFoto ? 'La lectura de una foto puede confundir letras: compare con la lista original y corrija aquí. ' : '') + 'Puede corregir cualquier celda o quitar renglones.' + (dc3 ? ' Para DC-3 la CURP debe ser correcta.' : '') + '</span></div></div>' +
        (filas.some(f => f.completo) ? '<div style="margin:6px 0"><button type="button" class="btn sec chico" id="lisOrden">⇄ En la lista los apellidos van primero</button></div>' : '') +
        '<div style="overflow-x:auto;max-height:46vh"><table class="tabla"><thead><tr><th>#</th>' + campos.map(c => '<th>' + c[1] + '</th>').join('') + '<th></th></tr></thead><tbody>' +
        filas.map((f, k) => { const e = dc3 || f.curp ? Constancias.validarCURP(f.curp) : '';
          return '<tr><td>' + (k + 1) + '</td>' + campos.map(c => '<td><input data-k="' + k + '" data-c="' + c[0] + '" value="' + esc(f[c[0]] || '') + '" style="width:100%;min-width:' + (c[0] === 'curp' ? 170 : 110) + 'px' + (c[0] === 'curp' && e ? ';border-color:var(--rojo)' : '') + '"' + (c[0] === 'curp' && e ? ' title="' + esc(e) + '"' : '') + '></td>').join('') +
            '<td><button type="button" class="btn-icono" data-quitar="' + k + '" title="Quitar">✕</button></td></tr>'; }).join('') + '</tbody></table></div>' +
        '<div class="campo check ancho" style="margin-top:8px"><input type="checkbox" id="lisReemplazar"><label for="lisReemplazar">Reemplazar la lista actual (se conservan quienes ya tienen folio)</label></div>' : '';
      $('#lisGuardar').disabled = !filas.length; $('#lisGuardar').textContent = 'Guardar ' + filas.length + ' participante' + (filas.length === 1 ? '' : 's');
      $('#lisRevision').querySelectorAll('input[data-k]').forEach(i => i.addEventListener('input', () => { const f = filas[+i.dataset.k]; f[i.dataset.c] = i.dataset.c === 'curp' ? i.value.toUpperCase().trim() : i.value; delete f.completo; }));
      $('#lisRevision').querySelectorAll('[data-quitar]').forEach(bn => bn.addEventListener('click', () => { filas.splice(+bn.dataset.quitar, 1); pintarRevision(origenFoto); }));
      const bo = $('#lisOrden');
      if (bo) bo.addEventListener('click', () => { filas.forEach(f => { if (f.completo) Object.assign(f, Constancias.partirNombre(f.completo, !f._apPrimero), { _apPrimero: !f._apPrimero }); }); pintarRevision(origenFoto); });
    }
    async function leer() {
      err.hidden = true;
      const f = $('#lisArchivo').files[0], t = $('#lisTexto').value.trim();
      if (!f && !t) { err.textContent = 'Elija un archivo o pegue la lista.'; err.hidden = false; return; }
      const foto = !!(f && (/^image\//.test(f.type) || /\.(jpe?g|png|webp|bmp|heic)$/i.test(f.name)));
      $('#lisLeer').disabled = true; est.textContent = foto ? 'Leyendo la imagen… (la primera vez descarga el lector, unos segundos)' : 'Leyendo…';
      try {
        filas = f ? await Constancias.leerArchivo(f, pct => { est.textContent = 'Leyendo la imagen… ' + pct + '%'; }) : Constancias.deTexto(t);
        filas = filas.map(x => Object.assign({ nombres: '', apellidoPaterno: '', apellidoMaterno: '', curp: '', puesto: '' }, x));
        if (!filas.length) throw new Error(foto ? 'No pude leer nombres en la imagen. Intente con una foto más nítida y derecha, o capture la lista en Excel.' : 'No encontré participantes. Revise que la tabla tenga nombres y apellidos.');
        est.textContent = ''; pintarRevision(foto);
      } catch (ex) { est.textContent = ''; err.textContent = ex.message; err.hidden = false; }
      $('#lisLeer').disabled = false;
    }
    $('#lisLeer').addEventListener('click', leer);
    $('#lisArchivo').addEventListener('change', leer);
    $('#formLista').addEventListener('submit', async e => {
      e.preventDefault(); const btn = e.submitter; btn.disabled = true;
      try {
        let nuevos = filas.map(x => ({ nombres: String(x.nombres || '').trim(), apellidoPaterno: String(x.apellidoPaterno || '').trim(), apellidoMaterno: String(x.apellidoMaterno || '').trim(), curp: String(x.curp || '').toUpperCase().replace(/\s+/g, ''), puesto: String(x.puesto || '').trim(), ocupacion: x.ocupacion || '', empresa: x.empresa || '' }))
          .filter(x => x.nombres || x.apellidoPaterno);
        if (!nuevos.length) throw new Error('No hay participantes para guardar.');
        const base = $('#lisReemplazar') && $('#lisReemplazar').checked ? (cu.participantes || []).filter(p => p.folio) : (cu.participantes || []).slice();
        const curps = new Set(base.map(p => p.curp).filter(Boolean));
        const repetidos = nuevos.filter(p => p.curp && curps.has(p.curp)).length;
        nuevos = nuevos.filter(p => !(p.curp && curps.has(p.curp)));
        const malos = nuevos.filter(p => p.curp && Constancias.validarCURP(p.curp)).length;
        await guardar('cursos', Object.assign({}, cu, { participantes: base.concat(nuevos) }));
        cerrarModal(); toast(nuevos.length + ' participante' + (nuevos.length === 1 ? '' : 's') + ' guardado' + (nuevos.length === 1 ? '' : 's') + (repetidos ? ' · ' + repetidos + ' repetido(s) omitido(s)' : '') + (malos ? ' · ' + malos + ' con CURP por revisar' : ''));
      } catch (ex) { err.textContent = ex.message; err.hidden = false; btn.disabled = false; }
    });
  }

  async function emitirCurso(cuId) {
    const cu = cursoPorId(cuId); const ins = instructorDe(cu.instructorId);
    if (!ins) { toast('Asigne un capacitador al curso (botón Editar).', true); return; }
    if (esEmpresa(cu)) {
      if (cu.folioEmpresa) { toast('La constancia de la empresa ya tiene folio: ' + cu.folioEmpresa); return; }
      if (!cu.empresa) { toast('Falta la razón social del curso (botón Editar).', true); return; }
      if (!confirm('Se asignará 1 folio a la constancia para toda la empresa:\n\n«' + textoEmpresa(cu) + '»\n\nRevise que la razón social esté bien escrita: el folio queda ligado a ese texto.\n\n¿Continuar?')) return;
      try {
        sinc('Asignando folio…');
        const r = await Datos.emitir(cu, ((ins.titulo || '') + ' ' + ins.nombre).trim());
        refrescarDB(); sinc(''); toast('Folio asignado: ' + (r.curso.folioEmpresa || ''));
      } catch (e) { sinc(''); toast(e.message, true); }
      return;
    }
    const pend = (cu.participantes || []).filter(p => !p.folio && !p.excluir);
    const sinNombre = pend.filter(p => !p.nombres || !p.apellidoPaterno);
    if (sinNombre.length) { toast('Hay ' + sinNombre.length + ' participante(s) sin nombre o apellido paterno.', true); return; }
    if (!confirm('Se asignarán ' + pend.length + ' folio(s) y quedarán registrados para validación pública.\n\nRevise que los nombres estén bien escritos: el folio queda ligado a ese nombre.\n\n¿Continuar?')) return;
    try {
      sinc('Asignando folios…');
      const r = await Datos.emitir(cu, ((ins.titulo || '') + ' ' + ins.nombre).trim());
      refrescarDB(); sinc(''); toast(r.nuevos.length + ' folio(s) asignados: ' + (r.nuevos[0] || {}).folio + (r.nuevos.length > 1 ? ' a ' + r.nuevos[r.nuevos.length - 1].folio : ''));
    } catch (e) { sinc(''); toast(e.message, true); }
  }

  async function bytesFirma(ins) {
    const b = await Datos.obtenerArchivo({ url: ins.firmaData || '', driveId: ins.firmaDriveId || '' });
    if (!b) throw new Error('No pude obtener la firma de ' + ins.nombre + '. Vuelva a subirla en Capacitaciones › Capacitadores.');
    return { bytes: new Uint8Array(await b.arrayBuffer()), tipo: b.type || 'image/png' };
  }
  let ultimoLote = null;
  async function generarConstancias(cuId) {
    const cu = cursoPorId(cuId); const ins = instructorDe(cu.instructorId);
    if (!ins) { toast('Asigne un capacitador al curso.', true); return; }
    const ps = esEmpresa(cu)
      ? (cu.folioEmpresa && (registroDe(cu.folioEmpresa) || {}).estado !== 'cancelada' ? [{ folio: cu.folioEmpresa, leyenda: cu.leyendaEmpresa || 'El personal brigadista de', empresa: cu.empresa }] : [])
      : (cu.participantes || []).filter(p => p.folio && !p.excluir && (registroDe(p.folio) || {}).estado !== 'cancelada');
    if (!ps.length) { toast('No hay constancias con folio vigente.', true); return; }
    abrirModal('Constancias · ' + cu.curso, '<div class="vacio" id="genEstado">Armando ' + ps.length + ' constancia(s)… (la primera vez tarda unos segundos en cargar el diseño)</div>');
    try {
      const firma = await bytesFirma(ins);
      const res = await Constancias.generar({ curso: Object.assign({}, cu, { fechasTexto: fechasCurso(cu) }), participantes: ps, instructor: Object.assign({}, ins, { firma }), urlVerificacion: CONFIG.VERIFICACION_URL });
      const clave = claveCurso(cu) + String(cu.fechaFin || cu.fechaInicio).slice(0, 4);
      ultimoLote = { cuId, res, nombreLote: 'LOTE_PARTICIPACION_' + clave + '.pdf', nombreZip: 'Constancias_' + clave + '.zip' };
      await Datos.guardar('cursos', Object.assign({}, cu, { generadas: new Date().toISOString() })); DB = Datos.vista();
      $('#modalCuerpo').innerHTML = '<p>Listas <b>' + ps.length + '</b> constancias (' + esc(ps[0].folio) + (ps.length > 1 ? ' a ' + esc(ps[ps.length - 1].folio) : '') + ').</p>' +
        '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0"><button class="btn" data-acc="bajarLote">⬇ Lote para imprimir (un PDF)</button><button class="btn sec" data-acc="bajarZip">⬇ ZIP: lote + una por participante</button>' +
        (cu.servicioId ? '<button class="btn sec" data-acc="loteDrive">☁ Guardar lote en Documentos del servicio</button>' : '') + '</div>' +
        '<p class="sub">Imprima en tamaño carta o A4 «ajustar a la página». Las constancias individuales sirven para enviarlas por correo o WhatsApp.</p>';
    } catch (e) { $('#modalCuerpo').innerHTML = '<div class="error-form">' + esc(e.message) + '</div>'; }
  }
  async function loteDrive() {
    const L = ultimoLote; if (!L) return; const cu = cursoPorId(L.cuId); const s = servicio(cu.servicioId); const { i, c } = cadena(s);
    try {
      sinc('Subiendo…');
      const f = new File([L.res.lote], L.nombreLote, { type: 'application/pdf' });
      const r = await Datos.subirArchivo(f, [nombreCli(c), i.nombreComercial, String(s.ejercicio), TIPOS[s.tipo].corto, 'Constancias']);
      await Datos.guardar('documentos', { nombre: r.nombre, url: r.url, driveId: r.driveId || '', servicioId: s.id, eventoId: cu.eventoId || '', autor: Datos.usuario().nombre, fecha: hoyISO(), categoria: 'constancias' });
      sinc(''); refrescarDB(); toast('Lote guardado en Documentos del servicio');
    } catch (e) { sinc(''); toast(e.message, true); }
  }

  function ordenClaude(cuId) {
    const cu = cursoPorId(cuId); const ins = instructorDe(cu.instructorId) || {};
    const ps = cu.participantes || [];
    const orden = {
      grupo: { curso: cu.curso, clave: claveCurso(cu), cliente: quienCurso(cu), empresa_razon_social: cu.empresa || '', modalidad: (cu.modalidad || '').toLowerCase(),
        fecha_inicio: cu.fechaInicio, fecha_fin: cu.fechaFin || cu.fechaInicio, fechas_texto: fechasCurso(cu), horas: String(cu.horas || ''), sede: cu.sede || '',
        instructor: { titulo: ins.titulo || '', nombre: ins.nombre || '', cargo: ins.cargo || 'Capacitador', registros: ins.registros || [] } },
      participantes: ps.map(p => ({ nombres: p.nombres, apellido_paterno: p.apellidoPaterno, apellido_materno: p.apellidoMaterno || '', curp: p.curp || '', puesto: p.puesto || '', ocupacion_especifica: p.ocupacion || '', empresa_razon_social: p.empresa || cu.empresa || '', folio_participacion: p.folio || '' })),
      folios_asignados: ps.filter(p => p.folio).reduce((o, p) => { o[p.curp || nombreParticipante(p)] = p.folio; return o; }, {}),
      aplica_dc3: aplicaDC3(cu),
      tipo_constancia: esEmpresa(cu) ? 'empresa' : 'individual',
      constancia_empresa: esEmpresa(cu) ? { texto: textoEmpresa(cu), folio: cu.folioEmpresa || '' } : null,
      origen: 'Cerebro Grupo VIME · ' + hoyISO()
    };
    const texto = sel => 'ORDEN VIME CURSO ' + claveCurso(cu) + '\nGenera con la skill Aula Virtual Grupo VIME: ' + sel.join(', ') + '.\n' +
      'Las constancias de participación ya se emiten en Cerebro: NO generes folios nuevos; usa folios_asignados si te pido constancias.\n' +
      (aplicaDC3(cu) ? 'Te adjunto la plantilla DC-3, el contenido del curso y la firma del capacitador.' : 'Este curso NO lleva DC-3. Te adjunto el contenido del curso.') + '\n\n```json\n' + JSON.stringify(orden, null, 1) + '\n```';
    const ops = (aplicaDC3(cu) ? ['DC-3 de cada participante (PDF)'] : []).concat(['Manual del Participante (Word)', 'Guía Visual (Word)', 'Póster o infografía (Word)']);
    abrirModal('Orden para Claude · ' + cu.curso, '<div class="form"><div class="campo ancho"><label>¿Qué necesita?</label>' + ops.map((o, k) => '<div class="campo check"><input type="checkbox" id="oc' + k + '"' + (k < 1 ? ' checked' : '') + '><label for="oc' + k + '">' + esc(o) + '</label></div>').join('') + '</div>' +
      '<div class="campo ancho"><label>Orden (cópiela y péguela en Claude)</label><textarea id="ocTexto" rows="12" readonly style="font-family:monospace;font-size:12px"></textarea>' +
      '<span class="ayuda">' + (aplicaDC3(cu) ? 'Para las DC-3 verifique que todas las CURP estén correctas y la razón social de la empresa. Adjunte en el chat la plantilla DC-3 de Word, el documento de contenido del curso (para el material) y la firma.' : 'Este curso no lleva DC-3. Adjunte en el chat el documento de contenido del curso.') + '</span></div>' +
      '<div class="form-pie"><button type="button" class="btn sec" data-acc="cerrarModal">Cerrar</button><button type="button" class="btn" id="ocCopiar">Copiar orden</button></div></div>');
    document.querySelector('.modal').classList.add('ancha');
    const act = () => { $('#ocTexto').value = texto(ops.filter((o, k) => $('#oc' + k).checked)); };
    ops.forEach((o, k) => $('#oc' + k).addEventListener('change', act)); act();
    $('#ocCopiar').addEventListener('click', async () => { try { await navigator.clipboard.writeText($('#ocTexto').value); toast('Orden copiada'); } catch (e) { $('#ocTexto').select(); document.execCommand('copy'); toast('Orden copiada'); } });
  }

  async function estadoConstancia(folio, cancelar) {
    const r = registroDe(folio); if (!r) return;
    if (cancelar && !confirm('¿Cancelar la constancia ' + folio + '? La página de validación la mostrará como CANCELADA.')) return;
    await guardar('constancias', Object.assign({}, r, cancelar ? { estado: 'cancelada', canceladaPor: Datos.usuario().nombre, fechaCancelacion: hoyISO() } : { estado: 'vigente', canceladaPor: '', fechaCancelacion: '' }), cancelar ? 'Constancia cancelada' : 'Constancia reactivada');
  }
  function constanciasEvento(evId) {
    const ev = porId('eventos', evId); const ya = (DB.cursos || []).find(c => c.eventoId === evId);
    if (ya) { location.hash = '#/curso/' + ya.id; return; }
    const s = servicio(ev.servicioId) || {}; const { c } = s.id ? cadena(s) : { c: {} };
    const mod = MODALIDADES.find(m => norm(m) === norm(ev.modalidad)) || (/l[ií]nea/i.test(ev.modalidad || '') ? 'En línea' : /h[ií]brid|mixt/i.test(ev.modalidad || '') ? 'Mixta' : 'Presencial');
    formCurso(null, { curso: ev.curso || '', modalidad: mod, fechaInicio: ev.fecha, fechaFin: ev.fecha, horas: ev.cargaHoraria || '', servicioId: ev.servicioId || '', eventoId: ev.id, empresa: c.razonSocial || '' });
  }

  /* Cambios en casillas, fechas y selectores */
  const CAMBIO = {
    etapa: async el => {
      const obj = porId(el.dataset.col, el.dataset.id);
      const et = Object.assign({}, obj.etapas || {});
      if (el.checked) et[el.dataset.k] = hoyISO(); else delete et[el.dataset.k];
      await guardar(el.dataset.col, Object.assign({}, obj, { etapas: et }));
    },
    etapaFecha: async el => {
      if (!el.value) return;
      const obj = porId(el.dataset.col, el.dataset.id);
      await guardar(el.dataset.col, Object.assign({}, obj, { etapas: Object.assign({}, obj.etapas, { [el.dataset.k]: el.value }) }));
    },
    resCampo: async el => { await cambiarResolucion(el.dataset.id, el.dataset.r, { [el.dataset.campo]: el.checked ? hoyISO() : '' }); },
    resFecha: async el => { if (el.value) await cambiarResolucion(el.dataset.id, el.dataset.r, { [el.dataset.campo]: el.value }); },
    avanceStps: async el => { const s = servicio(el.dataset.id); await guardar('servicios', Object.assign({}, s, { datos: Object.assign({}, s.datos, { avance: +el.value }) })); },
    pendiente: async el => { const p = porId('pendientes', el.dataset.id); await guardar('pendientes', Object.assign({}, p, { entregado: el.checked ? hoyISO() : '' })); }
  };

  document.addEventListener('click', e => {
    const el = e.target.closest('[data-acc]');
    const enlace = e.target.closest('a[href]');
    if (el && enlace && enlace !== el && el.contains(enlace)) return;
    if (!el) { if (e.target.id === 'capaModal') cerrarModal(); return; }
    const f = ACC[el.dataset.acc]; if (!f) return;
    if (el.tagName !== 'A' || el.dataset.acc !== 'irPagos') e.preventDefault();
    e.stopPropagation();
    f(el);
  });
  document.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 'selEjercicio') { estado.ejercicio = +el.value; pintar(); return; }
    if (el.dataset && el.dataset.cambio && CAMBIO[el.dataset.cambio]) CAMBIO[el.dataset.cambio](el);
  });
  document.addEventListener('input', e => {
    if (e.target.id === 'buscarCliente') {
      estado.filtroClientes = e.target.value; const pos = e.target.selectionStart; pintar();
      const b = $('#buscarCliente'); b.focus(); b.setSelectionRange(pos, pos);
    }
    if (e.target.id === 'buscarConst') {
      estado.filtroConst = e.target.value; const pos = e.target.selectionStart; pintar();
      const b = $('#buscarConst'); b.focus(); b.setSelectionRange(pos, pos);
    }
    if (e.target.dataset && e.target.dataset.cambio === 'avanceStps') $('#numStps').textContent = e.target.value + '%';
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#capaModal').hidden) cerrarModal(); });
  window.addEventListener('hashchange', pintar);

  /* ======================= Arranque ======================= */
  function pintarUsuario() {
    const u = Datos.usuario();
    $('#usuarioCaja').innerHTML = '<div class="avatar">' + esc(u.nombre[0]) + '</div><div class="nombre-u"><b>' + esc(u.nombre) + '</b><small>' + esc(u.rol) + '</small></div>';
    if (Datos.MODO_PRUEBA) {
      const fr = $('#franjaPrueba'); fr.hidden = false;
      fr.innerHTML = 'VERSIÓN DE PRUEBA · datos ficticios · Ver la app como: <select id="selUsuarioPrueba">' + USUARIOS.map(x => '<option value="' + x.id + '"' + (x.id === u.id ? ' selected' : '') + '>' + esc(x.nombre + ' (' + x.rol + ')') + '</option>').join('') + '</select>';
      $('#selUsuarioPrueba').onchange = async ev => { await Datos.entrar(ev.target.value); pintarUsuario(); cargarTodo(); };
    }
  }

  async function cargarTodo(manual) {
    try {
      sinc('Sincronizando…');
      DB = await Datos.cargar();
      sinc(Datos.MODO_PRUEBA ? '' : 'Actualizado ' + new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }));
      pintar();
      if (manual) toast('Datos actualizados');
    } catch (e) {
      sinc('Sin conexión');
      if (e.codigo === 'clave') { Datos.cerrarSesion(); pantallaEntrada('Su sesión ya no es válida. Entre de nuevo.'); return; }
      toast('No se pudo sincronizar: ' + e.message, true);
    }
  }

  function pantallaEntrada(msg) {
    document.body.innerHTML = '<div class="entrada"><div class="caja"><img src="img/logo_gv.png" alt="Grupo VIME"><div class="marca-app" style="margin:10px 0 0">CEREBRO</div>' +
      '<form class="form" id="formEntrada"><div class="campo"><label>¿Quién entra?</label><select id="eUsuario">' + USUARIOS.map(u => '<option value="' + u.id + '">' + esc(u.nombre + ' · ' + u.rol) + '</option>').join('') + '</select></div>' +
      '<div class="campo"><label>Clave personal</label><input id="eClave" type="password" autocomplete="current-password" required></div>' +
      '<div class="error-form" id="eErr"' + (msg ? '' : ' hidden') + '>' + esc(msg || '') + '</div><button class="btn" type="submit" style="justify-content:center">Entrar</button></form></div></div>';
    document.getElementById('formEntrada').addEventListener('submit', async e => {
      e.preventDefault(); const b = e.submitter; b.disabled = true; b.textContent = 'Verificando…';
      try { await Datos.entrar(document.getElementById('eUsuario').value, document.getElementById('eClave').value); location.reload(); }
      catch (ex) { const er = document.getElementById('eErr'); er.textContent = ex.message; er.hidden = false; b.disabled = false; b.textContent = 'Entrar'; }
    });
  }

  function iniciar() {
    Datos.leerSesion();
    if (!Datos.usuario()) { pantallaEntrada(); return; }
    pintarUsuario();
    cargarTodo();
    if (!Datos.MODO_PRUEBA) {
      setInterval(() => { if (document.visibilityState === 'visible' && $('#capaModal').hidden) cargarTodo(); }, 120000);
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && $('#capaModal').hidden) cargarTodo(); });
      if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
    }
  }
  iniciar();
})();
