export type Id<Brand extends string> = string & { readonly __brand: Brand };

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createId<B extends string>(): Id<B> {
  return crypto.randomUUID() as Id<B>;
}

export function parseId<B extends string>(raw: string): Id<B> {
  if (!UUID_V4_REGEX.test(raw)) {
    throw new Error(`Invalid UUID v4: "${raw}"`);
  }
  return raw as Id<B>;
}

export function isEqualId(a: Id<string>, b: Id<string>): boolean {
  return a === b;
}
