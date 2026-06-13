import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  images: string[];
  category: 'hoodie' | 'tshirt' | 'accessory';
  sizes: string[];
  colors: string[];
  stock: number;
  featured: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema: Schema = new Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Product slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      required: [true, 'Product description is required'],
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: 0,
    },
    comparePrice: {
      type: Number,
      min: 0,
    },
    images: {
      type: [String],
      required: [true, 'At least one product image is required'],
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      enum: ['hoodie', 'tshirt', 'accessory'],
    },
    sizes: {
      type: [String],
      required: [true, 'Product sizes are required'],
    },
    colors: {
      type: [String],
      required: [true, 'Product colors are required'],
    },
    stock: {
      type: Number,
      required: [true, 'Product stock is required'],
      min: 0,
      default: 0,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);
