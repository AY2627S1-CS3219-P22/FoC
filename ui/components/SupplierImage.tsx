import { useState } from 'react'
import { supplierImageUrl } from '../lib/supplierImages'
export default function SupplierImage({ imageURL, name }: { imageURL?: string | null; name: string }) {
  const src = supplierImageUrl(imageURL)
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return <div className="mb-4 flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg bg-[#E8F1ED]">
    {src && src !== failedSource ? <img src={src} alt={name} loading="lazy" className="h-full w-full object-cover" onError={() => setFailedSource(src)} />
      : <span className="text-xs text-[#3F6B5A]">No image available</span>}
  </div>
}
