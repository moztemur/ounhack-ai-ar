import React, { useEffect } from "react";
import products from "../data/products.json";
import { Product } from "src/types";
import { Link } from "react-router-dom";

export default function ProductList2() {
  const items = products as Product[];

  useEffect(() => {
    document.querySelectorAll(".BreadcrumbNav ol li").forEach((el) => {
      // @ts-ignore
      el.style.visibility = "hidden";
    });
  }, []);

  return (
    <section className="PLPDesktop-results">
      <ul
        style={{ gridTemplateColumns: "repeat(3, minmax(0px, 1fr))" }}
        className="PLPDesktop-grid"
      >
        {items.map((item, idx) => {
          return (
            <li
              id={item.id}
              key={idx}
              style={{ width: "100%" }}
              className="StyleColorListItem is-hoverable"
            >
              <Link to={`/products/${item.id}`}>
                <span
                  style={{ paddingBottom: "calc(149.714%)", width: "100%" }}
                  className="StyleColorItem-imageContainer"
                >
                  <img
                    alt="Pink Peony Blushin' Sweet Cheek & Lip Tint"
                    loading="lazy"
                    src={item.products?.[0]?.images?.[0]?.big}
                    style={{ width: "100%" }}
                    className="StyleColorListItem-thumbnail"
                  />
                  <img
                    alt="Pink Peony Blushin' Sweet Cheek & Lip Tint"
                    loading="lazy"
                    src={item.products?.[0]?.images?.[0]?.big}
                    style={{ width: "100%" }}
                    className="StyleColorListItem-hoverImage"
                  />
                </span>

                <span className="StyleColorListItem-contentContainer">
                  <span className="StyleColorListItem-badgeContainer"></span>
                  <span className="StyleColorListItem-designer">
                    {item.name}
                  </span>
                  <span className="StyleColorListItem-name">
                    {item.description}
                  </span>
                  <span className="StyleColorListItem-priceContainer">
                    <span className="StyleColorListItem-price">
                      {item.price} AED
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
