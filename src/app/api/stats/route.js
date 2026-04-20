import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const seccionId = searchParams.get('seccionId')

  try {
    const whereAlumno = seccionId ? { seccionId } : {}

    const [totalAlumnos, totalPPD, calificaciones, evaluaciones] = await Promise.all([
      prisma.alumno.count({ where: whereAlumno }),
      prisma.alumno.count({ where: { ...whereAlumno, esPPD: true } }),
      prisma.calificacion.findMany({
        where: { alumno: whereAlumno, nota: { not: null } },
        include: {
          alumno: { select: { umbralAlerta: true, esPPD: true } },
          evaluacion: { select: { tipo: true, ponderacion: true } },
        },
      }),
      prisma.evaluacion.findMany({
        where: seccionId ? { seccionId } : {},
        select: { tipo: true, ponderacion: true },
      }),
    ])

    // Alumnos en riesgo: promedio sumativo < umbralAlerta
    const promediosPorAlumno = {}
    for (const cal of calificaciones) {
      if (cal.evaluacion.tipo !== 'SUMATIVA') continue
      if (!promediosPorAlumno[cal.alumnoId]) {
        promediosPorAlumno[cal.alumnoId] = { notas: [], umbral: cal.alumno.umbralAlerta, esPPD: cal.alumno.esPPD }
      }
      promediosPorAlumno[cal.alumnoId].notas.push({ nota: cal.nota, ponderacion: cal.evaluacion.ponderacion })
    }

    let enRiesgo = 0
    const distribucion = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 }
    for (const [, v] of Object.entries(promediosPorAlumno)) {
      const totalPond = v.notas.reduce((s, n) => s + n.ponderacion, 0)
      const promedio = totalPond > 0
        ? v.notas.reduce((s, n) => s + n.nota * n.ponderacion, 0) / totalPond
        : v.notas.reduce((s, n) => s + n.nota, 0) / v.notas.length
      if (promedio < v.umbral) enRiesgo++
      const bucket = Math.min(7, Math.max(1, Math.round(promedio)))
      distribucion[bucket]++
    }

    const totalEvalFormativas = evaluaciones.filter(e => e.tipo === 'FORMATIVA').length
    const totalEvalSumativas = evaluaciones.filter(e => e.tipo === 'SUMATIVA').length

    return NextResponse.json({
      totalAlumnos,
      totalPPD,
      enRiesgo,
      distribucion,
      totalEvalFormativas,
      totalEvalSumativas,
    })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
