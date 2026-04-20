import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  try {
    const cal = await prisma.calificacion.findUnique({
      where: { id },
      include: {
        alumno: true,
        evaluacion: { include: { criterios: { orderBy: { orden: 'asc' } } } },
        logros: { include: { criterio: true } },
        retroalimentacion: true,
      },
    })
    if (!cal) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(cal)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  try {
    await prisma.calificacion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
