import { z } from "zod";

export const salesmanPart1Schema = z.string().regex(/^\d{4}$/, "Bagian pertama wajib 4 digit.");
export const salesmanPart2Schema = z.string().regex(/^\d{3}$/, "Bagian kedua wajib 3 digit.");
export const salesmanPart3Schema = z
  .string()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z][A-Z0-9]{2,3}$/, "Bagian ketiga harus 3–4 karakter, diawali huruf."));

export const storeCodePart1Schema = z.string().regex(/^\d{4}$/, "Bagian pertama kode toko wajib 4 digit.");
export const storeCodePart2Schema = z.string().regex(/^\d{3}$/, "Bagian kedua kode toko wajib 3 digit.");
export const storeCodePart3Schema = z.string().regex(/^\d{3,4}$/, "Bagian ketiga kode toko wajib 3–4 digit.");
export const storeCodeSchema = z.string().regex(/^\d{4}\/\d{3}\/\d{3,4}$/, "Kode toko wajib format 4/3/3–4 digit.");

export function buildSalesmanCode(part1: string, part2: string, part3: string) {
  return `${part1}/${part2}/${part3.toUpperCase()}`;
}

export function buildStoreCode(part1: string, part2: string, part3: string) {
  return `${part1}/${part2}/${part3}`;
}
