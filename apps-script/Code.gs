/**
 * VYBRA Sound & Light — Solicitudes de cotización
 * ZOLKO INTEGRATIONS
 *
 * - doPost: recibe el formulario de la landing, guarda una fila con fecha y hora
 *   y crea un evento "Por confirmar" en el calendario VYBRA Eventos.
 * - alEditar: cuando cambia Estatus, Fecha u Hora en la hoja, actualiza el evento.
 * - configurar: se corre una sola vez para preparar hoja, resumen, calendario y carpeta.
 */

const HOJA = 'Solicitudes';
const CAL_NOMBRE = 'VYBRA Eventos';
const CARPETA = 'ZOLKO — VYBRA';
const ZONA = 'America/Mexico_City';
const HORAS_EVENTO = 5;
const ESTATUS = ['Nuevo', 'Cotizado', 'Seguimiento', 'Apartado', 'Pagado', 'Realizado', 'Perdido'];
const CONFIRMADOS = ['Apartado', 'Pagado', 'Realizado'];
const ENCABEZADOS = [
  'Fecha y hora de llegada', 'Nombre', 'WhatsApp', 'Tipo de evento', 'Fecha del evento',
  'Hora de inicio', 'Zona', 'Invitados', 'Paquete', 'Me recomendó', 'Comentarios',
  'Estatus', 'Monto cotizado (MXN)', 'Anticipo recibido (MXN)', 'Notas', 'ID calendario'
];
// Columnas (1 = A)
const C = { llegada: 1, nombre: 2, whatsapp: 3, tipo: 4, fecha: 5, hora: 6, zona: 7, invitados: 8,
  paquete: 9, refiere: 10, comentarios: 11, estatus: 12, idcal: 16 };

function configurar() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.setSpreadsheetTimeZone(ZONA);
  ss.rename('VYBRA — Solicitudes de cotización');
  const props = PropertiesService.getScriptProperties();
  props.setProperty('SHEET_ID', ss.getId());

  const sh = ss.getSheetByName(HOJA) || ss.getSheets()[0];
  sh.setName(HOJA);
  sh.getRange(1, 1, 1, ENCABEZADOS.length).setValues([ENCABEZADOS])
    .setFontWeight('bold').setBackground('#1F1A33').setFontColor('#FFFFFF').setWrap(true);
  sh.setFrozenRows(1);
  sh.setFrozenColumns(2);
  sh.getRange('L2:L').setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(ESTATUS, true).build());
  sh.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  sh.getRange('E2:E').setNumberFormat('dd/mm/yyyy');
  sh.getRange('C2:C').setNumberFormat('@');
  sh.getRange('F2:F').setNumberFormat('@');
  sh.getRange('M2:N').setNumberFormat('$#,##0');
  sh.getRange('K2:K').setWrap(true);
  sh.getRange('O2:O').setWrap(true);
  const anchos = [130, 160, 110, 150, 100, 80, 140, 80, 190, 140, 240, 120, 120, 120, 240, 80];
  anchos.forEach((w, i) => sh.setColumnWidth(i + 1, w));
  sh.hideColumns(C.idcal);

  const rs = ss.getSheetByName('Resumen') || ss.insertSheet('Resumen');
  rs.clear();
  rs.getRange('A1:B7').setValues([
    ['Indicador', 'Valor'],
    ['Solicitudes recibidas', '=COUNTA(Solicitudes!B:B)-1'],
    ['Cotizadas', '=COUNT(Solicitudes!M:M)'],
    ['Apartadas, pagadas o realizadas', '=COUNTIF(Solicitudes!L:L,"Apartado")+COUNTIF(Solicitudes!L:L,"Pagado")+COUNTIF(Solicitudes!L:L,"Realizado")'],
    ['Perdidas', '=COUNTIF(Solicitudes!L:L,"Perdido")'],
    ['% de cierre (confirmadas entre cotizadas)', '=IF(B3=0,0,B4/B3)'],
    ['Anticipos recibidos (MXN)', '=SUM(Solicitudes!N:N)']
  ]);
  rs.getRange('A9:B9').setValues([['Por paquete', 'Solicitudes']]);
  const paquetes = ['Paquete Essential (5 horas)', 'Paquete Party (5 horas)', 'Paquete Experience (5 horas)',
    'Servicio personalizado / otra opción', 'No estoy seguro, necesito asesoría'];
  rs.getRange(10, 1, paquetes.length, 2).setValues(
    paquetes.map((p, i) => [p, '=COUNTIF(Solicitudes!I:I,A' + (10 + i) + ')']));
  ['A1:B1', 'A9:B9'].forEach(a => rs.getRange(a).setFontWeight('bold').setBackground('#1F1A33').setFontColor('#FFFFFF'));
  rs.getRange('B6').setNumberFormat('0.0%');
  rs.getRange('B7').setNumberFormat('$#,##0');
  rs.setColumnWidth(1, 300);
  rs.setColumnWidth(2, 110);

  let cal = CalendarApp.getCalendarsByName(CAL_NOMBRE)[0];
  if (!cal) cal = CalendarApp.createCalendar(CAL_NOMBRE, { timeZone: ZONA, color: CalendarApp.Color.PURPLE });
  props.setProperty('CAL_ID', cal.getId());

  const it = DriveApp.getFoldersByName(CARPETA);
  const carpeta = it.hasNext() ? it.next() : DriveApp.createFolder(CARPETA);
  DriveApp.getFileById(ss.getId()).moveTo(carpeta);

  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'alEditar') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('alEditar').forSpreadsheet(ss).onEdit().create();

  return 'Listo: hoja, resumen, calendario "' + CAL_NOMBRE + '" y carpeta "' + CARPETA + '".';
}

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.website) return salida({ ok: true }); // campo trampa antispam
  if (!p.nombre || !p.whatsapp) return salida({ ok: false, error: 'faltan datos' });

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const props = PropertiesService.getScriptProperties();
    const sh = SpreadsheetApp.openById(props.getProperty('SHEET_ID')).getSheetByName(HOJA);
    const t = v => {
      const s = String(v || '').trim().slice(0, 500);
      return /^[=+\-@]/.test(s) ? "'" + s : s; // evita que se lea como fórmula
    };
    const texto = v => (String(v || '').trim() ? "'" + String(v).trim().slice(0, 40) : ''); // guarda como texto, sin convertir
    const fechaEv = p.fecha ? Utilities.parseDate(p.fecha, ZONA, 'yyyy-MM-dd') : '';
    const fila = [
      new Date(), t(p.nombre), texto(p.whatsapp), t(p.tipo), fechaEv, texto(p.hora), t(p.zona),
      t(p.invitados), t(p.paquete), t(p.refiere), t(p.comentarios), 'Nuevo', '', '', '', ''
    ];
    sh.appendRow(fila);
    const r = sh.getLastRow();
    if (p.fecha) {
      const ev = crearEvento(r, sh);
      if (ev) sh.getRange(r, C.idcal).setValue(ev.getId());
    }
    return salida({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

function crearEvento(r, sh) {
  const cal = CalendarApp.getCalendarById(PropertiesService.getScriptProperties().getProperty('CAL_ID'));
  const rg = sh.getRange(r, 1, 1, ENCABEZADOS.length);
  const v = rg.getValues()[0];
  const d = rg.getDisplayValues()[0];
  if (!(v[C.fecha - 1] instanceof Date)) return null;
  const titulo = tituloEvento(v);
  const desc = descripcion(v, d);
  let ev;
  const ini = inicio(v, d);
  if (ini) {
    const fin = new Date(ini.getTime() + HORAS_EVENTO * 3600 * 1000);
    ev = cal.createEvent(titulo, ini, fin, { description: desc, location: String(v[C.zona - 1]) });
  } else {
    ev = cal.createAllDayEvent(titulo, v[C.fecha - 1], { description: desc, location: String(v[C.zona - 1]) });
  }
  ev.setColor(colorEstatus(v[C.estatus - 1]));
  return ev;
}

function alEditar(e) {
  const sh = e.range.getSheet();
  if (sh.getName() !== HOJA) return;
  const col = e.range.getColumn();
  const r = e.range.getRow();
  if (r < 2 || e.range.getNumRows() > 1) return;
  if ([C.estatus, C.fecha, C.hora, C.nombre, C.tipo].indexOf(col) === -1) return;

  const cal = CalendarApp.getCalendarById(PropertiesService.getScriptProperties().getProperty('CAL_ID'));
  const rg = sh.getRange(r, 1, 1, ENCABEZADOS.length);
  const v = rg.getValues()[0];
  const d = rg.getDisplayValues()[0];
  const id = v[C.idcal - 1];
  const ev = id ? cal.getEventById(id) : null;
  const estatus = v[C.estatus - 1];

  if (estatus === 'Perdido') {
    if (ev) ev.deleteEvent();
    sh.getRange(r, C.idcal).setValue('');
    return;
  }
  if (!ev) {
    const nuevo = crearEvento(r, sh);
    if (nuevo) sh.getRange(r, C.idcal).setValue(nuevo.getId());
    return;
  }
  if (col === C.fecha || col === C.hora) {
    ev.deleteEvent();
    const nuevo = crearEvento(r, sh);
    sh.getRange(r, C.idcal).setValue(nuevo ? nuevo.getId() : '');
    return;
  }
  ev.setTitle(tituloEvento(v));
  ev.setDescription(descripcion(v, d));
  ev.setColor(colorEstatus(estatus));
}

function inicio(v, d) {
  const f = v[C.fecha - 1];
  const h = String(d[C.hora - 1] || '').trim().slice(0, 5);
  if (!(f instanceof Date) || !/^\d{1,2}:\d{2}$/.test(h)) return null;
  const dia = Utilities.formatDate(f, ZONA, 'yyyy-MM-dd');
  return Utilities.parseDate(dia + ' ' + h, ZONA, 'yyyy-MM-dd HH:mm');
}

function tituloEvento(v) {
  const confirmado = CONFIRMADOS.indexOf(v[C.estatus - 1]) !== -1;
  const paquete = String(v[C.paquete - 1]).replace('Paquete ', '').replace(' (5 horas)', '');
  return (confirmado ? 'CONFIRMADO' : 'POR CONFIRMAR') + ' · ' + v[C.tipo - 1] + ' · ' + v[C.nombre - 1] +
    (paquete ? ' · ' + paquete : '');
}

function descripcion(v, d) {
  const tel = String(d[C.whatsapp - 1]).replace(/\D/g, '');
  return [
    'Estatus: ' + v[C.estatus - 1],
    'Cliente: ' + v[C.nombre - 1],
    'WhatsApp: ' + d[C.whatsapp - 1] + (tel ? ' (https://wa.me/' + (tel.length === 10 ? '52' + tel : tel) + ')' : ''),
    'Evento: ' + v[C.tipo - 1],
    'Hora de inicio: ' + (d[C.hora - 1] || 'Por definir'),
    'Zona: ' + v[C.zona - 1],
    'Invitados: ' + (v[C.invitados - 1] || 'Por definir'),
    'Paquete: ' + v[C.paquete - 1],
    'Me recomendó: ' + (v[C.refiere - 1] || '-'),
    'Comentarios: ' + (v[C.comentarios - 1] || '-'),
    '',
    'Registrado desde la landing de VYBRA Sound & Light.'
  ].join('\n');
}

function colorEstatus(s) {
  return CONFIRMADOS.indexOf(s) !== -1 ? CalendarApp.EventColor.GREEN : CalendarApp.EventColor.YELLOW;
}

function salida(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
