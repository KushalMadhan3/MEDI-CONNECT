/**
 * Order Controller
 * Handles Checkout, Payments, and Order History
 */

import { getDB } from '../config/mongodb.js';
import { getChannel } from '../config/rabbitmq.js';
import { clearCart } from '../models/cartModel.js';
import { createNotification } from '../models/notificationModel.js';
import { getOrCreatePatient } from '../models/patientModel.js';

/**
 * POST /api/store/checkout
 * Create an order from the cart
 */
export async function createOrder(req, res) {
    try {
        const userId = req.user?.userId;
        const { items, totalAmount, shippingAddress, paymentMethod } = req.body;

        console.log('🛒 Create order request:', {
            userId,
            userIdType: typeof userId,
            userInfo: {
                name: req.user?.name,
                email: req.user?.email
            },
            itemsCount: items?.length,
            items: items?.map(i => ({ medicineId: i.medicineId, name: i.name, quantity: i.quantity })),
            totalAmount,
            paymentMethod
        });
        
        if (!userId) {
            console.error('❌ No userId found in request');
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }

        if (!items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Cart is empty' });
        }

        const db = getDB();

        // 1. Validate Stock, Prescription Requirements & Calculate Total (Security check)
        let calculatedTotal = 0;
        const finalItems = [];
        const prescriptionRequiredMedicines = [];

        for (const item of items) {
            if (!item.medicineId) {
                console.error('Missing medicineId in item:', item);
                return res.status(400).json({ 
                    success: false, 
                    message: `Invalid cart item: missing medicineId. Item: ${JSON.stringify(item)}` 
                });
            }
            
            // Try to find medicine by id (string)
            let medicine = await db.collection('medicines').findOne({ id: String(item.medicineId) });
            
            // If not found, try with _id (MongoDB ObjectId)
            if (!medicine) {
                try {
                    const { ObjectId } = await import('mongodb');
                    if (ObjectId.isValid(item.medicineId)) {
                        medicine = await db.collection('medicines').findOne({ _id: new ObjectId(item.medicineId) });
                    }
                } catch (e) {
                    // Ignore ObjectId errors
                }
            }
            
            // If still not found, try finding by name as fallback
            if (!medicine && item.name) {
                console.warn('Medicine not found by ID, trying by name:', {
                    medicineId: item.medicineId,
                    itemName: item.name
                });
                medicine = await db.collection('medicines').findOne({ 
                    name: { $regex: new RegExp(`^${item.name}$`, 'i') } 
                });
            }
            
            // If still not found, return error
            if (!medicine) {
                console.error('Medicine not found:', {
                    medicineId: item.medicineId,
                    itemName: item.name,
                    allItems: items.map(i => ({ medicineId: i.medicineId, name: i.name })),
                    sampleMedicines: await db.collection('medicines').find({}).limit(3).toArray().then(meds => 
                        meds.map(m => ({ id: m.id, name: m.name }))
                    )
                });
                
                return res.status(404).json({ 
                    success: false, 
                    message: `Medicine not found: ${item.name || item.medicineId}. The medicine may have been removed. Please refresh the page and try again.` 
                });
            }
            
            // Stock validation with inventory lock check
            if (medicine.stock < item.quantity) {
                return res.status(400).json({ 
                    success: false, 
                    message: `Insufficient stock for ${medicine.name}. Only ${medicine.stock} units available.`,
                    availableStock: medicine.stock
                });
            }

            // Prescription validation (non-blocking - wrapped in try-catch)
            if (medicine.requiresPrescription) {
                prescriptionRequiredMedicines.push(medicine.name);
                
                try {
                    // Check if patient has a valid prescription for this medicine
                    const { getMedicalRecordsByPatientId } = await import('../models/medicalRecordModel.js');
                    
                    const patient = await getOrCreatePatient(userId);
                    const medicalRecords = await getMedicalRecordsByPatientId(patient.id, { limit: 100 });
                    
                    // Check if medicine is in any recent prescription (within last 6 months)
                    const sixMonthsAgo = new Date();
                    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
                    
                    const hasValidPrescription = medicalRecords.some(record => {
                        const recordDate = new Date(record.createdAt);
                        if (recordDate < sixMonthsAgo) return false;
                        
                        return record.prescribedMedicines?.some(presMed => 
                            presMed.name.toLowerCase().includes(medicine.name.toLowerCase()) ||
                            medicine.name.toLowerCase().includes(presMed.name.toLowerCase())
                        );
                    });
                    
                    if (!hasValidPrescription) {
                        // For now, allow checkout but log a warning
                        // In production, you might want to block this
                        console.warn(`⚠️ Prescription required for ${medicine.name} but not found. Allowing checkout for testing.`);
                        // Uncomment below to block prescription-required medicines:
                        // return res.status(403).json({
                        //     success: false,
                        //     message: `${medicine.name} requires a valid prescription. Please upload a prescription or consult a doctor.`,
                        //     requiresPrescription: true,
                        //     medicineName: medicine.name
                        // });
                    }
                } catch (prescriptionError) {
                    // If prescription check fails, log but don't block checkout
                    console.error('⚠️ Prescription validation error (non-blocking):', prescriptionError);
                    console.warn(`⚠️ Allowing checkout for ${medicine.name} despite prescription check failure`);
                }
            }

            calculatedTotal += medicine.price * item.quantity;
            finalItems.push({
                medicineId: medicine.id || medicine._id?.toString() || item.medicineId, // Use actual medicine ID from DB
                name: medicine.name,
                quantity: item.quantity,
                price: medicine.price, // Use current DB price
                image: medicine.image || item.image,
                requiresPrescription: medicine.requiresPrescription || false
            });
        }

        // Add shipping/tax if needed (Mock: flat 0 for now)
        // calculatedTotal += shipping; 

        // 2. Process Payment (Multiple Payment Methods)
        let paymentStatus = 'pending';
        let transactionId = null;
        const paymentMethods = ['mock', 'cod', 'upi', 'card'];

        if (!paymentMethod || !paymentMethods.includes(paymentMethod)) {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid payment method. Use: mock, cod, upi, or card' 
            });
        }

        if (paymentMethod === 'mock') {
            // Mock payment - auto approve for local testing
            paymentStatus = 'paid';
            transactionId = `mock_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (paymentMethod === 'cod') {
            // Cash on Delivery - pending until delivery
            paymentStatus = 'pending';
            transactionId = `cod_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (paymentMethod === 'upi') {
            // UPI - Mock implementation (in production, integrate with Razorpay/PhonePe)
            paymentStatus = 'paid';
            transactionId = `upi_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        } else if (paymentMethod === 'card') {
            // Card - Mock implementation (in production, integrate with Stripe/Razorpay)
            paymentStatus = 'paid';
            transactionId = `card_tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        }

        // 2. Lock Inventory (Atomic operation to prevent race conditions)
        const medicinesCollection = db.collection('medicines');
        for (const item of finalItems) {
            // Try to update by id field first
            let lockResult = await medicinesCollection.updateOne(
                { 
                    id: item.medicineId,
                    stock: { $gte: item.quantity } // Only update if stock is sufficient
                },
                { 
                    $inc: { stock: -item.quantity } // Lock by reducing stock
                }
            );
            
            // If not found by id, try by _id
            if (lockResult.matchedCount === 0) {
                try {
                    const { ObjectId } = await import('mongodb');
                    if (ObjectId.isValid(item.medicineId)) {
                        lockResult = await medicinesCollection.updateOne(
                            { 
                                _id: new ObjectId(item.medicineId),
                                stock: { $gte: item.quantity }
                            },
                            { 
                                $inc: { stock: -item.quantity }
                            }
                        );
                    }
                } catch (e) {
                    // Ignore ObjectId errors
                }
            }
            
            if (lockResult.matchedCount === 0) {
                // Stock was insufficient or changed during checkout
                console.error('Stock update failed:', {
                    medicineId: item.medicineId,
                    medicineName: item.name,
                    requestedQuantity: item.quantity
                });
                return res.status(409).json({
                    success: false,
                    message: `Stock changed for ${item.name}. Please refresh and try again.`,
                    conflict: true
                });
            }
        }

        // 3. Create Order with Enhanced Tracking
        const orderId = `ord_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const now = new Date().toISOString();
        const order = {
            id: orderId,
            userId,
            items: finalItems,
            totalAmount: calculatedTotal,
            shippingAddress,
            paymentMethod,
            paymentStatus,
            transactionId,
            status: paymentStatus === 'paid' ? 'processing' : 'pending',
            // Enhanced tracking with timestamps
            tracking: {
                status: paymentStatus === 'paid' ? 'processing' : 'pending',
                statusHistory: [
                    {
                        status: 'pending',
                        timestamp: now,
                        message: 'Order placed'
                    }
                ],
                estimatedDelivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days from now
            },
            createdAt: now,
            updatedAt: now
        };

        const ordersCollection = db.collection('orders');
        console.log('💾 Saving order to database:', {
            orderId,
            userId,
            userIdType: typeof userId,
            orderUserId: order.userId,
            orderUserIdType: typeof order.userId,
            totalAmount: calculatedTotal,
            itemsCount: finalItems.length
        });
        
        const insertResult = await ordersCollection.insertOne(order);
        
        // Verify order was saved
        if (!insertResult.insertedId) {
            console.error('❌ Failed to save order to database');
            throw new Error('Failed to save order to database');
        }
        
        // Verify the order was actually saved by querying it back
        const savedOrder = await ordersCollection.findOne({ id: orderId });
        console.log('💾 Order saved and verified:', {
            orderId,
            insertedId: insertResult.insertedId,
            userId,
            savedOrderUserId: savedOrder?.userId,
            savedOrderUserIdType: typeof savedOrder?.userId,
            userIdMatch: savedOrder?.userId === userId,
            userIdStringMatch: String(savedOrder?.userId) === String(userId),
            totalAmount: calculatedTotal,
            itemsCount: finalItems.length
        });

        // Stock already updated in step 2 (locked)

        // 5. Clear Cart
        await clearCart(userId);

        // 6. Notify & Publish Event (non-blocking - wrapped in try-catch)
        try {
            // RabbitMQ
            const channel = getChannel();
            if (channel) {
                // Order created event
                channel.publish(
                    'user_events',
                    'order.created',
                    Buffer.from(JSON.stringify({
                        orderId,
                        userId,
                        amount: calculatedTotal,
                        paymentStatus,
                        paymentMethod,
                        transactionId,
                        items: finalItems.map(i => i.name),
                        timestamp: new Date().toISOString()
                    })),
                    { persistent: true }
                );

                // Payment success event (if paid)
                if (paymentStatus === 'paid') {
                    channel.publish(
                        'user_events',
                        'payment.success',
                        Buffer.from(JSON.stringify({
                            orderId,
                            userId,
                            amount: calculatedTotal,
                            paymentMethod,
                            transactionId,
                            timestamp: new Date().toISOString()
                        })),
                        { persistent: true }
                    );
                }
            }
        } catch (mqError) {
            console.warn('⚠️ RabbitMQ notification failed (non-blocking):', mqError);
        }

        // In-App Notification (non-blocking)
        try {
            await createNotification({
                userId,
                userRole: 'patient',
                type: 'order',
                title: 'Order Placed Successfully',
                message: `Your order #${orderId} has been placed. Total: ₹${calculatedTotal}`,
                relatedId: orderId
            });
        } catch (notifError) {
            console.warn('⚠️ Notification creation failed (non-blocking):', notifError);
        }

        // Always return success response - order is saved
        console.log('✅ Order created successfully:', {
            orderId,
            userId,
            totalAmount: calculatedTotal,
            itemsCount: finalItems.length
        });

        res.status(201).json({
            success: true,
            message: 'Order placed successfully',
            data: order
        });

    } catch (error) {
        console.error('Checkout error:', error);
        console.error('Error stack:', error.stack);
        console.error('Error details:', {
            name: error.name,
            message: error.message,
            code: error.code
        });
        
        // Provide more specific error messages
        let errorMessage = 'Checkout failed';
        if (error.message) {
            errorMessage = error.message;
        } else if (error.name === 'MongoError' || error.name === 'MongoServerError') {
            errorMessage = 'Database error occurred. Please try again.';
        } else if (error.name === 'ValidationError') {
            errorMessage = 'Invalid order data. Please check your cart and try again.';
        }
        
        res.status(500).json({ 
            success: false, 
            message: errorMessage,
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * GET /api/orders
 * Get user order history
 */
export async function getUserOrders(req, res) {
    console.log('📦 getUserOrders called');
    console.log('📦 Request user:', {
        userId: req.user?.userId,
        name: req.user?.name,
        email: req.user?.email
    });
    
    try {
        const userId = req.user?.userId;
        
        if (!userId) {
            console.error('❌ No userId found in request');
            return res.status(401).json({ 
                success: false, 
                message: 'User not authenticated' 
            });
        }
        
        const db = getDB();
        
        // Try to find orders with userId (try both string and number formats)
        // MongoDB queries are type-sensitive, so we need to handle both
        let orders = await db.collection('orders')
            .find({ userId: String(userId) })
            .sort({ createdAt: -1 })
            .toArray();
        
        // If no orders found with string userId, try with the original format
        if (orders.length === 0) {
            orders = await db.collection('orders')
                .find({ userId })
                .sort({ createdAt: -1 })
                .toArray();
        }

        console.log('📦 Database query result:', {
            userId,
            ordersFound: orders.length,
            sampleOrderIds: orders.slice(0, 3).map(o => o.id)
        });
        
        // Also check if there are any orders at all (for debugging)
        const allOrdersCount = await db.collection('orders').countDocuments();
        console.log('📦 Total orders in database:', allOrdersCount);
        
        if (allOrdersCount > 0 && orders.length === 0) {
            // Check a sample order to see what userId format is used
            const sampleOrder = await db.collection('orders').findOne({});
            console.log('📦 Sample order from DB:', {
                id: sampleOrder?.id,
                userId: sampleOrder?.userId,
                userIdType: typeof sampleOrder?.userId,
                requestedUserId: userId,
                requestedUserIdType: typeof userId,
                match: sampleOrder?.userId === userId
            });
        }
        
        if (orders.length > 0) {
            console.log('📦 Sample order details:', {
                id: orders[0].id,
                status: orders[0].status,
                totalAmount: orders[0].totalAmount,
                itemsCount: orders[0].items?.length,
                createdAt: orders[0].createdAt
            });
        }

        res.json({ success: true, data: orders });
    } catch (error) {
        console.error('❌ Get orders error:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to fetch orders',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}

/**
 * GET /api/orders/:id/track
 * Get order tracking information
 */
export async function trackOrder(req, res) {
    console.log('trackOrder called with id:', req.params.id);
    try {
        const userId = req.user.userId;
        const { id: orderId } = req.params;
        const db = getDB();
        
        // Find the order and verify it belongs to the user
        const order = await db.collection('orders').findOne({ id: orderId, userId });
        
        if (!order) {
            console.log('Order not found for user:', userId, 'order:', orderId);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Enhanced tracking information
        const trackingInfo = order.tracking || {
            status: order.status,
            statusHistory: order.tracking?.statusHistory || [
                {
                    status: 'pending',
                    timestamp: order.createdAt,
                    message: 'Order placed'
                }
            ],
            estimatedDelivery: order.tracking?.estimatedDelivery || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            carrier: 'MediConnect Logistics',
            trackingNumber: `TRK${orderId.substring(0, 8).toUpperCase()}`
        };
        
        // Add tracking info to order
        const orderWithTracking = {
            ...order,
            trackingInfo
        };
        
        res.json({ success: true, data: orderWithTracking });
    } catch (error) {
        console.error('Track order error:', error);
        res.status(500).json({ success: false, message: 'Failed to track order' });
    }
}

/**
 * PUT /api/orders/:id/cancel
 * Cancel an order
 */
export async function cancelOrder(req, res) {
    console.log('cancelOrder called with id:', req.params.id);
    try {
        const userId = req.user.userId;
        const { id: orderId } = req.params;
        const db = getDB();
        
        // Find the order and verify it belongs to the user
        const order = await db.collection('orders').findOne({ id: orderId, userId });
        
        if (!order) {
            console.log('Order not found for user:', userId, 'order:', orderId);
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
        
        // Check if order can be cancelled (not already delivered or cancelled)
        if (order.status === 'delivered') {
            return res.status(400).json({ success: false, message: 'Delivered orders cannot be cancelled' });
        }
        
        if (order.status === 'cancelled') {
            return res.status(400).json({ success: false, message: 'Order is already cancelled' });
        }
        
        // Update order status to cancelled
        const result = await db.collection('orders').updateOne(
            { id: orderId },
            {
                $set: {
                    status: 'cancelled',
                    updatedAt: new Date().toISOString()
                }
            }
        );
        
        if (result.modifiedCount === 0) {
            return res.status(500).json({ success: false, message: 'Failed to cancel order' });
        }
        
        // Get updated order
        const updatedOrder = await db.collection('orders').findOne({ id: orderId });
        
        // Send notification to user
        await createNotification({
            userId,
            userRole: 'patient',
            type: 'order',
            title: 'Order Cancelled',
            message: `Your order #${orderId} has been cancelled successfully.`,
            relatedId: orderId
        });
        
        res.json({ 
            success: true, 
            message: 'Order cancelled successfully',
            data: updatedOrder
        });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel order' });
    }
}

/**
 * DELETE /api/orders/:id
 * Delete a cancelled order
 */
export async function deleteOrder(req, res) {
    console.log('deleteOrder called with id:', req.params.id);
    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { id: orderId } = req.params;
        if (!orderId) {
            return res.status(400).json({ success: false, message: 'Order ID is required' });
        }

        const db = getDB();
        
        // Find the order and verify it belongs to the user
        // Try both id and _id fields for compatibility
        const order = await db.collection('orders').findOne({ 
            $or: [
                { id: orderId, userId },
                { _id: orderId, userId }
            ]
        });
        
        if (!order) {
            console.log('Order not found for user:', userId, 'order:', orderId);
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found or you do not have permission to delete it' 
            });
        }
        
        // Only allow deletion of cancelled orders
        if (order.status !== 'cancelled') {
            return res.status(400).json({ 
                success: false, 
                message: 'Only cancelled orders can be deleted' 
            });
        }
        
        // Delete the order using the actual order identifier
        const deleteQuery = order.id ? { id: order.id, userId } : { _id: order._id, userId };
        const result = await db.collection('orders').deleteOne(deleteQuery);
        
        if (result.deletedCount === 0) {
            console.error('Failed to delete order - no documents matched:', deleteQuery);
            return res.status(500).json({ 
                success: false, 
                message: 'Failed to delete order. The order may have already been deleted.' 
            });
        }
        
        console.log('Order deleted successfully:', orderId);
        res.json({ 
            success: true, 
            message: 'Order deleted successfully'
        });
    } catch (error) {
        console.error('Delete order error:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to delete order' 
        });
    }
}