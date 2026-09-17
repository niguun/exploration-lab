'use client'

import { useMemo } from 'react'
import katex from 'katex'

interface MathProps {
  tex: string
  display?: boolean
  className?: string
  style?: React.CSSProperties
}

export default function Tex({ tex, display = false, className, style }: MathProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: display,
        throwOnError: false,
        trust: true,
      })
    } catch {
      return tex
    }
  }, [tex, display])

  return (
    <span
      className={className}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
