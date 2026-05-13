export function SiteFooter() {
  return (
    <footer
      className="no-print mt-auto text-center"
      style={{
        background: "#1A1512",
        padding: "64px 40px", // Increased padding for a more premium, substantial feel
        borderTop: "1px solid rgba(201,169,110,0.1)"
      }}
    >
      {/* DS footer ornament */}
      <div style={{ display: "flex", alignItems: "center", gap: "20px", justifyContent: "center", marginBottom: "24px" }}>
        <span style={{ width: "80px", height: "1px", background: "linear-gradient(to right, transparent, rgba(201,169,110,0.4))" }} />
        <div style={{ width: "6px", height: "6px", background: "#C9A96E", transform: "rotate(45deg)", flexShrink: 0 }} />
        <span style={{ width: "80px", height: "1px", background: "linear-gradient(to left, transparent, rgba(201,169,110,0.4))" }} />
      </div>

      {/* Brand */}
      <p
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: "24px",
          fontWeight: 300,
          color: "#FDFAF4",
          marginBottom: "8px",
          letterSpacing: "0.05em"
        }}
      >
        Eventuz
      </p>

      <p
        style={{
          fontSize: "11px",
          letterSpacing: "0.4em",
          textTransform: "uppercase",
          color: "#7A6E68", // Lighter gray for better visibility on dark bg while remaining subtle
          fontWeight: 300,
        }}
      >
        Crafted for celebrations
      </p>

      <div style={{ marginTop: "40px", fontSize: "10px", color: "rgba(253,250,244,0.2)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
        © {new Date().getFullYear()} Eventuz. All rights reserved.
      </div>
    </footer>
  );
}
