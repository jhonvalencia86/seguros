/**
 * Puente TuCRM: copia en Google Sheets y envío de correos con Brevo
 *
 * Cada usuario instala su propio puente. Sus datos quedan en una hoja de cálculo de su cuenta de Google
 * y la clave de Brevo, si la usa, queda guardada aquí y nunca dentro de TuCRM.
 *
 * Instalación (una sola vez):
 * 1. Entra a https://script.google.com, crea un proyecto nuevo y pega este archivo completo.
 * 2. Ejecuta la función generarCodigoDeAcceso y copia el código que aparece en el registro.
 *    Google pedirá permisos para crear la hoja y conectarse a internet: acéptalos (la app es tuya).
 * 3. Implementar → Nueva implementación → Aplicación web.
 *      Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *    Copia la URL que termina en /exec.
 * 4. En TuCRM → Herramientas → Google Sheets, pega la URL y el código de acceso.
 *
 * Solo si quieres enviar correos con Brevo, agrega en Configuración del proyecto →
 * Propiedades de la secuencia de comandos: BREVO_API_KEY, REMITENTE_EMAIL, REMITENTE_NOMBRE y LIMITE_DIARIO (300 en el plan gratis).
 *
 * Si actualizas este código más adelante: Implementar → Administrar implementaciones → editar → Nueva versión.
 */

const P = PropertiesService.getScriptProperties();
const MAX_POR_LLAMADA = 50;
const COLECCIONES = ["contactos", "polizas", "siniestros", "actividades", "plantillas", "reglas", "envios", "bitacora"];
const MAX_CELDA = 45000;

function doGet() {
  return salida({ ok: true, servicio: "Puente TuCRM" });
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const token = P.getProperty("TOKEN");
    if (!token || d.token !== token) return salida({ ok: false, error: "El código de acceso no coincide." });

    switch (d.accion) {
      case "ping": return salida(ping());
      case "respaldo": return salida(respaldar(d));
      case "restaurar": return salida(restaurar());
      case "enviar": return salida(enviarCorreos(d));
      default: return salida({ ok: false, error: "Acción no reconocida." });
    }
  } catch (err) {
    return salida({ ok: false, error: String(err && err.message || err) });
  }
}

/* ---------- Estado ---------- */
function ping() {
  const r = { ok: true, hoja: urlHoja(false), ultimoRespaldo: P.getProperty("ULTIMO_RESPALDO") || "", brevo: false };
  if (P.getProperty("BREVO_API_KEY") && P.getProperty("REMITENTE_EMAIL")) {
    const b = brevo("get", "/account");
    if (b.code < 300) {
      r.brevo = true;
      r.cuenta = b.body.email || "";
      r.remitente = P.getProperty("REMITENTE_EMAIL");
      r.nombre = P.getProperty("REMITENTE_NOMBRE") || "";
      r.usadosHoy = usoHoy();
      r.limite = limite();
    } else {
      r.errorBrevo = b.body.message || "Brevo rechazó la clave de API.";
    }
  }
  return r;
}

/* ---------- Google Sheets ---------- */
function libro() {
  const id = P.getProperty("SHEET_ID");
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create("TuCRM Seguros · Copia de seguridad");
  P.setProperty("SHEET_ID", ss.getId());
  return ss;
}
function urlHoja(crear) {
  const id = P.getProperty("SHEET_ID");
  if (!id && !crear) return "";
  return libro().getUrl();
}
function hoja(ss, nombre) {
  return ss.getSheetByName(nombre) || ss.insertSheet(nombre);
}

function respaldar(d) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = libro();
    const cols = d.colecciones || {};
    // Datos completos para poder restaurar
    const filas = [["coleccion", "id", "parte", "json"]];
    let total = 0;
    COLECCIONES.forEach(function (c) {
      (cols[c] || []).forEach(function (doc) {
        const json = JSON.stringify(doc);
        for (let i = 0, parte = 0; i < json.length; i += MAX_CELDA, parte++) filas.push([c, String(doc.id || ""), parte, json.slice(i, i + MAX_CELDA)]);
        total++;
      });
    });
    const sh = hoja(ss, "_datos");
    sh.clear();
    sh.getRange(1, 1, filas.length, 4).setNumberFormat("@").setValues(filas);
    sh.hideSheet();

    // Hojas legibles para reportes
    (d.hojas || []).forEach(function (h) {
      const s = hoja(ss, h.name);
      s.clear();
      const valores = [h.cols].concat(h.rows || []).map(function (r) {
        const fila = [];
        for (let i = 0; i < h.cols.length; i++) fila.push(r[i] == null ? "" : r[i]);
        return fila;
      });
      s.getRange(1, 1, valores.length, h.cols.length).setValues(valores);
      s.getRange(1, 1, 1, h.cols.length).setFontWeight("bold").setFontColor("#ffffff").setBackground("#1E7A4C");
      s.setFrozenRows(1);
    });

    // Resumen
    const ahora = new Date();
    const res = hoja(ss, "Resumen");
    res.clear();
    const filasRes = [["TuCRM Seguros · Copia de seguridad", ""], ["Última copia", Utilities.formatDate(ahora, "America/Bogota", "dd/MM/yyyy HH:mm")], ["Equipo", String(d.equipo || "")]];
    COLECCIONES.forEach(function (c) { filasRes.push([c, (cols[c] || []).length]); });
    res.getRange(1, 1, filasRes.length, 2).setValues(filasRes);
    res.getRange(1, 1).setFontWeight("bold").setFontSize(13);
    ss.setActiveSheet(res);
    ss.moveActiveSheet(1);
    const s1 = ss.getSheetByName("Hoja 1") || ss.getSheetByName("Sheet1");
    if (s1 && ss.getSheets().length > 1) ss.deleteSheet(s1);

    P.setProperty("ULTIMO_RESPALDO", ahora.toISOString());
    return { ok: true, registros: total, hoja: ss.getUrl(), ultimoRespaldo: ahora.toISOString() };
  } finally {
    lock.releaseLock();
  }
}

function restaurar() {
  const id = P.getProperty("SHEET_ID");
  if (!id) return { ok: false, error: "Todavía no hay ninguna copia guardada en Google Sheets." };
  const sh = libro().getSheetByName("_datos");
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: "La copia en Google Sheets está vacía." };
  const v = sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues();
  const partes = {};
  v.forEach(function (r) {
    const k = r[0] + "\u0001" + r[1];
    (partes[k] = partes[k] || []).push([Number(r[2]), String(r[3])]);
  });
  const colecciones = {};
  COLECCIONES.forEach(function (c) { colecciones[c] = []; });
  Object.keys(partes).forEach(function (k) {
    const c = k.split("\u0001")[0];
    const json = partes[k].sort(function (a, b) { return a[0] - b[0]; }).map(function (x) { return x[1]; }).join("");
    try { if (colecciones[c]) colecciones[c].push(JSON.parse(json)); } catch (e) {}
  });
  return { ok: true, colecciones: colecciones, ultimoRespaldo: P.getProperty("ULTIMO_RESPALDO") || "", hoja: urlHoja(false) };
}

/* ---------- Brevo ---------- */
function enviarCorreos(d) {
  if (!P.getProperty("BREVO_API_KEY")) return { ok: false, error: "Falta la propiedad BREVO_API_KEY en el puente." };
  if (!P.getProperty("REMITENTE_EMAIL")) return { ok: false, error: "Falta la propiedad REMITENTE_EMAIL en el puente." };
  const lote = (d.mensajes || []).slice(0, MAX_POR_LLAMADA);
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  let usados = usoHoy();
  const tope = limite();
  const resultados = [];
  try {
    for (const m of lote) {
      if (usados >= tope) { resultados.push({ id: m.id, ok: false, error: "Se alcanzó el límite diario de " + tope + " correos." }); continue; }
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.para || "")) { resultados.push({ id: m.id, ok: false, error: "Correo del cliente no válido." }); continue; }
      const cuerpo = {
        sender: { email: P.getProperty("REMITENTE_EMAIL"), name: P.getProperty("REMITENTE_NOMBRE") || undefined },
        to: [{ email: String(m.para).trim(), name: m.nombre ? String(m.nombre).slice(0, 70) : undefined }],
        subject: String(m.asunto || "Mensaje de tu asesor de seguros").slice(0, 200),
        htmlContent: String(m.html || ""),
        textContent: String(m.texto || ""),
        replyTo: { email: P.getProperty("RESPONDER_A") || P.getProperty("REMITENTE_EMAIL") },
        tags: ["tucrm"].concat(m.etiqueta ? [String(m.etiqueta).slice(0, 40)] : [])
      };
      const r = brevo("post", "/smtp/email", cuerpo);
      if (r.code < 300) { usados++; resultados.push({ id: m.id, ok: true, messageId: r.body.messageId || "" }); }
      else resultados.push({ id: m.id, ok: false, error: r.body.message || ("Brevo respondió " + r.code) });
    }
    P.setProperty(claveUso(), String(usados));
  } finally {
    lock.releaseLock();
  }
  return { ok: true, resultados: resultados, usadosHoy: usados, limite: tope };
}

function brevo(metodo, ruta, datos) {
  const opciones = {
    method: metodo,
    contentType: "application/json",
    headers: { "api-key": P.getProperty("BREVO_API_KEY"), accept: "application/json" },
    muteHttpExceptions: true
  };
  if (datos) opciones.payload = JSON.stringify(datos);
  const r = UrlFetchApp.fetch("https://api.brevo.com/v3" + ruta, opciones);
  let body = {};
  try { body = JSON.parse(r.getContentText() || "{}"); } catch (e) {}
  return { code: r.getResponseCode(), body: body };
}

/* ---------- Utilidades ---------- */
function generarCodigoDeAcceso() {
  const codigo = Utilities.getUuid().replace(/-/g, "").slice(0, 24);
  P.setProperty("TOKEN", codigo);
  libro();
  Logger.log("Tu código de acceso para TuCRM es: " + codigo);
  Logger.log("Tu hoja de copia de seguridad: " + urlHoja(true));
}
function claveUso() { return "USO_" + Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd"); }
function usoHoy() { return Number(P.getProperty(claveUso()) || 0); }
function limite() { return Number(P.getProperty("LIMITE_DIARIO") || 300); }
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
