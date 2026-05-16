import { useState } from "react";

const style = `
  @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .ds { font-family: 'Jost', sans-serif; background: #FDFAF4; color: #1A1512; }
  .ds-hero { background: #1A1512; padding: 64px 48px; text-align: center; position: relative; overflow: hidden; }
  .ds-hero::before { content: ''; position: absolute; inset: 0; background: radial-gradient(ellipse at 30% 50%, rgba(201,169,110,0.15) 0%, transparent 60%), radial-gradient(ellipse at 70% 50%, rgba(232,196,196,0.10) 0%, transparent 60%); pointer-events: none; }
  .ds-eyebrow { font-size: 11px; font-weight: 500; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E; margin-bottom: 16px; }
  .ds-hero-title { font-family: 'Cormorant Garamond', serif; font-size: clamp(52px,6vw,84px); font-weight: 300; color: #FDFAF4; line-height: 1.0; margin-bottom: 6px; }
  .ds-hero-sub { font-family: 'Cormorant Garamond', serif; font-style: italic; font-size: clamp(20px,2.5vw,30px); font-weight: 300; color: #C9A96E; margin-bottom: 24px; }
  .ds-hero-body { font-size: 15px; font-weight: 300; color: #AEA89F; max-width: 480px; margin: 0 auto; line-height: 1.75; }
  .orn { display: flex; align-items: center; gap: 16px; justify-content: center; margin: 20px 0; }
  .orn span { width: 60px; height: 1px; }
  .orn span:first-child { background: linear-gradient(to right, transparent, #C9A96E); }
  .orn span:last-child { background: linear-gradient(to left, transparent, #C9A96E); }
  .diamond { width: 6px; height: 6px; background: #C9A96E; transform: rotate(45deg); flex-shrink: 0; }
  .sec { padding: 56px 40px; border-bottom: 1px solid #EDE8E3; }
  .sec:last-child { border-bottom: none; }
  .sec-alt { background: #F7F4EF; }
  .sec-label { font-size: 10px; font-weight: 600; letter-spacing: 0.35em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px; }
  .sec-title { font-family: 'Cormorant Garamond', serif; font-size: 36px; font-weight: 300; color: #1A1512; margin-bottom: 32px; line-height: 1.1; }
  /* NAV */
  .nav { display: flex; align-items: center; justify-content: space-between; padding: 16px 32px; background: #1A1512; border-bottom: 1px solid rgba(201,169,110,0.2); }
  .nav-brand { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 300; color: #FDFAF4; letter-spacing: 0.05em; }
  .nav-brand em { color: #C9A96E; font-style: italic; }
  .nav-links { display: flex; align-items: center; gap: 28px; list-style: none; }
  .nav-link { font-size: 11px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #AEA89F; cursor: pointer; transition: color 0.2s; text-decoration: none; }
  .nav-link:hover, .nav-link.active { color: #C9A96E; }
  /* TYPOGRAPHY */
  .type-grid { display: flex; flex-direction: column; gap: 24px; }
  .type-item { display: flex; align-items: baseline; gap: 24px; padding: 20px 24px; background: #FDFAF4; border: 1px solid #EDE8E3; border-radius: 2px; }
  .type-meta { min-width: 140px; font-size: 11px; font-weight: 500; letter-spacing: 0.1em; text-transform: uppercase; color: #C9A96E; flex-shrink: 0; }
  /* COLORS */
  .color-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 16px; }
  .color-swatch { border-radius: 2px; overflow: hidden; border: 1px solid #EDE8E3; }
  .color-block { height: 72px; }
  .color-info { padding: 10px 12px; background: #fff; }
  .color-name { font-size: 12px; font-weight: 500; color: #1A1512; margin-bottom: 2px; }
  .color-hex { font-size: 11px; color: #7A6E68; font-family: monospace; }
  /* STATS */
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1px; background: #EDE8E3; border: 1px solid #EDE8E3; border-radius: 2px; overflow: hidden; }
  .stat-card { background: #fff; padding: 24px 20px; }
  .stat-label { font-size: 10px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; color: #7A6E68; margin-bottom: 10px; }
  .stat-value { font-family: 'Cormorant Garamond', serif; font-size: 44px; font-weight: 300; color: #1A1512; line-height: 1; margin-bottom: 4px; }
  .stat-unit { font-size: 22px; color: #C9A96E; }
  .stat-change { font-size: 12px; color: #2A6645; }
  /* BUTTONS */
  .btn { font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 0.2em; text-transform: uppercase; cursor: pointer; transition: all 0.25s ease; border: none; outline: none; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
  .btn-primary { background: #1A1512; color: #FDFAF4; padding: 14px 32px; border-radius: 1px; }
  .btn-primary:hover { background: #C9A96E; color: #1A1512; }
  .btn-outline { background: transparent; color: #1A1512; padding: 13px 32px; border: 1px solid #1A1512; border-radius: 1px; }
  .btn-outline:hover { background: #1A1512; color: #FDFAF4; }
  .btn-gold { background: #C9A96E; color: #1A1512; padding: 14px 32px; border-radius: 1px; }
  .btn-gold:hover { background: #8B6914; color: #FDFAF4; }
  .btn-ghost { background: transparent; color: #C9A96E; padding: 13px 32px; border: 1px solid #C9A96E; border-radius: 1px; }
  .btn-ghost:hover { background: #C9A96E; color: #1A1512; }
  .btn-blush { background: #E8C4C4; color: #6B3535; padding: 14px 32px; border-radius: 1px; }
  .btn-blush:hover { background: #A0686B; color: #fff; }
  .btn-sm { padding: 9px 20px !important; font-size: 11px !important; }
  .btn-lg { padding: 18px 44px !important; font-size: 13px !important; }
  .btn-icon { padding: 11px !important; }
  .btn-grid { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
  /* INPUTS */
  .input-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .fg { display: flex; flex-direction: column; gap: 6px; }
  .fl { font-size: 11px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; color: #7A6E68; }
  .fi { font-family: 'Jost', sans-serif; font-size: 14px; font-weight: 300; color: #1A1512; background: #fff; border: 1px solid #EDE8E3; border-radius: 1px; padding: 12px 16px; outline: none; transition: border-color 0.2s; width: 100%; }
  .fi:focus { border-color: #C9A96E; }
  .fi::placeholder { color: #AEA89F; }
  .fi.err { border-color: #C0534B; }
  .fh { font-size: 12px; color: #7A6E68; margin-top: 4px; }
  .fe { font-size: 12px; color: #C0534B; margin-top: 4px; }
  .fs { font-family: 'Jost', sans-serif; font-size: 14px; font-weight: 300; color: #1A1512; background: #fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23C9A96E' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") no-repeat right 16px center; border: 1px solid #EDE8E3; border-radius: 1px; padding: 12px 40px 12px 16px; outline: none; appearance: none; transition: border-color 0.2s; width: 100%; cursor: pointer; }
  .fs:focus { border-color: #C9A96E; }
  .fta { font-family: 'Jost', sans-serif; font-size: 14px; font-weight: 300; color: #1A1512; background: #fff; border: 1px solid #EDE8E3; border-radius: 1px; padding: 12px 16px; outline: none; resize: vertical; min-height: 100px; line-height: 1.6; transition: border-color 0.2s; width: 100%; }
  .fta:focus { border-color: #C9A96E; }
  .fta::placeholder { color: #AEA89F; }
  .search-wrap { position: relative; }
  .si { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); pointer-events: none; }
  .search-input { font-family: 'Jost', sans-serif; font-size: 14px; font-weight: 300; width: 100%; padding: 13px 16px 13px 44px; border: 1px solid #EDE8E3; border-radius: 1px; outline: none; background: #fff; color: #1A1512; transition: border-color 0.2s; }
  .search-input:focus { border-color: #C9A96E; }
  .search-input::placeholder { color: #AEA89F; }
  /* DROPDOWN */
  .dd-wrap { position: relative; display: inline-block; }
  .dd-trigger { font-family: 'Jost', sans-serif; font-size: 12px; font-weight: 500; letter-spacing: 0.15em; text-transform: uppercase; background: #fff; border: 1px solid #EDE8E3; padding: 12px 20px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: border-color 0.2s; border-radius: 1px; color: #1A1512; }
  .dd-trigger:hover, .dd-trigger.open { border-color: #C9A96E; }
  .dd-arrow { width: 10px; height: 6px; transition: transform 0.2s; }
  .open .dd-arrow { transform: rotate(180deg); }
  .dd-menu { position: absolute; top: calc(100% + 4px); left: 0; min-width: 220px; background: #fff; border: 1px solid #EDE8E3; border-radius: 2px; padding: 6px 0; z-index: 100; box-shadow: 0 8px 32px rgba(26,21,18,0.08); }
  .dd-item { font-size: 13px; font-weight: 300; color: #2E2825; padding: 10px 18px; cursor: pointer; transition: background 0.15s; display: flex; align-items: center; gap: 10px; }
  .dd-item:hover { background: #FDF6EE; color: #C9A96E; }
  .dd-item.active { color: #C9A96E; font-weight: 500; }
  /* CARDS */
  .cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 24px; }
  .card { background: #fff; border: 1px solid #EDE8E3; border-radius: 2px; overflow: hidden; }
  .card-featured { border-color: #C9A96E; position: relative; }
  .card-img { height: 180px; display: flex; align-items: center; justify-content: center; font-family: 'Cormorant Garamond', serif; font-size: 14px; letter-spacing: 0.1em; font-style: italic; position: relative; }
  .card-badge { position: absolute; top: 14px; right: 14px; background: #C9A96E; color: #1A1512; font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; padding: 4px 10px; border-radius: 1px; }
  .card-body { padding: 20px 24px; }
  .card-tag { font-size: 10px; font-weight: 600; letter-spacing: 0.25em; text-transform: uppercase; color: #C9A96E; margin-bottom: 8px; }
  .card-title { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: #1A1512; line-height: 1.2; margin-bottom: 8px; }
  .card-desc { font-size: 13px; font-weight: 300; color: #7A6E68; line-height: 1.7; margin-bottom: 16px; }
  .card-footer { padding: 14px 24px; border-top: 1px solid #EDE8E3; display: flex; align-items: center; justify-content: space-between; }
  .card-price { font-family: 'Cormorant Garamond', serif; font-size: 22px; font-weight: 400; color: #1A1512; }
  /* TABLE */
  .tw { border: 1px solid #EDE8E3; border-radius: 2px; overflow: hidden; }
  table { width: 100%; border-collapse: collapse; }
  thead { background: #1A1512; }
  thead th { padding: 14px 20px; font-size: 10px; font-weight: 500; letter-spacing: 0.25em; text-transform: uppercase; text-align: left; color: #FDFAF4; }
  tbody tr { border-bottom: 1px solid #EDE8E3; transition: background 0.15s; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: #FDFAF4; }
  tbody td { padding: 14px 20px; font-size: 13px; font-weight: 300; color: #2E2825; vertical-align: middle; }
  .sp { display: inline-block; font-size: 10px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; padding: 4px 10px; border-radius: 100px; }
  .sp-confirmed { background: #DFF0E6; color: #2A6645; }
  .sp-pending { background: #F5EDD8; color: #7A5420; }
  .sp-cancelled { background: #F5DFDF; color: #7A2020; }
  /* BREADCRUMB */
  .bc { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 20px; }
  .bc-item { color: #7A6E68; }
  .bc-item.active { color: #1A1512; font-weight: 500; }
  .bc-sep { color: #C9A96E; }
  /* PAGINATION */
  .pagination { display: flex; align-items: center; gap: 4px; }
  .pg-btn { width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 400; color: #2E2825; border: 1px solid #EDE8E3; border-radius: 1px; cursor: pointer; background: #fff; transition: all 0.15s; }
  .pg-btn:hover { border-color: #C9A96E; color: #C9A96E; }
  .pg-btn.active { background: #1A1512; border-color: #1A1512; color: #C9A96E; }
  .pg-btn.disabled { opacity: 0.4; cursor: not-allowed; }
  /* CONTROLS */
  .form-checks { display: flex; flex-direction: column; gap: 12px; }
  .form-check { display: flex; align-items: center; gap: 12px; cursor: pointer; font-size: 14px; font-weight: 300; color: #2E2825; }
  .cb { width: 18px; height: 18px; border: 1px solid #C0B5AE; border-radius: 1px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #fff; transition: all 0.15s; }
  .cb.on { background: #C9A96E; border-color: #C9A96E; }
  .rb { width: 18px; height: 18px; border: 1px solid #C0B5AE; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #fff; }
  .rd { width: 8px; height: 8px; border-radius: 50%; background: #C9A96E; }
  .tg-wrap { display: flex; align-items: center; gap: 12px; cursor: pointer; }
  .tg-track { width: 44px; height: 24px; border-radius: 12px; background: #EDE8E3; position: relative; transition: background 0.2s; flex-shrink: 0; }
  .tg-track.on { background: #C9A96E; }
  .tg-thumb { position: absolute; width: 18px; height: 18px; border-radius: 50%; background: #fff; top: 3px; left: 3px; transition: left 0.2s; box-shadow: 0 1px 4px rgba(0,0,0,0.15); }
  .tg-track.on .tg-thumb { left: 23px; }
  /* TABS */
  .tabs-bar { display: flex; border-bottom: 1px solid #EDE8E3; margin-bottom: 24px; }
  .tab-item { font-size: 12px; font-weight: 500; letter-spacing: 0.12em; text-transform: uppercase; padding: 12px 20px; cursor: pointer; color: #7A6E68; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all 0.2s; }
  .tab-item:hover { color: #C9A96E; }
  .tab-item.active { color: #C9A96E; border-bottom-color: #C9A96E; }
  /* BADGES */
  .badge-grid { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
  .badge { font-size: 10px; font-weight: 600; letter-spacing: 0.15em; text-transform: uppercase; padding: 5px 12px; border-radius: 100px; }
  .bg-gold { background: #F0E4CC; color: #8B6914; }
  .bg-blush { background: #F7EDED; color: #A0686B; }
  .bg-dark { background: #1A1512; color: #C9A96E; }
  .bg-green { background: #DFF0E6; color: #2A6645; }
  .bg-outline { background: transparent; color: #C9A96E; border: 1px solid #C9A96E; }
  /* ALERTS */
  .alert { padding: 14px 18px; border-radius: 2px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 12px; font-size: 13px; font-weight: 300; line-height: 1.6; }
  .alert-icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .alert-title { font-weight: 500; font-size: 13px; margin-bottom: 2px; }
  .a-success { background: #DFF0E6; color: #1F4D32; border-left: 3px solid #2A6645; }
  .a-info { background: #EEF4FD; color: #1A3660; border-left: 3px solid #4A82CC; }
  .a-warning { background: #F9F0DE; color: #5A3D10; border-left: 3px solid #C9A030; }
  .a-error { background: #FCEAEA; color: #5A1515; border-left: 3px solid #C0534B; }
  /* PROGRESS */
  .prog-group { display: flex; flex-direction: column; gap: 16px; }
  .prog-item { display: flex; flex-direction: column; gap: 6px; }
  .prog-header { display: flex; justify-content: space-between; font-size: 12px; font-weight: 400; color: #7A6E68; }
  .prog-bar { height: 4px; background: #EDE8E3; border-radius: 2px; overflow: hidden; }
  .prog-fill { height: 100%; border-radius: 2px; background: #C9A96E; }
  /* TOOLTIP */
  .tt-item { position: relative; display: inline-block; }
  .tt-box { position: absolute; bottom: calc(100% + 8px); left: 50%; transform: translateX(-50%); background: #1A1512; color: #FDFAF4; font-size: 12px; font-weight: 300; padding: 7px 12px; border-radius: 2px; white-space: nowrap; pointer-events: none; opacity: 0; transition: opacity 0.15s; }
  .tt-box::after { content: ''; position: absolute; top: 100%; left: 50%; transform: translateX(-50%); border: 5px solid transparent; border-top-color: #1A1512; }
  .tt-item:hover .tt-box { opacity: 1; }
  /* AVATARS */
  .av-group { display: flex; }
  .av { width: 40px; height: 40px; border-radius: 50%; border: 2px solid #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; margin-left: -10px; flex-shrink: 0; }
  .av:first-child { margin-left: 0; }
  /* MODAL */
  .modal-bg { background: rgba(26,21,18,0.65); padding: 40px; display: flex; align-items: center; justify-content: center; border-radius: 2px; min-height: 360px; margin-top: 24px; }
  .modal-box { background: #fff; border-radius: 2px; width: 100%; max-width: 480px; border: 1px solid #EDE8E3; }
  .modal-header { padding: 24px 28px 20px; border-bottom: 1px solid #EDE8E3; }
  .modal-title { font-family: 'Cormorant Garamond', serif; font-size: 28px; font-weight: 300; color: #1A1512; }
  .modal-sub { font-size: 13px; font-weight: 300; color: #7A6E68; margin-top: 4px; }
  .modal-body { padding: 24px 28px; font-size: 14px; font-weight: 300; color: #2E2825; line-height: 1.7; }
  .modal-footer { padding: 16px 28px; border-top: 1px solid #EDE8E3; display: flex; gap: 12px; justify-content: flex-end; }
  /* PRICING */
  .pricing-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; border: 1px solid #EDE8E3; border-radius: 2px; overflow: hidden; }
  .pc { padding: 32px 28px; border-right: 1px solid #EDE8E3; background: #fff; }
  .pc:last-child { border-right: none; }
  .pc-featured { background: #1A1512; }
  .pc-tier { font-size: 10px; font-weight: 600; letter-spacing: 0.3em; text-transform: uppercase; color: #C9A96E; margin-bottom: 16px; }
  .pc-amount { font-family: 'Cormorant Garamond', serif; font-size: 52px; font-weight: 300; line-height: 1; margin-bottom: 4px; }
  .pc:not(.pc-featured) .pc-amount { color: #1A1512; }
  .pc-featured .pc-amount { color: #FDFAF4; }
  .pc-period { font-size: 12px; color: #7A6E68; margin-bottom: 24px; }
  .pc-featured .pc-period { color: #6E6460; }
  .pc-feat { font-size: 13px; font-weight: 300; color: #2E2825; padding: 9px 0; border-bottom: 1px solid #EDE8E3; display: flex; align-items: center; gap: 8px; }
  .pc-featured .pc-feat { color: #AEA89F; border-bottom-color: rgba(255,255,255,0.08); }
  .pc-feat:last-of-type { border-bottom: none; margin-bottom: 24px; }
  .ci { color: #C9A96E; font-size: 14px; flex-shrink: 0; }
  /* FOOTER */
  .ds-footer { background: #1A1512; padding: 48px 40px; text-align: center; }
`;

function Dropdown() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState("All Vendors");
  const items = ["All Vendors", "Photographers", "Florists", "Caterers", "Venues", "Bridal Gowns", "Entertainment"];
  return (
    <div className="dd-wrap">
      <button className={`dd-trigger ${open ? "open" : ""}`} onClick={() => setOpen(!open)}>
        {sel}
        <svg className="dd-arrow" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="#C9A96E" strokeWidth="1.5" strokeLinecap="round" /></svg>
      </button>
      {open && (
        <div className="dd-menu">
          {items.map((item, i) => (
            <div key={i} className={`dd-item ${sel === item ? "active" : ""}`} onClick={() => { setSel(item); setOpen(false); }}>
              {sel === item && <span>✦</span>}{item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, init = false }) {
  const [on, setOn] = useState(init);
  return (
    <label className="form-check" onClick={() => setOn(!on)}>
      <div className={`cb ${on ? "on" : ""}`}>
        {on && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </div>
      {label}
    </label>
  );
}

function Toggle({ label, init = false }) {
  const [on, setOn] = useState(init);
  return (
    <div className="tg-wrap" onClick={() => setOn(!on)}>
      <div className={`tg-track ${on ? "on" : ""}`}><div className="tg-thumb" /></div>
      <span style={{ fontSize: 14, fontWeight: 300, color: "#2E2825" }}>{label}</span>
    </div>
  );
}

function Tabs({ tabs }) {
  const [a, setA] = useState(0);
  return (
    <div className="tabs-bar">
      {tabs.map((t, i) => <div key={i} className={`tab-item ${a === i ? "active" : ""}`} onClick={() => setA(i)}>{t}</div>)}
    </div>
  );
}

export default function DS() {
  const [radioSel, setRadioSel] = useState(0);
  const [pg, setPg] = useState(3);
  const [modal, setModal] = useState(false);

  return (
    <div className="ds">
      <style>{style}</style>

      {/* HERO */}
      <div className="ds-hero">
        <p className="ds-eyebrow">Brand Design System</p>
        <h1 className="ds-hero-title">Eternal Affair</h1>
        <p className="ds-hero-sub">Wedding Expo 2025</p>
        <div className="orn"><span /><div className="diamond" /><span /></div>
        <p className="ds-hero-body">A curated design language for luxury wedding experiences — where timeless elegance meets refined modernity.</p>
      </div>

      {/* NAV */}
      <nav className="nav">
        <span className="nav-brand">Eternal <em>Affair</em></span>
        <ul className="nav-links">
          {["Discover", "Vendors", "Venues", "Gallery", "Plan"].map((l, i) => (
            <li key={i}><a className={`nav-link ${i === 0 ? "active" : ""}`}>{l}</a></li>
          ))}
        </ul>
        <button className="btn btn-gold btn-sm">Book a Booth</button>
      </nav>

      {/* TYPOGRAPHY */}
      <div className="sec">
        <p className="sec-label">01 — Typography</p>
        <h2 className="sec-title">Type Scale</h2>
        <div className="type-grid">
          <div className="type-item">
            <div className="type-meta">Display / H1</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(40px,5vw,64px)", fontWeight: 300, color: "#1A1512", lineHeight: 1.0 }}>Love, Everlasting</div>
          </div>
          <div className="type-item">
            <div className="type-meta">Display Italic</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: "clamp(32px,4vw,52px)", fontWeight: 300, fontStyle: "italic", color: "#C9A96E", lineHeight: 1.1 }}>Your Perfect Day</div>
          </div>
          <div className="type-item">
            <div className="type-meta">H2 / Section</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 32, fontWeight: 400, color: "#1A1512" }}>Discover Our Vendors</div>
          </div>
          <div className="type-item">
            <div className="type-meta">H3 / Card Title</div>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 24, fontWeight: 400, color: "#2E2825" }}>Floral Design & Decor</div>
          </div>
          <div className="type-item">
            <div className="type-meta">Eyebrow Label</div>
            <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.3em", textTransform: "uppercase", color: "#C9A96E" }}>Featured Vendor · Premium Booth</div>
          </div>
          <div className="type-item">
            <div className="type-meta">Body / Jost 300</div>
            <div style={{ fontSize: 15, fontWeight: 300, color: "#2E2825", lineHeight: 1.75 }}>We bring together the most exceptional wedding professionals in the region — from master florists to award-winning photographers — for one unforgettable weekend.</div>
          </div>
          <div className="type-item">
            <div className="type-meta">Caption</div>
            <div style={{ fontSize: 12, fontWeight: 400, color: "#7A6E68", letterSpacing: "0.05em" }}>Booth #A-12 · Hall 3, Ground Floor · Available 9am – 6pm</div>
          </div>
        </div>
      </div>

      {/* COLORS */}
      <div className="sec sec-alt">
        <p className="sec-label">02 — Color Palette</p>
        <h2 className="sec-title">Brand Colors</h2>
        <div className="color-grid">
          {[["Champagne","#C9A96E"],["Champagne Light","#F0E4CC"],["Champagne Dark","#8B6914"],["Blush","#E8C4C4"],["Blush Dark","#A0686B"],["Ivory","#FDFAF4"],["Obsidian","#1A1512"],["Charcoal","#2E2825"],["Warm Gray","#7A6E68"],["Light Gray","#EDE8E3"]].map(([n, h]) => (
            <div key={h} className="color-swatch">
              <div className="color-block" style={{ background: h, border: h === "#FDFAF4" ? "1px solid #EDE8E3" : "none" }} />
              <div className="color-info"><div className="color-name">{n}</div><div className="color-hex">{h}</div></div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS */}
      <div className="sec">
        <p className="sec-label">03 — Metrics</p>
        <h2 className="sec-title">Stat Cards</h2>
        <div className="stats-grid">
          {[["Registered Vendors","248","+","↑ 12% this year"],["Expected Attendees","6.4","k","↑ 8% this year"],["Booth Packages","3","","Starting ₱15,000"],["Expo Duration","3"," days","Oct 18–20, 2025"]].map(([l,v,u,c]) => (
            <div key={l} className="stat-card">
              <div className="stat-label">{l}</div>
              <div className="stat-value">{v}<span className="stat-unit">{u}</span></div>
              <div className="stat-change">{c}</div>
            </div>
          ))}
        </div>
      </div>

      {/* BUTTONS */}
      <div className="sec sec-alt">
        <p className="sec-label">04 — Buttons</p>
        <h2 className="sec-title">Button Variants</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div>
            <p className="fh" style={{ marginBottom: 10 }}>Variants</p>
            <div className="btn-grid">
              <button className="btn btn-primary">Book a Booth</button>
              <button className="btn btn-outline">View Vendors</button>
              <button className="btn btn-gold">✦ Featured</button>
              <button className="btn btn-ghost">Learn More</button>
              <button className="btn btn-blush">Save Wishlist</button>
            </div>
          </div>
          <div>
            <p className="fh" style={{ marginBottom: 10 }}>Sizes</p>
            <div className="btn-grid">
              <button className="btn btn-primary btn-sm">Small</button>
              <button className="btn btn-primary">Default</button>
              <button className="btn btn-primary btn-lg">Large Button</button>
            </div>
          </div>
          <div>
            <p className="fh" style={{ marginBottom: 10 }}>Icon Buttons</p>
            <div className="btn-grid">
              <button className="btn btn-outline btn-icon" title="Search">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="btn btn-outline btn-icon" title="Favourite">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="btn btn-gold btn-icon" title="Add">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M12 4v16m8-8H4" strokeLinecap="round" /></svg>
              </button>
              <button className="btn btn-primary btn-icon" title="Share">
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* INPUTS */}
      <div className="sec">
        <p className="sec-label">05 — Form Elements</p>
        <h2 className="sec-title">Inputs, Selects & Textarea</h2>
        <div className="input-grid">
          <div className="fg"><label className="fl">Full Name</label><input className="fi" type="text" placeholder="Maria Santos" /></div>
          <div className="fg"><label className="fl">Email Address</label><input className="fi" type="email" placeholder="hello@example.com" /></div>
          <div className="fg"><label className="fl">Phone Number</label><input className="fi" type="tel" placeholder="+63 917 000 0000" /></div>
          <div className="fg">
            <label className="fl">Vendor Category</label>
            <select className="fs"><option>Select a category</option><option>Photography</option><option>Florals & Decor</option><option>Catering</option><option>Bridal Wear</option><option>Entertainment</option></select>
          </div>
          <div className="fg" style={{ gridColumn: "span 2" }}>
            <label className="fl">Business Name</label>
            <input className="fi err" type="text" placeholder="Blooms & Co." />
            <span className="fe">This field is required.</span>
          </div>
          <div className="fg" style={{ gridColumn: "span 2" }}>
            <label className="fl">Message to Organizers</label>
            <textarea className="fta" placeholder="Tell us about your business and what makes your offering unique…" />
            <span className="fh">Max 500 characters.</span>
          </div>
        </div>
        <div style={{ marginTop: 24 }}>
          <label className="fl" style={{ marginBottom: 8, display: "block" }}>Search Vendors</label>
          <div className="search-wrap" style={{ maxWidth: 400 }}>
            <span className="si"><svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <input className="search-input" placeholder="Search photographers, florists…" />
          </div>
        </div>
      </div>

      {/* DROPDOWN + SELECTS */}
      <div className="sec sec-alt">
        <p className="sec-label">06 — Dropdown</p>
        <h2 className="sec-title">Dropdowns & Select Menus</h2>
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-start" }}>
          <Dropdown />
          <select className="fs" style={{ width: 220 }}><option>Sort by: Featured</option><option>Price: Low to High</option><option>Price: High to Low</option><option>Most Popular</option></select>
          <select className="fs" style={{ width: 200 }}><option>Hall: All Areas</option><option>Hall A — Premium</option><option>Hall B — Classic</option><option>Outdoor Pavilion</option></select>
        </div>
      </div>

      {/* SELECTION CONTROLS */}
      <div className="sec">
        <p className="sec-label">07 — Selection Controls</p>
        <h2 className="sec-title">Checkboxes, Radios & Toggles</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 32 }}>
          <div>
            <p className="fl" style={{ marginBottom: 14 }}>Vendor Filters</p>
            <div className="form-checks">
              <CheckItem label="Photography" init={true} />
              <CheckItem label="Florals & Decor" init={true} />
              <CheckItem label="Catering" />
              <CheckItem label="Entertainment" />
              <CheckItem label="Bridal Wear" />
            </div>
          </div>
          <div>
            <p className="fl" style={{ marginBottom: 14 }}>Booth Package</p>
            <div className="form-checks">
              {["Classic (₱15,000)", "Premier (₱28,000)", "Luxury (₱48,000)"].map((l, i) => (
                <label key={i} className="form-check" onClick={() => setRadioSel(i)}>
                  <div className="rb">{radioSel === i && <div className="rd" />}</div>
                  {l}
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="fl" style={{ marginBottom: 14 }}>Notifications</p>
            <div className="form-checks">
              <Toggle label="Email reminders" init={true} />
              <Toggle label="SMS updates" />
              <Toggle label="Newsletter" init={true} />
              <Toggle label="Event alerts" />
            </div>
          </div>
        </div>
      </div>

      {/* CARDS */}
      <div className="sec sec-alt">
        <p className="sec-label">08 — Cards</p>
        <h2 className="sec-title">Vendor Cards</h2>
        <div className="cards-grid">
          <div className="card">
            <div className="card-img" style={{ background: "linear-gradient(135deg,#E8C4C4,#F0E4CC)", color: "#A0686B" }}>✿ Florals & Styling</div>
            <div className="card-body">
              <div className="card-tag">Florals & Decor</div>
              <div className="card-title">Petals & Grace Studio</div>
              <div className="card-desc">Award-winning floral design for intimate ceremonies to grand receptions.</div>
            </div>
            <div className="card-footer"><span className="card-price">₱35,000</span><button className="btn btn-outline btn-sm">View Booth</button></div>
          </div>
          <div className="card card-featured">
            <div className="card-badge">Featured</div>
            <div className="card-img" style={{ background: "linear-gradient(135deg,#1A1512,#2E2825)", color: "#C9A96E" }}>◈ Photography & Film</div>
            <div className="card-body">
              <div className="card-tag">Photography</div>
              <div className="card-title">Lumière Wedding Co.</div>
              <div className="card-desc">Cinematic storytelling for your most treasured moments. Film & digital.</div>
            </div>
            <div className="card-footer"><span className="card-price">₱85,000</span><button className="btn btn-gold btn-sm">Book Now</button></div>
          </div>
          <div className="card">
            <div className="card-img" style={{ background: "linear-gradient(135deg,#EDE8E3,#FDFAF4)", color: "#7A6E68" }}>♪ Entertainment</div>
            <div className="card-body">
              <div className="card-tag">Music & Entertainment</div>
              <div className="card-title">Sonata Live Band</div>
              <div className="card-desc">Live jazz, pop, and classical ensembles tailored for your celebration.</div>
            </div>
            <div className="card-footer"><span className="card-price">₱48,000</span><button className="btn btn-outline btn-sm">View Booth</button></div>
          </div>
        </div>
      </div>

      {/* TABLE */}
      <div className="sec">
        <p className="sec-label">09 — Data Table</p>
        <h2 className="sec-title">Vendor Registrations</h2>
        <div className="bc">
          <span className="bc-item">Dashboard</span><span className="bc-sep">›</span>
          <span className="bc-item">Vendors</span><span className="bc-sep">›</span>
          <span className="bc-item active">Registrations</span>
        </div>
        <div className="tw">
          <table>
            <thead><tr>{["Vendor Name","Category","Booth","Package","Amount","Status"].map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {[["Lumière Wedding Co.","Photography","A-04","Luxury","₱48,000","confirmed"],["Petals & Grace Studio","Florals","B-11","Premier","₱28,000","confirmed"],["La Belle Cuisine","Catering","C-07","Classic","₱15,000","pending"],["Sonata Live Band","Entertainment","A-15","Premier","₱28,000","confirmed"],["White Lace Atelier","Bridal Wear","B-03","Luxury","₱48,000","pending"],["Golden Hour Films","Videography","D-02","Classic","₱15,000","cancelled"]].map(([name,cat,booth,pkg,amt,status],i) => (
                <tr key={i}>
                  <td style={{ fontWeight: 400 }}>{name}</td>
                  <td style={{ color: "#7A6E68" }}>{cat}</td>
                  <td><code style={{ fontSize: 12, background: "#F7F4EF", padding: "2px 8px", borderRadius: 2 }}>{booth}</code></td>
                  <td>{pkg}</td>
                  <td style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 16 }}>{amt}</td>
                  <td><span className={`sp sp-${status}`}>{status.charAt(0).toUpperCase()+status.slice(1)}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#7A6E68" }}>Showing 6 of 248 vendors</span>
          <div className="pagination">
            <button className="pg-btn disabled">←</button>
            {[1,2,3,4,5].map(n => <button key={n} className={`pg-btn ${pg===n?"active":""}`} onClick={() => setPg(n)}>{n}</button>)}
            <button className="pg-btn">→</button>
          </div>
        </div>
      </div>

      {/* TABS, BADGES, ALERTS */}
      <div className="sec sec-alt">
        <p className="sec-label">10 — Navigation & Feedback</p>
        <h2 className="sec-title">Tabs, Badges & Alerts</h2>
        <Tabs tabs={["Overview","Vendors","Schedule","Floor Plan","Contact"]} />
        <div style={{ marginBottom: 28 }}>
          <p className="fl" style={{ marginBottom: 12 }}>Badges</p>
          <div className="badge-grid">
            <span className="badge bg-gold">Champagne</span>
            <span className="badge bg-blush">Blush</span>
            <span className="badge bg-dark">✦ Premium</span>
            <span className="badge bg-green">Confirmed</span>
            <span className="badge bg-outline">Florals</span>
            <span className="badge bg-outline" style={{ borderColor: "#A0686B", color: "#A0686B" }}>Photography</span>
            <span className="badge bg-outline" style={{ borderColor: "#4A82CC", color: "#4A82CC" }}>New 2025</span>
          </div>
        </div>
        <div>
          <p className="fl" style={{ marginBottom: 12 }}>Alerts</p>
          <div className="alert a-success"><span className="alert-icon">✓</span><div><div className="alert-title">Registration Confirmed</div>Your booth at Hall A-04 has been reserved for October 18–20.</div></div>
          <div className="alert a-info"><span className="alert-icon">ℹ</span><div><div className="alert-title">Early Bird Pricing</div>Register before September 1 to receive 20% off all booth packages.</div></div>
          <div className="alert a-warning"><span className="alert-icon">⚠</span><div><div className="alert-title">Payment Pending</div>Complete your payment within 48 hours to secure your booth.</div></div>
          <div className="alert a-error"><span className="alert-icon">✕</span><div><div className="alert-title">Booth Unavailable</div>Hall B-08 has been taken. Please select another booth location.</div></div>
        </div>
      </div>

      {/* PROGRESS */}
      <div className="sec">
        <p className="sec-label">11 — Progress</p>
        <h2 className="sec-title">Progress Bars</h2>
        <div className="prog-group" style={{ maxWidth: 560 }}>
          {[["Booth Occupancy",87],["Registrations Goal",62],["Sponsor Targets",45],["Ticket Sales",94]].map(([l,p]) => (
            <div key={l} className="prog-item">
              <div className="prog-header"><span>{l}</span><span>{p}%</span></div>
              <div className="prog-bar"><div className="prog-fill" style={{ width: `${p}%` }} /></div>
            </div>
          ))}
        </div>
      </div>

      {/* AVATARS + TOOLTIPS */}
      <div className="sec sec-alt">
        <p className="sec-label">12 — Avatars & Tooltips</p>
        <h2 className="sec-title">Avatar Groups & Tooltips</h2>
        <div style={{ display: "flex", gap: 48, flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p className="fh" style={{ marginBottom: 12 }}>Event Team</p>
            <div className="av-group">
              {[["MS","#F0E4CC","#8B6914"],["JR","#E8C4C4","#A0686B"],["AL","#EDE8E3","#7A6E68"],["PB","#1A1512","#C9A96E"]].map(([init,bg,color],i) => (
                <div key={i} className="av" style={{ background: bg, color }}>{init}</div>
              ))}
              <div className="av" style={{ background: "#EDE8E3", color: "#7A6E68", fontSize: 12 }}>+8</div>
            </div>
          </div>
          <div>
            <p className="fh" style={{ marginBottom: 12 }}>Hover for tooltip</p>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
              {["Save Vendor","Add to Plan","Share","Download"].map(t => (
                <div key={t} className="tt-item">
                  <button className="btn btn-outline btn-sm">{t}</button>
                  <div className="tt-box">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL */}
      <div className="sec">
        <p className="sec-label">13 — Modal / Dialog</p>
        <h2 className="sec-title">Modal</h2>
        <button className="btn btn-primary" onClick={() => setModal(true)}>Open Modal Demo</button>
        {modal && (
          <div className="modal-bg">
            <div className="modal-box">
              <div className="modal-header">
                <div className="modal-title">Reserve Your Booth</div>
                <div className="modal-sub">Eternal Affair Wedding Expo · October 2025</div>
              </div>
              <div className="modal-body">You're about to reserve Booth A-04 (Luxury Package) for <strong>₱48,000</strong>. A 50% deposit of <strong>₱24,000</strong> is required to confirm your slot. The remaining balance is due 30 days before the event.</div>
              <div className="modal-footer">
                <button className="btn btn-outline btn-sm" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-gold btn-sm">Confirm & Pay Deposit</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* PRICING */}
      <div className="sec sec-alt">
        <p className="sec-label">14 — Pricing</p>
        <h2 className="sec-title">Booth Packages</h2>
        <div className="pricing-grid">
          {[
            { tier:"Classic", price:"₱15,000", feats:["3×3m Booth Space","1 Table & 2 Chairs","Standard Signage","Wifi Access","Vendor Directory Listing"], featured:false },
            { tier:"Premier", price:"₱28,000", feats:["4×4m Corner Booth","Premium Furniture Set","Custom Backwall Print","Priority Placement","Featured in Catalogue","Social Media Feature"], featured:true },
            { tier:"Luxury", price:"₱48,000", feats:["6×4m Grand Booth","Bespoke Design Setup","Premium Location","Dedicated Hostess","Press Feature","VIP Lounge Access"], featured:false },
          ].map(({ tier, price, feats, featured }) => (
            <div key={tier} className={`pc ${featured ? "pc-featured" : ""}`}>
              <div className="pc-tier">{tier}</div>
              <div className="pc-amount">{price}</div>
              <div className="pc-period">per event</div>
              {feats.map(f => <div key={f} className="pc-feat"><span className="ci">✦</span>{f}</div>)}
              <button className={`btn ${featured ? "btn-gold" : "btn-outline"}`} style={{ width: "100%", marginTop: 8 }}>
                {featured ? `Book ${tier}` : "Get Started"}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <div className="ds-footer">
        <div className="orn" style={{ marginBottom: 24 }}><span style={{ width: 60, height: 1, background: "linear-gradient(to right, transparent, #C9A96E)" }} /><div className="diamond" /><span style={{ width: 60, height: 1, background: "linear-gradient(to left, transparent, #C9A96E)" }} /></div>
        <p style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, fontWeight: 300, color: "#FDFAF4", marginBottom: 8 }}>Eternal <em style={{ color: "#C9A96E" }}>Affair</em></p>
        <p style={{ fontSize: 11, letterSpacing: "0.3em", textTransform: "uppercase", color: "#6E6460", marginBottom: 16 }}>Wedding Expo Brand Design System</p>
        <p style={{ fontSize: 12, color: "#4A4440", fontWeight: 300 }}>Cormorant Garamond · Jost · Champagne Gold · Blush · Obsidian</p>
      </div>
    </div>
  );
}
