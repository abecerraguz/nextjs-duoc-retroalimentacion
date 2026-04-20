'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

function ModalEvaluacion({ evaluacion, secciones, onClose, onSaved }) {
  const isEdit = !!evaluacion?.id
  const [criterios, setCriterios] = useState(
    evaluacion?.criterios?.map(c => c.descripcion) ?? ['']
  )

  const formik = useFormik({
    initialValues: {
      nombre: evaluacion?.nombre ?? '',
      tipo: evaluacion?.tipo ?? 'FORMATIVA',
      semana: evaluacion?.semana ?? 1,
      ponderacion: evaluacion?.ponderacion ?? 0,
      seccionId: evaluacion?.seccionId ?? '',
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('Requerido'),
      seccionId: Yup.string().required('Selecciona sección'),
      semana: Yup.number().min(1).required('Requerido'),
    }),
    onSubmit: async (values) => {
      const payload = { ...values, semana: +values.semana, ponderacion: +values.ponderacion, criterios: criterios.filter(Boolean) }
      const url = isEdit ? `/api/evaluaciones/${evaluacion.id}` : '/api/evaluaciones'
      await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      onSaved()
      onClose()
    },
  })

  const addCriterio = () => setCriterios([...criterios, ''])
  const removeCriterio = (i) => setCriterios(criterios.filter((_, idx) => idx !== i))
  const updateCriterio = (i, val) => setCriterios(criterios.map((c, idx) => idx === i ? val : c))

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-2xl">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        <h3 className="font-bold text-lg text-primary border-b pb-2 mb-4">
          {isEdit ? 'Editar evaluación' : 'Nueva evaluación'}
        </h3>
        <form onSubmit={formik.handleSubmit} className="space-y-3">
          <div>
            <label className="label label-text text-xs">Nombre de la actividad</label>
            <input name="nombre" className="input input-bordered input-sm w-full"
              placeholder="Experiencia 1 – Semana 1: Aspectos básicos de PHP"
              value={formik.values.nombre} onChange={formik.handleChange} />
            {formik.touched.nombre && formik.errors.nombre && <p className="text-error text-xs">{formik.errors.nombre}</p>}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="label label-text text-xs">Tipo</label>
              <select name="tipo" className="select select-bordered select-sm w-full"
                value={formik.values.tipo} onChange={formik.handleChange}>
                <option value="FORMATIVA">Formativa (1–10)</option>
                <option value="SUMATIVA">Sumativa (1–7, %)</option>
              </select>
            </div>
            <div>
              <label className="label label-text text-xs">Semana</label>
              <input name="semana" type="number" min="1" className="input input-bordered input-sm w-full"
                value={formik.values.semana} onChange={formik.handleChange} />
            </div>
            {formik.values.tipo === 'SUMATIVA' && (
              <div>
                <label className="label label-text text-xs">Ponderación (%)</label>
                <input name="ponderacion" type="number" min="0" max="100"
                  className="input input-bordered input-sm w-full"
                  value={formik.values.ponderacion} onChange={formik.handleChange} />
              </div>
            )}
          </div>

          <div>
            <label className="label label-text text-xs">Sección</label>
            <select name="seccionId" className="select select-bordered select-sm w-full"
              value={formik.values.seccionId} onChange={formik.handleChange}>
              <option value="">Selecciona sección</option>
              {(secciones ?? []).map(s => (
                <option key={s.id} value={s.id}>{s.codigo} — {s.asignatura} ({s.semestre})</option>
              ))}
            </select>
            {formik.touched.seccionId && formik.errors.seccionId && <p className="text-error text-xs">{formik.errors.seccionId}</p>}
          </div>

          <div className="divider text-xs">Criterios de la rúbrica</div>
          <p className="text-xs text-gray-500">Escala: CL (100%) · L (80%) · ML (60%) · LI (30%) · NL (0%)</p>

          <div className="space-y-2">
            {criterios.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <span className="text-xs font-bold w-5 text-gray-400">{i + 1}.</span>
                <input
                  className="input input-bordered input-sm flex-1"
                  placeholder={`Criterio ${i + 1}: ej. Utiliza correctamente variables, arrays y bucles...`}
                  value={c}
                  onChange={e => updateCriterio(i, e.target.value)}
                />
                {criterios.length > 1 && (
                  <button type="button" className="btn btn-xs btn-ghost btn-square text-error"
                    onClick={() => removeCriterio(i)}>✕</button>
                )}
              </div>
            ))}
            <button type="button" className="btn btn-xs btn-outline btn-primary mt-1" onClick={addCriterio}>
              + Agregar criterio
            </button>
          </div>

          <button type="submit" className="btn btn-primary btn-sm w-full mt-4"
            disabled={formik.isSubmitting}>
            {formik.isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Guardar'}
          </button>
        </form>
      </div>
      <form method="dialog" className="modal-backdrop"><button onClick={onClose} /></form>
    </dialog>
  )
}

export default function EvaluacionesPage() {
  const { data: evaluaciones, mutate, isLoading } = useSWR('/api/evaluaciones', fetcher)
  const { data: secciones } = useSWR('/api/secciones', fetcher)
  const [modal, setModal] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar evaluación y todas sus calificaciones?')) return
    await fetch(`/api/evaluaciones/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">Evaluaciones</h1>
          <p className="text-sm text-gray-500">Gestión de rúbricas formativas y sumativas</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ Nueva evaluación</button>
      </div>

      {isLoading && <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary" /></div>}

      <div className="overflow-x-auto rounded-xl">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-base-300 text-xs uppercase tracking-wider">
              <th>Nombre</th><th>Tipo</th><th>Semana</th><th>Sección</th><th>Criterios</th><th>Pond.</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {(evaluaciones ?? []).map(e => (
              <tr key={e.id} className="hover:bg-base-200">
                <td className="font-medium max-w-xs truncate">{e.nombre}</td>
                <td>
                  <span className={`badge badge-sm ${e.tipo === 'FORMATIVA' ? 'badge-info' : 'badge-secondary'}`}>
                    {e.tipo === 'FORMATIVA' ? 'Formativa' : 'Sumativa'}
                  </span>
                </td>
                <td>Semana {e.semana}</td>
                <td><span className="font-mono text-xs">{e.seccion?.codigo}</span></td>
                <td>{e.criterios?.length ?? 0} criterios</td>
                <td>{e.tipo === 'SUMATIVA' ? `${e.ponderacion}%` : '—'}</td>
                <td>
                  <div className="flex gap-1">
                    <Link href={`/protected/calificar/${e.id}`} className="btn btn-xs btn-outline btn-success">Calificar</Link>
                    <button className="btn btn-xs btn-outline btn-warning" onClick={() => setModal(e)}>Editar</button>
                    <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDelete(e.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalEvaluacion evaluacion={modal} secciones={secciones} onClose={() => setModal(null)} onSaved={mutate} />
      )}
    </div>
  )
}
