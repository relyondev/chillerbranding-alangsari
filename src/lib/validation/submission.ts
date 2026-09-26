import { z } from "zod";
import { salesmanPart1Schema, salesmanPart2Schema, salesmanPart3Schema, storeCodeSchema } from "./codes";

export const submissionDraftSchema = z.object({
  stockpointId: z.string().uuid(),
  salesmanPart1: salesmanPart1Schema,
  salesmanPart2: salesmanPart2Schema,
  salesmanPart3: salesmanPart3Schema,
  storeCode: storeCodeSchema,
  storeName: z.string().trim().min(2).max(150),
  ownerName: z.string().trim().min(2).max(150),
  ownerPhone: z.string().trim().min(8).max(20),
  storeAddress: z.string().trim().min(5).max(500),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracyMeters: z.number().nonnegative(),
  storeType: z.enum(["grosir", "warung"]),
  hasChiller: z.boolean(),
  brandingStatus: z.enum(["brandable", "not_brandable"]),
  notBrandableReason: z.string().trim().max(1000).nullable(),
});

export type SubmissionDraftInput = z.infer<typeof submissionDraftSchema>;
