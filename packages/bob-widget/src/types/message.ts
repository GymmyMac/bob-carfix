/**
 * Message types for the Bob widget chat
 */

import type { Product } from "./product";

export interface QuickReply {
  /** Button label, e.g. "View Brake Pads" */
  label: string;
  /** Navigation URL, e.g. "/products/brake-pads" */
  url: string;
}

export interface Message {
  role: "user" | "assistant";
  content: string;
  /** Products Bob is specifically recommending in this message */
  suggestedProducts?: Product[];
  /** Custom header for suggestions (e.g., "Wipers for your 2018 Toyota Rav 4") */
  suggestionsTitle?: string;
  /** Navigation CTA buttons — tap fires onNavigate(url), no chat message sent */
  quickReplies?: QuickReply[];
}

export interface HighlightedProduct {
  brand: string;
  price: number;
}
