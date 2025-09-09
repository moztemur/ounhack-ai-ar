import React, { useState } from "react";
import ValuePropositionWrapper from "./static/ValuePropositionWrapper";

const images = [
  {
    alt: "MAC Cosmetics Hug Me Lustreglass Lipstick, 3g Image 1",
    thumbnail:
      "//ounass-ae.atgcdn.ae/small_light(dw=81,ch=158,cc=fafafa,of=webp)/pub/media/catalog/product/2/1/214698816_nocolor_in.jpg?ts=1628439237.1664",
    main: "//ounass-ae.atgcdn.ae/small_light(p=zoom,of=webp,q=65)/pub/media/catalog/product/2/1/214698816_nocolor_in.jpg?ts=1628439237.1664",
  },
  {
    alt: "MAC Cosmetics Hug Me Lustreglass Lipstick, 3g Image 2",
    thumbnail:
      "//ounass-ae.atgcdn.ae/small_light(dw=81,ch=158,cc=fafafa,of=webp)/pub/media/catalog/product/2/1/214698816_nocolor_fr.jpg?ts=1628439237.1664",
    main: "",
  },
  {
    alt: "MAC Cosmetics Hug Me Lustreglass Lipstick, 3g Image 3",
    thumbnail:
      "//ounass-ae.atgcdn.ae/small_light(dw=81,ch=158,cc=fafafa,of=webp)/pub/media/catalog/product/2/1/214698816_nocolor_cu.jpg?ts=1628439237.1664",
    main: "",
  },
  {
    alt: "MAC Cosmetics Hug Me Lustreglass Lipstick, 3g Image 4",
    thumbnail:
      "//ounass-ae.atgcdn.ae/small_light(dw=81,ch=158,cc=fafafa,of=webp)/pub/media/catalog/product/2/1/214698816_nocolor_e1.jpg?ts=1628439237.1664",
    main: "",
  },
  {
    alt: "MAC Cosmetics Hug Me Lustreglass Lipstick, 3g Image 5",
    thumbnail:
      "//ounass-ae.atgcdn.ae/small_light(dw=81,ch=158,cc=fafafa,of=webp)/pub/media/catalog/product/2/1/214698816_nocolor_e2.jpg?ts=1628439237.1664",
    main: "",
  },
];

const ImageGallery = () => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedImage = images[selectedIndex];
  return (
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
        {images.map((img, index) => (
          <button
            key={index}
            id={`stylecolor-media-gallery-tab-${index}`}
            type="button"
            role="tab"
            aria-label={`Thumbnail ${index + 1}`}
            aria-selected={selectedIndex === index}
            aria-controls={`stylecolor-media-gallery-item-${index}`}
            tabIndex={selectedIndex === index ? 0 : -1}
            className={`ImageGallery-thumbnailButton ${
              selectedIndex === index ? "is-selected" : ""
            }`}
            onClick={() => setSelectedIndex(index)}
          >
            <picture itemProp="image" itemType="http://schema.org/ImageObject">
              <source srcSet={img.thumbnail} media="(min-width: 1180px)" />
              <img
                alt={img.alt}
                src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E"
                className="ImageGallery-thumbnail"
              />
              <link itemProp="url" href={img.thumbnail} />
            </picture>
          </button>
        ))}
      </div>

      {/* Main Image Preview */}
      <div className="ImageGallery-content">
        <div
          key={selectedIndex}
          id={`stylecolor-media-gallery-item-${selectedIndex}`}
          role="tabpanel"
          aria-roledescription="slide"
          aria-label={`${selectedIndex + 1} of ${images.length}`}
        >
          {selectedImage.main && (
            <picture>
              <source srcSet={selectedImage.main} media="(min-width: 1180px)" />
              <img
                alt={selectedImage.alt}
                src="data:image/svg+xml,%3Csvg%20xmlns='http://www.w3.org/2000/svg'/%3E"
                className="ImageGallery-image"
              />
            </picture>
          )}
        </div>

        <ValuePropositionWrapper />
      </div>
    </div>
  );
};

export default ImageGallery;
