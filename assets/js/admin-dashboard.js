// Admin Dashboard JavaScript
let authToken = null;
let currentLeads = [];
let currentLead = null;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Check if user is already logged in
    authToken = localStorage.getItem('adminToken');
    if (authToken) {
        showDashboard();
        loadLeads();
    }

    // Event listeners
    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('searchInput').addEventListener('input', filterLeads);
    document.getElementById('vehicleFilter').addEventListener('change', filterLeads);
    document.getElementById('creditFilter').addEventListener('change', filterLeads);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('refreshBtn').addEventListener('click', loadLeads);
});

// Login
async function handleLogin(e) {
    e.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            document.getElementById('currentUser').textContent = data.username;
            showDashboard();
            loadLeads();
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Login failed. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Logout
function handleLogout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// Show Dashboard
function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'block';
}

// Load Leads
async function loadLeads() {
    const tableBody = document.getElementById('leadsTableBody');
    tableBody.innerHTML = '<tr class="loading-row"><td colspan="8"><i class="fas fa-spinner fa-spin"></i> Loading leads...</td></tr>';

    try {
        const response = await fetch('/api/applications', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentLeads = await response.json();
            displayLeads(currentLeads);
            updateStats(currentLeads);
        } else {
            if (response.status === 401 || response.status === 403) {
                handleLogout();
            } else {
                tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #dc3545;">Failed to load leads</td></tr>';
            }
        }
    } catch (error) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #dc3545;">Error loading leads</td></tr>';
    }
}

// Display Leads
function displayLeads(leads) {
    const tableBody = document.getElementById('leadsTableBody');

    if (leads.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 2rem; color: #64748b;">No leads found</td></tr>';
        return;
    }

    tableBody.innerHTML = leads.map(lead => `
        <tr>
            <td><strong>#${lead.id}</strong></td>
            <td>${formatDate(lead.submitted_at)}</td>
            <td>
                <div class="lead-name">${lead.first_name} ${lead.last_name}</div>
            </td>
            <td>
                <div class="lead-email">${lead.email}</div>
                <div class="lead-phone">${lead.phone}</div>
            </td>
            <td>${lead.vehicle_type}</td>
            <td>${lead.budget}</td>
            <td><span class="badge ${getCreditBadgeClass(lead.credit_score)}">${lead.credit_score}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewLead(${lead.id})">
                        <i class="fas fa-eye"></i> View
                    </button>
                    <button class="btn-action btn-delete" onclick="deleteLead(${lead.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Update Stats
function updateStats(leads) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1);

    const todayCount = leads.filter(lead => new Date(lead.submitted_at) >= today).length;
    const weekCount = leads.filter(lead => new Date(lead.submitted_at) >= weekAgo).length;
    const monthCount = leads.filter(lead => new Date(lead.submitted_at) >= monthAgo).length;

    document.getElementById('totalLeads').textContent = leads.length;
    document.getElementById('todayLeads').textContent = todayCount;
    document.getElementById('weekLeads').textContent = weekCount;
    document.getElementById('monthLeads').textContent = monthCount;
}

// View Lead Detail
async function viewLead(id) {
    try {
        const response = await fetch(`/api/applications/${id}`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            currentLead = await response.json();
            displayLeadDetail(currentLead);
            document.getElementById('leadModal').classList.add('active');
        }
    } catch (error) {
        alert('Error loading lead details');
    }
}

// Display Lead Detail
function displayLeadDetail(lead) {
    const content = document.getElementById('leadDetailContent');
    content.innerHTML = `
        <div class="lead-detail-grid">
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Customer Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Full Name</div>
                    <div class="detail-value">${lead.first_name} ${lead.last_name}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email Address</div>
                    <div class="detail-value">${lead.email}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone Number</div>
                    <div class="detail-value">${lead.phone}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Postal Code</div>
                    <div class="detail-value">${lead.postal_code}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-car"></i> Vehicle Preferences</h3>
                <div class="detail-row">
                    <div class="detail-label">Vehicle Type</div>
                    <div class="detail-value">${lead.vehicle_type}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Budget Range</div>
                    <div class="detail-value">${lead.budget}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Trade-In</div>
                    <div class="detail-value">${lead.trade_in}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-chart-line"></i> Financial Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Credit Score</div>
                    <div class="detail-value">
                        <span class="badge ${getCreditBadgeClass(lead.credit_score)}">${lead.credit_score}</span>
                    </div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Employment Status</div>
                    <div class="detail-value">${lead.employment}</div>
                </div>
            </div>

            <div class="detail-section">
                <h3><i class="fas fa-clock"></i> Lead Information</h3>
                <div class="detail-row">
                    <div class="detail-label">Lead ID</div>
                    <div class="detail-value">#${lead.id}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Submitted Date</div>
                    <div class="detail-value">${formatDateFull(lead.submitted_at)}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Time</div>
                    <div class="detail-value">${formatTime(lead.submitted_at)}</div>
                </div>
            </div>
        </div>
    `;
}

// Close Lead Modal
function closeLeadModal() {
    document.getElementById('leadModal').classList.remove('active');
    currentLead = null;
}

// Print Lead
function printLead() {
    window.print();
}

// Delete Lead
async function deleteLead(id) {
    if (!confirm('Are you sure you want to delete this lead? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/api/applications/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (response.ok) {
            loadLeads();
        } else {
            alert('Failed to delete lead');
        }
    } catch (error) {
        alert('Error deleting lead');
    }
}

// Filter Leads
function filterLeads() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const vehicleFilter = document.getElementById('vehicleFilter').value;
    const creditFilter = document.getElementById('creditFilter').value;

    const filtered = currentLeads.filter(lead => {
        const matchesSearch =
            lead.first_name.toLowerCase().includes(searchTerm) ||
            lead.last_name.toLowerCase().includes(searchTerm) ||
            lead.email.toLowerCase().includes(searchTerm) ||
            lead.phone.includes(searchTerm);

        const matchesVehicle = !vehicleFilter || lead.vehicle_type === vehicleFilter;
        const matchesCredit = !creditFilter || lead.credit_score === creditFilter;

        return matchesSearch && matchesVehicle && matchesCredit;
    });

    displayLeads(filtered);
}

// Export to CSV
function exportToCSV() {
    const headers = ['ID', 'Date', 'First Name', 'Last Name', 'Email', 'Phone', 'Postal Code', 'Vehicle Type', 'Budget', 'Trade-In', 'Credit Score', 'Employment'];

    const rows = currentLeads.map(lead => [
        lead.id,
        formatDate(lead.submitted_at),
        lead.first_name,
        lead.last_name,
        lead.email,
        lead.phone,
        lead.postal_code,
        lead.vehicle_type,
        lead.budget,
        lead.trade_in,
        lead.credit_score,
        lead.employment
    ]);

    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${cell}"`).join(',') + '\n';
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canada-drives-leads-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// Utility Functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateFull(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
    });
}

function getCreditBadgeClass(creditScore) {
    const classes = {
        'Excellent': 'badge-excellent',
        'Good': 'badge-good',
        'Fair': 'badge-fair',
        'Building': 'badge-building'
    };
    return classes[creditScore] || 'badge-fair';
}

// Close modal when clicking outside
document.addEventListener('click', (e) => {
    const modal = document.getElementById('leadModal');
    if (e.target === modal) {
        closeLeadModal();
    }
});
