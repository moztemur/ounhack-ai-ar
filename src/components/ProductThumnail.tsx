import React from "react";
import { ImageSet, Variant } from "src/types";
import { resolvePublicUrl } from '../utils/asset'

{
  /* <button key={idx} className={`thumb ${idx === activeImageIdx ? 'thumbActive' : ''}`} onClick={() => { setShowCam(false); setActiveImageIdx(idx) }} aria-label={`Show image ${idx + 1}`}>
<img src={resolvePublicUrl(img.thumbnail)} alt={`thumb ${idx + 1}`} />
</button> */
}

const VariantImageWithButton = (props: {
  image: ImageSet;
  isActive: boolean;
  id: number;
  onClick: (idx: number) => void;
}) => {
  const { id, isActive, image, onClick } = props;
  const classNames = `thumb ${isActive ? "thumbActive" : ""}`;

  return (
    <button
      className={classNames}
      onClick={() => {
        // setShowCam(false);
        // setActiveImageIdx(idx);
        onClick(id);
      }}
      aria-label={`Show image ${id + 1}`}
    >
      <img src={resolvePublicUrl(image.thumbnail)} alt={`thumb ${id + 1}`} />
    </button>
  );
};

const ProductThumnail = (props: { active: number, variant: Variant; isAR: boolean, onChange: (idx: number) => void, children?: React.ReactNode }) => {
  const { variant, onChange, active, children } = props;
  if (!variant.images || variant.images.length === 0) {
    return <div className="thumbs">{children}</div>;
  }

  return (
    <div className="thumbs">
      {variant.images.map((img, idx) => (
        <VariantImageWithButton
          key={idx}
          image={img}
          isActive={active === idx}
          id={idx}
          onClick={() => onChange(idx)}
        />
      ))}
      {children}
    </div>
  );
};

export default ProductThumnail;
