import React, { useState } from 'react';
import { Sparkles, Send, Loader2, Star, Briefcase, DollarSign, Stethoscope, User } from 'lucide-react';
import { patientAPI } from '../../src/services/patientService';

interface AIDoctor {
    id: string;
    name: string;
    specialization: string;
    experience: string;
    rating: number;
    consultationPrice: number;
    image: string | null;
}

interface AIResult {
    specializations: string[];
    doctors: AIDoctor[];
    mode: 'llm' | 'keyword' | 'fallback';
    note: string;
}

interface AISymptomAssistantProps {
    onSelectDoctor?: (doctor: AIDoctor) => void;
}

export function AISymptomAssistant({ onSelectDoctor }: AISymptomAssistantProps = {}) {
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AIResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [asked, setAsked] = useState(false);

    const examples = [
        'I have chest pain and my heart races when I climb stairs',
        'My skin has a red itchy rash that won\'t go away',
        'Severe headache and migraine every morning',
        'I\'ve been feeling anxious and can\'t sleep at night'
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const text = query.trim();
        if (!text || loading) return;

        setLoading(true);
        setError(null);
        setResult(null);
        setAsked(true);

        try {
            const data = await patientAPI.recommendDoctor(text);
            setResult(data);
        } catch (err: any) {
            setError(err.message || 'Failed to get recommendations. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#3F53D9] to-[#7C3AED] text-white shadow-lg shadow-[#3F53D9]/20">
                    <Sparkles className="w-5 h-5" />
                </div>
                <div>
                    <h2 className="text-2xl font-bold text-[#333]">AI Symptom Assistant</h2>
                    <p className="text-[#6E6E6E] text-sm mt-0.5">Describe your symptoms — I'll match you to the right specialist</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="relative">
                <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    rows={3}
                    placeholder="Example: I have a bad cough and fever since 3 days, and difficulty breathing..."
                    className="w-full p-4 pr-24 rounded-2xl border-2 border-[#E8EAFF] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#3F53D9]/20 focus:border-[#3F53D9] transition-all resize-none"
                />
                <button
                    type="submit"
                    disabled={loading || !query.trim()}
                    className="absolute bottom-4 right-4 p-3 rounded-xl bg-[#3F53D9] text-white hover:bg-[#3244b8] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
            </form>

            {/* Example chips */}
            <div className="flex flex-wrap gap-2">
                {examples.map((ex) => (
                    <button
                        key={ex}
                        onClick={() => setQuery(ex)}
                        className="px-3 py-1.5 text-xs rounded-full border border-[#E8EAFF] bg-white text-[#6E6E6E] hover:border-[#3F53D9]/50 hover:text-[#3F53D9] transition-all"
                    >
                        {ex.length > 40 ? ex.substring(0, 40) + '...' : ex}
                    </button>
                ))}
            </div>

            {/* Loading */}
            {loading && (
                <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 text-[#3F53D9] animate-spin" />
                    <span className="ml-3 text-[#6E6E6E]">Analyzing your symptoms...</span>
                </div>
            )}

            {/* Error */}
            {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                    {error}
                </div>
            )}

            {/* Result */}
            {result && !loading && (
                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    {/* Mode note */}
                    <div className="flex items-start gap-2 text-xs text-[#6E6E6E] bg-[#F5F3FA] border border-[#E8EAFF] rounded-xl px-4 py-3">
                        <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-[#7C3AED]" />
                        <span>{result.note}</span>
                    </div>

                    {/* Specializations matched */}
                    <div>
                        <h3 className="font-semibold text-[#333] mb-2 text-sm">Recommended specialists</h3>
                        <div className="flex flex-wrap gap-2">
                            {result.specializations.map((s) => (
                                <span key={s} className="px-3 py-1.5 rounded-full bg-[#3F53D9] text-white text-sm font-medium">
                                    {s}
                                </span>
                            ))}
                        </div>
                    </div>

                    {/* Matched doctors */}
                    {result.doctors.length > 0 ? (
                        <div>
                            <h3 className="font-semibold text-[#333] mb-3 text-sm">Available doctors</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {result.doctors.map((doc) => (
                                    <div key={doc.id} className="bg-white border border-[#E8EAFF] rounded-2xl p-4 hover:shadow-md transition-all">
                                        <div className="flex items-start gap-3">
                                            <div className="w-14 h-14 rounded-full bg-[#F5F3FA] flex items-center justify-center overflow-hidden shrink-0">
                                                {doc.image ? (
                                                    <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <User className="w-6 h-6 text-[#3F53D9]" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <h4 className="font-bold text-[#333] truncate">{doc.name}</h4>
                                                <p className="text-[#3F53D9] text-sm font-medium">{doc.specialization}</p>
                                                <div className="flex items-center gap-3 mt-1.5 text-xs text-[#6E6E6E]">
                                                    <span className="flex items-center gap-1">
                                                        <Briefcase className="w-3 h-3" /> {doc.experience}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Star className="w-3 h-3 fill-[#F5A623] text-[#F5A623]" /> {doc.rating}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-sm font-semibold text-[#333]">
                                                        <DollarSign className="inline w-4 h-4 text-[#3F53D9]" /> {doc.consultationPrice}
                                                    </span>
                                                    <button
                                                        onClick={() => onSelectDoctor && onSelectDoctor(doc)}
                                                        className="text-sm font-medium text-[#3F53D9] hover:underline flex items-center gap-1"
                                                    >
                                                        <Stethoscope className="w-4 h-4" /> Book
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 bg-[#F5F3FA] rounded-xl text-[#6E6E6E] text-sm flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-[#3F53D9]" />
                            No active doctors found for this specialization yet. Try browsing all doctors in Find a Specialist.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
