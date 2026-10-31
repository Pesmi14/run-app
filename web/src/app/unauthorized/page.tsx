import Link from "next/link";
import { logout } from "../actions";

export default function UnauthorizedPage() {
  return (
    <main className="simple-page">
      <div className="simple-card">
        <span className="eyebrow">403 — ACCESS DENIED</span>

        <h1>Access restricted.</h1>

        <p>
          Your account does not have permission to
          access the Sprintuy platform.
        </p>

        <form action={logout}>
          <button type="submit" className="login-button">
            Sign out
          </button>
        </form>

        <Link href="/" className="simple-link">
          Back to home
        </Link>
      </div>
    </main>
  );
}