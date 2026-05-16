import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const organizationSchema = new Schema(
  {
    name: { type: String, required: true },
    domain: { type: String, required: true },
    settings: {
      maxGoalsPerEmployee: { type: Number, default: 8 },
      minGoalWeightage: { type: Number, default: 10 },
      requireApproval: { type: Boolean, default: true },
    },
  },
  { timestamps: true },
);

export type OrganizationDocument = InferSchemaType<typeof organizationSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Organization: Model<OrganizationDocument> =
  mongoose.models.Organization ??
  mongoose.model<OrganizationDocument>("Organization", organizationSchema);
