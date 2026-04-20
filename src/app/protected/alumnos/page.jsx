'use client'
import { useState } from 'react'
import useSWR from 'swr'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import Link from 'next/link'

const fetcher = url => fetch(url).then(r => r.json())

function ModalAlumno({ alumno, secciones, onClose, onSaved }) {
  const isEdit = !!alumno?.id
  const formik = useFormik({
    initialValues: {
      nombre: alumno?.nombre ?? '',
      apellido: alumno?.apellido ?? '',
      email: alumno?.email ?? '',
      seccionId: alumno?.seccionId ?? '',
      esPPD: alumno?.esPPD ?? false,
      adaptaciones: alumno?.adaptaciones ?? '',
      umbralAlerta: alumno?.umbralAlerta ?? 4.0,
    },
    enableReinitialize: true,
    validationSchema: Yup.object({
      nombre: Yup.string().required('Requerido'),
      apellido: Yup.string().required('Requerido'),
      seccionId: Yup.string().required('Selecciona una sección'),
    }),
    onSubmit: async (values) => {
      const url = isEdit ? `/api/alumnos/${alumno.id}` : '/api/alumnos'
      await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...values, umbralAlerta: +values.umbralAlerta }),
      })
      onSaved()
      onClose()
    },
  })

  return (
    <dialog className="modal" open>
      <div className="modal-box max-w-lg">
        <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2" onClick={onClose}>✕</button>
        <h3 className="font-bold text-lg text-primary border-b pb-2 mb-4">
          {isEdit ? 'Editar alumno' : 'Nuevo alumno'}
        </h3>
        <form onSubmit={formik.handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {[
              { name: 'nombre', label: 'Nombre', ph: 'Juan' },
              { name: 'apellido', label: 'Apellido', ph: 'González' },
            ].map(f => (
              <div key={f.name}>
                <label className="label label-text text-xs">{f.label}</label>
                <input name={f.name} className="input input-bordered input-sm w-full"
                  placeholder={f.ph}
                  value={formik.values[f.name]} onChange={formik.handleChange} />
                {formik.touched[f.name] && formik.errors[f.name] &&
                  <p className="text-error text-xs">{formik.errors[f.name]}</p>}
              </div>
            ))}
          </div>

          <div>
            <label className="label label-text text-xs">Email (opcional)</label>
            <input name="email" type="email" className="input input-bordered input-sm w-full"
              placeholder="alumno@duoc.cl"
              value={formik.values.email} onChange={formik.handleChange} />
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
            {formik.touched.seccionId && formik.errors.seccionId &&
              <p className="text-error text-xs">{formik.errors.seccionId}</p>}
          </div>

          <div className="divider text-xs">Programa con dificultad (PPD)</div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="esPPD" className="toggle toggle-warning toggle-sm"
              checked={formik.values.esPPD} onChange={formik.handleChange} />
            <span className="text-sm">Alumno en programa PPD</span>
          </label>

          {formik.values.esPPD && (
            <>
              <div>
                <label className="label label-text text-xs">Adaptaciones curriculares</label>
                <textarea name="adaptaciones" rows={3}
                  className="textarea textarea-bordered textarea-sm w-full"
                  placeholder="Describe las adaptaciones necesarias..."
                  value={formik.values.adaptaciones} onChange={formik.handleChange} />
              </div>
              <div>
                <label className="label label-text text-xs">Umbral de alerta (nota mínima antes de alertar)</label>
                <input name="umbralAlerta" type="number" step="0.1" min="1" max="7"
                  className="input input-bordered input-sm w-full"
                  value={formik.values.umbralAlerta} onChange={formik.handleChange} />
              </div>
            </>
          )}

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

export default function AlumnosPage() {
  const { data: alumnos, mutate, isLoading } = useSWR('/api/alumnos', fetcher)
  const { data: secciones } = useSWR('/api/secciones', fetcher)
  const [modal, setModal] = useState(null)
  const [search, setSearch] = useState('')
  const [soloRiesgo, setSoloRiesgo] = useState(false)
  const [soloPPD, setSoloPPD] = useState(false)

  const filtered = (alumnos ?? []).filter(a => {
    const q = search.toLowerCase()
    const matchQ = !q || `${a.nombre} ${a.apellido} ${a.email ?? ''}`.toLowerCase().includes(q)
    const matchPPD = !soloPPD || a.esPPD
    return matchQ && matchPPD
  })

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar alumno y todas sus calificaciones?')) return
    await fetch(`/api/alumnos/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="p-6 space-y-5">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">Alumnos</h1>
          <p className="text-sm text-gray-500">Gestión de alumnos y programa PPD</p>
        </div>
        <button className="btn btn-primary btn-sm" onClick={() => setModal({})}>+ Nuevo alumno</button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input type="text" placeholder="Buscar por nombre o email..."
          className="input input-bordered input-sm w-64"
          value={search} onChange={e => setSearch(e.target.value)} />
        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" className="toggle toggle-warning toggle-sm"
            checked={soloPPD} onChange={e => setSoloPPD(e.target.checked)} />
          Solo PPD
        </label>
      </div>

      {isLoading && <div className="flex justify-center py-10"><span className="loading loading-spinner loading-lg text-primary" /></div>}

      <div className="overflow-x-auto rounded-xl">
        <table className="table table-sm w-full">
          <thead>
            <tr className="bg-base-300 text-xs uppercase tracking-wider">
              <th>Alumno</th><th>Sección</th><th>Email</th><th>PPD</th><th>Estado</th><th>Acciones</th>
            </tr>
          </thead>
          <tbody className="bg-white">
            {filtered.map(a => (
              <tr key={a.id} className={`hover:bg-base-200 ${a.esPPD ? 'border-l-4 border-warning' : ''}`}>
                <td>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{a.apellido}, {a.nombre}</span>
                    {a.esPPD && <span className="badge badge-warning badge-xs">PPD</span>}
                  </div>
                </td>
                <td>
                  <span className="font-mono text-xs">{a.seccion?.codigo}</span>
                  <span className="text-xs text-gray-400 ml-1">({a.seccion?.semestre})</span>
                </td>
                <td className="text-xs text-gray-500">{a.email ?? '—'}</td>
                <td>
                  {a.esPPD
                    ? <span className="badge badge-warning badge-sm">Sí</span>
                    : <span className="badge badge-ghost badge-sm">No</span>}
                </td>
                <td>
                  <span className={`badge badge-sm ${a.activo ? 'badge-success' : 'badge-error'}`}>
                    {a.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div className="flex gap-1">
                    <Link href={`/protected/ficha/${a.id}`} className="btn btn-xs btn-outline btn-primary">Ficha</Link>
                    <button className="btn btn-xs btn-outline btn-warning" onClick={() => setModal(a)}>Editar</button>
                    <button className="btn btn-xs btn-outline btn-error" onClick={() => handleDelete(a.id)}>Eliminar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal !== null && (
        <ModalAlumno alumno={modal} secciones={secciones} onClose={() => setModal(null)} onSaved={mutate} />
      )}
    </div>
  )
}
