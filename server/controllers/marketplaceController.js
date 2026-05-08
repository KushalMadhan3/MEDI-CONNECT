/**
 * Marketplace Controller
 * Handles medicine and order API endpoints
 */

import {
    getAllMedicines,
    getMedicineById,
    updateMedicineStock,
    searchMedicinesInDB
} from '../models/medicineModel.js';
import {
    createOrder,
    getOrdersByUserId,
    getOrderById
} from '../models/orderModel.js';
import { createNotification } from '../models/notificationModel.js';
import { getChannel } from '../config/rabbitmq.js';
import { searchDocuments } from '../services/searchService.js';

/**
 * GET /api/marketplace/medicines
 * Get all medicines with pagination and filtering
 */
export async function getMedicines(req, res) {
    try {
        const { category, search, limit, page } = req.query;

        // If search term is present, try ElasticSearch first, then fallback to DB
        if (search) {
            // Try ES first
            const esResults = await searchDocuments('medicines', search);

            if (esResults) {
                return res.json({
                    success: true,
                    data: esResults,
                    source: 'elasticsearch'
                });
            }

            // Fallback to DB Regex
            const dbResults = await searchMedicinesInDB(search);
            return res.json({
                success: true,
                data: dbResults,
                source: 'database'
            });
        }

        // Regular filtering
        const filters = {};
        if (category) filters.category = category;

        const options = {};
        if (limit) options.limit = parseInt(limit);
        if (page && limit) options.skip = (parseInt(page) - 1) * parseInt(limit);

        const medicines = await getAllMedicines(filters, options);

        res.json({
            success: true,
            data: medicines
        });
    } catch (error) {
        console.error('Get medicines error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medicines'
        });
    }
}

/**
 * GET /api/marketplace/medicines/:id
 * Get medicine by ID
 */
export async function getMedicine(req, res) {
    try {
        const { id } = req.params;
        const medicine = await getMedicineById(id);

        if (!medicine) {
            return res.status(404).json({
                success: false,
                message: 'Medicine not found'
            });
        }

        res.json({
            success: true,
            data: medicine
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch medicine'
        });
    }
}

/**
 * POST /api/marketplace/order
 * Place a new order
 */
export async function placeOrder(req, res) {
    try {
        const userId = req.user.userId;
        const userName = req.user.name;
        const { items, shippingAddress, totalAmount, paymentId } = req.body;

        if (!items || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order items are required'
            });
        }

        // Verify stock and calculate total strictly (security)
        let calculatedTotal = 0;
        const processedItems = [];

        for (const item of items) {
            const medicine = await getMedicineById(item.medicineId);
            if (!medicine) {
                return res.status(400).json({
                    success: false,
                    message: `Medicine ${item.medicineId} not found`
                });
            }

            if (medicine.stock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `Insufficient stock for ${medicine.name}`
                });
            }

            calculatedTotal += medicine.price * item.quantity;
            processedItems.push({
                medicineId: item.medicineId,
                name: medicine.name,
                quantity: item.quantity,
                price: medicine.price
            });
        }

        // Create Order
        const order = await createOrder({
            userId,
            userName,
            items: processedItems,
            totalAmount: calculatedTotal,
            shippingAddress,
            paymentId
        });

        // Deduct Stock
        for (const item of processedItems) {
            await updateMedicineStock(item.medicineId, -item.quantity);
        }

        // Send Notification to User - Order Placed
        await createNotification({
            userId,
            userRole: 'patient',
            type: 'order',
            title: 'Medicine Order Placed',
            message: `Your order #${order.id} for ₹${calculatedTotal} has been placed successfully.`,
            relatedId: order.id
        });

        // Notify Admin - Medicine Order Placed
        await createNotification({
            userId: 'admin',
            userRole: 'admin',
            type: 'order',
            title: 'Medicine Order Placed',
            message: `New medicine order #${order.id} placed by customer for ₹${calculatedTotal}.`,
            relatedId: order.id
        });

        // Publish RabbitMQ event (wrapped in try-catch)
        try {
            const channel = getChannel();
            if (channel) {
                channel.publish(
                    'user_events',
                    'order.created',
                    Buffer.from(JSON.stringify({
                        orderId: order.id,
                        userId,
                        amount: calculatedTotal,
                        timestamp: new Date().toISOString()
                    })),
                    { persistent: true }
                );
                console.log(`📨 Order created event published: ${order.id}`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to publish order event:', error.message);
        }

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });
    } catch (error) {
        console.error('Place order error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to place order'
        });
    }
}

/**
 * GET /api/marketplace/orders
 * Get user orders
 */
export async function getUserOrders(req, res) {
    try {
        const userId = req.user.userId;
        const orders = await getOrdersByUserId(userId);

        res.json({
            success: true,
            data: orders
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to fetch orders'
        });
    }
}
