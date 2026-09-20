let defectsData = [];

async function loadDefects() {
    const container = document.getElementById('defects-tbody');
    container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Fetching defect logs from backend...</td></tr>';
    try {
        const resp = await fetch("/api/defects?limit=200");
        if (resp.ok) {
            const data = await resp.json();
            defectsData = data.items || data;
            renderDefectsTable();
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        container.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--danger);">Error connecting to backend: ${e.message}</td></tr>`;
    }
}

function renderDefectsTable() {
    const tbody = document.getElementById('defects-tbody');
    const searchFilter = document.getElementById('defectSearch')?.value.toLowerCase() || "";

    const filtered = defectsData.filter(defect => {
        return (defect.defect_id || "").toLowerCase().includes(searchFilter) || 
               (defect.defect_type || "").toLowerCase().includes(searchFilter) ||
               (defect.description || "").toLowerCase().includes(searchFilter) ||
               (defect.department || "").toLowerCase().includes(searchFilter) ||
               (defect.location || "").toLowerCase().includes(searchFilter);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No defects found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(defect => {
        const sevStr = String(defect.severity || "low").toLowerCase();
        let severityBadge = "badge-low";
        let sevLabel = "Low";
        const sevNum = parseFloat(defect.severity);

        if (sevStr === "critical" || sevNum > 8) {
            severityBadge = "badge-critical";
            sevLabel = "Critical";
        } else if (sevStr === "high" || sevNum > 5) {
            severityBadge = "badge-high";
            sevLabel = "High";
        } else if (sevStr === "medium" || sevNum > 3) {
            severityBadge = "badge-medium";
            sevLabel = "Medium";
        } else {
            sevLabel = !isNaN(sevNum) ? `Level ${sevNum.toFixed(1)}` : "Low";
        }

        let statusBadge = (defect.status || "").toLowerCase() === "open" ? "badge-warning" : "badge-success";
        const rawDate = defect.detected_date || defect.date_reported;
        let dateStr = rawDate ? new Date(rawDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : "Recent";

        let deptBadge = "badge-default";
        if (defect.department === "Engineering") deptBadge = "badge-engg";
        else if (defect.department === "Traction Distribution") deptBadge = "badge-ohe";
        else if (defect.department === "Signal & Telecommunication") deptBadge = "badge-st";

        const locationOrCorridor = defect.location || (defect.corridor_id ? `Corridor ${defect.corridor_id}` : (defect.department || 'Network'));

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500;">${defect.defect_id}</td>
                <td>
                    <div style="font-weight: 500;">${defect.defect_type}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${defect.description || 'No description'}</div>
                </td>
                <td style="color: var(--text-muted);"><span class="badge ${deptBadge}">${locationOrCorridor}</span></td>
                <td><span class="badge ${severityBadge}">${sevLabel}</span></td>
                <td><span class="badge ${statusBadge}">${(defect.status || 'OPEN').toUpperCase()}</span></td>
                <td style="color: var(--text-dim);">${dateStr}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn" onclick="scheduleDefect(${defect.id})" title="Schedule Fix">📅</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Bind search 
document.getElementById('defectSearch')?.addEventListener('input', renderDefectsTable);

function openDefectModal() {
    alert("New Defect Report UI logic goes here.");
}
function scheduleDefect(id) {
    alert("Scheduling defect " + id + " into a maintenance block...");
}
