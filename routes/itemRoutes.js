const express = require('express');
const router = express.Router();
const multer = require('multer');
const xlsx = require('xlsx');
const Item = require('../models/Item');
const { protect } = require('../middleware/authMiddleware');
const upload = multer({ dest: 'uploads/' });
const admin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: '權限不足，僅限管理員操作' });
    }
};
let systemSettings = { stocktakeEnabled: false };
router.post('/upload', protect, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ message: '請選擇檔案' });
        const workbook = xlsx.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const itemsToSave = sheetData.map(row => ({
            codeNumber: row['codeNumber'],
            name: row['產品名稱'],
            quantity: row['數量'],
            location: row['出貨位置'] == '0' ? '未出貨/換領處' : row['出貨位置'],
            price: row['價錢'],
            status: row['出貨位置'] == '0' ? '在庫' : '已出貨'
        }));
        await Item.insertMany(itemsToSave);

        res.json({ message: `成功匯入 ${itemsToSave.length} 件貨品` });
    } catch (error) {
        res.status(500).json({ message: 'Excel 解析失敗', error: error.message });
    }
});

router.get('/', protect, async (req, res) => {
    try {
        const items = await Item.find();
        const mappedItems = items.map(item => {
            const doc = item._doc; 
            return {
                ...doc,
                shippingLocation: doc.shippingLocation || doc.location || "未設定",
                storageLocation: doc.storageLocation || "未入架"
            };
        });

        res.json(mappedItems);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.put('/update-monthly-qty', protect, async (req, res) => {
    try {
        const { codeNumber, quantity } = req.body;
        if (quantity === undefined || isNaN(parseInt(quantity))) {
            return res.status(400).json({ message: "無效的數量數據" });
        }
        const item = await Item.findOneAndUpdate(
            { codeNumber: codeNumber },
            { $set: { quantity: Number(quantity) } }, 
            { 
                new: true, 
                runValidators: true 
            }
        );

        if (!item) {
            return res.status(404).json({ message: "找不到該產品編號" });
        }

        console.log(`[月報表更新] 產品 ${codeNumber} 數量已改為 ${quantity}`);
        res.json({ message: "更新成功", item });
    } catch (err) {
        console.error("月報表更新出錯:", err);
        res.status(500).json({ message: "伺服器錯誤", error: err.message });
    }
});
async function renormalizeSortOrder(location) {
    if (!location) return;
    const items = await Item.find({ storageLocation: location }).sort({ sortOrder: 1 });
    for (let i = 0; i < items.length; i++) {
        items[i].sortOrder = i;
        await items[i].save();
    }
}
router.post('/:codeNumber/barcode', async (req, res) => {
    try {
        const { barcode } = req.body;
        const item = await Item.findOneAndUpdate(
            { codeNumber: req.params.codeNumber },
            { $addToSet: { barcodes: barcode } }, 
            { new: true }
        );
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 刪除條碼
router.delete('/:codeNumber/barcode/:barcode', async (req, res) => {
    try {
        const item = await Item.findOneAndUpdate(
            { codeNumber: req.params.codeNumber },
            { $pull: { barcodes: req.params.barcode } }, 
            { new: true }
        );
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/barcode/:barcode', protect, async (req, res) => {
    try {
        const item = await Item.findOne({ barcodes: req.params.barcode });
        if (!item) return res.status(404).json({ message: "找不到此條碼對應的貨品" });
        res.json(item);
    } catch (err) {
        res.status(500).json({ message: "伺服器錯誤" });
    }
});

router.post('/stocktake-batch', protect, async (req, res) => {
    const { updates } = req.body; 

    try {
        const operations = updates.map(update => ({
            updateOne: {
                filter: { codeNumber: update.codeNumber },
                update: { $set: { quantity: update.newQuantity } }
            }
        }));

        await Item.bulkWrite(operations);
        res.json({ message: "批次更新成功" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});
router.get('/settings/stocktake-status', (req, res) => {
    res.json(systemSettings);
});

router.put('/settings/toggle-stocktake', protect, admin, (req, res) => {
    const { enabled } = req.body;
    systemSettings.stocktakeEnabled = enabled;
    res.json({ message: `盤點功能已${enabled ? '開啟' : '關閉'}`, status: enabled });
});



router.put('/stocktake-single', protect, async (req, res) => {
    if (!systemSettings.stocktakeEnabled && req.user.role !== 'admin') {
        return res.status(403).json({ message: "目前非盤點時段，禁止提交數據。" });
    }

    try {
        const { codeNumber, quantity } = req.body;
        if (quantity === undefined || isNaN(parseInt(quantity))) {
            return res.status(400).json({ message: "無效的數量數據" });
        }
        const item = await Item.findOneAndUpdate(
            { codeNumber: codeNumber },
            { $set: { quantity: Number(quantity) } }, 
            { 
                returnDocument: 'after', 
                runValidators: true      
            }
        );
        
        if (!item) {
            return res.status(404).json({ message: "找不到該codeNumber" });
        }
        res.json(item);
    } catch (err) {
        console.error("更新失敗詳情:", err);
        res.status(500).json({ message: "伺服器更新失敗", error: err.message });
    }
});
module.exports = router;