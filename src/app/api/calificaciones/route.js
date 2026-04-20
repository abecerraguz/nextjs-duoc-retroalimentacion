import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

// Mapa de nivel → porcentaje
const NIVEL_PCT = { CL: 100, L: 80, ML: 60, LI: 30, NL: 0 }

function calcularNota(logros, tipo) {
  if (!logros || logros.length === 0) return null
  const promPct = logros.reduce((sum, l) => sum + (NIVEL_PCT[l.nivel] ?? 0), 0) / logros.length
  // Formativa 1-10, Sumativa 1-7
  return tipo === 'FORMATIVA'
    ? +(1 + (promPct / 100) * 9).toFixed(1)
    : +(1 + (promPct / 100) * 6).toFixed(1)
}

export async function POST(request) {
  const { alumnoId, evaluacionId, logros } = await request.json()
  // logros: [{ criterioId, nivel, observacion }]

  try {
    const evaluacion = await prisma.evaluacion.findUnique({ where: { id: evaluacionId } })
    const nota = calcularNota(logros, evaluacion.tipo)

    const calificacion = await prisma.calificacion.upsert({
      where: { alumnoId_evaluacionId: { alumnoId, evaluacionId } },
      update: {
        nota,
        logros: {
          deleteMany: {},
          create: logros.map(l => ({
            nivel: l.nivel,
            observacion: l.observacion ?? null,
            criterioId: l.criterioId,
          })),
        },
      },
      create: {
        alumnoId,
        evaluacionId,
        nota,
        logros: {
          create: logros.map(l => ({
            nivel: l.nivel,
            observacion: l.observacion ?? null,
            criterioId: l.criterioId,
          })),
        },
      },
      include: { logros: { include: { criterio: true } } },
    })
    return NextResponse.json(calificacion, { status: 201 })
  } catch (e) {
    console.error(e)
    return NextResponse.json({ error: 'Error al guardar calificación' }, { status: 500 })
  }
}
