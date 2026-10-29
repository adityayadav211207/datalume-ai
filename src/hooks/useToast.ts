import { useCallback, useState } from 'react'

export function useToast() {
  const [notice, setNotice] = useState('')

  const showNotice = useCallback((text: string) => {
    setNotice(text)
    window.setTimeout(() => setNotice(''), 4200)
  }, [])

  return { notice, setNotice, showNotice }
}
