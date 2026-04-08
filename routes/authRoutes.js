const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.post('/login', async (req, res) => {
  const { loginName, password } = req.body;
//here is for me to gen teh token so 
  try {
    const user = await User.findOne({ loginName });
    if (user && (await user.matchPassword(password))) {
      const token = jwt.sign(
        { id: user._id, role: user.role },
        process.env.JWT_SECRET || 'your_secret_key',
        { expiresIn: '1d' }
      );

      res.json({
        _id: user._id,
        username: user.username,
        role: user.role,
        token: token
      });
    } else {
      res.status(401).json({ message: '帳號或密碼錯誤' });
    }
  } catch (error) {
    res.status(500).json({ message: '伺服器錯誤' });
  }
});
router.post('/register', protect, adminOnly, async (req, res) => {
  try {
    const { loginName, username, password, phone, role } = req.body;
    if (!loginName || !username || !password) {
      return res.status(400).json({ message: '請填寫所有必填欄位' });
    }

    const userExists = await User.findOne({ loginName });
    if (userExists) {
      return res.status(400).json({ message: '此登入名稱已被使用' });
    }

    const user = new User({
      loginName,
      username,
      password,
      phone: phone || "", 
      role: role || 'staff'
    });

    await user.save(); 

    res.status(201).json({ message: "註冊成功！" });
  } catch (error) {
    console.error("註冊錯誤詳情:", error); 
    res.status(500).json({ message: '伺服器錯誤', error: error.message });
  }
});

router.put('/update-profile', protect, async (req, res) => {
    try {
        const { loginName, oldPassword, username, password } = req.body;
        const user = await User.findOne({ loginName });
        if (!user) return res.status(404).json({ message: "找不到用戶" });
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "舊密碼錯誤，身份驗證失敗" });
        }
        if (username) user.username = username;
        
        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({ message: "個人資料更新成功" });

    } catch (err) {
        res.status(500).json({ message: "伺服器錯誤: " + err.message });
    }
});
module.exports = router;