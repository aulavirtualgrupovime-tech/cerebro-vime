/** Datos FICTICIOS para la versión de prueba. Las fechas se calculan a partir de hoy. */
/** Firma ficticia dibujada (solo para la versión de prueba). */
function firmaDemo() {
  try {
    const c = document.createElement('canvas'); c.width = 360; c.height = 120; const g = c.getContext('2d');
    g.strokeStyle = '#1a2a6c'; g.lineWidth = 3; g.lineCap = 'round'; g.beginPath(); g.moveTo(20, 80);
    for (let x = 20; x <= 330; x += 6) g.lineTo(x, 70 + Math.sin(x / 14) * 22 * Math.cos(x / 41));
    g.stroke(); g.beginPath(); g.moveTo(60, 98); g.lineTo(300, 92); g.stroke();
    return c.toDataURL('image/png');
  } catch (e) { return ''; }
}
function crearDatosDemo() {
  const hoy = hoyISO(), anio = +hoy.slice(0, 4);
  const d = n => sumarDias(hoy, n);
  const h = n => sumarHabiles(hoy, n);
  const t = '2026-01-01T00:00:00.000Z';
  const base = { creado: t, actualizado: t, creadoPor: 'Prueba', actualizadoPor: 'Prueba' };
  const R = o => Object.assign({}, base, o);

  const clientes = [
    R({ id: 'cli_1', razonSocial: 'Comercializadora del Sur de Morelos, S.A. de C.V.', nombreComercial: 'Super Sur', rfc: 'CSM150312AB1' }),
    R({ id: 'cli_2', razonSocial: 'Hotelera Tlahuica, S.A. de C.V.', nombreComercial: 'Hotel Jardín Tlahuica', rfc: 'HTL0901159K2' }),
    R({ id: 'cli_3', razonSocial: 'Colegio Ficticio de Cuernavaca, A.C.', nombreComercial: 'Colegio Cuernavaca', rfc: 'CFC980520LM3' })
  ];
  const inmuebles = [
    R({ id: 'inm_1', clienteId: 'cli_1', nombreComercial: 'Super Sur Centro', direccion: 'Av. Morelos 123, Col. Centro, Cuernavaca, Mor.', nrpc: 'PC-MOR-0001', riesgo: 'alto', m2Superficie: 2500, m2Construccion: 1800, aforo: 350, contactoNombre: 'Lic. Ana Pérez (ficticio)', contactoTel: '7770000001', logoIzq: 'gv', logoDer: 'logo_demo' }),
    R({ id: 'inm_2', clienteId: 'cli_1', nombreComercial: 'Super Sur Jiutepec', direccion: 'Blvd. Cuauhnáhuac km 5, Jiutepec, Mor.', nrpc: '', riesgo: 'ordinario', m2Superficie: 1200, m2Construccion: 900, aforo: 150, contactoNombre: 'Ing. Luis Gómez (ficticio)', contactoTel: '7770000002', logoIzq: 'gv', logoDer: 'logo_demo' }),
    R({ id: 'inm_3', clienteId: 'cli_2', nombreComercial: 'Hotel Jardín Tlahuica', direccion: 'Calle Río Mayo 45, Col. Vista Hermosa, Cuernavaca, Mor.', nrpc: 'PC-MOR-0002', riesgo: 'alto', m2Superficie: 6000, m2Construccion: 4200, aforo: 600, contactoNombre: 'Mtra. Rosa Díaz (ficticio)', contactoTel: '7770000003' }),
    R({ id: 'inm_4', clienteId: 'cli_3', nombreComercial: 'Colegio Cuernavaca · Plantel Norte', direccion: 'Av. Domingo Diez 800, Cuernavaca, Mor.', nrpc: '', riesgo: 'ordinario', m2Superficie: 4000, m2Construccion: 2600, aforo: 900, contactoNombre: 'Prof. Jorge Ruiz (ficticio)', contactoTel: '7770000004' })
  ];
  const servicios = [
    R({ id: 'ser_1', inmuebleId: 'inm_1', tipo: 'PIPC', ejercicio: anio, modalidad: 'alto', etapas: { formatos: anio + '-01-08', levantamiento: anio + '-01-20', elaboracion: anio + '-02-25', ingreso: anio + '-03-10', entregaAcuse: anio + '-03-12' }, datos: { resoluciones: [{ id: 'rsl_1', tipo: 'no_aprobado', fecha: h(-12), oficio: 'PC/DIR/0458/' + anio, nota: 'Actualizar análisis de riesgos externos y presentar dictamen eléctrico vigente.', escritos: [] }] } }),
    R({ id: 'ser_2', inmuebleId: 'inm_1', tipo: 'SIMULACROS', ejercicio: anio, etapas: { programaIngresado: anio + '-03-05' }, datos: { numSimulacros: 3 } }),
    R({ id: 'ser_3', inmuebleId: 'inm_1', tipo: 'CAPACITACIONES', ejercicio: anio, etapas: { programaPlaneado: anio + '-02-01' }, datos: { numCursos: 3 } }),
    R({ id: 'ser_4', inmuebleId: 'inm_2', tipo: 'PIPC', ejercicio: anio, modalidad: 'ordinario', etapas: { formatos: anio + '-01-10', levantamiento: anio + '-01-28', elaboracion: anio + '-03-01', ingreso: anio + '-03-20', entregaAcuse: anio + '-03-22' }, datos: { resoluciones: [
      { id: 'rsl_2', tipo: 'no_aprobado', fecha: anio + '-04-15', oficio: 'PC/DIR/0210/' + anio, nota: 'Faltan constancias de capacitación de brigadas.', subsanado: anio + '-05-08', escritos: [] },
      { id: 'rsl_3', tipo: 'condicionado', fecha: anio + '-06-10', oficio: 'PC/DIR/0333/' + anio, nota: 'Condicionado a la instalación de señalización y detectores de humo.', escritos: [{ fecha: anio + '-07-03', nota: '' }, { fecha: anio + '-08-04', nota: '' }, { fecha: anio + '-09-02', nota: '' }, { fecha: anio + '-10-05', nota: '' }] }
    ] } }),
    R({ id: 'ser_5', inmuebleId: 'inm_2', tipo: 'VISTOBUENO', ejercicio: anio, etapas: { solicitud: anio + '-03-15', ingreso: anio + '-03-20' }, datos: {} }),
    R({ id: 'ser_6', inmuebleId: 'inm_3', tipo: 'PIPC', ejercicio: anio, modalidad: 'alto', etapas: { formatos: anio + '-01-05', levantamiento: anio + '-01-15', elaboracion: anio + '-02-10', ingreso: anio + '-02-20', entregaAcuse: anio + '-02-21', entregaAprobado: anio + '-05-02' }, datos: { resoluciones: [{ id: 'rsl_4', tipo: 'aprobado', fecha: anio + '-04-28', oficio: 'PC/DIR/0255/' + anio, escritos: [] }] } }),
    R({ id: 'ser_7', inmuebleId: 'inm_3', tipo: 'BITACORA', ejercicio: anio, etapas: { integracion: anio + '-01-10', entrega: anio + '-01-20', certificada: anio + '-02-15' }, datos: {} }),
    R({ id: 'ser_8', inmuebleId: 'inm_3', tipo: 'SIMULACROS', ejercicio: anio, etapas: { programaIngresado: anio + '-02-28' }, datos: { numSimulacros: 2 } }),
    R({ id: 'ser_9', inmuebleId: 'inm_3', tipo: 'STPS', ejercicio: anio, etapas: {}, datos: { servicioStps: 'NOM-035-STPS', descripcion: 'Política, identificación de factores de riesgo psicosocial y cuestionarios.', avance: 60 } }),
    R({ id: 'ser_10', inmuebleId: 'inm_4', tipo: 'CAPACITACIONES', ejercicio: anio, etapas: {}, datos: { numCursos: 2 } }),
    R({ id: 'ser_11', inmuebleId: 'inm_4', tipo: 'SIMULACROS', ejercicio: anio, etapas: { programaIngresado: anio + '-03-25' }, datos: { numSimulacros: 2 } }),
    R({ id: 'ser_12', inmuebleId: 'inm_4', tipo: 'STPS', ejercicio: anio, etapas: {}, datos: { servicioStps: 'Inspección de Seguridad e Higiene', descripcion: 'Atención de inspección extraordinaria.', avance: 25 } })
  ];
  const ev = (id, servicioId, clase, fecha, hora, extra) => R(Object.assign({ id, servicioId, clase, fecha, hora, etapas: {} }, extra));
  const eventos = [
    ev('eve_1', 'ser_2', 'simulacro', anio + '-04-22', '10:00', { tipoSimulacro: 'De campo', hipotesis: 'Sismo', escenario: 'Sismo de magnitud 7.2 con epicentro en la costa de Guerrero', responsable: 'Samuel', etapas: { planeacion: anio + '-04-10', ejecucion: anio + '-04-22', evidencia: anio + '-04-30' }, avisoEnviado: anio + '-04-20' }),
    ev('eve_2', 'ser_2', 'simulacro', h(2), '10:00', { tipoSimulacro: 'De campo', hipotesis: 'Incendio', escenario: 'Conato de incendio en el área de panadería', responsable: 'Samuel', etapas: { planeacion: d(-5) },
      alcance: 'Parcial', programacion: 'Con previo aviso',
      guion: {
        objetivos: 'Evaluar el tiempo de respuesta de la brigada contra incendio.\nVerificar la evacuación del área de ventas en menos de 3 minutos.',
        tipoFenomeno: 'Químico-tecnológico', magnitud: 'Fuego incipiente clase A', areaAfectada: 'Panadería y pasillo de ventas', secundarios: 'Humo en el área de ventas',
        danos: 'Daño en el horno de la panadería', lesiones: 'Un trabajador con quemadura leve en la mano', obstaculos: 'Carros de mercancía en el pasillo 3', condiciones: 'Humo simulado con máquina de humo',
        estructura: { 'Coordinación General': 'Lic. Ana Pérez (ficticio)', 'Brigada Contra Incendios': 'Jorge Ruiz (ficticio)', 'Brigada de Evacuación': 'Laura Díaz (ficticio)' },
        sci: { pc: { ubicacion: 'Estacionamiento, cajón 1', responsable: 'Lic. Ana Pérez (ficticio)' }, ae: { ubicacion: 'Acceso principal', responsable: 'Jefe de seguridad' }, acv: { ubicacion: 'Junto al punto de reunión No. 1', responsable: 'Brigada de primeros auxilios' } },
        cronologia: [{ fase: 'FASE INICIAL. Fuego incipiente y activación de alarma.' }, { hora: '10:00', texto: 'Un trabajador de panadería detecta humo saliendo del horno y da la voz de alarma.' }, { hora: '10:00:30', texto: 'El Coordinador General asume el mando y ordena activar la alarma de emergencia.' },
          { fase: 'FASE INTERMEDIA. Evacuación parcial y combate al fuego.' }, { hora: '10:01', texto: 'La brigada contra incendio combate el fuego con extintor PQS mientras se evacua el área de ventas.' }, { hora: '10:03', texto: 'Se realiza el inventario de personas en el punto de reunión.' },
          { fase: 'FASE FINAL. Retorno a la normalidad.' }, { hora: '10:10', texto: 'El Comandante del Incidente da por concluido el simulacro.' }, { hora: '10:15', texto: 'La UIPC se reúne para evaluar el simulacro.' }]
      } }),
    ev('eve_3', 'ser_8', 'simulacro', h(2), '12:00', { tipoSimulacro: 'De gabinete', hipotesis: 'Sismo', escenario: 'Sismo de 7.5 en horario de ocupación máxima', responsable: 'Directora', etapas: { planeacion: d(-3) } }),
    ev('eve_4', 'ser_11', 'simulacro', d(-3), '09:00', { tipoSimulacro: 'De campo', hipotesis: 'Fuga de gas', escenario: 'Evacuación por fuga de gas en cocina escolar', responsable: 'Brigada interna del cliente', etapas: { planeacion: d(-10) }, avisoEnviado: d(-6) }),
    ev('eve_5', 'ser_8', 'simulacro', d(20), '11:00', { tipoSimulacro: 'De campo', hipotesis: 'Fuga de gas', escenario: 'Fuga de gas en cuarto de calderas', responsable: 'Samuel', etapas: {} }),
    ev('eve_6', 'ser_3', 'capacitacion', d(4), '09:00', { curso: 'Uso y Manejo de Extintores', modalidad: 'Presencial', cargaHoraria: 4, responsable: 'Aula Virtual', etapas: { planeacion: d(-2) } }),
    ev('eve_7', 'ser_3', 'capacitacion', d(4), '14:00', { curso: 'Primeros Auxilios', modalidad: 'Presencial', cargaHoraria: 3, responsable: 'Proveedor externo: Cruz Ficticia', etapas: {} }),
    ev('eve_8', 'ser_10', 'capacitacion', d(-8), '10:00', { curso: 'Formación de Brigadas', modalidad: 'En línea', cargaHoraria: 2, responsable: 'Aula Virtual', etapas: { planeacion: d(-15), impartida: d(-8) } }),
    ev('eve_9', 'ser_3', 'capacitacion', anio + '-06-12', '09:00', { curso: 'Evacuación', modalidad: 'Híbrida', cargaHoraria: 2, responsable: 'Aula Virtual', etapas: { planeacion: anio + '-06-01', impartida: anio + '-06-12', evidencia: anio + '-06-15' } })
  ];
  const pendientes = [
    R({ id: 'pen_1', servicioId: 'ser_1', descripcion: 'Dictamen eléctrico vigente', fechaLimite: d(-2), entregado: '' }),
    R({ id: 'pen_2', servicioId: 'ser_1', descripcion: 'Constancia de recarga de extintores', fechaLimite: d(3), entregado: '' }),
    R({ id: 'pen_3', servicioId: 'ser_10', descripcion: 'Lista de brigadistas', fechaLimite: d(10), entregado: '' })
  ];
  const notas = [
    R({ id: 'not_1', servicioId: 'ser_1', texto: 'La autoridad pide actualizar el análisis de riesgos externos y el dictamen eléctrico.', autor: 'Directora', fecha: h(-12) })
  ];
  const documentos = [
    R({ id: 'doc_1', servicioId: 'ser_7', nombre: 'Foto de certificación de bitácora.jpg', url: 'https://drive.google.com/', autor: 'Samuel', fecha: anio + '-02-15' }),
    R({ id: 'doc_2', servicioId: 'ser_4', resolucionId: 'rsl_2', categoria: 'oficio', nombre: 'Oficio NO APROBADO.pdf', url: 'https://drive.google.com/', autor: 'Directora', fecha: anio + '-04-15' }),
    R({ id: 'doc_3', servicioId: 'ser_4', resolucionId: 'rsl_2', categoria: 'cumplimiento', nombre: 'Escrito de cumplimiento de observaciones.pdf', url: 'https://drive.google.com/', autor: 'Samuel', fecha: anio + '-05-08' }),
    R({ id: 'doc_4', servicioId: 'ser_4', resolucionId: 'rsl_3', categoria: 'oficio', nombre: 'Oficio CONDICIONADO.pdf', url: 'https://drive.google.com/', autor: 'Directora', fecha: anio + '-06-10' }),
    R({ id: 'doc_5', servicioId: 'ser_4', resolucionId: 'rsl_3', categoria: 'escrito', escritoMes: anio + '-10', nombre: 'Acuse escrito octubre.pdf', url: 'https://drive.google.com/', autor: 'Samuel', fecha: anio + '-10-05' }),
    R({ id: 'doc_6', servicioId: 'ser_6', resolucionId: 'rsl_4', categoria: 'oficio', nombre: 'Oficio APROBADO.pdf', url: 'https://drive.google.com/', autor: 'Directora', fecha: anio + '-04-28' })
  ];
  const ajustes = [R({ id: 'logos', lista: [{ id: 'logo_demo', nombre: 'Super Sur (ficticio)', url: LOGOS_FIJOS.demoCliente }] }),
    R({ id: 'instructores', lista: [{ id: 'ins_demo', titulo: 'Lic.', nombre: 'Instructora Ficticia Pérez', cargo: 'Capacitador', firmaData: firmaDemo(), registros: ['Registro STPS: XXXX-000000-XXX-0000 (ficticio)', 'Registro Protección Civil: CEPC/RT/0000/2026 (ficticio)'] }] }),
    R({ id: 'folios', contadores: {} })];
  const cursos = [R({ id: 'cur_demo', curso: 'Formación de Brigadas', clave: 'FBR', modalidad: 'En línea', fechaInicio: d(-8), fechaFin: d(-8), horas: 2, sede: '', instructorId: 'ins_demo', eventoId: 'eve_8', servicioId: 'ser_10', empresa: 'Colegio Ficticio de Cuernavaca, A.C.',
    participantes: [
      { nombres: 'Juan', apellidoPaterno: 'Pérez', apellidoMaterno: 'García', curp: 'PEGJ900215HMSRRN05', puesto: 'Brigadista' },
      { nombres: 'María', apellidoPaterno: 'López', apellidoMaterno: 'Hernández', curp: 'LOHM880530MMSPRR04', puesto: 'Coordinadora' },
      { nombres: 'Andrés', apellidoPaterno: 'Ramírez', apellidoMaterno: 'Santos', curp: 'RASA950812HMSMTN02', puesto: 'Brigadista' }] })];
  cursos.push(R({ id: 'cur_demo2', curso: 'Uso y Manejo de Extintores', clave: 'UME', modalidad: 'Presencial', fechaInicio: d(-3), fechaFin: d(-3), horas: 4, sede: 'Cuernavaca, Morelos', instructorId: 'ins_demo', servicioId: 'ser_3',
    empresa: 'Comercializadora del Sur de Morelos, S.A. de C.V.', tipoConstancia: 'empresa', leyendaEmpresa: 'El personal brigadista de', aplicaDC3: 'no', participantes: [] }));
  const constancias = [];
  const responsables = [
    R({ id: 'res_1', nombre: 'Proveedor externo: Cruz Ficticia' }),
    R({ id: 'res_2', nombre: 'Brigada interna del cliente' })
  ];
  const cobro = (id, precio, requiereFactura, movs) => R({ id, precio, requiereFactura, movimientos: movs });
  const m = (tipo, fecha, monto, folio) => ({ id: Datos.nuevoId('mov'), tipo, fecha, monto, folio: folio || '' });
  const mesActual = hoy.slice(0, 8);
  const cobros = [
    cobro('ser_1', 18000, true, [m('pago', anio + '-01-08', 9000), m('factura', anio + '-01-09', 9000, 'A-101'), m('pago', mesActual + '05', 4500)]),
    cobro('ser_2', 12000, true, [m('pago', anio + '-03-01', 6000), m('factura', anio + '-03-02', 6000, 'A-115')]),
    cobro('ser_4', 9500, false, [m('pago', anio + '-01-10', 9500)]),
    cobro('ser_6', 22000, true, [m('pago', anio + '-01-05', 11000), m('factura', anio + '-01-05', 11000, 'A-099')]),
    cobro('ser_7', 4000, true, [m('pago', anio + '-02-16', 4000), m('factura', anio + '-02-16', 4000, 'A-108')]),
    cobro('ser_9', 15000, true, [m('pago', mesActual + '02', 7500)]),
    cobro('ser_10', 7000, false, [])
  ];
  const presupuestos = [R({ id: 'pre_1', folio: 'P' + anio + '-001', fecha: hoy, estado: 'Enviado', tipoServicio: Presupuestos.TIPOS_SERVICIO[0], inmuebleId: '', establecimiento: 'Hotel Ficticio del Valle (prospecto)', ejercicio: anio + 1,
    conceptos: Presupuestos.conceptosDe(Presupuestos.TIPOS_SERVICIO[0], anio + 1), impuestos: { iva: true, retIva: true, retIsr: true }, mostrarTotal: true, condiciones: Presupuestos.CONDICIONES.slice(), autor: 'Directora' })];
  return { clientes, inmuebles, servicios, eventos, pendientes, notas, documentos, responsables, ajustes, cursos, constancias, cobros, presupuestos };
}
