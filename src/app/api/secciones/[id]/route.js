import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
  const { id } = await params
  try {
    const seccion = await prisma.seccion.findUnique({
      where: { id },
      include: {
        alumnos: { orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }] },
        evaluaciones: { orderBy: { semana: 'asc' }, include: { criterios: { orderBy: { orden: 'asc' } } } },
      },
    })
    if (!seccion) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json(seccion)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function PUT(request, { params }) {
  const { id } = await params
  const data = await request.json()
  try {
    const seccion = await prisma.seccion.update({ where: { id }, data })
    return NextResponse.json(seccion)
  } catch {
    return NextResponse.json({ error: 'Error al actualizar' }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params
  try {
    await prisma.seccion.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Error al eliminar' }, { status: 500 })
  }
}
