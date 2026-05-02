// Popup script for Family Digital Agreement extension

let config = {
  apiUrl: '',
  familyId: '',
  userId: '',
  token: '',
  enabled: false,
}

// Load config on popup open
document.addEventListener('DOMContentLoaded', async () => {
  const result = await chrome.runtime.sendMessage({ action: 'getConfig' })
  config = { ...config, ...result }

  // Fill form
  if (result.apiUrl) document.getElementById('apiUrl').value = result.apiUrl
  if (result.familyId) document.getElementById('familyId').value = result.familyId
  if (result.userId) document.getElementById('userId').value = result.userId

  // Update UI
  document.getElementById('enabledToggle').checked = result.enabled

  // Show appropriate sections
  const hasConfig = result.apiUrl && result.familyId && result.userId
  document.getElementById('setup-section').classList.toggle('hidden', hasConfig)
  document.getElementById('control-section').classList.toggle('hidden', !hasConfig)

  updateStatus('info', hasConfig ? 'Extension configured and ready' : 'Please configure your family details')
})

async function saveConfig() {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  const familyId = document.getElementById('familyId').value.trim()
  const userId = document.getElementById('userId').value.trim()

  if (!apiUrl || !familyId || !userId) {
    updateStatus('error', 'All fields are required')
    return
  }

  const config = { apiUrl, familyId, userId, enabled: true }

  showStatus('Testing connection...', 'info')

  const result = await chrome.runtime.sendMessage({
    action: 'saveConfig',
    config,
  })

  if (result.success) {
    updateStatus('Configuration saved! Tracking enabled.', 'success')
    // Reload to update UI
    setTimeout(() => {
      document.location.reload()
    }, 1500)
  } else {
    updateStatus('Error: ' + result.error, 'error')
  }
}

async function toggleTracking() {
  const enabled = document.getElementById('enabledToggle').checked

  await chrome.runtime.sendMessage({
    action: 'updateConfig',
    update: { enabled }
  })

  updateStatus(enabled ? 'Tracking enabled' : 'Tracking paused', 'success')
}

function showStatus(message, type) {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = `status ${type}`
  status.classList.remove('hidden')
}

function updateStatus(message, type) {
  showStatus(message, type)
}
