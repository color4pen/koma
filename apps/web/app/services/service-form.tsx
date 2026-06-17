'use client';

import { useActionState } from 'react';

import type { ActionState } from './actions';
import { createServiceAction } from './actions';

export default function ServiceForm() {
  const [state, formAction, isPending] = useActionState<ActionState | null, FormData>(
    createServiceAction,
    null,
  );

  return (
    <div>
      <h2>サービス登録</h2>
      {state?.ok === true && <p>登録が完了しました。</p>}
      <form action={formAction}>
        <div>
          <label htmlFor="name">メニュー名（必須）</label>
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
          <label htmlFor="durationMinutes">所要時間（分）（必須）</label>
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min="1"
            step="1"
            required
          />
          {state?.ok === false && state.errors.durationMinutes && (
            <ul>
              {state.errors.durationMinutes.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="priceYen">料金（円）（必須）</label>
          <input
            id="priceYen"
            name="priceYen"
            type="number"
            min="0"
            step="1"
            required
          />
          {state?.ok === false && state.errors.priceYen && (
            <ul>
              {state.errors.priceYen.map((msg, i) => (
                <li key={i} style={{ color: 'red' }}>
                  {msg}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <label htmlFor="resourceKinds">対応リソース種別（カンマ区切り）</label>
          <input id="resourceKinds" name="resourceKinds" type="text" />
          {state?.ok === false && state.errors.resourceKinds && (
            <ul>
              {state.errors.resourceKinds.map((msg, i) => (
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
