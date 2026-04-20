import JSZip from 'jszip'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 300

const READABLE_EXTS = new Set([
  '.html', '.htm', '.css', '.js', '.ts', '.jsx', '.tsx',
  '.md', '.txt', '.json', '.php', '.py', '.vue', '.xml',
])

const SYSTEM_PROMPT = `Eres un docente de DUOC UC de la carrera Diseño y Desarrollo Web.
Tu misión es generar retroalimentación efectiva individual para cada alumno, siguiendo la metodología oficial "Retroalimentación Efectiva" de DUOC UC con sus 3 momentos.

Genera el contenido completo de un archivo feedback.md con esta estructura EXACTA:

---
# Retroalimentación — [nombre de la carpeta del alumno]

[Saludo: cordial, motivador, pero sincero con lo que entregó. 1-2 oraciones.]

## 🎯 ¿Hacia dónde voy?
[Objetivo y propósito de la actividad. Qué se esperaba lograr. 2-3 oraciones.]

## 📊 ¿Cómo voy?

### ✅ Fortalezas
[Lo que el alumno hizo bien. MUY específico con el código o archivos entregados.]

### 🔧 Aspectos a mejorar
[Lo que debe corregir o profundizar. Específico y constructivo, no genérico.]

## 🚀 ¿Cómo sigo?
[2-4 pasos concretos y alcanzables. Bullets con acciones específicas.]

---
*[Cierre: 1 oración motivadora y honesta.]*

---

REGLAS:
- Todo en español
- Específico con el código real del alumno (funciones, variables, errores concretos)
- Máximo 400 palabras
- Tono profesional pero cercano, como un buen docente que se preocupa
- Si no entregó nada o está incompleto, indícalo con empatía y orienta cómo ponerse al día
- NUNCA uses frases genéricas copiadas entre alumnos — cada feedback debe ser único`

async function buildFeedback(anthropic, studentName, filesWithContent, evalContext) {
  const filesText = filesWithContent.length > 0
    ? filesWithContent
        .map(f => `### ${f.name}\n\`\`\`\n${f.content.slice(0, 4000)}\n\`\`\``)
        .join('\n\n')
    : '*(El alumno no entregó archivos legibles o la carpeta está vacía)*'

  const userMsg = `**Contexto de la evaluación:**
${evalContext}

**Alumno / Carpeta:** ${studentName}

**Archivos entregados:**
${filesText}

Genera el archivo feedback.md para este alumno.`

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMsg }],
  })

  return response.content[0]?.type === 'text' ? response.content[0].text : ''
}

export async function POST(req) {
  const formData = await req.formData()
  const zipFile = formData.get('zip')
  const promptText = formData.get('prompt')
  const rawRuta = (formData.get('ruta') ?? '').replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\/+/, '').trim()

  if (!zipFile || !promptText) {
    return Response.json({ error: 'Falta el archivo ZIP o el prompt' }, { status: 400 })
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'ANTHROPIC_API_KEY no está configurada en .env' }, { status: 500 })
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const buffer = await zipFile.arrayBuffer()
  let zip
  try {
    zip = await JSZip.loadAsync(buffer)
  } catch {
    return Response.json({ error: 'El archivo no es un ZIP válido' }, { status: 400 })
  }

  // Detectar carpetas de alumnos en la ruta indicada
  const prefix = rawRuta ? rawRuta + '/' : ''
  const studentFolders = new Set()

  zip.forEach((relativePath) => {
    if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return
    if (!rawRuta || relativePath.startsWith(prefix)) {
      const rest = rawRuta ? relativePath.slice(prefix.length) : relativePath
      const firstSlash = rest.indexOf('/')
      if (firstSlash > 0) {
        const folder = rest.slice(0, firstSlash)
        if (folder && !folder.startsWith('.')) studentFolders.add(folder)
      }
    }
  })

  if (studentFolders.size === 0) {
    return Response.json({
      error: `No se encontraron carpetas de alumnos en la ruta "${rawRuta}". Verifica la ruta e intenta de nuevo.`,
    }, { status: 400 })
  }

  const encoder = new TextEncoder()
  const sortedStudents = [...studentFolders].sort()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) =>
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'))

      send({ type: 'students_found', count: sortedStudents.length, names: sortedStudents })

      let processed = 0

      for (const studentName of sortedStudents) {
        const studentPrefix = prefix + studentName + '/'
        const files = []

        zip.forEach((relativePath, fileObj) => {
          if (fileObj.dir) return
          if (!relativePath.startsWith(studentPrefix)) return
          if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return

          const fileName = relativePath.slice(studentPrefix.length)
          if (fileName.split('/').length > 4) return // evitar archivos muy anidados

          const dotIdx = fileName.lastIndexOf('.')
          if (dotIdx === -1) return
          const ext = fileName.slice(dotIdx).toLowerCase()
          if (READABLE_EXTS.has(ext)) files.push({ name: fileName, fileObj })
        })

        const filesWithContent = await Promise.all(
          files.slice(0, 12).map(async (f) => ({
            name: f.name,
            content: await f.fileObj.async('string').catch(() => '[No se pudo leer]'),
          }))
        )

        send({ type: 'processing', student: studentName, filesCount: filesWithContent.length })

        try {
          const feedback = await buildFeedback(anthropic, studentName, filesWithContent, promptText)
          zip.file(studentPrefix + 'feedback.md', feedback)
          processed++
          send({ type: 'student_done', student: studentName, feedback, progress: processed, total: sortedStudents.length })
        } catch (err) {
          processed++
          send({ type: 'student_error', student: studentName, error: err.message, progress: processed, total: sortedStudents.length })
        }
      }

      try {
        const zipBase64 = await zip.generateAsync({ type: 'base64', compression: 'DEFLATE', compressionOptions: { level: 6 } })
        const fileName = `retroalimentacion-${new Date().toISOString().slice(0, 10)}.zip`
        send({ type: 'complete', zipBase64, fileName })
      } catch (err) {
        send({ type: 'fatal_error', message: 'Error generando ZIP final: ' + err.message })
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
