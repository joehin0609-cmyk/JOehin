// routes/stockTakeRoutes.js
const express = require('express');
const router = express.Router();
const StockTake = require('../models/StockTake');
const Item = require('../models/Item');

// 獲取當前狀態
router.get('/status', async (req, res) => {
    try {
        const latest = await StockTake.findOne().sort({ createdAt: -1 });
        res.json({
            isActive: latest ? latest.isActive : false,
            date: latest ? latest.date : null,
            role: 'admin' // 測試期間先固定為 admin
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 管理員開啟新盤點
router.post('/start', async (req, res) => {
    try {
        const { date } = req.body;
        if (!date) return res.status(400).json({ message: "請選擇日期" });

        // 1. 抓取所有現有貨品
        const allItems = await Item.find({});
        
        // 2. 建立盤點快照
        const snapshot = allItems.map(item => ({
            codeNumber: item.codeNumber,
            name: item.name,
            originalQuantity: item.quantity || 0,
            countedQuantity: 0, // 初始清點數為 0
            storageLocation: item.storageLocation || "未入架"
        }));

        // 3. 儲存新紀錄
        const newStockTake = new StockTake({
            date,
            isActive: true,
            items: snapshot
        });

        await newStockTake.save();
        res.json({ message: "Stock Take已成功開啟！", data: newStockTake });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;