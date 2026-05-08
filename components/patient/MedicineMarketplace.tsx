
import React, { useState, useEffect, useMemo } from 'react';
import { Search, ShoppingCart, Plus, Star, Loader2, Filter, X, SlidersHorizontal } from 'lucide-react';
import { marketplaceAPI } from '../../src/services/patientService';
import CartDrawer from './CartDrawer';
import CheckoutPage from './CheckoutPage';

// Generate a simple SVG placeholder as data URI (works offline)
function generatePlaceholder(text: string, width: number = 400, height: number = 400): string {
    const svg = `
        <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#E8EAFF"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#3F53D9" 
                  text-anchor="middle" dominant-baseline="middle" font-weight="bold">
                ${text.length > 20 ? text.substring(0, 20) + '...' : text}
            </text>
        </svg>
    `.trim();
    return `data:image/svg+xml;base64,${btoa(svg)}`;
}

// Helper function to properly encode image URLs
function getImageUrl(imagePath: string | undefined, fallbackText: string = 'Medicine'): string {
    if (!imagePath) {
        return generatePlaceholder(fallbackText);
    }
    
    // If it's already a full URL, return as is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }
    
    // For relative paths, the browser will handle encoding automatically
    return imagePath;
}

interface Medicine {
    id: string;
    name: string;
    category: string;
    price: number;
    description: string;
    stock: number;
    image: string;
}

export default function MedicineMarketplace() {
    const [medicines, setMedicines] = useState<Medicine[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [loading, setLoading] = useState(true);
    const [cart, setCart] = useState<any[]>([]);
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [view, setView] = useState<'market' | 'checkout'>('market');
    
    // Advanced filters
    const [showFilters, setShowFilters] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
    const [maxPrice, setMaxPrice] = useState(10000);
    const [sortBy, setSortBy] = useState<'name' | 'price-low' | 'price-high' | 'stock'>('name');
    const [inStockOnly, setInStockOnly] = useState(false);

    useEffect(() => {
        fetchMedicines();
        fetchCart();
    }, []);

    const fetchMedicines = async () => {
        setLoading(true);
        try {
            const data = await marketplaceAPI.getMedicines({});
            setMedicines(data);
            // Calculate max price for filter
            if (data.length > 0) {
                const max = Math.max(...data.map((m: Medicine) => m.price));
                setMaxPrice(Math.ceil(max / 100) * 100); // Round to nearest 100
                setPriceRange([0, Math.ceil(max / 100) * 100]);
            }
        } catch (error) {
            console.error('Failed to fetch medicines', error);
        } finally {
            setLoading(false);
        }
    };

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(medicines.map(m => m.category));
        return ['All', ...Array.from(cats)];
    }, [medicines]);

    // Filtered and sorted medicines
    const filteredMedicines = useMemo(() => {
        let filtered = medicines.filter(m => {
            // Category filter
            const categoryMatch = selectedCategory === 'All' || m.category === selectedCategory;
            
            // Search filter
            const searchMatch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              m.description.toLowerCase().includes(searchTerm.toLowerCase());
            
            // Price range filter
            const priceMatch = m.price >= priceRange[0] && m.price <= priceRange[1];
            
            // Stock filter
            const stockMatch = !inStockOnly || m.stock > 0;
            
            return categoryMatch && searchMatch && priceMatch && stockMatch;
        });

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'price-low':
                    return a.price - b.price;
                case 'price-high':
                    return b.price - a.price;
                case 'stock':
                    return b.stock - a.stock;
                case 'name':
                default:
                    return a.name.localeCompare(b.name);
            }
        });

        return filtered;
    }, [medicines, selectedCategory, searchTerm, priceRange, inStockOnly, sortBy]);

    const fetchCart = async () => {
        try {
            const res = await fetch('http://localhost:3001/api/store/cart', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
            });
            const data = await res.json();
            if (data.success) setCart(data.data.items || []);
        } catch (error) {
            console.error('Failed to fetch cart', error);
        }
    };

    const addToCart = async (medicine: Medicine) => {
        if (!medicine || !medicine.id) {
            console.error('Invalid medicine data');
            return;
        }
        
        try {
            const existing = cart.find(i => i.medicineId === medicine.id);
            const qty = existing ? existing.quantity + 1 : 1;

            const res = await fetch('http://localhost:3001/api/store/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ medicineId: medicine.id, quantity: qty })
            });

            const data = await res.json();
            
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to add to cart');
            }

            await fetchCart();
            setIsCartOpen(true);
        } catch (error: any) {
            console.error('Failed to add to cart', error);
            alert(error.message || 'Failed to add item to cart. Please try again.');
        }
    };

    const updateQuantity = async (id: string, qty: number) => {
        // Prevent removing items - minimum quantity is 1
        if (qty < 1 || !id) return;
        
        try {
            const res = await fetch('http://localhost:3001/api/store/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ medicineId: id, quantity: qty })
            });
            
            const data = await res.json();
            if (!res.ok || !data.success) {
                throw new Error(data.message || 'Failed to update quantity');
            }
            
            await fetchCart();
        } catch (error: any) {
            console.error('Failed to update cart', error);
            alert(error.message || 'Failed to update quantity. Please try again.');
        }
    };


    const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (view === 'checkout') {
        return (
            <CheckoutPage
                cartItems={cart}
                total={cartTotal}
                onOrderPlaced={() => {
                    setCart([]);
                    setView('market');
                    fetchCart();
                }}
                onBack={() => setView('market')}
            />
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Medicine Store</h2>
                    <p className="text-gray-500">Quality medicines at best prices</p>
                </div>
                <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative p-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all group"
                >
                    <ShoppingCart className="w-6 h-6 text-gray-600 group-hover:text-primary transition-colors" />
                    {cart.length > 0 && (
                        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                            {cart.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
                <div className="flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search medicines by name or description..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 bg-white text-black border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        />
                    </div>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer min-w-[180px]"
                    >
                        {categories.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                        ))}
                    </select>
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as any)}
                        className="px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none cursor-pointer min-w-[160px]"
                    >
                        <option value="name">Sort by Name</option>
                        <option value="price-low">Price: Low to High</option>
                        <option value="price-high">Price: High to Low</option>
                        <option value="stock">Stock: High to Low</option>
                    </select>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-3 bg-white border border-gray-200 rounded-xl hover:shadow-md transition-all flex items-center gap-2 ${
                            showFilters ? 'bg-primary/10 border-primary' : ''
                        }`}
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                        Filters
                    </button>
                </div>

                {/* Advanced Filters Panel */}
                {showFilters && (
                    <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Filter className="w-5 h-5" />
                                Advanced Filters
                            </h3>
                            <button
                                onClick={() => setShowFilters(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Price Range */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Price Range: ₹{priceRange[0]} - ₹{priceRange[1]}
                                </label>
                                <div className="space-y-2">
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxPrice}
                                        value={priceRange[0]}
                                        onChange={(e) => setPriceRange([parseInt(e.target.value), priceRange[1]])}
                                        className="w-full"
                                    />
                                    <input
                                        type="range"
                                        min="0"
                                        max={maxPrice}
                                        value={priceRange[1]}
                                        onChange={(e) => setPriceRange([priceRange[0], parseInt(e.target.value)])}
                                        className="w-full"
                                    />
                                    <div className="flex justify-between text-xs text-gray-500">
                                        <span>₹0</span>
                                        <span>₹{maxPrice}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Filter */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-3">
                                    Availability
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={inStockOnly}
                                        onChange={(e) => setInStockOnly(e.target.checked)}
                                        className="w-4 h-4 text-primary rounded focus:ring-primary"
                                    />
                                    <span className="text-sm text-gray-700">Show only in-stock items</span>
                                </label>
                            </div>
                        </div>

                        {/* Reset Filters */}
                        <div className="flex justify-end pt-4 border-t border-gray-200">
                            <button
                                onClick={() => {
                                    setPriceRange([0, maxPrice]);
                                    setInStockOnly(false);
                                    setSearchTerm('');
                                    setSelectedCategory('All');
                                    setSortBy('name');
                                }}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Reset All Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Results Count */}
                <div className="text-sm text-gray-600">
                    Showing {filteredMedicines.length} of {medicines.length} medicines
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
            ) : filteredMedicines.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                    <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">No medicines found</p>
                    <p className="text-sm text-gray-500 mt-2">Try adjusting your filters or search terms</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMedicines.map(medicine => (
                            <div key={medicine.id} className="bg-white rounded-2xl border border-gray-100 hover:shadow-xl transition-all duration-300 overflow-hidden group">
                                <div className="h-48 overflow-hidden relative bg-gray-50 flex items-center justify-center p-4">
                                    <img
                                        src={getImageUrl(medicine.image, medicine.name)}
                                        alt={medicine.name}
                                        className="h-full object-contain group-hover:scale-110 transition-transform duration-500"
                                        onError={(e) => {
                                            // Fallback to local SVG placeholder if image fails to load
                                            const target = e.target as HTMLImageElement;
                                            target.src = generatePlaceholder(medicine.name);
                                        }}
                                    />
                                    {medicine.stock < 10 && (
                                        <span className="absolute top-3 right-3 bg-red-100 text-red-600 text-xs font-bold px-2 py-1 rounded-md">
                                            Only {medicine.stock} left
                                        </span>
                                    )}
                                </div>
                                <div className="p-5">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-md uppercase tracking-wide">{medicine.category}</span>
                                        <div className="flex items-center gap-1 text-yellow-400">
                                            <Star className="w-3 h-3 fill-current" />
                                            <span className="text-xs text-gray-500 font-medium">4.8</span>
                                        </div>
                                    </div>
                                    <h3 className="font-bold text-gray-900 mb-1">{medicine.name}</h3>
                                    <p className="text-sm text-gray-500 line-clamp-2 mb-4">{medicine.description}</p>

                                    <div className="flex items-center justify-between mt-auto">
                                        <span className="text-xl font-bold text-gray-900">₹{medicine.price}</span>
                                        <button
                                            onClick={() => addToCart(medicine)}
                                            className="p-3 bg-gradient-to-r from-[#3F53D9] to-[#7C74EB] text-white rounded-xl hover:from-[#3346B8] hover:to-[#6B63D8] transition-colors flex items-center gap-2 shadow-lg shadow-[#3F53D9]/30"
                                        >
                                            <Plus className="w-4 h-4" /> Add
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                </div>
            )}

            <CartDrawer
                isOpen={isCartOpen}
                onClose={() => setIsCartOpen(false)}
                items={cart}
                onUpdateQuantity={updateQuantity}
                total={cartTotal}
                onCheckout={() => {
                    setIsCartOpen(false);
                    setView('checkout');
                }}
            />
        </div>
    );
}
