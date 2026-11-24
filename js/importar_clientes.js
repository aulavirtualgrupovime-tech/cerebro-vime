/**
 * Cerebro Grupo VIME · Lectura de la lista de inmuebles (Excel) → clientes con sus establecimientos.
 * Solo interpreta; quien guarda es app.js después de que la Directora revisa.
 * Formato: encabezados NRPC, RAZON SOCIAL, RFC, NOMBRE COMERCIAL, DIRECCION, TIPO DE RIESGO.
 * Un renglón que solo trae texto en RAZON SOCIAL (p. ej. «GRUPO EJEMPLO») agrupa bajo ese cliente
 * todos los renglones siguientes hasta un renglón vacío.
 */
const ImportarClientes = (() => {
  const limpio = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const llano = t => limpio(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const sinDato = v => /^(n\/?a|no aplica|-|s\/n)$/i.test(limpio(v)) ? '' : limpio(v);
  const COL = [['nrpc', /^nrpc/], ['razon', /^razon social/], ['rfc', /^rfc/], ['nombre', /^nombre comercial/], ['direccion', /^direccion/], ['riesgo', /riesgo/]];
  const CONECTORES = /^(de|del|la|las|los|el|y)$/i;

  /** Nombre del cliente a partir de sus establecimientos: el único nombre o las palabras iniciales que comparten. */
  function nombreComun(nombres, razon) {
    const unicos = Array.from(new Set(nombres));
    if (unicos.length === 1) return unicos[0];
    const p = unicos.map(n => n.split(' ')); let k = 0;
    while (p.every(x => x[k] && x[k] === p[0][k])) k++;
    if (!k || CONECTORES.test(p[0][k - 1])) return razon;
    return p[0].slice(0, k).join(' ');
  }

  /** filas: arreglo de renglones (arreglos de celdas). clave: función que normaliza la razón social. */
  function deFilas(filas, clave) {
    let cab = -1, col = {};
    for (let i = 0; i < filas.length && cab < 0; i++) {
      const c = {};
      (filas[i] || []).forEach((v, j) => { const t = llano(v); COL.forEach(([k, re]) => { if (c[k] === undefined && re.test(t)) c[k] = j; }); });
      if (c.razon !== undefined && c.nombre !== undefined) { cab = i; col = c; }
    }
    if (cab < 0) throw new Error('No se encontraron los encabezados «RAZON SOCIAL» y «NOMBRE COMERCIAL» en la primera hoja.');
    const clientes = [], porClave = {}; let grupo = null;
    for (let i = cab + 1; i < filas.length; i++) {
      const f = filas[i] || [], v = k => col[k] === undefined ? '' : limpio(f[col[k]]);
      const razon = v('razon'), nombre = v('nombre');
      if (!f.some(x => limpio(x))) { grupo = null; continue; }
      if (!razon && !nombre) continue;
      if (razon && f.filter(x => limpio(x)).length === 1) { grupo = { nombre: razon, grupo: true, inmuebles: [] }; clientes.push(grupo); continue; }
      const rfc = sinDato(v('rfc')).toUpperCase().replace(/[\s-]/g, ''), rg = llano(v('riesgo'));
      const inm = { razonSocial: razon, rfc, nombreComercial: nombre || razon, direccion: sinDato(v('direccion')), nrpc: sinDato(v('nrpc')), riesgo: /^alto/.test(rg) ? 'alto' : /^ordinario/.test(rg) ? 'ordinario' : '' };
      let c = grupo;
      if (!c) {
        const k = clave(razon) || clave(nombre);
        c = porClave[k];
        if (!c) { c = porClave[k] = { nombre: '', grupo: false, inmuebles: [] }; clientes.push(c); }
      }
      c.inmuebles.push(inm);
    }
    return clientes.filter(c => c.inmuebles.length).map(c => {
      const razones = Array.from(new Set(c.inmuebles.map(i => clave(i.razonSocial)))), una = razones.length === 1;
      const razonSocial = una ? c.inmuebles[0].razonSocial : c.nombre;
      const rfc = una ? (c.inmuebles.find(i => i.rfc) || {}).rfc || '' : '';
      return { nombreComercial: c.nombre || nombreComun(c.inmuebles.map(i => i.nombreComercial), razonSocial), razonSocial, rfc, grupo: c.grupo, inmuebles: c.inmuebles };
    });
  }

  /** Cliente ya registrado que corresponde a uno de la lista (RFC, razón social o nombre comercial), o null. */
  function clienteExistente(c, clientes, clave) {
    const rfc = x => String(x || '').toUpperCase().replace(/[\s-]/g, '');
    const nombres = [c.nombreComercial, c.razonSocial].map(clave).filter(Boolean);
    const rfcs = c.inmuebles.map(i => i.rfc).filter(Boolean), razones = c.inmuebles.map(i => clave(i.razonSocial)).filter(Boolean);
    return clientes.find(x => nombres.includes(clave(x.nombreComercial)) || nombres.includes(clave(x.razonSocial))) ||
      clientes.find(x => (x.rfc && rfcs.includes(rfc(x.rfc))) || razones.includes(clave(x.razonSocial))) || null;
  }

  /** Establecimiento ya registrado en ese cliente, o null. Con nombres repetidos en la lista también compara la dirección. */
  function inmuebleExistente(i, hermanos, registrados, clave) {
    const iguales = registrados.filter(r => clave(r.nombreComercial) === clave(i.nombreComercial));
    if (hermanos.filter(h => clave(h.nombreComercial) === clave(i.nombreComercial)).length > 1) return iguales.find(r => clave(r.direccion) === clave(i.direccion)) || null;
    return iguales[0] || null;
  }

  /** Registro de inmueble para guardar: conserva lo que ya existe y solo llena lo vacío. Devuelve null si no hay nada que guardar. */
  function registro(i, previo, cliente, clave) {
    const datos = { nombreComercial: i.nombreComercial, direccion: i.direccion, nrpc: i.nrpc, riesgo: i.riesgo };
    if (clave(i.razonSocial) !== clave(cliente.razonSocial)) { datos.razonSocial = i.razonSocial; datos.rfc = i.rfc; }
    else if (i.rfc && cliente.rfc && i.rfc !== cliente.rfc) datos.rfc = i.rfc;
    if (!previo) return Object.assign({ clienteId: cliente.id, logoIzq: 'gv', logoDer: '' }, datos);
    const r = Object.assign({}, previo); let cambio = false;
    Object.keys(datos).forEach(k => { if (datos[k] && !r[k]) { r[k] = datos[k]; cambio = true; } });
    return cambio ? r : null;
  }

  return { deFilas, clienteExistente, inmuebleExistente, registro };
})();
if (typeof module !== 'undefined') module.exports = ImportarClientes;
