// src/app/platform/loading.tsx
// Shown while the dynamic route streams; does not replace data fetching.
export default function PlatformLoading() {
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#fafafa", color: "#555", fontFamily: "system-ui, sans-serif" }}>
      <div role="status" aria-live="polite" style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 750, color: "#171717", marginBottom: 10 }}>SPRINTUY<span style={{ color: "#ef765e" }}>.</span></div>
        <div style={{ fontSize: 13 }}>Načítám administraci…</div>
      </div>
    </div>
  );
}
