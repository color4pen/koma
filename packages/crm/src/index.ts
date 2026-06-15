export type { Customer, CustomFieldValue } from './customer.js';
export { createCustomer, updateCustomer } from './customer.js';

export type { ContactInfo } from './contact-info.js';
export { createContactInfo } from './contact-info.js';

export type { CustomerRepository } from './port/customer-repository.js';

export { createInMemoryCustomerRepository } from './in-memory-customer-repository.js';
