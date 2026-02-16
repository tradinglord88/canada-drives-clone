// =====================================================
// GREEN LIGHT AUTOMOTIVE - ADMIN CRM DASHBOARD
// =====================================================

let authToken = null;
let currentTab = 'applications';
let applicationsData = [];
let sellData = [];
let leadInquiriesData = [];

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    authToken = localStorage.getItem('adminToken');
    if (authToken) {
        showDashboard();
        loadAllData();
    }

    document.getElementById('loginForm').addEventListener('submit', handleLogin);
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);

    const vehicleFilter = document.getElementById('vehicleFilter');
    const creditFilter = document.getElementById('creditFilter');
    if (vehicleFilter) vehicleFilter.addEventListener('change', handleSearch);
    if (creditFilter) creditFilter.addEventListener('change', handleSearch);
});

// =====================================================
// AUTH
// =====================================================
async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();
        if (response.ok) {
            authToken = data.token;
            localStorage.setItem('adminToken', authToken);
            const userEl = document.getElementById('currentUser');
            if (userEl) userEl.textContent = data.username || 'Admin';
            showDashboard();
            loadAllData();
        } else {
            errorDiv.textContent = data.error || 'Invalid credentials';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

function handleLogout() {
    authToken = null;
    localStorage.removeItem('adminToken');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardScreen').style.display = 'none';
    document.getElementById('loginForm').reset();
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) errorDiv.style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardScreen').style.display = 'flex';
}

// =====================================================
// DATA LOADING
// =====================================================
async function loadAllData() {
    await Promise.all([loadApplications(), loadSellSubmissions(), loadLeadInquiries()]);
    renderCurrentTab();
}

function loadCurrentTab() {
    loadAllData();
}

async function loadApplications() {
    try {
        const response = await fetch('/api/applications', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            applicationsData = await response.json();
        } else if (response.status === 401) {
            handleLogout();
        }
    } catch (error) {
        console.error('Error loading applications:', error);
    }
}

async function loadSellSubmissions() {
    try {
        const response = await fetch('/api/sell-submissions', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            sellData = await response.json();
        }
    } catch (error) {
        console.error('Error loading sell submissions:', error);
    }
}

async function loadLeadInquiries() {
    try {
        const response = await fetch('/api/lead-inquiries', {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            leadInquiriesData = await response.json();
        }
    } catch (error) {
        console.error('Error loading lead inquiries:', error);
    }
}

// =====================================================
// TAB SWITCHING
// =====================================================
function switchTab(tab, el) {
    currentTab = tab;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-item').forEach(item => item.classList.remove('active'));
    if (el) el.classList.add('active');

    // Reset search and filters
    document.getElementById('searchInput').value = '';

    renderCurrentTab();
}

function renderCurrentTab() {
    updateSidebarCounts();

    if (currentTab === 'applications') {
        renderApplicationsTab();
    } else if (currentTab === 'sell') {
        renderSellTab();
    } else if (currentTab === 'leadInquiries') {
        renderLeadInquiriesTab();
    }
}

function updateSidebarCounts() {
    const appCount = document.getElementById('sidebarAppCount');
    const sellCount = document.getElementById('sidebarSellCount');
    const inquiryCount = document.getElementById('sidebarInquiryCount');
    if (appCount) appCount.textContent = applicationsData.length;
    if (sellCount) sellCount.textContent = sellData.length;
    if (inquiryCount) inquiryCount.textContent = leadInquiriesData.length;
}

// =====================================================
// APPLICATIONS TAB
// =====================================================
function renderApplicationsTab() {
    document.getElementById('pageTitle').textContent = 'Pre-Approval Applications';
    document.getElementById('pageSubtitle').textContent = 'Manage incoming finance applications';

    // Stats
    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const todayCount = applicationsData.filter(a => new Date(a.submitted_at).toDateString() === today).length;
    const weekCount = applicationsData.filter(a => new Date(a.submitted_at) >= weekAgo).length;
    const pendingCount = applicationsData.filter(a => !a.deal_status || a.deal_status === 'pending').length;

    renderStats([
        { label: 'Total Applications', value: applicationsData.length, icon: 'fas fa-file-alt', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        { label: "Today's Leads", value: todayCount, icon: 'fas fa-calendar-day', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
        { label: 'This Week', value: weekCount, icon: 'fas fa-chart-line', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { label: 'Pending Review', value: pendingCount, icon: 'fas fa-clock', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' }
    ]);

    // Filters
    document.getElementById('filterControls').innerHTML = `
        <select id="vehicleFilter" class="filter-select" onchange="handleSearch()">
            <option value="">All Vehicles</option>
            <option value="sedan">Sedan</option>
            <option value="suv">SUV</option>
            <option value="truck">Truck</option>
            <option value="coupe">Coupe</option>
            <option value="hatchback">Hatchback</option>
            <option value="van">Van</option>
        </select>
        <select id="creditFilter" class="filter-select" onchange="handleSearch()">
            <option value="">All Credit</option>
            <option value="Excellent">Excellent</option>
            <option value="Good">Good</option>
            <option value="Fair">Fair</option>
            <option value="Building">Building</option>
        </select>
        <button class="btn-export" onclick="exportToCSV()"><i class="fas fa-file-export"></i> Export</button>
    `;

    // Table head
    document.getElementById('tableHead').innerHTML = `
        <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Vehicle</th>
            <th>Budget</th>
            <th>Credit</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;

    displayApplications(applicationsData);
}

function displayApplications(data) {
    const tbody = document.getElementById('tableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-inbox"></i><p>No applications found</p></td></tr>';
        return;
    }

    tbody.innerHTML = data.map(app => `
        <tr>
            <td><strong>#${app.id}</strong></td>
            <td>${formatDate(app.submitted_at)}</td>
            <td><div class="lead-name">${app.first_name} ${app.last_name}</div></td>
            <td>
                <div class="lead-email">${app.email}</div>
                <div class="lead-phone">${app.phone}</div>
            </td>
            <td>${app.vehicle_type || '-'}</td>
            <td>${app.budget || '-'}</td>
            <td><span class="badge ${getCreditBadgeClass(app.credit_score)}">${app.credit_score || '-'}</span></td>
            <td><span class="badge badge-${(app.deal_status || 'pending')}">${capitalize(app.deal_status || 'pending')}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewApplication(${app.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-action btn-delete" onclick="deleteApplication(${app.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// =====================================================
// SELL REQUESTS TAB
// =====================================================
function renderSellTab() {
    document.getElementById('pageTitle').textContent = 'Sell Car Submissions';
    document.getElementById('pageSubtitle').textContent = 'Manage vehicle sell requests from customers';

    const today = new Date().toDateString();
    const weekAgo = new Date(Date.now() - 7 * 86400000);
    const todayCount = sellData.filter(s => new Date(s.submitted_at).toDateString() === today).length;
    const weekCount = sellData.filter(s => new Date(s.submitted_at) >= weekAgo).length;

    renderStats([
        { label: 'Total Requests', value: sellData.length, icon: 'fas fa-car', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        { label: "Today's Requests", value: todayCount, icon: 'fas fa-calendar-day', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
        { label: 'This Week', value: weekCount, icon: 'fas fa-chart-line', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { label: 'Total Vehicles', value: sellData.length, icon: 'fas fa-warehouse', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' }
    ]);

    document.getElementById('filterControls').innerHTML = `
        <button class="btn-export" onclick="exportSellCSV()"><i class="fas fa-file-export"></i> Export</button>
    `;

    document.getElementById('tableHead').innerHTML = `
        <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Customer</th>
            <th>Contact</th>
            <th>Vehicle</th>
            <th>Year</th>
            <th>Mileage</th>
            <th>Condition</th>
            <th>Actions</th>
        </tr>
    `;

    displaySellSubmissions(sellData);
}

function displaySellSubmissions(data) {
    const tbody = document.getElementById('tableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-car"></i><p>No sell requests found</p></td></tr>';
        return;
    }

    tbody.innerHTML = data.map(sub => `
        <tr>
            <td><strong>#${sub.id}</strong></td>
            <td>${formatDate(sub.submitted_at)}</td>
            <td><div class="lead-name">${sub.first_name} ${sub.last_name}</div></td>
            <td>
                <div class="lead-email">${sub.email}</div>
                <div class="lead-phone">${sub.phone}</div>
            </td>
            <td>${sub.make || ''} ${sub.model || ''}</td>
            <td>${sub.year || '-'}</td>
            <td>${sub.mileage || '-'} ${sub.mileage_unit || 'km'}</td>
            <td>${sub.condition || '-'}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewSellSubmission(${sub.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-action btn-delete" onclick="deleteSellSubmission(${sub.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `).join('');
}

// =====================================================
// LEAD INQUIRIES TAB
// =====================================================
function renderLeadInquiriesTab() {
    document.getElementById('pageTitle').textContent = 'Dealership Lead Inquiries';
    document.getElementById('pageSubtitle').textContent = 'Manage dealership partnership requests from Buy Leads page';

    const newCount = leadInquiriesData.filter(i => !i.status || i.status === 'new').length;
    const contactedCount = leadInquiriesData.filter(i => i.status === 'contacted').length;

    renderStats([
        { label: 'Total Inquiries', value: leadInquiriesData.length, icon: 'fas fa-handshake', gradient: 'linear-gradient(135deg, #6366f1, #8b5cf6)' },
        { label: 'New / Unread', value: newCount, icon: 'fas fa-bell', gradient: 'linear-gradient(135deg, #10b981, #059669)' },
        { label: 'Contacted', value: contactedCount, icon: 'fas fa-phone-alt', gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
        { label: 'Closed', value: leadInquiriesData.length - newCount - contactedCount, icon: 'fas fa-check-circle', gradient: 'linear-gradient(135deg, #ec4899, #db2777)' }
    ]);

    document.getElementById('filterControls').innerHTML = `
        <select id="statusFilter" class="filter-select" onchange="handleSearch()">
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="closed">Closed</option>
        </select>
        <button class="btn-export" onclick="exportInquiriesCSV()"><i class="fas fa-file-export"></i> Export</button>
    `;

    document.getElementById('tableHead').innerHTML = `
        <tr>
            <th>ID</th>
            <th>Date</th>
            <th>Dealership</th>
            <th>Contact</th>
            <th>Location</th>
            <th>Package</th>
            <th>Volume</th>
            <th>Status</th>
            <th>Actions</th>
        </tr>
    `;

    displayLeadInquiries(leadInquiriesData);
}

function displayLeadInquiries(data) {
    const tbody = document.getElementById('tableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-state"><i class="fas fa-handshake"></i><p>No dealer inquiries yet</p></td></tr>';
        return;
    }

    tbody.innerHTML = data.map(inq => {
        const status = inq.status || 'new';
        return `
        <tr>
            <td><strong>#${inq.id}</strong></td>
            <td>${formatDate(inq.created_at)}</td>
            <td><div class="lead-name">${inq.dealership_name}</div></td>
            <td>
                <div class="lead-email">${inq.email}</div>
                <div class="lead-phone">${inq.phone}</div>
            </td>
            <td>${inq.location}</td>
            <td>${capitalize(inq.package || 'professional')}</td>
            <td>${inq.monthly_volume || '51-100'}</td>
            <td><span class="badge badge-${status}">${capitalize(status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-action btn-view" onclick="viewLeadInquiry(${inq.id})"><i class="fas fa-eye"></i> View</button>
                    <button class="btn-action btn-delete" onclick="deleteLeadInquiry(${inq.id})"><i class="fas fa-trash"></i></button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// =====================================================
// STATS RENDERING
// =====================================================
function renderStats(stats) {
    const container = document.getElementById('statsContainer');
    container.innerHTML = stats.map(s => `
        <div class="stat-card">
            <div class="stat-icon" style="background: ${s.gradient};">
                <i class="${s.icon}"></i>
            </div>
            <div class="stat-content">
                <h3>${s.value}</h3>
                <p>${s.label}</p>
            </div>
        </div>
    `).join('');
}

// =====================================================
// VIEW DETAIL MODALS
// =====================================================
async function viewApplication(id) {
    try {
        const response = await fetch(`/api/applications/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const lead = await response.json();
            showApplicationDetail(lead);
        }
    } catch (error) {
        console.error('Error loading application:', error);
    }
}

function showApplicationDetail(lead) {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-user-tie"></i> Application Details';
    const content = document.getElementById('leadDetailContent');

    let documentsHtml = '';
    const hasPaystub = lead.paystub_file && lead.paystub_file.length > 10;
    const hasLicense = lead.drivers_license_file && lead.drivers_license_file.length > 10;

    if (hasPaystub || hasLicense) {
        documentsHtml = `
            <div class="detail-section documents-section">
                <h3><i class="fas fa-file-alt"></i> Documents</h3>
                <div class="documents-grid">
                    ${hasPaystub ? `
                        <div class="document-item">
                            <div class="document-label"><i class="fas fa-file-invoice-dollar"></i> Paystub</div>
                            <div class="document-preview">
                                ${isImageFile(lead.paystub_file) ?
                                    `<a href="${lead.paystub_file}" target="_blank" class="document-link"><img src="${lead.paystub_file}" alt="Paystub" class="document-thumbnail"></a>` :
                                    `<a href="${lead.paystub_file}" download class="document-link"><i class="fas fa-file-pdf"></i> Download</a>`}
                            </div>
                        </div>` : ''}
                    ${hasLicense ? `
                        <div class="document-item">
                            <div class="document-label"><i class="fas fa-id-card"></i> License</div>
                            <div class="document-preview">
                                ${isImageFile(lead.drivers_license_file) ?
                                    `<a href="${lead.drivers_license_file}" target="_blank" class="document-link"><img src="${lead.drivers_license_file}" alt="License" class="document-thumbnail"></a>` :
                                    `<a href="${lead.drivers_license_file}" download class="document-link"><i class="fas fa-file-pdf"></i> Download</a>`}
                            </div>
                        </div>` : ''}
                </div>
            </div>`;
    }

    content.innerHTML = `
        <div class="lead-detail-grid">
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Customer</h3>
                <div class="detail-row"><div class="detail-label">Full Name</div><div class="detail-value">${lead.first_name} ${lead.last_name}</div></div>
                <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">${lead.email}</div></div>
                <div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value">${lead.phone}</div></div>
                <div class="detail-row"><div class="detail-label">Address</div><div class="detail-value">${lead.street_address || '-'}, ${lead.city || '-'}, ${lead.province || '-'} ${lead.postal_code || ''}</div></div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-car"></i> Vehicle</h3>
                <div class="detail-row"><div class="detail-label">Type</div><div class="detail-value">${lead.vehicle_type || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Budget</div><div class="detail-value">${lead.budget || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Trade-In</div><div class="detail-value">${lead.trade_in || '-'}</div></div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-chart-line"></i> Financial</h3>
                <div class="detail-row"><div class="detail-label">Credit Score</div><div class="detail-value"><span class="badge ${getCreditBadgeClass(lead.credit_score)}">${lead.credit_score || '-'}</span></div></div>
                <div class="detail-row"><div class="detail-label">Employment</div><div class="detail-value">${lead.employment || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Income Type</div><div class="detail-value">${lead.income_type || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Annual Income</div><div class="detail-value">${lead.annual_income ? '$' + Number(lead.annual_income).toLocaleString() : '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Monthly Income</div><div class="detail-value">${lead.monthly_income ? '$' + Number(lead.monthly_income).toLocaleString() : '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Time at Job</div><div class="detail-value">${lead.income_years ? lead.income_years + 'y' : ''}${lead.income_months ? ' ' + lead.income_months + 'm' : ''} ${!lead.income_years && !lead.income_months ? '-' : ''}</div></div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-briefcase"></i> Employment</h3>
                <div class="detail-row"><div class="detail-label">Company</div><div class="detail-value">${lead.company_name || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Job Title</div><div class="detail-value">${lead.job_title || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Verified</div><div class="detail-value">${lead.income_verified || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Deal Status</div><div class="detail-value">
                    <select onchange="updateApplicationStatus(${lead.id}, this.value)" style="padding: 0.375rem 0.5rem; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 0.8125rem; font-family: inherit;">
                        <option value="pending" ${(lead.deal_status || 'pending') === 'pending' ? 'selected' : ''}>Pending</option>
                        <option value="contacted" ${lead.deal_status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="approved" ${lead.deal_status === 'approved' ? 'selected' : ''}>Approved</option>
                        <option value="declined" ${lead.deal_status === 'declined' ? 'selected' : ''}>Declined</option>
                    </select>
                </div></div>
                <div class="detail-row"><div class="detail-label">Referral</div><div class="detail-value">${lead.referrer_code || 'Direct'}</div></div>
                <div class="detail-row"><div class="detail-label">Submitted</div><div class="detail-value">${formatDateFull(lead.submitted_at)}</div></div>
            </div>
            ${documentsHtml}
        </div>`;

    document.getElementById('leadModal').classList.add('active');
}

async function viewSellSubmission(id) {
    try {
        const response = await fetch(`/api/sell-submissions/${id}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            showSellDetail(data);
        }
    } catch (error) {
        console.error('Error loading sell submission:', error);
    }
}

function showSellDetail(data) {
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-car"></i> Sell Request Details';
    const content = document.getElementById('leadDetailContent');

    let photosHtml = '';
    const photoFields = [
        { key: 'front_photo', label: 'Front' },
        { key: 'back_photo', label: 'Back' },
        { key: 'driver_photo', label: 'Driver Side' },
        { key: 'passenger_photo', label: 'Passenger' },
        { key: 'vin_photo', label: 'VIN' },
        { key: 'odometer_photo', label: 'Odometer' }
    ];

    const photos = photoFields.filter(p => data[p.key]);
    if (photos.length > 0) {
        photosHtml = `
            <div class="detail-section documents-section">
                <h3><i class="fas fa-camera"></i> Vehicle Photos</h3>
                <div class="documents-grid">
                    ${photos.map(p => `
                        <div class="document-item">
                            <div class="document-label">${p.label}</div>
                            <div class="document-preview">
                                <a href="/uploads/${data[p.key]}" target="_blank" class="document-link">
                                    <img src="/uploads/${data[p.key]}" alt="${p.label}" class="document-thumbnail">
                                </a>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>`;
    }

    content.innerHTML = `
        <div class="lead-detail-grid">
            <div class="detail-section">
                <h3><i class="fas fa-user"></i> Customer</h3>
                <div class="detail-row"><div class="detail-label">Full Name</div><div class="detail-value">${data.first_name} ${data.last_name}</div></div>
                <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">${data.email}</div></div>
                <div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value">${data.phone}</div></div>
                <div class="detail-row"><div class="detail-label">Postal Code</div><div class="detail-value">${data.postal_code || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Submitted</div><div class="detail-value">${formatDateFull(data.submitted_at)}</div></div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-car"></i> Vehicle Details</h3>
                <div class="detail-row"><div class="detail-label">Year</div><div class="detail-value">${data.year || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Make</div><div class="detail-value">${data.make || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Model</div><div class="detail-value">${data.model || '-'}</div></div>
                <div class="detail-row"><div class="detail-label">Mileage</div><div class="detail-value">${data.mileage || '-'} ${data.mileage_unit || 'km'}</div></div>
                <div class="detail-row"><div class="detail-label">Condition</div><div class="detail-value">${data.condition || '-'}</div></div>
            </div>
            ${photosHtml}
        </div>`;

    document.getElementById('leadModal').classList.add('active');
}

function viewLeadInquiry(id) {
    const inq = leadInquiriesData.find(i => i.id === id);
    if (!inq) return;

    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-handshake"></i> Dealership Inquiry';
    const content = document.getElementById('leadDetailContent');
    const status = inq.status || 'new';

    content.innerHTML = `
        <div class="lead-detail-grid">
            <div class="detail-section">
                <h3><i class="fas fa-building"></i> Dealership</h3>
                <div class="detail-row"><div class="detail-label">Company Name</div><div class="detail-value">${inq.dealership_name}</div></div>
                <div class="detail-row"><div class="detail-label">Contact Person</div><div class="detail-value">${inq.contact_name}</div></div>
                <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value"><a href="mailto:${inq.email}" style="color: #2563eb; text-decoration: none;">${inq.email}</a></div></div>
                <div class="detail-row"><div class="detail-label">Phone</div><div class="detail-value"><a href="tel:${inq.phone}" style="color: #2563eb; text-decoration: none;">${inq.phone}</a></div></div>
                <div class="detail-row"><div class="detail-label">Location</div><div class="detail-value">${inq.location}</div></div>
            </div>
            <div class="detail-section">
                <h3><i class="fas fa-cog"></i> Preferences</h3>
                <div class="detail-row"><div class="detail-label">Package</div><div class="detail-value">${capitalize(inq.package || 'professional')}</div></div>
                <div class="detail-row"><div class="detail-label">Monthly Volume</div><div class="detail-value">${inq.monthly_volume || '51-100'} leads/month</div></div>
                <div class="detail-row"><div class="detail-label">Submitted</div><div class="detail-value">${formatDateFull(inq.created_at)}</div></div>
                <div class="detail-row"><div class="detail-label">Status</div><div class="detail-value">
                    <select onchange="updateLeadInquiryStatus(${inq.id}, this.value)" style="padding: 0.375rem 0.5rem; border: 1.5px solid #e2e8f0; border-radius: 6px; font-size: 0.8125rem; font-family: inherit;">
                        <option value="new" ${status === 'new' ? 'selected' : ''}>New</option>
                        <option value="contacted" ${status === 'contacted' ? 'selected' : ''}>Contacted</option>
                        <option value="closed" ${status === 'closed' ? 'selected' : ''}>Closed</option>
                    </select>
                </div></div>
            </div>
            ${inq.message ? `
            <div class="detail-section documents-section">
                <h3><i class="fas fa-comment-alt"></i> Additional Notes</h3>
                <div class="detail-row"><div class="detail-value" style="white-space: pre-wrap; line-height: 1.6;">${inq.message}</div></div>
            </div>` : ''}
        </div>`;

    document.getElementById('leadModal').classList.add('active');
}

// =====================================================
// STATUS UPDATES
// =====================================================
async function updateApplicationStatus(id, status) {
    try {
        const response = await fetch(`/api/applications/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            await loadApplications();
            renderCurrentTab();
        }
    } catch (error) {
        console.error('Error updating status:', error);
    }
}

async function updateLeadInquiryStatus(id, status) {
    try {
        const response = await fetch(`/api/lead-inquiries/${id}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ status })
        });
        if (response.ok) {
            const inq = leadInquiriesData.find(i => i.id === id);
            if (inq) inq.status = status;
            updateSidebarCounts();
        }
    } catch (error) {
        console.error('Error updating inquiry status:', error);
    }
}

// =====================================================
// DELETE
// =====================================================
async function deleteApplication(id) {
    if (!confirm('Delete this application permanently?')) return;
    try {
        const response = await fetch(`/api/applications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            applicationsData = applicationsData.filter(a => a.id !== id);
            renderCurrentTab();
        }
    } catch (error) {
        console.error('Error deleting application:', error);
    }
}

async function deleteSellSubmission(id) {
    if (!confirm('Delete this sell request permanently?')) return;
    try {
        const response = await fetch(`/api/sell-submissions/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            sellData = sellData.filter(s => s.id !== id);
            renderCurrentTab();
        }
    } catch (error) {
        console.error('Error deleting sell submission:', error);
    }
}

async function deleteLeadInquiry(id) {
    if (!confirm('Delete this inquiry permanently?')) return;
    try {
        const response = await fetch(`/api/lead-inquiries/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (response.ok) {
            leadInquiriesData = leadInquiriesData.filter(i => i.id !== id);
            renderCurrentTab();
            closeLeadModal();
        }
    } catch (error) {
        console.error('Error deleting lead inquiry:', error);
    }
}

// =====================================================
// SEARCH & FILTER
// =====================================================
function handleSearch() {
    const query = document.getElementById('searchInput').value.toLowerCase().trim();

    if (currentTab === 'applications') {
        const vehicleFilter = document.getElementById('vehicleFilter');
        const creditFilter = document.getElementById('creditFilter');
        const vf = vehicleFilter ? vehicleFilter.value.toLowerCase() : '';
        const cf = creditFilter ? creditFilter.value : '';

        const filtered = applicationsData.filter(app => {
            const matchSearch = !query ||
                app.first_name.toLowerCase().includes(query) ||
                app.last_name.toLowerCase().includes(query) ||
                app.email.toLowerCase().includes(query) ||
                app.phone.includes(query);
            const matchVehicle = !vf || (app.vehicle_type || '').toLowerCase() === vf;
            const matchCredit = !cf || app.credit_score === cf;
            return matchSearch && matchVehicle && matchCredit;
        });
        displayApplications(filtered);
    } else if (currentTab === 'sell') {
        const filtered = sellData.filter(sub => {
            return !query ||
                sub.first_name.toLowerCase().includes(query) ||
                sub.last_name.toLowerCase().includes(query) ||
                sub.email.toLowerCase().includes(query) ||
                sub.phone.includes(query) ||
                (sub.make || '').toLowerCase().includes(query) ||
                (sub.model || '').toLowerCase().includes(query);
        });
        displaySellSubmissions(filtered);
    } else if (currentTab === 'leadInquiries') {
        const statusFilter = document.getElementById('statusFilter');
        const sf = statusFilter ? statusFilter.value : '';

        const filtered = leadInquiriesData.filter(inq => {
            const matchSearch = !query ||
                inq.dealership_name.toLowerCase().includes(query) ||
                inq.contact_name.toLowerCase().includes(query) ||
                inq.email.toLowerCase().includes(query) ||
                inq.phone.includes(query) ||
                inq.location.toLowerCase().includes(query);
            const matchStatus = !sf || (inq.status || 'new') === sf;
            return matchSearch && matchStatus;
        });
        displayLeadInquiries(filtered);
    }
}

// =====================================================
// EXPORT
// =====================================================
function exportToCSV() {
    const headers = ['ID','Date','First Name','Last Name','Email','Phone','Street','City','Province','Postal Code','Vehicle Type','Budget','Trade-In','Credit Score','Employment','Income Type','Annual Income','Monthly Income','Company','Job Title','Referrer','Status'];
    const rows = applicationsData.map(a => [
        a.id, formatDate(a.submitted_at), a.first_name, a.last_name, a.email, a.phone,
        a.street_address || '', a.city || '', a.province || '', a.postal_code || '',
        a.vehicle_type, a.budget, a.trade_in, a.credit_score, a.employment,
        a.income_type || '', a.annual_income || '', a.monthly_income || '',
        a.company_name || '', a.job_title || '', a.referrer_code || '', a.deal_status || 'pending'
    ]);
    downloadCSV(headers, rows, 'applications');
}

function exportSellCSV() {
    const headers = ['ID','Date','First Name','Last Name','Email','Phone','Postal Code','Year','Make','Model','Mileage','Condition'];
    const rows = sellData.map(s => [
        s.id, formatDate(s.submitted_at), s.first_name, s.last_name, s.email, s.phone,
        s.postal_code || '', s.year, s.make, s.model, s.mileage, s.condition || ''
    ]);
    downloadCSV(headers, rows, 'sell-requests');
}

function exportInquiriesCSV() {
    const headers = ['ID','Date','Dealership','Contact','Email','Phone','Location','Package','Volume','Status','Message'];
    const rows = leadInquiriesData.map(i => [
        i.id, formatDate(i.created_at), i.dealership_name, i.contact_name, i.email, i.phone,
        i.location, i.package || '', i.monthly_volume || '', i.status || 'new', i.message || ''
    ]);
    downloadCSV(headers, rows, 'lead-inquiries');
}

function downloadCSV(headers, rows, filename) {
    let csv = headers.join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${(cell || '').toString().replace(/"/g, '""')}"`).join(',') + '\n';
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `greenlight-${filename}-${formatDate(new Date())}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
}

// =====================================================
// MODAL
// =====================================================
function closeLeadModal() {
    document.getElementById('leadModal').classList.remove('active');
}

function printLead() {
    window.print();
}

// Close on outside click
document.addEventListener('click', (e) => {
    const modal = document.getElementById('leadModal');
    if (e.target === modal) closeLeadModal();
});

// =====================================================
// UTILITIES
// =====================================================
function isImageFile(data) {
    if (!data) return false;
    if (data.startsWith('data:image/')) return true;
    const exts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'];
    return exts.some(ext => data.toLowerCase().endsWith(ext));
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateFull(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getCreditBadgeClass(score) {
    if (!score) return 'badge-fair';
    const s = score.toLowerCase();
    if (s.includes('excellent')) return 'badge-excellent';
    if (s.includes('good')) return 'badge-good';
    if (s.includes('fair')) return 'badge-fair';
    if (s.includes('building')) return 'badge-building';
    if (s.includes('poor')) return 'badge-poor';
    if (s.includes('unsure')) return 'badge-unsure';
    return 'badge-fair';
}
