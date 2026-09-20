// ═══════════════════════════════════════════════════════════════
// NETWORK CONTROL — Railway Live Train Monitoring
// Full India Railway Schematic Map with Pan + Zoom
// ═══════════════════════════════════════════════════════════════

// ── Mock Data (modular, ready for API replacement) ──

const NETWORK_TRAINS = [
    {
        id: 'T001',
        name: 'Rajdhani Express',
        currentLocation: 'New Delhi',
        nextStation: 'Agra Cantt',
        status: 'on-time',
        delay: 0,
        progress: 75,
        priority: 'high',
        route: ['New Delhi', 'Agra Cantt', 'Jhansi', 'Bhopal', 'Nagpur'],
        coordinates: { x: 390, y: 195 },
        direction: 'down'
    },
    {
        id: 'T002',
        name: 'Mumbai Duronto',
        currentLocation: 'Mumbai CST',
        nextStation: 'Pune',
        status: 'delayed',
        delay: 25,
        progress: 45,
        priority: 'high',
        route: ['Mumbai CST', 'Pune', 'Sholapur', 'Wadi'],
        coordinates: { x: 228, y: 580 },
        direction: 'up'
    },
    {
        id: 'T003',
        name: 'Chennai Express',
        currentLocation: 'Salem Jn',
        nextStation: 'Erode Jn',
        status: 'critical',
        delay: 45,
        progress: 30,
        priority: 'medium',
        route: ['Chennai Central', 'Salem Jn', 'Erode Jn', 'Coimbatore'],
        coordinates: { x: 430, y: 790 },
        direction: 'down'
    },
    {
        id: 'T004',
        name: 'Shatabdi Express',
        currentLocation: 'Ahmedabad',
        nextStation: 'Vadodara',
        status: 'on-time',
        delay: 0,
        progress: 85,
        priority: 'high',
        route: ['Ahmedabad', 'Vadodara', 'Surat', 'Mumbai Central'],
        coordinates: { x: 175, y: 460 },
        direction: 'down'
    },
    {
        id: 'T005',
        name: 'Howrah Mail',
        currentLocation: 'Patna Jn',
        nextStation: 'Gaya Jn',
        status: 'delayed',
        delay: 15,
        progress: 60,
        priority: 'medium',
        route: ['Howrah', 'Burdwan', 'Asansol', 'Dhanbad', 'Gaya', 'Patna'],
        coordinates: { x: 640, y: 340 },
        direction: 'up'
    }
];

const NETWORK_CONFLICTS = [
    {
        id: 'C001',
        type: 'crossing',
        location: 'Nagpur Jn',
        trains: ['T001', 'T002'],
        delay: 20,
        severity: 'high'
    },
    {
        id: 'C002',
        type: 'platform',
        location: 'New Delhi',
        trains: ['T001', 'T004'],
        delay: 10,
        severity: 'medium'
    }
];

// ── Full India Railway Station Network (SVG canvas 900×950) ──
// Stations mapped to a schematic representation of India
const MAP_STATIONS = [
    // North
    { id: 'NDLS', name: 'New Delhi',       x: 368, y: 180, major: true },
    { id: 'DLI',  name: 'Delhi Jn',        x: 355, y: 168, major: false },
    { id: 'LKO',  name: 'Lucknow',         x: 490, y: 228, major: true },
    { id: 'CNB',  name: 'Kanpur',          x: 462, y: 248, major: false },
    { id: 'ALD',  name: 'Allahabad',       x: 510, y: 272, major: false },
    { id: 'BSB',  name: 'Varanasi',        x: 552, y: 275, major: true },
    { id: 'PNBE', name: 'Patna',           x: 600, y: 270, major: true },
    { id: 'GAYA', name: 'Gaya Jn',         x: 590, y: 295, major: false },
    { id: 'DHN',  name: 'Dhanbad',         x: 645, y: 320, major: false },
    { id: 'HWH',  name: 'Howrah',          x: 695, y: 355, major: true },
    { id: 'SDAH', name: 'Sealdah',         x: 700, y: 365, major: false },
    { id: 'BDC',  name: 'Burdwan',         x: 665, y: 342, major: false },
    { id: 'AGC',  name: 'Agra Cantt',      x: 390, y: 230, major: false },
    { id: 'JHS',  name: 'Jhansi',          x: 398, y: 278, major: true },
    { id: 'GWL',  name: 'Gwalior',         x: 402, y: 258, major: false },
    { id: 'MTRA', name: 'Mathura',         x: 378, y: 210, major: false },
    // Northwest
    { id: 'ADI',  name: 'Ahmedabad',       x: 168, y: 445, major: true },
    { id: 'BRC',  name: 'Vadodara',        x: 182, y: 500, major: true },
    { id: 'ST',   name: 'Surat',           x: 192, y: 545, major: false },
    { id: 'JAM',  name: 'Jamnagar',        x: 88,  y: 420, major: false },
    { id: 'PALI', name: 'Palanpur',        x: 148, y: 400, major: false },
    { id: 'AII',  name: 'Ajmer',           x: 240, y: 300, major: true },
    { id: 'JP',   name: 'Jaipur',          x: 268, y: 258, major: true },
    { id: 'BKN',  name: 'Bikaner',         x: 180, y: 220, major: false },
    { id: 'JU',   name: 'Jodhpur',         x: 168, y: 290, major: true },
    { id: 'AF',   name: 'Abu Road',        x: 148, y: 370, major: false },
    { id: 'LDH',  name: 'Ludhiana',        x: 318, y: 138, major: false },
    { id: 'ASR',  name: 'Amritsar',        x: 278, y: 128, major: true },
    { id: 'JRC',  name: 'Jammu Tawi',      x: 292, y: 108, major: false },
    { id: 'FZR',  name: 'Firozpur',        x: 280, y: 148, major: false },
    { id: 'UMB',  name: 'Ambala',          x: 348, y: 162, major: true },
    // Central
    { id: 'BPL',  name: 'Bhopal',          x: 382, y: 358, major: true },
    { id: 'NGP',  name: 'Nagpur',          x: 440, y: 448, major: true },
    { id: 'ET',   name: 'Itarsi',          x: 370, y: 398, major: false },
    { id: 'JBP',  name: 'Jabalpur',        x: 455, y: 360, major: true },
    { id: 'KOTA', name: 'Kota',            x: 308, y: 308, major: true },
    { id: 'RTM',  name: 'Ratlam',          x: 262, y: 370, major: false },
    { id: 'MTJ',  name: 'Mathura Jn',      x: 375, y: 215, major: false },
    // East
    { id: 'RJPB', name: 'Muzaffarpur',     x: 590, y: 250, major: false },
    { id: 'DBRG', name: 'Dibrugarh',       x: 820, y: 200, major: true },
    { id: 'GHY',  name: 'Guwahati',        x: 760, y: 252, major: true },
    { id: 'LMG',  name: 'Lumding',         x: 782, y: 280, major: false },
    { id: 'DKUL', name: 'Dimapur',         x: 820, y: 268, major: false },
    { id: 'SCL',  name: 'Silchar',         x: 798, y: 310, major: false },
    { id: 'ASN',  name: 'Asansol',         x: 648, y: 330, major: false },
    { id: 'RNC',  name: 'Ranchi',          x: 638, y: 382, major: true },
    { id: 'JSME', name: 'Jasidih',         x: 632, y: 340, major: false },
    { id: 'SBP',  name: 'Sambalpur',       x: 660, y: 430, major: false },
    { id: 'BBS',  name: 'Bhubaneswar',     x: 680, y: 488, major: true },
    { id: 'PURI', name: 'Puri',            x: 692, y: 510, major: false },
    // South-Central
    { id: 'WADI', name: 'Wadi',            x: 342, y: 565, major: false },
    { id: 'SC',   name: 'Secunderabad',    x: 380, y: 595, major: true },
    { id: 'HYB',  name: 'Hyderabad',       x: 368, y: 608, major: true },
    { id: 'GTL',  name: 'Guntakal',        x: 358, y: 668, major: true },
    { id: 'VSKP', name: 'Visakhapatnam',   x: 578, y: 570, major: true },
    { id: 'BZA',  name: 'Vijayawada',      x: 488, y: 648, major: true },
    { id: 'GNT',  name: 'Guntur',          x: 462, y: 660, major: false },
    { id: 'NLR',  name: 'Nellore',         x: 458, y: 720, major: false },
    { id: 'OGL',  name: 'Ongole',          x: 452, y: 700, major: false },
    // South
    { id: 'MAS',  name: 'Chennai Central', x: 492, y: 758, major: true },
    { id: 'MS',   name: 'Chennai Egmore',  x: 498, y: 770, major: false },
    { id: 'AJJ',  name: 'Arakkonam',       x: 462, y: 762, major: false },
    { id: 'KPD',  name: 'Katpadi Jn',      x: 432, y: 748, major: false },
    { id: 'SA',   name: 'Salem Jn',        x: 420, y: 778, major: true },
    { id: 'CBE',  name: 'Coimbatore',      x: 368, y: 808, major: true },
    { id: 'ED',   name: 'Erode Jn',        x: 394, y: 792, major: false },
    { id: 'MDU',  name: 'Madurai Jn',      x: 432, y: 858, major: true },
    { id: 'NCJ',  name: 'Tiruchirapalli',  x: 450, y: 828, major: false },
    { id: 'TVC',  name: 'Trivandrum',      x: 372, y: 912, major: true },
    { id: 'CLT',  name: 'Calicut',         x: 330, y: 842, major: false },
    { id: 'ERS',  name: 'Ernakulam',       x: 340, y: 870, major: true },
    { id: 'QLN',  name: 'Quilon',          x: 348, y: 890, major: false },
    { id: 'SBC',  name: 'Bangalore City',  x: 390, y: 758, major: true },
    { id: 'MYS',  name: 'Mysore',          x: 368, y: 778, major: false },
    // West Coast / Mumbai
    { id: 'CSTM', name: 'Mumbai CST',      x: 210, y: 588, major: true },
    { id: 'BCT',  name: 'Mumbai Central',  x: 202, y: 578, major: true },
    { id: 'PUNE', name: 'Pune',            x: 245, y: 635, major: true },
    { id: 'SL',   name: 'Solapur',         x: 310, y: 660, major: false },
    { id: 'AWB',  name: 'Aurangabad',      x: 278, y: 555, major: false },
    { id: 'DD',   name: 'Dadar',           x: 208, y: 585, major: false },
    { id: 'MMR',  name: 'Manmad',          x: 290, y: 505, major: false },
    { id: 'NED',  name: 'Nanded',          x: 348, y: 620, major: false },
    // Rajkot / Porbandar
    { id: 'RJT',  name: 'Rajkot',          x: 100, y: 440, major: true },
    { id: 'PRBR', name: 'Porbandar',       x: 72,  y: 448, major: false },
    { id: 'VAPI', name: 'Vapi',            x: 195, y: 555, major: false },
];

// Route types: 'trunk-e' = trunk electrified (cyan/blue), 'trunk' = trunk (red), 'other' = other (orange-red), 'meter' = meter gauge (green)
const MAP_ROUTES = [
    // Delhi corridor
    { from: 'NDLS', to: 'UMB',  type: 'trunk-e' },
    { from: 'UMB',  to: 'LDH',  type: 'trunk-e' },
    { from: 'LDH',  to: 'ASR',  type: 'trunk-e' },
    { from: 'ASR',  to: 'FZR',  type: 'trunk' },
    { from: 'ASR',  to: 'JRC',  type: 'trunk' },
    { from: 'LDH',  to: 'FZR',  type: 'trunk' },
    // Delhi - Howrah (main trunk)
    { from: 'NDLS', to: 'MTRA', type: 'trunk-e' },
    { from: 'MTRA', to: 'AGC',  type: 'trunk-e' },
    { from: 'AGC',  to: 'JHS',  type: 'trunk-e' },
    { from: 'JHS',  to: 'BPL',  type: 'trunk-e' },
    { from: 'BPL',  to: 'ET',   type: 'trunk-e' },
    { from: 'ET',   to: 'NGP',  type: 'trunk-e' },
    { from: 'NGP',  to: 'WADI', type: 'trunk-e' },
    { from: 'WADI', to: 'SC',   type: 'trunk-e' },
    // Delhi - Howrah via Allahabad
    { from: 'NDLS', to: 'CNB',  type: 'trunk-e' },
    { from: 'CNB',  to: 'ALD',  type: 'trunk-e' },
    { from: 'ALD',  to: 'BSB',  type: 'trunk-e' },
    { from: 'BSB',  to: 'PNBE', type: 'trunk-e' },
    { from: 'PNBE', to: 'GAYA', type: 'trunk-e' },
    { from: 'GAYA', to: 'DHN',  type: 'trunk-e' },
    { from: 'DHN',  to: 'ASN',  type: 'trunk-e' },
    { from: 'ASN',  to: 'HWH',  type: 'trunk-e' },
    { from: 'HWH',  to: 'SDAH', type: 'trunk' },
    { from: 'ASN',  to: 'BDC',  type: 'trunk' },
    { from: 'BDC',  to: 'HWH',  type: 'trunk' },
    // East - Northeast
    { from: 'HWH',  to: 'GHY',  type: 'trunk-e' },
    { from: 'GHY',  to: 'LMG',  type: 'trunk' },
    { from: 'GHY',  to: 'DBRG', type: 'trunk' },
    { from: 'LMG',  to: 'SCL',  type: 'trunk' },
    { from: 'LMG',  to: 'DKUL', type: 'trunk' },
    // Jharkhand / Odisha
    { from: 'DHN',  to: 'RNC',  type: 'trunk' },
    { from: 'RNC',  to: 'SBP',  type: 'trunk' },
    { from: 'SBP',  to: 'BBS',  type: 'trunk-e' },
    { from: 'BBS',  to: 'PURI', type: 'other' },
    // Howrah - Chennai (East coast)
    { from: 'HWH',  to: 'BBS',  type: 'trunk-e' },
    { from: 'BBS',  to: 'VSKP', type: 'trunk-e' },
    { from: 'VSKP', to: 'BZA',  type: 'trunk-e' },
    { from: 'BZA',  to: 'MAS',  type: 'trunk-e' },
    { from: 'BZA',  to: 'NLR',  type: 'trunk-e' },
    { from: 'NLR',  to: 'MAS',  type: 'trunk-e' },
    // Delhi to Western India
    { from: 'NDLS', to: 'GWL',  type: 'trunk-e' },
    { from: 'GWL',  to: 'JHS',  type: 'trunk-e' },
    { from: 'NDLS', to: 'JP',   type: 'trunk-e' },
    { from: 'JP',   to: 'AII',  type: 'trunk-e' },
    { from: 'AII',  to: 'RTM',  type: 'trunk-e' },
    { from: 'RTM',  to: 'BRC',  type: 'trunk-e' },
    { from: 'JP',   to: 'KOTA', type: 'trunk-e' },
    { from: 'KOTA', to: 'RTM',  type: 'trunk-e' },
    { from: 'JP',   to: 'BKN',  type: 'trunk' },
    { from: 'BKN',  to: 'JU',   type: 'trunk' },
    { from: 'JU',   to: 'AII',  type: 'trunk' },
    { from: 'JU',   to: 'AF',   type: 'trunk' },
    { from: 'AF',   to: 'ADI',  type: 'trunk-e' },
    { from: 'PALI', to: 'ADI',  type: 'trunk' },
    // Mumbai - Delhi (Western)
    { from: 'BCT',  to: 'ST',   type: 'trunk-e' },
    { from: 'ST',   to: 'BRC',  type: 'trunk-e' },
    { from: 'BRC',  to: 'ADI',  type: 'trunk-e' },
    { from: 'ADI',  to: 'PALI', type: 'trunk-e' },
    // Mumbai - Chennai (Central)
    { from: 'CSTM', to: 'PUNE', type: 'trunk-e' },
    { from: 'PUNE', to: 'SL',   type: 'trunk-e' },
    { from: 'SL',   to: 'WADI', type: 'trunk-e' },
    { from: 'BCT',  to: 'MMR',  type: 'trunk-e' },
    { from: 'MMR',  to: 'AWB',  type: 'trunk' },
    { from: 'AWB',  to: 'SC',   type: 'trunk-e' },
    { from: 'MMR',  to: 'NGP',  type: 'trunk-e' },
    { from: 'BCT',  to: 'VAPI', type: 'trunk-e' },
    { from: 'VAPI', to: 'ST',   type: 'trunk-e' },
    // Rajkot / Gujarat
    { from: 'ADI',  to: 'RJT',  type: 'trunk-e' },
    { from: 'RJT',  to: 'JAM',  type: 'trunk' },
    { from: 'RJT',  to: 'PRBR', type: 'trunk' },
    // Secunderabad network
    { from: 'SC',   to: 'GTL',  type: 'trunk-e' },
    { from: 'SC',   to: 'HYB',  type: 'trunk' },
    { from: 'GTL',  to: 'BZA',  type: 'trunk-e' },
    { from: 'GTL',  to: 'MAS',  type: 'trunk-e' },
    { from: 'SC',   to: 'NED',  type: 'trunk' },
    { from: 'NED',  to: 'WD',   type: 'other' },
    // South India
    { from: 'MAS',  to: 'AJJ',  type: 'trunk-e' },
    { from: 'AJJ',  to: 'KPD',  type: 'trunk-e' },
    { from: 'KPD',  to: 'SBC',  type: 'trunk-e' },
    { from: 'SBC',  to: 'MYS',  type: 'trunk-e' },
    { from: 'KPD',  to: 'SA',   type: 'trunk-e' },
    { from: 'SA',   to: 'ED',   type: 'trunk-e' },
    { from: 'ED',   to: 'CBE',  type: 'trunk-e' },
    { from: 'CBE',  to: 'CLT',  type: 'trunk-e' },
    { from: 'CBE',  to: 'ERS',  type: 'trunk-e' },
    { from: 'ERS',  to: 'QLN',  type: 'trunk-e' },
    { from: 'QLN',  to: 'TVC',  type: 'trunk-e' },
    { from: 'MAS',  to: 'SA',   type: 'trunk-e' },
    { from: 'SA',   to: 'MDU',  type: 'trunk-e' },
    { from: 'MDU',  to: 'TVC',  type: 'trunk-e' },
    { from: 'MAS',  to: 'NCJ',  type: 'trunk-e' },
    { from: 'NCJ',  to: 'MDU',  type: 'trunk-e' },
    // Jabalpur corridor
    { from: 'JBP',  to: 'NGP',  type: 'trunk' },
    { from: 'JBP',  to: 'ALD',  type: 'trunk' },
    { from: 'JBP',  to: 'BPL',  type: 'trunk' },
    // PNBE connections
    { from: 'PNBE', to: 'RJPB', type: 'trunk' },
    { from: 'JSME', to: 'DHN',  type: 'trunk' },
    // Guntur
    { from: 'GNT',  to: 'BZA',  type: 'trunk' },
    { from: 'GNT',  to: 'GTL',  type: 'trunk-e' },
    // Visakhapatnam extra
    { from: 'VSKP', to: 'OGL',  type: 'trunk-e' },
    // LKO
    { from: 'NDLS', to: 'LKO',  type: 'trunk-e' },
    { from: 'LKO',  to: 'CNB',  type: 'trunk' },
    { from: 'LKO',  to: 'BSB',  type: 'trunk-e' },
    { from: 'LKO',  to: 'RJPB', type: 'trunk' },
];

// ── Pan/Zoom State ──
let _mapPan = { x: 0, y: 0 };
let _mapScale = 1.0;
let _mapDragging = false;
let _mapDragStart = { x: 0, y: 0 };
let _mapPanStart = { x: 0, y: 0 };

// ── State ──
let _ncSelectedTrain = null;
let _ncInitialized = false;

// ── Computed KPIs ──
function computeNetworkKPIs() {
    const total = NETWORK_TRAINS.length;
    const onTime = NETWORK_TRAINS.filter(t => t.status === 'on-time').length;
    const delayed = NETWORK_TRAINS.filter(t => t.status === 'delayed').length;
    const critical = NETWORK_TRAINS.filter(t => t.status === 'critical' || t.status === 'blocked').length;
    const avgDelay = total > 0 ? Math.round(NETWORK_TRAINS.reduce((s, t) => s + t.delay, 0) / total) : 0;
    const efficiency = total > 0 ? Math.round((onTime / total) * 100) : 0;
    return { total, onTime, delayed, critical, avgDelay, efficiency, conflictsResolved: 12 };
}

// ── Render Train Cards ──
function renderTrainCards() {
    const container = document.getElementById('nc-train-cards');
    if (!container) return;
    container.innerHTML = '';

    NETWORK_TRAINS.forEach(train => {
        const statusClass = train.status;
        const progressClass = train.status === 'critical' ? 'critical' : train.delay > 0 ? 'delayed' : 'on-time';

        let delayText = 'On Time';
        if (train.delay > 0 && train.status === 'critical') delayText = `Critical +${train.delay}min`;
        else if (train.delay > 0) delayText = `+${train.delay}min`;

        const card = document.createElement('div');
        card.className = `nc-train-card${_ncSelectedTrain === train.id ? ' active' : ''}`;
        card.id = `nc-card-${train.id}`;
        card.onclick = () => selectTrain(train.id);

        card.innerHTML = `
            <div class="nc-card-top">
                <div>
                    <div class="nc-train-name">${train.name}</div>
                    <div class="nc-train-id">ID: ${train.id}</div>
                </div>
                <div class="nc-badges">
                    <span class="nc-priority-badge ${train.priority}">${train.priority} priority</span>
                    <span class="nc-status-badge ${statusClass}">${formatStatus(train.status)}</span>
                </div>
            </div>
            <div class="nc-station-row">
                <span class="nc-current">◉ Current: ${train.currentLocation}</span>
                <span class="nc-next">Next: ${train.nextStation}</span>
            </div>
            <div class="nc-progress-row">
                <div class="nc-progress-label">
                    <span>Progress</span>
                    <span>${train.progress}%</span>
                </div>
                <div class="nc-progress-bar">
                    <div class="nc-progress-fill ${progressClass}" style="width: ${train.progress}%"></div>
                </div>
            </div>
            <div class="nc-delay-info">
                <span class="nc-delay-chip ${progressClass}">
                    ⏱ Delay: ${train.delay}min
                </span>
                ${train.status === 'critical' ? '<span class="nc-attention">⚠ Requires attention</span>' : ''}
            </div>
            <div class="nc-card-actions">
                <button class="nc-action-btn" onclick="event.stopPropagation(); ncShowToast('Route for ${train.name} displayed on map')">Route</button>
                <button class="nc-action-btn" onclick="event.stopPropagation(); ncShowToast('AI Reschedule initiated for ${train.name}')">Reschedule</button>
                ${train.delay > 15 ? `<button class="nc-action-btn ai" onclick="event.stopPropagation(); ncShowToast('⚡ AI Suggestion: Reroute ${train.name} via alternate corridor')">AI Suggest</button>` : ''}
            </div>
        `;
        container.appendChild(card);
    });
}

function formatStatus(status) {
    const map = { 'on-time': 'On Time', 'delayed': 'Delayed', 'critical': 'Critical', 'blocked': 'Blocked', 'maintenance': 'Maintenance', 'normal': 'Normal' };
    return map[status] || status;
}

// ── Render SVG Map ──
function renderNetworkMap() {
    const container = document.getElementById('nc-map-container');
    if (!container) return;

    // Remove old SVG wrapper if present
    let wrapper = document.getElementById('nc-map-zoom-wrapper');
    if (!wrapper) {
        // Build the wrapper+SVG structure
        container.innerHTML = '';

        // Zoom wrapper
        wrapper = document.createElement('div');
        wrapper.id = 'nc-map-zoom-wrapper';
        wrapper.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            overflow: hidden; cursor: grab; user-select: none;
        `;

        // SVG element
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.id = 'nc-map-svg';
        svg.setAttribute('viewBox', '0 0 900 950');
        svg.style.cssText = `
            width: 900px; height: 950px;
            transform-origin: top left;
            position: absolute; top: 0; left: 0;
            display: block; overflow: visible;
        `;
        wrapper.appendChild(svg);

        // Map controls overlay
        const controls = document.createElement('div');
        controls.className = 'nc-map-controls';
        controls.innerHTML = `
            <button id="nc-zoom-in" title="Zoom In" onclick="ncMapZoom(0.2)">+</button>
            <button id="nc-zoom-out" title="Zoom Out" onclick="ncMapZoom(-0.2)">−</button>
            <button id="nc-zoom-reset" title="Reset View" onclick="ncMapReset()" style="font-size:0.65rem;">⌂</button>
        `;

        // Legend overlay
        const legend = document.createElement('div');
        legend.className = 'nc-map-legend';
        legend.innerHTML = `
            <div class="nc-legend-item"><div class="nc-legend-line trunk-e"></div><span>Trunk (Electrified)</span></div>
            <div class="nc-legend-item"><div class="nc-legend-line trunk"></div><span>Trunk Route</span></div>
            <div class="nc-legend-item"><div class="nc-legend-line other"></div><span>Other Routes</span></div>
            <div class="nc-legend-item"><div class="nc-legend-line meter"></div><span>Metre Gauge</span></div>
            <div class="nc-legend-sep"></div>
            <div class="nc-legend-item"><div class="nc-legend-dot" style="background:#22c55e"></div><span>On Time</span></div>
            <div class="nc-legend-item"><div class="nc-legend-dot" style="background:#f59e0b"></div><span>Delayed</span></div>
            <div class="nc-legend-item"><div class="nc-legend-dot" style="background:#ef4444"></div><span>Critical</span></div>
        `;

        container.appendChild(wrapper);
        container.appendChild(controls);
        container.appendChild(legend);

        // Pan events
        setupMapPanZoom(wrapper, svg);
    }

    const svg = document.getElementById('nc-map-svg');
    drawMapContent(svg);
    applyMapTransform(document.getElementById('nc-map-zoom-wrapper').querySelector('svg'));
}

function drawMapContent(svg) {
    svg.innerHTML = '';

    // Background — light paper/map style
    const bg = createSVGEl('rect', { width: 900, height: 950, fill: '#eef2f8', rx: 0 });
    svg.appendChild(bg);

    // Subtle grid lines
    for (let x = 0; x <= 900; x += 100) {
        const gl = createSVGEl('line', { x1: x, y1: 0, x2: x, y2: 950, stroke: '#d4dce8', 'stroke-width': 0.5 });
        svg.appendChild(gl);
    }
    for (let y = 0; y <= 950; y += 100) {
        const gl = createSVGEl('line', { x1: 0, y1: y, x2: 900, y2: y, stroke: '#d4dce8', 'stroke-width': 0.5 });
        svg.appendChild(gl);
    }

    // India border outline — simplified polygon for geographic context
    const indiaOutline = createSVGEl('path', {
        d: 'M 380,60 L 420,55 440,70 480,65 520,80 560,75 590,90 ' +
           'L 620,100 650,95 680,110 700,130 710,160 ' +
           'L 720,180 730,200 725,230 710,260 700,280 ' +
           'L 690,310 680,340 670,360 660,380 650,410 ' +
           'L 640,440 630,460 620,480 610,500 600,530 ' +
           'L 590,550 580,570 570,590 560,620 550,650 ' +
           'L 540,670 520,690 500,710 480,730 460,750 ' +
           'L 440,770 420,790 400,810 380,830 360,850 ' +
           'L 340,860 320,870 300,875 280,870 ' +
           'L 260,855 250,840 240,820 230,800 225,780 ' +
           'L 215,760 210,740 200,720 195,700 185,680 ' +
           'L 175,660 165,640 158,620 150,600 145,580 ' +
           'L 140,560 138,540 140,520 145,500 155,480 ' +
           'L 160,460 170,440 175,420 180,400 185,380 ' +
           'L 190,360 200,340 210,320 220,300 230,280 ' +
           'L 235,260 230,240 220,220 210,200 200,185 ' +
           'L 190,170 185,155 190,140 200,125 ' +
           'L 215,115 230,105 250,100 270,95 290,90 ' +
           'L 310,82 330,75 350,68 370,62 Z',
        fill: '#f5f7fa',
        stroke: '#90a4ae',
        'stroke-width': '1.8',
        'stroke-linejoin': 'round',
        opacity: '0.6'
    });
    svg.appendChild(indiaOutline);

    // Title
    const titleEl = createSVGEl('text', {
        x: 450, y: 35,
        fill: '#1a237e',
        'font-size': '18',
        'font-family': "'Georgia', serif",
        'font-weight': 'bold',
        'text-anchor': 'middle',
        'letter-spacing': '1'
    });
    titleEl.textContent = 'Railway Network Map of India';
    svg.appendChild(titleEl);

    const subtitleEl = createSVGEl('text', {
        x: 450, y: 55,
        fill: '#37474f',
        'font-size': '11',
        'font-family': "'Georgia', serif",
        'font-style': 'italic',
        'text-anchor': 'middle'
    });
    subtitleEl.textContent = 'Schematic';
    svg.appendChild(subtitleEl);

    // Draw routes (bottom layer)
    MAP_ROUTES.forEach(route => {
        const from = MAP_STATIONS.find(s => s.id === route.from);
        const to = MAP_STATIONS.find(s => s.id === route.to);
        if (!from || !to) return;

        const color = getRouteColor(route.type);
        const width = route.type === 'trunk-e' ? 2.8 : route.type === 'trunk' ? 2.2 : 1.5;

        const line = createSVGEl('line', {
            x1: from.x, y1: from.y,
            x2: to.x, y2: to.y,
            stroke: color,
            'stroke-width': width,
            'stroke-linecap': 'round',
            opacity: 0.85
        });
        svg.appendChild(line);
    });

    // Draw stations
    MAP_STATIONS.forEach(station => {
        const g = createSVGEl('g', { class: 'nc-station-dot' });

        if (station.major) {
            // Outer ring for major stations
            const ring = createSVGEl('circle', {
                cx: station.x, cy: station.y,
                r: 7, fill: 'white',
                stroke: '#1a237e', 'stroke-width': 1.5
            });
            g.appendChild(ring);

            const inner = createSVGEl('circle', {
                cx: station.x, cy: station.y,
                r: 3.5, fill: '#1a237e'
            });
            g.appendChild(inner);
        } else {
            const dot = createSVGEl('circle', {
                cx: station.x, cy: station.y,
                r: 3.5, fill: 'white',
                stroke: '#546e7a', 'stroke-width': 1.2
            });
            g.appendChild(dot);
        }

        // Label
        const labelX = station.x + (station.x > 650 ? -9 : 9);
        const anchor = station.x > 650 ? 'end' : 'start';
        const labelY = station.y - 8;
        const label = createSVGEl('text', {
            x: labelX, y: labelY,
            fill: station.major ? '#0d1b3e' : '#546e7a',
            'font-size': station.major ? '8.5' : '7',
            'font-family': "'Arial', sans-serif",
            'font-weight': station.major ? '700' : '400',
            'text-anchor': anchor
        });
        label.textContent = station.name;
        g.appendChild(label);

        svg.appendChild(g);
    });

    // Draw train markers (top layer)
    NETWORK_TRAINS.forEach(train => {
        const g = createSVGEl('g', {
            class: `nc-train-marker${_ncSelectedTrain === train.id ? ' active' : ''}`,
            id: `nc-marker-${train.id}`,
            'data-train-id': train.id,
            style: 'cursor:pointer'
        });
        g.onclick = () => selectTrain(train.id);

        const cx = train.coordinates.x;
        const cy = train.coordinates.y;
        const color = getTrainColor(train.status);

        // Pulsing ring
        const pulse = createSVGEl('circle', {
            cx, cy, r: 12,
            fill: 'none',
            stroke: color,
            'stroke-width': 1.5,
            opacity: 0.4
        });
        pulse.innerHTML = `<animate attributeName="r" values="9;15;9" dur="2s" repeatCount="indefinite"/>
                           <animate attributeName="opacity" values="0.5;0.1;0.5" dur="2s" repeatCount="indefinite"/>`;
        g.appendChild(pulse);

        // Train icon background
        const bgCircle = createSVGEl('circle', {
            cx, cy, r: 9,
            fill: color,
            stroke: 'white',
            'stroke-width': 1.8
        });
        g.appendChild(bgCircle);

        // Train symbol (locomotive icon simplified)
        const icon = createSVGEl('text', {
            x: cx, y: cy + 4,
            fill: 'white',
            'font-size': '8',
            'font-family': "'Arial', sans-serif",
            'font-weight': 'bold',
            'text-anchor': 'middle'
        });
        icon.textContent = '🚂';
        g.appendChild(icon);

        // Label tag
        const tagW = 42, tagH = 14;
        const tagX = cx + 11, tagY = cy - 8;
        const tag = createSVGEl('rect', {
            x: tagX, y: tagY, width: tagW, height: tagH,
            fill: color, rx: 3, opacity: 0.92
        });
        g.appendChild(tag);

        const tagLabel = createSVGEl('text', {
            x: tagX + tagW / 2, y: tagY + 10,
            fill: 'white',
            'font-size': '7.5',
            'font-family': "'Arial', sans-serif",
            'font-weight': '700',
            'text-anchor': 'middle'
        });
        tagLabel.textContent = train.id;
        g.appendChild(tagLabel);

        svg.appendChild(g);
    });

    // Conflict indicators
    NETWORK_CONFLICTS.forEach(conflict => {
        const station = MAP_STATIONS.find(s => s.name === conflict.location || s.id === conflict.location);
        if (!station) return;
        const cx = station.x, cy = station.y;

        const warningG = createSVGEl('g', {});
        const warnBg = createSVGEl('circle', {
            cx: cx + 10, cy: cy - 10, r: 7,
            fill: '#ff6f00', stroke: 'white', 'stroke-width': 1.5, opacity: 0.9
        });
        warningG.appendChild(warnBg);

        const warnTxt = createSVGEl('text', {
            x: cx + 10, y: cy - 6,
            fill: 'white', 'font-size': '8',
            'font-family': "'Arial', sans-serif",
            'font-weight': 'bold', 'text-anchor': 'middle'
        });
        warnTxt.textContent = '!';
        warningG.appendChild(warnTxt);
        svg.appendChild(warningG);
    });
}

function getRouteColor(type) {
    switch (type) {
        case 'trunk-e': return '#0099cc';   // Cyan-blue for electrified trunk
        case 'trunk':   return '#e53935';   // Red for trunk
        case 'other':   return '#e57373';   // Light red for other routes
        case 'meter':   return '#2e7d32';   // Green for metre gauge
        default:        return '#90a4ae';
    }
}

function getTrainColor(status) {
    switch (status) {
        case 'on-time': return '#22c55e';
        case 'delayed': return '#f59e0b';
        case 'critical': return '#ef4444';
        case 'blocked': return '#ef4444';
        case 'maintenance': return '#f59e0b';
        default: return '#3b82f6';
    }
}

function createSVGEl(tag, attrs) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs || {})) {
        el.setAttribute(k, v);
    }
    return el;
}

// ── Pan + Zoom Logic ──
function setupMapPanZoom(wrapper, svg) {
    // Mouse wheel zoom
    wrapper.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.12 : -0.12;
        const rect = wrapper.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        ncMapZoomAt(delta, mouseX, mouseY);
    }, { passive: false });

    // Mouse drag pan
    wrapper.addEventListener('mousedown', (e) => {
        if (e.button !== 0) return;
        _mapDragging = true;
        _mapDragStart = { x: e.clientX, y: e.clientY };
        _mapPanStart = { x: _mapPan.x, y: _mapPan.y };
        wrapper.style.cursor = 'grabbing';
        e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
        if (!_mapDragging) return;
        const dx = e.clientX - _mapDragStart.x;
        const dy = e.clientY - _mapDragStart.y;
        _mapPan.x = _mapPanStart.x + dx;
        _mapPan.y = _mapPanStart.y + dy;
        applyMapTransform(svg);
    });

    window.addEventListener('mouseup', () => {
        if (_mapDragging) {
            _mapDragging = false;
            wrapper.style.cursor = 'grab';
        }
    });

    // Touch support
    let _lastTouchDist = null;
    let _touchPanStart = null;

    wrapper.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            _lastTouchDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        } else if (e.touches.length === 1) {
            _mapDragging = true;
            _mapDragStart = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            _mapPanStart = { x: _mapPan.x, y: _mapPan.y };
        }
    }, { passive: true });

    wrapper.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            if (_lastTouchDist) {
                const scale = dist / _lastTouchDist - 1;
                ncMapZoom(scale * 0.5);
            }
            _lastTouchDist = dist;
        } else if (e.touches.length === 1 && _mapDragging) {
            const dx = e.touches[0].clientX - _mapDragStart.x;
            const dy = e.touches[0].clientY - _mapDragStart.y;
            _mapPan.x = _mapPanStart.x + dx;
            _mapPan.y = _mapPanStart.y + dy;
            applyMapTransform(svg);
        }
        e.preventDefault();
    }, { passive: false });

    wrapper.addEventListener('touchend', () => {
        _mapDragging = false;
        _lastTouchDist = null;
    });
}

function applyMapTransform(svg) {
    if (!svg) svg = document.querySelector('#nc-map-zoom-wrapper svg');
    if (!svg) return;
    svg.style.transform = `translate(${_mapPan.x}px, ${_mapPan.y}px) scale(${_mapScale})`;
    svg.style.transformOrigin = 'top left';
}

window.ncMapZoom = function(delta) {
    const wrapper = document.getElementById('nc-map-zoom-wrapper');
    if (!wrapper) return;
    const rect = wrapper.getBoundingClientRect();
    ncMapZoomAt(delta, rect.width / 2, rect.height / 2);
};

function ncMapZoomAt(delta, pivotX, pivotY) {
    const prevScale = _mapScale;
    _mapScale = Math.max(0.4, Math.min(5.0, _mapScale + delta));

    // Adjust pan so zoom is centered on pivot
    const scaleRatio = _mapScale / prevScale;
    _mapPan.x = pivotX - scaleRatio * (pivotX - _mapPan.x);
    _mapPan.y = pivotY - scaleRatio * (pivotY - _mapPan.y);

    applyMapTransform(null);
}

window.ncMapReset = function() {
    _mapPan = { x: 0, y: 0 };
    _mapScale = 1.0;
    applyMapTransform(null);
};

// ── Render Network Overview KPIs ──
function renderNetworkOverview() {
    const kpis = computeNetworkKPIs();

    const grid = document.getElementById('nc-kpi-grid');
    if (!grid) return;

    grid.innerHTML = `
        <div class="nc-kpi-card">
            <div class="nc-kpi-label">Total Trains</div>
            <div class="nc-kpi-value">${kpis.total}</div>
        </div>
        <div class="nc-kpi-card">
            <div class="nc-kpi-label">On Time</div>
            <div class="nc-kpi-value green">${kpis.onTime}</div>
        </div>
        <div class="nc-kpi-card">
            <div class="nc-kpi-label">Delayed</div>
            <div class="nc-kpi-value amber">${kpis.delayed}</div>
        </div>
        <div class="nc-kpi-card">
            <div class="nc-kpi-label">Critical</div>
            <div class="nc-kpi-value red">${kpis.critical}</div>
        </div>
    `;

    const perfContainer = document.getElementById('nc-performance-data');
    if (perfContainer) {
        perfContainer.innerHTML = `
            <div class="nc-perf-row">
                <span class="nc-perf-label">Network Efficiency</span>
                <span class="nc-perf-value">${kpis.efficiency}%</span>
            </div>
            <div class="nc-perf-bar">
                <div class="nc-perf-bar-fill" style="width: ${kpis.efficiency}%; background: ${kpis.efficiency >= 70 ? 'var(--nc-green)' : kpis.efficiency >= 40 ? 'var(--nc-amber)' : 'var(--nc-red)'}"></div>
            </div>
            <div class="nc-perf-row">
                <span class="nc-perf-label">Avg Delay</span>
                <span class="nc-perf-value">${kpis.avgDelay}min</span>
            </div>
            <div class="nc-perf-row">
                <span class="nc-perf-label">Conflicts Resolved</span>
                <span class="nc-perf-value">${kpis.conflictsResolved}</span>
            </div>
        `;
    }
}

// ── Render Conflicts ──
function renderConflicts() {
    const container = document.getElementById('nc-conflicts-list');
    if (!container) return;
    container.innerHTML = '';

    NETWORK_CONFLICTS.forEach(conflict => {
        const card = document.createElement('div');
        card.className = 'nc-conflict-card';

        card.innerHTML = `
            <div class="nc-conflict-top">
                <span class="nc-conflict-type ${conflict.type}">${conflict.type}</span>
            </div>
            <div class="nc-conflict-location">${conflict.location}</div>
            <div class="nc-conflict-trains">Trains: ${conflict.trains.join(', ')}</div>
            <div class="nc-conflict-delay">+${conflict.delay}min delay</div>
        `;
        container.appendChild(card);
    });
}

// ── Train Selection (Map ↔ Card sync) ──
function selectTrain(trainId) {
    if (_ncSelectedTrain === trainId) {
        _ncSelectedTrain = null;
    } else {
        _ncSelectedTrain = trainId;
    }

    document.querySelectorAll('#page-network .nc-train-card').forEach(card => {
        card.classList.remove('active');
    });
    if (_ncSelectedTrain) {
        const activeCard = document.getElementById(`nc-card-${_ncSelectedTrain}`);
        if (activeCard) {
            activeCard.classList.add('active');
            activeCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }

    document.querySelectorAll('#page-network .nc-train-marker').forEach(marker => {
        marker.classList.remove('active');
    });
    if (_ncSelectedTrain) {
        const activeMarker = document.getElementById(`nc-marker-${_ncSelectedTrain}`);
        if (activeMarker) activeMarker.classList.add('active');
    }
}

// ── Toast Notification ──
let _ncToastTimer = null;
window.ncShowToast = function(message) {
    const toast = document.getElementById('nc-toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('visible');
    if (_ncToastTimer) clearTimeout(_ncToastTimer);
    _ncToastTimer = setTimeout(() => {
        toast.classList.remove('visible');
    }, 3000);
};

// ── Initialize ──
window.initNetworkControl = function() {
    // Reset map state on re-init
    _mapPan = { x: 0, y: 0 };
    _mapScale = 1.0;

    renderTrainCards();
    renderNetworkOverview();
    renderConflicts();

    setTimeout(() => {
        renderNetworkMap();
    }, 50);

    _ncInitialized = true;
};
