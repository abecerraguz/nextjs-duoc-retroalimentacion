import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'

export async function POST(request) {
  const data = await request.json()
  // data: { calificacionId, haciaDondeVoy, fortalezas, porMejorar, aspectosLogrados, comoSigo }
  try {
    const retro = await prisma.retroAlimentacion.upsert({
      where: { calificacionId: data.calificacionId },
      update: {
        haciaDondeVoy: data.haciaDondeVoy ?? null,
        fortalezas: data.fortalezas ?? null,
        porMejorar: data.porMejorar ?? null,
        aspectosLogrados: data.aspectosLogrados ?? null,
        comoSigo: data.comoSigo ?? null,
      },
      create: {
        calificacionId: data.calificacionId,
        haciaDondeVoy: data.haciaDondeVoy ?? null,
        fortalezas: data.fortalezas ?? null,
        porMejorar: data.porMejorar ?? null,
        aspectosLogrados: data.aspectosLogrados ?? null,
        comoSigo: data.comoSigo ?? null,
      },
    })
    return NextResponse.json(retro, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error al guardar retroalimentación' }, { status: 500 })
  }
}
