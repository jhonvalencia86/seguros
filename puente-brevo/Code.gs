/**
 * Puente TuCRM ↔ Brevo
 * Envía los correos de la cola de TuCRM por la API de Brevo sin dejar la clave en la página.
 *
 * Instalación (una sola vez):
 * 1. Entra a https://script.google.com, crea un proyecto nuevo y pega este archivo completo.
 * 2. Configuración del proyecto (ícono de engranaje) → Propiedades de la secuencia de comandos → agrega:
 *      BREVO_API_KEY     tu clave de API de Brevo (Brevo → SMTP y API → Claves API)
 *      REMITENTE_EMAIL   el correo remitente verificado en Brevo
 *      REMITENTE_NOMBRE  el nombre que verán tus clientes (por ejemplo, el de la agencia)
 *      LIMITE_DIARIO     300 en el plan gratis de Brevo
 * 3. Selecciona la función generarCodigoDeAcceso y pulsa Ejecutar. Copia el código que aparece en el registro.
 * 4. Implementar → Nueva implementación → Aplicación web.
 *      Ejecutar como: Yo.   Quién tiene acceso: Cualquier usuario.
 *    Copia la URL que termina en /exec.
 * 5. En TuCRM → Campañas → Cola de hoy → Conectar Brevo, pega la URL y el código de acceso.
 */

const P = PropertiesService.getScriptProperties();
const MAX_POR_LLAMADA = 50;

function doGet() {
  return salida({ ok: true, servicio: "Puente TuCRM-Brevo" });
}

function doPost(e) {
  try {
    const d = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    const token = P.getProperty("TOKEN");
    if (!token || d.token !== token) return salida({ ok: false, error: "El código de acceso no coincide." });
    if (!P.getProperty("BREVO_API_KEY")) return salida({ ok: false, error: "Falta la propiedad BREVO_API_KEY en el puente." });
    if (!P.getProperty("REMITENTE_EMAIL")) return salida({ ok: false, error: "Falta la propiedad REMITENTE_EMAIL en el puente." });

    if (d.accion === "ping") {
      const r = brevo("get", "/account");
      if (r.code >= 300) return salida({ ok: false, error: r.body.message || "Brevo rechazó la clave de API." });
      const plan = (r.body.plan || [])[0] || {};
      return salida({
        ok: true,
        cuenta: r.body.email || "",
        remitente: P.getProperty("REMITENTE_EMAIL"),
        nombre: P.getProperty("REMITENTE_NOMBRE") || "",
        plan: plan.type || "",
        usadosHoy: usoHoy(),
        limite: limite()
      });
    }

    if (d.accion === "enviar") {
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
      return salida({ ok: true, resultados: resultados, usadosHoy: usados, limite: tope });
    }

    return salida({ ok: false, error: "Acción no reconocida." });
  } catch (err) {
    return salida({ ok: false, error: String(err && err.message || err) });
  }
}

function generarCodigoDeAcceso() {
  const codigo = Utilities.getUuid().replace(/-/g, "").slice(0, 24);
  P.setProperty("TOKEN", codigo);
  Logger.log("Tu código de acceso para TuCRM es: " + codigo);
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

function claveUso() { return "USO_" + Utilities.formatDate(new Date(), "America/Bogota", "yyyy-MM-dd"); }
function usoHoy() { return Number(P.getProperty(claveUso()) || 0); }
function limite() { return Number(P.getProperty("LIMITE_DIARIO") || 300); }
function salida(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
