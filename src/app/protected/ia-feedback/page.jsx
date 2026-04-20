'use client'
import { useState, useRef, useCallback } from 'react'
import useSWR from 'swr'

const fetcher = url => fetch(url).then(r => r.json())
const NIVEL_COLOR = { CL: 'badge-success', L: 'badge-info', ML: 'badge-warning', LI: 'badge-error', NL: 'badge-neutral' }

function DropZone({ onFile, file }) {
  const inputRef = useRef(null)
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f?.name.endsWith('.zip')) onFile(f)
  }, [onFile])
  return (
    <div onDrop={handleDrop} onDragOver={e => e.preventDefault()} onClick={() => inputRef.current.click()}
      className={`border-2 border-dashed rounded-xl cursor-pointer transition-all p-6 text-center
        ${file ? 'border-success bg-success/5' : 'border-base-300 hover:border-primary bg-base-200'}`}>
      <input ref={inputRef} type="file" accept=".zip" className="hidden"
        onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
      {file ? (
        <><p className="text-2xl">📦</p><p className="font-bold text-success mt-1 text-sm">{file.name}</p>
        <p className="text-xs text-gray-400">{(file.size/1024/1024).toFixed(1)} MB — clic para cambiar</p></>
      ) : (
        <><p className="text-3xl">🗜️</p><p className="font-medium text-sm mt-2">Arrastra el ZIP o haz clic</p>
        <p className="text-xs text-gray-400 mt-0.5">Solo archivos .zip</p></>
      )}
    </div>
  )
}

function StepForm({ onAnalizar }) {
  const { data: evaluaciones } = useSWR('/api/evaluaciones', fetcher)
  const [evalId, setEvalId] = useState('')
  const [zipFile, setZipFile] = useState(null)
  const [ruta, setRuta] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const evalSel = (evaluaciones ?? []).find(e => e.id === evalId)
  const canAnalizar = evalId && zipFile && ruta.trim()

  const handleAnalizar = async () => {
    setError(null)
    setLoading(true)
    const fd = new FormData()
    fd.append('zip', zipFile)
    fd.append('evalId', evalId)
    fd.append('ruta', ruta)
    try {
      const res = await fetch('/api/ia-feedback-integrado/preview', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error); setLoading(false); return }
      onAnalizar({ ...data, zipFile, ruta, context })
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  return (
    <div className="space-y-5 max-w-3xl">
      <div>
        <label className="label label-text font-bold text-sm">1. Selecciona la evaluación</label>
        <select className="select select-bordered w-full" value={evalId} onChange={e => setEvalId(e.target.value)}>
          <option value="">— Selecciona evaluación —</option>
          {(evaluaciones ?? []).map(e => (
            <option key={e.id} value={e.id}>
              {e.seccion?.codigo} · {e.tipo === 'FORMATIVA' ? 'Formativa' : 'Sumativa'} — {e.nombre} (Sem. {e.semana})
            </option>
          ))}
        </select>
        {evalSel && (
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className={`badge badge-sm ${evalSel.tipo === 'FORMATIVA' ? 'badge-info' : 'badge-secondary'}`}>
              {evalSel.tipo === 'FORMATIVA' ? 'Formativa 1-10' : `Sumativa 1-7 (${evalSel.ponderacion}%)`}
            </span>
            <span className="badge badge-sm badge-ghost">{evalSel.criterios?.length ?? 0} criterios en rúbrica</span>
          </div>
        )}
      </div>
      <div>
        <label className="label label-text font-bold text-sm">2. Archivo ZIP con entregas</label>
        <DropZone onFile={setZipFile} file={zipFile} />
      </div>
      <div>
        <label className="label label-text font-bold text-sm">3. Ruta hacia carpetas de alumnos (dentro del ZIP)</label>
        <input type="text" className="input input-bordered w-full font-mono text-sm"
          placeholder="ej: lenguajes-001A-FINAL/EVALUACIONES/FORMATIVAS/FORMATIVA-04"
          value={ruta} onChange={e => setRuta(e.target.value)} />
        <p className="text-xs text-gray-400 mt-1">Cada subcarpeta inmediata dentro de esta ruta = un alumno.</p>
      </div>
      <div>
        <label className="label">
          <span className="label-text font-bold text-sm">4. Contexto adicional para Claude (opcional)</span>
          <span className="label-text-alt text-gray-400">Indicaciones especiales, énfasis, etc.</span>
        </label>
        <textarea className="textarea textarea-bordered w-full text-sm" rows={3}
          placeholder="Ej: Los alumnos debían usar solo HTML+CSS puro, sin frameworks..."
          value={context} onChange={e => setContext(e.target.value)} />
      </div>
      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
      <button className="btn btn-primary btn-lg w-full" disabled={!canAnalizar || loading} onClick={handleAnalizar}>
        {loading
          ? <><span className="loading loading-spinner loading-sm" /> Analizando ZIP...</>
          : '🔍 Analizar ZIP y detectar alumnos'}
      </button>
    </div>
  )
}

function StepConfirm({ previewData, onConfirmar, onVolver }) {
  const { evaluacion, alumnos, mapping, zipFile, ruta, context } = previewData
  const [rows, setRows] = useState(
    mapping.map(m => ({
      folderName: m.folderName,
      alumnoId: m.alumno?.id ?? '',
      score: m.score,
      confident: m.confident,
    }))
  )
  const setAlumno = (i, v) => setRows(rows.map((r, idx) => idx === i ? { ...r, alumnoId: v } : r))
  const activos = rows.filter(r => r.alumnoId).length
  const sinMapear = rows.filter(r => !r.alumnoId).length

  return (
    <div className="space-y-4 max-w-4xl">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body py-4">
          <h3 className="font-bold text-primary">{evaluacion.nombre}</h3>
          <p className="text-sm text-gray-500">{evaluacion.seccion?.codigo} · {evaluacion.criterios.length} criterios</p>
          <div className="flex gap-2 mt-2 flex-wrap">
            <span className="badge badge-ghost">{rows.length} carpetas detectadas</span>
            <span className="badge badge-success">{activos} para generar</span>
            {sinMapear > 0 && <span className="badge badge-warning">{sinMapear} sin mapear (serán ignoradas)</span>}
          </div>
        </div>
      </div>
      <p className="text-sm text-gray-500">
        Verifica que cada carpeta del ZIP corresponde al alumno correcto. Puedes corregir el mapeo con el selector.
      </p>
      <div className="overflow-x-auto rounded-xl border border-base-300">
        <table className="table table-sm w-full bg-white">
          <thead>
            <tr className="bg-base-300 text-xs uppercase">
              <th>Carpeta en ZIP</th>
              <th>Alumno en sistema</th>
              <th>Confianza</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={row.folderName} className={!row.alumnoId ? 'opacity-40' : ''}>
                <td>
                  <span className="font-mono text-xs bg-base-200 px-2 py-1 rounded">{row.folderName}</span>
                </td>
                <td>
                  <select className="select select-bordered select-xs w-full max-w-xs"
                    value={row.alumnoId} onChange={e => setAlumno(i, e.target.value)}>
                    <option value="">— No mapear —</option>
                    {alumnos.map(a => (
                      <option key={a.id} value={a.id}>{a.apellido}, {a.nombre}{a.esPPD ? ' ⚠ PPD' : ''}</option>
                    ))}
                  </select>
                </td>
                <td>
                  {row.alumnoId
                    ? <span className={`badge badge-xs ${row.confident ? 'badge-success' : 'badge-warning'}`}>{row.score}%</span>
                    : <span className="badge badge-xs badge-ghost">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex gap-3">
        <button className="btn btn-ghost btn-sm" onClick={onVolver}>← Volver</button>
        <button
          className="btn btn-primary flex-1"
          disabled={activos === 0}
          onClick={() => onConfirmar({
            evaluacion,
            confirmed: rows.map(r => ({ folderName: r.folderName, alumnoId: r.alumnoId || null })),
            zipFile,
            ruta,
            context,
          })}>
          🤖 Generar retroalimentación para {activos} alumno(s) con Claude AI
        </button>
      </div>
    </div>
  )
}

function StepProcessing({ data }) {
  const { evaluacion, confirmed, zipFile, ruta, context } = data
  const activeItems = confirmed.filter(m => m.alumnoId)
  const total = activeItems.length
  const [students, setStudents] = useState(
    activeItems.map(m => ({ folderName: m.folderName, status: 'pending', nota: null, logros: null, error: null, alumnoNombre: '' }))
  )
  const [done, setDone] = useState(0)
  const [zipResult, setZipResult] = useState(null)
  const [error, setError] = useState(null)
  const [ran, setRan] = useState(false)

  if (!ran) {
    setRan(true)
    const run = async () => {
      const fd = new FormData()
      fd.append('zip', zipFile)
      fd.append('evalId', evaluacion.id)
      fd.append('ruta', ruta)
      fd.append('mapping', JSON.stringify(confirmed))
      fd.append('context', context ?? '')
      try {
        const res = await fetch('/api/ia-feedback-integrado', { method: 'POST', body: fd })
        if (!res.ok) { const e = await res.json(); setError(e.error); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        while (true) {
          const { done: d, value } = await reader.read()
          if (d) break
          buf += decoder.decode(value, { stream: true })
          const parts = buf.split('\n\n')
          buf = parts.pop() ?? ''
          for (const part of parts) {
            if (!part.startsWith('data: ')) continue
            try {
              const ev = JSON.parse(part.slice(6))
              if (ev.type === 'processing') {
                setStudents(p => p.map(s => s.folderName === ev.folderName ? { ...s, status: 'processing', alumnoNombre: ev.alumnoNombre } : s))
              } else if (ev.type === 'done') {
                setDone(ev.progress)
                setStudents(p => p.map(s => s.folderName === ev.folderName ? { ...s, status: 'done', nota: ev.nota, logros: ev.logros, alumnoNombre: ev.alumnoNombre } : s))
              } else if (ev.type === 'error') {
                setDone(ev.progress)
                setStudents(p => p.map(s => s.folderName === ev.folderName ? { ...s, status: 'error', error: ev.error, alumnoNombre: ev.alumnoNombre } : s))
              } else if (ev.type === 'complete') {
                setZipResult({ base64: ev.zipBase64, fileName: ev.fileName })
              } else if (ev.type === 'fatal_error') {
                setError(ev.message)
              }
            } catch {}
          }
        }
      } catch (err) { setError(err.message) }
    }
    run()
  }

  const pct = total > 0 ? Math.round((done / total) * 100) : 0
  const isDone = !!zipResult
  const doneCount = students.filter(s => s.status === 'done').length
  const errorCount = students.filter(s => s.status === 'error').length

  const download = () => {
    const a = document.createElement('a')
    a.href = 'data:application/zip;base64,' + zipResult.base64
    a.download = zipResult.fileName
    a.click()
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="card bg-base-100 border border-base-300 shadow-sm">
        <div className="card-body py-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold text-sm">
              {isDone ? '✅ Retroalimentación guardada en el sistema' : '⚙️ Generando con Claude AI...'}
            </span>
            <span className="font-bold text-xl text-primary">{pct}%</span>
          </div>
          <progress className={`progress w-full ${isDone ? 'progress-success' : 'progress-primary'}`} value={done} max={total} />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>{done}/{total} alumnos procesados</span>
            <span className="flex gap-3">
              {doneCount > 0 && <span className="text-success">✓ {doneCount} guardados en DB</span>}
              {errorCount > 0 && <span className="text-error">✕ {errorCount} con error</span>}
            </span>
          </div>
        </div>
      </div>
      {error && <div className="alert alert-error text-sm"><span>{error}</span></div>}
      {isDone && (
        <div className="space-y-3">
          <button className="btn btn-success btn-lg w-full gap-2 shadow" onClick={download}>
            ⬇️ Descargar ZIP con feedback.md por alumno
          </button>
          <div className="alert alert-success text-sm">
            <span>
              ✅ Las calificaciones, niveles por criterio y retroalimentaciones quedaron guardadas.
              Visítalas en la <strong>Ficha</strong> de cada alumno.
            </span>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {students.map(s => (
          <div key={s.folderName}
            className={`card border transition-all ${s.status === 'processing' ? 'border-warning shadow' : 'border-base-300'}`}>
            <div className="card-body py-3 px-4">
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {s.status === 'pending' ? '⏳' : s.status === 'processing' ? '⚙️' : s.status === 'done' ? '✅' : '❌'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{s.alumnoNombre || s.folderName}</p>
                  <p className="text-xs font-mono text-gray-400">{s.folderName}</p>
                  {s.error && <p className="text-xs text-error mt-0.5">{s.error}</p>}
                </div>
                {s.status === 'processing' && <span className="loading loading-dots loading-xs text-warning" />}
                {s.nota != null && (
                  <div className="text-right">
                    <span className="font-bold text-lg text-primary">{s.nota}</span>
                    <p className="text-xs text-gray-400">nota</p>
                  </div>
                )}
              </div>
              {s.logros?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {s.logros.map((l, i) => (
                    <span key={i} className={`badge badge-xs ${NIVEL_COLOR[l.nivel]}`}>C{i + 1}: {l.nivel}</span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function IAFeedbackPage() {
  const [step, setStep] = useState('form')
  const [previewData, setPreviewData] = useState(null)
  const [genData, setGenData] = useState(null)
  const stepIdx = ['form', 'confirm', 'processing'].indexOf(step)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-primary uppercase tracking-wide">IA Feedback</h1>
            <span className="badge badge-secondary font-bold">Claude AI</span>
            <span className="badge badge-success badge-sm">Integrado con DB</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Califica, asigna niveles por criterio y genera retroalimentación DUOC en un solo paso
          </p>
        </div>
        {step !== 'form' && (
          <button className="btn btn-ghost btn-sm"
            onClick={() => { setStep('form'); setPreviewData(null); setGenData(null) }}>
            ← Nueva generación
          </button>
        )}
      </div>
      <ul className="steps steps-horizontal w-full max-w-lg text-xs">
        <li className={`step ${stepIdx >= 0 ? 'step-primary' : ''}`}>Seleccionar</li>
        <li className={`step ${stepIdx >= 1 ? 'step-primary' : ''}`}>Confirmar alumnos</li>
        <li className={`step ${stepIdx >= 2 ? 'step-primary' : ''}`}>Generar y guardar</li>
      </ul>
      {step === 'form' && (
        <StepForm onAnalizar={d => { setPreviewData(d); setStep('confirm') }} />
      )}
      {step === 'confirm' && previewData && (
        <StepConfirm
          previewData={previewData}
          onVolver={() => setStep('form')}
          onConfirmar={d => { setGenData(d); setStep('processing') }}
        />
      )}
      {step === 'processing' && genData && (
        <StepProcessing data={genData} />
      )}
    </div>
  )
}
