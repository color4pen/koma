export type Currency = 'JPY';

export type Money = {
  readonly amount: number;
  readonly currency: Currency;
};

export function createMoney(amount: number, currency: Currency): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(
      `Money amount must be an integer (smallest currency unit), got: ${amount}`,
    );
  }
  return Object.freeze({ amount, currency });
}

export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot add ${a.currency} and ${b.currency}`,
    );
  }
  return createMoney(a.amount + b.amount, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot subtract ${b.currency} from ${a.currency}`,
    );
  }
  return createMoney(a.amount - b.amount, a.currency);
}

export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    throw new Error(
      `Currency mismatch: cannot compare ${a.currency} and ${b.currency}`,
    );
  }
  return a.amount - b.amount;
}

export function isEqualMoney(a: Money, b: Money): boolean {
  return a.amount === b.amount && a.currency === b.currency;
}
