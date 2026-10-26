import { ArrowRight } from "lucide-react";
import Asset from "./Asset";
import "./Hero.css";

const essentials = "/images/clover-essentials.png";
const banners = {
  Home: {
    label: "THE EVERYDAY EDIT",
    title: "Timeless pieces.\nMade for your everyday.",
    tagline: "Less effort. More you.",
    description:
      "Considered silhouettes, a quiet palette, and the essentials you’ll keep coming back to.",
    pieces: [
      [0, "Essential tees"],
      [1, "Everyday layers"],
      [4, "Finishing touches"],
    ],
  },
  Shop: {
    label: "EXPLORE CLOVER",
    title: "The Collection",
    tagline: "Your everyday wardrobe, considered.",
    description:
      "Discover clothing and accessories made to fit naturally into your day.",
    pieces: [
      [0, "Essential tees"],
      [1, "Relaxed layers"],
      [4, "Everyday bags"],
    ],
  },
  Men: {
    label: "THE MEN’S COLLECTION",
    title: "Men",
    tagline: "Timeless essentials. Modern silhouettes.",
    description:
      "Easy tees, relaxed trousers and versatile layers. Start with the pieces that feel like you.",
    pieces: [
      [5, "Everyday tees"],
      [2, "Relaxed trousers"],
      [6, "Soft layers"],
    ],
  },
  Women: {
    label: "THE WOMEN’S COLLECTION",
    title: "Women",
    tagline: "Effortless looks for every moment.",
    description:
      "A thoughtful edit of comfortable shapes, soft layers and everyday favourites.",
    pieces: [
      [0, "Simple essentials"],
      [8, "Light layers"],
      [6, "Comfort first"],
    ],
  },
  Unisex: {
    label: "THE UNISEX COLLECTION",
    title: "Unisex",
    tagline: "Versatile style. Made for everyone.",
    description:
      "Relaxed fits, familiar colours and the freedom to make every piece your own.",
    pieces: [
      [1, "Signature hoodies"],
      [0, "Everyday tees"],
      [2, "Relaxed fits"],
    ],
  },
  Accessories: {
    label: "THE ACCESSORIES EDIT",
    title: "Accessories",
    tagline: "Small details. Everyday companions.",
    description:
      "Bags, headwear and little essentials that bring your whole look together.",
    pieces: [
      [9, "Signature caps"],
      [4, "Everyday totes"],
      [11, "Carry essentials"],
    ],
  },
};

export default function Hero({ page, go }) {
  const home = page === "Home";
  const banner = banners[page] || banners.Shop;
  function scrollToProducts(event) {
    event.preventDefault();
    const target = document.getElementById("products");
    target?.scrollIntoView({
      behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
  }
  return (
    <section
      className={`hero ${home ? "home-banner" : "collection-banner"}`}
      aria-labelledby="hero-title"
    >
      <div className="hero-inner">
        <div className="hero-content">
          {!home && (
            <nav className="hero-breadcrumb" aria-label="Breadcrumb">
              <a
                href="#home"
                onClick={(event) => {
                  event.preventDefault();
                  go?.("Home");
                }}
              >
                Home
              </a>
              <span aria-hidden="true">/</span>
              {page !== "Shop" && (
                <>
                  <a
                    href="#shop"
                    onClick={(event) => {
                      event.preventDefault();
                      go?.("Shop");
                    }}
                  >
                    Shop
                  </a>
                  <span aria-hidden="true">/</span>
                </>
              )}
              <span aria-current="page">{page === "Shop" ? "Shop" : page}</span>
            </nav>
          )}
          <p className="eyebrow hero-kicker">
            <span aria-hidden="true" />
            {banner.label}
          </p>
          <h1 id="hero-title">
            {banner.title.split("\n").map((line, index) => (
              <span key={line}>
                {index > 0 && <br />}
                {line}
              </span>
            ))}
          </h1>
          <p className="hero-tagline">{banner.tagline}</p>
          <p className="hero-description">{banner.description}</p>
          {home ? (
            <button className="primary" onClick={() => go("Shop")}>
              SHOP THE COLLECTION <ArrowRight aria-hidden="true" />
            </button>
          ) : (
            <a className="primary" href="#products" onClick={scrollToProducts}>
              SHOP ALL {page === "Shop" ? "PIECES" : page.toUpperCase()}{" "}
              <ArrowRight aria-hidden="true" />
            </a>
          )}
          <p className="hero-signature">Simple. Timeless. Yours.</p>
        </div>
        <div
          className="hero-product-edit"
          aria-label={`${page} product inspiration`}
        >
          <div className="hero-edit-heading">
            <span>CLOVER / THE ESSENTIALS</span>
            <img src="/images/clover-five-leaf.svg" alt="Five-leaf Clover" />
          </div>
          <div className="hero-product-layout">
            {banner.pieces.map(([cell, label], index) => (
              <figure
                className={`hero-piece hero-piece-${index + 1}`}
                key={label}
              >
                <Asset src={essentials} cell={cell} label={label} />
                <figcaption>
                  <span>{label}</span>
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="hero-edit-footer">
            <span>A quiet palette. An everyday point of view.</span>
            <span aria-hidden="true">01 — 03</span>
          </div>
        </div>
      </div>
    </section>
  );
}
