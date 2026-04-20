import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const seccionId = searchParams.get('seccionId')
  try {
    const evaluaciones = await prisma.evaluacion.findMany({
      where: seccionId ? { seccionId } : {},
      orderBy: [{ semana: 'asc' }],
      include: {
        criterios: { orderBy: { orden: 'asc' } },
        seccion: { select: { codigo: true, asignatura: true, semestre: true } },
        _count: { select: { calificaciones: true } },
      },
    })
    return NextResponse.json(evaluaciones)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  const { criterios, ...evalData } = await request.json()
  try {
    const evaluacion = await prisma.evaluacion.create({
      data: {
        ...evalData,
        criterios: {
          create: criterios.map((desc, i) => ({ descripcion: desc, orden: i + 1 })),
        },
      },
      include: { criterios: { orderBy: { orden: 'asc' } } },
    })
    return NextResponse.json(evaluacion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear evaluación' }, { status: 500 })
  }
}
