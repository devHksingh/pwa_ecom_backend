import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { randomInt } from "node:crypto";

interface IOtp {
  user: mongoose.Types.ObjectId;
  otpCreatedAt: Date;
  otpExpiredAt: Date;
  otp: string;
  attempts: number;
  attemptWindowStart: Date;
  lastRequestTime?: Date;
  //instance methods
  compareOtp(userOtp: string): Promise<boolean>;
  isExpired(): boolean;
  generateOtpExpTime(): void;
}
interface IOtpModel extends mongoose.Model<IOtp> {
  // Static methods
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

// hash otp before saveing
otpSchema.pre("save", async function () {
  if (!this.isModified("otp")) {
    return;
  }
  this.otp = await bcrypt.hash(this.otp, 11);
});
// method for setting otp expierd time
otpSchema.methods.generateOtpExpTime = function () {
  // 30 min from genrate otp
  const expTime = this.otpCreatedAt.getTime() + 30 * 60 * 1000;
  this.otpExpiredAt = new Date(expTime);
};
// compare otp
otpSchema.methods.compareOtp = async function (userOtp: string) {
  return await bcrypt.compare(userOtp, this.otp);
};

/**
 * in db store hash version of otp
 * for user send un hash otp via email
 * genrate 6 digit send to user without hash version via email.
 *
 */

// otpSchema.static.generateOtp = function (noOfDigit: number) {
//     const otp = []
//     for (let n = 0; n < noOfDigit; n++) {
//         const randomDigit = randomInt(0, 10)
//         otp.push(randomDigit)

//     }
//     return otp.join("")
// }

otpSchema.static("generateOtp", function (noOfDigit: number) {
  const otp = [];
  for (let n = 0; n < noOfDigit; n++) {
    const randomDigit = randomInt(0, 10);
    otp.push(randomDigit);
  }
  return otp.join("");
});

// method for check is otp exp
otpSchema.methods.isExpired = function (): boolean {
  return new Date() > this.otpExpiredAt;
};

export default mongoose.model<IOtp, IOtpModel>("Otp", otpSchema);
