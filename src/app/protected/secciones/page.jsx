'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useFormik } from 'formik'
import * as Yup from 'yup'

const fetcher = url => fetch(url).then(r => r.json())

function ModalSeccion({ seccion, onClose, onSaved }) {
  const isEdit = !!seccion?.id
  const formik = useFormik({
    initialValues: {
      codigo: seccion?.codigo ?? '',
      asignatura: seccion?.asignatura ?? '',
      semestre: seccion?.semestre ?? '',
      activa: seccion?.activa ?? true,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      codigo: Yup.string().required('Requerido'),
      asignatura: Yup.string().required('Requerido'),
      semestre: Yup.string().required('Requerido'),
    }),
    onSubmit: async (values) => {
      const url = isEdit ? `/api/secciones/${seccion.id}` : '/api/secciones'
      await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      onSaved()
      onClose()
    },
  })

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-md">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        <h3 className="font-bold text-lg text-primary border-b pb-2 mb-4">
          {isEdit ? 'Editar sección' : 'Nueva sección'}
        </h3>
        <form onSubmit={formik.handleSubmit} className="space-y-3">
          {[
            { name: 'codigo', label: 'Código', placeholder: 'IFD2201-001' },
            { name: 'asignatura', label: 'Asignatura', placeholder: 'Lenguajes de Programación' },
            { name: 'semestre', label: 'Semestre', placeholder: '2026-1' },
          ].map(f => (
            <div key={f.name}>
              <label className="label label-text text-xs">{f.label}</label>
              <input name={f.name} className="input input-bordered input-sm w-full"
                placeholder={f.placeholder}
                value={formik.values[f.name]} onChange={formik.handleChange} />
              {formik.touched[f.name] && formik.errors[f.name] && (
                <p className="text-error text-xs">{formik.errors[f.name]}</p>
              )}
            </div>
          ))}
          <label className="flex items-center gap-2 cursor-pointer mt-2">
            <input type="checkbox" name="activa" className="toggle toggle-primary toggle-sm"
              checked={formik.values.activa} onChange={formik.handleChange} />
            <span className="text-sm">Sección activa</span>
          </label>
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

export default function SeccionesPage() {
  const { data: secciones, mutate, isLoading } = useSWR('/api/secciones', fetcher)
  const [modal, setModal] = useState(null)

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar sección y todos sus datos?')) return
    await fetch(`/api/secciones/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">Secciones</h1>
          <p className="text-sm text-gray-500">Administra tus secciones por semestre</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ Nueva sección</button>
      </div>

      {isLoading && <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary" /></div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {(secciones ?? []).map(s => (
          <div key={s.id} className="card bg-base-100 shadow-sm border border-base-300">
            <div className="card-body py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-primary font-mono">{s.codigo}</h3>
                  <p className="text-sm font-medium">{s.asignatura}</p>
                  <p className="text-xs text-gray-400">{s.semestre}</p>
                </div>
                <span className={`badge badge-sm ${s.activa ? 'badge-success' : 'badge-ghost'}`}>
                  {s.activa ? 'Activa' : 'Inactiva'}
                </span>
              </div>
              <div className="flex gap-3 text-xs text-gray-500 mt-2">
                <span>{s._count?.alumnos ?? 0} alumnos</span>
                <span>{s._count?.evaluaciones ?? 0} evaluaciones</span>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn btn-xs btn-outline btn-primary" onClick={() => setModal(s)}>Editar</button>
                <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDelete(s.id)}>Eliminar</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {modal !== null && (
        <ModalSeccion seccion={modal} onClose={() => setModal(null)} onSaved={mutate} />
      )}
    </div>
  )
}
