import { NextResponse } from 'next/server'

export function middleware(req) {
  const token = req.cookies.get('token')
  const loginUrl = new URL('/login', req.url)

  if (req.nextUrl.pathname.startsWith('/protected')) {
    if (!token) return NextResponse.redirect(loginUrl)
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/protected/:path*'],
}
