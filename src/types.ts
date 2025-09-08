export type ImageSet = { big: string; middle: string; thumbnail: string };

export type Variant = {
  id: string;
  name: string;
  price: number;
  image: string;
  images?: ImageSet[];
  color?: { name: string; hex: string };
};

export type Product = Variant & {
  description: string;
  category: string[];
  products?: Variant[];
};
