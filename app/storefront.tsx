"use client";

import type { Product } from "@/lib/types";
import { useMemo, useState } from "react";

type Basket = Record<string, number>;
type IconName = "delivery" | "shield" | "gift" | "heart" | "ingredients" | "trusted";

function Icon({ name, size = 28 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.7, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "delivery") return <svg {...common}><rect x="1" y="6" width="13" height="10" rx="1"/><path d="M14 9h4l3 3v4h-7z"/><circle cx="6" cy="18" r="1.8"/><circle cx="17" cy="18" r="1.8"/></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 2l8 3v6c0 5-3.5 8.5-8 11-4.5-2.5-8-6-8-11V5z"/><path d="M9 12l2 2 4-4"/></svg>;
  if (name === "gift") return <svg {...common}><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S9 3 6.5 4.5 8 8 12 8zM12 8s3-5 5.5-3.5S16 8 12 8z"/></svg>;
  if (name === "heart") return <svg {...common}><path d="M12 21C7 17 3 13.5 3 9a4.5 4.5 0 0 1 9-1 4.5 4.5 0 0 1 9 1c0 4.5-4 8-9 12z"/></svg>;
  if (name === "ingredients") return <svg {...common}><path d="M4 13a8 8 0 0 0 16 0H4z"/><path d="M12 13V7M9 7c0-2 1.5-3 3-3s3 1 3 3"/></svg>;
  return <svg {...common}><circle cx="12" cy="8" r="6"/><path d="M8.5 13.5L7 22l5-3 5 3-1.5-8.5"/></svg>;
}

export default function Storefront({ products }: { products: Product[] }) {
  const [basket, setBasket] = useState<Basket>({});
  const [checkout, setCheckout] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState("");
  const items = products.filter((p) => basket[p.id]).map((p) => ({ ...p, quantity: basket[p.id] }));
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.quantity, 0), [items]);
  const count = Object.values(basket).reduce((sum, quantity) => sum + quantity, 0);
  const add = (id: string) => setBasket((current) => ({ ...current, [id]: (current[id] ?? 0) + 1 }));
  const change = (id: string, amount: number) => setBasket((current) => { const next = Math.max(0, (current[id] ?? 0) + amount); const copy = { ...current }; if (next) copy[id] = next; else delete copy[id]; return copy; });

  async function placeOrder(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setResult("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: form.get("name"), phone: form.get("phone"), address: form.get("address"), notes: form.get("notes"), items: items.map((item) => ({ productId: item.id, name: item.name, price: item.price, quantity: item.quantity })) }) });
    const data = await response.json(); setBusy(false);
    if (!response.ok) return setResult(data.error ?? "Order could not be placed.");
    setResult(`Order ${data.order.id} is confirmed. We'll continue with you on WhatsApp.`); setBasket({});
  }

  return <>
    <div className="announcement"><span className="announcementLead">✦ &nbsp; FREE DELIVERY FOR ORDERS OVER R200</span><span>Homemade with love in South Africa</span><span className="socialMini">Instagram &nbsp; Facebook</span></div>
    <header><a className="brand" href="#top"><img src="/assets/logo.png" alt="Crunch & Crumbs"/></a><nav><a href="#top">Home</a><a href="#products">Shop</a><a href="#products">Gift Boxes</a><a href="#story">About Us</a><a href="#reviews">Reviews</a><a href="#contact">Contact</a></nav><button className="cartButton" onClick={() => setCheckout(true)} aria-label={`Open basket with ${count} items`}><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg><b>{count}</b></button></header>
    <main id="top">
      <section className="hero"><img src="/assets/products/hero-composed.jpg" alt="Cookies and chinchin"/><div className="heroShade"/><div className="heroCopy"><p className="script">Freshly baked ♡</p><h1>Cookies &amp;<br/>Authentic<br/><em>Nigerian Chinchin</em></h1><p>Homemade with love. Crafted for every celebration, snack break and special moment.</p><div className="heroActions"><a className="primary" href="#products">ORDER YOUR FAVOURITES</a><a className="secondary" href="#products">VIEW OUR PRODUCTS</a></div><div className="heroTrust"><span><Icon name="ingredients" size={19}/><b>Freshly Made</b><small>In small batches</small></span><span><Icon name="trusted" size={19}/><b>Premium</b><small>Quality ingredients</small></span><span><Icon name="shield" size={19}/><b>Hygienic</b><small>Clean production</small></span></div></div></section>
      <section className="features"><div><Icon name="delivery"/><b>Fast Delivery</b><span>Quick and reliable delivery</span></div><div><Icon name="shield"/><b>Secure Packaging</b><span>Keeps every bite fresh</span></div><div><Icon name="gift"/><b>Perfect for Gifting</b><span>Beautifully packed</span></div><div><Icon name="heart"/><b>Made with Love</b><span>Crafted in every batch</span></div></section>
      <section className="products" id="products"><div className="sectionHeading"><div><p className="script gold">Our bestsellers ♡</p><h2>Cookies, Chinchin &amp; More</h2><p>Explore our most loved treats</p></div><span>Freshly made · Beautifully packed</span></div><div className="productGrid">{products.map((product) => <article key={product.id}><div className="productImage"><img src={product.image} alt={product.name}/><span>FRESH</span></div><div><h3>{product.name}</h3><p>{product.description}</p><strong>R{product.price.toFixed(2)}</strong><button onClick={() => add(product.id)}>ADD TO BASKET</button></div></article>)}</div></section>
      <section className="story" id="story"><img src="/assets/products/couple-baking.jpg" alt="Crunch and Crumbs bakers"/><div><p className="script gold">Our story</p><h2>Homemade Goodness,<br/>Made for You</h2><div className="goldRule"/><p>Crunch &amp; Crumbs began as a husband-and-wife dream to bring homemade goodness to families across South Africa and beyond. Every batch is prepared with carefully selected ingredients, attention to detail and a passion for quality.</p><div className="storyValues"><span><Icon name="ingredients" size={26}/><b>Quality Ingredients</b><small>Only the best ingredients</small></span><span><Icon name="heart" size={26}/><b>Made with Love</b><small>Baked with passion</small></span><span><Icon name="trusted" size={26}/><b>Trusted by Many</b><small>Loved across SA</small></span></div></div></section>
      <section className="reviews" id="reviews"><div><p className="eyebrow">CUSTOMER LOVE</p><h2>Loved by Our Customers</h2><div className="reviewGrid"><article><div>★★★★★</div><p>“The cookies are incredibly soft and delicious. Everything arrived fresh and beautifully packed.”</p><b>— Sarah M.</b></article><article><div>★★★★★</div><p>“Authentic chinchin with the perfect crunch. My whole family finished it in one sitting!”</p><b>— Naledi K.</b></article><article><div>★★★★★</div><p>“Our gift boxes looked premium and the service was warm from ordering through delivery.”</p><b>— Simphiwe T.</b></article></div></div><aside><img src="/assets/products/gift-box.jpg" alt="Crunch and Crumbs gift box"/><div><Icon name="gift" size={31}/><h3>Made for Every Celebration</h3><p>Thoughtful treats, beautifully presented.</p></div></aside></section>
      <section className="orderCta"><div><p className="script">Ready for something delicious?</p><h2>Fresh treats are only a few clicks away.</h2><p>Build your basket and we'll confirm your order with you on WhatsApp.</p></div><a className="primary" href="#products">START YOUR ORDER</a></section>
    </main>
    {checkout && <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && setCheckout(false)}><aside className="checkout"><button className="close" onClick={() => setCheckout(false)}>×</button><h2>Your order</h2>{!items.length ? <div className="emptyBasket"><Icon name="gift" size={45}/><p>Your basket is empty.<br/>Add some treats to get started.</p></div> : <>{items.map((item) => <div className="line" key={item.id}><span><b>{item.name}</b><small>R{item.price.toFixed(2)} each</small></span><span className="quantity"><button onClick={() => change(item.id,-1)}>−</button>{item.quantity}<button onClick={() => change(item.id,1)}>+</button></span></div>)}<div className="total"><span>Total</span><b>R{(subtotal + (subtotal >= 200 ? 0 : 35)).toFixed(2)}</b></div>{subtotal < 200 && <small>Includes R35 delivery. Spend R{(200-subtotal).toFixed(2)} more for free delivery.</small>}<form onSubmit={placeOrder}><input name="name" placeholder="Full name" required/><input name="phone" placeholder="WhatsApp number" required/><textarea name="address" placeholder="Delivery address" required/><textarea name="notes" placeholder="Order notes (optional)"/><button className="primary submit" disabled={busy}>{busy ? "PLACING ORDER..." : "PLACE ORDER"}</button></form></>}{result && <p className="result">{result}</p>}</aside></div>}
    <footer id="contact"><div className="footerMain"><div><img src="/assets/logo-light.png" alt="Crunch & Crumbs"/><p>Homemade cookies and authentic Nigerian chinchin, baked fresh in South Africa.</p></div><div><h4>Explore</h4><a href="#products">Our Products</a><a href="#story">Our Story</a><a href="#reviews">Reviews</a></div><div><h4>Order &amp; Support</h4><a href="tel:+27782890907">+27 78 289 0907</a><a href="mailto:hello@crunchandcrumbs.co.za">hello@crunchandcrumbs.co.za</a><a href="/login">Merchant sign in</a></div><div><h4>Fresh from our kitchen</h4><p>Follow along for new flavours, gifting ideas and seasonal treats.</p><span>Instagram &nbsp; Facebook &nbsp; TikTok</span></div></div><div className="footerBottom"><span>© 2026 Crunch &amp; Crumbs. All rights reserved.</span><span>Commerce powered by thoughtful automation.</span></div></footer>
    <button className="floatingCart" onClick={() => setCheckout(true)}><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/></svg><span>{count}</span> View order</button>
  </>;
}
