const mongoose = require('mongoose');

const stockTakeSchema = new mongoose.Schema({
    date: { type: String, required: true },
    isActive: { type: Boolean, default: false }, 
    items: [{
        codeNumber: String,
        name: String,
        originalQuantity: { type: Number, default: 0 },
        countedQuantity: { type: Number, default: 0 },
        storageLocation: String
    }]
}, { timestamps: true });

module.exports = mongoose.model('StockTake', stockTakeSchema);