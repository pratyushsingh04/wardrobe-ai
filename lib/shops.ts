import type { ShopLink } from "./types";

// These open each store's own search results for the query. They are not affiliate or product links.
export function shopLinks(query: string): ShopLink[] {
  const q = query.trim();
  const encoded = encodeURIComponent(q);
  return [
    {
      store: "Myntra",
      url: `https://www.myntra.com/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
    },
    { store: "Amazon", url: `https://www.amazon.in/s?k=${encoded}` },
    { store: "Flipkart", url: `https://www.flipkart.com/search?q=${encoded}` },
    { store: "Ajio", url: `https://www.ajio.com/search/?text=${encoded}` },
  ];
}

// Same idea for hair, makeup and grooming products.
export function beautyLinks(query: string): ShopLink[] {
  const q = query.trim();
  const encoded = encodeURIComponent(q);
  return [
    { store: "Nykaa", url: `https://www.nykaa.com/search/result/?q=${encoded}` },
    { store: "Amazon", url: `https://www.amazon.in/s?k=${encoded}` },
    { store: "Purplle", url: `https://www.purplle.com/search?q=${encoded}` },
    {
      store: "Myntra",
      url: `https://www.myntra.com/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, "-"))}`,
    },
  ];
}
