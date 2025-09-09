import { HashRouter, BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import ProductList from './pages/ProductList'
import ProductDetails from './pages/ProductDetails'
import ProductDetails2 from './pages/ProductDetails2'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<ProductList />} /> */}
        {/* <Route path="/products/:id/*" element={<ProductDetails />} /> */}
        <Route path="/:id/*" element={<ProductDetails2 />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
