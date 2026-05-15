import { useState, useEffect, useRef } from "react";

/* ─── MOCK EVENT DATA ─────────────────────────────────────── */
const EVENT = {
  name: "Eternal Affair Wedding Expo 2025",
  description: `Join us for the most anticipated wedding showcase of the year — a curated gathering of the Philippines' finest wedding professionals under one breathtaking roof.\n\nFrom award-winning photographers and master florists to renowned caterers and couture bridal designers, every detail has been crafted to inspire your perfect celebration. Expect live demonstrations, exclusive one-day discounts, and intimate consultations with over 248 vendors.\n\nWhether you're newly engaged or deep in planning, Eternal Affair is your definitive guide to a wedding day beyond imagination.`,
  event_date: "2025-10-18",
  event_time: "09:00",
  image_url: null,
  venue: "SMX Convention Center Manila",
  formatted_address: "Seashell Lane, Mall of Asia Complex, Pasay City, Metro Manila, 1300",
  lat: 14.5352,
  lng: 120.9822,
  public_slug: "eternal-affair-2025",
  capacity_hold_minutes: 15,
  payment_hold_minutes: 30,
  ticket_types: [
    {
      id: 1, name: "General Admission", description: "Full access to all vendor halls, live demonstrations, and complimentary welcome bag.",
      regular_price: 350, early_bird_price: 250,
      early_bird_start_at: "2025-08-01T00:00:00", early_bird_end_at: "2025-09-01T23:59:59",
      status: "active", quantity: 2000, sold: 1743,
    },
    {
      id: 2, name: "VIP Experience", description: "Priority entry, exclusive VIP lounge access, curated welcome hamper, private vendor consultations, and champagne reception.",
      regular_price: 1500, early_bird_price: 1100,
      early_bird_start_at: "2025-08-01T00:00:00", early_bird_end_at: "2025-09-01T23:59:59",
      status: "active", quantity: 200, sold: 187,
    },
    {
      id: 3, name: "Platinum Couple's Pass", description: "Two VIP passes, priority bridal suite consultation, personalised planning session with our curators, and exclusive vendor gift packages.",
      regular_price: 4500, early_bird_price: 3200,
      early_bird_start_at: "2025-08-01T00:00:00", early_bird_end_at: "2025-09-01T23:59:59",
      status: "sold_out", quantity: 50, sold: 50,
    },
  ],
};

/* ─── STYLES ─────────────────────────────────────────────── */
const css = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400;1,600&family=Jost:wght@300;400;500;600&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
:root{
  --gold:#C9A96E;--gold-lt:#F0E4CC;--gold-dk:#8B6914;
  --blush:#E8C4C4;--blush-dk:#A0686B;
  --ivory:#FDFAF4;--obsidian:#1A1512;--charcoal:#2E2825;
  --warm:#7A6E68;--lgray:#EDE8E3;--bgalt:#F7F4EF;
  --serif:'Cormorant Garamond',Georgia,serif;
  --sans:'Jost',sans-serif;
}
html{scroll-behavior:smooth;}
body{font-family:var(--sans);background:var(--ivory);color:var(--obsidian);line-height:1.6;}

/* ── NAV ── */
.nav{position:sticky;top:0;z-index:90;display:flex;align-items:center;justify-content:space-between;padding:14px 48px;background:rgba(26,21,18,0.97);backdrop-filter:blur(12px);border-bottom:1px solid rgba(201,169,110,0.15);}
.nav-brand{font-family:var(--serif);font-size:22px;font-weight:300;color:#FDFAF4;letter-spacing:.04em;}
.nav-brand em{color:var(--gold);font-style:italic;}
.nav-links{display:flex;gap:28px;list-style:none;}
.nav-link{font-size:11px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:#AEA89F;cursor:pointer;text-decoration:none;transition:color .2s;}
.nav-link:hover,.nav-link.active{color:var(--gold);}
.nav-cta{font-family:var(--sans);font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;background:var(--gold);color:var(--obsidian);border:none;padding:10px 24px;cursor:pointer;transition:all .25s;border-radius:1px;}
.nav-cta:hover{background:var(--gold-dk);color:#fff;}

/* ── HERO ── */
.hero{position:relative;min-height:92vh;display:flex;flex-direction:column;justify-content:flex-end;overflow:hidden;background:var(--obsidian);}
.hero-img{position:absolute;inset:0;background:linear-gradient(160deg,#1a1512 0%,#2e2825 40%,#3d3028 100%);z-index:0;}
.hero-img::after{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A96E' fill-opacity='0.04'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");}
.hero-overlay{position:absolute;inset:0;background:linear-gradient(to top,rgba(26,21,18,0.98) 0%,rgba(26,21,18,0.6) 50%,rgba(26,21,18,0.2) 100%);z-index:1;}
.hero-content{position:relative;z-index:2;padding:0 80px 72px;}
.hero-eyebrow{font-size:11px;font-weight:500;letter-spacing:.35em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;display:flex;align-items:center;gap:16px;}
.hero-eyebrow::before{content:'';width:40px;height:1px;background:var(--gold);}
.hero-title{font-family:var(--serif);font-size:clamp(52px,6vw,88px);font-weight:300;color:#FDFAF4;line-height:1.0;margin-bottom:12px;max-width:800px;}
.hero-title em{font-style:italic;color:var(--gold);}
.hero-sub{font-family:var(--serif);font-style:italic;font-size:clamp(18px,2vw,26px);font-weight:300;color:rgba(253,250,244,0.65);margin-bottom:40px;}
.hero-meta{display:flex;align-items:center;gap:32px;margin-bottom:40px;flex-wrap:wrap;}
.hero-meta-item{display:flex;align-items:center;gap:10px;font-size:13px;font-weight:300;color:rgba(253,250,244,0.75);}
.hero-meta-icon{width:32px;height:32px;border:1px solid rgba(201,169,110,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.hero-meta-label{font-size:10px;font-weight:500;letter-spacing:.15em;text-transform:uppercase;color:var(--gold);display:block;margin-bottom:1px;}
.hero-actions{display:flex;align-items:center;gap:16px;}

/* ── COUNTDOWN ── */
.countdown-bar{background:var(--obsidian);border-top:1px solid rgba(201,169,110,0.15);border-bottom:1px solid rgba(201,169,110,0.15);padding:20px 80px;display:flex;align-items:center;justify-content:space-between;}
.cd-label{font-size:10px;font-weight:500;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);}
.cd-units{display:flex;align-items:center;gap:4px;}
.cd-unit{text-align:center;min-width:64px;}
.cd-num{font-family:var(--serif);font-size:36px;font-weight:300;color:#FDFAF4;line-height:1;display:block;}
.cd-sub{font-size:9px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--warm);display:block;margin-top:2px;}
.cd-sep{font-family:var(--serif);font-size:28px;color:rgba(201,169,110,0.3);padding-bottom:12px;align-self:flex-end;}
.cd-price-tag{font-size:13px;font-weight:300;color:#AEA89F;}
.cd-price-tag strong{color:var(--gold);font-weight:500;}

/* ── SECTIONS ── */
.section{padding:80px;}
.section-alt{background:var(--bgalt);}
.section-dark{background:var(--obsidian);}
.sec-eyebrow{font-size:10px;font-weight:600;letter-spacing:.35em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;}
.sec-title{font-family:var(--serif);font-size:clamp(32px,4vw,48px);font-weight:300;color:var(--obsidian);line-height:1.1;margin-bottom:8px;}
.sec-title-light{color:#FDFAF4;}
.sec-sub{font-size:15px;font-weight:300;color:var(--warm);max-width:560px;line-height:1.75;margin-bottom:48px;}
.orn{display:flex;align-items:center;gap:16px;margin:16px 0 40px;}
.orn span{width:48px;height:1px;}
.orn-l{background:linear-gradient(to right,transparent,var(--gold));}
.orn-r{background:linear-gradient(to left,transparent,var(--gold));}
.diamond{width:5px;height:5px;background:var(--gold);transform:rotate(45deg);flex-shrink:0;}

/* ── ABOUT / DESCRIPTION ── */
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:start;}
.about-text{font-size:15px;font-weight:300;color:var(--charcoal);line-height:1.85;white-space:pre-line;}
.about-stats{display:grid;grid-template-columns:1fr 1fr;gap:1px;background:var(--lgray);border:1px solid var(--lgray);border-radius:2px;overflow:hidden;}
.astat{background:var(--ivory);padding:28px 24px;}
.astat-val{font-family:var(--serif);font-size:44px;font-weight:300;color:var(--obsidian);line-height:1;}
.astat-val em{color:var(--gold);font-style:normal;}
.astat-label{font-size:10px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;color:var(--warm);margin-top:6px;}

/* ── INFO CARDS ── */
.info-row{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;margin-bottom:56px;}
.info-card{background:#fff;border:1px solid var(--lgray);border-radius:2px;padding:28px 28px 24px;position:relative;overflow:hidden;}
.info-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(to right,var(--gold),var(--blush));}
.info-card-icon{width:40px;height:40px;border:1px solid var(--lgray);border-radius:50%;display:flex;align-items:center;justify-content:center;margin-bottom:16px;}
.info-card-label{font-size:10px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:6px;}
.info-card-value{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--obsidian);line-height:1.2;margin-bottom:6px;}
.info-card-sub{font-size:13px;font-weight:300;color:var(--warm);line-height:1.6;}

/* ── MAP ── */
.map-section{display:grid;grid-template-columns:1fr 1fr;gap:0;border:1px solid var(--lgray);border-radius:2px;overflow:hidden;}
.map-frame{background:#e8e4df;min-height:360px;position:relative;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.map-placeholder{position:absolute;inset:0;background:linear-gradient(135deg,#e8e4df 0%,#ddd8d2 100%);}
.map-grid{position:absolute;inset:0;opacity:0.4;}
.map-pin{position:absolute;top:50%;left:50%;transform:translate(-50%,-100%);z-index:2;}
.map-pin-dot{width:16px;height:16px;background:var(--gold);border-radius:50%;border:3px solid #fff;box-shadow:0 2px 12px rgba(201,169,110,.5);}
.map-pin-line{width:2px;height:20px;background:var(--gold);margin:0 auto;}
.map-ripple{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:48px;height:48px;border:2px solid rgba(201,169,110,.4);border-radius:50%;animation:ripple 2s infinite;}
@keyframes ripple{0%{transform:translate(-50%,-50%) scale(1);opacity:1;}100%{transform:translate(-50%,-50%) scale(2.5);opacity:0;}}
.map-info{padding:40px 40px;background:#fff;display:flex;flex-direction:column;justify-content:center;}
.map-venue{font-family:var(--serif);font-size:26px;font-weight:400;color:var(--obsidian);margin-bottom:8px;line-height:1.2;}
.map-address{font-size:14px;font-weight:300;color:var(--warm);line-height:1.7;margin-bottom:24px;}
.map-coords{font-size:11px;font-family:monospace;background:var(--bgalt);padding:8px 12px;border-radius:2px;color:var(--warm);margin-bottom:24px;display:inline-block;}
.map-btn{font-family:var(--sans);font-size:11px;font-weight:600;letter-spacing:.2em;text-transform:uppercase;background:transparent;color:var(--obsidian);border:1px solid var(--obsidian);padding:12px 24px;cursor:pointer;transition:all .25s;border-radius:1px;display:inline-flex;align-items:center;gap:8px;width:fit-content;}
.map-btn:hover{background:var(--obsidian);color:var(--gold);}
.hold-note{font-size:12px;font-weight:300;color:var(--warm);padding:12px 16px;background:var(--bgalt);border-left:2px solid var(--gold);border-radius:0 2px 2px 0;margin-top:16px;line-height:1.6;}

/* ── TICKET TEASER ── */
.tickets-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.ticket-card{background:#fff;border:1px solid var(--lgray);border-radius:2px;overflow:hidden;cursor:pointer;transition:all .3s;position:relative;}
.ticket-card:hover{border-color:var(--gold);transform:translateY(-4px);box-shadow:0 16px 40px rgba(26,21,18,.08);}
.ticket-card.sold-out{opacity:.65;cursor:default;pointer-events:none;}
.ticket-card.sold-out:hover{transform:none;box-shadow:none;}
.ticket-card-featured{border-color:var(--gold);}
.ticket-header{padding:24px 24px 0;}
.ticket-tag{font-size:10px;font-weight:600;letter-spacing:.25em;text-transform:uppercase;color:var(--gold);margin-bottom:10px;}
.ticket-name{font-family:var(--serif);font-size:24px;font-weight:400;color:var(--obsidian);line-height:1.1;margin-bottom:10px;}
.ticket-desc{font-size:13px;font-weight:300;color:var(--warm);line-height:1.7;margin-bottom:20px;}
.ticket-pricing{padding:20px 24px;border-top:1px solid var(--lgray);background:var(--bgalt);}
.ticket-regular{font-size:12px;font-weight:300;color:var(--warm);text-decoration:line-through;margin-bottom:2px;}
.ticket-eb{font-family:var(--serif);font-size:32px;font-weight:300;color:var(--obsidian);line-height:1;}
.ticket-eb-label{font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;color:var(--gold-dk);background:var(--gold-lt);padding:3px 8px;border-radius:100px;margin-left:8px;}
.ticket-avail{padding:16px 24px;display:flex;align-items:center;justify-content:space-between;}
.avail-bar{height:3px;background:var(--lgray);border-radius:2px;flex:1;margin-right:12px;overflow:hidden;}
.avail-fill{height:100%;background:var(--gold);border-radius:2px;transition:width .6s ease;}
.avail-text{font-size:11px;font-weight:500;color:var(--warm);white-space:nowrap;}
.avail-urgent{color:#C0534B;}
.ticket-sold-badge{position:absolute;top:16px;right:16px;background:var(--charcoal);color:rgba(253,250,244,.7);font-size:10px;font-weight:600;letter-spacing:.15em;text-transform:uppercase;padding:5px 10px;border-radius:1px;}
.ticket-cta{padding:0 24px 24px;}

/* ── BUTTONS ── */
.btn{font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:.2em;text-transform:uppercase;cursor:pointer;transition:all .25s;border:none;outline:none;display:inline-flex;align-items:center;justify-content:center;gap:8px;border-radius:1px;}
.btn-primary{background:var(--obsidian);color:#FDFAF4;padding:15px 36px;}
.btn-primary:hover{background:var(--gold);color:var(--obsidian);}
.btn-outline{background:transparent;color:var(--obsidian);padding:14px 36px;border:1px solid var(--obsidian);}
.btn-outline:hover{background:var(--obsidian);color:#FDFAF4;}
.btn-gold{background:var(--gold);color:var(--obsidian);padding:15px 36px;}
.btn-gold:hover{background:var(--gold-dk);color:#fff;}
.btn-ghost{background:transparent;color:var(--gold);padding:14px 36px;border:1px solid var(--gold);}
.btn-ghost:hover{background:var(--gold);color:var(--obsidian);}
.btn-sm{padding:10px 22px !important;font-size:11px !important;}
.btn-lg{padding:18px 48px !important;font-size:13px !important;}
.btn-full{width:100%;}
.btn:disabled{opacity:.4;cursor:not-allowed;}

/* ── MODAL ── */
.modal-overlay{position:fixed;inset:0;background:rgba(26,21,18,.75);backdrop-filter:blur(4px);z-index:200;display:flex;align-items:center;justify-content:center;padding:24px;animation:fadeIn .2s ease;}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
.modal{background:#fff;border-radius:2px;width:100%;max-width:680px;max-height:90vh;overflow-y:auto;position:relative;animation:slideUp .25s ease;}
@keyframes slideUp{from{transform:translateY(20px);opacity:0;}to{transform:translateY(0);opacity:1;}}
.modal-close{position:absolute;top:20px;right:20px;width:32px;height:32px;background:var(--lgray);border:none;border-radius:50%;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--warm);transition:all .2s;z-index:1;}
.modal-close:hover{background:var(--obsidian);color:#FDFAF4;}
.modal-hero{background:var(--obsidian);padding:40px 40px 36px;position:relative;overflow:hidden;}
.modal-hero::before{content:'';position:absolute;inset:0;background:url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23C9A96E' fill-opacity='0.06'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");pointer-events:none;}
.modal-event-label{font-size:10px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;}
.modal-event-title{font-family:var(--serif);font-size:clamp(24px,3vw,32px);font-weight:300;color:#FDFAF4;line-height:1.1;margin-bottom:16px;}
.modal-event-meta{display:flex;gap:24px;flex-wrap:wrap;}
.modal-meta-item{font-size:12px;font-weight:300;color:#AEA89F;display:flex;align-items:center;gap:6px;}
.modal-body{padding:32px 40px;}
.modal-section-title{font-size:10px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:20px;}
.ticket-list{display:flex;flex-direction:column;gap:16px;margin-bottom:32px;}
.ticket-row{border:1px solid var(--lgray);border-radius:2px;padding:20px 24px;transition:border-color .2s;cursor:pointer;position:relative;}
.ticket-row:hover:not(.disabled){border-color:var(--gold);}
.ticket-row.selected{border-color:var(--gold);background:rgba(201,169,110,.04);}
.ticket-row.disabled{opacity:.5;cursor:default;}
.ticket-row-top{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:8px;}
.ticket-row-name{font-family:var(--serif);font-size:20px;font-weight:400;color:var(--obsidian);}
.ticket-row-price{text-align:right;flex-shrink:0;}
.ticket-row-regular{font-size:12px;font-weight:300;color:var(--warm);text-decoration:line-through;}
.ticket-row-eb{font-family:var(--serif);font-size:24px;font-weight:300;color:var(--obsidian);line-height:1;}
.ticket-row-desc{font-size:13px;font-weight:300;color:var(--warm);line-height:1.65;margin-bottom:12px;}
.ticket-row-footer{display:flex;align-items:center;justify-content:space-between;}
.ticket-avail-mini{display:flex;align-items:center;gap:8px;}
.avail-dot{width:6px;height:6px;border-radius:50%;background:var(--gold);flex-shrink:0;}
.avail-dot.low{background:#C9A030;}
.avail-dot.out{background:#C0534B;}
.avail-mini-text{font-size:11px;font-weight:400;color:var(--warm);}
.qty-control{display:flex;align-items:center;gap:0;}
.qty-btn{width:32px;height:32px;background:var(--bgalt);border:1px solid var(--lgray);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;color:var(--charcoal);transition:all .15s;font-family:var(--sans);}
.qty-btn:hover{background:var(--gold);border-color:var(--gold);color:var(--obsidian);}
.qty-val{width:40px;height:32px;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:400;border-top:1px solid var(--lgray);border-bottom:1px solid var(--lgray);}
.eb-window{background:rgba(201,169,110,.08);border:1px solid rgba(201,169,110,.2);border-radius:2px;padding:12px 16px;margin-bottom:24px;display:flex;align-items:center;gap:12px;}
.eb-icon{font-size:16px;flex-shrink:0;}
.eb-text{font-size:12px;font-weight:300;color:var(--charcoal);line-height:1.5;}
.eb-text strong{font-weight:500;color:var(--gold-dk);}
.order-summary{background:var(--bgalt);border:1px solid var(--lgray);border-radius:2px;padding:24px;margin-bottom:24px;}
.order-row{display:flex;justify-content:space-between;align-items:center;font-size:13px;font-weight:300;color:var(--charcoal);padding:6px 0;}
.order-row:not(:last-child){border-bottom:1px solid var(--lgray);}
.order-total{font-family:var(--serif);font-size:22px;font-weight:400;color:var(--obsidian);display:flex;justify-content:space-between;align-items:center;padding-top:12px;margin-top:4px;border-top:1px solid var(--lgray);}
.modal-disclaimer{font-size:11px;font-weight:300;color:var(--warm);line-height:1.65;padding:12px 0 0;border-top:1px solid var(--lgray);}

/* ── FOOTER ── */
.footer{background:var(--obsidian);padding:64px 80px 48px;}
.footer-top{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;margin-bottom:48px;}
.footer-brand{font-family:var(--serif);font-size:28px;font-weight:300;color:#FDFAF4;margin-bottom:12px;}
.footer-brand em{color:var(--gold);font-style:italic;}
.footer-tagline{font-size:13px;font-weight:300;color:#6E6460;line-height:1.7;max-width:280px;}
.footer-col-title{font-size:10px;font-weight:600;letter-spacing:.3em;text-transform:uppercase;color:var(--gold);margin-bottom:16px;}
.footer-links{display:flex;flex-direction:column;gap:10px;}
.footer-link{font-size:13px;font-weight:300;color:#6E6460;cursor:pointer;text-decoration:none;transition:color .2s;}
.footer-link:hover{color:var(--gold);}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;border-top:1px solid rgba(201,169,110,.1);padding-top:24px;}
.footer-copy{font-size:12px;font-weight:300;color:#4A4440;}
.footer-orn{display:flex;align-items:center;gap:12px;}
.footer-orn span{width:32px;height:1px;}
`;

/* ─── COUNTDOWN HOOK ─────────────────────────────────────── */
function useCountdown(target) {
  const [t, setT] = useState(() => {
    const d = new Date(target) - new Date();
    return d > 0 ? d : 0;
  });
  useEffect(() => {
    const iv = setInterval(() => {
      const d = new Date(target) - new Date();
      setT(d > 0 ? d : 0);
    }, 1000);
    return () => clearInterval(iv);
  }, [target]);
  const d = Math.floor(t / 86400000);
  const h = Math.floor((t % 86400000) / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  return { d, h, m, s, expired: t === 0 };
}

/* ─── HELPERS ────────────────────────────────────────────── */
const fmt = (n) => "₱" + n.toLocaleString();
const fmtDate = (d) => new Date(d).toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
const fmtTime = (t) => { const [h, m] = t.split(":"); const hh = +h; return `${hh % 12 || 12}:${m} ${hh < 12 ? "AM" : "PM"}`; };
const pct = (t) => Math.round((t.sold / t.quantity) * 100);
const isEBActive = (t) => new Date() >= new Date(t.early_bird_start_at) && new Date() <= new Date(t.early_bird_end_at);
const rem = (t) => t.quantity - t.sold;

/* ─── TICKET MODAL ───────────────────────────────────────── */
function TicketModal({ onClose }) {
  const [qty, setQty] = useState({});
  const cd = useCountdown(EVENT.ticket_types[0].early_bird_end_at);

  const getQty = (id) => qty[id] || 0;
  const setQ = (id, v) => setQty(prev => ({ ...prev, [id]: Math.max(0, Math.min(v, 10)) }));

  const active = EVENT.ticket_types.filter(t => t.status !== "sold_out");
  const lines = active.filter(t => getQty(t.id) > 0).map(t => ({
    ...t, qty: getQty(t.id),
    price: isEBActive(t) ? t.early_bird_price : t.regular_price
  }));
  const total = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const hasItems = total > 0;

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose}>✕</button>

        {/* modal hero */}
        <div className="modal-hero">
          <div className="modal-event-label">Secure Your Place</div>
          <div className="modal-event-title">{EVENT.name}</div>
          <div className="modal-event-meta">
            <span className="modal-meta-item">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round" /></svg>
              {fmtDate(EVENT.event_date)}
            </span>
            <span className="modal-meta-item">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" strokeLinecap="round" /></svg>
              {fmtTime(EVENT.event_time)}
            </span>
            <span className="modal-meta-item">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              {EVENT.venue}
            </span>
          </div>
        </div>

        <div className="modal-body">
          {/* early bird countdown */}
          {!cd.expired && (
            <div className="eb-window">
              <span className="eb-icon">⏳</span>
              <div className="eb-text">
                <strong>Early Bird pricing ends in {cd.d}d {cd.h}h {cd.m}m {cd.s}s.</strong> Lock in discounted rates before they expire.
              </div>
            </div>
          )}

          <div className="modal-section-title">Select Tickets</div>
          <div className="ticket-list">
            {EVENT.ticket_types.map(t => {
              const ebOn = isEBActive(t);
              const price = ebOn ? t.early_bird_price : t.regular_price;
              const sold = t.status === "sold_out";
              const remaining = rem(t);
              const low = remaining <= 20 && !sold;
              return (
                <div key={t.id} className={`ticket-row${sold ? " disabled" : ""}${getQty(t.id) > 0 ? " selected" : ""}`}>
                  <div className="ticket-row-top">
                    <div>
                      <div className="ticket-row-name">{t.name}</div>
                      {sold && <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: ".15em", textTransform: "uppercase", color: "#C0534B", background: "#FCEAEA", padding: "3px 8px", borderRadius: 1 }}>Sold Out</span>}
                    </div>
                    <div className="ticket-row-price">
                      {ebOn && <div className="ticket-row-regular">{fmt(t.regular_price)}</div>}
                      <div className="ticket-row-eb">{fmt(price)}
                        {ebOn && <span className="ticket-eb-label">Early Bird</span>}
                      </div>
                    </div>
                  </div>
                  <div className="ticket-row-desc">{t.description}</div>
                  <div className="ticket-row-footer">
                    <div className="ticket-avail-mini">
                      <div className={`avail-dot${low ? " low" : sold ? " out" : ""}`} />
                      <span className="avail-mini-text">
                        {sold ? "No tickets remaining" : low ? `Only ${remaining} left!` : `${remaining} available`}
                      </span>
                    </div>
                    {!sold && (
                      <div className="qty-control">
                        <button className="qty-btn" onClick={() => setQ(t.id, getQty(t.id) - 1)}>−</button>
                        <div className="qty-val">{getQty(t.id)}</div>
                        <button className="qty-btn" onClick={() => setQ(t.id, getQty(t.id) + 1)} disabled={getQty(t.id) >= remaining}>+</button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* order summary */}
          {hasItems && (
            <div className="order-summary">
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".25em", textTransform: "uppercase", color: "#C9A96E", marginBottom: 14 }}>Order Summary</div>
              {lines.map(l => (
                <div key={l.id} className="order-row">
                  <span>{l.name} × {l.qty}</span>
                  <span>{fmt(l.price * l.qty)}</span>
                </div>
              ))}
              <div className="order-total">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          )}

          <button className="btn btn-gold btn-full btn-lg" disabled={!hasItems}>
            {hasItems ? `Proceed to Checkout — ${fmt(total)}` : "Select Tickets to Continue"}
          </button>

          <div className="modal-disclaimer">
            Seats are reserved for <strong>{EVENT.capacity_hold_minutes} minutes</strong> while browsing and <strong>{EVENT.payment_hold_minutes} minutes</strong> during payment. Tickets are non-refundable. By purchasing, you agree to our Terms & Conditions.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── MAP PLACEHOLDER ────────────────────────────────────── */
function MapSection() {
  return (
    <div className="map-section">
      <div className="map-frame">
        <div className="map-placeholder" />
        {/* mock grid lines */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.3 }} viewBox="0 0 400 360" preserveAspectRatio="xMidYMid slice">
          {[0,40,80,120,160,200,240,280,320,360,400].map(x => <line key={x} x1={x} y1="0" x2={x} y2="360" stroke="#8B7355" strokeWidth=".5"/>)}
          {[0,40,80,120,160,200,240,280,320,360].map(y => <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#8B7355" strokeWidth=".5"/>)}
          <rect x="120" y="60" width="120" height="40" fill="#C9A96E" opacity=".15" rx="2"/>
          <rect x="60" y="140" width="80" height="60" fill="#C9A96E" opacity=".1" rx="2"/>
          <rect x="260" y="100" width="100" height="80" fill="#C9A96E" opacity=".1" rx="2"/>
          <rect x="140" y="180" width="160" height="100" fill="#C9A96E" opacity=".2" rx="2"/>
          <path d="M0 200 Q 80 180 160 200 Q 240 220 400 200" stroke="#8B7355" strokeWidth="3" fill="none" opacity=".4"/>
        </svg>
        <div className="map-ripple" />
        <div className="map-pin">
          <div className="map-pin-dot" />
          <div className="map-pin-line" />
        </div>
        <div style={{ position: "absolute", bottom: 16, left: 16, background: "rgba(26,21,18,.8)", padding: "8px 14px", borderRadius: 2, backdropFilter: "blur(4px)" }}>
          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: ".1em", textTransform: "uppercase", color: "#C9A96E" }}>{EVENT.venue}</span>
        </div>
      </div>
      <div className="map-info">
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: ".3em", textTransform: "uppercase", color: "#C9A96E", marginBottom: 12 }}>Venue & Location</div>
        <div className="map-venue">{EVENT.venue}</div>
        <div className="map-address">{EVENT.formatted_address}</div>
        <div className="map-coords">{EVENT.lat.toFixed(4)}° N, {Math.abs(EVENT.lng).toFixed(4)}° E</div>
        <button className="map-btn">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Open in Google Maps
        </button>
        <div className="hold-note">
          ℹ Seats reserved for {EVENT.capacity_hold_minutes} min during browsing · {EVENT.payment_hold_minutes} min during checkout
        </div>
      </div>
    </div>
  );
}

/* ─── MAIN PAGE ──────────────────────────────────────────── */
export default function LandingPage() {
  const [modal, setModal] = useState(false);
  const cd = useCountdown(EVENT.event_date + "T" + EVENT.event_time);
  const ebCd = useCountdown(EVENT.ticket_types[0].early_bird_end_at);
  const lowestEB = Math.min(...EVENT.ticket_types.filter(t => t.status !== "sold_out" && isEBActive(t)).map(t => t.early_bird_price));
  const lowestReg = Math.min(...EVENT.ticket_types.filter(t => t.status !== "sold_out").map(t => t.regular_price));
  const displayPrice = isNaN(lowestEB) ? lowestReg : lowestEB;
  const ebActive = !isNaN(lowestEB);

  return (
    <div>
      <style>{css}</style>
      {modal && <TicketModal onClose={() => setModal(false)} />}

      {/* NAV */}
      <nav className="nav">
        <span className="nav-brand">Eternal <em>Affair</em></span>
        <ul className="nav-links">
          {["About", "Venue", "Tickets", "Vendors"].map((l, i) => (
            <li key={i}><a className="nav-link">{l}</a></li>
          ))}
        </ul>
        <button className="nav-cta" onClick={() => setModal(true)}>Get Tickets</button>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-img" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-eyebrow">October 18–20, 2025</div>
          <h1 className="hero-title">{EVENT.name.split(" ").slice(0, 2).join(" ")} <em>{EVENT.name.split(" ").slice(2).join(" ")}</em></h1>
          <p className="hero-sub">The Philippines' most celebrated wedding showcase</p>
          <div className="hero-meta">
            <div className="hero-meta-item">
              <div className="hero-meta-icon">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="hero-meta-label">Date</span>
                {fmtDate(EVENT.event_date)}
              </div>
            </div>
            <div className="hero-meta-item">
              <div className="hero-meta-icon">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
              </div>
              <div>
                <span className="hero-meta-label">Time</span>
                {fmtTime(EVENT.event_time)} onwards
              </div>
            </div>
            <div className="hero-meta-item">
              <div className="hero-meta-icon">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              </div>
              <div>
                <span className="hero-meta-label">Venue</span>
                {EVENT.venue}
              </div>
            </div>
            <div className="hero-meta-item">
              <div className="hero-meta-icon">
                <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>
              </div>
              <div>
                <span className="hero-meta-label">Starting from</span>
                {ebActive ? <><span style={{ textDecoration: "line-through", opacity: .5, marginRight: 6 }}>{fmt(lowestReg)}</span>{fmt(displayPrice)} Early Bird</> : fmt(displayPrice)}
              </div>
            </div>
          </div>
          <div className="hero-actions">
            <button className="btn btn-gold btn-lg" onClick={() => setModal(true)}>Secure Your Tickets</button>
            <button className="btn btn-ghost">Explore Vendors</button>
          </div>
        </div>
      </section>

      {/* COUNTDOWN */}
      <div className="countdown-bar">
        <div>
          <div className="cd-label">Event Begins In</div>
          <div style={{ fontSize: 12, fontWeight: 300, color: "#6E6460", marginTop: 2 }}>{fmtDate(EVENT.event_date)}</div>
        </div>
        <div className="cd-units">
          {[["d", cd.d], ["h", cd.h], ["m", cd.m], ["s", cd.s]].map(([l, v], i) => (
            <>
              {i > 0 && <span key={`sep${i}`} className="cd-sep">:</span>}
              <div key={l} className="cd-unit">
                <span className="cd-num">{String(v).padStart(2, "0")}</span>
                <span className="cd-sub">{["Days","Hours","Mins","Secs"][i]}</span>
              </div>
            </>
          ))}
        </div>
        {!ebCd.expired && (
          <div>
            <div className="cd-label">Early Bird Ends In</div>
            <div className="cd-price-tag" style={{ marginTop: 4 }}>
              <strong>{ebCd.d}d {ebCd.h}h {ebCd.m}m {ebCd.s}s</strong> · Save up to {fmt(EVENT.ticket_types[1].regular_price - EVENT.ticket_types[1].early_bird_price)}
            </div>
          </div>
        )}
      </div>

      {/* ABOUT */}
      <section className="section">
        <div className="about-grid">
          <div>
            <p className="sec-eyebrow">About the Event</p>
            <h2 className="sec-title">Where Weddings<br />Come to Life</h2>
            <div className="orn"><span className="orn-l"/><div className="diamond"/><span className="orn-r"/></div>
            <p className="about-text">{EVENT.description}</p>
          </div>
          <div>
            <div className="about-stats">
              {[["248+", "Curated Vendors"],["6,400", "Expected Guests"],["3", "Days of Magic"],["50+", "Live Demos"]].map(([v,l]) => (
                <div key={l} className="astat">
                  <div className="astat-val">{v.includes("+") ? <>{v.replace("+","")}<em>+</em></> : v.includes(",") ? <>{v.split(",")[0]}<em>,{v.split(",")[1]}</em></> : v}</div>
                  <div className="astat-label">{l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* INFO CARDS */}
      <section className="section section-alt">
        <p className="sec-eyebrow">Event Details</p>
        <h2 className="sec-title">Everything You Need to Know</h2>
        <div className="orn"><span className="orn-l"/><div className="diamond"/><span className="orn-r"/></div>
        <div className="info-row">
          <div className="info-card">
            <div className="info-card-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18" strokeLinecap="round"/></svg>
            </div>
            <div className="info-card-label">Date</div>
            <div className="info-card-value">{fmtDate(EVENT.event_date)}</div>
            <div className="info-card-sub">3-day event ending October 20, 2025</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2" strokeLinecap="round"/></svg>
            </div>
            <div className="info-card-label">Opens At</div>
            <div className="info-card-value">{fmtTime(EVENT.event_time)}</div>
            <div className="info-card-sub">Doors open daily · Last entry 5:00 PM</div>
          </div>
          <div className="info-card">
            <div className="info-card-icon">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#C9A96E" strokeWidth="1.5"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </div>
            <div className="info-card-label">Location</div>
            <div className="info-card-value">{EVENT.venue}</div>
            <div className="info-card-sub">{EVENT.formatted_address}</div>
          </div>
        </div>
        <MapSection />
      </section>

      {/* TICKETS */}
      <section className="section section-dark">
        <p className="sec-eyebrow" style={{ color: "#C9A96E" }}>Ticketing</p>
        <h2 className="sec-title sec-title-light">Choose Your Experience</h2>
        <div className="orn"><span className="orn-l"/><div className="diamond"/><span className="orn-r"/></div>
        <div className="tickets-grid">
          {EVENT.ticket_types.map((t, i) => {
            const ebOn = isEBActive(t);
            const price = ebOn ? t.early_bird_price : t.regular_price;
            const avPct = pct(t);
            const remaining = rem(t);
            const low = remaining <= 20;
            const sold = t.status === "sold_out";
            return (
              <div key={t.id} className={`ticket-card${sold ? " sold-out" : i === 1 ? " ticket-card-featured" : ""}`} onClick={() => !sold && setModal(true)}>
                {sold && <div className="ticket-sold-badge">Sold Out</div>}
                <div className="ticket-header">
                  <div className="ticket-tag">{["Classic","Premium","Ultimate"][i]} Tier</div>
                  <div className="ticket-name">{t.name}</div>
                  <div className="ticket-desc">{t.description}</div>
                </div>
                <div className="ticket-pricing">
                  {ebOn && <div className="ticket-regular">{fmt(t.regular_price)}</div>}
                  <div className="ticket-eb">{fmt(price)}{ebOn && <span className="ticket-eb-label">Early Bird</span>}</div>
                </div>
                {!sold && (
                  <div className="ticket-avail">
                    <div className="avail-bar">
                      <div className="avail-fill" style={{ width: `${avPct}%`, background: low ? "#C9A030" : "#C9A96E" }} />
                    </div>
                    <span className={`avail-text${low ? " avail-urgent" : ""}`}>{low ? `Only ${remaining} left!` : `${remaining} remaining`}</span>
                  </div>
                )}
                <div className="ticket-cta">
                  <button className={`btn ${i === 1 ? "btn-gold" : "btn-outline"} btn-full${sold ? "" : ""}`} disabled={sold}
                    style={{ borderColor: i !== 1 ? "#fff" : undefined, color: i !== 1 && !sold ? "#fff" : undefined }}>
                    {sold ? "Unavailable" : "Select Ticket"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <button className="btn btn-gold btn-lg" onClick={() => setModal(true)}>View All Tickets & Purchase</button>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-top">
          <div>
            <div className="footer-brand">Eternal <em>Affair</em></div>
            <div className="footer-tagline">The Philippines' most celebrated wedding expo — a curated showcase of luxury, elegance, and love.</div>
          </div>
          <div>
            <div className="footer-col-title">Event</div>
            <div className="footer-links">
              {["About the Expo","Vendor Directory","Floor Map","Schedule","FAQs"].map(l => <a key={l} className="footer-link">{l}</a>)}
            </div>
          </div>
          <div>
            <div className="footer-col-title">Organizers</div>
            <div className="footer-links">
              {["Booth Registration","Sponsorships","Media Inquiries","Partnerships","Press Kit"].map(l => <a key={l} className="footer-link">{l}</a>)}
            </div>
          </div>
          <div>
            <div className="footer-col-title">Contact</div>
            <div className="footer-links">
              <a className="footer-link">hello@eternalaffair.ph</a>
              <a className="footer-link">+63 917 800 0025</a>
              <a className="footer-link">Instagram</a>
              <a className="footer-link">Facebook</a>
            </div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="footer-copy">© 2025 Eternal Affair Wedding Expo. All rights reserved.</div>
          <div className="footer-orn">
            <span style={{ background: "linear-gradient(to right,transparent,rgba(201,169,110,.3))", height: 1 }} />
            <div className="diamond" />
            <span style={{ background: "linear-gradient(to left,transparent,rgba(201,169,110,.3))", height: 1 }} />
          </div>
          <div className="footer-copy">Event ID: {EVENT.public_slug}</div>
        </div>
      </footer>
    </div>
  );
}
