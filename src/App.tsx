import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProductList from './pages/ProductList'
import ProductDetails from './pages/ProductDetails'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<ProductList />} />
        <Route path="/products" element={<ProductList />} />
        <Route path="/products/:id" element={<ProductDetails />} />
        <Route path="*" element={<Navigate to="/products" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
