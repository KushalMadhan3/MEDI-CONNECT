import React, { useState } from 'react';
import { Logo } from '../branding/Logo';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { MedicalInput } from '../ui-kit/MedicalInput';
import { StatusBadge } from '../ui-kit/StatusBadge';
import { 
  Upload, 
  Pill, 
  ShoppingCart, 
  Search,
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  Package
} from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface PharmacyPageProps {
  onNavigate: (page: string) => void;
}

export function PharmacyPage({ onNavigate }: PharmacyPageProps) {
  const [cartItems, setCartItems] = useState<Array<{id: number, name: string, price: number, quantity: number}>>([]);

  const orders = [
    { 
      id: 1, 
      orderNumber: 'ORD-2024-001', 
      date: 'Nov 20, 2024', 
      items: 3, 
      total: 850, 
      status: 'completed' as const 
    },
    { 
      id: 2, 
      orderNumber: 'ORD-2024-002', 
      date: 'Nov 22, 2024', 
      items: 2, 
      total: 450, 
      status: 'pending' as const 
    },
  ];

  const medicines = [
    { id: 1, name: 'Amoxicillin 500mg', type: 'Antibiotic', price: 120, stock: 'In Stock' },
    { id: 2, name: 'Paracetamol 650mg', type: 'Pain Relief', price: 45, stock: 'In Stock' },
    { id: 3, name: 'Vitamin D3 Tablets', type: 'Supplement', price: 280, stock: 'In Stock' },
    { id: 4, name: 'Lisinopril 10mg', type: 'Blood Pressure', price: 95, stock: 'In Stock' },
    { id: 5, name: 'Omeprazole 20mg', type: 'Antacid', price: 135, stock: 'In Stock' },
    { id: 6, name: 'Metformin 500mg', type: 'Diabetes', price: 78, stock: 'In Stock' },
  ];

  const addToCart = (medicine: typeof medicines[0]) => {
    const existing = cartItems.find(item => item.id === medicine.id);
    if (existing) {
      setCartItems(cartItems.map(item => 
        item.id === medicine.id 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCartItems([...cartItems, { ...medicine, quantity: 1 }]);
    }
  };

  const updateQuantity = (id: number, delta: number) => {
    setCartItems(cartItems.map(item => {
      if (item.id === id) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const removeFromCart = (id: number) => {
    setCartItems(cartItems.filter(item => item.id !== id));
  };

  const cartTotal = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-[#F5F3FA]">
      {/* Navigation */}
      <nav className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Logo variant="primary" size="md" />
            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('patient-dashboard')}
                className="flex items-center gap-2 text-[#6E6E6E] hover:text-[#3F53D9]"
              >
                <ArrowLeft className="w-5 h-5" />
                Back to Dashboard
              </button>
              <div className="relative">
                <ShoppingCart className="w-6 h-6 text-[#3F53D9]" />
                {cartItems.length > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-[#E53935] text-white text-xs rounded-full flex items-center justify-center">
                    {cartItems.length}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <h2>Pharmacy</h2>

            {/* Upload Prescription */}
            <MedicalCard variant="pastel">
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-white mx-auto mb-4 flex items-center justify-center">
                  <Upload className="w-8 h-8 text-[#7C74EB]" />
                </div>
                <h3 className="mb-2">Upload Prescription</h3>
                <p className="text-[#6E6E6E] mb-4">
                  Upload your prescription to get medicines delivered to your doorstep
                </p>
                <MedicalButton variant="primary" size="md">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Prescription
                </MedicalButton>
              </div>
            </MedicalCard>

            {/* Search Medicines */}
            <div>
              <h3 className="mb-4">Search Medicines</h3>
              <MedicalInput
                placeholder="Search for medicines, supplements, or health products..."
                icon={<Search className="w-5 h-5" />}
              />
            </div>

            {/* Available Medicines */}
            <div>
              <h3 className="mb-4">Available Medicines</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {medicines.map((medicine) => (
                  <MedicalCard key={medicine.id} variant="filled">
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-xl bg-[#E8EAFF] flex items-center justify-center flex-shrink-0">
                        <Pill className="w-8 h-8 text-[#7C74EB]" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[#333333] mb-1">{medicine.name}</h4>
                        <p className="text-sm text-[#6E6E6E] mb-2">{medicine.type}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-lg font-medium text-[#3F53D9]">₹{medicine.price}</span>
                          <span className="text-xs text-[#4CAF50] bg-[#E8F5E9] px-2 py-1 rounded-full">
                            {medicine.stock}
                          </span>
                        </div>
                        <MedicalButton
                          variant="outlined"
                          size="sm"
                          className="w-full mt-3"
                          onClick={() => addToCart(medicine)}
                        >
                          Add to Cart
                        </MedicalButton>
                      </div>
                    </div>
                  </MedicalCard>
                ))}
              </div>
            </div>

            {/* Order History */}
            <div>
              <h3 className="mb-4">Order History</h3>
              <div className="space-y-3">
                {orders.map((order) => (
                  <MedicalCard key={order.id} variant="outlined">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-[#F0EDFF] flex items-center justify-center">
                          <Package className="w-6 h-6 text-[#7C74EB]" />
                        </div>
                        <div>
                          <h4 className="text-[#333333]">{order.orderNumber}</h4>
                          <div className="flex gap-3 text-sm text-[#6E6E6E] mt-1">
                            <span>{order.date}</span>
                            <span>•</span>
                            <span>{order.items} items</span>
                            <span>•</span>
                            <span className="font-medium">₹{order.total}</span>
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={order.status}>
                        {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                      </StatusBadge>
                    </div>
                  </MedicalCard>
                ))}
              </div>
            </div>
          </div>

          {/* Shopping Cart Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <MedicalCard variant="filled" hover={false}>
                <h3 className="mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  Shopping Cart
                </h3>

                {cartItems.length === 0 ? (
                  <div className="text-center py-8 text-[#6E6E6E]">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>Your cart is empty</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Cart Items */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {cartItems.map((item) => (
                        <div key={item.id} className="bg-[#F5F3FA] rounded-xl p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium text-[#333333] text-sm mb-1">
                                {item.name}
                              </div>
                              <div className="text-sm text-[#3F53D9]">₹{item.price}</div>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="text-[#E53935] hover:bg-[#FFEBEE] p-1 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => updateQuantity(item.id, -1)}
                                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-[#E8EAFF]"
                              >
                                <Minus className="w-4 h-4" />
                              </button>
                              <span className="w-8 text-center font-medium">{item.quantity}</span>
                              <button
                                onClick={() => updateQuantity(item.id, 1)}
                                className="w-7 h-7 rounded-lg bg-white flex items-center justify-center hover:bg-[#E8EAFF]"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            </div>
                            <div className="font-medium">₹{item.price * item.quantity}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Cart Summary */}
                    <div className="border-t border-[#E5E5E5] pt-4 space-y-2">
                      <div className="flex justify-between text-[#6E6E6E]">
                        <span>Subtotal</span>
                        <span>₹{cartTotal}</span>
                      </div>
                      <div className="flex justify-between text-[#6E6E6E]">
                        <span>Delivery</span>
                        <span className="text-[#4CAF50]">Free</span>
                      </div>
                      <div className="flex justify-between font-medium text-lg pt-2 border-t border-[#E5E5E5]">
                        <span>Total</span>
                        <span className="text-[#3F53D9]">₹{cartTotal}</span>
                      </div>
                    </div>

                    <MedicalButton variant="primary" size="lg" className="w-full">
                      Proceed to Checkout
                    </MedicalButton>
                  </div>
                )}
              </MedicalCard>

              {/* Quick Info */}
              <MedicalCard variant="pastel" className="mt-4" hover={false}>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2 text-[#333333]">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      ✓
                    </div>
                    <span>Free delivery on orders above ₹500</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#333333]">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      ✓
                    </div>
                    <span>100% genuine medicines</span>
                  </div>
                  <div className="flex items-center gap-2 text-[#333333]">
                    <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center">
                      ✓
                    </div>
                    <span>Easy returns & refunds</span>
                  </div>
                </div>
              </MedicalCard>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
