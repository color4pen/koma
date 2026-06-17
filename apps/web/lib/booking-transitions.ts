import { ALLOWED_TRANSITIONS, type BookingStatus } from '@koma/scheduling';

export function allowedTransitions(status: BookingStatus): BookingStatus[] {
  const set = ALLOWED_TRANSITIONS.get(status);
  if (!set || set.size === 0) return [];
  return Array.from(set);
}

const LABELS: Record<BookingStatus, string> = {
  pending: '保留',
  confirmed: '確定',
  cancelled: 'キャンセル',
  completed: '完了',
  'no-show': '来店なし',
};

export function transitionLabel(status: BookingStatus): string {
  return LABELS[status];
}
