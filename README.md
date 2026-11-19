# TuCRM Seguros

CRM para intermediarios de seguros en Colombia: clientes, pólizas, renovaciones, cartera, siniestros, campañas por WhatsApp, SMS y email, tablero interactivo y trazabilidad de cambios.

Es una sola página (`index.html`), sin dependencias ni instalación.

## Qué incluye

- **Hoy:** alertas de pólizas vencidas sin renovar, primas en mora, renovaciones de los próximos 30 días, siniestros sin gestión y pendientes del día.
- **Tablero:** prima por ramo y por aseguradora, vencimientos a 12 meses, cartera, embudo comercial, siniestros y clientes con mayor prima. Al tocar cualquier barra o porción se filtra todo el tablero.
- **Clientes, pólizas y siniestros** con su ciclo completo: emisión, renovación, pago y reclamación.
- **Automatizaciones por fecha:** reglas como "aviso de renovación 30 días antes", "recordatorio de pago 3 días antes", "bienvenida al emitir", "seguimiento de siniestro sin movimiento" o "cumpleaños". Cada día se arma una cola con los mensajes ya personalizados; se envían con un toque por WhatsApp, SMS o Gmail y nadie recibe el mismo aviso dos veces.
- **Campañas masivas** por etapa, ramo, vencimiento o mora, con plantillas que llenan póliza, aseguradora y fecha de vencimiento.
- **Trazabilidad:** quién cambió qué y cuándo, con el valor anterior y el nuevo.
- Importación y exportación en CSV.

## Subir tu base de datos

1. Dentro de TuCRM ve a **Herramientas → Subir base de datos** y descarga la plantilla.
2. Llénala en Excel o Google Sheets (una fila por póliza; el mismo cliente puede repetirse) y guárdala como CSV.
3. Súbela: verás una vista previa con las columnas reconocidas y cuántos clientes y pólizas se crearán antes de confirmar.

Si un cliente ya existe (mismo documento o mismo nombre) no se duplica; solo se agregan sus pólizas nuevas.

## Publicarlo con GitHub Pages

1. Crea un repositorio nuevo en GitHub (por ejemplo `tucrm`).
2. Sube los archivos de esta carpeta: `index.html`, `README.md` y `.nojekyll`.
3. En el repositorio ve a **Settings → Pages**.
4. En *Build and deployment* elige **Deploy from a branch**, rama `main`, carpeta `/ (root)`, y guarda.
5. En uno o dos minutos queda publicado en `https://TU-USUARIO.github.io/tucrm/`.

## Dónde se guardan los datos

- **Publicado en GitHub Pages u otro hosting:** los datos se guardan en el navegador de cada persona (localStorage). No se comparten entre equipos ni usuarios, y se pierden si se borran los datos del navegador. Usa **Descargar CSV** como respaldo.
- **Abierto como artefacto en claude.ai:** usa la base de datos compartida de Claude, con sincronización entre usuarios y trazabilidad por nombre.

Para varios asesores trabajando sobre la misma base fuera de claude.ai, el siguiente paso es conectar una base de datos en la nube (Supabase o Firebase).

## Probar con datos

En **Herramientas → Cargar ejemplos** se cargan clientes, pólizas y siniestros de una agencia ficticia. Se quitan con **Quitar ejemplos** sin tocar los datos reales.

---

Designed & developed by [Jhon Valencia Santana](https://www.linkedin.com/in/jhonvalenciasantana/). Product strategy, UX and full-stack engineering, built with an AI-augmented workflow.

## Funciona sin internet

En GitHub Pages, TuCRM se puede instalar como app (Herramientas → Instalar como app) y sigue funcionando sin conexión: los datos se guardan en el equipo y la copia en Google Sheets se hace cuando vuelve internet.

## Excel y Google Sheets

- **Herramientas → Descargar Excel** baja un archivo .xlsx con las hojas Clientes, Pólizas, Endosos, Siniestros, Actividades, Envíos y Trazabilidad.
- **Herramientas → Google Sheets** guarda una copia en una hoja de cálculo de la cuenta de Google de cada usuario y permite restaurarla en otro equipo. Usa el mismo puente de `puente/Code.gs`.

## Envío de correos con Brevo

TuCRM puede enviar solos los correos de la cola (Campañas → Cola de hoy) por medio de Brevo.

1. Crea una clave de API en Brevo (SMTP y API → Claves API).
2. Copia `puente/Code.gs` en un proyecto nuevo de https://script.google.com.
3. En Configuración del proyecto → Propiedades de la secuencia de comandos, agrega `BREVO_API_KEY`, `REMITENTE_EMAIL`, `REMITENTE_NOMBRE` y `LIMITE_DIARIO` (300 en el plan gratis).
4. Ejecuta `generarCodigoDeAcceso` y copia el código del registro.
5. Implementa como aplicación web (Ejecutar como: Yo; acceso: cualquier usuario) y copia la URL `/exec`.
6. En TuCRM → Campañas → Cola de hoy → Conectar Brevo, pega la URL y el código.

La clave de Brevo nunca queda en la página publicada: vive solo en el puente de Google.
