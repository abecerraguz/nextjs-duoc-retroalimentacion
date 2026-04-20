'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import Cookies from 'js-cookie'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faGauge, faLayerGroup, faUsers, faClipboardList,
  faChalkboard, faIdCard, faRightFromBracket, faBrain
} from '@fortawesome/free-solid-svg-icons'

const navItems = [
  { href: '/protected/dashboard',    label: 'Dashboard',     icon: faGauge },
  { href: '/protected/secciones',    label: 'Secciones',     icon: faLayerGroup },
  { href: '/protected/alumnos',      label: 'Alumnos',       icon: faUsers },
  { href: '/protected/evaluaciones', label: 'Evaluaciones',  icon: faClipboardList },
  { href: '/protected/calificar',    label: 'Calificar',     icon: faChalkboard },
  { href: '/protected/ia-feedback',  label: 'IA Feedback',   icon: faBrain, badge: 'IA' },
]

export default function ProtectedLayout({ children }) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    Cookies.remove('token')
    router.push('/login')
  }

  return (
    <div className="flex min-h-screen bg-base-200">
      {/* Sidebar */}
      <aside className="w-64 bg-primary text-primary-content flex flex-col shadow-xl">
        <div className="p-6 border-b border-primary-content/20">
          <p className="text-xs uppercase tracking-widest opacity-70">DUOC UC</p>
          <h1 className="font-bold text-lg leading-tight mt-1">Retroalimentación<br/>Efectiva</h1>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map(item => {
            const active = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active
                    ? 'bg-white/20 text-white'
                    : 'hover:bg-white/10 opacity-80 hover:opacity-100'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto text-xs bg-secondary text-white px-1.5 py-0.5 rounded font-bold">
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-primary-content/20">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full opacity-80 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
