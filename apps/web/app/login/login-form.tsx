'use client';

import { useActionState } from 'react';

import type { LoginActionState } from './actions';
import { loginAction } from './actions';

type Props = {
  next?: string;
};

export default function LoginForm({ next }: Props) {
  const [state, formAction, isPending] = useActionState<LoginActionState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={formAction}>
      <input type="hidden" name="next" value={next ?? ''} />

      {state?.ok === false && state.message && (
        <p style={{ color: 'red' }}>{state.message}</p>
      )}

      <div>
        <label htmlFor="email">メールアドレス</label>
        <input id="email" name="email" type="email" autoComplete="email" />
        {state?.ok === false && state.errors?.email && (
          <ul>
            {state.errors.email.map((msg, i) => (
              <li key={i} style={{ color: 'red' }}>
                {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="password">パスワード</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
        />
        {state?.ok === false && state.errors?.password && (
          <ul>
            {state.errors.password.map((msg, i) => (
              <li key={i} style={{ color: 'red' }}>
                {msg}
              </li>
            ))}
          </ul>
        )}
      </div>

      <button type="submit" disabled={isPending}>
        {isPending ? 'ログイン中...' : 'ログイン'}
      </button>
    </form>
  );
}
