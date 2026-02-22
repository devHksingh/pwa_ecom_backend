import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

// Interface for OTP document (instance)
interface IOtp {
  user: mongoose.Types.ObjectId;
  otpCreatedAt: Date;
  otpExpiredAt: Date;
  otp: string;
  attempts: number;
  attemptWindowStart: Date;
  lastRequestTime?: Date;

  // Instance methods
  compareOtp(userOtp: string): Promise<boolean>;
  isExpired(): boolean;
}

// Interface for OTP model (static)
interface IOtpModel extends mongoose.Model<IOtp> {
  generateOtp(noOfDigit: number): string;
}

const otpSchema = new mongoose.Schema<IOtp, IOtpModel>(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otpCreatedAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
    otpExpiredAt: {
      type: Date,
      required: true,
    },
    otp: {
      type: String,
      required: true,
    },
    attempts: {
      type: Number,
      required: true,
      default: 0,
    },
    attemptWindowStart: {
      type: Date,
      default: Date.now,
    },
    lastRequestTime: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Pre-save hook: Hash OTP before saving
otpSchema.pre("save", async function () {
  if (!this.isModified("otp")) {
    return;
  }
  this.otp = await bcrypt.hash(this.otp, 11);
});

// Instance method: Compare OTP
otpSchema.methods.compareOtp = async function (
  userOtp: string
): Promise<boolean> {
  return await bcrypt.compare(userOtp, this.otp);
};

// Instance method: Check if OTP is expired
otpSchema.methods.isExpired = function (): boolean {
  return new Date() > this.otpExpiredAt;
};

// Static method: Generate random OTP
otpSchema.static("generateOtp", function (noOfDigit: number): string {
  const otp = [];
  for (let n = 0; n < noOfDigit; n++) {
    const randomDigit = randomInt(0, 10);
    otp.push(randomDigit);
  }
  return otp.join("");
});

export default mongoose.model<IOtp, IOtpModel>("Otp", otpSchema);
