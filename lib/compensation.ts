import { Prisma } from "@prisma/client";

type EventLike = {
  endDate: Date;
  durationHours: Prisma.Decimal;
};

type CompensationLike = {
  hourlyRate: Prisma.Decimal;
  totalPaid: Prisma.Decimal;
  lastPayoutAt: Date | null;
};

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  if (!value) {
    return 0;
  }
  return Number(value.toString());
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function computeCompensationSummary(
  events: EventLike[],
  compensation: CompensationLike | null,
) {
  const hourlyRate = decimalToNumber(compensation?.hourlyRate);
  const totalHours = events.reduce((sum, event) => sum + decimalToNumber(event.durationHours), 0);
  const totalEarned = roundCurrency(totalHours * hourlyRate);

  const lastPayoutAt = compensation?.lastPayoutAt ?? null;
  const hoursSincePayout = events
    .filter((event) => (lastPayoutAt ? event.endDate > lastPayoutAt : true))
    .reduce((sum, event) => sum + decimalToNumber(event.durationHours), 0);
  const earnedSincePayout = roundCurrency(hoursSincePayout * hourlyRate);

  const totalPaid = decimalToNumber(compensation?.totalPaid);

  return {
    hourlyRate,
    totalHours: roundCurrency(totalHours),
    totalEarned,
    hoursSincePayout: roundCurrency(hoursSincePayout),
    earnedSincePayout,
    totalPaid,
    lastPayoutAt,
  };
}

export function formatEuro(value: number) {
  return new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(value);
}
