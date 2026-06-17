'use client';

import { useActionState } from 'react';

import type { ActionState } from './actions';
import { createBookingAction } from './actions';

type Props = {
  customers: Array<{ id: string; name: string }>;
  services: Array<{ id: string; name: string }>;
  resources: Array<{ id: string; name: string }>;
};

export default function BookingForm({ customers, services, resources }: Props) {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createBookingAction,
    null,
  );

  return (
    <div>
      <h2>予約登録</h2>
      {state?.ok === true && <p>予約が完了しました。</p>}
      <form action={formAction}>
        <div>
          <label htmlFor="customerId">顧客（必須）</label>
          <select id="customerId" name="customerId" required>
            <option value="">選択してください</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          {state?.ok === false && state.errors.customerId && (
            <ul>
              {state.errors.customerId.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="serviceId">サービス（必須）</label>
          <select id="serviceId" name="serviceId" required>
            <option value="">選択してください</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          {state?.ok === false && state.errors.serviceId && (
            <ul>
              {state.errors.serviceId.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="resourceId">リソース（必須）</label>
          <select id="resourceId" name="resourceId" required>
            <option value="">選択してください</option>
            {resources.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
          {state?.ok === false && state.errors.resourceId && (
            <ul>
              {state.errors.resourceId.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="startAt">開始日時（必須）</label>
          <input id="startAt" name="startAt" type="datetime-local" required />
          {state?.ok === false && state.errors.startAt && (
            <ul>
              {state.errors.startAt.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        {state?.ok === false && state.errors._form && (
          <ul>
            {state.errors._form.map((msg, i) => (
              <li key={i} style={{ color: 'red' }}>
                {msg}
              </li>
            ))}
          </ul>
        )}

        <button type="submit" disabled={isPending}>
          {isPending ? '予約中...' : '予約する'}
        </button>
      </form>
    </div>
  );
}
