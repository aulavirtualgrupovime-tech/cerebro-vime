/**
 * Configuración de Cerebro Grupo VIME.
 * - Publicada en internet (https): versión real conectada al servidor de Google.
 * - Abierta desde el disco con Probar_Cerebro.bat (file://): VERSIÓN DE PRUEBA con datos ficticios,
 *   para probar cambios sin tocar los datos reales.
 */
const SERVIDOR_REAL = 'https://script.google.com/macros/s/AKfycbxDXktuKz3WCMb8L8aEO0QgxGbfjGCOqdjDp0Kd3vsESxDAw7x_3N4kWIhKaMAZilsy/exec';
const CONFIG = {
  // En el disco (file://) o en el servidor local de pruebas (localhost) se usa la versión de prueba
  SERVIDOR_URL: (location.protocol === 'file:' || location.hostname === 'localhost') ? '' : SERVIDOR_REAL,
  VERSION: '1.3.1',
  // Página pública donde se valida cada constancia (el QR impreso apunta aquí + el folio)
  VERIFICACION_URL: 'https://aulavirtualgrupovime-tech.github.io/cerebro-vime/verifica.html?f='
};
