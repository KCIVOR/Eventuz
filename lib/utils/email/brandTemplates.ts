/**
 * "Eternal Affair" Design System - Email Templates
 * Centralized brand shell for all transactional emails.
 */

interface EmailShellOptions {
  title: string;
  eyebrow?: string;
  contentHtml: string;
  footerText?: string;
}

export function brandEmailShell({
  title,
  eyebrow = "Eventuz",
  contentHtml,
  footerText = "Crafted for celebrations"
}: EmailShellOptions): string {
  const champagne = "#C9A96E";
  const ivory = "#FDFAF4";
  const obsidian = "#1A1512";
  const charcoal = "#2E2825";
  const warmGray = "#7A6E68";
  const border = "#EDE8E3";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @media only screen and (max-width: 640px) {
      body {
        padding: 20px 12px !important;
      }
      .eventuz-email-container {
        width: 100% !important;
        max-width: 100% !important;
      }
      .eventuz-email-card {
        padding: 32px 22px !important;
      }
      .eventuz-email-title {
        font-size: 24px !important;
      }
      .eventuz-email-button {
        box-sizing: border-box !important;
        display: block !important;
        width: 100% !important;
        max-width: 320px !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: center !important;
      }
      .eventuz-email-qr {
        width: 100% !important;
        max-width: 240px !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body style="margin:0;padding:40px 20px;font-family:'Helvetica Neue', Helvetica, Arial, sans-serif;background-color:${ivory};color:${obsidian};-webkit-font-smoothing:antialiased;">
  <div class="eventuz-email-container" style="max-width:600px;margin:0 auto;">
    
    <!-- Main Content Card -->
    <div class="eventuz-email-card" style="background-color:#ffffff;border:1px solid ${border};border-radius:2px;padding:48px 40px;box-shadow:0 4px 12px rgba(26,21,18,0.03);">
      
      <!-- Header Ornament -->
      <div style="text-align:center;margin-bottom:32px;">
        <div style="display:inline-block;padding:0 15px;position:relative;">
          <div style="height:1px;width:40px;background:linear-gradient(to right, transparent, ${champagne});position:absolute;left:-40px;top:50%;"></div>
          <div style="width:6px;height:6px;background-color:${champagne};transform:rotate(45deg);display:inline-block;vertical-align:middle;"></div>
          <div style="height:1px;width:40px;background:linear-gradient(to left, transparent, ${champagne});position:absolute;right:-40px;top:50%;"></div>
        </div>
        <p style="margin:16px 0 0;font-size:10px;font-weight:600;letter-spacing:0.35em;text-transform:uppercase;color:${champagne};">${eyebrow}</p>
      </div>

      <!-- Title -->
      <h1 class="eventuz-email-title" style="margin:0 0 24px;font-family:Georgia, serif;font-size:28px;font-weight:300;text-align:center;color:${obsidian};line-height:1.2;">
        ${title}
      </h1>

      <!-- Divider -->
      <div style="height:1px;background-color:${border};margin-bottom:32px;width:100%;"></div>

      <!-- Content -->
      <div style="font-size:15px;line-height:1.7;color:${charcoal};font-weight:300;">
        ${contentHtml}
      </div>

    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:40px 20px;">
      <p style="margin:0 0 8px;font-family:Georgia, serif;font-size:18px;font-weight:300;color:${obsidian};letter-spacing:0.05em;">Eventuz</p>
      <p style="margin:0;font-size:10px;font-weight:400;letter-spacing:0.3em;text-transform:uppercase;color:${warmGray};">${footerText}</p>
      <div style="margin-top:24px;font-size:11px;color:rgba(122,110,104,0.5);">
        &copy; ${new Date().getFullYear()} Eventuz. All rights reserved.
      </div>
    </div>

  </div>
</body>
</html>
  `.trim();
}

/**
 * Utility for gold primary buttons in emails
 */
export function emailButtonHtml(label: string, url: string): string {
  return `
    <div style="margin:32px 0;text-align:center;">
      <a href="${url}" class="eventuz-email-button" style="display:inline-block;background-color:#1A1512;color:#FDFAF4;padding:14px 32px;font-size:12px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:1px;transition:background-color 0.2s;">
        ${label}
      </a>
    </div>
  `.trim();
}

/**
 * Utility for secondary outline buttons in emails
 */
export function emailSecondaryButtonHtml(label: string, url: string): string {
  return `
    <div style="margin:32px 0;text-align:center;">
      <a href="${url}" class="eventuz-email-button" style="display:inline-block;background-color:transparent;border:1px solid #1A1512;color:#1A1512;padding:14px 32px;font-size:12px;font-weight:500;letter-spacing:0.2em;text-transform:uppercase;text-decoration:none;border-radius:1px;">
        ${label}
      </a>
    </div>
  `.trim();
}
