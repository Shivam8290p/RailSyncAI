// Auth guard — redirect to login if not authenticated
if (typeof AuthService !== 'undefined' && !AuthService.isAuthenticated()) {
    window.location.replace('login.html');
} else if (typeof AuthService !== 'undefined') {
    const user = AuthService.getCurrentUser();
    // If authorised personnel accidentally lands here, redirect to admin
    if (user && user.role !== 'Normal User') {
        window.location.replace('index.html');
    }
}

let lastBroadcastCount = 0;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize user profile
    if (typeof AuthService !== 'undefined') {
        const user = AuthService.getCurrentUser();
        if (user) {
            document.getElementById('sidebar-user-name').textContent = user.name;
            document.getElementById('header-user-name').textContent = user.name;
            document.getElementById('welcome-message').textContent = `Welcome, ${user.name}`;
        }
    }

    // 2. Initialize live time
    setInterval(updateLiveTime, 1000);
    updateLiveTime();

    // 3. Initialize Gate Status (reusing gate_app.js functions if available)
    if (typeof renderCrossingList === 'function') {
        renderCrossingList();
        renderAllGatesOverview();
        if (typeof selectCrossing === 'function') selectCrossing('LC-01');
        
        // 30-sec refresh for gate status
        setInterval(() => {
            renderCrossingList();
            renderAllGatesOverview();
        }, 30000);
    }

    // 4. Initial Render of Data
    renderTrainStatus();
    renderCollisionAlerts();

    // 5. Setup CRIS Broadcast listener
    const broadcasts = JSON.parse(localStorage.getItem('cris_broadcasts') || '[]');
    lastBroadcastCount = broadcasts.length; // Set initial count to avoid showing old popups
    updateNotificationBadge(0);
    setInterval(checkForNewBroadcasts, 2000);
    window.addEventListener('storage', function(e) {
        if (e.key === 'cris_broadcasts') {
            checkForNewBroadcasts();
        }
    });

    // 6. Setup Sign Out
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            if (typeof AuthService !== 'undefined') AuthService.logout();
            window.location.replace('login.html');
        });
    }
});

function updateLiveTime() {
    const now = new Date();
    document.getElementById('live-time').textContent = now.toLocaleString('en-IN', {
        weekday: 'short', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
}

function switchUserPage(pageId) {
    document.querySelectorAll('.user-nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.user-page-view').forEach(p => p.classList.remove('active-page'));
    
    const navItem = document.getElementById('nav-' + pageId);
    const pageItem = document.getElementById('page-' + pageId);
    
    if (navItem) navItem.classList.add('active');
    if (pageItem) pageItem.classList.add('active-page');
    
    if (pageId === 'india-map') {
        setTimeout(() => initIndiaMap(), 100);
    }
}

function checkForNewBroadcasts() {
    const broadcasts = JSON.parse(localStorage.getItem('cris_broadcasts') || '[]');
    if (broadcasts.length > lastBroadcastCount) {
        const newOnes = broadcasts.slice(lastBroadcastCount);
        newOnes.forEach(b => showNotificationPopup(b));
        lastBroadcastCount = broadcasts.length;
        updateNotificationBadge(broadcasts.length);
        renderTrainStatus(); 
    }
}

function showNotificationPopup(broadcast) {
    const popup = document.getElementById('notification-popup');
    if (!popup) return;
    
    popup.querySelector('.notif-message').textContent = broadcast.message;
    popup.querySelector('.notif-time').textContent = new Date(broadcast.timestamp).toLocaleTimeString();
    popup.classList.add('visible');
    
    setTimeout(() => popup.classList.remove('visible'), 8000);
}

function updateNotificationBadge(count) {
    const badge = document.getElementById('notif-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function clearNotifications() {
    localStorage.removeItem('cris_broadcasts');
    lastBroadcastCount = 0;
    updateNotificationBadge(0);
    renderTrainStatus();
}

function renderTrainStatus() {
    const broadcasts = JSON.parse(localStorage.getItem('cris_broadcasts') || '[]');
    const container = document.getElementById('train-status-container');
    const homeContainer = document.getElementById('home-recent-notifs');
    
    if (!container) return;

    if (broadcasts.length === 0) {
        container.innerHTML = '<div class="card" style="padding: 20px; color: var(--text-secondary);">No train advisories yet. You\'ll be notified when railway authorities issue delay notifications.</div>';
        if (homeContainer) {
            homeContainer.innerHTML = '<div style="padding: 20px; color: var(--text-secondary);">No recent notifications.</div>';
        }
        return;
    }

    // Sort by newest first
    const sorted = [...broadcasts].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    
    let html = '';
    sorted.forEach(b => {
        html += `
            <div class="card alert-card" style="margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                    <span style="font-weight: 600; color: var(--navy);">${b.trainNo}</span>
                    <span style="font-size: 12px; color: var(--text-secondary);">${new Date(b.timestamp).toLocaleString()}</span>
                </div>
                <p style="font-size: 14px; margin-bottom: 10px;">${b.message}</p>
                <div style="font-size: 12px; color: var(--text-dim);">Passengers Notified: ${b.passengersNotified || 0}</div>
            </div>
        `;
    });
    container.innerHTML = html;

    // Render recent on home page
    if (homeContainer) {
        const recent = sorted.slice(0, 3);
        let homeHtml = '';
        recent.forEach(b => {
            homeHtml += `
                <div class="list-item">
                    <div style="font-weight: 500; font-size: 14px; margin-bottom: 4px;">${b.trainNo}</div>
                    <div style="font-size: 13px; color: var(--text-secondary);">${b.message}</div>
                    <div style="font-size: 11px; color: var(--text-dim); margin-top: 4px;">${new Date(b.timestamp).toLocaleString()}</div>
                </div>
            `;
        });
        homeContainer.innerHTML = homeHtml;
    }
}

function renderCollisionAlerts() {
    const container = document.getElementById('collisions-container');
    const delayContainer = document.getElementById('delayed-trains-container');
    
    if (typeof NETWORK_CONFLICTS !== 'undefined' && container) {
        if (NETWORK_CONFLICTS.length === 0) {
            container.innerHTML = '<div class="card" style="padding: 20px; color: var(--text-secondary);">No active collision alerts.</div>';
        } else {
            let html = '';
            NETWORK_CONFLICTS.forEach(c => {
                const isCritical = c.priority === 'Critical';
                html += `
                    <div class="card alert-card ${isCritical ? 'critical' : ''}">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-weight: 600; color: ${isCritical ? 'var(--maroon-red)' : 'var(--saffron)'};">${c.type} Alert</span>
                            <span style="font-size: 12px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: ${isCritical ? '#fef2f2' : '#fffbeb'}; color: ${isCritical ? 'var(--maroon-red)' : 'var(--saffron)'};">${c.priority}</span>
                        </div>
                        <p style="font-size: 14px; margin-bottom: 8px;"><strong>Location:</strong> ${c.location}</p>
                        <p style="font-size: 14px; margin-bottom: 8px;"><strong>Trains Involved:</strong> ${c.trains.join(' and ')}</p>
                        <p style="font-size: 13px; color: var(--text-secondary);">${c.description}</p>
                    </div>
                `;
            });
            container.innerHTML = html;
        }
    }

    if (typeof NETWORK_TRAINS !== 'undefined' && delayContainer) {
        const delayed = NETWORK_TRAINS.filter(t => t.status === 'Delayed');
        if (delayed.length === 0) {
            delayContainer.innerHTML = '<div class="card" style="padding: 20px; color: var(--text-secondary);">No delayed trains currently.</div>';
        } else {
            let html = '';
            delayed.forEach(t => {
                html += `
                    <div class="card" style="margin-bottom: 15px; border-left: 4px solid var(--maroon-red);">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
                            <span style="font-weight: 600;">${t.id} - ${t.name}</span>
                            <span style="font-size: 12px; color: var(--maroon-red); font-weight: 600;">Delayed by ${t.delay} mins</span>
                        </div>
                        <p style="font-size: 13px; color: var(--text-secondary);">Currently at ${t.currentLocation} heading towards ${t.destination}.</p>
                    </div>
                `;
            });
            delayContainer.innerHTML = html;
        }
    }
}

function initIndiaMap() {
    const container = document.getElementById('nc-map-container-india');
    if (!container) return;
    
    if (typeof renderNetworkMap === 'function') {
        const tempOriginal = document.getElementById('nc-map-container');
        if (tempOriginal) tempOriginal.id = 'nc-map-container-temp';
        container.id = 'nc-map-container';
        
        renderNetworkMap();
        
        container.id = 'nc-map-container-india';
        if (tempOriginal) tempOriginal.id = 'nc-map-container';
    } else {
        container.innerHTML = '<div style="padding: 50px; text-align: center; color: var(--text-secondary);">Map rendering unavailable.</div>';
    }
}
