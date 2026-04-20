'use client'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

export default function CalificarIndexPage() {
  const { data: evaluaciones, isLoading } = useSWR('/api/evaluaciones', fetcher)

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">Calificar</h1>
        <p className="text-sm text-gray-500">Selecciona una evaluación para ingresar notas</p>
      </div>

      {isLoading && <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary" /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(evaluaciones ?? []).map(e => (
          <Link key={e.id} href={`/protected/calificar/${e.id}`}
            className="card bg-base-100 shadow-sm border border-base-300 hover:shadow-md hover:border-primary transition-all">
            <div className="card-body py-4">
              <div className="flex justify-between items-start">
                <span className={`badge badge-sm ${e.tipo === 'FORMATIVA' ? 'badge-info' : 'badge-secondary'}`}>
                  {e.tipo === 'FORMATIVA' ? 'Formativa' : 'Sumativa'}
                </span>
                <span className="text-xs text-gray-400">Sem. {e.semana}</span>
              </div>
              <h3 className="font-bold text-sm mt-2 leading-tight">{e.nombre}</h3>
              <p className="text-xs text-gray-500">{e.seccion?.codigo} — {e.seccion?.semestre}</p>
              <p className="text-xs text-gray-400 mt-1">{e.criterios?.length ?? 0} criterios · {e._count?.calificaciones ?? 0} calificados</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
