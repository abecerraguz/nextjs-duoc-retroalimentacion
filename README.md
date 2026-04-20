# Sistema de Retroalimentación Efectiva — DUOC UC

Plataforma para docentes DUOC que automatiza la calificación por rúbrica y la generación de retroalimentación efectiva mediante IA (Claude de Anthropic). Permite gestionar secciones, alumnos, evaluaciones y generar feedback personalizado con análisis de código a través de archivos ZIP.

---

## Índice

- [Requisitos](#requisitos)
- [Variables de entorno](#variables-de-entorno)
- [Instalación local](#instalación-local)
- [Base de datos](#base-de-datos)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Módulos del sistema](#módulos-del-sistema)
- [IA Feedback integrado](#ia-feedback-integrado)
- [Estructura esperada del ZIP](#estructura-esperada-del-zip)
- [Escala de notas y niveles de logro](#escala-de-notas-y-niveles-de-logro)
- [Credenciales de acceso (demo)](#credenciales-de-acceso-demo)
- [Deploy con Docker](#deploy-con-docker)

---

## Requisitos

- Node.js 22+
- PostgreSQL (local o Railway)
- Cuenta Anthropic con API key (`claude-opus-4-5`)

---

## Variables de entorno

Crea un archivo `.env` en la raíz del proyecto basado en `.env.example`:

```env
DATABASE_URL="postgresql://usuario:contraseña@host:puerto/dbname?sslmode=require"
JWT_SECRET="secreto-seguro-de-al-menos-32-caracteres"
ANTHROPIC_API_KEY="sk-ant-api03-..."
```

| Variable | Descripción |
|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL. Para Railway usar la URL **pública** en local. |
| `JWT_SECRET` | Clave para firmar los tokens JWT de sesión. Cambiar en producción. |
| `ANTHROPIC_API_KEY` | API key de Anthropic. Requerida solo para el módulo IA Feedback. |

---

## Instalación local

```bash
# 1. Clonar e instalar dependencias
git clone <repo>
cd nextjs-duoc-retroalimentacion
npm install

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores reales

# 3. Generar cliente Prisma
npx prisma generate --config prisma.config.mjs

# 4. Aplicar migraciones
npx prisma migrate deploy --config prisma.config.mjs

# 5. Poblar con datos de ejemplo (opcional)
npx tsx prisma/seed.js

# 6. Iniciar servidor de desarrollo
npm run dev
# → http://localhost:3000
```

---

## Base de datos

El esquema se gestiona con **Prisma 7** usando el adaptador `@prisma/adapter-pg`.

### Modelos principales

| Modelo | Descripción |
|---|---|
| `User` | Docente/administrador del sistema |
| `Seccion` | Sección de clase (ej: `IFD2201-001`, semestre `2026-1`) |
| `Alumno` | Estudiante con flag `esPPD` para adaptaciones curriculares |
| `Evaluacion` | Evaluación con tipo `FORMATIVA` o `SUMATIVA`, semana y ponderación |
| `CriterioRubrica` | Criterio individual de la rúbrica, ordenado por `orden` |
| `Calificacion` | Nota final de un alumno en una evaluación (única por alumno+evaluación) |
| `LogroCriterio` | Nivel de logro (`CL/L/ML/LI/NL`) por criterio para una calificación |
| `RetroAlimentacion` | Feedback DUOC de los 3 momentos: haciaDondeVoy, cómoVoy, cómoSigo |

### Comandos útiles

```bash
# Ver estado de migraciones
npx prisma migrate status --config prisma.config.mjs

# Crear nueva migración tras cambiar schema.prisma
npx prisma migrate dev --name nombre_migracion --config prisma.config.mjs

# Abrir Prisma Studio (explorador visual)
npx prisma studio --config prisma.config.mjs

# Re-ejecutar seed
npx tsx prisma/seed.js
```

---

## Estructura del proyecto

```
src/app/
├── api/
│   ├── login/                        # POST — autenticación JWT
│   ├── alumnos/                      # GET lista, POST crear, GET/PUT/DELETE por ID
│   ├── secciones/                    # GET lista, GET por ID (con alumnos y evaluaciones)
│   ├── evaluaciones/                 # GET lista (con criterios y sección), GET por ID
│   ├── calificaciones/               # POST — guardar calificación manual
│   ├── retroalimentacion/            # GET/POST — retroalimentación manual
│   ├── stats/                        # GET — estadísticas del dashboard
│   ├── ia-feedback/                  # POST — modo standalone (sin DB, solo ZIP + Claude)
│   └── ia-feedback-integrado/
│       ├── preview/                  # POST — detectar carpetas + fuzzy match alumnos
│       └── route.js                  # POST SSE — generar + guardar en DB
│
└── protected/
    ├── layout.jsx                    # Sidebar de navegación con autenticación
    ├── dashboard/                    # Resumen general: secciones, alertas, stats
    ├── secciones/                    # Lista de secciones activas
    ├── alumnos/                      # Lista completa de alumnos con filtros
    ├── ficha/[alumnoId]/             # Ficha individual: historial y retroalimentación
    ├── evaluaciones/                 # Lista de evaluaciones con criterios
    ├── calificar/[evalId]/           # Calificación manual por evaluación
    ├── retroalimentacion/[alumnoId]/[evalId]/  # Editor de retroalimentación manual
    └── ia-feedback/                  # Flujo integrado de IA Feedback (3 pasos)
```

---

## Módulos del sistema

### Dashboard
Resumen ejecutivo con:
- Total de secciones activas y alumnos
- Alumnos en situación de alerta (nota < umbral, por defecto 4.0)
- Alumnos con PPD (Plan de Permanencia y Desarrollo)
- Últimas evaluaciones registradas

### Secciones
Visualización de secciones con código, asignatura, semestre y número de alumnos.

### Alumnos
- Lista con filtros por sección y búsqueda por nombre/apellido
- Indicador visual para alumnos PPD
- Acceso directo a ficha individual

### Ficha del alumno
Vista individual con:
- Datos del alumno y adaptaciones curriculares (si aplica)
- Historial de calificaciones por evaluación
- Acceso a retroalimentación de cada evaluación
- Niveles de logro por criterio de rúbrica

### Evaluaciones
- Listado con tipo (Formativa/Sumativa), semana y ponderación
- Criterios de rúbrica asociados
- Acceso directo a calificar o ver resultados

### Calificar
Formulario para registrar nota manualmente alumno por alumno dentro de una evaluación.

### Retroalimentación manual
Editor de texto enriquecido para los 3 momentos de retroalimentación DUOC:
- **¿Hacia dónde voy?** — Objetivo de la actividad
- **¿Cómo voy?** — Fortalezas / Aspectos logrados + Aspectos a mejorar
- **¿Cómo sigo?** — Próximos pasos concretos

---

## IA Feedback integrado

El módulo estrella del sistema. Permite procesar un ZIP con entregas de alumnos, evaluarlas con Claude AI usando la rúbrica de la evaluación, y guardar resultados directamente en la base de datos.

### Flujo de 3 pasos

#### Paso 1 — Seleccionar
- Elige la **evaluación** desde el selector (carga criterios de rúbrica automáticamente desde DB)
- Sube el archivo **ZIP** con las entregas
- Ingresa la **ruta interna** del ZIP hacia las carpetas de alumnos
- (Opcional) Agrega contexto adicional para Claude

**Ejemplo de ruta:** `lenguajes-001A-FINAL/EVALUACIONES/FORMATIVAS/FORMATIVA-04`

#### Paso 2 — Confirmar alumnos
El sistema detecta automáticamente las subcarpetas del ZIP y las empareja con los alumnos de la sección mediante **fuzzy matching** por nombre.

| Color del badge | Significado |
|---|---|
| 🟢 Verde | Confianza ≥ 50% — match seguro |
| 🟡 Amarillo | Confianza ≥ 25% — revisar manualmente |
| Sin match | No se encontró alumno — será ignorado |

Puedes corregir cualquier asignación con el selector desplegable antes de continuar.

#### Paso 3 — Generar y guardar
Claude evalúa el código de cada alumno contra los criterios de la rúbrica y genera:

- **Nota** calculada según escala DUOC
- **Nivel de logro por criterio** (`CL / L / ML / LI / NL`)
- **Retroalimentación completa** con los 3 momentos

Todo se guarda automáticamente en la base de datos (`Calificacion`, `LogroCriterio`, `RetroAlimentacion`).

Al finalizar se descarga un **ZIP enriquecido** con un archivo `feedback.md` dentro de la carpeta de cada alumno.

---

## Estructura esperada del ZIP

El ZIP debe tener una carpeta por alumno dentro de la ruta indicada. El nombre de la carpeta debe contener el nombre del alumno para que el fuzzy matching funcione correctamente.

```
ruta/
├── juan-perez-gonzalez/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── maria-torres-silva/
│   ├── index.html
│   └── script.js
└── diego-herrera/
    └── index.html
```

**Extensiones leídas por Claude:**
`.html` `.htm` `.css` `.js` `.ts` `.jsx` `.tsx` `.md` `.txt` `.json` `.php` `.py` `.vue`

> Se leen hasta **12 archivos** por alumno, con un máximo de **3.000 caracteres** por archivo.

---

## Escala de notas y niveles de logro

### Niveles de logro (rúbrica DUOC)

| Nivel | Nombre | Porcentaje |
|---|---|---|
| `CL` | Completamente Logrado | 100% |
| `L` | Logrado | 80% |
| `ML` | Medianamente Logrado | 60% |
| `LI` | Logrado Insuficientemente | 30% |
| `NL` | No Logrado | 0% |

### Cálculo de nota

La nota se calcula como el **promedio de porcentajes** de todos los criterios evaluados:

| Tipo | Fórmula | Rango |
|---|---|---|
| `FORMATIVA` | `1 + (promedio / 100) × 9` | 1.0 – 10.0 |
| `SUMATIVA` | `1 + (promedio / 100) × 6` | 1.0 – 7.0 |

**Ejemplo:** 3 criterios con niveles `CL (100%) + ML (60%) + L (80%)` → promedio 80% → nota formativa **8.2**

---

## Credenciales de acceso (demo)

Generadas por el seed (`npx tsx prisma/seed.js`):

| Campo | Valor |
|---|---|
| Email | `profesor@duoc.cl` |
| Contraseña | `duoc2024` |

> ⚠️ Cambia estas credenciales antes de usar en producción.

---

## Deploy con Docker

El proyecto incluye un `Dockerfile` basado en `node:22-slim` compatible con Railway y similares.

```bash
# Build local
docker build -t duoc-retroalimentacion .

# Run (reemplaza con tus valores)
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="secreto-seguro" \
  -e ANTHROPIC_API_KEY="sk-ant-..." \
  duoc-retroalimentacion
```

### Deploy en Railway

1. Conecta el repositorio en Railway
2. Railway detectará el `Dockerfile` automáticamente
3. Agrega las variables de entorno en el panel de Railway:
   - `DATABASE_URL` (usar la URL pública del PostgreSQL de Railway)
   - `JWT_SECRET`
   - `ANTHROPIC_API_KEY`
4. Las migraciones se aplican automáticamente al iniciar (`prisma migrate deploy`)

---

## Tecnologías principales

| Tecnología | Versión | Uso |
|---|---|---|
| Next.js | 15 | Framework fullstack (App Router) |
| React | 19 | UI |
| Prisma | 7 | ORM con adaptador pg |
| PostgreSQL | — | Base de datos |
| Anthropic Claude | claude-opus-4-5 | Evaluación y generación de feedback |
| JSZip | — | Lectura y generación de archivos ZIP |
| DaisyUI + Tailwind | — | Estilos y componentes UI |
| SWR | — | Fetching de datos en el cliente |
| jose | — | JWT (cookies HttpOnly) |
