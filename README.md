# TuCRM Seguros

CRM para intermediarios de seguros en Colombia: clientes, pólizas, renovaciones, cartera, siniestros, campañas por WhatsApp, SMS y email, tablero interactivo y trazabilidad de cambios.

Es una sola página (`index.html`), sin dependencias ni instalación.

## Qué incluye

- **Hoy:** alertas de pólizas vencidas sin renovar, primas en mora, renovaciones de los próximos 30 días, siniestros sin gestión y pendientes del día.
- **Tablero:** prima por ramo y por aseguradora, vencimientos a 12 meses, cartera, embudo comercial, siniestros y clientes con mayor prima. Al tocar cualquier barra o porción se filtra todo el tablero.
- **Clientes, pólizas y siniestros** con su ciclo completo: emisión, renovación, pago y reclamación.
- **Campañas** por etapa, ramo, vencimiento o mora, con plantillas que llenan póliza, aseguradora y fecha de vencimiento.
- **Trazabilidad:** quién cambió qué y cuándo, con el valor anterior y el nuevo.
- Importación y exportación en CSV.

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
