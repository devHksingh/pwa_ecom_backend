import mongoose from "mongoose";

interface IProduct extends mongoose.Document {
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  category:
    | "electronics"
    | "clothing"
    | "food"
    | "books"
    | "other"
    | "beauty"
    | "furniture"
    | "toys"
    | "shoes";
  stock: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new mongoose.Schema<IProduct>(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: 0,
    },
    imageUrl: {
      type: String,
      required: [true, "Product image is required"],
    },
    category: {
      type: String,
      enum: [
        "electronics",
        "clothing",
        "food",
        "books",
        "other",
        "beauty",
        "furniture",
        "toys",
        "shoes",
      ],
      default: "other",
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Product", productSchema);
