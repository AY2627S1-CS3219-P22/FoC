import { useEffect, useState } from 'react'
import { listSuppliers, type Supplier } from '../api/suppliers'
export function useSuppliers(query = '', category = 'All') {
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true); setError(''); setSuppliers([])
    const timer = window.setTimeout(() => {
      listSuppliers(query, category, controller.signal).then(rows => {
        if (!controller.signal.aborted) setSuppliers(rows)
      }).catch((err: Error) => {
        if (!controller.signal.aborted) setError(err.message)
      }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    }, 200)
    return () => { controller.abort(); window.clearTimeout(timer) }
  }, [query, category, revision])
  return { suppliers, loading, error, reload: () => setRevision(value => value + 1) }
}
