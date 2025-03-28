const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Product = require('../models/Product');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// Get all products
router.get('/', async (req, res) => {
    try {
        const { category, condition, minPrice, maxPrice } = req.query;
        let query = {};

        if (category) query.category = category;
        if (condition) query.condition = condition;
        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = Number(minPrice);
            if (maxPrice) query.price.$lte = Number(maxPrice);
        }

        const products = await Product.find(query).populate('seller', 'name email');
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Get single product
router.get('/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('seller', 'name email');
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Create product (protected route)
router.post('/', auth, upload.array('images', 5), async (req, res) => {
    try {
        const { name, category, price, condition, description } = req.body;
        const images = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const product = new Product({
            name,
            category,
            price,
            condition,
            description,
            images,
            seller: req.user.userId
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product (protected route)
router.put('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product (protected route)
router.delete('/:id', auth, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Not authorized' });
        }

        await product.remove();
        res.json({ message: 'Product removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

module.exports = router; 