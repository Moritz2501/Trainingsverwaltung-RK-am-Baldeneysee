import { Prisma } from "@prisma/client";

const SCHEMA_MISMATCH_ERROR_CODES = new Set(["P2021", "P2022"]);

export function isPrismaSchemaMismatchError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && SCHEMA_MISMATCH_ERROR_CODES.has(error.code);
}
