'use client';

import { useActionState } from 'react';

import type { ActionState } from './actions';
import { createCustomerAction } from './actions';

export default function CustomerForm() {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createCustomerAction,
    null,
  );

  return (
    <div>
      <h2>顧客登録</h2>
      {state?.ok === true && <p>登録が完了しました。</p>}
      <form action={formAction}>
        <div>
          <label htmlFor="name">名前（必須）</label>
          <input id="name" name="name" type="text" required />
          {state?.ok === false && state.errors.name && (
            <ul>
              {state.errors.name.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="phone">電話番号</label>
          <input id="phone" name="phone" type="tel" />
          {state?.ok === false && state.errors.phone && (
            <ul>
              {state.errors.phone.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="email">メールアドレス</label>
          <input id="email" name="email" type="email" />
          {state?.ok === false && state.errors.email && (
            <ul>
              {state.errors.email.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        {state?.ok === false && (state.errors.contact ?? state.errors._form) && (
          <ul>
            {[...(state.errors.contact ?? []), ...(state.errors._form ?? [])].map(
              (msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ),
            )}
          </ul>
        )}

        <button type="submit" disabled={isPending}>
          {isPending ? '登録中...' : '登録'}
        </button>
      </form>
    </div>
  );
}
