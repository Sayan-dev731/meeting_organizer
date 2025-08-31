// Admin Dashboard initialization

let currentMeetings = [];
let filteredMeetings = [];
let currentMeetingDetails = null;
let dashboardStatistics = null; // Store statistics from n8n workflow

document.addEventListener('DOMContentLoaded', function () {
    console.log('🚀 DOM Content Loaded, waiting for session...');
    // Add a small delay to ensure session is properly established
    setTimeout(() => {
        initializeAdminDashboard();
    }, 100);
});

function initializeAdminDashboard() {
    console.log('🚀 Initializing admin dashboard...');
    setupEventListeners();

    // Show empty dashboard first
    updateDashboardStats();
    renderMeetingsTable();

    // Try to load data automatically, but don't block initialization
    console.log('📊 Attempting automatic data load...');
    loadDashboardData().catch(error => {
        console.log('⚠️ Automatic load failed:', error.message);
        showAlert('Click "Refresh" to load meetings', 'info');
    });

    // Set up auto-refresh
    setInterval(refreshMeetings, 30000); // Refresh every 30 seconds
    console.log('✅ Admin dashboard initialized');
}

function setupEventListeners() {
    // Close modals when clicking outside
    document.addEventListener('click', function (event) {
        if (event.target.classList.contains('modal')) {
            closeAllModals();
        }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeAllModals();
        }
    });
}

async function loadDashboardData() {
    console.log('📈 Starting to load dashboard data...');
    try {
        // Use the same simple approach as the refresh button
        console.log('🔄 Calling refreshMeetings...');
        await refreshMeetings();
        console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
        console.error('❌ Dashboard loading error:', error);
        showAlert('Failed to load dashboard data. Please try refreshing the page.', 'error');
    }
}

async function loadMeetings() {
    console.log('🔍 Starting loadMeetings function...');
    try {
        // Fetch with cache-busting to ensure fresh data
        console.log('📡 Fetching from main API endpoint...');
        const url = `/api/admin/meetings?t=${Date.now()}`;
        let response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: { 'Accept': 'application/json' }
        });

        console.log('📊 API Response status:', response.status);

        if (response.status === 401) {
            // Session might not be ready yet, retry once after a delay
            console.log('🔐 Got 401, checking if session needs time to establish...');
            await new Promise(resolve => setTimeout(resolve, 500));
            try {
                const retryResponse = await fetch(`/api/admin/meetings?t=${Date.now()}`, {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                if (retryResponse.status === 401) {
                    console.log('🔐 Still unauthorized after retry, redirecting to login...');
                    window.location.href = '/admin';
                    return;
                }
                console.log('✅ Retry successful, updating response...');
                response = retryResponse;
            } catch (retryError) {
                console.log('❌ Retry failed, redirecting to login...');
                window.location.href = '/admin';
                return;
            }
        }

        // Parse response JSON once
        let result = await response.json();
        console.log('📋 API Response result:', result);

        // Debug the response structure
        console.log('🔍 Response structure analysis:');
        console.log('- result.success:', result?.success);
        console.log('- result.meetings type:', typeof result?.meetings, 'length:', result?.meetings?.length);
        console.log('- result.statistics:', result?.statistics);
        console.log('- result.message:', result?.message);
        console.log('- result.lastUpdated:', result?.lastUpdated);
        console.log('- Available properties:', result ? Object.keys(result) : 'none');

        // If no meetings returned, try the test endpoint to provide data
        if (response.ok && (!result?.meetings || result.meetings.length === 0)) {
            console.log('📊 No meetings from n8n, trying test endpoint...');
            try {
                const testResponse = await fetch('/api/admin/meetings/test', {
                    method: 'GET',
                    credentials: 'include',
                    headers: { 'Accept': 'application/json' }
                });
                if (testResponse.ok) {
                    const testResult = await testResponse.json();
                    if (Array.isArray(testResult?.meetings) && testResult.meetings.length > 0) {
                        result = testResult;
                        console.log('🧪 Using test data:', testResult.meetings.length, 'meetings');
                        showAlert('Using test data - check your n8n workflow configuration', 'warning');
                    }
                }
            } catch (testError) {
                console.log('❌ Test endpoint also failed:', testError);
            }
        }

        if (response.ok) {
            console.log('✅ Response received successfully');
            console.log('📊 Full response data:', result);

            // Normalize meetings from various possible shapes
            let meetings = [];
            const nested = result?.json || {};
            if (Array.isArray(result)) {
                meetings = result;
            } else if (Array.isArray(result?.meetings)) {
                meetings = result.meetings;
            } else if (Array.isArray(result?.data)) {
                meetings = result.data;
            } else if (Array.isArray(nested?.meetings)) {
                meetings = nested.meetings;
            } else if (Array.isArray(nested?.data)) {
                meetings = nested.data;
            }

            currentMeetings = Array.isArray(meetings) ? meetings : [];
            filteredMeetings = [...currentMeetings];

            // Capture statistics if provided
            dashboardStatistics = result?.statistics || nested?.statistics || null;
            if (dashboardStatistics) {
                console.log('📊 Statistics received:', dashboardStatistics);
            }

            console.log('✅ Meetings loaded:', currentMeetings.length, 'meetings found');
            if (currentMeetings.length > 0) {
                console.log('🔍 First meeting sample:', currentMeetings[0]);
            }

            // Update UI
            renderMeetingsTable();
            updateDashboardStats();
        } else {
            throw new Error(result?.error || result?.message || 'Failed to load meetings');
        }
    } catch (error) {
        console.error('Load meetings error:', error);
        // Initialize as empty arrays to prevent iteration errors
        currentMeetings = [];
        filteredMeetings = [];

        // Show sample data for demo purposes if it's a network/fetch error
        if (error?.message?.includes('fetch') || error?.name === 'TypeError') {
            currentMeetings = getSampleMeetings();
            filteredMeetings = [...currentMeetings];
            renderMeetingsTable();
            showAlert('Demo mode: Using sample data. Check n8n connection.', 'warning');
        } else {
            // For other errors, show empty state
            renderMeetingsTable();
            showAlert(`Failed to load meetings: ${error.message}`, 'error');
        }
    }
}

function getSampleMeetings() {
    return [
        {
            requestId: 'req_001',
            userName: 'John Smith',
            userEmail: 'john.smith@company.com',
            userPhone: '+1 (555) 123-4567',
            userCompany: 'Tech Solutions Inc.',
            userPosition: 'Product Manager',
            meetingPurpose: 'Product Demo and Discussion',
            meetingDescription: 'Interested in our new platform features and integration possibilities.',
            preferredDate: '2024-12-15',
            preferredTime: '14:00',
            estimatedDuration: '60',
            meetingType: 'online',
            location: '',
            urgency: 'high',
            additionalNotes: 'Prefer video call via Google Meet',
            status: 'pending',
            timestamp: '2024-12-10T09:30:00Z'
        },
        {
            requestId: 'req_002',
            userName: 'Sarah Johnson',
            userEmail: 'sarah.j@example.com',
            userPhone: '+1 (555) 987-6543',
            userCompany: 'Marketing Pro',
            userPosition: 'Marketing Director',
            meetingPurpose: 'Partnership Discussion',
            meetingDescription: 'Exploring potential collaboration opportunities.',
            preferredDate: '2024-12-16',
            preferredTime: '10:30',
            estimatedDuration: '90',
            meetingType: 'offline',
            location: 'Office Building A, Conference Room 3',
            urgency: 'normal',
            additionalNotes: '',
            status: 'approved',
            timestamp: '2024-12-09T14:15:00Z'
        },
        {
            requestId: 'req_003',
            userName: 'Mike Chen',
            userEmail: 'mike.chen@startup.io',
            userPhone: '+1 (555) 456-7890',
            userCompany: 'Innovation Startup',
            userPosition: 'CTO',
            meetingPurpose: 'Technical Consultation',
            meetingDescription: 'Need advice on system architecture and scalability.',
            preferredDate: '2024-12-14',
            preferredTime: '16:00',
            estimatedDuration: '45',
            meetingType: 'hybrid',
            location: 'Main Office + Online',
            urgency: 'urgent',
            additionalNotes: 'Time-sensitive project decision required',
            status: 'rescheduled',
            timestamp: '2024-12-08T11:20:00Z'
        }
    ];
}

function updateDashboardStats() {
    // Ensure currentMeetings is an array
    if (!Array.isArray(currentMeetings)) {
        currentMeetings = [];
    }

    let total, pending, approved, thisWeek;

    // Use statistics from n8n workflow if available
    if (dashboardStatistics && typeof dashboardStatistics === 'object') {
        console.log('📊 Using statistics from n8n workflow:', dashboardStatistics);
        total = dashboardStatistics.totalCount || 0;
        pending = dashboardStatistics.pendingCount || 0;
        approved = dashboardStatistics.approvedCount || 0;

        // For weekly requests, still calculate from current data as it's not in n8n stats
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        thisWeek = currentMeetings.filter(m => {
            if (!m || !m.timestamp) return false;
            const meetingDate = new Date(m.timestamp);
            return meetingDate >= oneWeekAgo;
        }).length;
    } else {
        // Fallback to calculating from current meetings array
        console.log('📊 Calculating statistics from meetings array');
        total = currentMeetings.length;
        pending = currentMeetings.filter(m => m && m.status === 'pending').length;
        approved = currentMeetings.filter(m => m && m.status === 'approved').length;

        // Calculate this week's requests
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        thisWeek = currentMeetings.filter(m => {
            if (!m || !m.timestamp) return false;
            const meetingDate = new Date(m.timestamp);
            return meetingDate >= oneWeekAgo;
        }).length;
    }

    // Update DOM elements safely
    const totalElement = document.getElementById('totalRequests');
    const pendingElement = document.getElementById('pendingRequests');
    const approvedElement = document.getElementById('approvedRequests');
    const weeklyElement = document.getElementById('weeklyRequests');

    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
    if (approvedElement) approvedElement.textContent = approved;
    if (weeklyElement) weeklyElement.textContent = thisWeek;

    console.log('📊 Dashboard stats updated:', { total, pending, approved, thisWeek });
}

function renderMeetingsTable() {
    const tbody = document.getElementById('meetingsTableBody');
    const emptyState = document.getElementById('emptyState');

    // Ensure filteredMeetings is an array
    if (!Array.isArray(filteredMeetings)) {
        filteredMeetings = [];
    }

    if (filteredMeetings.length === 0) {
        if (tbody) tbody.innerHTML = '';
        if (emptyState) emptyState.style.display = 'block';
        return;
    }

    if (emptyState) emptyState.style.display = 'none';

    if (!tbody) {
        console.error('Meeting table body not found');
        return;
    }

    tbody.innerHTML = filteredMeetings.map(meeting => {
        // Safely handle meeting data with fallbacks
        if (!meeting) return '';

        // Handle the specific field names from n8n workflow
        const date = formatDate(meeting.preferredDate || meeting.displayDate || meeting.preferred_date || '');
        const time = formatTime(meeting.preferredTime || meeting.displayTime || meeting.preferred_time || '');
        const userName = meeting.userName || meeting.user_name || 'Unknown User';
        const userEmail = meeting.userEmail || meeting.user_email || '';
        const userCompany = meeting.userCompany || meeting.user_company || '';
        const meetingPurpose = meeting.meetingPurpose || meeting.meeting_purpose || 'No purpose specified';
        const meetingDescription = meeting.meetingDescription || meeting.meeting_description || '';
        const meetingType = meeting.meetingType || meeting.meeting_type || 'online';
        const status = meeting.status || 'pending';
        const priority = meeting.priority || meeting.urgency || 'normal';
        const requestId = meeting.requestId || meeting.request_id || meeting.id || '';
        const duration = meeting.duration || meeting.estimatedDuration || meeting.estimated_duration || 'N/A';

        // Use display fields from n8n workflow if available
        const statusDisplay = meeting.statusDisplay || formatStatus(status);
        const priorityDisplay = meeting.urgencyDisplay || formatPriority(priority);
        const typeDisplay = meeting.meetingTypeDisplay || formatMeetingType(meetingType);

        return `
            <tr>
                <td>
                    <div style="font-weight: 500;">${escapeHtml(userName)}</div>
                    <div style="font-size: 12px; color: var(--google-gray);">${escapeHtml(userEmail)}</div>
                    ${userCompany ? `<div style="font-size: 12px; color: var(--google-gray);">${escapeHtml(userCompany)}</div>` : ''}
                </td>
                <td>
                    <div style="font-weight: 500; margin-bottom: 4px;">${escapeHtml(meetingPurpose)}</div>
                    ${meetingDescription ? `<div style="font-size: 12px; color: var(--google-gray); max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(meetingDescription.substring(0, 100))}${meetingDescription.length > 100 ? '...' : ''}</div>` : ''}
                </td>
                <td>
                    <div style="font-weight: 500;">${date}</div>
                    <div style="font-size: 12px; color: var(--google-gray);">${time}</div>
                </td>
                <td>
                    <span class="status-badge status-type-${meetingType}">
                        ${typeDisplay}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${status}">
                        ${statusDisplay}
                    </span>
                </td>
                <td>
                    <span class="priority-badge priority-${priority}">
                        ${priorityDisplay}
                    </span>
                </td>
                <td>${duration} min</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn action-view" onclick="viewMeeting('${requestId}')" title="View Details">
                            👁️
                        </button>
                        ${status === 'pending' ? `
                            <button class="action-btn action-approve" onclick="showActionModal('${requestId}', 'approve')" title="Approve">
                                ✅
                            </button>
                            <button class="action-btn action-reject" onclick="showActionModal('${requestId}', 'reject')" title="Reject">
                                ❌
                            </button>
                            <button class="action-btn action-reschedule" onclick="showActionModal('${requestId}', 'reschedule')" title="Reschedule">
                                📅
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function viewMeeting(requestId) {
    const meeting = currentMeetings.find(m =>
        (m.requestId === requestId) ||
        (m.request_id === requestId) ||
        (m.id === requestId)
    );

    if (!meeting) {
        showAlert('Meeting not found', 'error');
        return;
    }

    currentMeetingDetails = meeting;

    const modal = document.getElementById('meetingModal');
    const modalTitle = document.getElementById('modalTitle');
    const meetingDetails = document.getElementById('meetingDetails');
    const modalFooter = document.getElementById('modalFooter');

    modalTitle.textContent = `Meeting Request - ${meeting.userName}`;

    meetingDetails.innerHTML = `
        <div class="detail-group">
            <div class="detail-label">Request ID:</div>
            <div class="detail-value">${meeting.requestId}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Requester:</div>
            <div class="detail-value">${escapeHtml(meeting.userName)}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${escapeHtml(meeting.userEmail)}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${escapeHtml(meeting.userPhone)}</div>
        </div>
        ${meeting.userCompany ? `
        <div class="detail-group">
            <div class="detail-label">Company:</div>
            <div class="detail-value">${escapeHtml(meeting.userCompany)}</div>
        </div>
        ` : ''}
        ${meeting.userPosition ? `
        <div class="detail-group">
            <div class="detail-label">Position:</div>
            <div class="detail-value">${escapeHtml(meeting.userPosition)}</div>
        </div>
        ` : ''}
        <div class="detail-group">
            <div class="detail-label">Meeting Purpose:</div>
            <div class="detail-value">${escapeHtml(meeting.meetingPurpose)}</div>
        </div>
        ${meeting.meetingDescription ? `
        <div class="detail-group">
            <div class="detail-label">Description:</div>
            <div class="detail-value">${escapeHtml(meeting.meetingDescription)}</div>
        </div>
        ` : ''}
        <div class="detail-group">
            <div class="detail-label">Preferred Date:</div>
            <div class="detail-value">${formatDate(meeting.preferredDate)}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Preferred Time:</div>
            <div class="detail-value">${formatTime(meeting.preferredTime)}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Duration:</div>
            <div class="detail-value">${meeting.estimatedDuration} minutes</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Meeting Type:</div>
            <div class="detail-value">${formatMeetingType(meeting.meetingType)}</div>
        </div>
        ${meeting.location ? `
        <div class="detail-group">
            <div class="detail-label">Location:</div>
            <div class="detail-value">${escapeHtml(meeting.location)}</div>
        </div>
        ` : ''}
        <div class="detail-group">
            <div class="detail-label">Priority:</div>
            <div class="detail-value">${formatPriority(meeting.urgency || 'normal')}</div>
        </div>
        <div class="detail-group">
            <div class="detail-label">Status:</div>
            <div class="detail-value">
                <span class="status-badge status-${meeting.status}">${formatStatus(meeting.status)}</span>
            </div>
        </div>
        ${meeting.additionalNotes ? `
        <div class="detail-group">
            <div class="detail-label">Additional Notes:</div>
            <div class="detail-value">${escapeHtml(meeting.additionalNotes)}</div>
        </div>
        ` : ''}
        <div class="detail-group">
            <div class="detail-label">Submitted:</div>
            <div class="detail-value">${formatDateTime(meeting.timestamp)}</div>
        </div>
    `;

    // Set up footer buttons
    modalFooter.innerHTML = `
        <button class="btn btn-secondary" onclick="closeMeetingModal()">Close</button>
        ${meeting.status === 'pending' ? `
            <button class="btn btn-success" onclick="closeMeetingModal(); showActionModal('${meeting.requestId}', 'approve')">Approve</button>
            <button class="btn btn-danger" onclick="closeMeetingModal(); showActionModal('${meeting.requestId}', 'reject')">Reject</button>
            <button class="btn btn-primary" onclick="closeMeetingModal(); showActionModal('${meeting.requestId}', 'reschedule')">Reschedule</button>
        ` : ''}
    `;

    modal.style.display = 'flex';
}

function showActionModal(requestId, action) {
    const meeting = currentMeetings.find(m => m.requestId === requestId);
    if (!meeting) return;

    const modal = document.getElementById('actionModal');
    const modalTitle = document.getElementById('actionModalTitle');
    const confirmBtn = document.getElementById('confirmActionBtn');
    const rescheduleFields = document.getElementById('rescheduleFields');

    // Set up modal content
    document.getElementById('actionRequestId').value = requestId;
    document.getElementById('actionType').value = action;

    const actionTitles = {
        'approve': 'Approve Meeting',
        'reject': 'Reject Meeting',
        'reschedule': 'Reschedule Meeting'
    };

    const actionColors = {
        'approve': 'btn-success',
        'reject': 'btn-danger',
        'reschedule': 'btn-primary'
    };

    modalTitle.textContent = actionTitles[action];
    confirmBtn.className = `btn ${actionColors[action]}`;
    confirmBtn.textContent = action.charAt(0).toUpperCase() + action.slice(1);

    // Show/hide reschedule fields
    if (action === 'reschedule') {
        rescheduleFields.style.display = 'block';

        // Pre-fill with current values
        document.getElementById('newDate').value = meeting.preferredDate;
        document.getElementById('newTime').value = meeting.preferredTime;
        document.getElementById('newLocation').value = meeting.location || '';
    } else {
        rescheduleFields.style.display = 'none';
    }

    // Clear form
    document.getElementById('adminNotes').value = '';

    modal.style.display = 'flex';
}

async function confirmAction() {
    const form = document.getElementById('actionForm');
    const formData = new FormData(form);
    const actionData = {};

    for (let [key, value] of formData.entries()) {
        actionData[key] = value.trim();
    }

    // Validation for reschedule
    if (actionData.action === 'reschedule') {
        if (!actionData.newDate || !actionData.newTime) {
            showAlert('Please provide new date and time for rescheduling.', 'error');
            return;
        }

        // Check if new date is in the future
        const newDate = new Date(`${actionData.newDate}T${actionData.newTime}`);
        const now = new Date();
        if (newDate <= now) {
            showAlert('Please select a future date and time.', 'error');
            return;
        }
    }

    try {
        showLoading(true);

        const response = await fetch('/api/admin/meeting/action', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(actionData)
        });

        const result = await response.json();

        if (response.ok && result.success) {
            showAlert(`Meeting ${actionData.action} successfully!`, 'success');
            closeActionModal();
            await refreshMeetings();
        } else {
            throw new Error(result.error || `Failed to ${actionData.action} meeting`);
        }

    } catch (error) {
        console.error('Action error:', error);
        showAlert(error.message || `Failed to ${actionData.action} meeting. Please try again.`, 'error');
    } finally {
        showLoading(false);
    }
}

async function refreshMeetings() {
    try {
        await loadMeetings();
        updateDashboardStats();
        showAlert('Meetings refreshed successfully!', 'success');
    } catch (error) {
        console.error('Refresh error:', error);
        showAlert('Failed to refresh meetings.', 'error');
    }
}

async function syncWithN8n() {
    console.log('🔄 Starting n8n sync...');

    // Get the sync button to show loading state
    const syncButton = document.querySelector('.sync-btn');
    const originalText = syncButton.innerHTML;

    try {
        // Show loading state
        syncButton.innerHTML = '<span>⏳</span><span>Syncing...</span>';
        syncButton.disabled = true;

        showAlert('Triggering n8n workflow sync...', 'info');

        console.log('📡 Calling n8n sync API...');
        const response = await fetch('/api/admin/sync-n8n', {
            method: 'POST',
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            }
        });

        const result = await response.json();
        console.log('📊 n8n sync response:', result);

        if (response.ok && result.success) {
            console.log('✅ n8n sync successful');

            // If we got meetings data back, update immediately
            if (result.meetings && Array.isArray(result.meetings)) {
                console.log('📈 Updating meetings data from sync response');
                currentMeetings = result.meetings;
                filteredMeetings = [...currentMeetings];

                // Store statistics if provided
                if (result.statistics) {
                    dashboardStatistics = result.statistics;
                    console.log('📊 Statistics from sync:', result.statistics);
                }

                renderMeetingsTable();
                updateDashboardStats();
            } else {
                // Otherwise refresh the data
                console.log('🔄 Refreshing meetings data after sync');
                await loadMeetings();
                updateDashboardStats();
            }

            showAlert('n8n workflow sync completed successfully! Data updated.', 'success');
        } else {
            console.error('❌ n8n sync failed:', result);
            const errorMessage = result.message || result.error || 'Failed to sync with n8n workflow';
            showAlert(`Sync failed: ${errorMessage}`, 'error');
        }

    } catch (error) {
        console.error('❌ n8n sync error:', error);
        showAlert(`n8n sync error: ${error.message}`, 'error');
    } finally {
        // Restore button state
        syncButton.innerHTML = originalText;
        syncButton.disabled = false;
    }
}

function applyFilters() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const typeFilter = document.getElementById('typeFilter').value;

    // Ensure currentMeetings is an array
    if (!Array.isArray(currentMeetings)) {
        currentMeetings = [];
    }

    filteredMeetings = currentMeetings.filter(meeting => {
        if (!meeting) return false;

        const status = meeting.status || 'pending';
        const priority = meeting.priority || meeting.urgency || 'normal';
        const meetingType = meeting.meetingType || meeting.meeting_type || 'online';

        if (statusFilter && status !== statusFilter) return false;
        if (priorityFilter && priority !== priorityFilter) return false;
        if (typeFilter && meetingType !== typeFilter) return false;
        return true;
    });

    renderMeetingsTable();
}

function clearFilters() {
    const statusFilter = document.getElementById('statusFilter');
    const priorityFilter = document.getElementById('priorityFilter');
    const typeFilter = document.getElementById('typeFilter');

    if (statusFilter) statusFilter.value = '';
    if (priorityFilter) priorityFilter.value = '';
    if (typeFilter) typeFilter.value = '';

    // Ensure currentMeetings is an array
    if (!Array.isArray(currentMeetings)) {
        currentMeetings = [];
    }

    filteredMeetings = [...currentMeetings];
    renderMeetingsTable();
}

async function logout() {
    try {
        const response = await fetch('/api/admin/logout', {
            method: 'POST',
            credentials: 'include'
        });

        if (response.ok) {
            window.location.href = '/admin';
        } else {
            throw new Error('Logout failed');
        }
    } catch (error) {
        console.error('Logout error:', error);
        // Force redirect anyway
        window.location.href = '/admin';
    }
}

function closeMeetingModal() {
    document.getElementById('meetingModal').style.display = 'none';
    currentMeetingDetails = null;
}

function closeActionModal() {
    document.getElementById('actionModal').style.display = 'none';

    // Clear form
    document.getElementById('actionForm').reset();
}

function closeAllModals() {
    closeMeetingModal();
    closeActionModal();
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertClass = `alert-${type}`;

    alertContainer.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;

    alertContainer.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        alertContainer.style.display = 'none';
    }, 5000);
}

function showLoading(show) {
    const loadingOverlay = document.getElementById('loadingOverlay');
    loadingOverlay.style.display = show ? 'flex' : 'none';
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatTime(timeString) {
    const [hours, minutes] = timeString.split(':');
    const time = new Date();
    time.setHours(parseInt(hours), parseInt(minutes));

    return time.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
}

function formatMeetingType(type) {
    const types = {
        'online': 'Online',
        'offline': 'In-Person',
        'hybrid': 'Hybrid'
    };
    return types[type] || type;
}

function formatStatus(status) {
    const statuses = {
        'pending': 'Pending',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'rescheduled': 'Rescheduled'
    };
    return statuses[status] || status;
}

function formatPriority(priority) {
    const priorities = {
        'low': 'Low',
        'normal': 'Normal',
        'high': 'High',
        'urgent': 'Urgent'
    };
    return priorities[priority] || priority;
}

function escapeHtml(text) {
    if (!text || typeof text !== 'string') {
        return '';
    }

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function (m) { return map[m]; });
}
