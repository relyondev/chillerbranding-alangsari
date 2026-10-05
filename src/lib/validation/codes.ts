import { z } from "zod";

export const salesmanPart1Schema = z.string().regex(/^\d{4}$/, "Bagian pertama wajib 4 digit.");
export const salesmanPart2Schema = z.string().regex(/^\d{3}$/, "Bagian kedua wajib 3 digit.");
export const salesmanPart3Schema = z
  .string()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^S\d{1,5}$/, "Bagian ketiga wajib S diikuti 1–5 angka."));

export const storeCodePart1Schema = z.string().regex(/^\d{4}$/, "Bagian pertama kode toko wajib 4 digit.");
export const storeCodePart2Schema = z.string().regex(/^\d{3}$/, "Bagian kedua kode toko wajib 3 digit.");
export const storeCodePart3Schema = z.string().regex(/^\d{2,6}$/, "Bagian ketiga kode toko wajib 2–6 digit.");
export const storeCodeSchema = z.string().regex(/^\d{4}\/\d{3}\/\d{2,6}$/, "Kode toko wajib format 4/3/2–6 digit.");

export function buildSalesmanCode(part1: string, part2: string, part3: string) {
  return `${part1}/${part2}/${part3.toUpperCase()}`;
}

export function buildStoreCode(part1: string, part2: string, part3: string) {
  return `${part1}/${part2}/${part3}`;
}
