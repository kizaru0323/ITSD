const express = require('express');
const router = express.Router();
const { Office } = require('../models');
const authenticate = require('../middleware/auth');

// GET all offices
router.get('/', authenticate, async (req, res) => {
    try {
        const offices = await Office.findAll({ order: [['name', 'ASC']] });
        res.json(offices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST new office
router.post('/', authenticate, async (req, res) => {
    // Basic admin check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    try {
        const { name, type } = req.body;
        if (!name) return res.status(400).json({ error: 'Name is required' });
        const office = await Office.create({ name, type: type || 'INTERNAL' });
        res.status(201).json(office);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE office
router.delete('/:id', authenticate, async (req, res) => {
    // Basic admin check
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Admin access required' });
    }
    try {
        const { id } = req.params;
        await Office.destroy({ where: { id } });
        res.json({ message: 'Office deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;

module.exports = router;
