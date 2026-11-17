/**
 * Cerebro Grupo VIME · Lógica de negocio (sin pantalla).
 * Este mismo archivo se copia al servidor (servidor/Logica.gs) para que
 * el correo diario de avisos calcule exactamente lo mismo que la app.
 */

/* ======================= Usuarios ======================= */
const USUARIOS = [
  { id: 'directora', nombre: 'Directora', rol: 'Directora', correo: 'contacto@grupovimeconsultoria.com', pagos: true },
  { id: 'samuel', nombre: 'Samuel', rol: 'Atención al Cliente', correo: 'contacto.grupovime@gmail.com', pagos: false },
  { id: 'aula', nombre: 'Aula Virtual', rol: 'Capacitaciones', correo: 'grupovime.morelos@gmail.com', pagos: false }
];

/* ======================= Fechas ======================= */
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

function pad2(n) { return (n < 10 ? '0' : '') + n; }
function aISO(d) { return d.getFullYear() + '-' + pad2(d.getMonth() + 1) + '-' + pad2(d.getDate()); }
function deISO(s) { const p = String(s).split('-'); return new Date(+p[0], +p[1] - 1, +p[2], 12); }
function hoyISO() { return aISO(new Date()); }
function sumarDias(iso, n) { const d = deISO(iso); d.setDate(d.getDate() + n); return aISO(d); }
function difDias(a, b) { return Math.round((deISO(b) - deISO(a)) / 86400000); } // b − a
function fechaLarga(iso) { if (!iso) return ''; const d = deISO(iso); return DIAS[d.getDay()] + ' ' + d.getDate() + ' de ' + MESES[d.getMonth()] + ' de ' + d.getFullYear(); }
function fechaCorta(iso) { if (!iso) return ''; const d = deISO(iso); return d.getDate() + ' ' + MESES[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear(); }

/** n-ésimo lunes (n = 1, 2, 3…) de un mes (0–11). */
function nLunes(anio, mes, n) {
  const d = new Date(anio, mes, 1, 12);
  const desfase = (8 - d.getDay()) % 7; // días hasta el primer lunes
  d.setDate(1 + desfase + (n - 1) * 7);
  return aISO(d);
}

/** Días de descanso obligatorio (Ley Federal del Trabajo, art. 74). */
const _festivosCache = {};
function festivos(anio) {
  if (_festivosCache[anio]) return _festivosCache[anio];
  const f = [
    anio + '-01-01',
    nLunes(anio, 1, 1),   // 5 de febrero → primer lunes de febrero
    nLunes(anio, 2, 3),   // 21 de marzo → tercer lunes de marzo
    anio + '-05-01',
    anio + '-09-16',
    nLunes(anio, 10, 3),  // 20 de noviembre → tercer lunes de noviembre
    anio + '-12-25'
  ];
  if ((anio - 2024) % 6 === 0) f.push(anio + '-10-01'); // transmisión del Poder Ejecutivo
  _festivosCache[anio] = f;
  return f;
}
function esHabil(iso) {
  const d = deISO(iso), w = d.getDay();
  if (w === 0 || w === 6) return false;
  return festivos(d.getFullYear()).indexOf(iso) < 0;
}
/** Suma (o resta, si n < 0) días hábiles. */
function sumarHabiles(iso, n) {
  let d = iso; const paso = n < 0 ? -1 : 1; let k = Math.abs(n);
  while (k > 0) { d = sumarDias(d, paso); if (esHabil(d)) k--; }
  return d;
}

/* ======================= Catálogos ======================= */
const TIPOS = {
  PIPC: { nombre: 'Elaboración de PIPC', corto: 'PIPC', color: '#0F4478' },
  BITACORA: { nombre: 'Certificación de Bitácora de Simulacros', corto: 'Bitácora', color: '#636363' },
  SIMULACROS: { nombre: 'Programa Anual de Simulacros', corto: 'Simulacros', color: '#EA7001' },
  CAPACITACIONES: { nombre: 'Programa Anual de Capacitaciones', corto: 'Capacitaciones', color: '#136CA8' },
  VISTOBUENO: { nombre: 'Gestoría de Visto Bueno', corto: 'Visto Bueno', color: '#C8962E' },
  STPS: { nombre: 'Cumplimiento Normativo STPS', corto: 'STPS', color: '#2E7D5B' }
};
const ORDEN_TIPOS = ['PIPC', 'BITACORA', 'SIMULACROS', 'CAPACITACIONES', 'VISTOBUENO', 'STPS'];

const RESULTADOS_PIPC = {
  pendiente: 'En espera de resolución',
  aprobado: 'APROBADO',
  no_aprobado: 'NO APROBADO',
  condicionado: 'CONDICIONADO'
};

const CURSOS = ['Formación de Brigadas', 'Simulacros', 'Uso y Manejo de Extintores', 'Primeros Auxilios',
  'Sistema de Comando de Incidentes', 'Evacuación', 'Materiales Peligrosos'];
const MODALIDADES = ['Presencial', 'En línea', 'Híbrida'];
const TIPOS_SIMULACRO = ['De campo', 'De gabinete'];
const HIPOTESIS = ['Sismo', 'Incendio', 'Fuga de gas', 'Inundación', 'Amenaza de bomba', 'Derrame de materiales peligrosos', 'Explosión', 'Lesionado / primeros auxilios', 'Evacuación general'];
const SERVICIOS_STPS = ['NOM-001-STPS', 'NOM-002-STPS', 'NOM-004-STPS', 'NOM-005-STPS', 'NOM-006-STPS', 'NOM-009-STPS',
  'NOM-010-STPS', 'NOM-011-STPS', 'NOM-017-STPS', 'NOM-018-STPS', 'NOM-019-STPS', 'NOM-020-STPS', 'NOM-022-STPS',
  'NOM-025-STPS', 'NOM-026-STPS', 'NOM-029-STPS', 'NOM-030-STPS', 'NOM-035-STPS', 'NOM-036-1-STPS',
  'Inspección de Capacitación y Adiestramiento', 'Inspección de Condiciones Generales de Trabajo',
  'Inspección de Seguridad e Higiene', 'Otro'];

/** Clasificación del fenómeno perturbador según la hipótesis (Ley General de Protección Civil). */
function claseFenomeno(h) {
  const t = String(h || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (/sismo|terremoto|volcan|deslave|hundimiento|tsunami/.test(t)) return 'Geológico';
  if (/inundaci|huracan|lluvia|granizo|tormenta|helada|nevada|sequia|viento/.test(t)) return 'Hidrometeorológico';
  if (/incendio|fuego|conato|fuga|derrame|explosi|quimic|sqp|gas|radiacion/.test(t)) return 'Químico-tecnológico';
  if (/epidemia|pandemia|plaga|contaminaci|intoxicaci/.test(t)) return 'Sanitario-ecológico';
  if (/accidente|amenaza|bomba|concentraci|vial|asalto|sabotaje|terroris|disturbio/.test(t)) return 'Socio-organizativo';
  if (/meteorito|tormenta solar/.test(t)) return 'Astronómico';
  return '';
}

/** Límites del calendario (para todo el equipo). */
const LIMITES = { simulacrosPorDia: 3, capacitacionesPorDia: 2, duracionSimulacroMin: 60 };

/* ======================= Resoluciones del PIPC ======================= */
/**
 * Historial de resoluciones de la autoridad, de la más antigua a la más reciente.
 * Cada resolución: { id, tipo: 'no_aprobado'|'condicionado'|'aprobado', fecha (notificación), oficio, nota,
 *   subsanado (fecha en que se cumplieron las observaciones, solo NO APROBADO),
 *   cumplido (fecha en que se cumplieron las condicionantes, solo CONDICIONADO),
 *   escritos: [{ fecha, nota }] (escritos mensuales de avance, solo CONDICIONADO) }
 */
function resolucionesPIPC(s) {
  const d = (s && s.datos) || {};
  let r = Array.isArray(d.resoluciones) ? d.resoluciones.slice() : [];
  if (!r.length && d.resultado && d.resultado !== 'pendiente') {
    // registros anteriores a la versión con historial
    r = [{ id: 'res_ant', tipo: d.resultado, fecha: d.fechaNotificacion || '', subsanado: (s.etapas || {}).subsanado || '', cumplido: (s.etapas || {}).condicionCumplida || '', escritos: d.escritos || [] }];
  }
  return r.sort((a, b) => String(a.fecha || '').localeCompare(String(b.fecha || '')));
}
function ultimaResolucion(s) { const r = resolucionesPIPC(s); return r.length ? r[r.length - 1] : null; }
function plazoSubsanar(res) { return res && res.fecha ? sumarHabiles(res.fecha, 20) : ''; }

/* ======================= Etapas y avance ======================= */
/** Devuelve las etapas que aplican a un servicio según su tipo y su estado actual. */
function etapasServicio(s) {
  const d = s.datos || {};
  switch (s.tipo) {
    case 'PIPC': {
      const e = [
        { k: 'formatos', t: 'Envío de formatos y lista de documentos al cliente (correo)' },
        { k: 'levantamiento', t: 'Levantamiento fotográfico y recolección de documentos' },
        { k: 'elaboracion', t: 'Elaboración del PIPC' },
        { k: 'ingreso', t: 'Ingreso a la autoridad de Protección Civil (enero–marzo)' },
        { k: 'entregaAcuse', t: 'Entrega del PIPC impreso al cliente con acuse' },
        { k: 'resolucion', t: 'Resolución de la autoridad', auto: true, hecho: resolucionesPIPC(s).length > 0 }
      ];
      const u = ultimaResolucion(s);
      if (u && u.tipo === 'no_aprobado') {
        e.push({ k: 'subsanado', t: 'Observaciones del NO APROBADO subsanadas (20 días hábiles)', auto: true, hecho: !!u.subsanado });
        e.push({ k: 'nuevaResolucion', t: 'Nueva resolución de la autoridad', auto: true, hecho: false });
      }
      if (u && u.tipo === 'condicionado') e.push({ k: 'condicionCumplida', t: 'Condicionantes cumplidas en su totalidad', auto: true, hecho: !!u.cumplido });
      const hayAprobado = resolucionesPIPC(s).some(r => r.tipo === 'aprobado');
      e.push({ k: 'entregaAprobado', t: 'Entrega del APROBADO al cliente', espera: !hayAprobado });
      return e;
    }
    case 'BITACORA': return [
      { k: 'integracion', t: 'Integración de la bitácora (simulacros y sesiones de la UIPC del año anterior)' },
      { k: 'entrega', t: 'Entrega de la bitácora a la autoridad con solicitud (enero)' },
      { k: 'certificada', t: 'Bitácora certificada (subir foto de la certificación)' }
    ];
    case 'SIMULACROS': return [{ k: 'programaIngresado', t: 'Programa anual de simulacros ingresado a PC (1er trimestre)' }];
    case 'CAPACITACIONES': return [{ k: 'programaPlaneado', t: 'Programa anual de capacitaciones planeado' }];
    case 'VISTOBUENO': return [
      { k: 'solicitud', t: 'Elaboración de la solicitud de Visto Bueno' },
      { k: 'ingreso', t: 'Ingreso de la solicitud con el PIPC (1er trimestre)' },
      { k: 'obtenido', t: 'Visto Bueno obtenido y entregado al cliente' }
    ];
    default: return [];
  }
}

function etapasEvento(ev) {
  return ev.clase === 'simulacro'
    ? [{ k: 'planeacion', t: 'Planeación (guion e hipótesis)' }, { k: 'ejecucion', t: 'Ejecución' }, { k: 'evidencia', t: 'Evidencia presentada a la autoridad de PC' }]
    : [{ k: 'planeacion', t: 'Planeación' }, { k: 'impartida', t: 'Capacitación impartida' }, { k: 'evidencia', t: 'Evidencia y constancias entregadas' }];
}

function etapaHecha(obj, et) { return et.auto ? !!et.hecho : !!(obj.etapas && obj.etapas[et.k]); }

/** Porcentaje de avance (0–100) de un servicio. */
function avanceServicio(s, eventos) {
  if (s.tipo === 'STPS') return Math.max(0, Math.min(100, +((s.datos || {}).avance) || 0));
  const et = etapasServicio(s);
  let hechas = et.filter(e => etapaHecha(s, e)).length, total = et.length;
  if (s.tipo === 'SIMULACROS' || s.tipo === 'CAPACITACIONES') {
    const evs = (eventos || []).filter(e => e.servicioId === s.id && !e.cancelado);
    const contratados = s.tipo === 'SIMULACROS' ? (+(s.datos || {}).numSimulacros || 1) : (+(s.datos || {}).numCursos || 0);
    const n = Math.max(contratados, evs.length);
    evs.forEach(ev => { hechas += etapasEvento(ev).filter(e => etapaHecha(ev, e)).length; });
    total += n * 3;
  }
  return total ? Math.round(hechas * 100 / total) : 0;
}

function estadoServicio(s, eventos) {
  const a = avanceServicio(s, eventos);
  if (a >= 100) return 'Concluido';
  if (a === 0) return 'Por iniciar';
  return 'En proceso';
}

/* ======================= Calendario: reglas de empalme ======================= */
function aMin(h) { const p = String(h || '00:00').split(':'); return (+p[0]) * 60 + (+p[1] || 0); }
function finEvento(ev) {
  const ini = aMin(ev.hora);
  return ini + (ev.clase === 'simulacro' ? LIMITES.duracionSimulacroMin : Math.round((+ev.cargaHoraria || 1) * 60));
}
function hhmm(min) { return pad2(Math.floor(min / 60) % 24) + ':' + pad2(min % 60); }

/**
 * Revisa si un evento rompe las reglas del calendario del equipo.
 * Devuelve null si todo está bien, o un texto con el motivo.
 */
function validarEvento(ev, eventos, nombreDe) {
  if (!ev.fecha || !ev.hora) return 'Indique fecha y hora.';
  if (ev.cancelado) return null;
  const mismos = eventos.filter(o => o.id !== ev.id && !o.cancelado && o.clase === ev.clase && o.fecha === ev.fecha);
  const limite = ev.clase === 'simulacro' ? LIMITES.simulacrosPorDia : LIMITES.capacitacionesPorDia;
  const nombre = ev.clase === 'simulacro' ? 'simulacros' : 'capacitaciones';
  if (mismos.length >= limite) {
    return 'Ya hay ' + mismos.length + ' ' + nombre + ' el ' + fechaLarga(ev.fecha) + ' (máximo ' + limite + ' por día).';
  }
  const ini = aMin(ev.hora), fin = finEvento(ev);
  for (const o of mismos) {
    const oi = aMin(o.hora), of = finEvento(o);
    if (ini < of && oi < fin) {
      return 'Se empalma con ' + (ev.clase === 'simulacro' ? 'el simulacro' : 'la capacitación') + ' de ' +
        (nombreDe ? nombreDe(o) : 'otro cliente') + ' (' + o.hora + '–' + hhmm(of) + ').';
    }
  }
  return null;
}

/* ======================= WhatsApp ======================= */
function telWhatsApp(tel) {
  let d = String(tel || '').replace(/\D/g, '');
  if (d.length === 10) d = '52' + d;
  if (d.length === 13 && d.indexOf('521') === 0) d = '52' + d.slice(3);
  return d;
}
/** Fecha en que se debe avisar al cliente (2 días hábiles antes). */
function fechaAviso(ev) { return sumarHabiles(ev.fecha, -2); }

/** Firma del aviso de WhatsApp (se puede cambiar en Ajustes). */
const FIRMA_WHATSAPP = { empresa: 'Grupo VIME', area: 'Atención a cliente', telefono: '7352980034', nombre: 'Samuel Martinez' };
const ORDINALES = ['primer', 'segundo', 'tercer', 'cuarto', 'quinto', 'sexto', 'séptimo', 'octavo', 'noveno', 'décimo', 'décimo primer', 'décimo segundo'];

/** Número del simulacro dentro del año para el mismo servicio (1 = primero). */
function numeroSimulacro(ev, eventos) {
  const anio = String(ev.fecha).slice(0, 4);
  const lista = (eventos || []).filter(e => e.servicioId === ev.servicioId && e.clase === 'simulacro' && !e.cancelado && String(e.fecha).slice(0, 4) === anio)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
  const i = lista.findIndex(e => e.id === ev.id);
  return i < 0 ? lista.length + 1 : i + 1;
}
function fechaAviso2(iso) { const d = deISO(iso); const m = MESES[d.getMonth()]; return pad2(d.getDate()) + ' de ' + m.charAt(0).toUpperCase() + m.slice(1) + ' de ' + d.getFullYear(); }

/** Mensaje de WhatsApp con el formato de Grupo VIME. */
function mensajeSimulacro(ev, inm, eventos, firma) {
  firma = Object.assign({}, FIRMA_WHATSAPP, firma || {});
  const n = numeroSimulacro(ev, eventos);
  const tipo = ev.tipoSimulacro && TIPOS_SIMULACRO.indexOf(ev.tipoSimulacro) >= 0 ? ev.tipoSimulacro : '';
  const lineas = [
    String((inm && inm.nombreComercial) || '').toUpperCase() + ' 🌎',
    'Buen día 👋',
    'Este es un atento recordatorio sobre el ' + (ORDINALES[n - 1] || n + '.º') + ' simulacro del año, el cual se llevará a cabo el:',
    '📅 ' + fechaAviso2(ev.fecha),
    '⏰ ' + ev.hora + ' horas'
  ];
  if (tipo) lineas.push('🧪 Tipo: ' + tipo);
  if (ev.hipotesis) lineas.push('⚠️ Hipótesis: “' + ev.hipotesis + '”');
  lineas.push('Agradecemos su participación y compromiso para fortalecer la cultura de la prevención y la seguridad en nuestras instalaciones.',
    'Quedamos a sus órdenes para cualquier duda o comentario. 😊', '',
    '  ' + firma.empresa, '*' + firma.area + '*', '```' + firma.telefono + '```', '_' + firma.nombre + '_');
  return lineas.join('\n');
}

/* ======================= Pagos ======================= */
function resumenCobro(c) {
  c = c || {};
  const movs = c.movimientos || [];
  const pagado = movs.filter(m => m.tipo === 'pago').reduce((a, m) => a + (+m.monto || 0), 0);
  const facturado = movs.filter(m => m.tipo === 'factura').reduce((a, m) => a + (+m.monto || 0), 0);
  const precio = +c.precio || 0;
  return {
    precio, pagado, facturado,
    saldo: Math.max(0, precio - pagado),
    porFacturar: c.requiereFactura ? Math.max(0, pagado - facturado) : 0,
    requiereFactura: !!c.requiereFactura
  };
}
function dinero(n) { return '$' + (+n || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

/* ======================= Avisos ======================= */
/**
 * Calcula todos los avisos vigentes.
 * db = { clientes, inmuebles, servicios, eventos, pendientes, cobros? }
 * Devuelve [{ nivel: 'rojo'|'ambar'|'azul', titulo, detalle, servicioId, eventoId, para: 'equipo'|'directora', fecha }]
 */
function calcularAvisos(db, hoy, conPagos) {
  hoy = hoy || hoyISO();
  const anio = +hoy.slice(0, 4);
  const out = [];
  const inmDe = id => db.inmuebles.find(i => i.id === id) || {};
  const cliDe = id => db.clientes.find(c => c.id === id) || {};
  const quien = s => { const i = inmDe(s.inmuebleId); const c = cliDe(i.clienteId); return (c.nombreComercial || c.razonSocial || '') + ' · ' + (i.nombreComercial || ''); };
  const plazo = (fechaLimite, s, titulo, k) => {
    const dias = difDias(hoy, fechaLimite);
    if (dias < 0) out.push({ nivel: 'rojo', titulo: titulo + ' — fuera de plazo', detalle: quien(s) + '. Venció el ' + fechaCorta(fechaLimite) + '.', servicioId: s.id, fecha: fechaLimite, clave: k });
    else if (dias <= 10) out.push({ nivel: 'rojo', titulo: titulo, detalle: quien(s) + '. Vence el ' + fechaCorta(fechaLimite) + ' (' + dias + ' días).', servicioId: s.id, fecha: fechaLimite, clave: k });
    else if (dias <= 30) out.push({ nivel: 'ambar', titulo: titulo, detalle: quien(s) + '. Vence el ' + fechaCorta(fechaLimite) + ' (' + dias + ' días).', servicioId: s.id, fecha: fechaLimite, clave: k });
  };

  db.servicios.filter(s => !s.archivado && +s.ejercicio === anio).forEach(s => {
    const d = s.datos || {}, et = s.etapas || {};
    const finTrim = anio + '-03-31';
    if (s.tipo === 'PIPC') {
      if (!et.ingreso) plazo(finTrim, s, 'Ingresar PIPC a Protección Civil', 'pipc');
      const resols = resolucionesPIPC(s);
      const hayAprobado = resols.some(r => r.tipo === 'aprobado');
      resols.forEach(r => {
        if (hayAprobado) return; // con el APROBADO ya no corren plazos anteriores
        if (r.tipo === 'no_aprobado' && r.fecha && !r.subsanado) {
          const lim = plazoSubsanar(r);
          const dias = difDias(hoy, lim);
          out.push({
            nivel: dias <= 5 ? 'rojo' : 'ambar',
            titulo: 'PIPC NO APROBADO: subsanar observaciones',
            detalle: quien(s) + '. Plazo de 20 días hábiles: vence el ' + fechaCorta(lim) + (dias < 0 ? ' (vencido).' : ' (' + dias + ' días naturales).'),
            servicioId: s.id, fecha: lim, clave: 'noaprob'
          });
        }
        if (r.tipo === 'condicionado' && !r.cumplido) {
          const mes = hoy.slice(0, 7), dia = +hoy.slice(8, 10);
          const presentado = (r.escritos || []).some(x => String(x.fecha || '').slice(0, 7) === mes);
          if (!presentado && dia <= 5) out.push({ nivel: 'rojo', titulo: 'PIPC CONDICIONADO: presentar escrito de avance', detalle: quien(s) + '. Debe presentarse a más tardar el 5 de ' + MESES[+mes.slice(5) - 1] + '.', servicioId: s.id, fecha: mes + '-05', clave: 'condic' });
          else if (!presentado && dia > 5 && r.fecha && r.fecha.slice(0, 7) < mes) out.push({ nivel: 'rojo', titulo: 'PIPC CONDICIONADO: escrito de ' + MESES[+mes.slice(5) - 1] + ' no registrado', detalle: quien(s) + '. Debía presentarse los primeros 5 días del mes.', servicioId: s.id, fecha: mes + '-05', clave: 'condic' });
          else if (dia >= 25) out.push({ nivel: 'ambar', titulo: 'PIPC CONDICIONADO: preparar escrito del próximo mes', detalle: quien(s) + '. Se presenta los primeros 5 días del mes.', servicioId: s.id, fecha: sumarDias(mes + '-01', 35).slice(0, 7) + '-05', clave: 'condic' });
        }
      });
      if (hayAprobado && !et.entregaAprobado) out.push({ nivel: 'azul', titulo: 'Entregar PIPC APROBADO al cliente', detalle: quien(s) + '.', servicioId: s.id, fecha: hoy, clave: 'entapr' });
    }
    if (s.tipo === 'BITACORA' && !et.entrega) plazo(anio + '-01-31', s, 'Entregar bitácora a la autoridad para su certificación', 'bita');
    if (s.tipo === 'SIMULACROS' && !et.programaIngresado) plazo(finTrim, s, 'Ingresar programa anual de simulacros', 'progsim');
    if (s.tipo === 'VISTOBUENO' && !et.ingreso) plazo(finTrim, s, 'Ingresar solicitud de Visto Bueno', 'vb');
  });

  // Simulacros y capacitaciones sin cerrar después de su fecha
  db.eventos.filter(e => !e.cancelado && e.fecha < hoy).forEach(ev => {
    const s = db.servicios.find(x => x.id === ev.servicioId); if (!s || s.archivado) return;
    const clave = ev.clase === 'simulacro' ? 'ejecucion' : 'impartida';
    if (!(ev.etapas || {})[clave]) out.push({ nivel: 'ambar', titulo: (ev.clase === 'simulacro' ? 'Simulacro' : 'Capacitación') + ' pasado sin marcar como realizado', detalle: quien(s) + ' · ' + fechaCorta(ev.fecha) + '.', servicioId: s.id, eventoId: ev.id, fecha: ev.fecha, clave: 'evpas' });
    else if (!(ev.etapas || {}).evidencia && difDias(ev.fecha, hoy) >= 5) out.push({ nivel: 'ambar', titulo: 'Evidencia pendiente de ' + (ev.clase === 'simulacro' ? 'simulacro' : 'capacitación'), detalle: quien(s) + ' · ' + fechaCorta(ev.fecha) + '.', servicioId: s.id, eventoId: ev.id, fecha: ev.fecha, clave: 'evid' });
  });

  // Documentos que debe entregar el cliente
  (db.pendientes || []).filter(p => !p.entregado).forEach(p => {
    const s = db.servicios.find(x => x.id === p.servicioId); if (!s || s.archivado) return;
    if (!p.fechaLimite) { out.push({ nivel: 'azul', titulo: 'Documento pendiente del cliente: ' + p.descripcion, detalle: quien(s) + '.', servicioId: s.id, fecha: hoy, clave: 'doc' }); return; }
    const dias = difDias(hoy, p.fechaLimite);
    out.push({
      nivel: dias < 0 ? 'rojo' : dias <= 3 ? 'ambar' : 'azul',
      titulo: 'Documento pendiente del cliente: ' + p.descripcion,
      detalle: quien(s) + '. ' + (dias < 0 ? 'Venció el ' : 'Fecha límite: ') + fechaCorta(p.fechaLimite) + '.',
      servicioId: s.id, fecha: p.fechaLimite, clave: 'doc'
    });
  });

  // Solo para la Directora
  if (conPagos && db.cobros) {
    db.cobros.forEach(c => {
      const s = db.servicios.find(x => x.id === c.id); if (!s) return;
      const r = resumenCobro(c);
      if (r.porFacturar > 0.009) out.push({ nivel: 'ambar', titulo: 'Factura pendiente de emitir', detalle: quien(s) + ' · ' + TIPOS[s.tipo].corto + ': ' + dinero(r.porFacturar) + ' pagado sin facturar.', servicioId: s.id, fecha: hoy, para: 'directora', clave: 'fact' });
      if (r.saldo > 0.009 && avanceServicio(s, db.eventos) >= 100) out.push({ nivel: 'ambar', titulo: 'Servicio concluido con saldo pendiente', detalle: quien(s) + ' · ' + TIPOS[s.tipo].corto + ': saldo ' + dinero(r.saldo) + '.', servicioId: s.id, fecha: hoy, para: 'directora', clave: 'saldo' });
    });
  }

  const peso = { rojo: 0, ambar: 1, azul: 2 };
  out.sort((a, b) => peso[a.nivel] - peso[b.nivel] || String(a.fecha).localeCompare(String(b.fecha)));
  return out;
}

/** Simulacros cuyo aviso de WhatsApp toca hoy (o ya tocaba y no se ha enviado). */
function avisosWhatsApp(db, hoy) {
  hoy = hoy || hoyISO();
  return db.eventos.filter(ev => ev.clase === 'simulacro' && !ev.cancelado && !ev.avisoEnviado &&
    ev.fecha >= hoy && fechaAviso(ev) <= hoy)
    .sort((a, b) => (a.fecha + a.hora).localeCompare(b.fecha + b.hora));
}

/* ======================= Constancias de participación ======================= */
/** Clave corta del curso para el folio (letras y números, máx. 6). Ej.: «PCO». */
function claveCurso(c) {
  const t = String((c && (c.clave || c.curso)) || 'CUR').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (c && c.clave) return t.replace(/[^A-Z0-9]/g, '').slice(0, 6) || 'CUR';
  const pal = t.replace(/[^A-Z0-9 ]/g, ' ').split(/\s+/).filter(w => w && ['DE', 'DEL', 'LA', 'LAS', 'LOS', 'EL', 'Y', 'EN', 'PARA', 'A'].indexOf(w) < 0);
  return (pal.map(w => w[0]).join('').slice(0, 6) || 'CUR');
}
function folioConstancia(prefijo, n) { return prefijo + '-' + (n < 10 ? '00' : n < 100 ? '0' : '') + n; }
/** Prefijo del folio tal como se imprime: el que capture el usuario (p. ej. GV.FB2026) o, si no hay, AV.{CLAVE}{AÑO}. */
function prefijoFolio(c) {
  const p = String(c.prefijoFolio || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9.\-]/g, '').replace(/^[.\-]+|[.\-]+$/g, '');
  return p || 'AV.' + claveCurso(c) + String(c.fechaFin || c.fechaInicio || hoyISO()).slice(0, 4);
}
function textoFechasCurso(fi, ff) {
  if (!fi) return '';
  ff = ff || fi; const a = deISO(fi), b = deISO(ff);
  const d = x => pad2(x.getDate()), m = x => MESES[x.getMonth()];
  if (fi === ff) return 'el día ' + d(a) + ' de ' + m(a) + ' de ' + a.getFullYear();
  if (a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()) return 'los días ' + d(a) + ' al ' + d(b) + ' de ' + m(a) + ' de ' + a.getFullYear();
  if (a.getFullYear() === b.getFullYear()) return 'del ' + d(a) + ' de ' + m(a) + ' al ' + d(b) + ' de ' + m(b) + ' de ' + a.getFullYear();
  return 'del ' + d(a) + ' de ' + m(a) + ' de ' + a.getFullYear() + ' al ' + d(b) + ' de ' + m(b) + ' de ' + b.getFullYear();
}
/** Texto de la constancia para toda la empresa: «El personal brigadista de <Razón social>». */
function textoEmpresa(curso) { return ((curso.leyendaEmpresa || 'El personal brigadista de') + ' ' + (curso.empresa || '')).replace(/\s+/g, ' ').trim(); }
function nombreParticipante(p) { if (p.nombreFijo) return p.nombreFijo; return [p.nombres, p.apellidoPaterno, p.apellidoMaterno].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }
/** Registro público de una constancia (lo que muestra la página de validación: nunca la CURP). */
function registroConstancia(curso, p, instructorNombre, quien, ahora) {
  return {
    id: p.folio, folio: p.folio, tipo: p.nombreFijo ? 'PAR-EMPRESA' : 'PAR', nombre: nombreParticipante(p), curso: curso.curso, clave: claveCurso(curso),
    modalidad: curso.modalidad || '', fechaInicio: curso.fechaInicio || '', fechaFin: curso.fechaFin || curso.fechaInicio || '',
    fechasTexto: curso.fechasTexto || textoFechasCurso(curso.fechaInicio, curso.fechaFin), horas: curso.horas || '', sede: curso.sede || '',
    instructor: instructorNombre || '', cursoId: curso.id, emitida: ahora, emitidaPor: quien || '', estado: 'vigente', actualizado: ahora
  };
}
/**
 * Asigna folios consecutivos (AV.{CLAVE}{AÑO}-{NNN}, un contador por curso y año) a los participantes sin folio.
 * contadores: { 'PAR_PCO_2026': 3 } · usados: lista de folios ya registrados (para nunca repetir).
 * Devuelve { curso, nuevos: [registros], contadores }. La usan la app (modo prueba) y el servidor.
 */
function asignarFolios(curso, contadores, usados, instructorNombre, quien, ahora) {
  const clave = claveCurso(curso), anio = String(curso.fechaFin || curso.fechaInicio || hoyISO()).slice(0, 4), pref = prefijoFolio(curso);
  const llave = curso.prefijoFolio ? 'PAR_' + pref : 'PAR_' + clave + '_' + anio; let n = +(contadores[llave] || 0);
  const ya = {}; (usados || []).forEach(f => { ya[f] = 1; });
  const nuevos = [];
  // Constancia única para toda la empresa: «El personal brigadista de <Razón social>»
  if (curso.tipoConstancia === 'empresa') {
    if (!curso.empresa) throw new Error('Para la constancia de toda la empresa falta la razón social del curso.');
    if (!curso.folioEmpresa) {
      let f; do { n++; f = folioConstancia(pref, n); } while (ya[f]);
      curso.folioEmpresa = f;
      nuevos.push(Object.assign(registroConstancia(curso, { folio: f, nombreFijo: textoEmpresa(curso) }, instructorNombre, quien, ahora), { participantes: (curso.participantes || []).length }));
    }
    contadores[llave] = n;
    return { curso, nuevos, contadores };
  }
  curso.participantes = (curso.participantes || []).map(p => {
    if (p.folio || p.excluir) return p;
    let f; do { n++; f = folioConstancia(pref, n); } while (ya[f]);
    ya[f] = 1; const q = Object.assign({}, p, { folio: f });
    nuevos.push(registroConstancia(curso, q, instructorNombre, quien, ahora));
    return q;
  });
  contadores[llave] = n;
  return { curso, nuevos, contadores };
}
/** Datos que la página pública de validación puede mostrar. */
function constanciaPublica(r) {
  return {
    folio: r.folio, nombre: r.nombre, curso: r.curso, modalidad: r.modalidad, fechas: r.fechasTexto || textoFechasCurso(r.fechaInicio, r.fechaFin),
    horas: r.horas, instructor: r.instructor, emitida: String(r.emitida || '').slice(0, 10), estado: r.estado || 'vigente',
    emisor: 'Aula Virtual Grupo VIME · Grupo VIME Asesoría Corporativa Integral'
  };
}

if (typeof module !== 'undefined') module.exports = { prefijoFolio, textoEmpresa, asignarFolios, constanciaPublica, claveCurso, textoFechasCurso, festivos, sumarHabiles, esHabil, validarEvento, avanceServicio, calcularAvisos, avisosWhatsApp, fechaAviso, resumenCobro, telWhatsApp, etapasServicio };
