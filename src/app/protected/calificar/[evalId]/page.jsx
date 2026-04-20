'use client'
import { useState, use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const fetcher = url => fetch(url).then(r => r.json())

const NIVELES = ['CL', 'L', 'ML', 'LI', 'NL']
const NIVEL_PCT = { CL: 100, L: 80, ML: 60, LI: 30, NL: 0 }
const NIVEL_COLOR = {
  CL: 'bg-success text-success-content',
  L: 'bg-info text-info-content',
  ML: 'bg-warning text-warning-content',
  LI: 'bg-orange-400 text-white',
  NL: 'bg-error text-error-content',
}
const NIVEL_LABEL = {
  CL: 'Completamente Logrado (100%)',
  L: 'Logrado (80%)',
  ML: 'Medianamente Logrado (60%)',
  LI: 'Logro Insuficiente (30%)',
  NL: 'No Logrado (0%)',
}

function calcularNota(logros, tipo) {
  if (!logros || Object.keys(logros).length === 0) return null
  const vals = Object.values(logros).map(n => NIVEL_PCT[n] ?? 0)
  const prom = vals.reduce((s, v) => s + v, 0) / vals.length
  return tipo === 'FORMATIVA' ? +(1 + (prom / 100) * 9).toFixed(1) : +(1 + (prom / 100) * 6).toFixed(1)
}

function NotaBadge({ nota, tipo }) {
  if (nota === null || nota === undefined) return <span className="text-gray-400">—</span>
  const umbral = tipo === 'FORMATIVA' ? 5.5 : 4.0
  const color = nota >= umbral ? 'badge-success' : nota >= (umbral - 0.5) ? 'badge-warning' : 'badge-error'
  return <span className={`badge ${color} font-bold`}>{nota}</span>
}

export default function CalificarPage({ params }) {
  const { evalId } = use(params)
  const router = useRouter()
  const { data: evaluacion, isLoading } = useSWR(`/api/evaluaciones/${evalId}`, fetcher)
  const [logros, setLogros] = useState({}) // { alumnoId: { criterioId: nivel } }
  const [observaciones, setObservaciones] = useState({}) // { alumnoId: { criterioId: texto } }
  const [saving, setSaving] = useState(null)
  const [saved, setSaved] = useState({})

  // Pre-cargar calificaciones existentes
  useSWR(evaluacion ? `/api/evaluaciones/${evalId}` : null, fetcher, {
    onSuccess: (data) => {
      const initLogros = {}
      const initObs = {}
      for (const cal of data.calificaciones ?? []) {
        initLogros[cal.alumnoId] = {}
        initObs[cal.alumnoId] = {}
        for (const logro of cal.logros) {
          initLogros[cal.alumnoId][logro.criterioId] = logro.nivel
          initObs[cal.alumnoId][logro.criterioId] = logro.observacion ?? ''
        }
      }
      setLogros(prev => ({ ...initLogros, ...prev }))
      setObservaciones(prev => ({ ...initObs, ...prev }))
    },
  })

  const setNivel = (alumnoId, criterioId, nivel) => {
    setLogros(prev => ({
      ...prev,
      [alumnoId]: { ...(prev[alumnoId] ?? {}), [criterioId]: nivel },
    }))
  }

  const setObs = (alumnoId, criterioId, texto) => {
    setObservaciones(prev => ({
      ...prev,
      [alumnoId]: { ...(prev[alumnoId] ?? {}), [criterioId]: texto },
    }))
  }

  const handleGuardar = async (alumnoId) => {
    const alumnoLogros = logros[alumnoId] ?? {}
    const alumnoObs = observaciones[alumnoId] ?? {}
    const criterioIds = evaluacion.criterios.map(c => c.id)
    const logrosList = criterioIds.map(cId => ({
      criterioId: cId,
      nivel: alumnoLogros[cId] ?? 'NL',
      observacion: alumnoObs[cId] ?? '',
    }))

    setSaving(alumnoId)
    await fetch('/api/calificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alumnoId, evaluacionId: evalId, logros: logrosList }),
    })
    setSaving(null)
    setSaved(prev => ({ ...prev, [alumnoId]: true }))
    setTimeout(() => setSaved(prev => { const n = {...prev}; delete n[alumnoId]; return n }), 2000)
  }

  const handleRetro = (alumnoId) => {
    const cal = evaluacion?.calificaciones?.find(c => c.alumnoId === alumnoId)
    if (cal) router.push(`/protected/retroalimentacion/${alumnoId}/${evalId}`)
  }

  if (isLoading) return <div className="flex justify-center items-center h-96"><span className="loading loading-spinner loading-lg text-primary" /></div>
  if (!evaluacion) return <div className="p-6 text-error">Evaluación no encontrada</div>

  const alumnos = evaluacion.seccion?.alumnos ?? []
  const criterios = evaluacion.criterios ?? []

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <Link href="/protected/evaluaciones" className="text-xs text-primary hover:underline">← Evaluaciones</Link>
          <h1 className="text-xl font-bold text-primary mt-1">{evaluacion.nombre}</h1>
          <div className="flex gap-2 mt-1">
            <span className={`badge badge-sm ${evaluacion.tipo === 'FORMATIVA' ? 'badge-info' : 'badge-secondary'}`}>
              {evaluacion.tipo === 'FORMATIVA' ? 'Formativa (1–10)' : `Sumativa (1–7) — ${evaluacion.ponderacion}%`}
            </span>
            <span className="badge badge-sm badge-ghost">Semana {evaluacion.semana}</span>
            <span className="badge badge-sm badge-ghost">{evaluacion.seccion?.codigo}</span>
          </div>
        </div>
        <div className="text-xs text-gray-500 text-right">
          <p>{alumnos.length} alumnos</p>
          <p>{criterios.length} criterios</p>
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-2">
        {NIVELES.map(n => (
          <span key={n} className={`badge badge-sm ${NIVEL_COLOR[n].replace('bg-', 'badge-').split(' ')[0]}`}>
            {n}: {NIVEL_PCT[n]}%
          </span>
        ))}
      </div>

      {/* Tabla de calificación */}
      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-primary text-primary-content text-xs uppercase">
              <th className="sticky left-0 bg-primary z-10 w-48">Alumno</th>
              {criterios.map((c, i) => (
                <th key={c.id} className="min-w-56">
                  <span className="font-bold">C{i + 1}</span>
                  <p className="font-normal normal-case text-xs opacity-80 truncate max-w-48" title={c.descripcion}>
                    {c.descripcion}
                  </p>
                </th>
              ))}
              <th className="text-center">Nota</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {alumnos.map(alumno => {
              const alumnoLogros = logros[alumno.id] ?? {}
              const nota = calcularNota(
                criterios.length > 0
                  ? Object.fromEntries(criterios.map(c => [c.id, alumnoLogros[c.id]]).filter(([, v]) => v))
                  : {},
                evaluacion.tipo
              )
              const calExistente = evaluacion.calificaciones?.find(c => c.alumnoId === alumno.id)

              return (
                <tr key={alumno.id} className={`hover:bg-base-200 ${alumno.esPPD ? 'border-l-4 border-warning' : ''}`}>
                  <td className="sticky left-0 bg-white z-10">
                    <div className="flex items-center gap-1.5">
                      <div>
                        <p className="font-medium text-sm">{alumno.apellido}, {alumno.nombre}</p>
                        {alumno.esPPD && <span className="badge badge-warning badge-xs">PPD</span>}
                      </div>
                    </div>
                  </td>

                  {criterios.map(criterio => {
                    const nivelActual = alumnoLogros[criterio.id]
                    const obsActual = observaciones[alumno.id]?.[criterio.id] ?? ''
                    const esMLNL = nivelActual === 'ML' || nivelActual === 'NL' || nivelActual === 'LI'

                    return (
                      <td key={criterio.id} className="align-top pt-2 pb-1">
                        {/* Botones de nivel */}
                        <div className="flex gap-0.5 flex-wrap">
                          {NIVELES.map(n => (
                            <button
                              key={n}
                              title={NIVEL_LABEL[n]}
                              onClick={() => setNivel(alumno.id, criterio.id, n)}
                              className={`btn btn-xs rounded px-2 font-bold transition-all ${
                                nivelActual === n
                                  ? NIVEL_COLOR[n]
                                  : 'btn-ghost opacity-40 hover:opacity-80'
                              }`}
                            >
                              {n}
                            </button>
                          ))}
                        </div>
                        {/* Observación (obligatoria si ML/LI/NL) */}
                        {esMLNL && (
                          <textarea
                            rows={2}
                            placeholder="Observación requerida..."
                            className="textarea textarea-bordered textarea-xs w-full mt-1 text-xs"
                            value={obsActual}
                            onChange={e => setObs(alumno.id, criterio.id, e.target.value)}
                          />
                        )}
                      </td>
                    )
                  })}

                  <td className="text-center font-bold">
                    <NotaBadge nota={nota} tipo={evaluacion.tipo} />
                  </td>

                  <td>
                    <div className="flex flex-col gap-1">
                      <button
                        className={`btn btn-xs ${saved[alumno.id] ? 'btn-success' : 'btn-primary'} btn-outline`}
                        disabled={saving === alumno.id}
                        onClick={() => handleGuardar(alumno.id)}
                      >
                        {saving === alumno.id
                          ? <span className="loading loading-spinner loading-xs" />
                          : saved[alumno.id] ? '✓ Guardado' : 'Guardar'}
                      </button>
                      {calExistente && (
                        <button className="btn btn-xs btn-outline btn-secondary"
                          onClick={() => handleRetro(alumno.id)}>
                          Retroalim.
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
