export interface Product {
  id: string;
  image: string;
  name: string;
  partNumber: string;
  price: number;
  inStock: boolean;
}

export const PLACEHOLDER_PRODUCTS: Product[] = [
  {
    id: "1",
    image: "/placeholder.svg",
    name: "Oil Filter",
    partNumber: "OF-12345",
    price: 12.99,
    inStock: true
  },
  {
    id: "2",
    image: "/placeholder.svg",
    name: "Air Filter",
    partNumber: "AF-67890",
    price: 15.99,
    inStock: true
  },
  {
    id: "3",
    image: "/placeholder.svg",
    name: "Brake Pads",
    partNumber: "BP-11223",
    price: 45.99,
    inStock: true
  },
  {
    id: "4",
    image: "/placeholder.svg",
    name: "Spark Plugs",
    partNumber: "SP-44556",
    price: 8.99,
    inStock: false
  },
  {
    id: "5",
    image: "/placeholder.svg",
    name: "Wiper Blades",
    partNumber: "WB-77889",
    price: 19.99,
    inStock: true
  },
  {
    id: "6",
    image: "/placeholder.svg",
    name: "Battery",
    partNumber: "BT-99001",
    price: 89.99,
    inStock: true
  },
  {
    id: "7",
    image: "/placeholder.svg",
    name: "Coolant",
    partNumber: "CL-22334",
    price: 14.99,
    inStock: true
  },
  {
    id: "8",
    image: "/placeholder.svg",
    name: "Transmission Fluid",
    partNumber: "TF-55667",
    price: 22.99,
    inStock: true
  },
  {
    id: "9",
    image: "/placeholder.svg",
    name: "Headlight Bulbs",
    partNumber: "HB-88990",
    price: 24.99,
    inStock: true
  }
];
