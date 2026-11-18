# Sistema de Ingresos y Salidas — MVP

Aplicativo web (una sola página, sin backend) para control de **ingresos y salidas** de
colaboradores, construido como **MVP de propuesta para cliente** sobre el ecosistema de
Maratón SENA Certifica. Incluye autenticación por **huella simulada** (preparada para el
huellero real) y un fondo animado con **54 efectos** configurables.

> Proyecto dado de baja de producción. Esta es la versión de referencia / local.

## Características
- **Acceso por rol**: al abrir se elige **Colaborador** o **Administrador**.
  - **Administrador**: entra solo con **clave** (por defecto `6868`), sin cédula.
  - **Colaborador**: entra con **cédula + contraseña** (por defecto `1234`).
  - Sin recuperación automática de contraseña (se contacta al administrador).
- **3 variantes de diseño** intercambiables con un botón flotante (verde institucional,
  tech oscuro, violeta) — para que el cliente escoja.
- **Panel "Estilo del fondo"** (solo admin): 54 efectos WebGL con velocidad, intensidad y parallax.
- **Admin**:
  - Tabla de registros con filtros (cédula, nombre, apellidos, tipo, rango fecha-hora, minutos tarde)
    y orden por minutos de llegada tarde (mayor a menor).
  - Gestión de empleados (crear/editar/eliminar, rol, **huella simulada**, contraseña).
  - Configuración: título de la página, hora de entrada esperada, clave de administrador,
    restablecer contraseñas.
  - Reportes descargables en **PDF** y **Excel**.
- **Colaborador**: solo sus registros, con filtros y orden por minutos tarde.

## Datos de prueba (semilla)
- Administrador: clave `6868`.
- Colaboradores (contraseña `1234`): `1001234567`, `1002345678`, `1003456789`, `1004567890`, `1005678901`, `1006789012`.

## Cómo ejecutarlo localmente
Es un sitio estático. Cualquiera de estas dos opciones:

```bash
# Opción A: servidor simple
python -m http.server 8080
# luego abrir http://localhost:8080

# Opción B: abrir index.html directamente en el navegador
```

## Estructura
| Archivo | Descripción |
|---|---|
| `index.html` | Estructura de todas las pantallas |
| `app.js` | Lógica (sesión, filtros, reportes, config) — datos en `localStorage` |
| `panel.js` | Panel flotante "Estilo del fondo" (manifiesto de 54 efectos) |
| `shader-engine.js` | Motor WebGL de los 54 efectos de fondo |
| `styles.css` | Diseño (verde SENA + acento por variante) |

## Notas técnicas (atajos deliberados del MVP)
- **Persistencia**: `localStorage` (capa temporal para la demo). Migrar a Postgres si se retoma.
- **Huella**: captura **simulada** (mock) hasta instalar el huellero físico.
- **Excel/PDF**: sin librerías — tabla HTML con MIME de Excel (`.xls`) y vista de impresión → Guardar como PDF.
