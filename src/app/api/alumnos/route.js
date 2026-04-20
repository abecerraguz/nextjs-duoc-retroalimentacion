import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const seccionId = searchParams.get('seccionId')
  try {
    const alumnos = await prisma.alumno.findMany({
      where: seccionId ? { seccionId } : {},
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
      include: { seccion: { select: { codigo: true, asignatura: true, semestre: true } } },
    })
    return NextResponse.json(alumnos)
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}

export async function POST(request) {
  const data = await request.json()
  try {
    const alumno = await prisma.alumno.create({ data })
    return NextResponse.json(alumno, { status: 201 })
  } catch (e) {
    if (e.code === 'P2002') return NextResponse.json({ error: 'Email ya registrado' }, { status: 409 })
    return NextResponse.json({ error: 'Error al crear alumno' }, { status: 500 })
  }
}
