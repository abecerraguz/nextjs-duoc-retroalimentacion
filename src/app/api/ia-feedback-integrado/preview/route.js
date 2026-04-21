import JSZip from 'jszip'
import { prisma } from '@/libs/prisma'

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function matchAlumno(folderName, alumnos) {
  const folderParts = normalize(folderName).split(' ').filter(p => p.length > 1)
  let bestMatch = null
  let bestScore = 0

  for (const alumno of alumnos) {
    const alumnoParts = normalize(`${alumno.nombre} ${alumno.apellido}`).split(' ').filter(p => p.length > 1)
    let hits = 0
    for (const fp of folderParts) {
      if (alumnoParts.some(ap => ap === fp || (fp.length > 3 && ap.startsWith(fp)) || (ap.length > 3 && fp.startsWith(ap)))) hits++
    }
    const total = Math.max(folderParts.length, alumnoParts.length)
    const score = total > 0 ? hits / total : 0
    if (score > bestScore) { bestScore = score; bestMatch = alumno }
  }

  return {
    alumno: bestScore >= 0.25 ? bestMatch : null,
    score: Math.round(bestScore * 100),
    confident: bestScore >= 0.5,
  }
}

export async function POST(req) {
  const formData = await req.formData()
  const zipFile = formData.get('zip')
  const evalId = formData.get('evalId')
  const rawRuta = (formData.get('ruta') ?? '').replace(/\\/g, '/').replace(/\/+$/, '').replace(/^\/+/, '').trim()

  if (!zipFile || !evalId) {
    return Response.json({ error: 'Faltan parámetros' }, { status: 400 })
  }

  const evaluacion = await prisma.evaluacion.findUnique({
    where: { id: evalId },
    include: {
      criterios: { orderBy: { orden: 'asc' } },
      seccion: { include: { alumnos: { where: { activo: true }, orderBy: { apellido: 'asc' } } } },
    },
  })
  if (!evaluacion) return Response.json({ error: 'Evaluación no encontrada' }, { status: 404 })

  const alumnos = evaluacion.seccion?.alumnos ?? []

  const buffer = await zipFile.arrayBuffer()
  let zip
  try { zip = await JSZip.loadAsync(buffer) }
  catch { return Response.json({ error: 'ZIP inválido' }, { status: 400 }) }

  const prefix = rawRuta ? rawRuta + '/' : ''
  const studentFolders = new Set()
  zip.forEach((relativePath) => {
    if (relativePath.includes('__MACOSX') || relativePath.includes('.DS_Store')) return
    if (!rawRuta || relativePath.startsWith(prefix)) {
      const rest = rawRuta ? relativePath.slice(prefix.length) : relativePath
      const slash = rest.indexOf('/')
      if (slash > 0) {
        const folder = rest.slice(0, slash)
        if (folder && !folder.startsWith('.')) studentFolders.add(folder)
      }
    }
  })

  if (studentFolders.size === 0) {
    return Response.json({ error: `No se encontraron carpetas de alumnos en la ruta "${rawRuta}". Verifica la ruta.` }, { status: 400 })
  }

  const mapping = [...studentFolders].sort().map(folderName => {
    const { alumno, score, confident } = matchAlumno(folderName, alumnos)
    return {
      folderName,
      alumno: alumno ? { id: alumno.id, nombre: alumno.nombre, apellido: alumno.apellido, esPPD: alumno.esPPD } : null,
      score,
      confident,
    }
  })

  return Response.json({
    evaluacion: {
      id: evaluacion.id,
      nombre: evaluacion.nombre,
      tipo: evaluacion.tipo,
      semana: evaluacion.semana,
      criterios: evaluacion.criterios,
      seccion: { codigo: evaluacion.seccion?.codigo },
    },
    alumnos: alumnos.map(a => ({ id: a.id, nombre: a.nombre, apellido: a.apellido, esPPD: a.esPPD })),
    mapping,
  })
}
