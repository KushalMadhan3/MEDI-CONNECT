/**
 * Store Controller
 * Handles Cart and Store operations
 */

import { getCart, updateCart, clearCart } from '../models/cartModel.js';
import { getDB } from '../config/mongodb.js';

/**
 * GET /api/store/cart
 */
export async function getUserCart(req, res) {
    try {
        const userId = req.user.userId; // user role can be patient
        const cart = await getCart(userId);
        res.json({ success: true, data: cart });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to get cart' });
    }
}

/**
 * POST /api/store/cart
 * Add/Update item in cart with stock validation
 * Body: { medicineId, quantity }
 */
export async function addToCart(req, res) {
    try {
        const userId = req.user.userId;
        const { medicineId, quantity } = req.body;

        if (!medicineId || quantity === undefined) {
            return res.status(400).json({ 
                success: false, 
                message: 'Medicine ID and quantity are required' 
            });
        }

        if (quantity < 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'Quantity cannot be negative' 
            });
        }

        const db = getDB();
        const medicine = await db.collection('medicines').findOne({ id: medicineId });

        if (!medicine) {
            return res.status(404).json({ success: false, message: 'Medicine not found' });
        }

        // Stock validation
        if (quantity > 0 && medicine.stock < quantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Only ${medicine.stock} units available in stock`,
                availableStock: medicine.stock
            });
        }

        let cart = await getCart(userId);
        let items = cart.items || [];
        const existingItemIndex = items.findIndex(i => i.medicineId === medicineId);

        if (existingItemIndex > -1) {
            if (quantity <= 0) {
                // Remove item
                items.splice(existingItemIndex, 1);
            } else {
                // Check stock for updated quantity
                if (medicine.stock < quantity) {
                    return res.status(400).json({ 
                        success: false, 
                        message: `Only ${medicine.stock} units available in stock`,
                        availableStock: medicine.stock
                    });
                }
                // Update qty
                items[existingItemIndex].quantity = quantity;
                items[existingItemIndex].price = medicine.price; // Update price if changed
                items[existingItemIndex].stock = medicine.stock; // Update stock info
            }
        } else if (quantity > 0) {
            items.push({
                medicineId: medicine.id,
                name: medicine.name,
                price: medicine.price,
                image: medicine.image,
                category: medicine.category,
                quantity,
                stock: medicine.stock // Include stock for frontend validation
            });
        }

        const updatedCart = await updateCart(userId, items);
        res.json({ success: true, data: updatedCart });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to update cart' });
    }
}

/**
 * DELETE /api/store/cart/:itemId
 */
export async function removeFromCart(req, res) {
    try {
        const userId = req.user.userId;
        const { itemId } = req.params;

        let cart = await getCart(userId);
        let items = cart.items || [];
        items = items.filter(i => i.medicineId !== itemId);

        const updatedCart = await updateCart(userId, items);
        res.json({ success: true, data: updatedCart });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ success: false, message: 'Failed to remove item' });
    }
}
