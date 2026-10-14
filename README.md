# 🥋 NIEVAS ACADEMIA DEPORTIVA - SISTEMA MVP DE TATAMI & MÉTRICAS

Sistema integral y Mobile-First para la gestión de asistencia en tatami, resiliencia offline, métricas de retención deportiva y promociones de graduación de karate tradicional en **Nievas Academia Deportiva**.

Desarrollado bajo los más altos estándares de ingeniería de software siguiendo el framework de arquitectura y diseño establecido en `PROJECT_RULES.md`.

---

## 🚀 1. Stack Tecnológico & Arquitectura

- **Framework**: [Next.js](https://nextjs.org/) (App Router) con TypeScript estricto (`no-any`).
- **Estilos & UI**: [Tailwind CSS v4](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/).
- **Base de Datos & Auth**: PostgreSQL vía [Supabase](https://supabase.com/) con Row Level Security (RLS) y sincronización de identidades.
- **Validación Estricta**: [Zod](https://zod.dev/) (`safeParse`) en todos los payloads y formularios.
- **Arquitectura de Capas**:
  - `src/lib/dal/`: Data Access Layer con verificación obligatoria de sesión y RBAC antes de cada query.
  - `src/lib/actions/`: Server Actions tipadas para mutaciones (asistencias, alumnos, sesiones, graduaciones).
  - `src/lib/auth/`: Cookies seguras HTTP-only de larga duración (30 días) para evitar deslogueos en el tatami táctil.
  - `src/types/`: Tipos TypeScript y contratos de datos del dominio (Cinturones, Estados, Alertas).
  - `src/schemas/`: Esquemas Zod para validación rigurosa de entradas.
  - `src/components/tatami/`: Componentes optimizados para uso táctil con manos sudadas o guantines (touch targets $\ge 48\text{px}$).

---

## 🛡️ 2. Matriz de Seguridad y Roles (RBAC)

| Rol | Alcance y Permisos |
| :--- | :--- |
| **`PROFESOR` (Sensei)** | • Visualiza y toma asistencia de sus clases asignadas.<br>• Inscribe alumnos directamente en su clase desde el tatami.<br>• Búsqueda global de alumnos restringida exclusivamente a incorporar alumnos de "Recuperación" en una sesión activa.<br>• Visualiza sus métricas individuales (clases dictadas, promedio de asistencia, clases acumuladas en cinturón).<br>• **Restricción estricta:** NO tiene acceso a notas confidenciales, métricas directivas ni padrón financiero. |
| **`ADMIN` (Headmaster Sensei)** | • Acceso total a nivel de dojo.<br>• Métricas consolidadas de todos los senseis y horarios.<br>• Alertas de deserción escolar ($\ge 3$ ausencias consecutivas) con botón de llamada inmediata.<br>• Gestión de clases, horarios y asignación de profesores.<br>• Registro formal de exámenes de graduación (pase de cinto) y edición de notas privadas confidenciales. |

---

## 🗄️ 3. Esquema de Base de Datos PostgreSQL & Migración Supabase

El archivo de migración completo con extensiones, enums, tablas, claves foráneas, índices de alta performance y políticas RLS se encuentra en:

📁 [`supabase/migrations/20261015000000_nievas_karate_schema.sql`](file:///C:/development/nievas-academia-deportiva/supabase/migrations/20261015000000_nievas_karate_schema.sql)

### Tablas Implementadas:
1. `usuarios`: id (UUID, PK vinculada a `auth.users`), email, rol (`ADMIN` \| `PROFESOR`), nombre_completo, telefono, activo.
2. `alumnos`: id, nombre, apellido, fecha_nacimiento, telefono_contacto, contacto_emergencia, cinturon_actual, estado (`ACTIVO` \| `INACTIVO`), notas_privadas (solo visible por `ADMIN`).
3. `historial_graduaciones`: id, alumno_id (FK), cinturon, fecha_graduacion, graduado_por (FK usuarios), observaciones.
4. `clases`: id, nombre, profesor_id (FK usuarios), dias_semana (`INTEGER[]`), hora_inicio, hora_fin, cupo_maximo, activa.
5. `inscripciones`: id, clase_id (FK), alumno_id (FK), fecha_alta, activo, `UNIQUE(clase_id, alumno_id)`.
6. `sesiones_clase`: id, clase_id (FK), profesor_id (FK), fecha, hora_apertura, estado (`ABIERTA` \| `FINALIZADA`), observaciones.
7. `asistencias`: id, sesion_id (FK), alumno_id (FK), estado (`PRESENTE` \| `AUSENTE` \| `TARDE`), es_recuperacion (`boolean`), marcado_en, `UNIQUE(sesion_id, alumno_id)`.

---

## 📱 4. Flujos Clave del Tatami & Resiliencia Offline

1. **Detección Automática de Clase del Día**:
   - En `/profesor/clases`, el sistema evalúa el día actual (`new Date().getDay()`) y resalta la clase de hoy con un botón gigante de asistencia directa.
2. **Toma de Asistencia Táctil en 1-Tap**:
   - Botón amplio de inicio de clase que crea o recupera la sesión del día.
   - Lista táctil (mínimo 56px de altura) con avatars, color auténtico de cinturón con caracteres Kanji (`白`, `黄`, `橙`, `緑`, `青`, `茶`, `黒`).
   - Toggles instantáneos de 1-tap entre `PRESENTE`, `AUSENTE` y `TARDE` con feedback háptico (`navigator.vibrate`).
3. **Alumno de Recuperación**:
   - Modal con buscador en tiempo real para añadir cualquier alumno de otra clase al entrenamiento con el flag `es_recuperacion: true`.
4. **Alta Rápida de Alumno en Tatami**:
   - Formulario táctil que registra al alumno y lo matricula en la clase en curso en segundos.
5. **Resiliencia ante Caídas de Red (Tatami Offline)**:
   - Detección reactiva de eventos `window.addEventListener('online'/'offline')`.
   - Cuando no hay señal en el tatami, las acciones se almacenan en una cola local persistente (`localStorage`).
   - Indicador visual dinámico en la cabecera mostrando el estado online/offline y contador de acciones pendientes.
   - Sincronización automática de lote (batch sync) en cuanto se restablece la conexión.

---

## 📊 5. Panel de Métricas & Dashboard Directivo

- **Métricas del Sensei (`/profesor/metricas`)**:
  - Clases dictadas en el mes.
  - Promedio de asistencia por clase.
  - Tabla de alumnos con porcentaje de presentismo y **contador acumulado de clases en su cinturón actual** para determinar derecho a examen de graduación.
- **Dashboard del Headmaster (`/admin/dashboard`)**:
  - KPIs globales de dojo (alumnos activos, promedio de asistencia, horarios).
  - **Alertas de Deserción Escolar**: Identificación automática de alumnos con 3 o más ausencias seguidas y botón de llamada directa.
  - Desempeño y retención por profesor.
  - Ranking de convocatoria por clase (mayor vs. menor).
- **Gestión de Alumnos & Graduaciones (`/admin/alumnos`)**:
  - Padrón filtrable por cinturón y buscador por nombre/teléfono.
  - Modal oficial de examen de graduación con registro histórico.
  - Visualización y edición segura de notas confidenciales médicas o familiares.

---

## ⚡ 6. Ejecución Local

```bash
# Entrar a la carpeta del proyecto
cd C:\development\nievas-academia-deportiva

# Servidor de desarrollo
npm run dev

# Abrir en el navegador
http://localhost:3005
```
