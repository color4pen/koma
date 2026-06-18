# Spec: auth-login-ui

## Requirements

### Requirement: Route protection SHALL redirect unauthenticated requests to login

The middleware SHALL intercept requests to protected paths and redirect to `/login?next=<original-path>` when the session cookie is absent, invalid, or expired. Public paths (`/login`, Next.js static assets) SHALL pass through without session validation.

#### Scenario: Unauthenticated request to protected path redirects to login

**Given** no `koma_session` cookie is present in the request
**When** a request is made to `/customers`
**Then** the middleware responds with a redirect to `/login?next=/customers`

#### Scenario: Expired session redirects to login

**Given** a `koma_session` cookie is present but its `exp` is in the past
**When** a request is made to `/`
**Then** the middleware responds with a redirect to `/login?next=/`

#### Scenario: Valid session passes through to protected path

**Given** a `koma_session` cookie with a valid signature and future `exp`
**When** a request is made to `/customers`
**Then** the middleware allows the request to proceed (no redirect)

#### Scenario: Public path does not require authentication

**Given** no `koma_session` cookie is present
**When** a request is made to `/login`
**Then** the middleware allows the request to proceed (no redirect)

---

### Requirement: isPublicPath SHALL correctly classify paths

The `isPublicPath` function SHALL return `true` for `/login` and Next.js internal paths (`/_next/...`, `/favicon.ico`), and `false` for all other paths.

#### Scenario: /login is public

**Given** the pathname `/login`
**When** `isPublicPath` is called
**Then** the result is `true`

#### Scenario: Next.js static asset is public

**Given** the pathname `/_next/static/x.js`
**When** `isPublicPath` is called
**Then** the result is `true`

#### Scenario: Business path is protected

**Given** the pathname `/customers`
**When** `isPublicPath` is called
**Then** the result is `false`

#### Scenario: Root path is protected

**Given** the pathname `/`
**When** `isPublicPath` is called
**Then** the result is `false`

---

### Requirement: parseLoginInput SHALL validate email and password presence

The `parseLoginInput` function SHALL return `{ ok: true, email, password }` when both fields are non-empty strings, and `{ ok: false, errors }` when either field is empty or missing.

#### Scenario: Both fields non-empty returns success

**Given** input `{ email: "admin@example.com", password: "secret" }`
**When** `parseLoginInput` is called
**Then** the result is `{ ok: true, email: "admin@example.com", password: "secret" }`

#### Scenario: Empty email returns failure

**Given** input `{ email: "", password: "secret" }`
**When** `parseLoginInput` is called
**Then** the result has `ok: false` with an error for `email`

#### Scenario: Empty password returns failure

**Given** input `{ email: "admin@example.com", password: "" }`
**When** `parseLoginInput` is called
**Then** the result has `ok: false` with an error for `password`

#### Scenario: Missing fields returns failure

**Given** input `{}`
**When** `parseLoginInput` is called
**Then** the result has `ok: false` with errors for both fields

---

### Requirement: Login action SHALL authenticate and set session cookie on success

The login Server Action SHALL validate input with `parseLoginInput`, call `authenticate`, and on success set a `koma_session` cookie with `{ userId, role, exp }` then redirect to the `next` parameter (defaulting to `/`). On failure it SHALL return a generic error message without revealing whether the email exists.

#### Scenario: Valid credentials set cookie and redirect

**Given** a registered user with email `admin@example.com` and correct password
**When** the login action is invoked with those credentials and `next=/customers`
**Then** a `koma_session` cookie is set with the user's `userId` and `role`, and the response redirects to `/customers`

#### Scenario: Invalid credentials return generic error

**Given** the password `wrong` does not match the registered user
**When** the login action is invoked with `email: "admin@example.com"` and `password: "wrong"`
**Then** the action returns `{ ok: false }` with a message that does not distinguish between wrong email and wrong password

#### Scenario: Invalid input returns validation errors

**Given** empty email and password
**When** the login action is invoked
**Then** the action returns `{ ok: false }` with field-level validation errors

---

### Requirement: Logout action SHALL clear session cookie and redirect to login

The logout Server Action SHALL clear the `koma_session` cookie and redirect to `/login`.

#### Scenario: Logout clears cookie

**Given** a user is authenticated (session cookie present)
**When** the logout action is invoked
**Then** the `koma_session` cookie is cleared and the response redirects to `/login`

---

### Requirement: Session cookie SHALL use secure attributes

The `setSessionCookie` function SHALL set the cookie with `httpOnly: true`, `sameSite: 'lax'`, `path: '/'`, `secure: true` (production only), and `maxAge` matching the session TTL.

#### Scenario: Cookie attributes in production

**Given** `NODE_ENV` is `production`
**When** `setSessionCookie` is called
**Then** the cookie is set with `httpOnly`, `sameSite=lax`, `secure=true`, `path=/`, and `maxAge` equal to 7 days in seconds

#### Scenario: Cookie attributes in development

**Given** `NODE_ENV` is not `production`
**When** `setSessionCookie` is called
**Then** the cookie is set with `httpOnly`, `sameSite=lax`, `secure=false`, `path=/`, and `maxAge` equal to 7 days in seconds

---

### Requirement: Navigation SHALL show logout affordance when authenticated

The root layout SHALL display business navigation links and a logout button (invoking the logout Server Action) when the user is authenticated. When on `/login` (the only unprotected page that renders the layout), business navigation links SHALL be hidden.

#### Scenario: Authenticated user sees nav and logout

**Given** a valid session exists
**When** any protected page renders
**Then** the header shows business links (ホーム, 顧客, リソース, サービス, 予約) and a logout button

#### Scenario: Login page hides business nav

**Given** no valid session (user is on `/login`)
**When** the login page renders
**Then** the header does not show business navigation links or logout button
