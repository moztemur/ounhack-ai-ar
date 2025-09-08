import React, { useEffect, useMemo, useState } from "react";
import products from "../data/products.json";
import {
  Link,
  useNavigate,
  useParams,
  Route,
  Routes,
  useLocation,
  useMatch,
} from "react-router-dom";
import VideoPreviewTF from "../components/VideoPreviewTF";
import ProductThumnail from "../components/ProductThumnail";
import CameraThumnail from "../components/CameraThumnail";
import { resolvePublicUrl } from "../utils/asset";
import arConfig from "../config/ar.json";
import { Variant, Product } from "../types";

export default function ProductDetails() {
  const { id } = useParams();
  const items = products as Product[];
  const routeId = String(id);
  const navigate = useNavigate();
  const isPreview = useMatch("/products/:id/preview");

  const { parent, initialVariant } = useMemo(() => {
    const direct = items.find((p) => p.id === routeId);
    if (direct) {
      return {
        parent: direct,
        initialVariant: undefined as Variant | undefined,
      };
    }
    for (const p of items) {
      const v = p.products?.find((vv) => vv.id === routeId);
      if (v) return { parent: p, initialVariant: v };
    }
    return { parent: undefined, initialVariant: undefined };
  }, [items, routeId]);

  const [activeImageIdx, setActiveImageIdx] = useState(0);

  if (!parent) {
    return (
      <div className="container">
        <p>Product not found.</p>
        <Link to="/products" className="backLink">
          Back to products
        </Link>
      </div>
    );
  }

  const currentVariant: Variant = useMemo(() => {
    if (parent.products && parent.products.length > 0) {
      const found = parent.products.find((v) => v.id === routeId);
      return found || parent.products[0];
    }
    return parent;
  }, [parent, routeId]);

  useEffect(() => {
    setActiveImageIdx(0);
  }, [routeId]);

  // AR / webcam preview
  const [showCam, setShowCam] = useState(false);

  useEffect(() => {
    // Stop camera when navigating between variants
    setShowCam(false);
  }, [routeId]);

  useEffect(() => {
    if (isPreview) {
      setShowCam(true);
      setActiveImageIdx(-1);
    } else {
      setShowCam(false);
    }
  }, [isPreview]);

  const isAR = useMemo(() => {
    const cat = Array.isArray(parent.category)
      ? parent.category[parent.category.length - 1]
      : (parent.category as any);
    const cfg: any = arConfig as any;
    const isAR = !!(cfg && cat && cfg[cat] && cfg[cat].ar);
    return isAR;
  }, [parent.category]);

  return (
    <div className="container">
      <Link to="/products" className="backLink">
        ← Back to products
      </Link>
      <div className="details">
        <div>
          <Routes>
            <Route
              path="preview"
              element={
                <VideoPreviewTF
                  isActive={showCam}
                  className="detailsImage videoPreview"
                  product={{ category: parent.category, color: parent.color }}
                  variant={{ color: currentVariant.color }}
                />
              }
            />
            <Route
              path="*"
              element={
                <img
                  className="detailsImage"
                  src={resolvePublicUrl(
                    currentVariant.images?.[activeImageIdx]?.big ||
                      currentVariant.image
                  )}
                  alt={currentVariant.name}
                />
              }
            />
          </Routes>
          <ProductThumnail
            variant={currentVariant}
            active={activeImageIdx}
            onChange={(idx) => {
              if (isPreview) {
                navigate(`/products/${routeId}`);
              }
              setActiveImageIdx(idx);
            }}
          >
            <CameraThumnail
              available={isAR}
              isActive={showCam}
              onClick={() => {
                navigate(`/products/${routeId}/preview`);
              }}
            />
          </ProductThumnail>
        </div>
        <div className="detailsInfo">
          <h1 className="detailsName">{currentVariant.name}</h1>
          <div className="detailsCategory">
            {Array.isArray(parent.category)
              ? parent.category.join(" / ")
              : parent.category}
          </div>
          <div className="detailsPrice">${currentVariant.price.toFixed(2)}</div>
          {parent.products && parent.products.length > 0 && (
            <div className="variants">
              {parent.products.map((v) => (
                <button
                  key={v.id}
                  className={`variantBtn ${
                    v.id === currentVariant.id ? "variantActive" : ""
                  }`}
                  onClick={() => {
                    const url = isPreview ? `/products/${v.id}/preview` : `/products/${v.id}`;
                    navigate(url);
                  }}
                  title={v.color?.name || v.name}
                >
                  <span
                    className="variantSwatch"
                    style={{ background: v.color?.hex || "#999" }}
                  />
                  <span className="variantLabel">
                    {v.color?.name || v.name}
                  </span>
                </button>
              ))}
            </div>
          )}
          <p className="detailsDesc">{parent.description}</p>
          <button className="primaryButton">Add to cart</button>
        </div>
      </div>
    </div>
  );
}
