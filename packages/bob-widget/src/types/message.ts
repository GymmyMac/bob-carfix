/**
 * Message types for the Bob widget chat
 */

import type { Product } from "./product";

export interface Message {
  role: "user" | "assistant";
  content: string;
  /** Products Bob is specifically recommending in this message */
  suggestedProducts?: Product[];
  /** Custom header for suggestions (e.g., "Wipers for your 2018 Toyota Rav 4") */
  suggestionsTitle?: string;
}

export interface HighlightedProduct {
  brand: string;
  price: number;
}
