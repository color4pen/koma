export type Duration = {
  readonly milliseconds: number;
};

export function ofMilliseconds(ms: number): Duration {
  if (!Number.isInteger(ms)) {
    throw new Error(`Duration milliseconds must be an integer, got: ${ms}`);
  }
  if (ms < 0) {
    throw new Error(`Duration must be non-negative, got: ${ms}`);
  }
  return Object.freeze({ milliseconds: ms });
}

export function ofMinutes(minutes: number): Duration {
  return ofMilliseconds(minutes * 60_000);
}

export function ofHours(hours: number): Duration {
  return ofMilliseconds(hours * 3_600_000);
}

export function toMilliseconds(d: Duration): number {
  return d.milliseconds;
}

export function toMinutes(d: Duration): number {
  return d.milliseconds / 60_000;
}

export function isEqualDuration(a: Duration, b: Duration): boolean {
  return a.milliseconds === b.milliseconds;
}
