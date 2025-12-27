/**
 * Message types for the Bob widget chat
 */

export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface HighlightedProduct {
  brand: string;
  price: number;
}
