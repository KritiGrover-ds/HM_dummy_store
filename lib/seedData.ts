import "server-only";
import { getRedis, keys, stockField } from "./redis";
import { hashPassword } from "./password";
import type { Department, Product, ProductVariant, User } from "@/types/store";

// ─────────────────────────────────────────────────────────────────────────────
// LINEA India demo catalog – 65 deterministic products across Ladies, Men, Kids,
// Baby, LINEA HOME and Sport, with real fashion photography URLs and realistic
// per-colour/per-size stock seeded into Redis Hashes hm:stock:{productId}.
// ─────────────────────────────────────────────────────────────────────────────

export const DEMO_MEMBER_EMAIL = "member@linea.demo";
export const DEMO_MEMBER_PASSWORD = "hmindia2026";
export const DEMO_MEMBER_ID = "usr_demo_member";

// ── Real photography ────────────────────────────────────────────────────────


/** Curated editorial Unsplash studio photography. */
export const unsplash = (id: string, w = 900) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=85`;

const PHOTO_POOLS: Record<string, string[]> = {
  dress: [
    "1515372039744-b8f02a3ae446",
    "1496747611176-843222e1e57c",
    "1595777457583-95e059d581b8",
    "1572804013309-59a88b7e92f1",
    "1539008835657-9e8e9680c956",
    "1566174053879-31528523f8ae",
    "1585487000160-6ebcfceb0d03",
    "1612336307429-8a898d10e223",
  ],
  ladiesTop: [
    "1521572163474-6864f9cf17ab",
    "1503342217505-b0a15ec3261c",
    "1564257631407-4deb1f99d992",
    "1485462537746-965f33f7f6a7",
    "1434389677669-e08b4cac3105",
    "1469334031218-e382a71b716b",
  ],
  blouse: [
    "1598554747436-c9293d6a588f",
    "1551163943-3f6a855d1153",
    "1485968579580-b6d095142e6e",
    "1483985988355-763728e1935b",
  ],
  knit: [
    "1434389677669-e08b4cac3105",
    "1576566588028-4147f3842f27",
    "1608234808654-2a8875faa7fd",
    "1620799140188-3b2a02fd9a77",
  ],
  coat: [
    "1591047139829-d91aecb6caea",
    "1539533018447-63fcce2678e3",
    "1548624313-0396c75e4b1a",
    "1544022613-e87ca75a784a",
  ],
  denim: [
    "1541099649105-f69ad21f3246",
    "1542272604-787c3835535d",
    "1582552938357-32b906df40cb",
    "1604176354204-9268737828e4",
  ],
  skirt: [
    "1583496661160-fb5886a0aaaa",
    "1577900232427-18219b9166a0",
    "1490481651871-ab68de25d43d",
  ],
  menTee: [
    "1521572163474-6864f9cf17ab",
    "1583743814966-8936f5b7be1a",
    "1576566588028-4147f3842f27",
    "1618354691373-d851c5c3a990",
    "1622445275463-afa2ab738c34",
  ],
  menShirt: [
    "1602810318383-e386cc2a3ccf",
    "1596755094514-f87e34085b2c",
    "1603252109303-2751441dd157",
    "1620012253295-c15cc3e65df4",
  ],
  hoodie: [
    "1556821840-3a63f95609a7",
    "1620799140408-edc6dcb6d633",
    "1578587018452-892bacefd3f2",
    "1509942774463-acf339cf87d5",
  ],
  menTrouser: [
    "1624378439575-d8705ad7ae80",
    "1473966968600-fa801b869a1a",
    "1542272604-787c3835535d",
    "1565084888279-aca607ecce0c",
  ],
  menJacket: [
    "1551028719-00167b16eac5",
    "1507679799987-c73779587ccf",
    "1591047139829-d91aecb6caea",
    "1617137968427-85924c800a22",
  ],
  polo: [
    "1586790170083-2f9ceadc732d",
    "1622519407650-3df9883f76a5",
    "1625910513413-c23b8bb81cba",
  ],
  kids: [
    "1519238263530-99bdd11df2ea",
    "1503944583220-79d8926ad5e2",
    "1471286174890-9c112ffca5b4",
    "1622290291468-a28f7a7dc6a8",
    "1514090458221-65bb69cf63e6",
  ],
  baby: [
    "1522771930-78848d9293e8",
    "1555252333-9f8e92e65df9",
    "1515488042361-ee00e0ddd4e4",
    "1519689680058-324335c77eba",
  ],
  cushion: [
    "1584100936595-c0654b55a2e2",
    "1567016432779-094069958ea5",
    "1540638349517-3abd5afc5847",
  ],
  bedding: [
    "1522771739844-6a9f6d5f14af",
    "1505693416388-ac5ce068fe85",
    "1631049307264-da0ec9d70304",
  ],
  vase: [
    "1578500494198-246f612d3b3d",
    "1612196808214-b8e1d6145a8c",
    "1581783342308-f792dbdd27c5",
  ],
  candle: [
    "1602874801007-bd458bb1b8b6",
    "1603006905003-be475563bc59",
    "1608181831718-c9ffd8ea4a41",
  ],
  rug: [
    "1600166898405-da9535204843",
    "1586023492125-27b2c045efd7",
    "1618220179428-22790b461013",
  ],
  sportLadies: [
    "1506629082955-511b1aa562c8",
    "1518310383802-640c2de311b2",
    "1571019613454-1cb2f99b2d8b",
    "1517836357463-d25dfeac3438",
  ],
  sportMen: [
    "1571019613454-1cb2f99b2d8b",
    "1517836357463-d25dfeac3438",
    "1483721310020-03333e577078",
    "1556817411-31ae72fa3ea0",
  ],
};

// ── Size matrices ───────────────────────────────────────────────────────────

const SIZES = {
  apparel: ["XS", "S", "M", "L", "XL"],
  waist: ["28", "30", "32", "34"],
  kidsSmall: ["2-4Y", "4-6Y", "6-8Y"],
  kidsBig: ["8-10Y", "10-12Y", "12-14Y"],
  baby: ["0-3M", "3-6M", "6-9M", "9-12M"],
  one: ["One Size"],
};

type SizeKey = keyof typeof SIZES;

// ── Curated catalog definition ──────────────────────────────────────────────

interface CatalogEntry {
  title: string;
  department: Department;
  subcategory: string;
  price: number;
  originalPrice?: number;
  colors: [string, string][];
  pool: keyof typeof PHOTO_POOLS;
  sizes: SizeKey;
  description: string;
  fit: string;
  composition: string;
  isNew?: boolean;
  conscious?: boolean;
}

const CATALOG: CatalogEntry[] = [
  // ───────────── LADIES ─────────────
  { title: "Linen-blend Wrap Dress", department: "ladies", subcategory: "Dresses", price: 2299, colors: [["Beige", "#d8c3a5"], ["Black", "#1a1a1a"], ["Sage Green", "#9caf88"]], pool: "dress", sizes: "apparel", description: "Calf-length wrap dress in an airy linen blend with a V-neck, short flutter sleeves and a tie belt at the waist.", fit: "Regular fit", composition: "Linen 55%, Viscose 45%", isNew: true, conscious: true },
  { title: "Smocked Cotton Maxi Dress", department: "ladies", subcategory: "Dresses", price: 2699, colors: [["White", "#f5f5f0"], ["Terracotta", "#c46a4a"]], pool: "dress", sizes: "apparel", description: "Long, tiered dress in soft cotton with a smocked bodice, square neckline and narrow adjustable shoulder straps.", fit: "Relaxed fit", composition: "Cotton 100%", conscious: true },
  { title: "Satin Slip Dress", department: "ladies", subcategory: "Dresses", price: 1999, originalPrice: 2999, colors: [["Champagne", "#e8d3b0"], ["Emerald", "#1f6f50"], ["Black", "#1a1a1a"]], pool: "dress", sizes: "apparel", description: "Midi slip dress in lustrous satin with a draped cowl neckline, thin adjustable straps and a bias-cut skirt.", fit: "Fitted at the bust", composition: "Polyester 100%" },
  { title: "Puff-sleeve Mini Dress", department: "ladies", subcategory: "Dresses", price: 1499, colors: [["Light Pink", "#f4c6cf"], ["Dark Blue", "#1f2c4c"]], pool: "dress", sizes: "apparel", description: "Short A-line dress in crisp poplin with a sweetheart neckline, puff sleeves and a concealed zip at the back.", fit: "Fitted waist", composition: "Cotton 100%", isNew: true },
  { title: "Rib-knit Bodycon Dress", department: "ladies", subcategory: "Dresses", price: 1299, colors: [["Black", "#1a1a1a"], ["Mocha", "#7a5c48"], ["Cream", "#efe6d2"]], pool: "dress", sizes: "apparel", description: "Fitted, ankle-length dress in stretchy rib-knit jersey with a round neckline and long sleeves.", fit: "Slim fit", composition: "Viscose 75%, Polyester 20%, Elastane 5%", isNew: true },
  { title: "Fitted Cotton T-shirt", department: "ladies", subcategory: "Tops & T-shirts", price: 499, colors: [["White", "#f5f5f0"], ["Black", "#1a1a1a"], ["Grey Marl", "#9a9a9a"]], pool: "ladiesTop", sizes: "apparel", description: "Fitted T-shirt in soft cotton jersey with a round neckline and short sleeves. A wardrobe essential.", fit: "Fitted", composition: "Cotton 100%", conscious: true },
  { title: "Ribbed Tank Top", department: "ladies", subcategory: "Tops & T-shirts", price: 599, colors: [["White", "#f5f5f0"], ["Khaki Green", "#6b6b47"]], pool: "ladiesTop", sizes: "apparel", description: "Fitted vest top in ribbed cotton-blend jersey with a high neckline and racer back.", fit: "Fitted", composition: "Cotton 95%, Elastane 5%" },
  { title: "Oversized Printed T-shirt", department: "ladies", subcategory: "Tops & T-shirts", price: 799, colors: [["Washed Black", "#2d2d2d"], ["Light Beige", "#e8dcc7"]], pool: "ladiesTop", sizes: "apparel", description: "Oversized T-shirt in heavyweight cotton jersey with a print motif, dropped shoulders and a ribbed neckline.", fit: "Oversized fit", composition: "Cotton 100%", isNew: true },
  { title: "Linen-blend Shirt", department: "ladies", subcategory: "Shirts & Blouses", price: 1999, colors: [["White", "#f5f5f0"], ["Light Blue", "#b5cbe0"], ["Beige", "#d8c3a5"]], pool: "blouse", sizes: "apparel", description: "Relaxed shirt in an airy linen blend with a collar, buttons down the front and a yoke at the back.", fit: "Relaxed fit", composition: "Linen 52%, Viscose 48%", conscious: true },
  { title: "Puff-sleeve Poplin Blouse", department: "ladies", subcategory: "Shirts & Blouses", price: 1499, originalPrice: 2299, colors: [["White", "#f5f5f0"], ["Light Yellow", "#f3e7a4"]], pool: "blouse", sizes: "apparel", description: "Blouse in cotton poplin with a frilled collar, covered buttons and voluminous puff sleeves.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Oversized Hoodie", department: "ladies", subcategory: "Sweatshirts & Hoodies", price: 1799, colors: [["Grey Marl", "#9a9a9a"], ["Dusty Pink", "#d4a5a5"], ["Black", "#1a1a1a"]], pool: "hoodie", sizes: "apparel", description: "Oversized hoodie in soft sweatshirt fabric with a lined drawstring hood, kangaroo pocket and brushed inside.", fit: "Oversized fit", composition: "Cotton 80%, Polyester 20%" },
  { title: "Fine-knit Cardigan", department: "ladies", subcategory: "Cardigans & Knitwear", price: 1999, colors: [["Cream", "#efe6d2"], ["Dark Brown", "#4a3426"]], pool: "knit", sizes: "apparel", description: "Fitted cardigan in a fine knit with a V-neck, buttons down the front and ribbed trims.", fit: "Fitted", composition: "Viscose 50%, Polyamide 30%, Polyester 20%" },
  { title: "Cable-knit Jumper", department: "ladies", subcategory: "Cardigans & Knitwear", price: 2499, originalPrice: 3299, colors: [["Light Beige", "#e8dcc7"], ["Burgundy", "#6d1f2c"]], pool: "knit", sizes: "apparel", description: "Relaxed jumper in a soft cable knit with dropped shoulders and ribbing around the neckline, cuffs and hem.", fit: "Relaxed fit", composition: "Acrylic 60%, Wool 20%, Polyamide 20%" },
  { title: "Oversized Double-breasted Blazer", department: "ladies", subcategory: "Blazers & Coats", price: 3999, colors: [["Black", "#1a1a1a"], ["Beige", "#d8c3a5"], ["Grey Check", "#8a8a8a"]], pool: "coat", sizes: "apparel", description: "Oversized double-breasted blazer in woven fabric with peak lapels, flap front pockets and padded shoulders.", fit: "Oversized fit", composition: "Polyester 66%, Viscose 30%, Elastane 4%", isNew: true },
  { title: "Wool-blend Coat", department: "ladies", subcategory: "Blazers & Coats", price: 3499, originalPrice: 4999, colors: [["Camel", "#b08355"], ["Black", "#1a1a1a"]], pool: "coat", sizes: "apparel", description: "Knee-length coat in a felted wool blend with notch lapels, a concealed button placket and side pockets.", fit: "Straight fit", composition: "Polyester 52%, Wool 40%, Viscose 8%" },
  { title: "Wide High Jeans", department: "ladies", subcategory: "Jeans & Trousers", price: 2299, colors: [["Light Denim Blue", "#9db4cf"], ["Black", "#1a1a1a"]], pool: "denim", sizes: "waist", description: "5-pocket jeans in rigid cotton denim with a high waist, zip fly and wide, straight legs.", fit: "Wide leg", composition: "Cotton 100%", conscious: true },
  { title: "Tailored Linen-blend Trousers", department: "ladies", subcategory: "Jeans & Trousers", price: 1999, colors: [["Beige", "#d8c3a5"], ["White", "#f5f5f0"], ["Black", "#1a1a1a"]], pool: "denim", sizes: "waist", description: "Tailored trousers in a linen-blend weave with a high waist, pressed pleats and straight, wide legs.", fit: "Wide leg", composition: "Linen 55%, Viscose 45%", conscious: true },
  { title: "Satin Midi Skirt", department: "ladies", subcategory: "Skirts & Co-ords", price: 1799, colors: [["Champagne", "#e8d3b0"], ["Dark Green", "#24402f"]], pool: "skirt", sizes: "apparel", description: "Calf-length skirt in satin with a concealed elasticated waist and a gently flared, bias-cut shape.", fit: "Regular fit", composition: "Polyester 100%" },
  { title: "Linen-blend Co-ord Set", department: "ladies", subcategory: "Skirts & Co-ords", price: 2999, colors: [["Off White", "#f1ede2"], ["Rust", "#a4532f"]], pool: "skirt", sizes: "apparel", description: "Two-piece co-ord in a linen blend: a cropped short-sleeved shirt and matching wide pull-on trousers.", fit: "Relaxed fit", composition: "Linen 55%, Cotton 45%", isNew: true, conscious: true },

  // ───────────── MEN ─────────────
  { title: "Loose Fit Cotton T-shirt", department: "men", subcategory: "Oversized T-shirts", price: 799, colors: [["White", "#f5f5f0"], ["Black", "#1a1a1a"], ["Dark Green", "#24402f"]], pool: "menTee", sizes: "apparel", description: "Loose-fit T-shirt in heavyweight cotton jersey with a ribbed crew neck and dropped shoulders.", fit: "Loose fit", composition: "Cotton 100%", conscious: true },
  { title: "Oversized Printed T-shirt", department: "men", subcategory: "Oversized T-shirts", price: 999, colors: [["Washed Black", "#2d2d2d"], ["Cream", "#efe6d2"]], pool: "menTee", sizes: "apparel", description: "Oversized T-shirt in cotton jersey with a graphic print on the front and back.", fit: "Oversized fit", composition: "Cotton 100%", isNew: true },
  { title: "Regular Fit Crew-neck T-shirt 3-pack", department: "men", subcategory: "Oversized T-shirts", price: 1299, colors: [["White/Grey/Black", "#c8c8c8"], ["Navy/Olive/Beige", "#3a4a5c"]], pool: "menTee", sizes: "apparel", description: "Three regular-fit T-shirts in soft cotton jersey with a round neckline.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Regular Fit Linen Shirt", department: "men", subcategory: "Linen & Casual Shirts", price: 2299, colors: [["White", "#f5f5f0"], ["Light Blue", "#b5cbe0"], ["Beige", "#d8c3a5"]], pool: "menShirt", sizes: "apparel", description: "Regular-fit shirt in airy linen with a turn-down collar, classic front and yoke at the back.", fit: "Regular fit", composition: "Linen 100%", conscious: true },
  { title: "Relaxed Fit Resort Shirt", department: "men", subcategory: "Linen & Casual Shirts", price: 1799, originalPrice: 2499, colors: [["Black Floral", "#2b2b2b"], ["Sand", "#cdb891"]], pool: "menShirt", sizes: "apparel", description: "Relaxed-fit short-sleeved shirt in a viscose weave with a resort collar and straight hem.", fit: "Relaxed fit", composition: "Viscose 100%" },
  { title: "Regular Fit Oxford Shirt", department: "men", subcategory: "Linen & Casual Shirts", price: 1499, colors: [["Light Blue", "#b5cbe0"], ["White", "#f5f5f0"]], pool: "menShirt", sizes: "apparel", description: "Regular-fit shirt in cotton Oxford with a button-down collar and a chest pocket.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Relaxed Fit Hoodie", department: "men", subcategory: "Hoodies & Sweatshirts", price: 1999, colors: [["Black", "#1a1a1a"], ["Grey Marl", "#9a9a9a"], ["Brown", "#5c4033"]], pool: "hoodie", sizes: "apparel", description: "Relaxed-fit hoodie in cotton-blend sweatshirt fabric with a double-layered hood and kangaroo pocket.", fit: "Relaxed fit", composition: "Cotton 80%, Polyester 20%" },
  { title: "Loose Fit Sweatshirt", department: "men", subcategory: "Hoodies & Sweatshirts", price: 1499, colors: [["Cream", "#efe6d2"], ["Dark Blue", "#1f2c4c"]], pool: "hoodie", sizes: "apparel", description: "Loose-fit sweatshirt with a ribbed crew neck, dropped shoulders and a soft brushed inside.", fit: "Loose fit", composition: "Cotton 70%, Polyester 30%" },
  { title: "Baggy Jeans", department: "men", subcategory: "Baggy Jeans & Cargo Trousers", price: 2499, colors: [["Denim Blue", "#4f6d8f"], ["Washed Black", "#2d2d2d"]], pool: "menTrouser", sizes: "waist", description: "5-pocket baggy jeans in cotton denim with a regular waist and loose, wide legs.", fit: "Baggy fit", composition: "Cotton 100%", isNew: true },
  { title: "Loose Fit Cargo Trousers", department: "men", subcategory: "Baggy Jeans & Cargo Trousers", price: 2299, colors: [["Khaki Green", "#6b6b47"], ["Beige", "#d8c3a5"], ["Black", "#1a1a1a"]], pool: "menTrouser", sizes: "waist", description: "Loose-fit cargo trousers in cotton twill with flap leg pockets and drawstring hems.", fit: "Loose fit", composition: "Cotton 100%" },
  { title: "Slim Jeans", department: "men", subcategory: "Baggy Jeans & Cargo Trousers", price: 1999, originalPrice: 2699, colors: [["Dark Denim Blue", "#2c3e57"], ["Grey", "#6d6d6d"]], pool: "menTrouser", sizes: "waist", description: "5-pocket slim jeans in washed stretch denim with a regular waist and slim legs.", fit: "Slim fit", composition: "Cotton 99%, Elastane 1%" },
  { title: "Regular Fit Denim Jacket", department: "men", subcategory: "Jackets & Blazers", price: 2999, colors: [["Denim Blue", "#4f6d8f"], ["Black", "#1a1a1a"]], pool: "menJacket", sizes: "apparel", description: "Jacket in washed cotton denim with a collar, buttons down the front and flap chest pockets.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Slim Fit Blazer", department: "men", subcategory: "Jackets & Blazers", price: 4499, colors: [["Navy Blue", "#1f2c4c"], ["Black", "#1a1a1a"]], pool: "menJacket", sizes: "apparel", description: "Single-breasted slim-fit blazer in woven fabric with notch lapels and a decorative chest pocket.", fit: "Slim fit", composition: "Polyester 70%, Viscose 28%, Elastane 2%", isNew: true },
  { title: "Padded Bomber Jacket", department: "men", subcategory: "Jackets & Blazers", price: 3499, originalPrice: 4499, colors: [["Black", "#1a1a1a"], ["Olive", "#556b2f"]], pool: "menJacket", sizes: "apparel", description: "Padded bomber jacket in woven fabric with a zip, ribbed trims and side pockets.", fit: "Regular fit", composition: "Polyamide 100%" },
  { title: "Regular Fit Polo Shirt", department: "men", subcategory: "Polo Shirts", price: 1299, colors: [["White", "#f5f5f0"], ["Navy Blue", "#1f2c4c"], ["Light Green", "#a8c3a0"]], pool: "polo", sizes: "apparel", description: "Regular-fit polo shirt in cotton piqué with a ribbed collar and a button placket.", fit: "Regular fit", composition: "Cotton 100%", conscious: true },
  { title: "Regular Fit Knitted Polo Shirt", department: "men", subcategory: "Polo Shirts", price: 1799, colors: [["Beige", "#d8c3a5"], ["Brown", "#5c4033"]], pool: "polo", sizes: "apparel", description: "Knitted polo shirt in a textured cotton blend with a resort collar and short sleeves.", fit: "Regular fit", composition: "Cotton 60%, Viscose 40%", isNew: true },

  // ───────────── KIDS ─────────────
  { title: "Tulle Party Dress", department: "kids", subcategory: "Party Edit 2-8Y", price: 1699, colors: [["Light Pink", "#f4c6cf"], ["Gold", "#d4af37"]], pool: "kids", sizes: "kidsSmall", description: "Sleeveless party dress with a sequinned bodice and a full, multi-layered tulle skirt.", fit: "Regular fit", composition: "Polyester 100%", isNew: true },
  { title: "Sequinned Party Dress", department: "kids", subcategory: "Party Edit 9-14Y", price: 2299, colors: [["Silver", "#c0c0c0"], ["Navy Blue", "#1f2c4c"]], pool: "kids", sizes: "kidsBig", description: "Long-sleeved party dress embroidered with sequins, with a gathered waist and flared skirt.", fit: "Regular fit", composition: "Polyester 95%, Elastane 5%" },
  { title: "Linen-blend Shirt and Shorts Set", department: "kids", subcategory: "Party Edit 2-8Y", price: 1499, colors: [["White", "#f5f5f0"], ["Light Blue", "#b5cbe0"]], pool: "kids", sizes: "kidsSmall", description: "Set with a short-sleeved shirt in a linen blend and matching shorts with an elasticated waist.", fit: "Regular fit", composition: "Linen 55%, Cotton 45%", conscious: true },
  { title: "2-piece Cotton Set", department: "kids", subcategory: "Cotton Sets", price: 999, colors: [["Yellow", "#f3d55b"], ["Light Green", "#a8c3a0"], ["Grey Marl", "#9a9a9a"]], pool: "kids", sizes: "kidsSmall", description: "Set with a printed T-shirt and joggers in soft cotton jersey.", fit: "Regular fit", composition: "Cotton 100%", conscious: true },
  { title: "Printed Cotton T-shirts 3-pack", department: "kids", subcategory: "Tops & T-shirts", price: 1199, originalPrice: 1599, colors: [["Multi Dinosaurs", "#6b8e23"], ["Multi Hearts", "#e88ca0"]], pool: "kids", sizes: "kidsSmall", description: "Three T-shirts in soft cotton jersey with a printed motif on the front.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Wide Leg Jeans", department: "kids", subcategory: "Denim", price: 1499, colors: [["Light Denim Blue", "#9db4cf"], ["Denim Blue", "#4f6d8f"]], pool: "kids", sizes: "kidsBig", description: "5-pocket jeans in cotton denim with an adjustable elasticated waist and wide legs.", fit: "Wide leg", composition: "Cotton 100%" },
  { title: "Denim Dungarees", department: "kids", subcategory: "Denim", price: 1299, colors: [["Denim Blue", "#4f6d8f"]], pool: "kids", sizes: "kidsSmall", description: "Dungarees in soft cotton denim with adjustable straps, a bib pocket and side buttons.", fit: "Relaxed fit", composition: "Cotton 100%" },
  { title: "Hooded Sweatshirt", department: "kids", subcategory: "Tops & T-shirts", price: 1199, colors: [["Grey Marl", "#9a9a9a"], ["Dark Blue", "#1f2c4c"]], pool: "kids", sizes: "kidsBig", description: "Hooded sweatshirt in cotton-blend fabric with a kangaroo pocket and ribbed cuffs.", fit: "Regular fit", composition: "Cotton 80%, Polyester 20%", isNew: true },

  // ───────────── BABY ─────────────
  { title: "Cotton Romper", department: "baby", subcategory: "Rompers", price: 699, colors: [["Light Beige", "#e8dcc7"], ["Light Blue", "#b5cbe0"]], pool: "baby", sizes: "baby", description: "Romper in soft organic cotton jersey with poppers at the shoulder and between the legs.", fit: "Regular fit", composition: "Cotton 100%", conscious: true },
  { title: "Ribbed Romper 2-pack", department: "baby", subcategory: "Rompers", price: 999, colors: [["White/Pink", "#f4c6cf"], ["White/Grey", "#c8c8c8"]], pool: "baby", sizes: "baby", description: "Two short-sleeved rompers in soft ribbed cotton with envelope shoulders.", fit: "Regular fit", composition: "Cotton 95%, Elastane 5%", isNew: true },
  { title: "Muslin Cotton Set", department: "baby", subcategory: "Cotton Sets", price: 1199, colors: [["Sage Green", "#9caf88"], ["Cream", "#efe6d2"]], pool: "baby", sizes: "baby", description: "Two-piece set in airy cotton muslin: a shirt and pull-on trousers.", fit: "Relaxed fit", composition: "Cotton 100%", conscious: true },
  { title: "Fine-knit Baby Cardigan", department: "baby", subcategory: "Knitwear", price: 899, colors: [["Light Yellow", "#f3e7a4"], ["Cream", "#efe6d2"]], pool: "baby", sizes: "baby", description: "Cardigan in a soft, fine cotton knit with buttons down the front and ribbed trims.", fit: "Regular fit", composition: "Cotton 100%" },
  { title: "Baby Denim Dungarees", department: "baby", subcategory: "Denim", price: 1099, originalPrice: 1399, colors: [["Light Denim Blue", "#9db4cf"]], pool: "baby", sizes: "baby", description: "Dungarees in soft cotton denim with adjustable straps and poppers at the crotch.", fit: "Relaxed fit", composition: "Cotton 100%" },
  { title: "Cotton Sleepsuits 3-pack", department: "baby", subcategory: "Cotton Sets", price: 1299, colors: [["Animals Print", "#c9b79c"], ["Stripes", "#9fb3c8"]], pool: "baby", sizes: "baby", description: "Three all-in-one sleepsuits in soft cotton with poppers down the front and foldover cuffs.", fit: "Regular fit", composition: "Cotton 100%", conscious: true },

  // ───────────── LINEA HOME ─────────────
  { title: "Linen Cushion Cover", department: "home", subcategory: "Cushion Covers", price: 799, colors: [["Natural", "#d9cbb0"], ["Light Grey", "#c8c8c8"], ["Terracotta", "#c46a4a"]], pool: "cushion", sizes: "one", description: "Cushion cover in washed linen with a concealed zip. 50x50 cm.", fit: "50x50 cm", composition: "Linen 100%", conscious: true },
  { title: "Washed Linen Duvet Cover Set", department: "home", subcategory: "Bedding", price: 4999, colors: [["White", "#f5f5f0"], ["Light Beige", "#e8dcc7"]], pool: "bedding", sizes: "one", description: "Double duvet cover set in washed linen with a concealed button fastening and two pillowcases.", fit: "Double 200x200 cm", composition: "Linen 100%", conscious: true, isNew: true },
  { title: "Cotton Percale Duvet Cover Set", department: "home", subcategory: "Bedding", price: 2999, originalPrice: 3999, colors: [["White", "#f5f5f0"], ["Grey", "#8a8a8a"]], pool: "bedding", sizes: "one", description: "Duvet cover set in crisp cotton percale with two pillowcases.", fit: "Double 200x200 cm", composition: "Cotton 100%" },
  { title: "Ceramic Vase", department: "home", subcategory: "Vases", price: 1299, colors: [["Off White", "#f1ede2"], ["Dark Brown", "#4a3426"]], pool: "vase", sizes: "one", description: "Tall vase in matt-glazed ceramic with an organic shape. Height 30 cm.", fit: "H 30 cm", composition: "Ceramic 100%" },
  { title: "Small Stoneware Vase", department: "home", subcategory: "Vases", price: 999, colors: [["Beige", "#d8c3a5"], ["Green", "#6b8e6b"]], pool: "vase", sizes: "one", description: "Small vase in reactive-glaze stoneware. Height 15 cm.", fit: "H 15 cm", composition: "Stoneware 100%" },
  { title: "Scented Candle in Glass Holder", department: "home", subcategory: "Candles", price: 699, colors: [["Cashmere Woods", "#cdb891"], ["Linen Breeze", "#e8e4d8"]], pool: "candle", sizes: "one", description: "Scented candle in a glass holder. Burns for approx. 35 hours.", fit: "Ø 8 cm", composition: "Paraffin wax, Glass", isNew: true },
  { title: "Large Scented Candle", department: "home", subcategory: "Candles", price: 1299, colors: [["Sandalwood & Vanilla", "#b08355"]], pool: "candle", sizes: "one", description: "Large three-wick scented candle in a ceramic holder. Burns for approx. 60 hours.", fit: "Ø 12 cm", composition: "Soy wax blend, Ceramic" },
  { title: "Patterned Cotton Rug", department: "home", subcategory: "Rugs", price: 2499, colors: [["Beige/Black", "#cdb891"], ["Grey", "#8a8a8a"]], pool: "rug", sizes: "one", description: "Rectangular rug in woven cotton with a jacquard pattern and fringes at the short sides. 140x200 cm.", fit: "140x200 cm", composition: "Cotton 100%", conscious: true },
  { title: "Jute-blend Rug", department: "home", subcategory: "Rugs", price: 3499, originalPrice: 4499, colors: [["Natural", "#d9cbb0"]], pool: "rug", sizes: "one", description: "Round rug in a braided jute blend. Diameter 120 cm.", fit: "Ø 120 cm", composition: "Jute 70%, Cotton 30%" },

  // ───────────── SPORT (LINEA MOVE) ─────────────
  { title: "QuickDry Training Top", department: "sport", subcategory: "QuickDry Tops", price: 999, colors: [["Black", "#1a1a1a"], ["Light Purple", "#c8b6e2"]], pool: "sportLadies", sizes: "apparel", description: "Fitted sports top in fast-drying QuickDry functional fabric with flatlock seams.", fit: "Fitted", composition: "Polyester 88%, Elastane 12%", conscious: true },
  { title: "QuickDry Seamless Sports Bra", department: "sport", subcategory: "QuickDry Tops", price: 1299, colors: [["Black", "#1a1a1a"], ["Dusty Pink", "#d4a5a5"], ["Sage Green", "#9caf88"]], pool: "sportLadies", sizes: "apparel", description: "Medium-support seamless sports bra in QuickDry with removable inserts.", fit: "Medium support", composition: "Polyamide 92%, Elastane 8%", isNew: true },
  { title: "QuickDry Running Shorts", department: "sport", subcategory: "Running Shorts", price: 1199, colors: [["Black", "#1a1a1a"], ["Dark Blue", "#1f2c4c"]], pool: "sportLadies", sizes: "apparel", description: "Running shorts in QuickDry with an inner brief, elasticated waist and reflective details.", fit: "Regular fit", composition: "Polyester 100%" },
  { title: "High Waist Sports Leggings", department: "sport", subcategory: "Leggings", price: 1499, originalPrice: 1999, colors: [["Black", "#1a1a1a"], ["Dark Brown", "#4a3426"], ["Dark Green", "#24402f"]], pool: "sportLadies", sizes: "apparel", description: "Sports tights in fast-drying QuickDry with a wide high waist and hidden key pocket.", fit: "Skinny fit", composition: "Polyester 78%, Elastane 22%", conscious: true },
  { title: "Track Jacket", department: "sport", subcategory: "Track Jackets", price: 2299, colors: [["Black", "#1a1a1a"], ["Navy Blue", "#1f2c4c"]], pool: "sportMen", sizes: "apparel", description: "Track jacket in QuickDry with a stand-up collar, zip and side pockets.", fit: "Regular fit", composition: "Polyester 100%", isNew: true },
  { title: "QuickDry Running T-shirt", department: "sport", subcategory: "QuickDry Tops", price: 999, colors: [["Grey", "#8a8a8a"], ["Bright Blue", "#2f6ad0"]], pool: "sportMen", sizes: "apparel", description: "Regular-fit running T-shirt in breathable, fast-drying QuickDry mesh.", fit: "Regular fit", composition: "Polyester 100%" },
  { title: "QuickDry Training Shorts", department: "sport", subcategory: "Running Shorts", price: 1199, colors: [["Black", "#1a1a1a"], ["Olive", "#556b2f"]], pool: "sportMen", sizes: "apparel", description: "Training shorts in QuickDry with an elasticated drawstring waist and zipped pocket.", fit: "Regular fit", composition: "Polyester 90%, Elastane 10%" },
  { title: "Tapered Track Pants", department: "sport", subcategory: "Track Jackets", price: 1799, colors: [["Black", "#1a1a1a"], ["Dark Grey", "#4a4a4a"]], pool: "sportMen", sizes: "apparel", description: "Tapered sports trousers in QuickDry with zipped side pockets and zips at the hems.", fit: "Tapered fit", composition: "Polyester 88%, Elastane 12%" },
];

// ── Deterministic helpers ───────────────────────────────────────────────────

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/™/g, "")
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const CARE: Record<Department, string> = {
  ladies: "Machine wash at 30°C. Do not tumble dry. Iron on low heat.",
  men: "Machine wash at 40°C. Medium iron. Do not dry clean.",
  kids: "Machine wash at 40°C. Wash with similar colours.",
  baby: "Machine wash at 40°C. Use a mild detergent. Do not tumble dry.",
  home: "Machine wash at 40°C where applicable. Wipe ceramics and candle holders with a damp cloth.",
  sport: "Machine wash at 40°C. Do not use fabric softener.",
};

/** Builds the full 65-product catalog deterministically (same output every run). */
export function buildCatalog(): Product[] {
  const usedSlugs = new Set<string>();
  const baseDate = Date.UTC(2026, 9, 1); // 1 Oct 2026

  return CATALOG.map((entry, index) => {
    const rand = mulberry32(1000 + index * 97);
    const id = `prd_${String(index + 1).padStart(3, "0")}`;
    let slug = slugify(entry.title);
    if (usedSlugs.has(slug)) slug = `${slug}-${entry.department}`;
    usedSlugs.add(slug);

    const articleNumber = String(1100000000 + ((index + 1) * 7919301) % 899999999).padStart(10, "1").slice(0, 10);
    const pool = PHOTO_POOLS[entry.pool].map((p) => unsplash(p));
    const sizes = SIZES[entry.sizes];

    const variants: ProductVariant[] = entry.colors.map(([colorName, colorHex], ci) => {
      const offset = (index + ci * 2) % pool.length;
      const primary = pool[offset];
      const hover = pool[(offset + 1) % pool.length];
      const gallery = [primary, hover, pool[(offset + 2) % pool.length], pool[(offset + 3) % pool.length]];
      const sizeStocks = sizes.map((size, si) => {
        const isOneSize = entry.sizes === "one";
        let stock = Math.floor(rand() * (isOneSize ? 30 : 18)) + (isOneSize ? 8 : 3);
        // Scarcity scenarios for real-time sell-out testing
        if (index % 4 === 0 && si === 1) stock = 2;
        if (index % 4 === 0 && si === 2 && ci === 0) stock = 1;
        if (index % 5 === 2 && si === sizes.length - 1) stock = 1;
        if (index % 7 === 3 && si === 0 && ci === 0) stock = 0;
        return { size, stock };
      });
      return {
        colorName,
        colorHex,
        imageUrl: primary,
        hoverImageUrl: hover,
        galleryImages: Array.from(new Set(gallery)),
        sizes: sizeStocks,
      };
    });

    const totalStock = variants.reduce((sum, v) => sum + v.sizes.reduce((s, x) => s + x.stock, 0), 0);
    const isSale = typeof entry.originalPrice === "number" && entry.originalPrice > entry.price;
    const createdAt = new Date(baseDate + (entry.isNew ? 30 : index % 25) * 86400000 - index * 3600000).toISOString();

    const product: Product = {
      id,
      slug,
      articleNumber,
      title: entry.title,
      department: entry.department,
      subcategory: entry.subcategory,
      description: entry.description,
      fit: entry.fit,
      composition: entry.composition,
      care: CARE[entry.department],
      price: entry.price,
      originalPrice: isSale ? entry.originalPrice : undefined,
      memberPrice: Math.round((entry.price * 0.9) / 10) * 10 - 1,
      isSale,
      isNewArrival: Boolean(entry.isNew),
      isConscious: Boolean(entry.conscious),
      bestsellerRank: ((index * 37) % CATALOG.length) + 1,
      rating: Math.round((3.8 + rand() * 1.2) * 10) / 10,
      reviewCount: Math.floor(rand() * 480) + 12,
      createdAt,
      primaryImageUrl: variants[0].imageUrl,
      hoverImageUrl: variants[0].hoverImageUrl,
      variants,
      totalStock,
      tags: [entry.department, entry.subcategory, entry.fit, ...entry.colors.map((c) => c[0])].map((t) => t.toLowerCase()),
    };
    return product;
  });
}

// ── Optional online enrichment from public fashion APIs ─────────────────────

async function fetchJson<T>(url: string, timeoutMs = 3500): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface DummyJsonResponse {
  products: { title: string; thumbnail: string; images: string[] }[];
}
interface FakeStoreProduct {
  title: string;
  image: string;
  category: string;
}

/**
 * If the machine is online, pull real product photos from dummyjson.com and
 * fakestoreapi.com and merge them into matching products' gallery images.
 * Never throws – an offline seed simply keeps the curated photos.
 */
export async function mergeExternalFashionPhotos(products: Product[]): Promise<number> {
  const [dresses, tops, menShirts, fakeStore] = await Promise.all([
    fetchJson<DummyJsonResponse>("https://dummyjson.com/products/category/womens-dresses"),
    fetchJson<DummyJsonResponse>("https://dummyjson.com/products/category/womens-tops"),
    fetchJson<DummyJsonResponse>("https://dummyjson.com/products/category/mens-shirts"),
    fetchJson<FakeStoreProduct[]>("https://fakestoreapi.com/products"),
  ]);

  const buckets: { match: (p: Product) => boolean; photos: string[] }[] = [
    {
      match: (p) => p.subcategory === "Dresses",
      photos: (dresses?.products ?? []).flatMap((x) => x.images ?? []).filter(Boolean),
    },
    {
      match: (p) => p.department === "ladies" && ["Tops & T-shirts", "Shirts & Blouses"].includes(p.subcategory),
      photos: [
        ...(tops?.products ?? []).flatMap((x) => x.images ?? []),
        ...(fakeStore ?? []).filter((x) => x.category === "women's clothing").map((x) => x.image),
      ].filter(Boolean),
    },
    {
      match: (p) => p.department === "men" && ["Linen & Casual Shirts", "Oversized T-shirts", "Polo Shirts"].includes(p.subcategory),
      photos: [
        ...(menShirts?.products ?? []).flatMap((x) => x.images ?? []),
        ...(fakeStore ?? []).filter((x) => x.category === "men's clothing").map((x) => x.image),
      ].filter(Boolean),
    },
  ];

  let merged = 0;
  for (const bucket of buckets) {
    if (bucket.photos.length === 0) continue;
    const targets = products.filter(bucket.match);
    targets.forEach((product, ti) => {
      product.variants.forEach((variant, vi) => {
        const photo = bucket.photos[(ti * 2 + vi) % bucket.photos.length];
        if (photo && !variant.galleryImages.includes(photo)) {
          variant.galleryImages.push(photo);
          merged++;
        }
      });
    });
  }
  return merged;
}

// ── Demo LINEA Member ─────────────────────────────────────────────────────────

export function buildDemoMember(): User {
  return {
    id: DEMO_MEMBER_ID,
    memberId: "LN-IN-2026-000001",
    name: "Aanya Sharma",
    email: DEMO_MEMBER_EMAIL,
    phone: "+91 98765 43210",
    passwordHash: hashPassword(DEMO_MEMBER_PASSWORD),
    tier: "Member",
    memberPoints: 620,
    preferredDepartment: "ladies",
    savedSizes: { top: "S", bottom: "28", shoe: "UK 5", chestCm: 86, waistCm: 70, hipCm: 94 },
    shippingAddress: {
      street: "Flat 402, Lotus Residency, 14th Cross Road",
      locality: "Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pinCode: "560038",
    },
    createdAt: new Date(Date.UTC(2025, 5, 15)).toISOString(),
  };
}

/** Creates the demo member if it does not exist yet (never overwrites an existing account). */
export async function ensureDemoMember(): Promise<User> {
  const redis = getRedis();
  const existingId = await redis.get(keys.userByEmail(DEMO_MEMBER_EMAIL));
  if (existingId) {
    const raw = await redis.get(keys.user(existingId));
    if (raw) return JSON.parse(raw) as User;
  }
  const user = buildDemoMember();
  await redis
    .multi()
    .set(keys.user(user.id), JSON.stringify(user))
    .set(keys.userByEmail(user.email), user.id)
    .hset(keys.userMetrics(user.id), { product_views: 0, purchases: 0, total_spent_inr: 0 })
    .sadd(keys.userWishlist(user.id), "prd_001", "prd_014")
    .exec();
  return user;
}

// ── Seeding ─────────────────────────────────────────────────────────────────

async function deleteByPattern(pattern: string): Promise<number> {
  const redis = getRedis();
  let cursor = "0";
  let deleted = 0;
  do {
    const [next, batch] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 500);
    cursor = next;
    if (batch.length) deleted += await redis.del(...batch);
  } while (cursor !== "0");
  return deleted;
}

export interface SeedResult {
  products: number;
  stockHashes: number;
  externalPhotosMerged: number;
  demoMember: string;
  seededAt: string;
}

/**
 * Wipes the catalog keyspace (products, departments, stock) and re-seeds the
 * full 65-item catalog. Users, orders and telemetry are preserved.
 */
export async function seedDatabase(options: { fetchExternal?: boolean } = {}): Promise<SeedResult> {
  const redis = getRedis();
  const products = buildCatalog();
  const externalPhotosMerged = options.fetchExternal === false ? 0 : await mergeExternalFashionPhotos(products);

  await deleteByPattern("hm:product:*");
  await deleteByPattern("hm:stock:*");
  await deleteByPattern("hm:dept:*");
  await redis.del(keys.productsAll);

  const pipeline = redis.multi();
  for (const product of products) {
    pipeline.set(keys.product(product.slug), JSON.stringify(product));
    pipeline.set(keys.productById(product.id), product.slug);
    pipeline.sadd(keys.productsAll, product.id);
    pipeline.sadd(keys.dept(product.department), product.id);

    const stockHash: Record<string, number> = { total: product.totalStock };
    for (const variant of product.variants) {
      for (const s of variant.sizes) {
        stockHash[stockField(variant.colorName, s.size)] = s.stock;
      }
    }
    pipeline.hset(keys.stock(product.id), stockHash);
  }
  pipeline.set("hm:meta:seededAt", new Date().toISOString());
  await pipeline.exec();

  const member = await ensureDemoMember();

  return {
    products: products.length,
    stockHashes: products.length,
    externalPhotosMerged,
    demoMember: member.email,
    seededAt: new Date().toISOString(),
  };
}

declare global {
  // eslint-disable-next-line no-var
  var hmSeedPromise: Promise<unknown> | null | undefined;
}

/** Auto-seed on first boot when SCARD hm:products:all === 0 (concurrency-safe per process). */
export async function ensureSeeded(): Promise<void> {
  const count = await getRedis().scard(keys.productsAll);
  if (count > 0) return;
  if (!globalThis.hmSeedPromise) {
    globalThis.hmSeedPromise = seedDatabase().finally(() => {
      globalThis.hmSeedPromise = null;
    });
  }
  await globalThis.hmSeedPromise;
}
