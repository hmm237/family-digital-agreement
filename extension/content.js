// Content script to show switch-user reminder
// This script runs on every page load

function showReminder(userName) {
  // Check if reminder was already shown in this session (tab-specific)
  if (sessionStorage.getItem('fda_reminder_shown')) return;

  const banner = document.createElement('div');
  banner.id = 'fda-reminder-banner';
  banner.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: #6366f1;
    color: white;
    padding: 12px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    z-index: 999999;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    display: flex;
    align-items: center;
    gap: 12px;
    transition: transform 0.3s ease-out;
    transform: translateX(120%);
  `;

  banner.innerHTML = `
    <div style="font-weight: bold;">👤 Tracking as: ${userName}</div>
    <div style="font-size: 12px; opacity: 0.9;">Not you? Switch in extension.</div>
    <button id="fda-dismiss" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Dismiss</button>
  `;

  document.body.appendChild(banner);

  // Animate in
  setTimeout(() => {
    banner.style.transform = 'translateX(0)';
  }, 100);

  // Auto-dismiss after 8 seconds
  const autoDismiss = setTimeout(() => {
    dismiss();
  }, 8000);

  function dismiss() {
    banner.style.transform = 'translateX(120%)';
    setTimeout(() => banner.remove(), 300);
    sessionStorage.setItem('fda_reminder_shown', 'true');
  }

  document.getElementById('fda-dismiss').addEventListener('click', (e) => {
    clearTimeout(autoDismiss);
    dismiss();
  });
}

// Get config from background to see who is logged in
chrome.runtime.sendMessage({ action: 'getConfig' }, (config) => {
  if (config && config.enabled && config.userId) {
    // Fetch user info to get name
    fetch(`${config.apiUrl}/api/user-info?userId=${config.userId}`)
      .then(r => r.json())
      .then(user => {
        if (user && user.name) {
          showReminder(user.name);
        }
      })
      .catch(() => {});
  }
});
