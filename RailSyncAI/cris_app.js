// CRIS Passenger Advisory & Broadcast Gateway Engine
// Centre for Railway Information Systems (CRIS) PRS & NTES Simulation

// Default state if localStorage is empty
let systemState = {
    optimized: false,
    trains: [
        { id: "T-16521", number: "16521", name: "SBC-BWT Passenger (Up)", delay: 75, blockReason: "Track Tamping Block BLK-001 at KJM-WFD" },
        { id: "T-22691", number: "22691", name: "Rajdhani Express (Down)", delay: 30, blockReason: "OHE Wire Replacement BLK-002 at KJM-WFD" },
        { id: "T-12627", number: "12627", name: "Karnataka Express (Down)", delay: 35, blockReason: "Point Machine Testing BLK-003 at WFD Yard" },
        { id: "T-12628", number: "12628", name: "Karnataka Express (Up)", delay: 0, blockReason: "Normal Dispatch" }
    ]
};

// Comprehensive Mock Passenger Database
const MOCK_PASSENGERS = [
    {
        pnr: "452-9182341",
        name: "Ramesh Kumar",
        age: 42,
        gender: "M",
        phone: "+91 98451 72349",
        trainNo: "16521",
        trainName: "SBC-BWT Passenger",
        coach: "S3",
        berth: "24 (MB)",
        travelClass: "SL",
        from: "KJM",
        to: "BWT",
        departureScheduled: "10:20",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "452-9182342",
        name: "Priya Sundaram",
        age: 29,
        gender: "F",
        phone: "+91 97412 88192",
        trainNo: "16521",
        trainName: "SBC-BWT Passenger",
        coach: "D2",
        berth: "12 (WS)",
        travelClass: "2S",
        from: "SBC",
        to: "MLO",
        departureScheduled: "09:30",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "452-9182343",
        name: "Vikram Malhotra",
        age: 36,
        gender: "M",
        phone: "+91 94480 15923",
        trainNo: "16521",
        trainName: "SBC-BWT Passenger",
        coach: "S1",
        berth: "45 (LB)",
        travelClass: "SL",
        from: "BNC",
        to: "BWT",
        departureScheduled: "09:48",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "452-9182344",
        name: "Anita Rao",
        age: 51,
        gender: "F",
        phone: "+91 96112 34509",
        trainNo: "16521",
        trainName: "SBC-BWT Passenger",
        coach: "D1",
        berth: "08 (Aisle)",
        travelClass: "2S",
        from: "KJM",
        to: "WFD",
        departureScheduled: "10:20",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "821-4456712",
        name: "Devendra Joshi",
        age: 48,
        gender: "M",
        phone: "+91 99001 67234",
        trainNo: "22691",
        trainName: "Rajdhani Express",
        coach: "B2",
        berth: "18 (SL)",
        travelClass: "3A",
        from: "BWT",
        to: "SBC",
        departureScheduled: "11:55",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "821-4456713",
        name: "Sunita Patil",
        age: 34,
        gender: "F",
        phone: "+91 98860 41290",
        trainNo: "22691",
        trainName: "Rajdhani Express",
        coach: "A1",
        berth: "09 (LB)",
        travelClass: "2A",
        from: "WFD",
        to: "SBC",
        departureScheduled: "12:35",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "821-4456714",
        name: "Karthik Raja",
        age: 26,
        gender: "M",
        phone: "+91 97390 12845",
        trainNo: "22691",
        trainName: "Rajdhani Express",
        coach: "H1",
        berth: "04 (CAB)",
        travelClass: "1A",
        from: "BWT",
        to: "SBC",
        departureScheduled: "11:55",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "632-1198450",
        name: "Meenakshi Iyer",
        age: 63,
        gender: "F",
        phone: "+91 94800 76543",
        trainNo: "12627",
        trainName: "Karnataka Express",
        coach: "B1",
        berth: "31 (UB)",
        travelClass: "3A",
        from: "BWT",
        to: "SBC",
        departureScheduled: "14:40",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "632-1198451",
        name: "Sanjay Hegde",
        age: 39,
        gender: "M",
        phone: "+91 98440 98213",
        trainNo: "12627",
        trainName: "Karnataka Express",
        coach: "S4",
        berth: "15 (MB)",
        travelClass: "SL",
        from: "MLO",
        to: "SBC",
        departureScheduled: "15:05",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "632-1198452",
        name: "Farooq Abdullah",
        age: 44,
        gender: "M",
        phone: "+91 97400 32189",
        trainNo: "12627",
        trainName: "Karnataka Express",
        coach: "A2",
        berth: "22 (LB)",
        travelClass: "2A",
        from: "WFD",
        to: "SBC",
        departureScheduled: "15:30",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "719-8823101",
        name: "Pooja Reddy",
        age: 27,
        gender: "F",
        phone: "+91 98800 65432",
        trainNo: "12628",
        trainName: "Karnataka Express",
        coach: "B3",
        berth: "42 (SL)",
        travelClass: "3A",
        from: "SBC",
        to: "BWT",
        departureScheduled: "08:30",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "719-8823102",
        name: "Mohan Das",
        age: 55,
        gender: "M",
        phone: "+91 99860 11234",
        trainNo: "12628",
        trainName: "Karnataka Express",
        coach: "S2",
        berth: "07 (LB)",
        travelClass: "SL",
        from: "KJM",
        to: "BWT",
        departureScheduled: "09:05",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "452-9182345",
        name: "Preeti Verma",
        age: 31,
        gender: "F",
        phone: "+91 94490 87654",
        trainNo: "16521",
        trainName: "SBC-BWT Passenger",
        coach: "S2",
        berth: "56 (UB)",
        travelClass: "SL",
        from: "KJM",
        to: "BWT",
        departureScheduled: "10:20",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "821-4456715",
        name: "Rajesh Sharma",
        age: 46,
        gender: "M",
        phone: "+91 98452 44321",
        trainNo: "22691",
        trainName: "Rajdhani Express",
        coach: "B3",
        berth: "28 (MB)",
        travelClass: "3A",
        from: "BWT",
        to: "BNC",
        departureScheduled: "11:55",
        status: "PENDING",
        deliveredTime: null
    },
    {
        pnr: "632-1198453",
        name: "Aravind Swamy",
        age: 38,
        gender: "M",
        phone: "+91 97411 99887",
        trainNo: "12627",
        trainName: "Karnataka Express",
        coach: "S5",
        berth: "61 (SL)",
        travelClass: "SL",
        from: "WFD",
        to: "BNC",
        departureScheduled: "15:30",
        status: "PENDING",
        deliveredTime: null
    }
];

// Working passenger list
let passengers = [...MOCK_PASSENGERS];
let selectedTrainFilter = "ALL";
let selectedStatusFilter = "ALL";
let searchQuery = "";
let isBroadcasting = false;

// Initialize and Ingest State from RAIL-BLOCK AI
function initPortal() {
    loadSavedState();
    renderTrainCards();
    updatePortalKPIs();
    renderPassengerTable();
    updateTemplatePreview();
    runInitialTerminalLogs();
}

function loadSavedState() {
    try {
        const stored = localStorage.getItem("rail_block_state");
        if (stored) {
            const parsed = JSON.parse(stored);
            systemState.optimized = !!parsed.optimized;

            if (systemState.optimized) {
                // Optimized Delays
                systemState.trains = [
                    { id: "T-16521", number: "16521", name: "SBC-BWT Passenger (Up)", delay: 10, blockReason: "Integrated Block Conserved: Delay minimized to 10m" },
                    { id: "T-22691", number: "22691", name: "Rajdhani Express (Down)", delay: 0, blockReason: "OHE Block Synced: Train Running On-Time" },
                    { id: "T-12627", number: "12627", name: "Karnataka Express (Down)", delay: 0, blockReason: "S&T Block Deferred: Train Running On-Time" },
                    { id: "T-12628", number: "12628", name: "Karnataka Express (Up)", delay: 0, blockReason: "Normal Dispatch: On-Time" }
                ];
            } else {
                // Default Siloed / Unoptimized Delays
                systemState.trains = [
                    { id: "T-16521", number: "16521", name: "SBC-BWT Passenger (Up)", delay: 75, blockReason: "Track Tamping Block BLK-001 at KJM-WFD" },
                    { id: "T-22691", number: "22691", name: "Rajdhani Express (Down)", delay: 30, blockReason: "OHE Wire Replacement BLK-002 at KJM-WFD" },
                    { id: "T-12627", number: "12627", name: "Karnataka Express (Down)", delay: 35, blockReason: "Point Machine Testing BLK-003 at WFD Yard" },
                    { id: "T-12628", number: "12628", name: "Karnataka Express (Up)", delay: 0, blockReason: "Normal Dispatch" }
                ];
            }
        }
    } catch (e) {
        console.warn("Could not read rail_block_state:", e);
    }

    // Update banner UI
    const banner = document.getElementById("syncBanner");
    const bannerTitle = document.getElementById("syncBannerTitle");
    const bannerSubtext = document.getElementById("syncBannerSubtext");

    if (systemState.optimized) {
        banner.className = "sync-notice-banner optimized";
        bannerTitle.innerHTML = "✨ Rail-Block AI Optimization Active: Delay Reduction Reflected in Passenger Gateway";
        bannerSubtext.innerHTML = "Integrated block coordination reduced delays by 90.9%. Passenger SMS broadcasts will notify travelers of restored punctuality.";
    } else {
        banner.className = "sync-notice-banner";
        bannerTitle.innerHTML = "⚠️ Rail-Block AI Unoptimized State: 3 Active Maintenance Clashes Ingested";
        bannerSubtext.innerHTML = "Unsynchronized blocks on KJM-WFD cause up to 75 min passenger regulations. Authorize CRIS advisories below.";
    }
}

// Render Train Filter Cards
function renderTrainCards() {
    const container = document.getElementById("trainCardsContainer");
    container.innerHTML = "";

    // "All Trains" card
    const allCard = document.createElement("div");
    allCard.className = `train-filter-card ${selectedTrainFilter === 'ALL' ? 'active' : ''}`;
    allCard.onclick = () => selectTrain('ALL');
    allCard.innerHTML = `
        <div class="train-card-header">
            <span class="train-card-number">ALL ROUTES</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">${passengers.length} Manifests</span>
        </div>
        <div class="train-card-name">All Trains Ingested</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">View all booked passengers in section</div>
    `;
    container.appendChild(allCard);

    // Individual train cards
    systemState.trains.forEach(t => {
        const trainPassengers = passengers.filter(p => p.trainNo === t.number);
        const card = document.createElement("div");
        card.className = `train-filter-card ${selectedTrainFilter === t.number ? 'active' : ''}`;
        card.onclick = () => selectTrain(t.number);

        let pillClass = "delayed";
        let pillText = `Delay: +${t.delay}m`;

        if (t.delay === 0) {
            pillClass = "on-time";
            pillText = "🟢 On-Time";
        } else if (systemState.optimized) {
            pillClass = "optimized-delay";
            pillText = `⚡ Reduced: +${t.delay}m`;
        }

        card.innerHTML = `
            <div class="train-card-header">
                <span class="train-card-number">TRN #${t.number}</span>
                <span class="train-delay-pill ${pillClass}">${pillText}</span>
            </div>
            <div class="train-card-name">${t.name}</div>
            <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px;">
                ${t.blockReason}
            </div>
            <div style="font-size: 0.72rem; color: #38bdf8;">
                ${trainPassengers.length} Booked Passengers Loaded
            </div>
        `;
        container.appendChild(card);
    });
}

function selectTrain(trainNo) {
    selectedTrainFilter = trainNo;
    renderTrainCards();
    renderPassengerTable();
    updateTemplatePreview();
}

// Update Portal KPIs
function updatePortalKPIs() {
    const totalEl = document.getElementById("crisTotalPassengers");
    const impactChg = document.getElementById("crisImpactChange");
    const delayedCountEl = document.getElementById("crisDelayedTrainsCount");
    const trainsSummaryEl = document.getElementById("crisTrainsSummary");
    const queueCountEl = document.getElementById("crisQueueCount");

    const delayedTrains = systemState.trains.filter(t => t.delay > 0);
    const pendingCount = passengers.filter(p => p.status === "PENDING").length;

    if (systemState.optimized) {
        totalEl.textContent = "142";
        totalEl.style.color = "#34d399";
        impactChg.textContent = "Delay Cut: -90.9% (Optimized)";
        impactChg.className = "metric-change positive";
        
        delayedCountEl.textContent = "1 Minor Delay";
        delayedCountEl.style.color = "#34d399";
        trainsSummaryEl.textContent = "Train 16521 only (10m)";
        
        queueCountEl.textContent = `${pendingCount} Ready`;
    } else {
        totalEl.textContent = "1,248";
        totalEl.style.color = "#f87171";
        impactChg.textContent = "Delay Impact: High (Siloed Blocks)";
        impactChg.className = "metric-change negative";
        
        delayedCountEl.textContent = `${delayedTrains.length} Trains`;
        delayedCountEl.style.color = "#fb7185";
        trainsSummaryEl.textContent = delayedTrains.map(t => t.number).join(", ");
        
        queueCountEl.textContent = `${pendingCount} Ready`;
    }
}

// Dynamic SMS Template Generator
function generateSmsMessage(passenger) {
    const train = systemState.trains.find(t => t.number === passenger.trainNo) || { delay: 0, blockReason: "Track Maintenance" };
    
    if (train.delay === 0) {
        return `IRCTC/CRIS ALERT: PNR ${passenger.pnr}. Dear ${passenger.name.toUpperCase()}, Train ${passenger.trainNo} (${passenger.trainName.toUpperCase()}) is running ON TIME on SBC-BWT route. Departure from ${passenger.from} as per schedule. Track clear. Live status: ntes.cris.org.in. Wish you a pleasant journey. - CRIS Indian Railways`;
    }

    if (systemState.optimized) {
        return `IRCTC/CRIS ALERT: PNR ${passenger.pnr}. Dear ${passenger.name.toUpperCase()}, Train ${passenger.trainNo} (${passenger.trainName.toUpperCase()}) departure from ${passenger.from} is rescheduled with a MINOR delay of ~${train.delay} mins due to synchronized track work. Expected departure: ${passenger.departureScheduled} (+${train.delay}m). Live tracking: ntes.cris.org.in. Inconvenience regretted. - CRIS Indian Railways`;
    }

    return `IRCTC/CRIS ALERT: PNR ${passenger.pnr}. Dear ${passenger.name.toUpperCase()}, Train ${passenger.trainNo} (${passenger.trainName.toUpperCase()}) is REGULATED at ${passenger.from} due to ${train.blockReason}. Revised departure delay: ~${train.delay} mins. Alternative connectivity: SBC Suburban Network. Live tracking: ntes.cris.org.in. Inconvenience regretted. - CRIS Indian Railways`;
}

// Update Template Preview Box
function updateTemplatePreview() {
    const previewBox = document.getElementById("templatePreview");
    
    // Pick first passenger matching current filter
    let sample = passengers.find(p => selectedTrainFilter === 'ALL' || p.trainNo === selectedTrainFilter);
    if (!sample) sample = passengers[0];

    previewBox.textContent = generateSmsMessage(sample);
}

// Render Passenger Manifest Table
function renderPassengerTable() {
    const tbody = document.getElementById("passengerTableBody");
    tbody.innerHTML = "";

    const filtered = passengers.filter(p => {
        // Train filter
        if (selectedTrainFilter !== 'ALL' && p.trainNo !== selectedTrainFilter) return false;
        
        // Status filter
        const train = systemState.trains.find(t => t.number === p.trainNo);
        if (selectedStatusFilter === 'DELAYED' && (!train || train.delay === 0)) return false;
        if (selectedStatusFilter === 'PENDING' && p.status !== 'PENDING') return false;
        if (selectedStatusFilter === 'DELIVERED' && p.status !== 'DELIVERED') return false;

        // Search query
        if (searchQuery.trim() !== '') {
            const q = searchQuery.toLowerCase();
            const match = p.pnr.toLowerCase().includes(q) ||
                          p.name.toLowerCase().includes(q) ||
                          p.phone.toLowerCase().includes(q) ||
                          p.coach.toLowerCase().includes(q) ||
                          p.trainNo.includes(q);
            if (!match) return false;
        }

        return true;
    });

    document.getElementById("tableResultsCount").textContent = `Showing ${filtered.length} of ${passengers.length} Booked Passengers`;

    if (filtered.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 32px; color: var(--text-muted);">
                    No passenger records found matching your filters.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(p => {
        const train = systemState.trains.find(t => t.number === p.trainNo);
        const delay = train ? train.delay : 0;
        
        let statusBadge = '';
        if (p.status === 'DELIVERED') {
            statusBadge = `<span class="status-badge delivered">✅ Delivered (${p.deliveredTime || 'Just now'})</span>`;
        } else if (p.status === 'DISPATCHED') {
            statusBadge = `<span class="status-badge dispatched">⏳ Dispatched to SMPP</span>`;
        } else {
            statusBadge = `<span class="status-badge pending">⚠️ Pending Broadcast</span>`;
        }

        let trainStatusBadge = '';
        if (delay === 0) {
            trainStatusBadge = `<span style="color: #34d399; font-weight: 600;">🟢 On-Time</span>`;
        } else if (systemState.optimized) {
            trainStatusBadge = `<span style="color: #6ee7b7; font-weight: 600;">⚡ Delayed ${delay}m (Optimized)</span>`;
        } else {
            trainStatusBadge = `<span style="color: #f87171; font-weight: 600;">🔴 Delayed ${delay}m (${train.blockReason.split(' ')[0]} Block)</span>`;
        }

        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td class="pnr-code">${p.pnr}</td>
            <td>
                <strong>${p.name}</strong>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${p.age} yrs • ${p.gender}</div>
            </td>
            <td class="phone-masked">${p.phone}</td>
            <td>
                <span style="font-family: var(--font-mono); color: #38bdf8;">${p.trainNo}</span>
                <div style="font-size: 0.72rem; color: var(--text-muted);">${p.trainName}</div>
            </td>
            <td>
                <strong>${p.coach} / ${p.berth}</strong>
                <span style="font-size: 0.72rem; color: #fbbf24; margin-left: 4px;">(${p.travelClass})</span>
            </td>
            <td>${p.from} → ${p.to}</td>
            <td>${trainStatusBadge}</td>
            <td id="statusCell_${p.pnr.replace('-', '_')}">${statusBadge}</td>
            <td>
                <button class="btn-sm-preview" onclick="previewPassengerSms('${p.pnr}')" title="Preview Simulated SMS">
                    👁️ View SMS
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// Search and Filter Handlers
function handleSearch(val) {
    searchQuery = val;
    renderPassengerTable();
}

function handleStatusFilter(val) {
    selectedStatusFilter = val;
    renderPassengerTable();
}

// Broadcast Simulation
async function startCrisBroadcast() {
    if (isBroadcasting) return;
    isBroadcasting = true;

    const btn = document.getElementById("btnDispatchBroadcast");
    const progressBox = document.getElementById("broadcastProgressBox");
    const progressFill = document.getElementById("progressBarFill");
    const progressPercent = document.getElementById("progressPercent");
    const dispatchedText = document.getElementById("dispatchedCountText");
    const deliveredText = document.getElementById("deliveredCountText");

    btn.disabled = true;
    btn.innerHTML = `<span>⏳</span> Transmitting via CRIS SMPP Gateway...`;
    progressBox.classList.add("active");

    addCrisLog("CRIS API Gateway: Batch Broadcast Authorized by Controller SC-SBC-DIV-04", "system");
    addCrisLog("Authenticating with TRAI / DLT Telemarketer Entity ID: 110142958000...", "info");

    const targetPassengers = passengers.filter(p => selectedTrainFilter === 'ALL' || p.trainNo === selectedTrainFilter);
    const total = targetPassengers.length;
    let current = 0;

    for (let i = 0; i < targetPassengers.length; i++) {
        const p = targetPassengers[i];
        p.status = "DISPATCHED";
        renderPassengerTable();

        const pct = Math.round(((i + 1) / total) * 100);
        progressFill.style.width = `${pct}%`;
        progressPercent.textContent = `${pct}%`;
        dispatchedText.textContent = `Dispatched: ${i + 1} / ${total}`;

        // Add periodic terminal logs
        if (i === 0) {
            addCrisLog(`POST /api/v2/sms/send [SMPP BSNL/Airtel/Jio Trunk] - Batch session initialized.`, "success");
        }
        
        await new Promise(r => setTimeout(r, 120));

        // Mark delivered
        p.status = "DELIVERED";
        p.deliveredTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        deliveredText.textContent = `Delivered: ${i + 1} / ${total}`;
        
        addCrisLog(`Delivered to ${p.phone} (PNR ${p.pnr}) - HTTP 200 OK - MSGID: CRIS-${Math.floor(100000 + Math.random() * 900000)}`, "success");
        renderPassengerTable();
    }

    addCrisLog(`SUCCESS: Completed broadcast of ${total} CRIS Passenger Travel Advisories.`, "success");
    addCrisLog(`Passenger notification rate: 100% within SLA (1.2s avg latency).`, "info");

        // Store broadcast in localStorage for normal user notifications
        try {
            const broadcastRecord = {
                id: 'CRIS-' + Date.now(),
                timestamp: new Date().toISOString(),
                trainNo: document.getElementById('filterTrain')?.value || 'ALL',
                message: 'Train delay advisory dispatched via CRIS PRS/NTES Gateway. ' + 
                         total + ' passengers notified of schedule changes.',
                passengersNotified: total,
                type: 'DELAY_ADVISORY'
            };
            const existing = JSON.parse(localStorage.getItem('cris_broadcasts') || '[]');
            existing.push(broadcastRecord);
            // Keep only last 20 broadcasts
            if (existing.length > 20) existing.splice(0, existing.length - 20);
            localStorage.setItem('cris_broadcasts', JSON.stringify(existing));
        } catch(e) { console.warn('Failed to store CRIS broadcast:', e); }

    btn.disabled = false;
    btn.innerHTML = `<span>✅</span> Broadcast Dispatched Successfully`;
    btn.style.background = "linear-gradient(135deg, #10b981, #059669)";

    updatePortalKPIs();
    isBroadcasting = false;
}

function resetBroadcastQueue() {
    passengers.forEach(p => {
        p.status = "PENDING";
        p.deliveredTime = null;
    });

    const btn = document.getElementById("btnDispatchBroadcast");
    btn.disabled = false;
    btn.innerHTML = `<span>🚀</span> Transmit CRIS Passenger SMS Notification (Bulk Blast)`;
    btn.style.background = "";

    const progressBox = document.getElementById("broadcastProgressBox");
    progressBox.classList.remove("active");
    document.getElementById("progressBarFill").style.width = "0%";
    document.getElementById("progressPercent").textContent = "0%";

    addCrisLog("CRIS Broadcast Queue Reset. Ready for next advisory dispatch.", "system");
    renderPassengerTable();
    updatePortalKPIs();
}

// Terminal Logging Helper
function addCrisLog(text, type = "system") {
    const term = document.getElementById("crisTerminalLog");
    if (!term) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;
    line.innerHTML = `[${time}] ${text}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}

function runInitialTerminalLogs() {
    addCrisLog("Connecting to Centre for Railway Information Systems (CRIS) Core Switch...", "system");
    setTimeout(() => addCrisLog("CRIS PRS Socket: ESTABLISHED (Port 8443, TLS 1.3)", "info"), 300);
    setTimeout(() => addCrisLog("NTES Delay Synchronization Engine: Connected SBC-BWT feed", "info"), 700);
    setTimeout(() => addCrisLog("DLT Approved SMS Headers verified: VK-IRCRIS, AX-IRCTC", "success"), 1100);
    setTimeout(() => addCrisLog("Ready for Section Controller Passenger Broadcast Dispatch.", "success"), 1500);
}

// SMS Preview Modal Handlers
function previewPassengerSms(pnr) {
    const passenger = passengers.find(p => p.pnr === pnr);
    if (!passenger) return;

    const modal = document.getElementById("smsModal");
    const body = document.getElementById("modalSmsBody");
    body.textContent = generateSmsMessage(passenger);
    modal.classList.add("active");
}

function closeSmsModal(event) {
    if (event && event.target !== event.currentTarget) return;
    document.getElementById("smsModal").classList.remove("active");
}

// Refresh state from Rail-Block AI
function refreshPortalState() {
    loadSavedState();
    renderTrainCards();
    updatePortalKPIs();
    renderPassengerTable();
    updateTemplatePreview();
    addCrisLog("Portal state manually refreshed from RAIL-BLOCK AI engine.", "info");
}

// Export Passenger Manifest to CSV
function exportManifestCSV() {
    const headers = ["PNR", "Passenger Name", "Age", "Gender", "Mobile", "Train No", "Train Name", "Coach", "Berth", "Class", "From", "To", "Scheduled Dep", "CRIS Status", "Delivered Time"];
    const rows = passengers.map(p => [
        p.pnr,
        `"${p.name}"`,
        p.age,
        p.gender,
        `"${p.phone}"`,
        p.trainNo,
        `"${p.trainName}"`,
        p.coach,
        `"${p.berth}"`,
        p.travelClass,
        p.from,
        p.to,
        p.departureScheduled,
        p.status,
        p.deliveredTime || "N/A"
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CRIS_Passenger_Manifest_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addCrisLog("Exported passenger manifest CSV file successfully.", "success");
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", initPortal);
