import { Prisma } from "@prisma/client";

const SCHEMA_MISMATCH_ERROR_CODES = new Set(["P2021", "P2022"]);
const CONNECTION_ERROR_CODES = new Set(["P1001"]);

export function isPrismaSchemaMismatchError(error: unknown): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError && SCHEMA_MISMATCH_ERROR_CODES.has(error.code);
}

export function isPrismaConnectionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError && CONNECTION_ERROR_CODES.has(error.code)) {
    return true;
  }

  if (error instanceof Prisma.PrismaClientInitializationError) {
    return true;
  }

  if (error instanceof Error && /Can't reach database server|database server was reached but timed out/i.test(error.message)) {
    return true;
  }

  return false;
}
