let maintenanceData = [];

async function loadMaintenanceTasks() {
    const container = document.getElementById('maintenance-tbody');
    container.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px;">Fetching maintenance tasks from backend...</td></tr>';
    try {
        const resp = await fetch("/api/tasks?limit=200");
        if (resp.ok) {
            const data = await resp.json();
            maintenanceData = data.items || data;
            renderMaintenanceTable();
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        container.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--danger);">Error connecting to backend: ${e.message}</td></tr>`;
    }
}

function renderMaintenanceTable() {
    const tbody = document.getElementById('maintenance-tbody');
    const searchFilter = document.getElementById('maintenanceSearch')?.value.toLowerCase() || "";
    const deptFilter = document.getElementById('maintenanceDeptFilter')?.value || "all";

    // Filter data
    const filtered = maintenanceData.filter(task => {
        const matchesSearch = (task.task_id || "").toLowerCase().includes(searchFilter) || 
                              (task.task_type || "").toLowerCase().includes(searchFilter) ||
                              (task.location || "").toLowerCase().includes(searchFilter);
        const matchesDept = deptFilter === "all" || task.department === deptFilter;
        return matchesSearch && matchesDept;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 20px; color: var(--text-muted);">No tasks found.</td></tr>';
        return;
    }

    // Sort by priority score (descending)
    filtered.sort((a, b) => b.priority_score - a.priority_score);

    tbody.innerHTML = filtered.map(task => {
        // Build badges
        let deptBadgeClass = "badge-default";
        if (task.department === "Engineering") deptBadgeClass = "badge-engg";
        if (task.department === "Traction Distribution") deptBadgeClass = "badge-ohe";
        if (task.department === "Signal & Telecommunication") deptBadgeClass = "badge-st";

        let priorityBadgeClass = "badge-low";
        if (task.priority === "critical") priorityBadgeClass = "badge-critical";
        if (task.priority === "high") priorityBadgeClass = "badge-high";
        if (task.priority === "medium") priorityBadgeClass = "badge-medium";

        let statusBadge = "badge-default";
        if (task.status === "pending") statusBadge = "badge-warning";
        if (task.status === "scheduled") statusBadge = "badge-info";
        if (task.status === "completed") statusBadge = "badge-success";

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; color: var(--text-main); font-weight: 500;">${task.task_id}</td>
                <td><span class="badge ${deptBadgeClass}">${task.department}</span></td>
                <td style="font-weight: 500; font-size: 0.9rem;">${task.task_type}</td>
                <td style="color: var(--text-muted); font-size: 0.85rem;">${task.location || ('Corridor ' + task.corridor_id)}</td>
                <td>${task.estimated_duration}m</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span class="badge ${priorityBadgeClass}">${task.priority.toUpperCase()}</span>
                        <div class="score-bar-bg" style="width: 50px; height: 6px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden;">
                            <div class="score-bar-fill" style="width: ${task.priority_score}%; height: 100%; background: ${task.priority_score > 75 ? 'var(--danger)' : task.priority_score > 40 ? 'var(--st-color)' : 'var(--success)'};"></div>
                        </div>
                        <span style="font-family: var(--font-mono); font-size: 0.75rem;">${Math.round(task.priority_score)}</span>
                    </div>
                </td>
                <td><span class="badge ${statusBadge}">${task.status.toUpperCase()}</span></td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn" onclick="editTask(${task.id})" title="Edit Task">✏️</button>
                        <button class="action-btn" onclick="deleteTask(${task.id})" title="Delete Task">🗑️</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function recalculatePriorities() {
    try {
        addLog("Sending recalculate request to Priority Engine...", "info");
        const resp = await fetch("/api/tasks/recalculate-priorities", { method: "POST" });
        if (resp.ok) {
            addLog("Priority Engine recalculation complete.", "success");
            loadMaintenanceTasks(); // reload data
        }
    } catch(e) {
        addLog(`Recalculate failed: ${e.message}`, "error");
    }
}

// Bind search and filter
document.getElementById('maintenanceSearch')?.addEventListener('input', renderMaintenanceTable);
document.getElementById('maintenanceDeptFilter')?.addEventListener('change', renderMaintenanceTable);

// Mock functions for modals
function openMaintenanceModal() {
    alert("New Maintenance Request UI will open here.");
}
function editTask(id) {
    alert("Edit Task UI for DB ID: " + id);
}
async function deleteTask(id) {
    if(confirm("Are you sure you want to delete this task?")) {
        try {
            const resp = await fetch(`/api/tasks/${id}`, { method: "DELETE" });
            if (resp.ok) {
                addLog(`Task ${id} deleted successfully.`, "success");
                loadMaintenanceTasks();
            } else {
                alert("Failed to delete task.");
            }
        } catch(e) {
            console.error(e);
        }
    }
}
