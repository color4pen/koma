import { type Id, createId } from '@koma/shared';
import { type ContactInfo } from './contact-info.js';

export type CustomFieldValue = string | number | boolean;

export type Customer = {
  readonly id: Id<'Customer'>;
  readonly name: string;
  readonly contact: ContactInfo;
  readonly tags: readonly string[];
  readonly notes: string;
  readonly customFields: Readonly<Record<string, CustomFieldValue>>;
};

export function createCustomer(params: {
  id?: Id<'Customer'>;
  name: string;
  contact: ContactInfo;
  tags?: readonly string[];
  notes?: string;
  customFields?: Record<string, CustomFieldValue>;
}): Customer {
  const tags = Object.freeze([...(params.tags ?? [])]);
  const customFields = Object.freeze({ ...(params.customFields ?? {}) });

  return Object.freeze({
    id: params.id ?? createId<'Customer'>(),
    name: params.name,
    contact: params.contact,
    tags,
    notes: params.notes ?? '',
    customFields,
  });
}

export function updateCustomer(
  customer: Customer,
  patch: Partial<
    Pick<Customer, 'name' | 'contact' | 'tags' | 'notes' | 'customFields'>
  >,
): Customer {
  return createCustomer({
    id: customer.id,
    name: patch.name ?? customer.name,
    contact: patch.contact ?? customer.contact,
    tags: patch.tags ?? customer.tags,
    notes: patch.notes ?? customer.notes,
    customFields:
      patch.customFields !== undefined
        ? patch.customFields
        : customer.customFields,
  });
}
