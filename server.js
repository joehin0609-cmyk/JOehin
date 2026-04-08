// const express = require('express');
// const connectDB = require('./db');
// const authRoutes = require('./routes/authRoutes');
// const itemRoutes = require('./routes/itemRoutes');
// const warehouseRoutes = require('./routes/warehouseRoutes'); 
// const stockTakeRoutes = require('./routes/stockTakeRoutes');
// const app = express();
// app.use(express.static('public'));
// app.use(express.json());
// app.use('/api/auth', authRoutes);
// app.use('/api/items', itemRoutes);
// app.use('/api/warehouse', warehouseRoutes); 
// app.use('/api/stocktake', stockTakeRoutes);
// connectDB();
// const PORT = process.env.PORT || 3002;
// app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

const express = require('express');
const connectDB = require('./db');
const dotenv = require('dotenv'); 
const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes'); 
const warehouseRoutes = require('./routes/warehouseRoutes');
const stockTakeRoutes = require('./routes/stockTakeRoutes');
dotenv.config();
const app = express();
connectDB();
app.use(express.static('public'));
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/stocktake', stockTakeRoutes);
app.use((req, res) => {
    res.status(404).json({ message: "找不到該 API 路徑" });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));