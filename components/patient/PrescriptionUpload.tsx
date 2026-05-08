import React, { useState } from 'react';
import { MedicalCard } from '../ui-kit/MedicalCard';
import { MedicalButton } from '../ui-kit/MedicalButton';
import { Upload, Scan, FileText, Check, AlertCircle, Loader2, ShoppingCart } from 'lucide-react';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { searchAPI, marketplaceAPI, type Medicine } from '../../src/services/patientService';

export function PrescriptionUpload() {
    const [image, setImage] = useState<string | null>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [result, setResult] = useState<any>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setResult(null); // Reset prev results
            };
            reader.readAsDataURL(file);
        }
    };

    const handleUpload = async () => {
        if (!image) return;
        setAnalyzing(true);
        setResult(null);

        try {
            const uploadData = await searchAPI.uploadPrescription(image);

            // Check if we got immediate results
            if (uploadData && uploadData.status === 'processed') {
                setResult({
                    extractedMedicines: uploadData.extractedMedicines || [],
                    matches: uploadData.matches || [],
                    recommendations: uploadData.recommendations || null,
                    text: uploadData.extractedText || ''
                });
                setAnalyzing(false);
            } else if (uploadData && uploadData.status === 'processing') {
                // Poll for result (fallback for async processing)
                const pollInterval = setInterval(async () => {
                    try {
                        const result = await fetch(`http://localhost:3001/api/search/prescription/${uploadData.id}`, {
                            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                        });
                        const data = await result.json();

                        if (data.success && data.data.status === 'processed') {
                            clearInterval(pollInterval);
                            setResult({
                                extractedMedicines: data.data.extractedMedicines || [],
                                matches: data.data.suggestions || [],
                                text: data.data.extractedText || ''
                            });
                            setAnalyzing(false);
                        }
                    } catch (e) {
                        console.error('Polling error', e);
                    }
                }, 2000);

                // Timeout after 30s
                setTimeout(() => {
                    clearInterval(pollInterval);
                    if (analyzing) {
                        setAnalyzing(false);
                        alert('Analysis timed out. Please check notifications later.');
                    }
                }, 30000);
            } else if (uploadData) {
                setResult({
                    extractedMedicines: uploadData.extractedMedicines || [],
                    matches: uploadData.matches || [],
                    recommendations: uploadData.recommendations || null,
                    text: uploadData.extractedText || ''
                });
                setAnalyzing(false);
            } else {
                setAnalyzing(false);
                alert('Unexpected response from server. Please try again.');
            }
        } catch (error: any) {
            console.error('Upload failed', error);
            alert(error.response?.data?.message || error.message || 'Failed to analyze prescription. Please try again.');
            setAnalyzing(false);
        }
    };

    const handleBuyMedicine = async (medicine: Medicine) => {
        try {
            // Add directly to cart
            const res = await fetch('http://localhost:3001/api/store/cart', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ medicineId: medicine.id, quantity: 1 })
            });

            const data = await res.json();
            if (data.success) {
                alert(`✅ ${medicine.name} added to cart!`);
            } else {
                alert(data.message || 'Failed to add to cart');
            }
        } catch (error) {
            console.error('Add to cart failed', error);
            alert('Failed to add to cart. Please try again.');
        }
    };

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold text-[#333]">Smart Prescription Reader</h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Upload Section */}
                <div className="space-y-4">
                    <MedicalCard variant="filled" className="bg-white border-2 border-dashed border-[#E8EAFF] p-8 text-center hover:border-[#3F53D9] transition-colors relative">
                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        {image ? (
                            <div className="relative h-64 mx-auto rounded-xl overflow-hidden">
                                <img src={image} alt="Preview" className="h-full w-full object-contain" />
                            </div>
                        ) : (
                            <div className="py-12">
                                <div className="w-16 h-16 bg-[#F5F3FA] rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Upload className="w-8 h-8 text-[#3F53D9]" />
                                </div>
                                <h3 className="font-bold text-[#333] mb-2">Upload Prescription</h3>
                                <p className="text-[#6E6E6E] text-sm">Drop your file here or click to browse</p>
                                <p className="text-xs text-[#6E6E6E] mt-2">Supports JPG, PNG</p>
                            </div>
                        )}
                    </MedicalCard>

                    {image && (
                        <MedicalButton
                            variant="primary"
                            className="w-full"
                            onClick={handleUpload}
                            disabled={analyzing}
                        >
                            {analyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with AI...
                                </>
                            ) : (
                                <>
                                    <Scan className="w-4 h-4 mr-2" /> Analyze Prescription
                                </>
                            )}
                        </MedicalButton>
                    )}
                </div>

                {/* Results Section */}
                <div>
                    {result ? (
                        <MedicalCard variant="filled" className="bg-white border text-left h-full">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-[#3F53D9]" /> Analysis Result
                            </h3>

                            <div className="space-y-4">
                                {result.extractedMedicines && result.extractedMedicines.length > 0 && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[#6E6E6E] uppercase mb-2 flex items-center gap-2">
                                            <FileText className="w-4 h-4" />
                                            Detected Medicines ({result.extractedMedicines.length})
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {result.extractedMedicines.map((med: string, i: number) => (
                                                <span key={i} className="px-3 py-1.5 bg-gradient-to-r from-[#F0EDFF] to-[#E8EAFF] text-[#3F53D9] rounded-full text-sm font-medium border border-[#3F53D9]/20">
                                                    {med}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.recommendations && result.recommendations.recommendedMedicines && result.recommendations.recommendedMedicines.length > 0 && (
                                    <div className="mb-6">
                                        <h4 className="text-sm font-bold text-[#6E6E6E] uppercase mb-3 flex items-center gap-2">
                                            <span className="text-lg">💡</span>
                                            Recommended Medicines ({result.recommendations.detectedKeywords?.length || 0} conditions detected)
                                        </h4>
                                        <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                                            {result.recommendations.recommendedMedicines.map((med: any) => (
                                                <div key={med.id} className="flex gap-3 bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg border border-blue-200 hover:shadow-md transition-all group">
                                                    <ImageWithFallback
                                                        src={med.image || `https://via.placeholder.com/200?text=${encodeURIComponent(med.name)}`}
                                                        className="w-16 h-16 rounded-lg bg-white object-contain border border-blue-200 group-hover:scale-105 transition-transform"
                                                    />
                                                    <div className="flex-1">
                                                        <div className="font-bold text-sm text-gray-900 mb-1">{med.name}</div>
                                                        <div className="text-xs text-blue-600 mb-1">{med.reason || `For ${med.recommendedFor}`}</div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="text-[#3F53D9] font-bold">₹{med.price}</div>
                                                            <MedicalButton
                                                                variant="primary"
                                                                size="sm"
                                                                onClick={() => handleBuyMedicine(med)}
                                                                className="text-xs"
                                                            >
                                                                <ShoppingCart className="w-3 h-3 mr-1" />
                                                                Add to Cart
                                                            </MedicalButton>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {result.matches && result.matches.length > 0 ? (
                                    <div>
                                        <h4 className="text-sm font-bold text-[#6E6E6E] uppercase mb-3 flex items-center gap-2">
                                            <ShoppingCart className="w-4 h-4" />
                                            Available in Store ({result.matches.reduce((sum: number, m: any) => sum + (m.matchedMedicines?.length || 0), 0)})
                                        </h4>
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {result.matches.map((match: any, i: number) => (
                                                <div key={i} className="bg-gradient-to-br from-[#F5F3FA] to-white p-4 rounded-xl border border-[#E8EAFF] hover:border-[#3F53D9]/30 transition-all">
                                                    <div className="text-xs text-[#6E6E6E] mb-2 font-medium">
                                                        📋 Detected: <span className="text-[#3F53D9] font-semibold">"{match.extractedName}"</span>
                                                    </div>
                                                    {match.matchedMedicines && match.matchedMedicines.map((med: any) => (
                                                        <div key={med.id} className="flex gap-3 mt-3 bg-white p-4 rounded-lg border border-[#E8EAFF] hover:shadow-md hover:border-[#3F53D9]/50 transition-all group">
                                                            <ImageWithFallback
                                                                src={med.image || `https://via.placeholder.com/200?text=${encodeURIComponent(med.name)}`}
                                                                className="w-20 h-20 rounded-lg bg-gray-100 object-contain border border-gray-200 group-hover:scale-105 transition-transform"
                                                            />
                                                            <div className="flex-1 flex flex-col justify-between">
                                                                <div>
                                                                    <div className="font-bold text-sm text-gray-900 mb-1">{med.name}</div>
                                                                    <div className="text-xs text-[#6E6E6E] mb-2">{med.category || 'General'}</div>
                                                                    <div className="flex items-center gap-3">
                                                                        <div className="text-[#3F53D9] font-bold text-lg">₹{med.price}</div>
                                                                        {med.stock !== undefined && (
                                                                            <span className={`text-xs px-2 py-1 rounded-full ${med.stock > 10 ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                                                                {med.stock > 10 ? 'In Stock' : `Only ${med.stock} left`}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <MedicalButton
                                                                    variant="primary"
                                                                    size="sm"
                                                                    onClick={() => handleBuyMedicine(med)}
                                                                    className="text-xs mt-2 w-full"
                                                                >
                                                                    <ShoppingCart className="w-3 h-3 mr-1" />
                                                                    Add to Cart
                                                                </MedicalButton>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-8 text-[#6E6E6E]">
                                        <p>No matching medicines found in store.</p>
                                        <p className="text-xs mt-2">Try uploading a clearer image or check the medicine names.</p>
                                    </div>
                                )}
                            </div>
                        </MedicalCard>
                    ) : (
                        <div className="h-full flex items-center justify-center p-8 text-center text-[#6E6E6E] bg-[#FAFBFF] rounded-2xl border-2 border-dashed border-[#E8EAFF]">
                            <div>
                                <Scan className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p>Upload a prescription to see AI analysis results here.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
