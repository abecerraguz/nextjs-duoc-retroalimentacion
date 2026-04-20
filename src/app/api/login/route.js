import { prisma } from '@/libs/prisma'
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { signToken } from '@/utils/auth'

export async function POST(request) {
  const { email, password } = await request.json()

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return NextResponse.json({ error: 'Credenciales inválidas' }, { status: 401 })

    const token = signToken({ id: user.id, email: user.email, nombre: user.nombre })
    return NextResponse.json({ token, nombre: user.nombre }, { status: 200 })
  } catch (error) {
    console.error('[LOGIN ERROR]', error)
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 })
  }
}
