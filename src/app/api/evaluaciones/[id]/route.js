import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  try {
    const evaluacion = await prisma.evaluacion.findUnique({
      where: { id },
      include: {
        criterios: { orderBy: { orden: 'asc' } },
        seccion: { include: { alumnos: { where: { activo: true }, orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] } } },
        calificaciones: {
          include: {
            alumno: true,
            logros: { include: { criterio: true } },
            retroalimentacion: true,
          },
        },
      },
    })
    if (!evaluacion) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(evaluacion)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const { id } = await params
  const { criterios, ...data } = await request.json()
  try {
    const evaluacion = await prisma.evaluacion.update({ where: { id }, data })
    return NextResponse.json(evaluacion)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  try {
    await prisma.evaluacion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
