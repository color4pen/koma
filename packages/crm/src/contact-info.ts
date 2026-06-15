export type ContactInfo = {
  readonly phone: string | null;
  readonly email: string | null;
};

export function createContactInfo(params: {
  phone?: string | null;
  email?: string | null;
}): ContactInfo {
  const phone = params.phone || null;
  const email = params.email || null;

  if (phone === null && email === null) {
    throw new Error(
      'ContactInfo requires at least one of phone or email',
    );
  }

  return Object.freeze({ phone, email });
}
