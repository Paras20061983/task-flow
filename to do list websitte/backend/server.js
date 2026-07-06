const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const User = require('./models/User');
const Task = require('./models/Task');
const jwt = require('jsonwebtoken');

dotenv.config();
console.log('MONGODB_URI:', process.env.MONGODB_URI);
const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('✅ MongoDB connected'))
    .catch(err => console.log('❌ MongoDB error:', err));

const auth = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) return res.status(401).json({ error: 'Access denied' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('-password');
        if (!user) throw new Error();
        req.user = user;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// ========== AUTH ROUTES ==========

app.post('/api/signup', async (req, res) => {
    try {
        const { name, email, phone, password } = req.body;
        const existing = await User.findOne({ email });
        if (existing) return res.status(400).json({ error: 'Email already registered' });
        
        const user = new User({ 
            name, 
            email, 
            phone, 
            password,
            roles: ['general'], // 👈 default role (array)
            categories: ['Personal', 'Work', 'Health', 'Errands']
        });
        await user.save();
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({ 
            token, 
            user: { 
                id: user._id, 
                name, 
                email, 
                phone,
                roles: user.roles, // 👈 array of roles
                categories: user.categories
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });
        
        const isMatch = await user.comparePassword(password);
        if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
        
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.json({ 
            token, 
            user: { 
                id: user._id, 
                name: user.name, 
                email: user.email, 
                phone: user.phone,
                roles: user.roles || ['general'], // 👈 array of roles
                categories: user.categories || ['Personal', 'Work', 'Health', 'Errands']
            } 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== USER SETTINGS ROUTES ==========

// Get user profile
app.get('/api/user/profile', auth, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password');
        res.json({ 
            id: user._id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            roles: user.roles || ['general'], // 👈 array
            categories: user.categories || ['Personal', 'Work', 'Health', 'Errands']
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user roles (multi-select)
app.put('/api/user/roles', auth, async (req, res) => {
    try {
        const { roles } = req.body;
        if (!roles || !Array.isArray(roles) || roles.length === 0) {
            return res.status(400).json({ error: 'Roles must be a non-empty array' });
        }
        const validRoles = ['student', 'athlete', 'professional', 'parent', 'general'];
        const invalid = roles.filter(r => !validRoles.includes(r));
        if (invalid.length > 0) {
            return res.status(400).json({ error: 'Invalid roles: ' + invalid.join(', ') });
        }
        
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        user.roles = roles;
        await user.save();
        
        res.json({ 
            message: 'Roles updated successfully',
            roles: user.roles 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update user categories
app.put('/api/user/categories', auth, async (req, res) => {
    try {
        const { categories } = req.body;
        if (!categories || !Array.isArray(categories) || categories.length === 0) {
            return res.status(400).json({ error: 'Categories must be a non-empty array' });
        }
        if (categories.length > 10) {
            return res.status(400).json({ error: 'Maximum 10 categories allowed' });
        }
        
        const user = await User.findById(req.user._id);
        if (!user) return res.status(404).json({ error: 'User not found' });
        
        user.categories = categories;
        await user.save();
        
        res.json({ 
            message: 'Categories updated successfully',
            categories: user.categories 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ========== TASK ROUTES ==========

app.get('/api/tasks', auth, async (req, res) => {
    try {
        const tasks = await Task.find({ userId: req.user._id }).sort({ createdAt: -1 });
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/tasks', auth, async (req, res) => {
    try {
        const { text, due, category, energy } = req.body;
        const task = new Task({ 
            userId: req.user._id, 
            text, 
            due, 
            category: category || 'Personal', 
            energy: energy || 'medium' 
        });
        await task.save();
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        
        const { text, due, category, energy, completed } = req.body;
        if (text !== undefined) task.text = text;
        if (due !== undefined) task.due = due;
        if (category !== undefined) task.category = category;
        if (energy !== undefined) task.energy = energy;
        if (completed !== undefined) {
            task.completed = completed;
            // Track when task was completed (for consistency analytics)
            task.completedAt = completed ? new Date() : null;
        }
        await task.save();
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete('/api/tasks/:id', auth, async (req, res) => {
    try {
        const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        if (!task) return res.status(404).json({ error: 'Task not found' });
        res.json({ message: 'Task deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));