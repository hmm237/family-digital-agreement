// Popup script for Family Digital Agreement extension

let config = {
  apiUrl: '',
  familyId: '',
  userId: '',
  token: '',
  enabled: false,
  forceTracking: false
}
let familyMembers = []
let pendingSwitchUserId = null

// Load config on popup open
document.addEventListener('DOMContentLoaded', async () => {
  try {
    const result = await chrome.runtime.sendMessage({ action: 'getConfig' })
    config = { ...config, ...result }

    // Fill form
    if (config.apiUrl) document.getElementById('apiUrl').value = config.apiUrl

    // Show appropriate sections
    const hasConfig = config.apiUrl && config.familyId && config.userId
    document.getElementById('setup-section').classList.toggle('hidden', !!hasConfig)
    document.getElementById('main-section').classList.toggle('hidden', !hasConfig)

    if (hasConfig) {
      await loadFamilyData()
      updateActiveUserUI()
    }

    // Auto-sync rules when opening extension
    if (hasConfig && config.enabled) {
      chrome.runtime.sendMessage({ action: 'syncRules' })
    }
  } catch (error) {
    console.error('[Popup] Init error:', error)
  }
})

async function joinFamily() {
  const apiUrl = document.getElementById('apiUrl').value.trim()
  const inviteCode = document.getElementById('inviteCode').value.trim().toUpperCase()

  if (!apiUrl || !inviteCode) {
    showStatus('Please enter URL and Invite Code', 'error')
    return
  }

  showStatus('Joining family...', 'info')

  try {
    const response = await fetch(`${apiUrl}/api/family/join?code=${inviteCode}`)
    const data = await response.json()

    if (data.success) {
      // Successfully joined
      // For first time setup, we'll ask who the user is from the members list
      config.apiUrl = apiUrl
      config.familyId = data.family.id
      config.forceTracking = data.family.force_tracking
      familyMembers = data.members
      
      showStatus('Select your name to finish setup', 'success')
      document.getElementById('setup-section').classList.add('hidden')
      document.getElementById('main-section').classList.remove('hidden')
      renderMemberList()
    } else {
      showStatus(data.error || 'Invalid invite code', 'error')
    }
  } catch (error) {
    showStatus('Connection failed. Check URL.', 'error')
  }
}

async function loadFamilyData() {
  try {
    const response = await fetch(`${config.apiUrl}/api/family/join?code=RELOAD&familyId=${config.familyId}`)
    const data = await response.json()
    if (data.success) {
      familyMembers = data.members
      config.forceTracking = data.family.force_tracking
      renderMemberList()
      updateActiveUserUI()
    }
  } catch (error) {
    console.error('Failed to load family members')
  }
}

function updateActiveUserUI() {
  const activeUser = familyMembers.find(m => m.id === config.userId)
  if (activeUser) {
    document.getElementById('activeName').textContent = activeUser.name
    document.getElementById('activeRole').textContent = activeUser.role
    document.getElementById('activeAvatar').textContent = activeUser.name[0].toUpperCase()
    document.getElementById('headerTitle').textContent = `Tracking: ${activeUser.name}`
  }
  
  const toggle = document.getElementById('enabledToggle')
  toggle.checked = config.enabled
  
  if (config.forceTracking) {
    toggle.checked = true
    toggle.disabled = true
    document.getElementById('forceBadge').classList.remove('hidden')
  } else {
    toggle.disabled = false
    document.getElementById('forceBadge').classList.add('hidden')
  }
}

function renderMemberList() {
  const list = document.getElementById('memberList')
  list.innerHTML = ''
  
  familyMembers.forEach(member => {
    const isCurrent = member.id === config.userId
    const div = document.createElement('div')
    div.className = `member-item ${isCurrent ? 'active' : ''}`
    div.innerHTML = `
      <div class="member-avatar">${member.name[0].toUpperCase()}</div>
      <div class="member-info">
        <div class="member-name">${member.name}</div>
        <div class="member-role">${member.role}</div>
      </div>
      <button class="btn-switch ${isCurrent ? 'current' : ''}" data-id="${member.id}" data-role="${member.role}" ${isCurrent ? 'disabled' : ''}>
        ${isCurrent ? 'Active' : 'Switch'}
      </button>
    `
    list.appendChild(div)
  })

  // Add event listeners to switch buttons
  document.querySelectorAll('.btn-switch').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const id = e.target.getAttribute('data-id')
      const role = e.target.getAttribute('data-role')
      handleSwitchUser(id, role)
    })
  })
}

function handleSwitchUser(id, role) {
  const member = familyMembers.find(m => m.id === id)
  if (member.role === 'parent') {
    // Need PIN for parent
    pendingSwitchUserId = id
    document.getElementById('pinModal').classList.remove('hidden')
    document.getElementById('pinInput').focus()
  } else {
    // Direct switch for children
    executeSwitch(id)
  }
}

async function executeSwitch(id) {
  config.userId = id
  config.enabled = true // Auto-enable on switch
  await chrome.runtime.sendMessage({ action: 'saveConfig', config })
  showStatus('Switched user successfully', 'success')
  document.getElementById('pinModal').classList.add('hidden')
  document.getElementById('pinInput').value = ''
  setTimeout(() => location.reload(), 1000)
}

async function verifyPin() {
  const pin = document.getElementById('pinInput').value
  if (!pin) return

  const member = familyMembers.find(m => m.id === pendingSwitchUserId)
  // In a real app, we'd verify this against the API. 
  // For now, we'll fetch member details and check.
  try {
    const response = await fetch(`${config.apiUrl}/api/family/verify-pin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: pendingSwitchUserId, pin })
    })
    const data = await response.json()
    if (data.success) {
      executeSwitch(pendingSwitchUserId)
    } else {
      showStatus('Incorrect PIN', 'error')
    }
  } catch (error) {
    showStatus('PIN verification failed', 'error')
  }
}

async function toggleTracking() {
  const enabled = document.getElementById('enabledToggle').checked
  config.enabled = enabled
  await chrome.runtime.sendMessage({
    action: 'updateConfig',
    update: { enabled }
  })
  showStatus(enabled ? 'Tracking enabled' : 'Tracking paused', 'success')
}

function showStatus(message, type) {
  const status = document.getElementById('status')
  status.textContent = message
  status.className = `status ${type}`
  status.classList.remove('hidden')
  setTimeout(() => status.classList.add('hidden'), 3000)
}

// Event Listeners
document.getElementById('joinBtn').addEventListener('click', joinFamily)
document.getElementById('enabledToggle').addEventListener('change', toggleTracking)
document.getElementById('syncRulesBtn').addEventListener('click', () => {
  chrome.runtime.sendMessage({ action: 'syncRules' })
  showStatus('Rules synced', 'success')
})
document.getElementById('logoutBtn').addEventListener('click', async () => {
  if (confirm('Exit family group? This will clear all settings.')) {
    const emptyConfig = { apiUrl: '', familyId: '', userId: '', token: '', enabled: false, forceTracking: false }
    await chrome.runtime.sendMessage({ action: 'updateConfig', update: emptyConfig })
    location.reload()
  }
})

document.getElementById('confirmPinBtn').addEventListener('click', verifyPin)
document.getElementById('cancelPinBtn').addEventListener('click', () => {
  document.getElementById('pinModal').classList.add('hidden')
  document.getElementById('pinInput').value = ''
})
document.getElementById('pinInput').addEventListener('keypress', (e) => {
  if (e.key === 'Enter') verifyPin()
})