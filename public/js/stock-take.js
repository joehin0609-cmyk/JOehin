const searchInput = document.getElementById('st-search');
if (searchInput) {
    searchInput.addEventListener('keypress', async function (e) {
        if (e.key === 'Enter') {
            const barcode = this.value.trim();
            if (!barcode) return;

            try {

                const res = await fetch(`/api/items/barcode/${barcode}`);
                if (res.ok) {
                    const item = await res.json();
                    window.openCountModal(item.codeNumber, 0); 
                } else {
                    alert("找不到此條碼對應的貨品");
                }
            } catch (err) {
                console.error("掃描處理出錯:", err);
            }
            this.value = ''; 
        }
    });
}

async function handleToggleStockTake() {
    const dateInput = document.getElementById('st-date-input');
    const date = dateInput ? dateInput.value : null;

    if (!date) {
        alert("請選擇盤點日期！");
        return;
    }

    if (!confirm(`確定要開啟 ${date} 的盤點嗎？這將會抓取目前所有貨品數據作為基準。`)) return;

    try {
        const res = await fetch('/api/stocktake/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date })
        });

        const result = await res.json();
        if (res.ok) {
            alert("成功: " + result.message);
            location.reload(); 
        } else {
            alert("錯誤: " + result.message);
        }
    } catch (err) {
        console.error(err);
        alert("無法連線至伺服器");
    }
}

async function initStockTakePage() {
    console.log("開始初始化盤點頁面...");
    const role = localStorage.getItem('userRole');
    const adminBox = document.getElementById('admin-controls');
    const staffLocked = document.getElementById('staff-locked');
    const mainDash = document.getElementById('stock-take-main');
    const statusText = document.getElementById('st-status-text');
    const dateDisplay = document.getElementById('display-st-date');

    if (role === 'admin' && adminBox) {
        adminBox.style.display = 'block';
    }

    try {
        const res = await fetch('/api/stocktake/status');
        const status = await res.json();
        console.log("後端狀態:", status);

        if (statusText) statusText.innerText = `Status ${status.isActive ? '開放中' : '已關閉'}`;

        if (status.isActive) {
            if (staffLocked) staffLocked.style.display = 'none';
            if (mainDash) mainDash.style.display = 'block';
            if (dateDisplay) dateDisplay.innerText = status.date || "未定日期";
            if (status.stockTakeId) {
                fetchAndRenderItems(status.stockTakeId);
            }
        } else {
            if (mainDash) mainDash.style.display = 'none';
            if (role !== 'admin' && staffLocked) {
                staffLocked.style.display = 'block';
            }
        }
    } catch (err) {
        console.error("初始化失敗:", err);
    }
}


async function fetchAndRenderItems(stockTakeId) {
    console.log("Catching, ID:", stockTakeId);
    try {
        const res = await fetch(`/api/stocktake/status`); 
        const data = await res.json();
        renderStockList(data.items || []); 
    } catch (err) {
        console.error("Render failed:", err);
    }
}

function renderStockList(items) {
    const grid = document.getElementById('stock-item-grid');
    if (!grid) return;

    if (items.length === 0) {
        grid.innerHTML = '<p style="color: #999;">目前沒有貨品快照。</p>';
        return;
    }

    grid.innerHTML = items.map(item => `
        <div class="stock-item-card" style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #eee; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
            <div style="font-weight: bold; color: #333;">${item.codeNumber}</div>
            <div style="font-size: 0.9rem; color: #666; margin: 5px 0;">${item.name}</div>
            <div style="font-size: 0.8rem; color: #888;">位置: ${item.storageLocation || '未入架'}</div>
            <div style="margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 0.85rem;">已點: <b style="color: #007bff;">${item.countedQuantity}</b></span>
                <button onclick="window.openCountModal('${item.codeNumber}', ${item.countedQuantity})" 
                        style="background: #007bff; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer;">
                    清點
                </button>
            </div>
        </div>
    `).join('');
}
function filterStockList() {
    const term = document.getElementById('st-search').value.toLowerCase();
    const cards = document.querySelectorAll('.stock-item-card');
    
    cards.forEach(card => {
        const text = card.innerText.toLowerCase();
        card.style.display = text.includes(term) ? 'block' : 'none';
    });
}
window.openCountModal = function(codeNumber, currentQty) {
    const newQty = prompt(`請輸入 [${codeNumber}] 的清點數量:`, currentQty);
    if (newQty !== null) {
        alert(`準備更新 ${codeNumber} 數量為: ${newQty}`);
    }
};

document.addEventListener('DOMContentLoaded', initStockTakePage);