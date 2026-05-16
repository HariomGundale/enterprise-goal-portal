import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { UserRole } from "@/types";

const userSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    employeeId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["employee", "manager", "admin"] satisfies UserRole[],
      required: true,
    },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true },
    managerId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true },
);

userSchema.index({ orgId: 1, managerId: 1 });
userSchema.index({ orgId: 1, departmentId: 1 });

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", userSchema);
