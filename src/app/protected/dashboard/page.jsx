'use client'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

const NIVEL_COLOR = {
  CL: 'badge-success', L: 'badge-info', ML: 'badge-warning', LI: 'badge-error', NL: 'badge-neutral'
}
const NIVEL_LABEL = {
  CL: 'Completamente Logrado', L: 'Logrado', ML: 'Med. Logrado', LI: 'Logro Insuf.', NL: 'No Logrado'
}

export default function DashboardPage() {
  const { data: stats } = useSWR('/api/stats', fetcher)
  const { data: secciones } = useSWR('/api/secciones', fetcher)

  const cards = [
    { label: 'Total alumnos', value: stats?.totalAlumnos ?? '-', color: 'bg-primary text-primary-content' },
    { label: 'Alumnos PPD', value: stats?.totalPPD ?? '-', color: 'bg-warning text-warning-content' },
    { label: 'En riesgo', value: stats?.enRiesgo ?? '-', color: 'bg-error text-error-content' },
    { label: 'Eval. Formativas', value: stats?.totalEvalFormativas ?? '-', color: 'bg-info text-info-content' },
    { label: 'Eval. Sumativas', value: stats?.totalEvalSumativas ?? '-', color: 'bg-secondary text-secondary-content' },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">Dashboard</h1>
        <p className="text-sm text-gray-500">Resumen general de evaluaciones y retroalimentación</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map(c => (
          <div key={c.label} className={`rounded-2xl p-4 shadow-sm ${c.color}`}>
            <p className="text-3xl font-bold">{c.value}</p>
            <p className="text-xs uppercase tracking-wide mt-1 opacity-80">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Distribución de notas */}
      {stats?.distribucion && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base text-primary">Distribución de notas sumativas</h2>
            <div className="flex items-end gap-2 h-32 mt-2">
              {Object.entries(stats.distribucion).map(([nota, cantidad]) => {
                const max = Math.max(...Object.values(stats.distribucion), 1)
                const height = Math.max(4, (cantidad / max) * 100)
                const color = +nota >= 4 ? 'bg-success' : +nota === 3 ? 'bg-warning' : 'bg-error'
                return (
                  <div key={nota} className="flex flex-col items-center flex-1">
                    <span className="text-xs font-bold mb-1">{cantidad}</span>
                    <div className={`w-full rounded-t-md ${color}`} style={{ height: `${height}%` }} />
                    <span className="text-xs mt-1 font-medium">{nota}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Accesos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { href: '/protected/secciones', title: 'Secciones', desc: 'Administra tus secciones y semestres' },
          { href: '/protected/alumnos', title: 'Alumnos', desc: 'Gestiona el listado y alumnos PPD' },
          { href: '/protected/evaluaciones', title: 'Evaluaciones', desc: 'Crea evaluaciones y rúbricas' },
          { href: '/protected/calificar', title: 'Calificar', desc: 'Ingresa notas por rúbrica CL/L/ML/LI/NL' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className="card bg-base-100 shadow-sm hover:shadow-md transition-shadow border border-base-300">
            <div className="card-body py-4">
              <h3 className="font-bold text-primary">{item.title}</h3>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Secciones activas */}
      {secciones && secciones.length > 0 && (
        <div className="card bg-base-100 shadow-sm">
          <div className="card-body">
            <h2 className="card-title text-base text-primary">Secciones activas</h2>
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="bg-base-200 text-xs uppercase">
                    <th>Código</th><th>Asignatura</th><th>Semestre</th><th>Alumnos</th><th>Evals</th>
                  </tr>
                </thead>
                <tbody>
                  {secciones.filter(s => s.activa).map(s => (
                    <tr key={s.id} className="hover">
                      <td className="font-mono font-bold text-primary">{s.codigo}</td>
                      <td>{s.asignatura}</td>
                      <td>{s.semestre}</td>
                      <td>{s._count?.alumnos ?? 0}</td>
                      <td>{s._count?.evaluaciones ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
