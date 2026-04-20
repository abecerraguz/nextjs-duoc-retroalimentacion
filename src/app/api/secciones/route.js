import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const secciones = await prisma.seccion.findMany({
      orderBy: [{ semestre: 'desc' }, { codigo: 'asc' }],
      include: {
        _count: { select: { alumnos: true, evaluaciones: true } },
      },
    })
    return NextResponse.json(secciones)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  const data = await request.json()
  try {
    const seccion = await prisma.seccion.create({ data })
    return NextResponse.json(seccion, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al crear sección' }, { status: 500 })
  }
}
