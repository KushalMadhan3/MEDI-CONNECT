import React, { useEffect, useState } from 'react';
import { Package, Calendar, ChevronRight, Truck, CheckCircle, Smartphone, Wallet, Loader2, X, MapPin, Trash2 } from 'lucide-react';

export default function OrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);
    const [deletingOrderId, setDeletingOrderId] = useState<string | null>(null);
    const [trackingOrderId, setTrackingOrderId] = useState<string | null>(null);
    const [trackingInfo, setTrackingInfo] = useState<any>(null);
    const [showTrackingModal, setShowTrackingModal] = useState(false);

    useEffect(() => {
        fetchOrders();
    }, []);

    // Refresh orders when component becomes visible (e.g., after returning from checkout)
    useEffect(() => {
        const handleFocus = () => {
            fetchOrders();
        };
        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, []);

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated. Please login again.');
            }

            // Get base URL and ensure it doesn't have trailing /api
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            // Remove trailing /api if present to avoid double /api/api/
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            const url = `${apiUrl}/api/orders`;
            console.log('📦 Fetching orders from:', url);
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            console.log('📦 Orders response status:', res.status);

            if (!res.ok) {
                let errorMessage = `Failed to fetch orders: ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = res.statusText || errorMessage;
                }

                if (res.status === 401) {
                    throw new Error('Session expired. Please login again.');
                } else if (res.status === 404) {
                    // No orders found is not an error, just empty array
                    setOrders([]);
                    setLoading(false);
                    return;
                } else {
                    throw new Error(errorMessage);
                }
            }

            let data;
            try {
                const responseText = await res.text();
                console.log('📦 Raw response text:', responseText.substring(0, 500));
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('❌ Failed to parse response:', parseError);
                throw new Error('Invalid response from server');
            }

            console.log('📦 Parsed response data:', {
                success: data.success,
                hasData: !!data.data,
                dataIsArray: Array.isArray(data.data),
                dataLength: Array.isArray(data.data) ? data.data.length : 'not an array',
                fullData: data
            });

            if (data.success && Array.isArray(data.data)) {
                console.log('✅ Orders fetched successfully:', data.data.length, 'orders');
                if (data.data.length > 0) {
                    console.log('📦 First order:', {
                        id: data.data[0].id,
                        status: data.data[0].status,
                        totalAmount: data.data[0].totalAmount,
                        itemsCount: data.data[0].items?.length
                    });
                }
                setOrders(data.data || []);
            } else if (Array.isArray(data)) {
                // Handle case where data is directly an array
                console.log('✅ Orders fetched (direct array):', data.length, 'orders');
                setOrders(data || []);
            } else {
                console.warn('⚠️ Unexpected orders data format:', data);
                console.warn('⚠️ Setting empty orders array');
                setOrders([]);
            }
        } catch (error: any) {
            console.error('Failed to fetch orders', error);
            setError(error.message || 'Failed to load orders. Please try again.');
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleTrackOrder = async (orderId: string) => {
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated. Please login again.');
            }

            setTrackingOrderId(orderId);
            // Get base URL and ensure it doesn't have trailing /api
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            const url = `${apiUrl}/api/orders/${orderId}/track`;
            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                throw new Error(`Failed to track order: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                setTrackingInfo(data.data.trackingInfo);
                setShowTrackingModal(true);
            }
        } catch (error: any) {
            console.error('Failed to track order', error);
            setError(error.message || 'Failed to track order. Please try again.');
        }
    };

    const handleCancelOrder = async (orderId: string) => {
        const confirmCancel = window.confirm('Are you sure you want to cancel this order?');
        if (!confirmCancel) return;

        try {
            setCancellingOrderId(orderId);
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated. Please login again.');
            }

            // Get base URL and ensure it doesn't have trailing /api
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            const url = `${apiUrl}/api/orders/${orderId}/cancel`;
            const res = await fetch(url, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to cancel order: ${res.status}`);
            }

            const data = await res.json();
            if (data.success) {
                // Update the order in the state
                setOrders(prevOrders => 
                    prevOrders.map(order => 
                        order.id === orderId ? { ...order, status: 'cancelled' } : order
                    )
                );
                alert('Order cancelled successfully');
            }
        } catch (error: any) {
            console.error('Failed to cancel order', error);
            setError(error.message || 'Failed to cancel order. Please try again.');
        } finally {
            setCancellingOrderId(null);
        }
    };

    const handleDeleteOrder = async (orderId: string) => {
        const confirmDelete = window.confirm('Are you sure you want to delete this cancelled order? This action cannot be undone.');
        if (!confirmDelete) return;

        try {
            setDeletingOrderId(orderId);
            setError(null); // Clear any previous errors
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('Not authenticated. Please login again.');
            }

            // Get base URL and ensure it doesn't have trailing /api
            let apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            apiUrl = apiUrl.replace(/\/api\/?$/, '');
            const url = `${apiUrl}/api/orders/${orderId}`;
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                let errorMessage = `Failed to delete order: ${res.status}`;
                try {
                    const errorData = await res.json();
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    // If response is not JSON, use status text
                    errorMessage = res.statusText || errorMessage;
                }

                // Handle specific error cases
                if (res.status === 404) {
                    // Order not found - might already be deleted, refresh the list
                    await fetchOrders();
                    alert('Order not found. The order list has been refreshed.');
                    return;
                } else if (res.status === 400) {
                    throw new Error(errorMessage || 'Only cancelled orders can be deleted.');
                } else if (res.status === 401) {
                    throw new Error('Session expired. Please login again.');
                } else {
                    throw new Error(errorMessage);
                }
            }

            let data;
            try {
                data = await res.json();
            } catch {
                // If response is not JSON but status is OK, assume success
                data = { success: true };
            }

            if (data.success) {
                // Remove the order from the state
                setOrders(prevOrders => prevOrders.filter(order => order.id !== orderId));
                // Also refresh the list to ensure consistency
                await fetchOrders();
            } else {
                throw new Error(data.message || 'Failed to delete order');
            }
        } catch (error: any) {
            console.error('Failed to delete order', error);
            // Don't set global error for delete failures, just show alert
            alert(error.message || 'Failed to delete order. Please try again.');
        } finally {
            setDeletingOrderId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 text-[#3F53D9] animate-spin mb-4" />
                <p className="text-gray-500">Loading your orders...</p>
            </div>
        );
    }

    if (error && loading === false) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] p-8">
                <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Orders</h2>
                <p className="text-gray-500 mb-4 text-center max-w-md">{error}</p>
                <div className="flex gap-3">
                    <button
                        onClick={fetchOrders}
                        className="px-6 py-2 bg-[#3F53D9] text-white rounded-xl hover:bg-[#3F53D9]/90 transition-colors"
                    >
                        Retry
                    </button>
                    {error.includes('Session expired') || error.includes('Not authenticated') && (
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors"
                        >
                            Go to Login
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!orders || orders.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh]">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">No orders yet</h2>
                <p className="text-gray-500 mt-2">Your medicine order history will appear here.</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4 space-y-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
                <button
                    onClick={fetchOrders}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-[#3F53D9] text-white rounded-lg hover:bg-[#2E42C7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Loader2 className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    {loading ? 'Loading...' : 'Refresh'}
                </button>
            </div>

            {orders.map((order, orderIdx) => {
                // Safe access with fallbacks
                const orderId = order?.id || `order_${orderIdx}`;
                const orderStatus = order?.status || 'pending';
                const createdAt = order?.createdAt ? new Date(order.createdAt) : new Date();
                const totalAmount = order?.totalAmount || 0;
                const items = Array.isArray(order?.items) ? order.items : [];
                const paymentMethod = order?.paymentMethod || 'unknown';

                // Validate date
                const isValidDate = !isNaN(createdAt.getTime());

                return (
                    <div key={orderId} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                        <div className="p-6">
                            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <h3 className="font-bold text-lg text-gray-900">
                                            Order #{typeof orderId === 'string' ? orderId.slice(0, 8).toUpperCase() : 'N/A'}
                                        </h3>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                            orderStatus === 'delivered' ? 'bg-green-100 text-green-700' :
                                            orderStatus === 'processing' ? 'bg-blue-100 text-blue-700' : 
                                            orderStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                            orderStatus === 'cancelled' ? 'bg-red-100 text-red-700' :
                                            'bg-gray-100 text-gray-700'
                                        }`}>
                                            {String(orderStatus).toUpperCase()}
                                        </span>
                                    </div>
                                    {isValidDate && (
                                        <p className="text-gray-500 text-sm mt-1 flex items-center gap-2">
                                            <Calendar className="w-3 h-3" />
                                            {createdAt.toLocaleDateString()} at {createdAt.toLocaleTimeString()}
                                        </p>
                                    )}
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-[#3F53D9]">₹{Number(totalAmount).toFixed(2)}</p>
                                    <p className="text-xs text-gray-500">{items.length} {items.length === 1 ? 'item' : 'items'}</p>
                                </div>
                            </div>

                            {items.length > 0 && (
                                <div className="border-t border-gray-100 pt-6">
                                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Items Ordered</h4>
                                    <div className="space-y-4">
                                        {items.map((item: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-4">
                                                <img 
                                                    src={item?.image || (() => {
                                                        // Generate local SVG placeholder
                                                        const svg = `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                                            <rect width="100%" height="100%" fill="#E8EAFF"/>
                                                            <text x="50%" y="50%" font-family="Arial" font-size="8" fill="#3F53D9" 
                                                                  text-anchor="middle" dominant-baseline="middle">📦</text>
                                                        </svg>`;
                                                        return `data:image/svg+xml;base64,${btoa(svg)}`;
                                                    })()} 
                                                    alt={item?.name || 'Medicine'} 
                                                    className="w-12 h-12 rounded-lg object-cover bg-gray-50"
                                                    onError={(e) => {
                                                        // Use local SVG placeholder
                                                        const target = e.target as HTMLImageElement;
                                                        const svg = `<svg width="40" height="40" xmlns="http://www.w3.org/2000/svg">
                                                            <rect width="100%" height="100%" fill="#E8EAFF"/>
                                                            <text x="50%" y="50%" font-family="Arial" font-size="8" fill="#3F53D9" 
                                                                  text-anchor="middle" dominant-baseline="middle">📦</text>
                                                        </svg>`;
                                                        target.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                                                    }}
                                                />
                                                <div className="flex-1">
                                                    <p className="font-medium text-gray-900">{item?.name || 'Unknown Medicine'}</p>
                                                    <p className="text-sm text-gray-500">Qty: {item?.quantity || 0}</p>
                                                </div>
                                                <p className="font-medium text-gray-900">₹{Number(item?.price || 0).toFixed(2)}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="bg-gray-50 px-6 py-4 flex justify-between items-center border-t border-gray-100">
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                {paymentMethod === 'mock' || paymentMethod === 'cod' ? (
                                    <Wallet className="w-4 h-4" />
                                ) : (
                                    <Truck className="w-4 h-4" />
                                )}
                                Payment: <span className="font-medium capitalize">{paymentMethod}</span>
                            </div>
                            <div className="flex gap-3">
                                {orderStatus === 'cancelled' && (
                                    <button 
                                        onClick={() => handleDeleteOrder(orderId)}
                                        disabled={deletingOrderId === orderId}
                                        className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                    >
                                        {deletingOrderId === orderId ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Deleting...
                                            </>
                                        ) : (
                                            <>
                                                <Trash2 className="w-4 h-4" />
                                                Delete
                                            </>
                                        )}
                                    </button>
                                )}
                                {orderStatus !== 'cancelled' && orderStatus !== 'delivered' && (
                                    <button 
                                        onClick={() => handleCancelOrder(orderId)}
                                        disabled={cancellingOrderId === orderId}
                                        className="text-red-500 hover:text-red-700 text-sm font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                                    >
                                        {cancellingOrderId === orderId ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Cancelling...
                                            </>
                                        ) : (
                                            <>
                                                <X className="w-4 h-4" />
                                                Cancel
                                            </>
                                        )}
                                    </button>
                                )}
                                <button 
                                    onClick={() => handleTrackOrder(orderId)}
                                    className="text-[#3F53D9] hover:text-[#3F53D9]/80 text-sm font-bold flex items-center gap-1 transition-colors"
                                >
                                    Track Order <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Tracking Modal */}
            {showTrackingModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Order Tracking</h3>
                            <button 
                                onClick={() => setShowTrackingModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {trackingInfo && (
                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Truck className="w-6 h-6 text-[#3F53D9]" />
                                    <div>
                                        <p className="font-medium">Carrier: {trackingInfo.carrier}</p>
                                        <p className="text-sm text-gray-500">Tracking #: {trackingInfo.trackingNumber}</p>
                                    </div>
                                </div>
                                
                                <div className="border-l-2 border-[#3F53D9] pl-4 ml-3 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-[#3F53D9] flex items-center justify-center">
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Order Confirmed</p>
                                            <p className="text-sm text-gray-500">Processing your order</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full ${trackingInfo.status === 'processing' || trackingInfo.status === 'delivered' ? 'bg-[#3F53D9]' : 'bg-gray-300'} flex items-center justify-center`}>
                                            <CheckCircle className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Shipped</p>
                                            <p className="text-sm text-gray-500">On the way to you</p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full ${trackingInfo.status === 'delivered' ? 'bg-[#3F53D9]' : 'bg-gray-300'} flex items-center justify-center`}>
                                            <MapPin className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <p className="font-medium">Delivered</p>
                                            {trackingInfo.estimatedDelivery && (
                                                <p className="text-sm text-gray-500">
                                                    Estimated: {new Date(trackingInfo.estimatedDelivery).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="pt-4 border-t border-gray-200">
                                    <p className="text-sm text-gray-600">
                                        Current Status: <span className="font-medium capitalize">{trackingInfo.status}</span>
                                    </p>
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowTrackingModal(false)}
                                className="px-4 py-2 bg-[#3F53D9] text-white rounded-lg hover:bg-[#3F53D9]/90 transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}