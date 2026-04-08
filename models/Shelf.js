const mongoose = require('mongoose');

const ShelfSchema = new mongoose.Schema({
    shelfId: { type: String, required: true, unique: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    zone: { type: String, required: true, enum: ['Main', 'Sub', 'Buffer'] },
    items: [{
        item: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' }, 
        level: Number,
        quantity: Number
    }]
});

module.exports = mongoose.model('Shelf', ShelfSchema);