const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const UserSchema = new mongoose.Schema({
  loginName: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String,default: "" },
  role: { type: String, enum: ['admin', 'staff'], default: 'staff' },
  permissions: {
    canEditMap: { type: Boolean, default: false }
  }
}, { timestamps: true });

UserSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);