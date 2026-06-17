type DashboardDeps = {
  customerRepo: { list(): Promise<unknown[]> };
  resourceRepo: { list(): Promise<unknown[]> };
  serviceRepo: { list(): Promise<unknown[]> };
  bookingRepo: { list(): Promise<unknown[]> };
};

export type DashboardCounts = {
  customers: number;
  resources: number;
  services: number;
  bookings: number;
};

export async function getDashboardCounts(deps: DashboardDeps): Promise<DashboardCounts> {
  const [customers, resources, services, bookings] = await Promise.all([
    deps.customerRepo.list(),
    deps.resourceRepo.list(),
    deps.serviceRepo.list(),
    deps.bookingRepo.list(),
  ]);

  return {
    customers: customers.length,
    resources: resources.length,
    services: services.length,
    bookings: bookings.length,
  };
}
