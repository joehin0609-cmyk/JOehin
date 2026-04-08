const express = require('express');
const router = express.Router();
const Shelf = require('../models/Shelf');
const { protect, adminOnly } = require('../middleware/authMiddleware');
router.get('/:zone', protect, async (req, res) => {
    try {
        const shelves = await Shelf.find({ zone: req.params.zone });
        res.json(shelves);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/add', protect, adminOnly, async (req, res) => {
    try {
        const { shelfId, x, y, zone } = req.body;
        const newShelf = new Shelf({ shelfId, x, y, zone });
        await newShelf.save();
        res.status(201).json(newShelf);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});
router.put('/update/:shelfId', protect, adminOnly, async (req, res) => {
    try {
        const { x, y } = req.body;
        const updatedShelf = await Shelf.findOneAndUpdate(
            { shelfId: req.params.shelfId },
            { x, y },
            { new: true } 
        );

        if (!updatedShelf) {
            return res.status(404).json({ message: '找不到該貨架' });
        }

        res.json({ message: '位置更新成功', data: updatedShelf });
    } catch (err) {
        res.status(500).json({ message: '伺服器錯誤', error: err.message });
    }
});
router.get('/check-zone/:shelfId', protect, async (req, res) => {
    try {
        const shelf = await Shelf.findOne({ shelfId: req.params.shelfId });
        if (!shelf) return res.status(404).json({ message: "找不到貨架" });
        res.json({ zone: shelf.zone });
    } catch (err) {
        res.status(500).json({ message: "伺服器錯誤" });
    }
});

router.delete('/delete/:shelfId', protect, adminOnly, async (req, res) => {
    try {
        const { shelfId } = req.params;
        const deletedShelf = await Shelf.findOneAndDelete({ shelfId });

        if (!deletedShelf) {
            return res.status(404).json({ message: '找不到該貨架' });
        }

        const Item = require('../models/Item');
        await Item.updateMany(
            { storageLocation: { $regex: `^${shelfId}` } }, 
            { $set: { storageLocation: "" } }
        );

        res.json({ message: `貨架 ${shelfId} 已刪除，相關產品位置已清空。` });
    } catch (err) {
        res.status(500).json({ message: '刪除失敗', error: err.message });
    }
});



module.exports = router;