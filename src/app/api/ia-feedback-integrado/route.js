import JSZip from 'jszip'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/libs/prisma'

export const maxDuration = 300

const READABLE_EXTS = new Set(['.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx', '.md', '.txt', '.json', '.php', '.py', '.vue'])
const NIVEL_PCT = { CL: 100, L: 80, ML: 60, LI: 30, NL: 0 }

function calcularNota(logros, tipo) {
  if (!logros.length) return 1.0
  const avg = logros.reduce((s, l) => s + (NIVEL_PCT[l.nivel] ?? 0), 0) / logros.length
  return tipo === 'FORMATIVA' ? +(1 + (avg / 100) * 9).toFixed(1) : +(1 + (avg / 100) * 6).toFixed(1)
}

async function evaluateWithClaude(anthropic, alumnoNombre, filesContent, evaluacion, extraContext) {
  const criteriosText = evaluacion.criterios
    .map((c, i) => `${i + 1}. [ID:${c.id}] ${c.descripcion}`)
    .join('\n')

  const filesText = filesContent.length > 0
    ? filesContent.map(f => `### ${f.name}\n\`\`\`\n${f.content.slice(0, 3000)}\n\`\`\``).join('\n\n')
    : '*(Alumno no entregó archivos o la carpeta está vacía)*'

  const isFormativa = evaluacion.tipo === 'FORMATIVA'

  const systemPrompt = `Eres un docente evaluador de DUOC UC especializado en desarrollo web.
Analiza el código del alumno y evalúa cada criterio de la rúbrica con rigor y precisión.
RESPONDE ÚNICAMENTE con JSON válido. Sin markdown, sin texto adicional fuera del JSON.`

  const userMsg = `**Evaluación:** ${evaluacion.nombre} (${isFormativa ? 'Formativa — escala 1-10' : 'Sumativa — escala 1-7'})
**Alumno:** ${alumnoNombre}
${extraContext ? `**Contexto adicional del docente:** ${extraContext}\n` : ''}
**Criterios de la rúbrica (debes evaluar TODOS):**
${criteriosText}

**Archivos entregados por el alumno:**
${filesText}

Responde con este JSON exacto (sin markdown):
{
  "logros": [
    {"criterioId": "<id exacto del criterio>", "nivel": "<CL|L|ML|LI|NL>", "observacion": "<observación específica del código del alumno para este criterio, max 80 caracteres>"}
  ],
  "haciaDondeVoy": "<objetivo y propósito de la actividad, 2-3 oraciones>",
  ${isFormativa
    ? '"fortalezas": "<lo que el alumno hizo bien, específico con el código entregado>",'
    : '"aspectosLogrados": "<lo que el alumno demostró haber aprendido según los criterios>",'}
  "porMejorar": "<qué debe corregir o profundizar, con ejemplos concretos del código>",
  "comoSigo": "<2-3 pasos concretos y alcanzables para mejorar>"
}

Niveles: CL=100% L=80% ML=60% LI=30% NL=0%
Tono: profesional, cercano, motivador pero honesto.
Evalúa ${evaluacion.criterios.length} criterio(s) — uno por cada ID listado.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1800,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMsg }],
  })

  const text = (response.content[0]?.type === 'text' ? response.content[0].text : '').trim()
  const jsonStr = text.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim()
  return JSON.parse(jsonStr)
}

function buildFeedbackMd(alumnoNombre, result, evaluacion, nota) {
  const isFormativa = evaluacion.tipo === 'FORMATIVA'
  const lines = [
    `# Retroalimentación Efectiva`,
    ``,
    `**Alumno:** ${alumnoNombre}`,
    `**Evaluación:** ${evaluacion.nombre}`,
    `**Nota:** ${nota} ${isFormativa ? '(escala 1-10)' : '(escala 1-7)'}`,
    ``,
    `---`,
    ``,
    `## 🎯 ¿Hacia dónde voy?`,
    ``,
    result.haciaDondeVoy,
    ``,
    `---`,
    ``,
    `## 📊 ¿Cómo voy?`,
    ``,
    `### ✅ ${isFormativa ? 'Fortalezas' : 'Aspectos logrados'}`,
    ``,
    isFormativa ? result.fortalezas : result.aspectosLogrados,
    ``,
    `### 🔧 Aspectos a mejorar`,
    ``,
    result.porMejorar,
    ``,
    `### 📋 Detalle por criterio de la rúbrica`,
    ``,
    ...(result.logros ?? []).map((l, i) => {
      const criterio = evaluacion.criterios.find(c => c.id === l.criterioId)
      return `- **C${i + 1} \`[${l.nivel}]\`** ${criterio?.descripcion ?? 'criterio'}: *${l.observacion}*`
    }),
    ``,
    `---`,
    ``,
    `## 🚀 ¿Cómo sigo?`,
    ``,
    result.comoSigo,
    ``,
    `---`,
    ``,
    `*Retroalimentación Efectiva — DUOC UC ${new Date().getFullYear()} · Generada con apoyo de IA*`,
  ]
  return lines.join('\n')
}

export async function POST(req) {
  const formData = await req.formData()
  const zipFile = formData.get('zip')
  const evalId = formData.get('evalId')
  const rawRuta = (formData.get('ruta') ?? '').replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\/+/, '').trim()
  const mappingJson = formData.get('mapping')
  const extraContext = formData.get('context') ?? ''

  if (!zipFile || !evalId || !mappingJson) {
    return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY no configurada en .env' }, { status: 500 })
  }

  let confirmedMapping
  try { confirmedMapping = JSON.parse(mappingJson) }
  catch { return Response.json({ error: 'Mapping inválido' }, { status: 400 }) }

  const activeMapping = confirmedMapping.filter(m => m.alumnoId)
  if (!activeMapping.length) {
    return Response.json({ error: 'No hay alumnos mapeados para generar' }, { status: 400 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const evaluacion = await prisma.evaluacion.findUnique({
    where: { id: evalId },
    include: { criterios: { orderBy: { orden: 'asc' } }, seccion: true },
  })
  if (!evaluacion) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 })

  const alumnoIds = [...new Set(activeMapping.map(m => m.alumnoId))]
  const alumnos = await prisma.alumno.findMany({ where: { id: { in: alumnoIds } } })
  const alumnoMap = Object.fromEntries(alumnos.map(a => [a.id, a]))

  const buffer = await zipFile.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)
  const prefix = rawRuta ? rawRuta + '/' : ''

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) =>
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'))

      send({ type: 'start', total: activeMapping.length })
      let processed = 0

      for (const mapItem of activeMapping) {
        const { folderName, alumnoId } = mapItem
        const alumno = alumnoMap[alumnoId]
        if (!alumno) continue

        const alumnoNombre = `${alumno.nombre} ${alumno.apellido}`
        send({ type: 'processing', folderName, alumnoNombre })

        // Leer archivos del alumno desde el ZIP
        const studentPrefix = prefix + folderName + '/'
        const files = []
        zip.forEach((relativePath, fileObj) => {
          if (fileObj.dir || !relativePath.startsWith(studentPrefix)) return
          if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return
          const fileName = relativePath.slice(studentPrefix.length)
          if (fileName.split('/').length > 4) return
          const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
          if (READABLE_EXTS.has(ext)) files.push({ name: fileName, fileObj })
        })

        const filesContent = await Promise.all(
          files.slice(0, 12).map(async f => ({
            name: f.name,
            content: await f.fileObj.async('string').catch(() => '[No legible]'),
          }))
        )

        try {
          // Llamar a Claude
          const result = await evaluateWithClaude(anthropic, alumnoNombre, filesContent, evaluacion, extraContext)

          // Calcular nota
          const nota = calcularNota(result.logros ?? [], evaluacion.tipo)

          // Guardar Calificacion en DB
          const calificacion = await prisma.calificacion.upsert({
            where: { alumnoId_evaluacionId: { alumnoId, evaluacionId: evalId } },
            update: { nota },
            create: { alumnoId, evaluacionId: evalId, nota },
          })

          // Borrar logros anteriores y crear nuevos
          await prisma.logroCriterio.deleteMany({ where: { calificacionId: calificacion.id } })
          for (const logro of result.logros ?? []) {
            const criterio = evaluacion.criterios.find(c => c.id === logro.criterioId)
            if (!criterio) continue
            await prisma.logroCriterio.create({
              data: {
                nivel: logro.nivel,
                observacion: logro.observacion ?? '',
                calificacionId: calificacion.id,
                criterioId: criterio.id,
              },
            })
          }

          // Guardar RetroAlimentacion
          const retroData = {
            haciaDondeVoy: result.haciaDondeVoy ?? '',
            fortalezas: result.fortalezas ?? '',
            aspectosLogrados: result.aspectosLogrados ?? '',
            porMejorar: result.porMejorar ?? '',
            comoSigo: result.comoSigo ?? '',
          }
          await prisma.retroAlimentacion.upsert({
            where: { calificacionId: calificacion.id },
            update: retroData,
            create: { calificacionId: calificacion.id, ...retroData },
          })

          // Agregar feedback.md al ZIP
          const feedbackMd = buildFeedbackMd(alumnoNombre, result, evaluacion, nota)
          zip.file(studentPrefix + 'feedback.md', feedbackMd)

          processed++
          send({
            type: 'done',
            folderName,
            alumnoNombre,
            nota,
            logros: result.logros,
            progress: processed,
            total: activeMapping.length,
          })
        } catch (err) {
          processed++
          send({
            type: 'error',
            folderName,
            alumnoNombre,
            error: err.message,
            progress: processed,
            total: activeMapping.length,
          })
        }
      }

      // Generar ZIP final con todos los feedback.md
      try {
        const zipBase64 = await zip.generateAsync({
          type: 'base64',
          compression: 'DEFLATE',
          compressionOptions: { level: 6 },
        })
        const safeName = evaluacion.nombre.slice(0, 40).replace(/[^a-z0-9]/gi, '-').toLowerCase()
        const fileName = `feedback-${safeName}-${new Date().toISOString().slice(0, 10)}.zip`
        send({ type: 'complete', zipBase64, fileName })
      } catch (err) {
        send({ type: 'fatal_error', message: 'Error generando ZIP: ' + err.message })
      }

      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
