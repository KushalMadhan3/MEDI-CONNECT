/**
 * Cart Model
 * Data persistence for shopping carts
 */

import { getDB } from '../config/mongodb.js';

export async function getCart(userId) {
    const db = getDB();
    const cart = await db.collection('carts').findOne({ userId });
    return cart || { userId, items: [], total: 0, status: 'active' };
}

export async function updateCart(userId, items) {
    const db = getDB();

    // Calculate total
    const total = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const updatedAt = new Date().toISOString();

    await db.collection('carts').updateOne(
        { userId },
        {
            $set: {
                items,
                total,
                updatedAt,
                status: 'active'
            },
            $setOnInsert: {
                createdAt: updatedAt
            }
        },
        { upsert: true }
    );

    return { userId, items, total, status: 'active', updatedAt };
}

export async function clearCart(userId) {
    const db = getDB();
    await db.collection('carts').deleteOne({ userId });
    return true;
}
