let allItems = [];
let currentZone = 'Main';
let isEditMode = false;
let currentSort = { column: null, direction: 'asc' }; 
let activeShelfId = null;
let currentDetailCode = null;

window.onload = async () => {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    await loadDashboardData();
    const lastSection = localStorage.getItem('lastSection');

    if (!username) {
        window.location.href = 'index.html';
        return;
    }

    document.getElementById('userDisplay').innerText = `Welcome, ${username} (${role})`;
    if (!token || !username) {
    logout(); 
    return;
    }

    if (role === 'admin') {
        const adminBtn = document.getElementById('admin-only-register');
        if (adminBtn) adminBtn.style.display = 'block';
    }
 
    const editShelfBtn = document.getElementById('addShelfBtn');
    const shelfSeed = document.getElementById('newShelfSeed');
    
    if (role !== 'admin') {
        if (editShelfBtn) editShelfBtn.style.display = 'none'; 
        if (shelfSeed) shelfSeed.style.display = 'none';     
    }
    if (typeof initStockTakePage === 'function') {
        initStockTakePage(); 
    }
    
    if (lastSection) {
        showSection(lastSection); 
        if (lastSection === 'map-section' || lastSection === 'location-mgmt-section') {
            const savedZone = currentZone || 'Main'; 
            console.log(`正在恢復地圖渲染: ${savedZone}`);
            await loadShelvesFromServer()
            updateZoneUI(savedZone);
        }
    } else {
        showSection('dashboard-section');
    }

    loadDashboardData();
    initMapInteraction();

};

async function loadShelves(zone) {
    currentZone = zone;
    const token = localStorage.getItem('token');
    try {
        const response = await fetch(`/api/warehouse/${zone}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const shelves = await response.json();
        const container = document.getElementById('map-container');
        if (!container) return;

        container.innerHTML = ''; 
        shelves.forEach(shelf => renderShelf(shelf)); 
        return true;
    } catch (err) {
        console.error("載入貨架失敗:", err);
        return false;
    }
}

async function loadDashboardData() {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/items', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        allItems = data; 
        filterAndRenderTable();
        return true; 
    } catch (err) {
        console.error("Fetch 失敗:", err);
        return false;
    }
}

function renderTable(data) {
    const tbody = document.getElementById('itemTableBody');
    if (!tbody) return;

    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; background:#fff; padding:20px;">暫無符合條件的資料</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr style="background-color: #ffffff; border-bottom: 1px solid #eee;">
            <td style="padding: 12px; color: #333;">${item.codeNumber || 'N/A'}</td>
            <td style="padding: 12px; color: #333;">${item.name || 'N/A'}</td>
            <td style="padding: 12px; color: #333;">${item.quantity || 0}</td>
            <td style="padding: 12px; color: #333;">${item.location || '未分類'}</td>
            <td style="padding: 12px;">
                <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; 
                    background: ${item.status === '在庫' ? '#e3f2fd' : '#ffebee'}; 
                    color: ${item.status === '在庫' ? '#1976d2' : '#c62828'};">
                    ${item.status || '在庫'}
                </span>
            </td>
        </tr>
    `).join('');
}

function updateLocationFilter() {
    const locSelect = document.getElementById('filterLocation');
    if (!locSelect) return;

    const locations = [...new Set(allItems.map(item => item.location))].filter(l => l);

    locSelect.innerHTML = '<option value="all">All Shipping Locations</option>';
    locations.forEach(loc => {
        const option = document.createElement('option');
        option.value = loc;
        option.textContent = loc;
        locSelect.appendChild(option);
    });
}


async function loadDashboardData() {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
    if (response.ok) {
        const rawData = await response.json();
        allItems = rawData.map(item => ({
            ...item,
            storageLocation: (item.storageLocation === "undefined" || item.storageLocation === null) ? "" : item.storageLocation,
            shippingLocation: item.shippingLocation || item.location || ""
        }));

        console.log("✅ 數據清洗完成");
        renderModalUnassignedList();
        updateLocationFilter();
        filterAndRenderTable();
    }
    } catch (err) {
        console.error("Fetch 失敗:", err);
    }
}

// function filterMonthlyTable() {
//     const searchTerm = document.getElementById('searchCode').value.toUpperCase();
//     const rows = document.querySelectorAll('#itemTableBody tr');

//     rows.forEach(row => {
//         const codeCell = row.cells[0];
//         if (codeCell) {
//             const codeText = codeCell.textContent || codeCell.innerText;
//             row.style.display = codeText.toUpperCase().includes(searchTerm) ? "" : "none";
//         }
//     });
// }

window.filterAndRenderTable = function() {
    const searchInput = document.getElementById('searchCode');
    const locSelect = document.getElementById('filterLocation');
    const statSelect = document.getElementById('filterStatus');
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const locFilter = locSelect ? locSelect.value : 'all';
    const statFilter = statSelect ? statSelect.value : 'all';

    let filteredData = allItems.filter(item => {
        const matchCode = (item.codeNumber || '').toLowerCase().includes(searchTerm);
        const matchLoc = locFilter === 'all' || item.location === locFilter;
        const matchStat = statFilter === 'all' || item.status === statFilter;
        
        return matchCode && matchLoc && matchStat;
    });
    if (currentSort.column) {
        filteredData.sort((a, b) => {
            let valA = a[currentSort.column];
            let valB = b[currentSort.column];
            if (currentSort.column === 'quantity') {
                valA = parseInt(valA) || 0;
                valB = parseInt(valB) || 0;
            }
            if (valA < valB) return currentSort.direction === 'asc' ? -1 : 1;
            if (valA > valB) return currentSort.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    renderTable(filteredData);
};
window.updateUserProfile = async function() {
    const newUsername = document.getElementById('editUsername').value;
    const oldPassword = document.getElementById('oldPassword').value; 
    const newPassword = document.getElementById('editPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (!newUsername) { return alert("顯示名稱不能為空"); }
    if (!oldPassword) { return alert("請輸入舊密碼以驗證身份"); } 

    if (newPassword && newPassword !== confirmPassword) {
        return alert("兩次輸入的新密碼不一致");
    }

    const token = localStorage.getItem('token');
    const loginName = localStorage.getItem('loginName'); 

    try {
        const response = await fetch('/api/auth/update-profile', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                loginName, 
                oldPassword, 
                username: newUsername, 
                password: newPassword || undefined 
            })
        });

        const data = await response.json();

        if (response.ok) {
            alert("Profile Settings成功！");
            localStorage.setItem('username', newUsername);
            document.getElementById('userDisplay').innerText = `Welcome, ${newUsername} (${localStorage.getItem('userRole')})`;
            document.getElementById('oldPassword').value = '';
            document.getElementById('editPassword').value = '';
            document.getElementById('confirmPassword').value = '';
        } else {
            alert("修改失敗: " + data.message);
        }
    } catch (err) {
        console.error("更新資料出錯:", err);
    }
};

window.sortTable = function(column) {
    if (currentSort.column === column) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
    } else {
        currentSort.column = column;
        currentSort.direction = 'asc';
    }
    filterAndRenderTable();
};

window.renderTable = function(data) {
    const tbody = document.getElementById('itemTableBody');
    if (!tbody) return;

    tbody.innerHTML = data.map(item => {
        const shipLoc = item.shippingLocation || item.location || '--';
        const storLoc = item.storageLocation || '--';

        return `
            <tr onclick="openItemDetail('${item.codeNumber}')" style="cursor:pointer;">
                <td>${item.codeNumber}</td>
                <td>${item.name}</td>
                <td style="color: #0d47a1; font-weight: bold;">${storLoc}</td>
                <td style="color: #e65100;">${shipLoc}</td> 
                <td>${item.quantity}</td>
                <td><span class="status-pill">${item.status}</span></td>
            </tr>
        `;
    }).join('');
};

window.showSection = function(sectionId) {
    document.querySelectorAll('main section').forEach(sec => {
        sec.style.display = 'none';
    });
    const target = document.getElementById(sectionId);
    if (target) {
        target.style.display = 'block';
    }

    document.querySelectorAll('.menu li').forEach(li => {
        li.classList.remove('active');
        if (li.getAttribute('onclick')?.includes(sectionId)) {
            li.classList.add('active');
        }
    });

    localStorage.setItem('lastSection', sectionId);


    if (sectionId === 'map-section' || sectionId === 'location-mgmt-section') {
        loadShelvesFromServer();
    }
    if (sectionId === 'stocktake-section') {
        checkStocktakeAccess(); 
        setTimeout(() => document.getElementById('stocktake-barcode-input').focus(), 200);
    }
};

window.openItemDetail = function(codeNumber) {
    const item = allItems.find(i => i.codeNumber === codeNumber);
    if (!item) return;

    currentDetailCode = item.codeNumber;
    const content = document.getElementById('itemDetailContent');
    if (content) {
        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 100px 1fr; gap: 10px; line-height: 1.6;">
                <div style="color: #666;">codeNumber:</div><div style="font-weight:bold;">${item.codeNumber}</div>
                <div style="color: #666;">name</div><div>${item.name}</div>
                <div style="color: #666;">Storage Loc</div>
                <div>
                    <span class="badge-blue" style="cursor: pointer; text-decoration: underline;" 
                          onclick="locateShelf('${item.storageLocation}')" title="點擊在地圖上定位">
                        ${item.storageLocation || '尚未上架'}
                    </span>
                </div>
                <div style="color: #666;">SHipping Loc</div><div><span class="badge-orange">${item.shippingLocation || '未設定'}</span></div>
                <div style="color: #666;">Status</div><div>${item.status}</div>
            </div>
        `;
    }

    renderBarcodes(item.barcodes || []); 

    const modal = document.getElementById('itemDetailModal');
    if (modal) {
        modal.style.display = 'flex';
        setTimeout(() => document.getElementById('new-barcode-input')?.focus(), 200);
    }
};

function renderBarcodes(barcodes) {
    const list = document.getElementById('barcode-list');
    if (!list) return;
    if (!barcodes || barcodes.length === 0) {
        list.innerHTML = '<li style="color:#999; font-size:0.85rem; text-align:center; padding:10px;">🚫 no barcode</li>';
        return;
    }

    list.innerHTML = barcodes.map(bc => `
        <li style="display: flex; justify-content: space-between; align-items: center; 
                   background: #f8f9fa; border: 1px solid #eee; padding: 8px 12px; 
                   margin-bottom: 6px; border-radius: 6px;">
            <span style="font-family: monospace; font-weight: bold;">${bc}</span>
            <i class="fas fa-trash-alt" onclick="deleteBarcode('${bc}')" 
               style="color: #dc3545; cursor: pointer; padding: 5px;"></i>
        </li>
    `).join('');
}
async function addBarcode() {
    const input = document.getElementById('new-barcode-input');
    const barcode = input.value.trim();
    if (!barcode || !currentDetailCode) return;

    try {
        const res = await fetch(`/api/items/${currentDetailCode}/barcode`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify({ barcode })
        });
        
        if (res.ok) {
            const updatedItem = await res.json();
            const idx = allItems.findIndex(i => i.codeNumber === currentDetailCode);
            if (idx !== -1) allItems[idx].barcodes = updatedItem.barcodes;

            renderBarcodes(updatedItem.barcodes);
            input.value = '';
            input.focus();
        } else {
            const err = await res.json();
            alert(err.message || "新增失敗");
        }
    } catch (err) { console.error(err); }
}
async function deleteBarcode(barcode) {
    if (!confirm(`確定要刪除條碼 ${barcode} 嗎？`)) return;

    try {
        const res = await fetch(`/api/items/${currentDetailCode}/barcode/${barcode}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (res.ok) {
            const updatedItem = await res.json();
            const idx = allItems.findIndex(i => i.codeNumber === currentDetailCode);
            if (idx !== -1) allItems[idx].barcodes = updatedItem.barcodes;

            renderBarcodes(updatedItem.barcodes);
        } else {
            alert("刪除失敗");
        }
    } catch (err) {
        console.error("Delete Barcode Error:", err);
    }
}
window.closeItemDetailModal = function() {
    document.getElementById('itemDetailModal').style.display = 'none';
    currentDetailCode = null; 
};


window.locateShelf = async function(locationStr) {
    if (!locationStr || locationStr === '尚未上架') {
        alert("該貨品尚未分配位置。");
        return;
    }
    const shelfId = locationStr.split('-L')[0];

    try {
        const response = await fetch(`/api/warehouse/check-zone/${shelfId}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (!response.ok) throw new Error("找不到貨架區域");
        const { zone } = await response.json();
        showSection('location-mgmt-section'); 
    
        if (typeof closeItemDetailModal === 'function') {
            closeItemDetailModal();
        } else {
            document.getElementById('itemDetailModal').style.display = 'none';
        }
        if (currentZone !== zone) {
            currentZone = zone;
            updateZoneUI(zone);
            await loadShelves(zone); 
        }
        setTimeout(() => {
            console.log(`正在對貨架 ${shelfId} 執行自動高亮與管理...`);
            if (typeof window.highlightShelf === 'function') {
                window.highlightShelf(shelfId);
            } else {
                const shelfElement = document.querySelector(`.shelf[data-id="${shelfId}"]`);
                if (shelfElement) {
                    shelfElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    shelfElement.classList.add('highlight-red');
                    setTimeout(() => shelfElement.classList.remove('highlight-red'), 5000);
                }
                
                activeShelfId = shelfId;
                const modal = document.getElementById('shelfModal');
                if (modal && typeof renderLayers === 'function') {
                    document.getElementById('shelfModalTitle').innerText = `貨架: ${shelfId}`;
                    renderLayers(shelfId);
                    modal.style.display = 'flex';
                }
            }
        }, 600); 

    } catch (err) {
        console.error("定位失敗:", err);
    }
};

function updateZoneUI(zone) {
    document.querySelectorAll('.zone-tab, .zone-tabs button').forEach(btn => {
        btn.classList.toggle('active', btn.innerText.includes(zone));
    });
}

function initMapInteraction() {
    const grid = document.getElementById('warehouse-grid');
    const seed = document.getElementById('newShelfSeed');
    if (!grid || !seed) return;

    seed.ondragstart = (e) => e.dataTransfer.setData('action', 'create-shelf');
    grid.ondragover = (e) => e.preventDefault();
    grid.ondrop = handleGridDrop;

    grid.onclick = (e) => {
        if (!isEditMode) return;
        const rect = grid.getBoundingClientRect();
        const x = Math.floor(((e.clientX - rect.left) / rect.width) * 10) + 1;
        const y = Math.floor(((e.clientY - rect.top) / rect.height) * 10) + 1;
        createNewShelf(x, y);
    };
}

async function handleGridDrop(e) {
    e.preventDefault();
    const action = e.dataTransfer.getData('action');
    const rect = document.getElementById('warehouse-grid').getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 10) + 1;
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 10) + 1;

    if (action === 'create-shelf') {
        await createNewShelf(x, y);
    } else if (action === 'move-shelf') {
        const shelfId = e.dataTransfer.getData('shelfId');
        await updateShelfPosition(shelfId, x, y);
    }
}

async function createNewShelf(x, y) {
    const shelfId = 'S' + Math.floor(Math.random() * 1000);
    const shelfData = { shelfId, x, y, zone: currentZone };
    try {
        await fetch('/api/warehouse/add', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${localStorage.getItem('token')}` 
            },
            body: JSON.stringify(shelfData)
        });
        addShelfToUI(shelfData);
    } catch (err) { addShelfToUI(shelfData); }
}

async function updateShelfPosition(shelfId, x, y) {
    const shelfDiv = document.getElementById(shelfId);
    if (shelfDiv) {
        shelfDiv.style.gridColumn = x;
        shelfDiv.style.gridRow = y;
    }
    try {
        await fetch(`/api/warehouse/update/${shelfId}`, {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ x, y })
        });
    } catch (err) { console.error(err); }
}

function addShelfToUI(s) {
    const grid = document.getElementById('warehouse-grid');
    if (!grid) return;
    
    const role = localStorage.getItem('userRole'); 

    const div = document.createElement('div');
    div.className = 'shelf';
    div.id = s.shelfId;
    div.innerText = s.shelfId;
    
    if (role === 'admin') {
        div.draggable = true;
        div.ondragstart = (e) => {
            e.dataTransfer.setData('action', 'move-shelf');
            e.dataTransfer.setData('shelfId', s.shelfId);
        };
    } else {
        div.draggable = false;
        div.style.cursor = 'default'; 
    }

    div.style.gridColumn = s.x;
    div.style.gridRow = s.y;
    grid.appendChild(div);
}


async function loadShelvesFromServer() {
    const grid = document.getElementById('warehouse-grid');
    if (!grid) return;
    grid.querySelectorAll('.shelf').forEach(s => s.remove());
    try {
        const res = await fetch(`/api/warehouse/${currentZone}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        const shelves = await res.json();
        shelves.forEach(s => addShelfToUI(s));
    } catch (err) {}
}

function updateUnassignedList() {
    const listDiv = document.getElementById('items-to-assign');
    if (!listDiv) return;
    const unassigned = allItems.filter(item => item.location === "未出貨/換領處");
    listDiv.innerHTML = unassigned.map(item => `
        <div class="drag-item" draggable="true" ondragstart="event.dataTransfer.setData('action','assign-item');event.dataTransfer.setData('itemCode','${item.codeNumber}')">
            <strong>${item.codeNumber}</strong><br><small>${item.name}</small>
        </div>
    `).join('');
}

async function adminCreateUser() {
    const loginName = document.getElementById('regLoginName').value;
    const username = document.getElementById('regUsername').value;
    const password = document.getElementById('regPassword').value;
    const role = document.getElementById('regRole').value;
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({ loginName, username, password, role })
        });
        if (response.ok) alert("帳號新增成功");
    } catch (err) { alert("失敗"); }
}

async function uploadExcel() {
    const file = document.getElementById('excelFile').files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
        const res = await fetch('/api/items/upload', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: formData
        });
        if (res.ok) { alert("上傳成功"); loadDashboardData(); }
    } catch (err) { console.error(err); }
}

function logout() {
    localStorage.clear();
    window.location.href = 'index.html';
}

window.switchZone = function(zone, btn) {
    currentZone = zone;
    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadShelvesFromServer();
};

window.toggleEditMode = function() {
    const role = localStorage.getItem('userRole');
    if (role !== 'admin') {
        alert("只有管理員可以編輯貨架佈局");
        return;
    }
    
    isEditMode = !isEditMode;
    const btn = document.getElementById('addShelfBtn');
    btn.style.backgroundColor = isEditMode ? "#e74c3c" : "#28a745";
    btn.innerHTML = isEditMode ? "編輯中 (點擊網格新增)" : "管理員：開啟編輯模式";
};

let pendingAssignment = { itemCode: null, shelfId: null };
async function handleGridDrop(e) {
    e.preventDefault();
    const action = e.dataTransfer.getData('action');
    const itemCode = e.dataTransfer.getData('itemCode');
    const shelfId = e.target.id; 
    if (action === 'assign-item' && e.target.classList.contains('shelf')) {
        openLevelModal(itemCode, shelfId);
        return;
    }

    const rect = document.getElementById('warehouse-grid').getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * 10) + 1;
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * 10) + 1;

    if (action === 'move-shelf') {
        const moveShelfId = e.dataTransfer.getData('shelfId');
        await updateShelfPosition(moveShelfId, x, y);
    } else if (action === 'create-shelf') {
        await createNewShelf(x, y);
    }
}
function openLevelModal(itemCode, shelfId) {
    pendingAssignment = { itemCode, shelfId };
    const itemSpan = document.getElementById('targetItem');
    const shelfSpan = document.getElementById('targetShelf');
    if(itemSpan) itemSpan.innerText = itemCode;
    if(shelfSpan) shelfSpan.innerText = shelfId;
    const modal = document.getElementById('levelModal');
    modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('levelModal');
    modal.style.display = 'none';
}

function closeModal() {
    document.getElementById('levelModal').style.display = 'none';
}
async function confirmAssign(level) {
    const { itemCode, shelfId } = pendingAssignment;
    const token = localStorage.getItem('token');
    
    try {
        const response = await fetch('/api/items/assign', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                codeNumber: itemCode,
                location: `${shelfId}-L${level}`, 
                status: '在庫'
            })
        });

        if (response.ok) {
            alert(`貨品 ${itemCode} 已成功放入 ${shelfId} 第 ${level} 層`);
            closeModal();
            loadDashboardData(); 
        } else {
            alert("更新失敗");
        }
    } catch (err) {
        console.error("Assign 失敗:", err);
    }
}





let currentMgmtZone = 'Main';
window.switchLocationZone = async function(zone, btn) {
    currentMgmtZone = zone;
    document.querySelectorAll('#location-mgmt-section .zone-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderLocationMgmtTable();
};
window.renderLocationMgmtTable = async function() {
    const tbody = document.getElementById('locationMgmtTableBody');
    const mgmtGrid = document.getElementById('mgmt-map-grid');
    if (!tbody || !mgmtGrid) return;
    const token = localStorage.getItem('token');
    try {
        const shelfRes = await fetch(`/api/warehouse/${currentMgmtZone}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const shelves = await shelfRes.json();
        const shelfIds = shelves.map(s => s.shelfId);
        mgmtGrid.innerHTML = ''; 
        shelves.forEach(s => {
            const div = document.createElement('div');
            div.className = 'shelf';
            div.id = `mgmt-${s.shelfId}`; 
            div.innerText = s.shelfId;
            div.style.gridColumn = s.x;
            div.style.gridRow = s.y;
            div.onclick = function() {
                console.log("點擊了貨架:", s.shelfId);
                openShelfElevation(s.shelfId); 
            };
            div.style.cursor = 'pointer';

            mgmtGrid.appendChild(div);
        });

        const filteredItems = allItems.filter(item => {
            const loc = item.storageLocation || item.location; 
            if (!loc) return false;
            const shelfId = loc.split('-L')[0]; 
            return shelfIds.includes(shelfId);
        });
        if (filteredItems.length === 0) {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center; padding:20px;">此分區暫無已上架貨品</td></tr>`;
        } else {
            tbody.innerHTML = filteredItems.map(item => {
                const loc = item.storageLocation || item.location;
                const shelfId = loc.split('-L')[0];
                
                return `
                <tr onclick="highlightShelf('${shelfId}')" style="cursor:pointer; border-bottom: 1px solid #eee;">
                    <td style="padding: 12px;">${item.codeNumber}</td>
                    <td style="padding: 12px;">${item.name}</td>
                    <td style="padding: 12px;"><span class="badge-blue">${loc}</span></td>
                    <td style="padding: 12px;">
                        <button onclick="event.stopPropagation(); unassignItem('${item.codeNumber}')" class="btn-sm-red">下架</button>
                    </td>
                </tr>
                `;
            }).join('');
        }
    } catch (err) {
        console.error("載入位置管理失敗:", err);
    }
};

window.openShelfElevation = function(shelfId) {
    activeShelfId = shelfId; 
    console.log("當前操作貨架:", activeShelfId);
    
    const title = document.getElementById('detailShelfTitle');
    if (title) title.innerText = `Shelf: ${shelfId} Managing`;
    
    renderLayers(shelfId);
    renderModalUnassignedList();

    const modal = document.getElementById('shelfDetailModal');
    if (modal) modal.style.display = 'flex';
};


function renderLayers(shelfId) {
    [1, 2, 3].forEach(L => {
        const container = document.getElementById(`items-L${L}`);
        if (container) {
            container.innerHTML = '';
            
            container.ondragover = (e) => window.handleDragOver(e); 
            container.ondragleave = (e) => window.handleDragLeave(e); 
            container.ondrop = (e) => window.handleBatchDrop(e, L); 
        }
    });

    const shelfItems = allItems
        .filter(item => (item.storageLocation || "").startsWith(`${shelfId}-L`))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    shelfItems.forEach(item => {
        const level = item.storageLocation.split('-L')[1];
        const container = document.getElementById(`items-L${level}`);
        if (container) {
            const box = document.createElement('div');
            box.className = 'item-box-3d';
            box.draggable = true;
            box.innerHTML = `<strong>${item.codeNumber}</strong><br><small>${item.name}</small>`;
            box.ondragstart = (e) => {
                e.dataTransfer.setData('itemCode', item.codeNumber);
                e.dataTransfer.setData('source', 'shelf');
                e.target.classList.add('dragging'); 
            };
            box.ondragend = (e) => {
                e.target.classList.remove('dragging');
                document.querySelectorAll('.placeholder').forEach(p => p.remove());
            };
            
            container.appendChild(box);
        }
    });
}

window.renderModalUnassignedList = function() {
    
    const listDiv = document.getElementById('modal-unassigned-list');
    if (!listDiv) return;
    const unassigned = allItems.filter(item => {
        const sLoc = String(item.storageLocation || "").trim();
        return sLoc === "" || sLoc === "undefined" || sLoc === "null" || sLoc === "--" || !sLoc.includes("-L");
    });

    if (unassigned.length === 0) {
        listDiv.innerHTML = '<div style="text-align:center; padding:20px; color:#999;">所有貨品已上架</div>';
        return;
    }

    listDiv.innerHTML = unassigned.map(item => `
        <div class="modal-item-card" 
             draggable="true" 
             ondragstart="handleModalDragStart(event, '${item.codeNumber}')"
             style="cursor: grab; border: 1px solid #ddd; padding: 12px; margin-bottom: 10px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05); position: relative;">
            
            <div style="position: absolute; top: 8px; right: 8px; background: #3498db; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: bold;">
                x${item.quantity || 0}
            </div>

            <div style="font-weight: bold; color: #2c3e50; margin-bottom: 4px;">${item.codeNumber}</div>
            <div style="font-size: 0.85rem; color: #555; width: 85%; line-height: 1.2;">${item.name}</div>
            
            <div style="margin-top: 8px; font-size: 10px; color: #e67e22; background: #fff3e0; padding: 2px 6px; border-radius: 4px; display: inline-block;">
                🎰 目的: ${item.shippingLocation || item.location || '未設定'}
            </div>
        </div>
    `).join('');
};

window.unassignItem = async function(codeNumber) {
    if (!confirm(`確定要將貨品 ${codeNumber} 從貨架下架嗎？`)) return;

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items/assign', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                codeNumber: codeNumber,
                location: "未出貨/換領處",
                status: '在庫'
            })
        });

        if (response.ok) {
            alert("已下架，貨品已回到待上架清單");
            await loadDashboardData(); 
            renderLocationMgmtTable(); 
        }
    } catch (err) {
        console.error(err);
    }
};

const originalShowSection = showSection;
showSection = function(sectionId) {
    originalShowSection(sectionId);
    if (sectionId === 'location-mgmt-section') {
        renderLocationMgmtTable();
    }
};



window.highlightShelf = function(shelfId) {
    document.querySelectorAll('#mgmt-map-grid .shelf').forEach(s => {
        s.classList.remove('highlight-red');
    });
    const target = document.getElementById(`mgmt-${shelfId}`);
    if (target) {
        target.classList.add('highlight-red');
        target.style.transform = "scale(1.2)";
        setTimeout(() => target.style.transform = "scale(1)", 300);
    } else {
        console.warn("在地圖上找不到貨架 ID:", shelfId);
    }
};
window.handleModalDragStart = function(e, itemCode) {
    // e.dataTransfer.clearData();
    // e.dataTransfer.setData('itemCode', itemCode);
    // e.dataTransfer.effectAllowed = "move";
    // e.target.style.opacity = '0.4';
    e.dataTransfer.setData('itemCode', itemCode);
    e.target.classList.add('dragging');
};

window.handleDragOver = function(e) {
    e.preventDefault();
    const container = e.currentTarget;
    container.classList.add('drag-over');

    let placeholder = container.querySelector('.placeholder');
    if (!placeholder) {
        placeholder = document.createElement('div');
        placeholder.className = 'placeholder';
    }
    const afterElement = getDragAfterElement(container, e.clientX);
    const dragging = document.querySelector('.dragging');

    if (afterElement == null) {
        container.appendChild(placeholder);
    } else {
        container.insertBefore(placeholder, afterElement);
    }
};

function getDragAfterElement(container, x) {
    const draggableElements = [...container.querySelectorAll('.item-box-3d:not(.dragging)')];

    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = x - box.left - box.width / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

window.allowDrop = function(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
};

window.handleDragLeave = function(e) {
    e.currentTarget.classList.remove('drag-over');
};

window.handleBatchDrop = async function(e, level) {
    e.preventDefault();
    const itemCode = e.dataTransfer.getData('itemCode');
    const container = document.getElementById(`items-L${level}`);
    const placeholder = container.querySelector('.placeholder');
    if (placeholder) placeholder.remove();
    container.classList.remove('drag-over');
    
    const dragging = document.querySelector('.dragging');
    if (dragging) dragging.classList.remove('dragging');
    const children = Array.from(container.children);
    let insertIndex = children.length;

    for (let i = 0; i < children.length; i++) {
        const rect = children[i].getBoundingClientRect();
        if (e.clientX < rect.left + rect.width / 2) {
            insertIndex = i;
            break;
        }
    }

    const newLocation = `${activeShelfId}-L${level}`;
    const token = localStorage.getItem('token');

    try {
        const response = await fetch('/api/items/assign', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ 
                codeNumber: itemCode, 
                storageLocation: newLocation,
                sortOrder: insertIndex,
                status: '在庫' 
            })
        });

        if (response.ok) {
            await loadDashboardData();
            renderLayers(activeShelfId); 
        }
    } catch (err) {
        console.error("排序更新失敗:", err);
    }
};

window.closeShelfModal = function() {
    document.getElementById('shelfDetailModal').style.display = 'none';
    activeShelfId = null;
};


// ==============================moveing shelfitem==============================
const unassignedContainer = document.getElementById('modal-unassigned-list');
if (unassignedContainer) {
    unassignedContainer.ondragover = (e) => e.preventDefault();
    unassignedContainer.ondrop = async (e) => {
        e.preventDefault();
        const itemCode = e.dataTransfer.getData('itemCode');
        const source = e.dataTransfer.getData('source');

        if (source === 'shelf' && itemCode) {
            await unassignItemFromShelf(itemCode);
        }
    };
}

async function unassignItemFromShelf(itemCode) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items/assign', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ 
                codeNumber: itemCode, 
                storageLocation: "", 
                status: '待入架'     
            })
        });

        if (response.ok) {
            const idx = allItems.findIndex(i => i.codeNumber === itemCode);
            if (idx !== -1) {
                allItems[idx].storageLocation = "";
                allItems[idx].status = '待入架';
            }
            
            renderLayers(activeShelfId);      
            renderModalUnassignedList();      
            if (typeof filterAndRenderTable === 'function') filterAndRenderTable(); 
            
            console.log(`${itemCode} 已成功下架`);
        } else {
            const errorData = await response.json();
            alert("下架失敗: " + errorData.message);
        }
    } catch (err) {
        console.error("下架過程出錯:", err);
    }
}

window.generateStocktakeList = function() {
    const zone = document.getElementById('stocktake-zone-select').value;
    const tbody = document.getElementById('stocktake-list-body');
    
    const items = allItems.filter(item => {
        const loc = item.storageLocation || "";
        return loc.startsWith('S'); 
    }).sort((a, b) => a.storageLocation.localeCompare(b.storageLocation));

    tbody.innerHTML = items.map(item => `
        <tr data-code="${item.codeNumber}">
            <td><span class="badge-blue">${item.storageLocation}</span></td>
            <td><strong>${item.codeNumber}</strong><br><small>${item.name}</small></td>
            <td>${item.quantity}</td>
            <td>
                <input type="number" class="stock-input" 
                       value="${item.quantity}" 
                       oninput="calculateDiff(this, ${item.quantity})">
            </td>
            <td class="diff-cell">0</td>
        </tr>
    `).join('');
};

window.calculateDiff = function(input, original) {
    const diffCell = input.parentElement.nextElementSibling;
    const diff = parseInt(input.value) - original;
    diffCell.innerText = diff;
    diffCell.style.color = diff === 0 ? "#2ecc71" : "#e74c3c";
};

window.submitStocktake = async function() {
    if(!confirm("確定要按實盤數量更新庫存嗎？這將直接改動資料庫。")) return;
    
    const rows = document.querySelectorAll('#stocktake-list-body tr');
    const updates = Array.from(rows).map(row => ({
        codeNumber: row.dataset.code,
        newQuantity: parseInt(row.querySelector('.stock-input').value)
    }));

    try {
        const res = await fetch('/api/items/stocktake-batch', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ updates })
        });

        if (res.ok) {
            alert("盤點更新成功！");
            loadDashboardData(); 
        }
    } catch (err) { console.error(err); }
};


document.getElementById('stocktake-barcode-input')?.addEventListener('keypress', function (e) {
const barcodeInput = document.getElementById('stocktake-barcode-input');
if (barcodeInput) {
    barcodeInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
            e.preventDefault(); 
            const code = this.value.trim();
            if (code) {
                window.openStocktakePop(code);
                this.value = ''; 
            }
        }
    });
}
});
window.openStocktakePop = function(code) {
    const cleanCode = code.trim().toUpperCase(); 
    const item = allItems.find(i => i.codeNumber.trim().toUpperCase() === cleanCode);
    
    if (!item) {
        alert(`找不到此貨品編號：${cleanCode}`);
        return;
    }
    document.getElementById('pop-item-name').innerText = item.name;
    document.getElementById('pop-item-code').innerText = item.codeNumber;
    document.getElementById('pop-system-qty').innerText = item.quantity;
    document.getElementById('pop-incremental-qty').style.display = 'none';
    document.getElementById('pop-incremental-qty').value = ''; 
    document.getElementById('pop-add-btn').style.background = '#3498db'; 

    const actualInput = document.getElementById('pop-actual-qty');
    actualInput.value = item.quantity;
    actualInput.readOnly = false;
    updatePopDiff();

    document.getElementById('stocktake-pop-box').style.display = 'flex';
    setTimeout(() => {
        actualInput.focus();
        actualInput.select();
    }, 100);
};

function updatePopDiff() {
    const systemQty = parseInt(document.getElementById('pop-system-qty').innerText) || 0;
    const actualQty = parseInt(document.getElementById('pop-actual-qty').value) || 0;
    const diff = actualQty - systemQty;
    
    const diffDisplay = document.getElementById('pop-diff-display');
    diffDisplay.innerText = diff > 0 ? `+${diff}` : diff;
    diffDisplay.style.color = diff === 0 ? "#2ecc71" : (diff > 0 ? "#3498db" : "#e74c3c");
}

window.toggleAddMode = function() {
    const incrementalInput = document.getElementById('pop-incremental-qty');
    const actualInput = document.getElementById('pop-actual-qty');
    const addBtn = document.getElementById('pop-add-btn');
    const isOpening = incrementalInput.style.display === 'none';
    
    if (isOpening) {
        incrementalInput.style.display = 'block'; 
        addBtn.style.background = '#2ecc71'; 
        actualInput.readOnly = true; 
        actualInput.style.background = '#f1f1f1'; 

        setTimeout(() => {
            incrementalInput.focus();
            incrementalInput.select();
        }, 50);
    } else {
        incrementalInput.style.display = 'none';
        incrementalInput.value = ''; 
        addBtn.style.background = '#3498db'; 
        actualInput.readOnly = false; 
        actualInput.style.background = 'white'; 
        // actualInput.value = document.getElementById('pop-system-qty').innerText;
        // updatePopDiff();
    }
};

window.calculateIncremental = function() {
    const incrementalInput = document.getElementById('pop-incremental-qty');
    const actualInput = document.getElementById('pop-actual-qty');
    const systemQty = parseInt(document.getElementById('pop-system-qty').innerText) || 0;
    const addValue = parseInt(incrementalInput.value);
    
    if (isNaN(addValue)) {
        actualInput.value = systemQty;
    } else {
        actualInput.value = systemQty + addValue;
    }
    updatePopDiff();
};
window.confirmPopStocktake = async function() {
    const code = document.getElementById('pop-item-code').innerText;
    const newQty = parseInt(document.getElementById('pop-actual-qty').value);
    
    if (isNaN(newQty)) { alert('請輸入有效數量'); return; }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items/stocktake-single', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
            body: JSON.stringify({ codeNumber: code, quantity: newQty })
        });

        if (response.ok) {
            const idx = allItems.findIndex(i => i.codeNumber === code);
            if (idx !== -1) allItems[idx].quantity = newQty;
            filterAndRenderTable(); 
            if (typeof generateStocktakeList === 'function') generateStocktakeList(); 
            closePopBox();
            console.log(`✅ ${code} 盤點完成，數量更新為：${newQty}`);
        }
    } catch (err) { console.error(err); }
};


window.closePopBox = function() {
    document.getElementById('stocktake-pop-box').style.display = 'none';
};
window.confirmPopStocktake = async function() {
    const code = document.getElementById('pop-item-code').innerText;
    const newQty = parseInt(document.getElementById('pop-actual-qty').value);
    
    if (isNaN(newQty)) {
        alert('請輸入有效數量');
        return;
    }

    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items/stocktake-single', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                codeNumber: code, 
                quantity: newQty 
            })
        });

        if (response.ok) {
            const idx = allItems.findIndex(i => i.codeNumber === code);
            if (idx !== -1) allItems[idx].quantity = newQty;        
            if (typeof generateStocktakeList === 'function') generateStocktakeList();           
            closePopBox();
            console.log(`${code} 盤點完成，新數量：${newQty}`);
        }
    } catch (err) {
        console.error("盤點更新失敗:", err);
    }
};

async function checkStocktakeAccess() {
    const role = localStorage.getItem('userRole');
    const res = await fetch('/api/items/settings/stocktake-status');
    const { stocktakeEnabled } = await res.json();
    if (role === 'admin') {
        document.getElementById('admin-stocktake-control').style.display = 'block';
        document.getElementById('stocktake-toggle-input').checked = stocktakeEnabled;
        updateStocktakeStatusUI(stocktakeEnabled);
    }
    const stocktakeTab = document.querySelector('li[onclick*="stocktake-section"]');
    if (!stocktakeEnabled) {
        if (role !== 'admin') {
            if (stocktakeTab) stocktakeTab.style.opacity = '0.5'; 
            if (localStorage.getItem('lastSection') === 'stocktake-section') {
                showSection('dashboard-section');
                alert('目前盤點功能暫未開放，請聯繫管理員。');
            }
        }
    } else {
        if (stocktakeTab) stocktakeTab.style.opacity = '1';
    }
}
window.toggleStocktakePermission = async function(isEnabled) {
    const token = localStorage.getItem('token');
    try {
        const res = await fetch('/api/items/settings/toggle-stocktake', {
            method: 'PUT',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ enabled: isEnabled })
        });

        if (res.ok) {
            updateStocktakeStatusUI(isEnabled);
            alert(`Stock Take已成功${isEnabled ? '開放' : '關閉'}`);
            checkStocktakeAccess();
        }
    } catch (err) {
        console.error("切換失敗:", err);
    }
};

function updateStocktakeStatusUI(isEnabled) {
    const text = document.getElementById('stocktake-status-text');
    if (text) {
        text.innerText = isEnabled ? '運作中 (Open)' : '已關閉 (Closed)';
        text.style.color = isEnabled ? '#2ecc71' : '#e74c3c';
    }
}
// ==========================================月結=====================================
document.addEventListener('DOMContentLoaded', () => {
    const monthPicker = document.getElementById('report-month-picker');
    if (monthPicker) {
        const now = new Date();
        const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        monthPicker.value = yearMonth;
    }
});
async function generateMonthlyReport() {
    renderMonthlyTable(allItems);
}

function renderMonthlyTable(data) {
    const tbody = document.getElementById('monthly-report-body');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">無貨品資料</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${item.codeNumber}</td>
            <td>${item.name}</td>
            <td>${item.quantity || 0}</td>
            <td>
                <input type="number" 
                       class="monthly-qty-input" 
                       value="${item.quantity || 0}" 
                       onfocus="this.select()" 
                       onchange="saveAndVisualFeedback(this, '${item.codeNumber}')">
            </td>
        </tr>
    `).join('');
}

async function updateMonthlyQty(codeNumber, qtyValue) {
    const token = localStorage.getItem('token');
    try {
        const response = await fetch('/api/items/update-monthly-qty', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                codeNumber: codeNumber, 
                quantity: qtyValue 
            })
        });
        
        if (!response.ok) throw new Error('網頁回報錯誤');
        const result = await response.json();
        console.log("儲存成功:", result);
    } catch (err) {
        console.error("更新出錯:", err);
    }
}


function exportMonthlyExcel() {
    alert("正在準備 Excel 檔案，請稍候...");
}

function filterMonthlyTable() {
    const searchTerm = document.getElementById('monthly-search-input').value.toUpperCase();
    const rows = document.querySelectorAll('#monthly-report-body tr');

    rows.forEach(row => {
const codeNumber = row.cells[0].textContent.toUpperCase();
        const name = row.cells[1].textContent.toUpperCase();
        const itemData = allItems.find(i => i.codeNumber === row.cells[0].textContent);
        const hasBarcodeMatch = itemData?.barcodes?.some(b => b.toUpperCase().includes(searchTerm));

        if (codeNumber.includes(searchTerm) || name.includes(searchTerm) || hasBarcodeMatch) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}

async function saveAndVisualFeedback(inputElement, codeNumber) {
    const originalColor = inputElement.style.borderColor;
    inputElement.style.borderColor = "#f39c12"; 
    
    await updateMonthlyQty(codeNumber, inputElement.value);
    
    inputElement.style.borderColor = "#2ecc71"; 
    setTimeout(() => {
        inputElement.style.borderColor = originalColor;
    }, 2000);
}

async function generateMonthlyReport() {
    const month = document.getElementById('report-month-picker').value;
    if (!month) {
        alert("請先選擇月份！");
        return;
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch('/api/items', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const items = await res.json();
        
        renderMonthlyTable(items);
    } catch (err) {
        console.error("生成月報表失敗:", err);
    }
}
function renderMonthlyTable(items) {
    const tbody = document.getElementById('monthly-report-body');
    if (!tbody) return;

    tbody.innerHTML = items.map(item => `
        <tr>
            <td>${item.codeNumber}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>
                <input type="number" 
                       class="monthly-qty-input" 
                       value="${item.monthlyQuantity || item.quantity}" 
                       oninput="calculateTotalPayout()"
                       onchange="saveAndVisualFeedback(this, '${item.codeNumber}')">
            </td>
        </tr>
    `).join('');
    calculateTotalPayout();
}

function filterMonthlyTable() {
    const searchTerm = document.getElementById('monthly-search-input').value.toUpperCase();
    const rows = document.querySelectorAll('#monthly-report-body tr');

    rows.forEach(row => {
        const codeText = row.cells[0].textContent.toUpperCase();
        const nameText = row.cells[1].textContent.toUpperCase();
        
        if (codeText.includes(searchTerm) || nameText.includes(searchTerm)) {
            row.style.display = "";
        } else {
            row.style.display = "none";
        }
    });
}
async function saveAndVisualFeedback(inputElement, codeNumber) {
    const originalColor = inputElement.style.borderColor;
    inputElement.style.borderColor = "#f39c12"; 

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`/api/items/update-monthly-qty`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                codeNumber, 
                quantity: inputElement.value 
            })
        });

        if (res.ok) {
            inputElement.style.borderColor = "#2ecc71"; 
            setTimeout(() => { inputElement.style.borderColor = originalColor; }, 2000);
        } else {
            throw new Error("儲存失敗");
        }
    } catch (err) {
        inputElement.style.borderColor = "#e74c3c"; 
        alert("更新失敗，請檢查網路連線");
    }
}


function exportMonthlyExcel() {
    const table = document.getElementById("monthly-report-table");
    const month = document.getElementById('report-month-picker').value || "Monthly-Report";
    
    let csv = [];
    const rows = table.querySelectorAll("tr");
    
    for (const row of rows) {
        const cols = row.querySelectorAll("td, th");
        const rowData = Array.from(cols).map(col => {
            const input = col.querySelector('input');
            return input ? input.value : col.innerText;
        });
        csv.push(rowData.join(","));
    }

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csv.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${month}.csv`);
    document.body.appendChild(link);
    link.click();
}

function calculateTotalPayout() {
    let totalPayout = 0;
    const locationMap = {}; 

    const rows = document.querySelectorAll('#monthly-report-body tr');

    rows.forEach(row => {
        const codeNumber = row.cells[0].innerText;
        const sysQty = parseFloat(row.cells[2].innerText) || 0;
        const monthlyInput = row.cells[3].querySelector('input');
        const monthlyQty = monthlyInput ? (parseFloat(monthlyInput.value) || 0) : 0;
        const itemData = allItems.find(i => i.codeNumber === codeNumber);
        const price = itemData && itemData.price ? itemData.price : 0;
        const loc = (itemData && itemData.shippingLocation) ? itemData.shippingLocation : "未分類";

        const variance = sysQty - monthlyQty;
        const payout = variance * price;

        totalPayout += payout;

        if (!locationMap[loc]) {
            locationMap[loc] = 0;
        }
        locationMap[loc] += payout;
    });


    const totalDisplay = document.getElementById('total-payout-value');
    if (totalDisplay) {
        totalDisplay.innerText = `$${totalPayout.toLocaleString(undefined, {minimumFractionDigits: 2})}`;
        totalDisplay.style.color = totalPayout > 0 ? "#e74c3c" : "#27ae60";
    }

    const locationList = document.getElementById('location-payout-list');
    if (locationList) {
        if (Object.keys(locationMap).length === 0) {
            locationList.innerHTML = "<p>No data</p>";
            return;
        }
        let listHtml = '<ul style="list-style: none; padding: 0; margin: 0;">';
        

        const sortedLocations = Object.entries(locationMap).sort((a, b) => b[1] - a[1]);

        for (const [locName, locAmount] of sortedLocations) {
            const color = locAmount > 0 ? "#e74c3c" : "#27ae60";
            listHtml += `
                <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed #eee;">
                    <span>${locName}:</span>
                    <span style="font-weight: bold; color: ${color};">$${locAmount.toFixed(2)}</span>
                </li>`;
        }
        listHtml += '</ul>';
        locationList.innerHTML = listHtml;
    }
}

async function handleMonthlyScanner(e) {
    if (e.key === 'Enter') {
        const barcode = e.target.value.trim();
        if (!barcode) return;

        console.log("掃描到條碼:", barcode);
        filterMonthlyTable();
        setTimeout(() => {
            const visibleRows = document.querySelectorAll('#monthly-report-body tr:not([style*="display: none"])');
            
            if (visibleRows.length > 0) {
                const qtyInput = visibleRows[0].querySelector('.monthly-qty-input');
                if (qtyInput) {
                    qtyInput.focus();
                    qtyInput.select(); 
                }
            } else {
                alert("找不到對應條碼的產品，請確認條碼是否正確。");
            }
        }, 100);
    }
}