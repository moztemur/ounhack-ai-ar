import React, { useMemo, useState, useEffect } from "react";
import ImageGallery from "../components/ImageGallery";
import products from "../data/products.json";
import arConfig from "../config/ar.json";
import {
  Link,
  useNavigate,
  useParams,
  Route,
  Routes,
  useLocation,
  useMatch,
} from "react-router-dom";
import { Product, Variant } from "../types";
import BNPL from "../components/static/BNPL";
import AmberPoints from "../components/static/AmberPoints";
import Follow from "../components/static/Follow";
import TabPanels from "../components/static/TabPanels";
import ValuePropositionWrapper from "../components/static/ValuePropositionWrapper";
import VideoPreviewTF from "../components/VideoPreviewTF";

export default function ProductDetails2() {
  const { id } = useParams();
  const items = products as Product[];
  const routeId = String(id);
  const navigate = useNavigate();
  const isPreview = useMatch("/:id/preview");

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
    return null;
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
    <>
      <div
        aria-roledescription="gallery"
        aria-label="Product images gallery"
        itemScope
        itemType="http://schema.org/ImageGallery"
        className="ImageGallery"
      >
        <div
          role="tablist"
          aria-label="Thumbnails"
          className="ImageGallery-thumbnails"
        >
          {currentVariant.images?.map((img, index) => (
            <button
              key={index}
              id={`stylecolor-media-gallery-tab-${index}`}
              type="button"
              role="tab"
              aria-label={`Thumbnail ${index + 1}`}
              aria-selected={activeImageIdx === index}
              aria-controls={`stylecolor-media-gallery-item-${index}`}
              tabIndex={activeImageIdx === index ? 0 : -1}
              className={`ImageGallery-thumbnailButton ${
                activeImageIdx === index ? "is-selected" : ""
              }`}
              onClick={() => {
                setActiveImageIdx(index);
                if (isPreview) {
                  navigate(`/${routeId}`);
                }
              }}
            >
              <picture
                itemProp="image"
                itemType="http://schema.org/ImageObject"
              >
                <source srcSet={img.thumbnail} media="(min-width: 1180px)" />
                <img
                  alt={`Thumbnail ${index + 1}`}
                  src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E"
                  className="ImageGallery-thumbnail"
                />
                <link itemProp="url" href={img.thumbnail} />
              </picture>
            </button>
          ))}
        </div>

        <Routes>
          <Route
            path="preview"
            element={
              <div className="try-on-container">
                <VideoPreviewTF
                  isActive={showCam}
                  className="detailsImage videoPreview"
                  product={{ category: parent.category, color: parent.color }}
                  variant={{ color: currentVariant.color }}
                />
              </div>
            }
          />
          <Route
            path="*"
            element={
              <div className="ImageGallery-content">
                <div
                  key={activeImageIdx}
                  id={`stylecolor-media-gallery-item-${activeImageIdx}`}
                  role="tabpanel"
                  aria-roledescription="slide"
                  aria-label={`${activeImageIdx + 1} of ${
                    currentVariant.images?.length
                  }`}
                >
                  {currentVariant.images?.[activeImageIdx]?.big && (
                    <picture>
                      <source
                        srcSet={currentVariant.images?.[activeImageIdx]?.big}
                        media="(min-width: 1180px)"
                      />
                      <img
                        alt={`Main Image ${activeImageIdx + 1}`}
                        src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E"
                        className="ImageGallery-image"
                      />
                    </picture>
                  )}
                </div>

                <ValuePropositionWrapper />
              </div>
            }
          />
        </Routes>
      </div>
      <header className="PDPDesktop-header">
        <h2 className="PDPDesktop-designerCategoryName">
          <a href="#">MAC Cosmetics</a>
        </h2>
        <Follow />
      </header>

      <h1 className="PDPDesktop-name">
        <span>{currentVariant.name}</span>
      </h1>

      <div className="PriceContainer">
        <span className="PriceContainer-price">{currentVariant.price} AED</span>
        <span className="PriceContainer-inclVAT"></span>
      </div>

      <BNPL />
      <AmberPoints />

      <hr className="PDPDesktop-separator" />

      <section className="ColorSelection">
        <header>
          <dl>
            <dt>Color</dt>
            <dd>{currentVariant.color?.name}</dd>
          </dl>
        </header>
        <ul aria-label="Choose a Style Color" className="hide-scrollbar">
          {parent.products?.map((v, idx) => (
            <li key={idx}>
              <Link
                to={isPreview ? `/${v.id}/preview` : `/${v.id}`}
                title={v.color?.name}
                tabIndex={0}
                className={`ColorSelection-color ${
                  v.id === currentVariant.id ? "is-selected" : ""
                }`}
              >
                <span style={{ backgroundColor: v.color?.hex }}></span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="PDPDesktop-actions">
        <button
          type="button"
          aria-label="Add to bag"
          className="ButtonV1 PDPDesktop-addToBagButton primary"
        >
          Add to bag
        </button>
        <Link to={`/${currentVariant.id}/preview`} className="ButtonV1 PDPDesktop-addToBagButton secondary">
          <button
            type="button"
            aria-label="Add to bag"
            className="ButtonV1 PDPDesktop-addToBagButton secondary"
          >
            Try Shade On
          </button>
        </Link>
        <button
          type="button"
          aria-label="Add to wishlist"
          aria-pressed="false"
          className="ButtonV1 PDPDesktop-wishlistToggleButton tertiary"
        >
          <svg className="Icon Heart">
            <use href="/static/sprite.svg#Heart"></use>
          </svg>
        </button>
      </div>

      <TabPanels />
    </>
  );
}
