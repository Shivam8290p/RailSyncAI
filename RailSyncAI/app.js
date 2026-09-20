// RAIL-BLOCK AI Dashboard Simulator Logic

// ── Auth Guard: ensure session exists or auto-initialize demo user ──
if (typeof AuthService !== 'undefined' && !AuthService.isAuthenticated()) {
    if (typeof DEMO_USERS !== 'undefined' && DEMO_USERS.length > 0) {
        AuthService.saveSession(DEMO_USERS[0], "demo_token_default", true);
    }
}

// Stations Definition
const STATIONS = [
    { name: "KSR Bengaluru (SBC)", code: "SBC", y: 50 },
    { name: "Cantonment (BNC)", code: "BNC", y: 130 },
    { name: "Krishnarajapuram (KJM)", code: "KJM", y: 210 },
    { name: "Whitefield (WFD)", code: "WFD", y: 290 },
    { name: "Malur (MLO)", code: "MLO", y: 370 },
    { name: "Bangarapet (BWT)", code: "BWT", y: 450 }
];

// Time Mapping Helpers (08:00 - 20:00)
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const CHART_WIDTH = 900; // SVG coordinates
const CHART_HEIGHT = 500;
const PADDING_LEFT = 180;
const PADDING_RIGHT = 40;
const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h - START_HOUR) * 60 + m;
}

function minutesToTimeStr(totalMins) {
    const hrs = Math.floor(totalMins / 60) + START_HOUR;
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function timeToX(timeStr) {
    const mins = timeToMinutes(timeStr);
    return PADDING_LEFT + (mins / TOTAL_MINUTES) * PLOT_WIDTH;
}

function xToTimeStr(x) {
    const relativeX = x - PADDING_LEFT;
    const fraction = relativeX / PLOT_WIDTH;
    const mins = Math.round(fraction * TOTAL_MINUTES);
    return minutesToTimeStr(Math.max(0, Math.min(TOTAL_MINUTES, mins)));
}

// Initial State Setup (Unoptimized)
let appState = {
    optimized: false,
    kpis: {
        totalDelay: 165, // in minutes
        efficiency: 58,  // in %
        availability: 94.2, // in %
        activeBlocks: 3
    },
    // Blocks List
    blocks: [
        {
            id: "BLK-001",
            dept: "engg",
            deptName: "Engineering",
            workType: "Track Tamping (CSM)",
            section: "KJM - WFD",
            stationStartY: STATIONS.find(s => s.code === "KJM").y,
            stationEndY: STATIONS.find(s => s.code === "WFD").y,
            start: "10:00",
            end: "13:00",
            optStart: "11:45",
            optEnd: "14:45",
            machine: "Tamping Machine CSM-49"
        },
        {
            id: "BLK-002",
            dept: "ohe",
            deptName: "Electrical (TRD)",
            workType: "OHE Wire Replacement",
            section: "KJM - WFD",
            stationStartY: STATIONS.find(s => s.code === "KJM").y,
            stationEndY: STATIONS.find(s => s.code === "WFD").y,
            start: "11:30",
            end: "13:30",
            optStart: "11:45",
            optEnd: "13:45",
            machine: "OHE Wiring Car #8"
        },
        {
            id: "BLK-003",
            dept: "st",
            deptName: "Signalling & Telecom",
            workType: "Point Machine Testing",
            section: "WFD Station Yard",
            stationStartY: STATIONS.find(s => s.code === "WFD").y - 20,
            stationEndY: STATIONS.find(s => s.code === "WFD").y + 20,
            start: "15:00",
            end: "16:30",
            optStart: "16:45",
            optEnd: "18:15",
            machine: "Digital Interlocking Tester"
        }
    ],
    // Train Paths List
    trains: [
        {
            id: "T-12628",
            number: "12628",
            name: "Karnataka Express (Up)",
            type: "passenger-sf",
            stops: [
                { code: "SBC", time: "08:30" },
                { code: "BNC", time: "08:42" },
                { code: "KJM", time: "09:05" },
                { code: "WFD", time: "09:22" },
                { code: "MLO", time: "09:45" },
                { code: "BWT", time: "10:10" }
            ],
            // Delay states: unoptimized vs optimized
            delays: { unopt: [0, 0, 0, 0, 0, 0], opt: [0, 0, 0, 0, 0, 0] }
        },
        {
            id: "T-16521",
            number: "16521",
            name: "SBC-BWT Passenger (Up)",
            type: "passenger-exp",
            stops: [
                { code: "SBC", time: "09:30" },
                { code: "BNC", time: "09:48" },
                { code: "KJM", time: "10:20" },
                { code: "WFD", time: "10:45" },
                { code: "MLO", time: "11:15" },
                { code: "BWT", time: "11:50" }
            ],
            // Clashes directly with track block (10:00-13:00) on KJM-WFD.
            // In unoptimized, it gets regulated at KJM for 75 mins!
            delays: { 
                unopt: [0, 0, 0, 75, 75, 75], // regulated at KJM, arrives BWT delayed by 75 mins
                opt: [0, 0, 0, 10, 10, 10]    // optimized: shifted block lets it pass with just 10 mins delay
            }
        },
        {
            id: "T-22691",
            number: "22691",
            name: "Rajdhani Express (Down)",
            type: "vande-bharat", // styled premium
            stops: [
                { code: "BWT", time: "11:55" },
                { code: "MLO", time: "12:15" },
                { code: "WFD", time: "12:35" },
                { code: "KJM", time: "12:50" },
                { code: "BNC", time: "13:08" },
                { code: "SBC", time: "13:20" }
            ],
            // Down train. Clashes with OHE block at 12:35 on WFD-KJM.
            // Unoptimized: delayed by 30 mins. Optimized: 0 delay.
            delays: {
                unopt: [0, 0, 30, 30, 30, 30],
                opt: [0, 0, 0, 0, 0, 0]
            }
        },
        {
            id: "T-401",
            number: "FG-401",
            name: "Freight Cargo (Up)",
            type: "freight",
            stops: [
                { code: "SBC", time: "13:30" },
                { code: "BNC", time: "13:55" },
                { code: "KJM", time: "14:30" },
                { code: "WFD", time: "15:10" },
                { code: "MLO", time: "15:50" },
                { code: "BWT", time: "16:30" }
            ],
            // Up train. Clashes with S&T Block at WFD yard at 15:10.
            // Unopt: delayed by 60 mins. Opt: 5 mins.
            delays: {
                unopt: [0, 0, 0, 60, 60, 60],
                opt: [0, 0, 0, 5, 5, 5]
            }
        },
        {
            id: "T-12627",
            number: "12627",
            name: "Karnataka Express (Down)",
            type: "passenger-sf",
            stops: [
                { code: "BWT", time: "14:40" },
                { code: "MLO", time: "15:05" },
                { code: "WFD", time: "15:30" },
                { code: "KJM", time: "15:52" },
                { code: "BNC", time: "16:15" },
                { code: "SBC", time: "16:30" }
            ],
            // Down train running on clear section — 0 delay
            delays: {
                unopt: [0, 0, 0, 0, 0, 0],
                opt: [0, 0, 0, 0, 0, 0]
            }
        }
    ],
    alerts: [
        { id: "A1", type: "clash", msg: "Train 16521 (Passenger) blocked at KJM section. Delay: 75 mins.", time: "10:20", resolved: false },
        { id: "A2", type: "clash", msg: "Train 22691 (Rajdhani) delayed by 30 mins due to OHE block.", time: "12:35", resolved: false },
        { id: "A3", type: "efficiency", msg: "Silo Maintenance: Overlapping blocks on KJM-WFD scheduled separately.", time: "11:30", resolved: false },
        { id: "A4", type: "clash", msg: "Freight Cargo FG-401 delayed by 60 mins at WFD Interlocking block.", time: "15:10", resolved: false }
    ]
};

// Snapshot initial blocks and trains for clean state restoration
const INITIAL_BLOCKS = JSON.parse(JSON.stringify(appState.blocks));
const INITIAL_TRAINS = JSON.parse(JSON.stringify(appState.trains));

// UI Elements
const svgEl = document.getElementById("timeSpaceChart");
const logTerminal = document.getElementById("terminalLog");
const alertList = document.getElementById("alertList");
const optButton = document.getElementById("optButton");
const solverOverlay = document.getElementById("solverOverlay");
const infoPopup = document.getElementById("infoPopup");

// KPI Counters
const kpiDelayVal = document.getElementById("kpiDelayVal");
const kpiDelayChg = document.getElementById("kpiDelayChg");
const kpiEffVal = document.getElementById("kpiEffVal");
const kpiEffChg = document.getElementById("kpiEffChg");
const kpiAvailVal = document.getElementById("kpiAvailVal");
const kpiAvailChg = document.getElementById("kpiAvailChg");
const kpiBlocksVal = document.getElementById("kpiBlocksVal");

// CRIS Integration Elements
const crisBroadcastBtn = document.getElementById("crisBroadcastBtn");
const crisImpactedCount = document.getElementById("crisImpactedCount");
const headerCrisBadge = document.getElementById("headerCrisBadge");

// Initialize Terminal Logs
function addLog(text, type = "system") {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;
    line.innerHTML = `[${time}] ${text}`;
    logTerminal.appendChild(line);
    logTerminal.scrollTop = logTerminal.scrollHeight;
}

// Draw the Time Space Grid
function drawGrid() {
    svgEl.innerHTML = ''; // Clear SVG
    
    // Add background rect
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#0e1320");
    svgEl.appendChild(bg);

    // Draw Stations Grid Lines (Horizontal)
    STATIONS.forEach(station => {
        // Station line
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", PADDING_LEFT);
        line.setAttribute("y1", station.y);
        line.setAttribute("x2", CHART_WIDTH - PADDING_RIGHT);
        line.setAttribute("y2", station.y);
        line.className.baseVal = "station-line";
        svgEl.appendChild(line);

        // Station Label
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", 20);
        txt.setAttribute("y", station.y + 4);
        txt.className.baseVal = "station-label";
        txt.textContent = station.name;
        svgEl.appendChild(txt);
        
        // Station Code
        const codeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        codeTxt.setAttribute("x", PADDING_LEFT - 25);
        codeTxt.setAttribute("y", station.y + 4);
        codeTxt.className.baseVal = "axis-text";
        codeTxt.setAttribute("text-anchor", "end");
        codeTxt.textContent = station.code;
        svgEl.appendChild(codeTxt);
    });

    // Draw Time Grid Lines (Vertical, every hour)
    for (let hr = START_HOUR; hr <= END_HOUR; hr++) {
        const timeStr = `${String(hr).padStart(2, '0')}:00`;
        const x = timeToX(timeStr);

        // Vertical line
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", 30);
        line.setAttribute("x2", x,);
        line.setAttribute("y2", CHART_HEIGHT - 30);
        line.className.baseVal = "grid-line";
        svgEl.appendChild(line);

        // Time label Top
        const labelTop = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelTop.setAttribute("x", x);
        labelTop.setAttribute("y", 20);
        labelTop.setAttribute("text-anchor", "middle");
        labelTop.className.baseVal = "axis-text";
        labelTop.textContent = timeStr;
        svgEl.appendChild(labelTop);

        // Time label Bottom
        const labelBottom = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelBottom.setAttribute("x", x);
        labelBottom.setAttribute("y", CHART_HEIGHT - 10);
        labelBottom.setAttribute("text-anchor", "middle");
        labelBottom.className.baseVal = "axis-text";
        labelBottom.textContent = timeStr;
        svgEl.appendChild(labelBottom);
    }
}

// Draw Maintenance Blocks
function drawBlocks() {
    appState.blocks.forEach(block => {
        const startStr = appState.optimized ? block.optStart : block.start;
        const endStr = appState.optimized ? block.optEnd : block.end;
        const xStart = timeToX(startStr);
        const xEnd = timeToX(endStr);
        const width = xEnd - xStart;
        
        const yStart = Math.min(block.stationStartY, block.stationEndY);
        const yEnd = Math.max(block.stationStartY, block.stationEndY);
        const height = Math.abs(yEnd - yStart);

        // Create group container
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        // The Block Rect
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", xStart);
        rect.setAttribute("y", yStart);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);
        rect.className.baseVal = `block-zone ${block.dept}`;
        
        // Dynamic interaction
        rect.addEventListener("mouseenter", (e) => showBlockTooltip(e, block));
        rect.addEventListener("mouseleave", hideTooltip);
        
        g.appendChild(rect);

        // Text inside block (only if block has some size)
        if (width > 60) {
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", xStart + 8);
            txt.setAttribute("y", yStart + height/2 + 4);
            txt.className.baseVal = "block-zone-text";
            txt.textContent = block.id;
            g.appendChild(txt);
        }

        svgEl.appendChild(g);
    });
}

// Draw Train Paths
function drawTrainPaths() {
    appState.trains.forEach(train => {
        let points = [];
        
        train.stops.forEach((stop, index) => {
            const station = STATIONS.find(s => s.code === stop.code);
            if (!station) return;
            
            // Calculate delay at this stop
            const delayMin = appState.optimized ? train.delays.opt[index] : train.delays.unopt[index];
            const baseTimeMins = timeToMinutes(stop.time);
            const actualTimeMins = baseTimeMins + delayMin;
            
            const x = PADDING_LEFT + (actualTimeMins / TOTAL_MINUTES) * PLOT_WIDTH;
            const y = station.y;
            points.push(`${x},${y}`);
        });

        const pathStr = `M ${points.join(' L ')}`;

        // Draw path line
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathStr);
        path.className.baseVal = `train-path ${train.type}`;
        
        // Interactions
        path.addEventListener("mouseenter", (e) => showTrainTooltip(e, train));
        path.addEventListener("mouseleave", hideTooltip);

        svgEl.appendChild(path);

        // Add Train Number label at start of path
        if (points.length > 0) {
            const firstPt = points[0].split(',');
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", parseFloat(firstPt[0]) - 8);
            txt.setAttribute("y", parseFloat(firstPt[1]) - 4);
            txt.setAttribute("text-anchor", "end");
            txt.className.baseVal = "axis-text";
            txt.setAttribute("fill", "#60a5fa");
            txt.textContent = train.number;
            svgEl.appendChild(txt);
        }
    });
}

// Tooltip Management
function showBlockTooltip(e, block) {
    const start = appState.optimized ? block.optStart : block.start;
    const end = appState.optimized ? block.optEnd : block.end;
    infoPopup.style.display = "block";
    infoPopup.style.left = `${e.pageX + 15}px`;
    infoPopup.style.top = `${e.pageY + 10}px`;
    infoPopup.innerHTML = `
        <h4 style="color: ${getBlockColor(block.dept)}">${block.id}: ${block.deptName}</h4>
        <p><strong>Work:</strong> <span>${block.workType}</span></p>
        <p><strong>Section:</strong> <span>${block.section}</span></p>
        <p><strong>Window:</strong> <span>${start} - ${end}</span></p>
        <p><strong>Resource:</strong> <span>${block.machine}</span></p>
        ${appState.optimized && block.id !== "BLK-003" ? '<p style="color: #34d399; font-weight:600">Consolidated Integrated Block</p>' : ''}
    `;
}

function showTrainTooltip(e, train) {
    const delaysArr = appState.optimized ? train.delays.opt : train.delays.unopt;
    const maxDelay = Math.max(...delaysArr);
    infoPopup.style.display = "block";
    infoPopup.style.left = `${e.pageX + 15}px`;
    infoPopup.style.top = `${e.pageY + 10}px`;
    infoPopup.innerHTML = `
        <h4 style="color: #38bdf8">${train.number}: ${train.name}</h4>
        <p><strong>Type:</strong> <span>${train.type.replace('-', ' ').toUpperCase()}</span></p>
        <p><strong>Origin:</strong> <span>${train.stops[0].code} (${train.stops[0].time})</span></p>
        <p><strong>Terminus:</strong> <span>${train.stops[train.stops.length - 1].code}</span></p>
        <p><strong>Current Delay:</strong> <span style="color: ${maxDelay > 0 ? '#f87171' : '#34d399'}">${maxDelay} mins</span></p>
    `;
}

function hideTooltip() {
    infoPopup.style.display = "none";
}

function getBlockColor(dept) {
    if (dept === "engg") return "#c084fc";
    if (dept === "ohe") return "#fb7185";
    return "#fbbf24";
}

// Render Alerts List
function renderAlerts() {
    alertList.innerHTML = '';
    appState.alerts.forEach(alert => {
        const item = document.createElement("div");
        item.className = `alert-item ${alert.resolved ? 'resolved' : ''}`;
        
        let icon = '⚠️';
        if (alert.resolved) icon = '✅';
        else if (alert.type === 'efficiency') icon = '🔄';

        item.innerHTML = `
            <div class="alert-icon">${icon}</div>
            <div class="alert-message">${alert.msg}</div>
            <div class="alert-time">${alert.time}</div>
        `;
        alertList.appendChild(item);
    });
}

// Update KPI Display — now supports dynamic values from optimizer
function updateKPIs(kpiData) {
    if (appState.optimized && kpiData) {
        // ── Dynamic values from backend optimizer ──
        const delayAfter = kpiData.total_delay_after || 0;
        const delayBefore = kpiData.total_delay_before || 165;
        const delayReduction = kpiData.delay_reduction_pct || 0;
        const efficiency = kpiData.efficiency || 0;
        const availAfter = kpiData.availability_after || 0;
        const availBefore = kpiData.availability_before || 94.2;
        const blockLabel = kpiData.block_label || `${kpiData.block_count} Optimized`;

        kpiDelayVal.textContent = `${delayAfter}m`;
        kpiDelayChg.textContent = `-${delayReduction.toFixed(1)}%`;
        kpiDelayChg.className = "metric-change positive";

        kpiEffVal.textContent = `${efficiency.toFixed(1)}%`;
        const effGain = efficiency - 58.0;
        kpiEffChg.textContent = `+${effGain.toFixed(1)}%`;
        kpiEffChg.className = "metric-change positive";

        kpiAvailVal.textContent = `${availAfter.toFixed(1)}%`;
        const availGain = availAfter - availBefore;
        kpiAvailChg.textContent = `+${availGain.toFixed(1)}%`;
        kpiAvailChg.className = "metric-change positive";

        kpiBlocksVal.textContent = blockLabel;

    } else if (appState.optimized) {
        // ── Compute from current state if no kpiData (fallback simulation) ──
        const totalOpt = appState.trains.reduce((sum, t) => sum + Math.max(...t.delays.opt), 0);
        const totalOrig = appState.trains.reduce((sum, t) => sum + Math.max(...t.delays.unopt), 0);
        const reduction = totalOrig > 0 ? ((1 - totalOpt / totalOrig) * 100) : 0;

        kpiDelayVal.textContent = `${totalOpt}m`;
        kpiDelayChg.textContent = `-${reduction.toFixed(1)}%`;
        kpiDelayChg.className = "metric-change positive";

        const integratedCount = appState.blocks.filter(b =>
            b.optStart === appState.blocks.find(x => x.id !== b.id && x.section === b.section)?.optStart
        ).length;
        const eff = Math.min(100, 58 + integratedCount * 12 + reduction * 0.3);
        kpiEffVal.textContent = `${eff.toFixed(1)}%`;
        kpiEffChg.textContent = `+${(eff - 58).toFixed(1)}%`;
        kpiEffChg.className = "metric-change positive";

        kpiAvailVal.textContent = "97.8%";
        kpiAvailChg.textContent = "+3.6%";
        kpiAvailChg.className = "metric-change positive";

        kpiBlocksVal.textContent = integratedCount > 0 ? "2 Integrated" : `${appState.blocks.length} Optimized`;

        if (crisImpactedCount) {
            crisImpactedCount.innerHTML = `<span style="color:#2e7d32; font-weight:600;">142 Passengers Impacted</span> (Delay cut by 90.9%)`;
        }
        if (headerCrisBadge) {
            headerCrisBadge.textContent = "1 Minimal Delay";
            headerCrisBadge.style.background = "#e8f5e9";
            headerCrisBadge.style.borderColor = "#a5d6a7";
            headerCrisBadge.style.color = "#2e7d32";
        }

    } else {
        // ── Base (unoptimized) values — computed from current data ──
        const totalDelay = appState.trains.reduce((sum, t) => sum + Math.max(...t.delays.unopt), 0);

        kpiDelayVal.textContent = `${totalDelay}m`;
        kpiDelayChg.textContent = "Base";
        kpiDelayChg.className = "metric-change";

        kpiEffVal.textContent = "58.0%";
        kpiEffChg.textContent = "Base";
        kpiEffChg.className = "metric-change";

        kpiAvailVal.textContent = "94.2%";
        kpiAvailChg.textContent = "Base";
        kpiAvailChg.className = "metric-change";

        kpiBlocksVal.textContent = `${appState.blocks.length} Siloed`;

        if (crisImpactedCount) {
            crisImpactedCount.innerHTML = `1,248 Passengers on Delayed Routes`;
        }
        if (headerCrisBadge) {
            headerCrisBadge.textContent = "3 Trains Affected";
            headerCrisBadge.style.background = "#fee2e2";
            headerCrisBadge.style.borderColor = "#fca5a5";
            headerCrisBadge.style.color = "#b91c1c";
        }
    }

    // Persist current state for the CRIS portal demo site
    try {
        localStorage.setItem("rail_block_state", JSON.stringify({
            optimized: appState.optimized,
            totalDelay: appState.optimized ? 15 : 165,
            trains: appState.trains.map(t => ({
                id: t.id,
                number: t.number,
                name: t.name,
                type: t.type,
                maxDelay: Math.max(...(appState.optimized ? t.delays.opt : t.delays.unopt)),
                status: (Math.max(...(appState.optimized ? t.delays.opt : t.delays.unopt)) > 0) ? "DELAYED" : "ON_TIME"
            })),
            blocks: appState.blocks
        }));
    } catch (err) {
        console.warn("Storage sync error:", err);
    }
}

// Ingest Initial Log Feed
function runInitialLogFeed() {
    addLog("RAIL-BLOCK AI Application Gateway Online", "system");
    setTimeout(() => addLog("Fetching Live Working Time Table (WTT) schedules...", "info"), 600);
    setTimeout(() => addLog("Established WebSockets tunnel to Central Office Application (COA).", "success"), 1200);
    setTimeout(() => addLog("Ingested 3 pending block requests from BDMS database.", "info"), 1800);
    setTimeout(() => {
        addLog("CRITICAL: Detected 3 Train Path Conflicts and 1 Silo Scheduling Overlap.", "warning");
        renderChart();
    }, 2400);
}

// Render Complete Chart
function renderChart(kpiData) {
    drawGrid();
    drawBlocks();
    drawTrainPaths();
    renderAlerts();
    updateKPIs(kpiData);
}

// Trigger AI Optimizer Backend / Simulation
async function triggerOptimization() {
    if (appState.optimized) {
        // Reset to original (unoptimized) state
        appState.optimized = false;
        appState.alerts = [
            { id: "A1", type: "clash", msg: "Train 16521 (Passenger) blocked at KJM section. Delay: 75 mins.", time: "10:20", resolved: false },
            { id: "A2", type: "clash", msg: "Train 22691 (Rajdhani) delayed by 30 mins due to OHE block.", time: "12:35", resolved: false },
            { id: "A3", type: "efficiency", msg: "Silo Maintenance: Overlapping blocks on KJM-WFD scheduled separately.", time: "11:30", resolved: false },
            { id: "A4", type: "clash", msg: "Freight Cargo FG-401 delayed by 60 mins at WFD Interlocking block.", time: "15:10", resolved: false }
        ];
        optButton.innerHTML = `<span>⚡</span> Run AI Optimization Engine`;
        optButton.style.background = '';
        addLog("System reset to manual/siloed schedule (Base Delay: 165m).", "system");
        // Restore initial default blocks & trains
        appState.blocks = JSON.parse(JSON.stringify(INITIAL_BLOCKS));
        appState.trains = JSON.parse(JSON.stringify(INITIAL_TRAINS));
        renderChart();
        return;
    }

    // Activate loading overlay
    solverOverlay.classList.add("active");
    addLog("Triggering AI/ML Optimization Engine...", "system");

    // Read slider weights from UI
    const w1El = document.querySelector('#w1Val');
    const w3El = document.querySelector('#w3Val');
    const pw = w1El ? parseFloat(w1El.textContent) / 100 : 0.7;
    const mw = w3El ? parseFloat(w3El.textContent) / 100 : 0.3;

    try {
        // ── Call the DATABASE-DRIVEN optimizer — NOT the hardcoded endpoint ──
        addLog("Connecting to database-driven optimizer (/api/optimize-db)...", "info");

        const response = await fetch("/api/optimize-db", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                punctuality_weight: pw,
                maintenance_weight: mw,
                max_tasks: 8  // number of tasks to optimize (change for diff results)
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Backend error (${response.status}): ${errText}`);
        }

        const data = await response.json();

        if (!data.optimized) {
            addLog(`Optimization skipped: ${data.error || 'No data'}`, "warning");
            solverOverlay.classList.remove("active");
            return;
        }

        addLog(`FastAPI response received. Solver: ${data.solver || 'OR-Tools CP-SAT'}`, "success");
        addLog(`Data source: ${data.data_source || 'database'} | Tasks: ${data.task_count} | Trains: ${data.train_count}`, "info");

        // Store KPI data from backend
        const backendKPIs = data.kpis || null;

        // ── Replace appState blocks & trains with DB-sourced data ──
        appState.optimized = true;

        // Build blocks from backend response — these are REAL DB tasks, not hardcoded
        appState.blocks = data.blocks.map(b => ({
            id: b.id,
            dept: b.dept,
            deptName: b.deptName,
            workType: b.workType,
            section: b.section,
            stationStartY: b.stationStartY,
            stationEndY: b.stationEndY,
            start: b.start,
            end: b.end,
            optStart: b.optStart,
            optEnd: b.optEnd,
            machine: b.machine || "",
            priority: b.priority || "medium",
            priorityScore: b.priority_score || 50,
        }));

        // Build trains from backend
        if (data.delays) {
            // Keep existing trains but update their delays
            appState.trains.forEach(train => {
                if (data.delays[train.id]) {
                    train.delays.opt = data.delays[train.id];
                }
            });
        }

        // ── Build dynamic alerts from optimization results ──
        const alerts = [];
        const stats = data.db_stats || {};
        if (stats.total_overdue > 0) {
            alerts.push({ id: "DA1", type: "clash", msg: `ALERT: ${stats.total_overdue} overdue tasks detected in database. Prioritized for scheduling.`, time: new Date().toLocaleTimeString().slice(0,5), resolved: true });
        }
        if (stats.total_critical > 0) {
            alerts.push({ id: "DA2", type: "clash", msg: `${stats.total_critical} critical-priority tasks queued. Safety-first scheduling applied.`, time: new Date().toLocaleTimeString().slice(0,5), resolved: true });
        }
        if (data.kpis && data.kpis.integrated_count > 0) {
            alerts.push({ id: "DA3", type: "efficiency", msg: `OPTIMIZED: ${data.kpis.integrated_count} tasks integrated into combined multi-dept blocks.`, time: new Date().toLocaleTimeString().slice(0,5), resolved: true });
        }
        if (data.kpis && data.kpis.delay_reduction_pct > 0) {
            alerts.push({ id: "DA4", type: "efficiency", msg: `Delay reduced by ${data.kpis.delay_reduction_pct.toFixed(1)}% (${data.kpis.total_delay_before}m → ${data.kpis.total_delay_after}m).`, time: new Date().toLocaleTimeString().slice(0,5), resolved: true });
        }
        if (stats.total_defects_open > 0) {
            alerts.push({ id: "DA5", type: "clash", msg: `${stats.total_defects_open} open defects in system. Linked tasks prioritized.`, time: new Date().toLocaleTimeString().slice(0,5), resolved: false });
        }
        if (alerts.length === 0) {
            alerts.push({ id: "DA0", type: "efficiency", msg: "Optimization complete. All tasks scheduled successfully.", time: new Date().toLocaleTimeString().slice(0,5), resolved: true });
        }
        appState.alerts = alerts;

        // ── Print Python logs with staggered animation ──
        data.logs.forEach((log, index) => {
            setTimeout(() => {
                addLog(`[Python API] ${log}`, "success");
            }, index * 200);
        });

        // ── RL decision log ──
        if (data.rl_decision) {
            setTimeout(() => {
                addLog(`[RL Agent] Decision: ${data.rl_decision.action} — ${data.rl_decision.reason} (confidence: ${(data.rl_decision.confidence * 100).toFixed(0)}%)`, "info");
            }, data.logs.length * 200);
        }

        setTimeout(() => {
            solverOverlay.classList.remove("active");
            optButton.innerHTML = `<span>🔄</span> Reset to Siloed State`;
            optButton.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';
            renderChart(backendKPIs);
        }, data.logs.length * 200 + 300);

    } catch (error) {
        // Fallback to local simulation if python backend is offline
        addLog(`FastAPI backend offline (${error.message}). Running local client-side AI simulation.`, "warning");
        
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) {
                addLog("[Simulated] Running heuristic constraint scheduler with weights w1=" + (pw*100).toFixed(0) + "%, w3=" + (mw*100).toFixed(0) + "%...", "info");
            } else if (step === 2) {
                addLog("[Simulated] DBSCAN spatial-temporal clustering active for KJM-WFD corridor...", "info");
            } else if (step === 3) {
                addLog("[Simulated] Evaluating secondary delay propagation using ST-GCN model...", "info");
            } else if (step === 4) {
                appState.optimized = true;
                
                // Dynamic simulation: strictly decreasing delay as punctuality weight increases
                const delayDecay = Math.pow(1.0 - pw, 1.4);
                const simOptDelay = Math.max(5, Math.round(5 + (165 * 0.48) * delayDecay));
                const reduction = ((1 - simOptDelay / 165) * 100).toFixed(1);
                const simEfficiency = Math.min(99.5, Math.round(50 + 1 * 12 + parseFloat(reduction) * 0.3));
                const simAvail = Math.min(99.5, (92.0 + pw * 6.5).toFixed(1));

                // Update train delay vectors based on punctuality weight
                const t1Delay = Math.round(simOptDelay * 0.65);
                const t3Delay = simOptDelay - t1Delay;
                appState.trains[1].delays.opt = [0, 0, 0, t1Delay, t1Delay, t1Delay];
                appState.trains[3].delays.opt = [0, 0, 0, t3Delay, t3Delay, t3Delay];

                appState.alerts = [
                    { id: "S1", type: "efficiency", msg: `SIMULATED: Delay reduced by ${reduction}% (165m → ${simOptDelay}m) under ${w1El ? w1El.textContent : '70%'} punctuality priority.`, time: new Date().toLocaleTimeString().slice(0,5), resolved: true },
                    { id: "S2", type: "efficiency", msg: "DBSCAN consolidated overlapping blocks on KJM-WFD into 1 combined slot.", time: new Date().toLocaleTimeString().slice(0,5), resolved: true }
                ];

                const simKPIs = {
                    total_delay_before: 165,
                    total_delay_after: simOptDelay,
                    delay_reduction_pct: parseFloat(reduction),
                    efficiency: simEfficiency,
                    availability_before: 94.2,
                    availability_after: parseFloat(simAvail),
                    block_count: 3,
                    integrated_count: 2,
                    block_label: "2 Integrated"
                };

                solverOverlay.classList.remove("active");
                clearInterval(interval);
                optButton.innerHTML = `<span>🔄</span> Reset to Siloed State`;
                optButton.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';
                renderChart(simKPIs);
            }
        }, 450);
    }
}

// ── Load initial blocks from database for unoptimized view ──
async function loadBlocksFromDB() {
    try {
        const resp = await fetch("/api/block-requests?limit=8");
        if (resp.ok) {
            const data = await resp.json();
            if (data.items && data.items.length > 0) {
                addLog(`Loaded ${data.items.length} block requests from database.`, "info");
            }
        }
    } catch(e) {
        // Silently fail — use existing hardcoded blocks as fallback
    }
}

// Bind Events
optButton.addEventListener("click", triggerOptimization);

// Open CRIS Passenger Broadcast Portal
function openCrisPortal() {
    addLog("[CRIS Gateway] Opening CRIS Message dashboard...", "info");
    switchPage('cris');
}

if (crisBroadcastBtn) {
    crisBroadcastBtn.addEventListener("click", openCrisPortal);
}

// Slider Reactive Controller
const w1Slider = document.getElementById("w1Slider");
const w3Slider = document.getElementById("w3Slider");
const w1Val = document.getElementById("w1Val");
const w3Val = document.getElementById("w3Val");

function onSliderChange(source) {
    if (source === 'w1' && w1Slider && w1Val) {
        w1Val.textContent = w1Slider.value + '%';
    } else if (source === 'w3' && w3Slider && w3Val) {
        w3Val.textContent = w3Slider.value + '%';
    }

    const pw = parseInt(w1Slider ? w1Slider.value : 70, 10) / 100;
    const mw = parseInt(w3Slider ? w3Slider.value : 30, 10) / 100;

    if (appState.optimized) {
        // Optimized state: as punctuality weight increases, train delay decreases strictly and steeply
        // pw = 10% -> ~72m; pw = 30% -> ~52m; pw = 50% -> ~34m; pw = 70% -> ~19m; pw = 90% -> ~7m; pw = 100% -> 5m
        const delayDecay = Math.pow(1.0 - pw, 1.4);
        const optDelay = Math.max(5, Math.round(5 + (165 * 0.48) * delayDecay));
        const reduction = ((1 - optDelay / 165) * 100).toFixed(1);
        const efficiency = Math.min(99.5, Math.round(45 + mw * 50));
        const avail = Math.min(99.5, (92.0 + pw * 6.5).toFixed(1));

        const t1Delay = Math.round(optDelay * 0.65);
        const t3Delay = optDelay - t1Delay;
        appState.trains[1].delays.opt = [0, 0, 0, t1Delay, t1Delay, t1Delay];
        appState.trains[3].delays.opt = [0, 0, 0, t3Delay, t3Delay, t3Delay];

        const dynKPIs = {
            total_delay_before: 165,
            total_delay_after: optDelay,
            delay_reduction_pct: parseFloat(reduction),
            efficiency: efficiency,
            availability_before: 94.2,
            availability_after: parseFloat(avail),
            block_count: appState.blocks.length,
            integrated_count: 2,
            block_label: "2 Integrated"
        };
        renderChart(dynKPIs);
    } else {
        // Base state: as punctuality weight increases, scheduled regulation delay decreases
        // At pw = 70% -> 165m (baseline). At pw = 90% -> 146m. At pw = 100% -> 137m. At pw = 30% -> 203m.
        const unoptDelay = Math.max(80, Math.round(165 * (1.4 - pw * 0.57)));
        const chg = Math.round(((unoptDelay - 165) / 165) * 100);

        if (kpiDelayVal) kpiDelayVal.textContent = `${unoptDelay}m`;
        if (kpiDelayChg) {
            kpiDelayChg.textContent = chg === 0 ? "Base (w1=70%)" : (chg > 0 ? `+${chg}% vs Base` : `${chg}% vs Base`);
            kpiDelayChg.className = chg <= 0 ? "metric-change positive" : "metric-change negative";
        }

        const ratio = unoptDelay / 165;
        appState.trains[1].delays.unopt = [0, 0, 0, Math.round(75 * ratio), Math.round(75 * ratio), Math.round(75 * ratio)];
        appState.trains[2].delays.unopt = [0, 0, Math.round(30 * ratio), Math.round(30 * ratio), Math.round(30 * ratio), Math.round(30 * ratio)];
        appState.trains[3].delays.unopt = [0, 0, 0, Math.round(60 * ratio), Math.round(60 * ratio), Math.round(60 * ratio)];

        drawGrid();
        drawBlocks();
        drawTrainPaths();
    }
}

if (w1Slider) w1Slider.addEventListener("input", () => onSliderChange('w1'));
if (w3Slider) w3Slider.addEventListener("input", () => onSliderChange('w3'));

// ── Initialize auth profile in header ──
let currentUser = null;
if (typeof initDashboardAuth === 'function') {
    currentUser = initDashboardAuth();
}

// Run initial execution
drawGrid();
renderAlerts();
updateKPIs();
runInitialLogFeed();

// ── Personalized welcome log ──
if (currentUser) {
    setTimeout(() => {
        const greeting = typeof getGreeting === 'function' ? getGreeting() : 'Welcome';
        addLog(`${greeting}, ${currentUser.name}. Role: ${currentUser.role} | Dept: ${currentUser.department}`, "success");
    }, 3000);
}

// ── SPA Navigation Logic ──
window.switchPage = function(pageId) {
    // Update nav item styles
    document.querySelectorAll('.global-nav .nav-item').forEach(el => {
        el.classList.remove('active');
    });
    const clickedNav = document.getElementById('nav-' + pageId);
    if (clickedNav) clickedNav.classList.add('active');

    // Hide all pages
    document.querySelectorAll('.app-content-wrapper .page-view').forEach(el => {
        el.classList.remove('active-page');
    });

    // Show target page
    const targetPage = document.getElementById('page-' + pageId);
    if (targetPage) {
        targetPage.classList.add('active-page');
        
        // Load data if needed
        if (pageId === 'maintenance') loadMaintenanceTasks();
        if (pageId === 'defects') loadDefects();
        if (pageId === 'assets') loadAssets();
        if (pageId === 'network' && typeof initNetworkControl === 'function') initNetworkControl();
        if (pageId === 'cris') {
            const iframe = document.getElementById('cris-iframe');
            if (iframe) iframe.src = 'cris_portal.html';
        }
    }
};


