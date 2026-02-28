'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

interface Props {
  targetId:  string
  filename?: string
}

export function PDFDownloadButton({ targetId, filename = 'report' }: Props) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    const el = document.getElementById(targetId)
    if (!el) return

    setLoading(true)
    try {
      const [{ toPng }, { default: jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ])

      const dataUrl = await toPng(el, {
        pixelRatio:      2,
        backgroundColor: '#ffffff',
      })

      const img    = new Image()
      img.src      = dataUrl
      await new Promise<void>((resolve) => { img.onload = () => resolve() })

      const pdf    = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW  = pdf.internal.pageSize.getWidth()
      const pageH  = pdf.internal.pageSize.getHeight()
      const margin = 10
      const imgW   = pageW - margin * 2
      const imgH   = (img.naturalHeight * imgW) / img.naturalWidth

      const usableH = pageH - margin * 2
      let remaining = imgH
      let srcYpx    = 0

      while (remaining > 0) {
        const sliceH  = Math.min(remaining, usableH)
        const srcHpx  = (sliceH / imgH) * img.naturalHeight

        // スライス用の一時キャンバス
        const tmpCanvas       = document.createElement('canvas')
        tmpCanvas.width       = img.naturalWidth
        tmpCanvas.height      = Math.ceil(srcHpx)
        const ctx             = tmpCanvas.getContext('2d')!
        ctx.fillStyle         = '#ffffff'
        ctx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height)
        ctx.drawImage(img, 0, srcYpx, img.naturalWidth, srcHpx, 0, 0, img.naturalWidth, srcHpx)

        pdf.addImage(tmpCanvas.toDataURL('image/png'), 'PNG', margin, margin, imgW, sliceH)

        remaining -= sliceH
        srcYpx    += srcHpx
        if (remaining > 0) pdf.addPage()
      }

      pdf.save(`${filename}.pdf`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleDownload}
      disabled={loading}
      className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 shadow-sm transition-all duration-200 hover:border-gray-400 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {loading ? 'PDF生成中...' : 'PDFダウンロード'}
    </button>
  )
}
