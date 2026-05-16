import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const departmentSchema = new Schema(
  {
    orgId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    name: { type: String, required: true },
    code: { type: String, required: true },
    headId: { type: Schema.Types.ObjectId, ref: "User" },
    parentDeptId: { type: Schema.Types.ObjectId, ref: "Department", default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

departmentSchema.index({ orgId: 1, code: 1 }, { unique: true });

export type DepartmentDocument = InferSchemaType<typeof departmentSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Department: Model<DepartmentDocument> =
  mongoose.models.Department ??
  mongoose.model<DepartmentDocument>("Department", departmentSchema);
