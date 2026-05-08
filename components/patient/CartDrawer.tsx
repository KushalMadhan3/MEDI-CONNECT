
import React from 'react';
import { X, Minus, Plus, ShoppingBag, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CartItem {
    medicineId: string;
    name: string;
    price: number;
    image: string;
    quantity: number;
}

interface CartDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    items: CartItem[];
    onUpdateQuantity: (id: string, qty: number) => void;
    total: number;
    onCheckout: () => void;
}

export default function CartDrawer({ isOpen, onClose, items, onUpdateQuantity, total, onCheckout }: CartDrawerProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <div className="absolute inset-y-0 right-0 w-full max-w-md bg-white shadow-xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="p-6 border-b flex items-center justify-between bg-primary/5">
                    <div className="flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-primary" />
                        <h2 className="text-xl font-bold text-gray-800">Your Cart ({items.length})</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center">
                                <ShoppingBag className="w-10 h-10 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900">Your cart is empty</h3>
                            <p className="text-gray-500 max-w-xs">Looks like you haven't added any medicines yet. Browse our store to find what you need.</p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Start Shopping
                            </button>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.medicineId} className="flex gap-4 p-4 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary/20 transition-all">
                                <img
                                    src={(() => {
                                        // Generate local SVG placeholder if no image
                                        const generatePlaceholder = (text: string) => {
                                            const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                                                <rect width="100%" height="100%" fill="#E8EAFF"/>
                                                <text x="50%" y="50%" font-family="Arial" font-size="10" fill="#3F53D9" 
                                                      text-anchor="middle" dominant-baseline="middle" font-weight="bold">
                                                    ${text.length > 8 ? text.substring(0, 8) + '...' : text}
                                                </text>
                                            </svg>`;
                                            return `data:image/svg+xml;base64,${btoa(svg)}`;
                                        };
                                        
                                        if (!item.image) {
                                            return generatePlaceholder(item.name || 'Medicine');
                                        }
                                        // Properly encode the image path
                                        if (item.image.startsWith('http://') || item.image.startsWith('https://')) {
                                            return item.image;
                                        }
                                        // Encode each segment of the path
                                        return item.image.split('/').map(part => part ? encodeURIComponent(part) : part).join('/');
                                    })()}
                                    alt={item.name}
                                    className="w-20 h-20 object-cover rounded-lg bg-white"
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        // Use local SVG placeholder
                                        const svg = `<svg width="80" height="80" xmlns="http://www.w3.org/2000/svg">
                                            <rect width="100%" height="100%" fill="#E8EAFF"/>
                                            <text x="50%" y="50%" font-family="Arial" font-size="10" fill="#3F53D9" 
                                                  text-anchor="middle" dominant-baseline="middle" font-weight="bold">
                                                ${(item.name || 'Medicine').length > 8 ? (item.name || 'Medicine').substring(0, 8) + '...' : (item.name || 'Medicine')}
                                            </text>
                                        </svg>`;
                                        target.src = `data:image/svg+xml;base64,${btoa(svg)}`;
                                    }}
                                />
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h4 className="font-semibold text-gray-900 text-sm">{item.name}</h4>
                                        <p className="text-primary font-bold mt-1">₹{item.price}</p>
                                    </div>
                                    <div className="flex items-center justify-start mt-2">
                                        <div className="flex items-center gap-3 bg-white border rounded-lg px-2 py-1">
                                            <button
                                                onClick={() => onUpdateQuantity(item.medicineId, item.quantity - 1)}
                                                className="p-1 hover:text-primary transition-colors"
                                                disabled={item.quantity <= 1}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </button>
                                            <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                                            <button
                                                onClick={() => onUpdateQuantity(item.medicineId, item.quantity + 1)}
                                                className="p-1 hover:text-primary transition-colors"
                                            >
                                                <Plus className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer */}
                {items.length > 0 && (
                    <div className="p-6 border-t bg-gray-50">
                        <div className="space-y-3 mb-6">
                            <div className="flex justify-between text-gray-600">
                                <span>Subtotal</span>
                                <span>₹{total.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>Shipping</span>
                                <span className="text-green-600 font-medium">Free</span>
                            </div>
                            <div className="pt-3 border-t border-dashed flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-900">Total</span>
                                <span className="text-2xl font-bold text-primary">₹{total.toFixed(2)}</span>
                            </div>
                        </div>
                        <button
                            onClick={onCheckout}
                            className="w-full py-4 bg-primary text-black rounded-xl font-bold text-lg hover:bg-primary/90 flex items-center justify-center gap-2 transform transition-all hover:translate-y-[-2px] shadow-lg shadow-primary/25"
                        >
                            Checkout Securely <ArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
