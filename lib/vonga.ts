export type VongaProduct = {
  id: string;
  name: string;
  category: "Dresses" | "Occasionwear" | "Tailoring";
  price: number;
  image: string;
  description: string;
  details: string[];
  sizes: string[];
  colours: string[];
  featured?: boolean;
};

export const vongaProducts: VongaProduct[] = [
  { id: "noir-sculpted-jumpsuit", featured: true, name: "Noir Sculpted Jumpsuit", category: "Occasionwear", price: 3200, image: "/vonga/images/products/new-arrival-1.jpg", description: "A commanding wide-leg silhouette framed by hand-shaped organza ruffles.", details: ["Sculpted organza detailing", "Fully lined bodice", "Made in Pretoria"], sizes: ["XS","S","M","L","XL"], colours: ["Noir"] },
  { id: "ivory-rosette-gown", featured: true, name: "Ivory Rosette Gown", category: "Dresses", price: 2800, image: "/vonga/images/products/new-arrival-2.jpg", description: "Fluid ivory tailoring softened with an architectural rosette and cascading hem.", details: ["Asymmetric rosette shoulder", "High-low layered skirt", "Invisible back fastening"], sizes: ["XS","S","M","L","XL"], colours: ["Ivory"] },
  { id: "onyx-ruffle-dress", featured: true, name: "Onyx Ruffle Dress", category: "Dresses", price: 1950, image: "/vonga/images/products/new-arrival-3.jpg", description: "A modern occasion dress balancing sheer texture with sweeping movement.", details: ["Textured organza overlay", "Defined waist", "Soft structured volume"], sizes: ["XS","S","M","L","XL","2XL"], colours: ["Onyx"] },
  { id: "gilded-noir-gown", featured: true, name: "Gilded Noir Gown", category: "Occasionwear", price: 5400, image: "/vonga/images/products/new-arrival-4.jpg", description: "A luminous gold and black statement gown designed for unforgettable entrances.", details: ["Asymmetric sculpted bodice", "Layered statement ruffle", "Atelier finishing"], sizes: ["S","M","L","XL"], colours: ["Gold / Noir"] },
  { id: "midnight-medallion-blazer", name: "Midnight Medallion Blazer", category: "Tailoring", price: 3650, image: "/vonga/images/womenswear/womenswear-1.jpg", description: "A sharply sculpted blazer dress punctuated with gilded medallion details.", details: ["Structured shoulder", "Double-breasted closure", "Sculpted waist"], sizes: ["XS","S","M","L","XL"], colours: ["Black / Gold"] },
  { id: "scarlet-command-suit", name: "Scarlet Command Suit", category: "Tailoring", price: 4200, image: "/vonga/images/womenswear/womenswear-2.jpg", description: "Off-shoulder scarlet tailoring with a fluid wide-leg trouser.", details: ["Architectural neckline", "Wide-leg cut", "Two-piece set"], sizes: ["XS","S","M","L","XL"], colours: ["Scarlet"] },
  { id: "scarlet-bloom-mini", name: "Scarlet Bloom Mini", category: "Dresses", price: 2950, image: "/vonga/images/womenswear/womenswear-3.jpg", description: "A playful couture mini shaped with a champagne bloom and sculptural volume.", details: ["Hand-shaped floral appliqué", "Layered tulle skirt", "Corseted bodice"], sizes: ["XS","S","M","L"], colours: ["Scarlet / Champagne"] },
  { id: "fuchsia-rose-couture", name: "Fuchsia Rose Couture", category: "Dresses", price: 4800, image: "/vonga/images/womenswear/womenswear-4.jpg", description: "Embroidered corsetry meets dimensional satin roses in vivid fuchsia.", details: ["Embellished corset", "Hand-applied satin roses", "Statement shoulder"], sizes: ["S","M","L","XL"], colours: ["Fuchsia"] },
  { id: "noir-rose-corset", name: "Noir Rose Corset", category: "Occasionwear", price: 3300, image: "/vonga/images/womenswear/womenswear-5.jpg", description: "A dramatic rose-sculpted corset for evening dressing with impact.", details: ["Satin rose construction", "Boned inner corset", "Atelier finish"], sizes: ["XS","S","M","L","XL"], colours: ["Noir"] },
  { id: "lagoon-bow-jumpsuit", name: "Lagoon Bow Jumpsuit", category: "Occasionwear", price: 3900, image: "/vonga/images/occasion/occasion-1.jpg", description: "A jewel-toned jumpsuit with an oversized bow and crystal embroidery.", details: ["Asymmetric statement bow", "Crystal embellishment", "Floor-sweeping overskirt"], sizes: ["S","M","L","XL","2XL"], colours: ["Lagoon"] },
  { id: "crimson-rose-ballgown", name: "Crimson Rose Ballgown", category: "Occasionwear", price: 5200, image: "/vonga/images/occasion/occasion-2.jpg", description: "A romantic floral ballgown balanced by a dramatic high-low silhouette.", details: ["Structured strapless bodice", "High-low skirt", "Printed satin"], sizes: ["S","M","L","XL","2XL"], colours: ["Crimson Rose"] },
  { id: "amethyst-ruffle-mini", name: "Amethyst Ruffle Mini", category: "Dresses", price: 2750, image: "/vonga/images/occasion/occasion-3.jpg", description: "A buoyant amethyst mini with weightless tiers and a defined waist.", details: ["Layered organza ruffles", "Soft flutter sleeve", "Fitted waistband"], sizes: ["XS","S","M","L","XL"], colours: ["Amethyst"] },
];

export const formatRand = (value: number) => `R${value.toLocaleString("en-ZA")}`;
