import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  try {
    const alumno = await prisma.alumno.findUnique({
      where: { id },
      include: {
        seccion: true,
        calificaciones: {
          include: {
            evaluacion: { include: { criterios: { orderBy: { orden: 'asc' } } } },
            logros: { include: { criterio: true } },
            retroalimentacion: true,
          },
          orderBy: { evaluacion: { semana: 'asc' } },
        },
      },
    })
    if (!alumno) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(alumno)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const { id } = await params
  const data = await request.json()
  try {
    const alumno = await prisma.alumno.update({ where: { id }, data })
    return NextResponse.json(alumno)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  try {
    await prisma.alumno.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
