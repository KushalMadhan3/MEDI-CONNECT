
import React, { useState } from 'react';
import { ArrowLeft, MapPin, CreditCard, Truck, CheckCircle, ShieldCheck, Wallet, Smartphone, Loader2 } from 'lucide-react';



// Quick mock interface since we might not have global types yet
interface CheckoutProps {
    cartItems: any[];
    total: number;
    onOrderPlaced: () => void;
    onBack: () => void;
}

export default function CheckoutPage({ cartItems, total, onOrderPlaced, onBack }: CheckoutProps) {
    const [step, setStep] = useState<'address' | 'payment' | 'success'>('address');
    const [address, setAddress] = useState({ street: '', city: '', state: '', zip: '', phone: '' });
    const [paymentMethod, setPaymentMethod] = useState<'card' | 'upi' | 'cod' | 'mock'>('mock');
    const [loading, setLoading] = useState(false);
    const [paymentDetails, setPaymentDetails] = useState({ upiId: '', cardNumber: '', cardName: '', expiry: '', cvv: '' });
    const [orderId, setOrderId] = useState<string | null>(null);

    const handlePlaceOrder = async () => {
        // Validate address
        if (!address.street || !address.city || !address.state || !address.zip) {
            alert('Please fill in all address fields');
            return;
        }

        // Validate payment details based on method
        if (paymentMethod === 'upi' && !paymentDetails.upiId) {
            alert('Please enter your UPI ID');
            return;
        }
        if (paymentMethod === 'card' && (!paymentDetails.cardNumber || !paymentDetails.cardName || !paymentDetails.expiry || !paymentDetails.cvv)) {
            alert('Please enter all card details');
            return;
        }

        setLoading(true);
        try {
            // Check authentication first
            const token = localStorage.getItem('token');
            if (!token) {
                alert('Please login to place an order.');
                setLoading(false);
                return;
            }

            // Validate cart items
            if (!cartItems || cartItems.length === 0) {
                alert('Your cart is empty. Please add items to cart before checkout.');
                setLoading(false);
                return;
            }

            // Prepare items in the format expected by the API
            const formattedItems = cartItems.map((item: any, index: number) => {
                // Try multiple possible field names for medicineId
                const medicineId = item.medicineId || item.id || item.medicine?.id;
                
                if (!medicineId) {
                    console.error('Cart item missing medicineId:', {
                        item,
                        index,
                        allCartItems: cartItems,
                        itemKeys: Object.keys(item || {})
                    });
                    throw new Error(`Invalid cart item: missing medicine ID for "${item.name || 'unknown item'}". Please refresh the page and try again.`);
                }
                
                if (!item.quantity || item.quantity < 1) {
                    console.error('Cart item has invalid quantity:', item);
                    throw new Error(`Invalid quantity for "${item.name || 'unknown item'}". Please update the quantity and try again.`);
                }
                
                return {
                    medicineId: String(medicineId), // Ensure it's a string
                    name: item.name || 'Unknown Medicine',
                    quantity: Number(item.quantity) || 1,
                    price: Number(item.price) || 0
                };
            });
            
            // Validate all items have required fields
            const invalidItems = formattedItems.filter(item => !item.medicineId || !item.name || !item.quantity || !item.price);
            if (invalidItems.length > 0) {
                console.error('Invalid formatted items:', invalidItems);
                throw new Error('Some cart items are invalid. Please refresh the page and try again.');
            }

            console.log('Placing order with items:', formattedItems);
            console.log('Total amount:', total);
            console.log('Shipping address:', `${address.street}, ${address.city}, ${address.state} - ${address.zip}`);

            // Get base URL and ensure it doesn't have trailing /api
            let baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
            // Remove trailing /api if present to avoid double /api/api/
            baseUrl = baseUrl.replace(/\/api\/?$/, '');
            const url = `${baseUrl}/api/orders/checkout`;
            console.log('🔍 Calling checkout endpoint:', url);
            console.log('🔍 Request payload:', {
                itemsCount: formattedItems.length,
                totalAmount: total,
                paymentMethod,
                hasToken: !!token,
                tokenLength: token?.length,
                baseUrl,
                fullUrl: url
            });
            
            // First, test if server is reachable
            try {
                const healthCheck = await fetch(`${baseUrl}/health`, { method: 'GET' });
                if (!healthCheck.ok && healthCheck.status !== 404) {
                    console.warn('⚠️ Server health check failed:', healthCheck.status);
                }
            } catch (healthError) {
                console.warn('⚠️ Server health check failed (this is OK if /health endpoint doesn\'t exist)');
            }
            
            let response;
            try {
                response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        items: formattedItems,
                        totalAmount: total,
                        shippingAddress: `${address.street}, ${address.city}, ${address.state} - ${address.zip}`,
                        paymentMethod
                    })
                });
            } catch (fetchError: any) {
                // Handle network errors (CORS, connection refused, etc.)
                console.error('❌ Fetch error:', fetchError);
                if (fetchError.message?.includes('Failed to fetch') || fetchError.message?.includes('NetworkError') || fetchError.name === 'TypeError') {
                    throw new Error(
                        'Cannot connect to server. Please ensure:\n' +
                        '1. The backend server is running on port 3001\n' +
                        '2. CORS is properly configured\n' +
                        '3. Check your network connection\n' +
                        `4. Verify the server URL: ${baseUrl}`
                    );
                }
                throw fetchError;
            }
            
            console.log('📥 Response status:', response.status, response.statusText);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

            // Parse response
            let data: any = {};
            let responseText = '';
            try {
                responseText = await response.text();
                console.log('📥 Response text:', responseText);
                console.log('📥 Response status:', response.status, response.statusText);
                if (responseText) {
                    try {
                        data = JSON.parse(responseText);
                        console.log('📥 Parsed response data:', data);
                    } catch (parseError) {
                        console.error('Failed to parse JSON:', parseError, 'Response text:', responseText);
                        data = { 
                            success: false,
                            message: responseText || 'Unknown error from server',
                            rawResponse: responseText
                        };
                    }
                } else {
                    console.warn('⚠️ Empty response body');
                    data = { 
                        success: false,
                        message: `Server returned empty response (Status: ${response.status})`
                    };
                }
            } catch (parseError) {
                console.error('Failed to read response:', parseError);
                data = { 
                    success: false,
                    message: 'Failed to read server response. The server may be unreachable or returned an invalid response.'
                };
            }

            // Log full response details for debugging
            console.log('📊 Full response analysis:', {
                ok: response.ok,
                status: response.status,
                statusText: response.statusText,
                hasData: !!data,
                dataSuccess: data?.success,
                dataMessage: data?.message,
                dataError: data?.error,
                responseText: responseText?.substring(0, 500), // First 500 chars
                dataKeys: data ? Object.keys(data) : []
            });

            // Check if response is ok
            if (!response.ok) {
                let errorMessage = 'Checkout failed';
                
                // Use error message from response if available
                if (data?.message) {
                    errorMessage = data.message;
                } else if (data?.error) {
                    errorMessage = data.error;
                }
                
                // Provide specific error messages based on status
                if (response.status === 404) {
                    // Check if it's a route not found or resource not found
                    const errorMsg = (data.message || data.error || responseText || '').toLowerCase();
                    if (errorMsg.includes('medicine not found') && !errorMsg.includes('endpoint') && !errorMsg.includes('route')) {
                        errorMessage = (data.message || data.error) + '. Please refresh the page and try again.';
                    } else if (errorMsg.includes('endpoint') || errorMsg.includes('route') || errorMsg.includes('not found') || !data.message) {
                        // Route not found - provide troubleshooting steps
                        errorMessage = 'Checkout endpoint not found. Please ensure:\n' +
                            '1. The backend server is running on port 3001\n' +
                            '2. The route /api/orders/checkout is configured\n' +
                            '3. You are logged in (authentication required)\n' +
                            '4. Check server console for route registration logs\n' +
                            `\nServer response: ${responseText || 'No response body'}`;
                    } else {
                        errorMessage = data.message || data.error || 'Resource not found. Please refresh and try again.';
                    }
                } else if (response.status === 401) {
                    errorMessage = 'Authentication failed. Please login again to place an order.';
                } else if (response.status === 400) {
                    errorMessage = data.message || 'Invalid order data. Please check your cart items and try again.';
                } else if (response.status === 403) {
                    errorMessage = data.message || 'Some medicines require a prescription. Please upload a prescription first.';
                } else if (response.status === 409) {
                    errorMessage = data.message || 'Stock has changed. Please refresh and try again.';
                } else {
                    errorMessage = data.message || `Server error: ${response.status} ${response.statusText}`;
                }
                
                console.error('Checkout error:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData: data,
                    formattedItems,
                    url,
                    cartItems
                });
                
                throw new Error(errorMessage);
            }
            
            // Check if response indicates failure even if status is 200/201
            // Note: 201 (Created) is also a success status
            if (data && data.success === false) {
                const errorMsg = data.message || data.error || data.msg || 'Checkout failed';
                console.error('❌ Checkout failed - Server returned success:false:', {
                    success: data.success,
                    message: errorMsg,
                    fullData: data,
                    status: response.status,
                    statusText: response.statusText,
                    responseOk: response.ok,
                    responseText: responseText?.substring(0, 500)
                });
                throw new Error(errorMsg);
            }
            
            // Safety check: if data is empty or malformed (but response was ok)
            if (response.ok && (!data || (typeof data === 'object' && Object.keys(data).length === 0))) {
                console.error('❌ Checkout failed - Empty or invalid response data:', {
                    data,
                    responseStatus: response.status,
                    responseOk: response.ok,
                    responseText: responseText?.substring(0, 500),
                    hasData: !!data,
                    dataType: typeof data
                });
                throw new Error('Server returned an invalid response. Please try again.');
            }

            // Additional check: if success property is missing but response is ok
            if (response.ok && data && data.success === undefined && response.status !== 204) {
                console.warn('⚠️ Response is ok but success property is missing:', {
                    data,
                    status: response.status,
                    responseText: responseText?.substring(0, 200)
                });
                // Don't throw error here - some APIs might not use success property
                // But log it for debugging
            }

            // Extract order ID from response
            const orderIdFromResponse = data.data?.id || data.data?._id || data.id || data.orderId;
            console.log('✅ Checkout successful!', {
                orderId: orderIdFromResponse,
                responseData: data,
                orderData: data.data
            });
            
            setOrderId(orderIdFromResponse);
            setStep('success');
            
            // Auto-refresh notifications and clear cart
            setTimeout(() => {
                onOrderPlaced(); // Clear cart in parent
            }, 3000);
        } catch (error: any) {
            console.error('Checkout failed', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name,
                response: error.response,
                status: error.status
            });
            
            // Provide more helpful error messages
            let errorMessage = 'Checkout failed. Please try again.';
            
            if (error.message) {
                errorMessage = error.message;
            } else if (error instanceof TypeError && error.message?.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.name === 'NetworkError') {
                errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
            }
            
            alert(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'success') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in zoom-in duration-500">
                <div className="relative mb-6">
                    <div className="w-32 h-32 bg-gradient-to-br from-green-100 to-emerald-50 rounded-full flex items-center justify-center shadow-lg shadow-green-200/50">
                        <CheckCircle className="w-16 h-16 text-green-600" />
                    </div>
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-500 rounded-full animate-ping"></div>
                </div>
                <h2 className="text-3xl font-bold text-gray-900 mb-2 bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                    Order Placed Successfully! 🎉
                </h2>
                {orderId && (
                    <p className="text-sm text-gray-500 mb-2">Order ID: <span className="font-mono font-semibold text-gray-700">{orderId}</span></p>
                )}
                <p className="text-gray-500 max-w-md mb-8">Thank you for your purchase. Your order has been confirmed and will be shipped shortly.</p>
                <div className="flex gap-4">
                    <button 
                        onClick={onOrderPlaced} 
                        className="px-8 py-3 bg-gradient-to-r from-[#3F53D9] to-[#7C74EB] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all"
                    >
                        View Orders
                    </button>
                    <button 
                        onClick={onOrderPlaced} 
                        className="px-8 py-3 border-2 border-gray-200 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-300 transition-all"
                    >
                        Continue Shopping
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <button onClick={onBack} className="flex items-center text-gray-500 hover:text-primary mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-2" /> Back to Store
            </button>

            <h1 className="text-2xl font-bold text-gray-900 mb-8">Secure Checkout</h1>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Left Column: Form */}
                <div className="md:col-span-2 space-y-6">

                    {/* Address Section */}
                    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${step === 'address' ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200'}`}>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                                <MapPin className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Shipping Address</h3>
                        </div>

                        {step === 'address' ? (
                            <div className="space-y-4">
                                <input
                                    type="text"
                                    placeholder="Street Address *"
                                    required
                                    className="w-full p-3.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                    value={address.street}
                                    onChange={e => setAddress({ ...address, street: e.target.value })}
                                />
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="City *"
                                        required
                                        className="w-full p-3.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={address.city}
                                        onChange={e => setAddress({ ...address, city: e.target.value })}
                                    />
                                    <input
                                        type="text"
                                        placeholder="State"
                                        className="w-full p-3.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={address.state}
                                        onChange={e => setAddress({ ...address, state: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <input
                                        type="text"
                                        placeholder="ZIP Code *"
                                        required
                                        className="w-full p-3.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={address.zip}
                                        onChange={e => setAddress({ ...address, zip: e.target.value })}
                                    />
                                    <input
                                        type="tel"
                                        placeholder="Phone Number *"
                                        required
                                        className="w-full p-3.5 border border-[#E8EAFF] rounded-xl bg-white text-black focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all"
                                        value={address.phone}
                                        onChange={e => setAddress({ ...address, phone: e.target.value })}
                                    />
                                </div>
                                <button
                                    onClick={() => setStep('payment')}
                                    disabled={!address.street || !address.city || !address.zip || !address.phone}
                                    className="w-full py-3.5 bg-gradient-to-r from-[#3F53D9] to-[#7C74EB] text-white rounded-xl font-semibold hover:shadow-lg hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                                >
                                    Continue to Payment →
                                </button>
                            </div>
                        ) : (
                            <div className="flex justify-between items-center text-gray-600 bg-gradient-to-r from-[#F5F3FA] to-white p-4 rounded-xl border border-[#E8EAFF]">
                                <div>
                                    <p className="font-medium">{address.street}</p>
                                    <p className="text-sm">{address.city}, {address.state} - {address.zip}</p>
                                    {address.phone && <p className="text-sm text-gray-500">Phone: {address.phone}</p>}
                                </div>
                                <button 
                                    onClick={() => setStep('address')} 
                                    className="text-[#3F53D9] text-sm font-medium hover:underline px-3 py-1 hover:bg-[#E8EAFF] rounded-lg transition-colors"
                                >
                                    Change
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Payment Section */}
                    <div className={`bg-white p-6 rounded-2xl shadow-sm border ${step === 'payment' ? 'border-primary ring-2 ring-primary/10' : 'border-gray-200 opacity-60'}`}>
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600">
                                <CreditCard className="w-5 h-5" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
                        </div>

                        {step === 'payment' && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <label className={`cursor-pointer p-5 border-2 rounded-xl flex items-center gap-3 transition-all group ${paymentMethod === 'mock' ? 'border-[#3F53D9] bg-gradient-to-br from-[#E8EAFF] to-white shadow-md' : 'border-[#E8EAFF] hover:border-[#3F53D9]/50 hover:shadow-sm'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="mock" 
                                            checked={paymentMethod === 'mock'} 
                                            onChange={() => setPaymentMethod('mock')} 
                                            className="text-[#3F53D9] w-5 h-5" 
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${paymentMethod === 'mock' ? 'bg-[#3F53D9] text-white' : 'bg-[#F5F3FA] text-gray-500 group-hover:bg-[#E8EAFF]'}`}>
                                                <Wallet className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 block">Demo Wallet</span>
                                                <span className="text-xs text-gray-500">Instant (Testing)</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label className={`cursor-pointer p-5 border-2 rounded-xl flex items-center gap-3 transition-all group ${paymentMethod === 'upi' ? 'border-[#3F53D9] bg-gradient-to-br from-[#E8EAFF] to-white shadow-md' : 'border-[#E8EAFF] hover:border-[#3F53D9]/50 hover:shadow-sm'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="upi" 
                                            checked={paymentMethod === 'upi'} 
                                            onChange={() => setPaymentMethod('upi')} 
                                            className="text-[#3F53D9] w-5 h-5" 
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${paymentMethod === 'upi' ? 'bg-[#3F53D9] text-white' : 'bg-[#F5F3FA] text-gray-500 group-hover:bg-[#E8EAFF]'}`}>
                                                <Smartphone className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 block">UPI</span>
                                                <span className="text-xs text-gray-500">PhonePe, GPay, etc.</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label className={`cursor-pointer p-5 border-2 rounded-xl flex items-center gap-3 transition-all group ${paymentMethod === 'card' ? 'border-[#3F53D9] bg-gradient-to-br from-[#E8EAFF] to-white shadow-md' : 'border-[#E8EAFF] hover:border-[#3F53D9]/50 hover:shadow-sm'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="card" 
                                            checked={paymentMethod === 'card'} 
                                            onChange={() => setPaymentMethod('card')} 
                                            className="text-[#3F53D9] w-5 h-5" 
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${paymentMethod === 'card' ? 'bg-[#3F53D9] text-white' : 'bg-[#F5F3FA] text-gray-500 group-hover:bg-[#E8EAFF]'}`}>
                                                <CreditCard className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 block">Debit/Credit Card</span>
                                                <span className="text-xs text-gray-500">Visa, Mastercard</span>
                                            </div>
                                        </div>
                                    </label>
                                    <label className={`cursor-pointer p-5 border-2 rounded-xl flex items-center gap-3 transition-all group ${paymentMethod === 'cod' ? 'border-[#3F53D9] bg-gradient-to-br from-[#E8EAFF] to-white shadow-md' : 'border-[#E8EAFF] hover:border-[#3F53D9]/50 hover:shadow-sm'}`}>
                                        <input 
                                            type="radio" 
                                            name="payment" 
                                            value="cod" 
                                            checked={paymentMethod === 'cod'} 
                                            onChange={() => setPaymentMethod('cod')} 
                                            className="text-[#3F53D9] w-5 h-5" 
                                        />
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${paymentMethod === 'cod' ? 'bg-[#3F53D9] text-white' : 'bg-[#F5F3FA] text-gray-500 group-hover:bg-[#E8EAFF]'}`}>
                                                <Truck className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="font-semibold text-gray-900 block">Cash on Delivery</span>
                                                <span className="text-xs text-gray-500">Pay when delivered</span>
                                            </div>
                                        </div>
                                    </label>
                                </div>

                                {/* Payment Details Forms */}
                                {paymentMethod === 'upi' && (
                                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">UPI ID</label>
                                        <input
                                            type="text"
                                            placeholder="yourname@upi"
                                            className="w-full p-3 border border-blue-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                            value={paymentDetails.upiId}
                                            onChange={e => setPaymentDetails({ ...paymentDetails, upiId: e.target.value })}
                                        />
                                    </div>
                                )}

                                {paymentMethod === 'card' && (
                                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-200 space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Card Number</label>
                                            <input
                                                type="text"
                                                placeholder="1234 5678 9012 3456"
                                                maxLength={19}
                                                className="w-full p-3 border border-purple-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                value={paymentDetails.cardNumber}
                                                onChange={e => {
                                                    const value = e.target.value.replace(/\s/g, '').replace(/\D/g, '');
                                                    const formatted = value.match(/.{1,4}/g)?.join(' ') || value;
                                                    setPaymentDetails({ ...paymentDetails, cardNumber: formatted });
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Cardholder Name</label>
                                            <input
                                                type="text"
                                                placeholder="John Doe"
                                                className="w-full p-3 border border-purple-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                value={paymentDetails.cardName}
                                                onChange={e => setPaymentDetails({ ...paymentDetails, cardName: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">Expiry</label>
                                                <input
                                                    type="text"
                                                    placeholder="MM/YY"
                                                    maxLength={5}
                                                    className="w-full p-3 border border-purple-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                    value={paymentDetails.expiry}
                                                    onChange={e => {
                                                        let value = e.target.value.replace(/\D/g, '');
                                                        if (value.length >= 2) {
                                                            value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                                        }
                                                        setPaymentDetails({ ...paymentDetails, expiry: value });
                                                    }}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-semibold text-gray-700 mb-2">CVV</label>
                                                <input
                                                    type="text"
                                                    placeholder="123"
                                                    maxLength={3}
                                                    className="w-full p-3 border border-purple-200 rounded-lg bg-white text-black focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                                    value={paymentDetails.cvv}
                                                    onChange={e => setPaymentDetails({ ...paymentDetails, cvv: e.target.value.replace(/\D/g, '').slice(0, 3) })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-xl flex gap-3 text-sm text-green-700 border border-green-200">
                                    <ShieldCheck className="w-5 h-5 shrink-0 text-green-600" />
                                    <p><strong>Secure Payment:</strong> All transactions are encrypted and secure. For demo purposes, payments are processed instantly.</p>
                                </div>
                                <button
                                    onClick={handlePlaceOrder}
                                    disabled={loading || (paymentMethod === 'upi' && !paymentDetails.upiId) || (paymentMethod === 'card' && (!paymentDetails.cardNumber || !paymentDetails.cardName || !paymentDetails.expiry || !paymentDetails.cvv))}
                                    className="w-full py-4 bg-gradient-to-r from-[#3F53D9] to-[#7C74EB] text-white rounded-xl font-bold text-lg hover:shadow-xl hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#3F53D9]/30"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                            Processing Payment...
                                        </>
                                    ) : (
                                        <>
                                            <ShieldCheck className="w-5 h-5" />
                                            Pay ₹{total.toFixed(2)} Securely
                                        </>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Order Summary */}
                <div className="md:col-span-1">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Summary</h3>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 mb-4 scrollbar-thin">
                            {cartItems.map(item => (
                                <div key={item.medicineId} className="flex justify-between items-start text-sm">
                                    <div className="flex gap-2">
                                        <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                            {item.quantity}x
                                        </div>
                                        <span className="text-gray-700 max-w-[140px] truncate">{item.name}</span>
                                    </div>
                                    <span className="font-medium text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        <div className="border-t pt-4 space-y-2">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Delivery</span>
                                <span className="text-green-600">Free</span>
                            </div>
                            <div className="flex justify-between text-xl font-bold text-gray-900 pt-2">
                                <span>Total</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
