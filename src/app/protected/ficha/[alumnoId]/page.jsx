'use client'
import { use } from 'react'
import useSWR from 'swr'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

const NIVEL_COLOR = {
  CL: 'badge-success', L: 'badge-info', ML: 'badge-warning', LI: 'badge-error', NL: 'badge-neutral'
}
const NIVEL_LABEL = { CL: 'CL', L: 'L', ML: 'ML', LI: 'LI', NL: 'NL' }

function NotaCircle({ nota, tipo }) {
  if (!nota) return null
  const max = tipo === 'FORMATIVA' ? 10 : 7
  const umbral = tipo === 'FORMATIVA' ? 5.5 : 4.0
  const color = nota >= umbral ? 'text-success' : nota >= umbral - 0.5 ? 'text-warning' : 'text-error'
  const borderColor = nota >= umbral ? 'border-success' : nota >= umbral - 0.5 ? 'border-warning' : 'border-error'
  return (
    <div className={`rounded-full border-4 ${borderColor} w-14 h-14 flex items-center justify-center flex-shrink-0`}>
      <span className={`font-bold text-lg ${color}`}>{nota}</span>
    </div>
  )
}

export default function FichaPage({ params }) {
  const { alumnoId } = use(params)
  const { data: alumno, isLoading } = useSWR(`/api/alumnos/${alumnoId}`, fetcher)

  if (isLoading) return <div className="flex justify-center items-center h-96"><span className="loading loading-spinner loading-lg text-primary" /></div>
  if (!alumno) return <div className="p-6 text-error">Alumno no encontrado</div>

  const calificaciones = alumno.calificaciones ?? []

  // Calcular promedio ponderado sumativo
  const sumativas = calificaciones.filter(c => c.evaluacion?.tipo === 'SUMATIVA' && c.nota && c.evaluacion?.ponderacion > 0)
  const totalPond = sumativas.reduce((s, c) => s + (c.evaluacion?.ponderacion ?? 0), 0)
  const promPonderado = totalPond > 0
    ? +(sumativas.reduce((s, c) => s + c.nota * (c.evaluacion?.ponderacion ?? 0), 0) / totalPond).toFixed(1)
    : null

  const formativas = calificaciones.filter(c => c.evaluacion?.tipo === 'FORMATIVA')
  const promFormativo = formativas.length > 0
    ? +(formativas.reduce((s, c) => s + (c.nota ?? 0), 0) / formativas.length).toFixed(1)
    : null

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Cabecera */}
      <div>
        <Link href="/protected/alumnos" className="text-xs text-primary hover:underline">← Alumnos</Link>
      </div>

      {/* Card de alumno */}
      <div className="card bg-base-100 shadow border border-base-300">
        <div className="card-body py-5">
          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="avatar placeholder">
                  <div className="bg-primary text-primary-content rounded-full w-12">
                    <span className="text-xl font-bold">{alumno.nombre[0]}{alumno.apellido[0]}</span>
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{alumno.apellido}, {alumno.nombre}</h1>
                  <div className="flex gap-2 mt-1">
                    {alumno.esPPD && <span className="badge badge-warning">PPD</span>}
                    <span className={`badge ${alumno.activo ? 'badge-success' : 'badge-error'}`}>
                      {alumno.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
              {alumno.email && <p className="text-sm text-gray-500 mt-2">{alumno.email}</p>}
              <p className="text-sm text-gray-500">
                {alumno.seccion?.codigo} — {alumno.seccion?.asignatura} ({alumno.seccion?.semestre})
              </p>
            </div>

            {/* Resumen de notas */}
            <div className="flex gap-4">
              {promPonderado && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Promedio Sumativo</p>
                  <p className={`text-4xl font-bold ${promPonderado >= 4 ? 'text-success' : 'text-error'}`}>
                    {promPonderado}
                  </p>
                  <p className="text-xs text-gray-400">ponderado</p>
                </div>
              )}
              {promFormativo && (
                <div className="text-center">
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Promedio Formativo</p>
                  <p className={`text-4xl font-bold ${promFormativo >= 5.5 ? 'text-success' : 'text-warning'}`}>
                    {promFormativo}
                  </p>
                  <p className="text-xs text-gray-400">de 10</p>
                </div>
              )}
            </div>
          </div>

          {/* Alerta PPD */}
          {alumno.esPPD && alumno.adaptaciones && (
            <div className="alert alert-warning mt-4 py-2">
              <div>
                <p className="font-bold text-sm">Adaptaciones curriculares PPD</p>
                <p className="text-sm">{alumno.adaptaciones}</p>
                <p className="text-xs text-gray-600 mt-1">Umbral de alerta: {alumno.umbralAlerta}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sin calificaciones */}
      {calificaciones.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>Este alumno aún no tiene evaluaciones calificadas.</p>
          <Link href="/protected/evaluaciones" className="btn btn-sm btn-primary mt-4">Ver evaluaciones</Link>
        </div>
      )}

      {/* Historial de evaluaciones */}
      {calificaciones.map(cal => {
        const isFormativa = cal.evaluacion?.tipo === 'FORMATIVA'
        const nota = cal.nota
        const retro = cal.retroalimentacion

        return (
          <div key={cal.id} className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body py-4">
              {/* Encabezado evaluación */}
              <div className="flex justify-between items-start flex-wrap gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`badge badge-sm ${isFormativa ? 'badge-info' : 'badge-secondary'}`}>
                      {isFormativa ? 'Formativa' : 'Sumativa'}
                    </span>
                    <span className="text-xs text-gray-400">Semana {cal.evaluacion?.semana}</span>
                    {isFormativa === false && <span className="text-xs text-gray-400">Pond. {cal.evaluacion?.ponderacion}%</span>}
                  </div>
                  <h3 className="font-bold mt-1">{cal.evaluacion?.nombre}</h3>
                </div>
                <div className="flex items-center gap-3">
                  <NotaCircle nota={nota} tipo={cal.evaluacion?.tipo} />
                  <Link href={`/protected/retroalimentacion/${alumnoId}/${cal.evaluacionId}`}
                    className="btn btn-xs btn-outline btn-primary">
                    {retro ? 'Ver retroalim.' : 'Agregar retroalim.'}
                  </Link>
                </div>
              </div>

              {/* Logros por criterio */}
              {cal.logros?.length > 0 && (
                <div className="mt-3 space-y-1.5">
                  {cal.logros.map(l => (
                    <div key={l.id} className="flex items-start gap-2 text-xs">
                      <span className={`badge badge-xs flex-shrink-0 mt-0.5 ${NIVEL_COLOR[l.nivel]}`}>{l.nivel}</span>
                      <span className="text-gray-700 flex-1">{l.criterio?.descripcion}</span>
                      {l.observacion && <em className="text-gray-400 max-w-xs truncate">{l.observacion}</em>}
                    </div>
                  ))}
                </div>
              )}

              {/* Retroalimentación si existe */}
              {retro && (
                <div className="mt-4 pt-4 border-t border-base-300 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Retroalimentación guardada</p>
                  {retro.haciaDondeVoy && (
                    <div>
                      <p className="text-xs font-bold text-blue-700">¿Hacia dónde voy?</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{retro.haciaDondeVoy}</p>
                    </div>
                  )}
                  {isFormativa && retro.fortalezas && (
                    <div>
                      <p className="text-xs font-bold text-green-700">Fortalezas</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{retro.fortalezas}</p>
                    </div>
                  )}
                  {!isFormativa && retro.aspectosLogrados && (
                    <div>
                      <p className="text-xs font-bold text-green-700">Aspectos logrados</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{retro.aspectosLogrados}</p>
                    </div>
                  )}
                  {retro.porMejorar && (
                    <div>
                      <p className="text-xs font-bold text-orange-600">Por mejorar</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{retro.porMejorar}</p>
                    </div>
                  )}
                  {retro.comoSigo && (
                    <div>
                      <p className="text-xs font-bold text-purple-700">¿Cómo sigo?</p>
                      <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{retro.comoSigo}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
