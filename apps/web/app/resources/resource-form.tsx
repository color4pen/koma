'use client';

import { useActionState } from 'react';

import type { ActionState } from './actions';
import { createResourceAction } from './actions';

export default function ResourceForm() {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createResourceAction,
    null,
  );

  return (
    <div>
      <h2>リソース登録</h2>
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
          <label htmlFor="kind">種別（必須）</label>
          <input id="kind" name="kind" type="text" required />
          {state?.ok === false && state.errors.kind && (
            <ul>
              {state.errors.kind.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="capacity">同時受付数</label>
          <input
            id="capacity"
            name="capacity"
            type="number"
            min="1"
            step="1"
            defaultValue="1"
          />
          {state?.ok === false && state.errors.capacity && (
            <ul>
              {state.errors.capacity.map((msg, i) => (
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
          {isPending ? '登録中...' : '登録'}
        </button>
      </form>
    </div>
  );
}
