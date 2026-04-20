'use client'
import { useFormik } from 'formik'
import * as Yup from 'yup'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LoginPage() {
  const router = useRouter()

  const formik = useFormik({
    initialValues: { email: '', password: '' },
    validationSchema: Yup.object({
      email: Yup.string().email('Email inválido').required('Requerido'),
      password: Yup.string().required('Requerido'),
    }),
    onSubmit: async (values, { setStatus }) => {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      })
      const data = await res.json()
      if (!res.ok) return setStatus(data.error)
      Cookies.set('token', data.token, { expires: 1 / 3 }) // 8h
      router.push('/protected/dashboard')
    },
  })

  return (
    <div className="min-h-screen bg-base-200 flex items-center justify-center p-4">
      <div className="card w-full max-w-sm bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="text-center mb-4">
            <div className="inline-block bg-primary text-primary-content px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-3">
              DUOC UC
            </div>
            <h1 className="text-2xl font-bold text-primary">Retroalimentación</h1>
            <p className="text-sm text-gray-500 mt-1">Gestión Efectiva de Evaluaciones</p>
          </div>

          {formik.status && (
            <div className="alert alert-error text-sm py-2">{formik.status}</div>
          )}

          <form onSubmit={formik.handleSubmit} className="space-y-4">
            <div>
              <label className="label label-text text-xs">Email</label>
              <input
                name="email" type="email"
                className="input input-bordered input-sm w-full"
                placeholder="docente@duoc.cl"
                value={formik.values.email}
                onChange={formik.handleChange}
              />
              {formik.touched.email && formik.errors.email && (
                <p className="text-error text-xs mt-1">{formik.errors.email}</p>
              )}
            </div>
            <div>
              <label className="label label-text text-xs">Contraseña</label>
              <input
                name="password" type="password"
                className="input input-bordered input-sm w-full"
                value={formik.values.password}
                onChange={formik.handleChange}
              />
              {formik.touched.password && formik.errors.password && (
                <p className="text-error text-xs mt-1">{formik.errors.password}</p>
              )}
            </div>
            <button
              type="submit"
              className="btn btn-primary w-full btn-sm mt-2"
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? <span className="loading loading-spinner loading-xs" /> : 'Ingresar'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
