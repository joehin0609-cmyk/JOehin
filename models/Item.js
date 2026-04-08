const mongoose = require('mongoose');


// const itemSchema = new mongoose.Schema({
//     codeNumber: { type: String, required: true, unique: true },
//     name: { type: String, required: true },
//     quantity: { type: Number, default: 0 },
    
//     storageLocation: { type: String, default: "" }, 
//     shippingLocation: { type: String, default: "" }, 
    
//     status: { type: String, default: "待出貨" },
//     remarks: String
// }, { timestamps: true });

// module.exports = mongoose.model('Item', itemSchema);
const itemSchema = new mongoose.Schema({
    codeNumber: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    quantity: { type: Number, default: 0 },
    storageLocation: { type: String, default: "" },
    shippingLocation: { type: String, default: "" },
    sortOrder: { type: Number, default: 0 },
    status: { type: String, default: "待出貨" },
    barcodes: { type: [String], default: [] }
}, { timestamps: true });

module.exports = mongoose.model('Item', itemSchema);