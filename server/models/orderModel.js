/**
 * Order Model
 * Stores order information
 */

import { getDB } from '../config/mongodb.js';

/**
 * Get orders collection
 */
export function getOrdersCollection() {
    const db = getDB();
    return db.collection('orders');
}

/**
 * Create a new order
 * @param {Object} orderData - Order data
 * @returns {Promise<Object>} Created order
 */
export async function createOrder(orderData) {
    const collection = getOrdersCollection();
    const order = {
        id: `ord_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: orderData.userId,
        userName: orderData.userName,
        items: orderData.items, // Array of { medicineId, name, quantity, price }
        totalAmount: parseFloat(orderData.totalAmount),
        status: 'pending', // pending, completed, cancelled
        shippingAddress: orderData.shippingAddress,
        paymentId: orderData.paymentId || `pay_${Date.now()}`, // Mock payment
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    await collection.insertOne(order);
    return order;
}

/**
 * Get order by ID
 * @param {string} orderId - Order ID
 * @returns {Promise<Object|null>} Order or null
 */
export async function getOrderById(orderId) {
    const collection = getOrdersCollection();
    return await collection.findOne({ id: orderId });
}

/**
 * Get orders by user ID
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of orders
 */
export async function getOrdersByUserId(userId) {
    const collection = getOrdersCollection();
    return await collection.find({ userId }).sort({ createdAt: -1 }).toArray();
}

/**
 * Update order status
 * @param {string} orderId - Order ID
 * @param {string} status - New status
 */
export async function updateOrderStatus(orderId, status) {
    const collection = getOrdersCollection();
    return await collection.updateOne(
        { id: orderId },
        {
            $set: {
                status,
                updatedAt: new Date().toISOString()
            }
        }
    );
}
