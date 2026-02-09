// models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

interface IUser extends mongoose.Document {
  name: string;
  email: string;
  password: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    pincode?: string;
    phone?: string;
  };
  role: "user" | "admin";
  comparePassword(userPassword: string): Promise<boolean>;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
      select: false,
    },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: String,
      phone: String,
    },
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 10);
});

// Compare password method
userSchema.methods.comparePassword = async function (userPassword: string) {
  console.log("Comparing passwords:", userPassword, this.password);
  return await bcrypt.compare(userPassword, this.password);
};

export default mongoose.model("User", userSchema);
