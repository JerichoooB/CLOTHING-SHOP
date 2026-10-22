import React from "react";
import { ArrowRight } from "lucide-react";
import Asset from "./Asset";
import { editorial } from "../lib/catalog";
import "./Hero.css";
export default function Hero({ page, go }) {
  const home = page === "Home";
  const text = {
    Men: [
      "Timeless essentials. Modern silhouettes.",
      "From everyday basics to elevated pieces,",
      "find what fits your style.",
    ],
    Women: [
      "Effortless looks for every moment.",
      "From casual days to special nights, find pieces",
      "that make you feel confident, comfortable,",
      "and uniquely you.",
    ],
    Unisex: [
      "Versatile style. Made for everyone.",
      "Comfortable, everyday essentials with a",
      "relaxed fit. Designed to be worn by anyone,",
      "anywhere.",
    ],
    Accessories: [
      "Thoughtful essentials. Small details.",
      "Elevate your everyday look with our curated",
      "collection of hats, bags, socks, and other",
      "timeless pieces.",
    ],
    Shop: [
      "Timeless essentials. Modern silhouettes.",
      "Discover considered pieces for your everyday.",
      "Find what fits your style.",
    ],
  };
  return (
    <section className={`hero ${home ? "home-hero" : "collection-hero"}`}>
      <Asset
        className="hero-photo"
        editorial
        cell={editorial[page]}
        label={
          home
            ? "Man in ivory sweatshirt seated by a concrete wall"
            : `${page} collection editorial`
        }
      />
      <div className="hero-content">
        <p className={home ? "eyebrow" : "breadcrumb"}>
          {home ? "NEW COLLECTION" : <>Home　/　Shop　/　{page}</>}
        </p>
        <h1>
          {home ? (
            <>
              Timeless Pieces
              <br />
              for Modern Life.
            </>
          ) : page === "Shop" ? (
            "The Collection"
          ) : (
            page
          )}
        </h1>
        <p className="hero-tagline">
          {home ? (
            <>
              Clean designs. Quality fabrics. Made for your
              <br />
              everyday moments.
            </>
          ) : (
            text[page][0]
          )}
        </p>
        {!home && (
          <p className="hero-description">
            {text[page].slice(1).map((t, i) => (
              <React.Fragment key={t}>
                {i > 0 && <br />}
                {t}
              </React.Fragment>
            ))}
          </p>
        )}
        {home ? (
          <button className="primary" onClick={() => go("Shop")}>
            SHOP NOW <ArrowRight size={16} />
          </button>
        ) : (
          <a
            className="primary"
            href="#products"
            onClick={(e) => {
              e.preventDefault();
              document
                .querySelector("#products")
                .scrollIntoView({ behavior: "smooth" });
            }}
          >
            SHOP ALL {page.toUpperCase()} <ArrowRight size={16} />
          </a>
        )}
      </div>
      {home && (
        <div className="slide-dots">
          <i />
          <i />
          <i />
        </div>
      )}
    </section>
  );
}
