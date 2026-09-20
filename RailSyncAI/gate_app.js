// gate_app.js - Logic for Railway Gate Status Predictor

const LEVEL_CROSSINGS = [
    { id: 'LC-01', name: 'Bally Crossing', km: 8, between: 'Howrah – Bally', lat: 22.65, lng: 88.34 },
    { id: 'LC-02', name: 'Barddhaman Gate', km: 107, between: 'Bandel – Burdwan', lat: 23.25, lng: 87.86 },
    { id: 'LC-03', name: 'Rampurhat Crossing', km: 218, between: 'Burdwan – Rampurhat', lat: 24.17, lng: 87.78 },
    { id: 'LC-04', name: 'Jasidih Gate', km: 295, between: 'Rampurhat – Jasidih', lat: 24.52, lng: 86.64 },
    { id: 'LC-05', name: 'Jhajha Crossing', km: 330, between: 'Jasidih – Jhajha', lat: 25.04, lng: 86.37 },
    { id: 'LC-06', name: 'Gaya Gate No. 1', km: 410, between: 'Jhajha – Gaya', lat: 24.80, lng: 85.00 },
    { id: 'LC-07', name: 'Dehri-on-Sone Crossing', km: 466, between: 'Gaya – Dehri', lat: 24.91, lng: 84.18 },
    { id: 'LC-08', name: 'Mughal Sarai Gate', km: 541, between: 'Dehri – DDU Jn', lat: 25.28, lng: 83.12 },
    { id: 'LC-09', name: 'Prayagraj Crossing', km: 634, between: 'DDU Jn – Prayagraj', lat: 25.43, lng: 81.85 },
    { id: 'LC-10', name: 'Fatehpur Gate', km: 720, between: 'Prayagraj – Kanpur', lat: 25.93, lng: 80.81 },
    { id: 'LC-11', name: 'Kanpur Gate', km: 790, between: 'Fatehpur – Kanpur', lat: 26.45, lng: 80.35 },
    { id: 'LC-12', name: 'Tundla Junction Gate', km: 890, between: 'Kanpur – Tundla', lat: 27.20, lng: 78.24 }
];

// Helper to calculate times based on current date to keep the demo dynamic
function generateSchedules() {
    const now = new Date();
    const h = now.getHours();
    const m = now.getMinutes();

    // Create 8 trains with times staggered around current time
    // This ensures some gates are always closed or closing soon
    const trains = [
        { trainNo: '12301', name: 'Howrah Rajdhani', direction: 'UP' },
        { trainNo: '12302', name: 'Howrah Rajdhani', direction: 'DOWN' },
        { trainNo: '12381', name: 'Poorva Express', direction: 'UP' },
        { trainNo: '12382', name: 'Poorva Express', direction: 'DOWN' },
        { trainNo: '12311', name: 'Kalka Mail', direction: 'UP' },
        { trainNo: '12312', name: 'Kalka Mail', direction: 'DOWN' },
        { trainNo: '13009', name: 'Doon Express', direction: 'UP' },
        { trainNo: '63501', name: 'Local Passenger', direction: 'UP' }
    ];

    const TRAIN_SCHEDULE = trains.map(t => ({ ...t, schedule: [] }));
    
    // We will assign each crossing a passing train approximately around the current time
    // so that there's active data in the demo.
    LEVEL_CROSSINGS.forEach((lc, i) => {
        // Assign 2-3 trains per crossing
        const numTrains = (i % 2 === 0) ? 3 : 2;
        for (let j = 0; j < numTrains; j++) {
            const trainIdx = (i + j) % trains.length;
            
            // Distribute times: one recently passed, one near current time, one future
            let offsetMins = 0;
            if (j === 0) offsetMins = -30; // 30 mins ago
            else if (j === 1) offsetMins = i % 2 === 0 ? 2 : -2; // Very close to now
            else offsetMins = 45; // 45 mins future
            
            const passTime = new Date(now.getTime() + offsetMins * 60000);
            const timeStr = `${String(passTime.getHours()).padStart(2, '0')}:${String(passTime.getMinutes()).padStart(2, '0')}`;
            
            TRAIN_SCHEDULE[trainIdx].schedule.push({
                crossingId: lc.id,
                arrivalTime: timeStr
            });
        }
    });
    return TRAIN_SCHEDULE;
}

const TRAIN_SCHEDULE = generateSchedules();
let selectedCrossingId = null;

// Convert "HH:MM" to Date object for today
function parseTime(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

// Format Date object to "HH:MM"
function formatTime(date) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

// Get gate status — handles MULTIPLE overlapping train closures
// If Train A closes gate at 14:00 and Train B at 14:05, gate stays closed
// from 13:55 (A-5min) to 14:07 (B+2min) continuously
function getGateStatus(crossingId, checkTime = new Date()) {
    const PRE_CLOSURE_MINS = 5;
    const POST_CLOSURE_MINS = 2;

    // Collect ALL closure intervals for this crossing
    const intervals = [];
    for (const train of TRAIN_SCHEDULE) {
        const stop = train.schedule.find(s => s.crossingId === crossingId);
        if (stop) {
            const arrivalDate = parseTime(stop.arrivalTime);
            const closeDate = new Date(arrivalDate.getTime() - PRE_CLOSURE_MINS * 60000);
            const openDate = new Date(arrivalDate.getTime() + POST_CLOSURE_MINS * 60000);
            intervals.push({
                train: { ...train, arrivalTime: stop.arrivalTime },
                closeAt: closeDate,
                openAt: openDate
            });
        }
    }

    // Sort intervals by close time
    intervals.sort((a, b) => a.closeAt - b.closeAt);

    // Merge overlapping intervals and track which trains cause closure
    const merged = [];
    for (const iv of intervals) {
        if (merged.length > 0 && iv.closeAt <= merged[merged.length - 1].openAt) {
            // Overlapping — extend the merged interval and add this train
            const last = merged[merged.length - 1];
            last.openAt = new Date(Math.max(last.openAt.getTime(), iv.openAt.getTime()));
            last.trains.push(iv.train);
        } else {
            merged.push({
                closeAt: iv.closeAt,
                openAt: iv.openAt,
                trains: [iv.train]
            });
        }
    }

    // Check if currently closed (within any merged interval)
    for (const m of merged) {
        if (checkTime >= m.closeAt && checkTime <= m.openAt) {
            return {
                status: 'CLOSED',
                currentTrain: m.trains[0],      // Primary train
                currentTrains: m.trains,          // ALL trains causing closure
                reopensAt: m.openAt,
                nextClosure: null
            };
        }
    }

    // Find next upcoming closure
    let nextClosure = null;
    for (const m of merged) {
        if (checkTime < m.closeAt) {
            nextClosure = {
                train: m.trains[0],
                trains: m.trains,
                closesAt: m.closeAt,
                opensAt: m.openAt
            };
            break;
        }
    }

    return {
        status: 'OPEN',
        currentTrain: null,
        currentTrains: [],
        reopensAt: null,
        nextClosure
    };
}

function getNextEvents(crossingId, hoursAhead = 2) {
    const now = new Date();
    const limit = new Date(now.getTime() + hoursAhead * 3600000);
    const events = [];

    const PRE_CLOSURE_MINS = 5;
    const POST_CLOSURE_MINS = 2;

    for (const train of TRAIN_SCHEDULE) {
        const stop = train.schedule.find(s => s.crossingId === crossingId);
        if (stop) {
            const arrivalDate = parseTime(stop.arrivalTime);
            const closeDate = new Date(arrivalDate.getTime() - PRE_CLOSURE_MINS * 60000);
            const openDate = new Date(arrivalDate.getTime() + POST_CLOSURE_MINS * 60000);

            if (closeDate > now && closeDate <= limit) {
                events.push({
                    train: { ...train, arrivalTime: stop.arrivalTime },
                    closesAt: closeDate,
                    opensAt: openDate
                });
            }
        }
    }

    events.sort((a, b) => a.closesAt - b.closesAt);
    return events;
}

function checkLeaveNow(crossingId, travelMinutes) {
    const now = new Date();
    const arrivalTime = new Date(now.getTime() + travelMinutes * 60000);
    
    const statusObj = getGateStatus(crossingId, arrivalTime);
    
    let safe = true;
    let details = '';
    let waitMinutes = 0;

    if (statusObj.status === 'CLOSED') {
        safe = false;
        waitMinutes = Math.ceil((statusObj.reopensAt - arrivalTime) / 60000);
        details = `You'll arrive at ${formatTime(arrivalTime)} — Gate will be CLOSED (${statusObj.currentTrain.name} passing). Wait ${waitMinutes} minutes before leaving.`;
    } else {
        // If it's open, but is it going to close very soon after arrival?
        // Let's say if it closes within 2 mins of arrival, it's risky
        if (statusObj.nextClosure && (statusObj.nextClosure.closesAt - arrivalTime) < 2 * 60000) {
            safe = false;
            waitMinutes = Math.ceil((statusObj.nextClosure.opensAt - now) / 60000) - travelMinutes;
            details = `You'll arrive at ${formatTime(arrivalTime)} — Gate closes shortly after. Risky! Wait ${waitMinutes > 0 ? waitMinutes : 10} minutes.`;
        } else if (!statusObj.nextClosure) {
             details = `No trains scheduled in the near future. Gate will remain open.`;
        } else {
            details = `You'll arrive at ${formatTime(arrivalTime)} — Gate will be OPEN. Safe to leave now!`;
        }
    }

    return {
        safe,
        arrivalTime,
        gateStatus: statusObj.status,
        details,
        waitMinutes
    };
}

// Rendering functions
function renderCrossingList() {
    const container = document.getElementById('crossing-list-container');
    container.innerHTML = '';

    LEVEL_CROSSINGS.forEach(lc => {
        const status = getGateStatus(lc.id).status;
        
        const card = document.createElement('div');
        card.className = `crossing-card ${selectedCrossingId === lc.id ? 'selected' : ''}`;
        card.onclick = () => selectCrossing(lc.id);
        
        card.innerHTML = `
            <div class="crossing-info">
                <h3>${lc.id}: ${lc.name}</h3>
                <p>KM ${lc.km} | ${lc.between}</p>
            </div>
            <div class="status-dot ${status.toLowerCase()}"></div>
        `;
        
        container.appendChild(card);
    });
}

function selectCrossing(crossingId) {
    selectedCrossingId = crossingId;
    renderCrossingList();
    renderGateStatus(crossingId);
    
    // Clear advisor result on new selection
    const resultDiv = document.getElementById('advisor-result');
    resultDiv.style.display = 'none';
    resultDiv.className = 'advisor-result';
}

function renderGateStatus(crossingId) {
    const lc = LEVEL_CROSSINGS.find(c => c.id === crossingId);
    const statusObj = getGateStatus(crossingId);
    
    document.getElementById('main-status-name').textContent = `${lc.id}: ${lc.name}`;
    document.getElementById('main-status-location').textContent = `KM ${lc.km} | Between: ${lc.between}`;
    
    const indicator = document.getElementById('main-status-indicator');
    const nextEventBox = document.getElementById('main-next-event');
    
    if (statusObj.status === 'CLOSED') {
        indicator.textContent = '🔴 GATE CLOSED';
        indicator.className = 'main-status-indicator closed';
        
        const trainsList = (statusObj.currentTrains || [statusObj.currentTrain]);
        const trainsHtml = trainsList.map(t => 
            `<span style="display:inline-block;background:#fff3e0;padding:2px 8px;border-radius:4px;margin:2px;font-size:0.82rem;">${t.trainNo} ${t.name} (${t.direction})</span>`
        ).join(' ');
        
        nextEventBox.innerHTML = `
            <h4>Trains Passing${trainsList.length > 1 ? ` (${trainsList.length} trains)` : ''}</h4>
            <div style="margin:6px 0">${trainsHtml}</div>
            <p><strong>Gate Reopens at:</strong> ${formatTime(statusObj.reopensAt)}</p>
            ${trainsList.length > 1 ? '<p><em>⚠ Multiple trains passing — gate remains closed until all trains clear.</em></p>' : ''}
            <p><em>Please wait safely. Do not cross closed gates.</em></p>
        `;
    } else {
        indicator.textContent = '🟢 GATE OPEN';
        indicator.className = 'main-status-indicator open';
        
        if (statusObj.nextClosure) {
            nextEventBox.innerHTML = `
                <h4>Next Gate Closure</h4>
                <p><strong>Train:</strong> ${statusObj.nextClosure.train.trainNo} ${statusObj.nextClosure.train.name} (${statusObj.nextClosure.train.direction})</p>
                <p><strong>Gate Closes at:</strong> ${formatTime(statusObj.nextClosure.closesAt)}</p>
                <p><strong>Gate Reopens at:</strong> ${formatTime(statusObj.nextClosure.opensAt)}</p>
                <p><em>Time until closure: ${Math.round((statusObj.nextClosure.closesAt - new Date())/60000)} mins</em></p>
            `;
        } else {
            nextEventBox.innerHTML = `
                <h4>Next Gate Closure</h4>
                <p>No upcoming trains scheduled in the immediate timeframe.</p>
            `;
        }
    }
}

function renderAllGatesOverview() {
    const container = document.getElementById('overview-grid-container');
    container.innerHTML = '';
    
    LEVEL_CROSSINGS.forEach(lc => {
        const statusObj = getGateStatus(lc.id);
        
        let statusText = 'Open';
        let eventText = '';
        
        if (statusObj.status === 'CLOSED') {
            statusText = `Closed - ${statusObj.currentTrain.name}`;
            eventText = `Opens at ${formatTime(statusObj.reopensAt)}`;
        } else if (statusObj.nextClosure) {
            eventText = `Closes at ${formatTime(statusObj.nextClosure.closesAt)}`;
        } else {
            eventText = 'Clear';
        }
        
        const card = document.createElement('div');
        card.className = 'mini-card';
        card.innerHTML = `
            <div class="mini-card-header">
                <span>${lc.name}</span>
                <div class="status-dot ${statusObj.status.toLowerCase()}"></div>
            </div>
            <div class="mini-status ${statusObj.status.toLowerCase()}">${statusText}</div>
            <div class="mini-next-event">${eventText}</div>
        `;
        
        container.appendChild(card);
    });
}

function handleLeaveNowCheck() {
    if (!selectedCrossingId) return;
    
    const minutes = parseInt(document.getElementById('travel-minutes').value, 10);
    if (isNaN(minutes) || minutes < 1 || minutes > 60) {
        alert("Please enter a valid travel time (1-60 mins).");
        return;
    }
    
    const result = checkLeaveNow(selectedCrossingId, minutes);
    const resultDiv = document.getElementById('advisor-result');
    
    resultDiv.innerHTML = result.details;
    resultDiv.style.display = 'block';
    
    if (result.details.includes('No trains scheduled')) {
        resultDiv.className = 'advisor-result neutral';
    } else if (result.safe) {
        resultDiv.className = 'advisor-result positive';
        resultDiv.innerHTML = '✅ ' + result.details;
    } else {
        resultDiv.className = 'advisor-result negative';
        resultDiv.innerHTML = '⚠️ ' + result.details;
    }
}

// Initialization
document.addEventListener('DOMContentLoaded', () => {
    // Initial renders
    renderCrossingList();
    renderAllGatesOverview();
    
    // Select first by default
    selectCrossing(LEVEL_CROSSINGS[0].id);
    
    // Event listeners
    document.getElementById('check-route-btn').addEventListener('click', handleLeaveNowCheck);
    
    // Refresh interval (30s)
    setInterval(() => {
        if (selectedCrossingId) {
            renderGateStatus(selectedCrossingId);
        }
        renderCrossingList();
        renderAllGatesOverview();
    }, 30000);
});
