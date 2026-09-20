let assetsData = [];

async function loadAssets() {
    const container = document.getElementById('assets-tbody');
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Fetching asset inventory from backend...</td></tr>';
    try {
        const resp = await fetch("/api/assets?limit=200");
        if (resp.ok) {
            const data = await resp.json();
            assetsData = data.items || data;
            renderAssetsTable();
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error connecting to backend: ${e.message}</td></tr>`;
    }
}

function renderAssetsTable() {
    const tbody = document.getElementById('assets-tbody');
    const searchFilter = document.getElementById('assetSearch')?.value.toLowerCase() || "";
    const typeFilter = document.getElementById('assetTypeFilter')?.value || "all";

    const filtered = assetsData.filter(asset => {
        const matchesSearch = (asset.asset_id || "").toLowerCase().includes(searchFilter) || 
                              (asset.asset_type || "").toLowerCase().includes(searchFilter) ||
                              (asset.location || "").toLowerCase().includes(searchFilter) ||
                              (asset.department || "").toLowerCase().includes(searchFilter);

        let matchesType = (typeFilter === "all");
        if (!matchesType) {
            if (typeFilter === "Track Section") {
                matchesType = asset.department === "Engineering" || 
                              /track|rail|ballast|bridge|culvert|joint|weld/i.test(asset.asset_type);
            } else if (typeFilter === "OHE") {
                matchesType = asset.department === "Traction Distribution" || 
                              /ohe|catenary|contact|substation|feeder|mast|conductor|pantograph/i.test(asset.asset_type);
            } else if (typeFilter === "Signal Point") {
                matchesType = asset.department === "Signal & Telecommunication" || 
                              /signal|point|circuit|axle|interlocking|relay|cable|tower|panel/i.test(asset.asset_type);
            } else {
                matchesType = (asset.asset_type || "").toLowerCase() === typeFilter.toLowerCase();
            }
        }
        return matchesSearch && matchesType;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No assets found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(asset => {
        const score = parseFloat(asset.health_score) || 0;
        let healthColor = "var(--success)";
        if (score < 50) healthColor = "var(--danger)";
        else if (score < 75) healthColor = "var(--st-color)";

        let dateStr = "Never";
        if (asset.last_maintenance) {
            dateStr = new Date(asset.last_maintenance).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
        }

        let typeBadge = "badge-default";
        if (asset.department === "Engineering" || /track|rail|ballast|bridge/i.test(asset.asset_type)) {
            typeBadge = "badge-engg";
        } else if (asset.department === "Traction Distribution" || /ohe|catenary|mast|substation/i.test(asset.asset_type)) {
            typeBadge = "badge-ohe";
        } else if (asset.department === "Signal & Telecommunication" || /signal|point|relay/i.test(asset.asset_type)) {
            typeBadge = "badge-st";
        }

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500;">${asset.asset_id}</td>
                <td><span class="badge ${typeBadge}">${asset.asset_type.toUpperCase()}</span></td>
                <td style="color: var(--text-muted);">${asset.location || ('Corridor ' + asset.corridor_id)}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: ${healthColor};">${score.toFixed(1)}%</span>
                        <div style="width: 60px; height: 6px; background: rgba(0,0,0,0.08); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${Math.min(100, Math.max(0, score))}%; height: 100%; background: ${healthColor};"></div>
                        </div>
                    </div>
                </td>
                <td style="color: var(--text-dim);">${dateStr}</td>
            </tr>
        `;
    }).join('');
}

// Bind search and filter
document.getElementById('assetSearch')?.addEventListener('input', renderAssetsTable);
document.getElementById('assetTypeFilter')?.addEventListener('change', renderAssetsTable);
