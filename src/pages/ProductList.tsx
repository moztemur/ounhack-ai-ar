import React from 'react'
import products from '../data/products.json'
import { Link } from 'react-router-dom'

type ImageSet = { big: string; middle: string; thumbnail: string }
type Variant = { id: string; name: string; price: number; image?: string; images?: ImageSet[] }
type Product = {
  id: string
  name: string
  price: number
  description: string
  category: string
  products?: Variant[]
}

export default function ProductList() {
  const items = products as Product[]
  return (
    <div className="container">
      <h1 className="title">Products</h1>
      <div className="grid">
        {items.map((p) => (
          <Link key={p.id} to={`/products/${p.id}`} className="cardLink">
            <div className="productCard">
              <img
                className="productImage"
                src={p.products?.[0]?.images?.[0]?.middle || p.products?.[0]?.image || ''}
                alt={p.name}
              />
              <div className="productInfo">
                <div className="productName">{p.name}</div>
                <div className="productPrice">${p.price.toFixed(2)}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}


