import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="card">
      <h1>Sign in</h1>
      <p className="muted">Access your documents with your firm.</p>
      <form className="stack" action={signIn}>
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        {error && <p className="error">That email and password don&apos;t match.</p>}
        <button type="submit">Sign in</button>
      </form>
    </div>
  );
}
