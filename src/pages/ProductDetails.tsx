import React, { useEffect, useMemo, useState } from 'react'
import products from '../data/products.json'
import { Link, useNavigate, useParams } from 'react-router-dom'
import VideoPreviewTF from '../components/VideoPreviewTF'
import { resolvePublicUrl } from '../utils/asset'
import arConfig from '../config/ar.json'

type ImageSet = { big: string; middle: string; thumbnail: string }
type Variant = {
  id: string
  name: string
  price: number
  image: string
  images?: ImageSet[]
  color?: { name: string; hex: string }
}
type Product = Variant & {
  description: string
  category: string[]
  products?: Variant[]
}

export default function ProductDetails() {
  const { id } = useParams()
  const items = products as Product[]
  const routeId = String(id)
  const navigate = useNavigate()

  const { parent, initialVariant } = useMemo(() => {
    const direct = items.find(p => p.id === routeId)
    if (direct) {
      return { parent: direct, initialVariant: undefined as Variant | undefined }
    }
    for (const p of items) {
      const v = p.products?.find(vv => vv.id === routeId)
      if (v) return { parent: p, initialVariant: v }
    }
    return { parent: undefined, initialVariant: undefined }
  }, [items, routeId])

  const [activeImageIdx, setActiveImageIdx] = useState(0)

  if (!parent) {
    return (
      <div className="container">
        <p>Product not found.</p>
        <Link to="/products" className="backLink">Back to products</Link>
      </div>
    )
  }

  const currentVariant: Variant = useMemo(() => {
    if (parent.products && parent.products.length > 0) {
      const found = parent.products.find(v => v.id === routeId)
      return found || parent.products[0]
    }
    return parent
  }, [parent, routeId])

  useEffect(() => {
    setActiveImageIdx(0)
  }, [routeId])

  // AR / webcam preview
  const [showCam, setShowCam] = useState(false)

  useEffect(() => {
    // Stop camera when navigating between variants
    setShowCam(false)
  }, [routeId])

  return (
    <div className="container">
      <Link to="/products" className="backLink">← Back to products</Link>
      <div className="details">
        <div>
          {!showCam && (
            <img className="detailsImage" src={resolvePublicUrl(currentVariant.images?.[activeImageIdx]?.big || currentVariant.image)} alt={currentVariant.name} />
          )}
          <VideoPreviewTF
            isActive={showCam}
            className="detailsImage videoPreview"
            product={{ category: parent.category, color: parent.color }}
            variant={{ color: currentVariant.color }}
          />
          {currentVariant.images && currentVariant.images.length > 0 && (
            <div className="thumbs">
              {currentVariant.images.map((img, idx) => (
                <button
                  key={idx}
                  className={`thumb ${idx === activeImageIdx ? 'thumbActive' : ''}`}
                  onClick={() => { setShowCam(false); setActiveImageIdx(idx) }}
                  aria-label={`Show image ${idx + 1}`}
                >
                  <img src={resolvePublicUrl(img.thumbnail)} alt={`thumb ${idx + 1}`} />
                </button>
              ))}
              {(() => {
                const cat = Array.isArray(parent.category) ? parent.category[parent.category.length - 1] : parent.category as any
                const cfg: any = arConfig as any
                const isAR = !!(cfg && cat && cfg[cat] && cfg[cat].ar)
                return (parent.products && parent.products.length > 0 && isAR)
              })() && (
                <button
                  className={`thumb ${showCam ? 'thumbActive' : ''}`}
                  onClick={() => setShowCam(prev => !prev)}
                  aria-label="Toggle camera preview"
                  title={showCam ? 'Hide camera' : 'Show camera'}
                >
                  <div className="camIcon" aria-hidden>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M3 7.5C3 6.11929 4.11929 5 5.5 5H12.5C13.8807 5 15 6.11929 15 7.5V16.5C15 17.8807 13.8807 19 12.5 19H5.5C4.11929 19 3 17.8807 3 16.5V7.5Z" fill="#9fb4ff"/>
                      <path d="M16 9.5L20.2 7.3C20.8667 6.96667 21.6667 7.45 21.6667 8.2V15.8C21.6667 16.55 20.8667 17.0333 20.2 16.7L16 14.5V9.5Z" fill="#9fb4ff"/>
                    </svg>
                  </div>
                </button>
              )}
            </div>
          )}
        </div>
        <div className="detailsInfo">
          <h1 className="detailsName">{currentVariant.name}</h1>
          <div className="detailsCategory">{Array.isArray(parent.category) ? parent.category.join(' / ') : parent.category}</div>
          <div className="detailsPrice">${currentVariant.price.toFixed(2)}</div>
          {parent.products && parent.products.length > 0 && (
            <div className="variants">
              {parent.products.map(v => (
                <button
                  key={v.id}
                  className={`variantBtn ${v.id === currentVariant.id ? 'variantActive' : ''}`}
                  onClick={() => { navigate(`/products/${v.id}`) }}
                  title={v.color?.name || v.name}
                >
                  <span className="variantSwatch" style={{ background: v.color?.hex || '#999' }} />
                  <span className="variantLabel">{v.color?.name || v.name}</span>
                </button>
              ))}
            </div>
          )}
          <p className="detailsDesc">{parent.description}</p>
          <button className="primaryButton">Add to cart</button>
        </div>
      </div>
    </div>
  )
}


