const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key');
            req.user = await User.findById(decoded.id).select('-password');
            next(); 
        } catch (error) {
            res.status(401).json({ message: 'Token 驗證失敗，請重新登入' });
        }
    }

    if (!token) {
        res.status(401).json({ message: '未提供 Token，權限不足' });
    }
};

const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({ message: '只有管理員 (Admin) 才能執行此操作' });
    }
};

module.exports = { protect, adminOnly };