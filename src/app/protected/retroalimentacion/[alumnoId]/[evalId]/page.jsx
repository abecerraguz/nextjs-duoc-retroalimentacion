'use client'
import { useState, use, useEffect } from 'react'
import useSWR from 'swr'
import { useFormik } from 'formik'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

const NIVEL_PCT = { CL: 100, L: 80, ML: 60, LI: 30, NL: 0 }
const NIVEL_COLOR = {
  CL: 'badge-success', L: 'badge-info', ML: 'badge-warning', LI: 'badge-error', NL: 'badge-neutral'
}
const NIVEL_LABEL = { CL: 'Completamente Logrado', L: 'Logrado', ML: 'Med. Logrado', LI: 'Logro Insuficiente', NL: 'No Logrado' }

export default function RetroalimentacionPage({ params }) {
  const { alumnoId, evalId } = use(params)
  const { data: alumno } = useSWR(`/api/alumnos/${alumnoId}`, fetcher)
  const { data: evaluacion } = useSWR(`/api/evaluaciones/${evalId}`, fetcher)
  const [saved, setSaved] = useState(false)

  const calificacion = alumno?.calificaciones?.find(c => c.evaluacionId === evalId)
  const retro = calificacion?.retroalimentacion

  const isFormativa = evaluacion?.tipo === 'FORMATIVA'

  // Template pre-rellenado basado en los logros
  const generarTemplate = () => {
    if (!calificacion || !evaluacion) return {}
    const logros = calificacion.logros ?? []
    const criteriosLogrados = logros.filter(l => l.nivel === 'CL' || l.nivel === 'L')
    const criteriosMejorar = logros.filter(l => l.nivel === 'ML' || l.nivel === 'LI' || l.nivel === 'NL')

    const fortalezas = criteriosLogrados.length > 0
      ? criteriosLogrados.map(l => `✓ ${l.criterio?.descripcion?.substring(0, 80) ?? 'criterio'} (${NIVEL_LABEL[l.nivel]})`).join('\n')
      : 'Se observa dedicación y participación en la actividad.'

    const porMejorar = criteriosMejorar.length > 0
      ? criteriosMejorar.map(l => `• ${l.criterio?.descripcion?.substring(0, 80) ?? 'criterio'}: ${l.observacion ?? 'Requiere refuerzo'}`).join('\n')
      : ''

    return {
      haciaDondeVoy: `Esta actividad tiene como objetivo que logres aplicar los conceptos fundamentales de ${evaluacion.nombre}. El propósito es que desarrolles competencias prácticas alineadas con los resultados de aprendizaje del curso.`,
      fortalezas: fortalezas || '',
      porMejorar: porMejorar || '',
      aspectosLogrados: criteriosLogrados.map(l => `✓ ${l.criterio?.descripcion?.substring(0, 80) ?? 'criterio'}`).join('\n'),
      comoSigo: `Te sugiero revisar los conceptos trabajados en los materiales de la semana ${evaluacion.semana}. Practica los ejercicios adicionales disponibles en la plataforma y no dudes en consultar durante las sesiones sincrónicas o a través del foro.`,
    }
  }

  const formik = useFormik({
    initialValues: {
      haciaDondeVoy: retro?.haciaDondeVoy ?? '',
      fortalezas: retro?.fortalezas ?? '',
      porMejorar: retro?.porMejorar ?? '',
      aspectosLogrados: retro?.aspectosLogrados ?? '',
      comoSigo: retro?.comoSigo ?? '',
    },
    enableReinitialize: true,
    onSubmit: async (values) => {
      await fetch('/api/retroalimentacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calificacionId: calificacion.id, ...values }),
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  const aplicarTemplate = () => {
    const t = generarTemplate()
    formik.setValues({
      haciaDondeVoy: t.haciaDondeVoy ?? '',
      fortalezas: isFormativa ? (t.fortalezas ?? '') : '',
      porMejorar: t.porMejorar ?? '',
      aspectosLogrados: !isFormativa ? (t.aspectosLogrados ?? '') : '',
      comoSigo: t.comoSigo ?? '',
    })
  }

  if (!alumno || !evaluacion) {
    return <div className="flex justify-center items-center h-96"><span className="loading loading-spinner loading-lg text-primary" /></div>
  }

  if (!calificacion) {
    return (
      <div className="p-6">
        <p className="text-error">Este alumno aún no tiene calificación para esta evaluación.</p>
        <Link href={`/protected/calificar/${evalId}`} className="btn btn-sm btn-primary mt-4">Ir a calificar</Link>
      </div>
    )
  }

  const nota = calificacion.nota
  const umbral = isFormativa ? 5.5 : 4.0
  const notaColor = nota >= umbral ? 'text-success' : nota >= umbral - 0.5 ? 'text-warning' : 'text-error'

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Cabecera */}
      <div>
        <Link href={`/protected/ficha/${alumnoId}`} className="text-xs text-primary hover:underline">← Ficha del alumno</Link>
        <h1 className="text-xl font-bold text-primary mt-1">Retroalimentación Efectiva</h1>
        <p className="text-sm text-gray-500">Plantilla DUOC UC — {isFormativa ? 'Evaluación Formativa' : 'Evaluación Sumativa'}</p>
      </div>

      {/* Info alumno + evaluación */}
      <div className="card bg-base-100 shadow-sm border border-base-300">
        <div className="card-body py-4">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <p className="font-bold text-lg">{alumno.apellido}, {alumno.nombre}</p>
              {alumno.esPPD && <span className="badge badge-warning badge-sm">PPD</span>}
              <p className="text-sm text-gray-500 mt-1">{evaluacion.nombre}</p>
              <p className="text-xs text-gray-400">Semana {evaluacion.semana} · {evaluacion.seccion?.codigo}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400 uppercase tracking-wide">Nota {isFormativa ? '(1-10)' : '(1-7)'}</p>
              <p className={`text-4xl font-bold ${notaColor}`}>{nota ?? '—'}</p>
            </div>
          </div>

          {/* Resumen de logros por criterio */}
          <div className="mt-3 space-y-1">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">Logros por criterio</p>
            {calificacion.logros?.map((l, i) => (
              <div key={l.id} className="flex items-start gap-2 text-xs">
                <span className={`badge badge-xs mt-0.5 ${NIVEL_COLOR[l.nivel]}`}>{l.nivel}</span>
                <span className="text-gray-600 flex-1">{l.criterio?.descripcion}</span>
                {l.observacion && <span className="text-gray-400 italic max-w-xs truncate">{l.observacion}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerta PPD */}
      {alumno.esPPD && alumno.adaptaciones && (
        <div className="alert alert-warning">
          <span className="text-sm"><strong>Adaptaciones PPD:</strong> {alumno.adaptaciones}</span>
        </div>
      )}

      {/* Botón template automático */}
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-primary">
          {isFormativa ? 'Plantilla Formativa DUOC' : 'Plantilla Sumativa DUOC'}
        </h2>
        <button type="button" className="btn btn-sm btn-outline btn-primary" onClick={aplicarTemplate}>
          Auto-completar con rúbrica
        </button>
      </div>

      {/* Formulario de retroalimentación */}
      <form onSubmit={formik.handleSubmit} className="space-y-4">

        {/* Momento 1: ¿Hacia dónde voy? */}
        <div className="card bg-blue-50 border-l-4 border-blue-600">
          <div className="card-body py-4">
            <h3 className="font-bold text-blue-700">¿Hacia dónde voy?</h3>
            <p className="text-xs text-blue-500 mb-2">
              {isFormativa
                ? 'Clarifica los objetivos de aprendizaje y el propósito de la actividad.'
                : 'Reafirma el propósito del aprendizaje evaluado y los criterios considerados.'}
            </p>
            <textarea name="haciaDondeVoy" rows={3}
              className="textarea textarea-bordered w-full bg-white text-sm"
              placeholder="Describe brevemente el objetivo de la tarea y su relación con el aprendizaje esperado."
              value={formik.values.haciaDondeVoy}
              onChange={formik.handleChange} />
          </div>
        </div>

        {/* Momento 2: ¿Cómo voy? */}
        <div className="card bg-green-50 border-l-4 border-green-600">
          <div className="card-body py-4">
            <h3 className="font-bold text-green-700">¿Cómo voy?</h3>
            <p className="text-xs text-green-600 mb-3">Describe el desempeño según los criterios de la rúbrica.</p>

            {isFormativa ? (
              <>
                <label className="label label-text text-xs font-bold">Fortalezas</label>
                <textarea name="fortalezas" rows={3}
                  className="textarea textarea-bordered w-full bg-white text-sm"
                  placeholder="Menciona uno o dos logros específicos que evidencien progreso o comprensión."
                  value={formik.values.fortalezas}
                  onChange={formik.handleChange} />
              </>
            ) : (
              <>
                <label className="label label-text text-xs font-bold">Aspectos logrados</label>
                <textarea name="aspectosLogrados" rows={3}
                  className="textarea textarea-bordered w-full bg-white text-sm"
                  placeholder="Menciona logros en relación con los criterios de evaluación."
                  value={formik.values.aspectosLogrados}
                  onChange={formik.handleChange} />
              </>
            )}

            <label className="label label-text text-xs font-bold mt-2">
              Aspectos por mejorar
              {calificacion.logros?.some(l => ['ML','LI','NL'].includes(l.nivel)) && (
                <span className="text-warning ml-1">(Requerido — hay criterios ML/LI/NL)</span>
              )}
            </label>
            <textarea name="porMejorar" rows={3}
              className="textarea textarea-bordered w-full bg-white text-sm"
              placeholder="Indica con claridad el área o habilidad que requiere refuerzo y ejemplos concretos."
              value={formik.values.porMejorar}
              onChange={formik.handleChange} />
          </div>
        </div>

        {/* Momento 3: ¿Cómo sigo? */}
        <div className="card bg-purple-50 border-l-4 border-purple-600">
          <div className="card-body py-4">
            <h3 className="font-bold text-purple-700">¿Cómo sigo?</h3>
            <p className="text-xs text-purple-500 mb-2">
              {isFormativa
                ? 'Orienta los próximos pasos para continuar aprendiendo.'
                : 'Orienta la mejora futura y fomenta la transferencia del aprendizaje.'}
            </p>
            <textarea name="comoSigo" rows={3}
              className="textarea textarea-bordered w-full bg-white text-sm"
              placeholder="Indica acciones concretas para aplicar en la siguiente actividad o revisión. Sugiere recursos o estrategias."
              value={formik.values.comoSigo}
              onChange={formik.handleChange} />
          </div>
        </div>

        <button type="submit" className={`btn w-full ${saved ? 'btn-success' : 'btn-primary'}`}
          disabled={formik.isSubmitting}>
          {formik.isSubmitting
            ? <span className="loading loading-spinner loading-sm" />
            : saved ? '✓ Retroalimentación guardada' : 'Guardar retroalimentación'}
        </button>
      </form>
    </div>
  )
}
