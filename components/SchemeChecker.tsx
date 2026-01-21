'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Search, Filter, MapPin, Heart, DollarSign, FileText, AlertCircle, X, BookOpen, Users, Calendar, CheckCircle, ArrowRight, Sparkles, TrendingUp } from 'lucide-react';
import Papa from 'papaparse';

interface Scheme {
    scheme_name: string;
    slug: string;
    details: string;
    benefits: string;
    eligibility: string;
    application: string;
    documents: string;
    level: string;
    schemeCategory: string;
    tags: string;
    matchScore?: number;
}

interface UserAnswers {
    age: string;
    state: string;
    income: string;
    category: string;
    occupation: string;
    gender: string;
    education: string;
}

export default function SchemeChecker() {
    const [currentStep, setCurrentStep] = useState('home');
    const [schemes, setSchemes] = useState<Scheme[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [savedSchemes, setSavedSchemes] = useState<Set<string>>(new Set());
    const [answers, setAnswers] = useState<UserAnswers>({
        age: '',
        state: '',
        income: '',
        category: '',
        occupation: '',
        gender: '',
        education: '',
    });

    // Load CSV data on mount
    useEffect(() => {
        Papa.parse('/data set.csv', {
            download: true,
            header: true,
            complete: (results) => {
                setSchemes(results.data as Scheme[]);
                setLoading(false);
            },
            error: (error) => {
                console.error('Error loading CSV:', error);
                setLoading(false);
            },
        });

        // Load saved schemes from localStorage
        const saved = localStorage.getItem('savedSchemes');
        if (saved) {
            setSavedSchemes(new Set(JSON.parse(saved)));
        }
    }, []);

    const handleAnswer = (key: keyof UserAnswers, value: string) => {
        setAnswers({ ...answers, [key]: value });
    };

    const toggleSaveScheme = (schemeName: string) => {
        const newSaved = new Set(savedSchemes);
        if (newSaved.has(schemeName)) {
            newSaved.delete(schemeName);
        } else {
            newSaved.add(schemeName);
        }
        setSavedSchemes(newSaved);
        localStorage.setItem('savedSchemes', JSON.stringify([...newSaved]));
    };

    // Smart eligibility matching
    const calculateMatch = (scheme: Scheme): number => {
        let matches = 0;
        let total = 0;

        const eligibilityText = scheme.eligibility?.toLowerCase() || '';
        const detailsText = scheme.details?.toLowerCase() || '';
        const combinedText = eligibilityText + ' ' + detailsText;

        // Age matching
        if (answers.age) {
            total++;
            const age = parseInt(answers.age);
            const ageMatches = combinedText.match(/(\d+)\s*(?:to|-|and)\s*(\d+)\s*years?/g);
            if (ageMatches) {
                const ranges = ageMatches.map(match => {
                    const nums = match.match(/\d+/g);
                    return nums ? nums.map(Number) : [];
                });
                const inRange = ranges.some(([min, max]) => age >= min && age <= max);
                if (inRange) matches++;
            } else if (combinedText.includes('18') || combinedText.includes('above')) {
                if (age >= 18) matches++;
            } else {
                matches += 0.5;
            }
        }

        // State matching
        if (answers.state) {
            total++;
            const stateLower = answers.state.toLowerCase();
            if (
                combinedText.includes(stateLower) ||
                scheme.level?.toLowerCase() === 'central' ||
                scheme.level?.toLowerCase() === 'pan india' ||
                combinedText.includes('all states') ||
                combinedText.includes('entire country')
            ) {
                matches++;
            }
        }

        // Income matching
        if (answers.income) {
            total++;
            const income = parseInt(answers.income);
            const incomeMatches = combinedText.match(/₹?\s*(\d+(?:,\d+)*)\s*(?:rupees|rs|inr)?/gi);
            if (incomeMatches) {
                const amounts = incomeMatches.map(match => {
                    const num = match.replace(/[₹,\s]/g, '').match(/\d+/);
                    return num ? parseInt(num[0]) : 0;
                });
                const maxIncome = Math.max(...amounts.filter(a => a > 1000 && a < 10000000));
                if (maxIncome && income <= maxIncome) {
                    matches++;
                }
            } else {
                matches += 0.3;
            }
        }

        // Category matching
        if (answers.category) {
            total++;
            const categoryLower = answers.category.toLowerCase();
            if (
                combinedText.includes(categoryLower) ||
                combinedText.includes('all categories') ||
                combinedText.includes('general')
            ) {
                matches++;
            } else if (!combinedText.includes('sc') && !combinedText.includes('st') && !combinedText.includes('obc')) {
                matches += 0.5;
            }
        }

        // Occupation matching
        if (answers.occupation) {
            total++;
            const occupationLower = answers.occupation.toLowerCase();
            if (combinedText.includes(occupationLower)) {
                matches++;
            } else if (
                combinedText.includes('all') ||
                combinedText.includes('any') ||
                combinedText.includes('citizen')
            ) {
                matches += 0.5;
            }
        }

        // Gender matching
        if (answers.gender) {
            total++;
            const genderLower = answers.gender.toLowerCase();
            if (
                combinedText.includes(genderLower) ||
                combinedText.includes('women') && genderLower === 'female' ||
                combinedText.includes('mahila') && genderLower === 'female' ||
                !combinedText.includes('women') && !combinedText.includes('female') && !combinedText.includes('male')
            ) {
                matches++;
            }
        }

        if (total === 0) return 50;
        return Math.round((matches / total) * 100);
    };

    const matchedSchemes = useMemo(() => {
        if (schemes.length === 0) return [];
        let filtered = schemes
            .map((scheme) => ({ ...scheme, matchScore: calculateMatch(scheme) }))
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));

        // Apply search filter
        if (searchQuery) {
            filtered = filtered.filter(scheme =>
                scheme.scheme_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                scheme.details?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                scheme.benefits?.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        // Apply category filter
        if (selectedCategory !== 'all') {
            filtered = filtered.filter(scheme =>
                scheme.schemeCategory?.toLowerCase().includes(selectedCategory.toLowerCase())
            );
        }

        return filtered;
    }, [schemes, answers, searchQuery, selectedCategory]);

    const categories = useMemo(() => {
        const cats = new Set<string>();
        schemes.forEach(scheme => {
            if (scheme.schemeCategory) {
                cats.add(scheme.schemeCategory);
            }
        });
        return ['all', ...Array.from(cats)];
    }, [schemes]);

    // Home Screen
    if (currentStep === 'home') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 p-4">
                <div className="max-w-4xl mx-auto pt-12">
                    <div className="text-center mb-12 animate-fade-in">
                        <div className="mb-6">
                            <div className="inline-block mb-4">
                                <span className="text-7xl">🏛️</span>
                            </div>
                            <h1 className="text-6xl font-bold text-white mb-3 tracking-tight">
                                Scheme Sahayak
                            </h1>
                            <p className="text-blue-100 text-2xl font-medium mb-2">आपकी योजना, आपका हक</p>
                            <div className="flex items-center justify-center gap-2 mt-4">
                                <Sparkles className="text-yellow-300" size={20} />
                                <p className="text-blue-200 text-lg">
                                    Discover benefits you deserve
                                </p>
                                <Sparkles className="text-yellow-300" size={20} />
                            </div>
                        </div>
                        <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto leading-relaxed">
                            Answer a few simple questions to discover <span className="font-bold text-white">{schemes.length > 0 ? schemes.length.toLocaleString() : '3,400+'}</span> government schemes you can apply for
                        </p>

                        <button
                            onClick={() => setCurrentStep('questionnaire')}
                            disabled={loading}
                            className="group bg-white text-blue-700 px-10 py-5 rounded-2xl font-bold text-xl hover:bg-blue-50 transition-all inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl hover:shadow-3xl hover:scale-105 transform"
                        >
                            {loading ? (
                                <>
                                    <div className="animate-pulse-slow">Loading Schemes...</div>
                                </>
                            ) : (
                                <>
                                    Start Now
                                    <ChevronRight size={28} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 animate-fade-in">
                        {[
                            { icon: '✓', title: 'No Hidden Charges', desc: 'Completely free. No agents needed.', color: 'from-green-500 to-emerald-600' },
                            { icon: '🔒', title: 'Your Privacy Protected', desc: 'Your data is not saved. We don\'t share information.', color: 'from-purple-500 to-indigo-600' },
                            { icon: '⚡', title: 'Takes 5 Minutes', desc: 'Simple questions, instant results.', color: 'from-orange-500 to-red-600' }
                        ].map((item, idx) => (
                            <div key={idx} className="group bg-white bg-opacity-10 backdrop-blur-lg p-8 rounded-2xl text-white border border-white border-opacity-20 hover:bg-opacity-20 transition-all hover:scale-105 transform">
                                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">{item.icon}</div>
                                <h3 className="font-bold text-xl mb-3">{item.title}</h3>
                                <p className="text-blue-100 leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white bg-opacity-10 backdrop-blur-lg p-6 rounded-2xl text-white border border-white border-opacity-20 animate-fade-in">
                        <div className="flex items-center justify-center gap-3">
                            <CheckCircle className="text-green-300" size={24} />
                            <p className="text-lg">
                                <strong className="text-white">Real Data:</strong> {schemes.length > 0 ? `${schemes.length.toLocaleString()} verified schemes` : 'Loading...'} from Central and State Governments
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Questionnaire Screen
    if (currentStep === 'questionnaire') {
        const progress = Object.values(answers).filter(v => v !== '').length;
        const totalFields = 7;
        const progressPercent = (progress / totalFields) * 100;

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
                <div className="max-w-3xl mx-auto pt-8">
                    <button
                        onClick={() => setCurrentStep('home')}
                        className="text-blue-600 mb-6 hover:text-blue-800 font-semibold flex items-center gap-2 group"
                    >
                        <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
                        Back to Home
                    </button>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-sm font-semibold text-gray-600">Progress</span>
                            <span className="text-sm font-semibold text-blue-600">{progress} of {totalFields} completed</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progressPercent}%` }}
                            />
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-2xl p-10 border border-gray-100">
                        <div className="mb-8">
                            <h2 className="text-4xl font-bold mb-3 text-gray-800 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                Tell Us About Yourself
                            </h2>
                            <p className="text-gray-600 text-lg">We'll match you with schemes from <span className="font-bold text-blue-600">{schemes.length.toLocaleString()}</span> government programs</p>
                        </div>

                        <div className="space-y-6">
                            {/* Age */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <Users size={18} className="text-blue-600" />
                                    How old are you? <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter your age (e.g., 25)"
                                    value={answers.age}
                                    onChange={(e) => handleAnswer('age', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                />
                            </div>

                            {/* State */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <MapPin size={18} className="text-blue-600" />
                                    Which state are you in? <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={answers.state}
                                    onChange={(e) => handleAnswer('state', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                >
                                    <option value="">Select your state</option>
                                    <option value="Andhra Pradesh">Andhra Pradesh</option>
                                    <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                    <option value="Assam">Assam</option>
                                    <option value="Bihar">Bihar</option>
                                    <option value="Chhattisgarh">Chhattisgarh</option>
                                    <option value="Goa">Goa</option>
                                    <option value="Gujarat">Gujarat</option>
                                    <option value="Haryana">Haryana</option>
                                    <option value="Himachal Pradesh">Himachal Pradesh</option>
                                    <option value="Jharkhand">Jharkhand</option>
                                    <option value="Karnataka">Karnataka</option>
                                    <option value="Kerala">Kerala</option>
                                    <option value="Madhya Pradesh">Madhya Pradesh</option>
                                    <option value="Maharashtra">Maharashtra</option>
                                    <option value="Manipur">Manipur</option>
                                    <option value="Meghalaya">Meghalaya</option>
                                    <option value="Mizoram">Mizoram</option>
                                    <option value="Nagaland">Nagaland</option>
                                    <option value="Odisha">Odisha</option>
                                    <option value="Punjab">Punjab</option>
                                    <option value="Rajasthan">Rajasthan</option>
                                    <option value="Sikkim">Sikkim</option>
                                    <option value="Tamil Nadu">Tamil Nadu</option>
                                    <option value="Telangana">Telangana</option>
                                    <option value="Tripura">Tripura</option>
                                    <option value="Uttar Pradesh">Uttar Pradesh</option>
                                    <option value="Uttarakhand">Uttarakhand</option>
                                    <option value="West Bengal">West Bengal</option>
                                    <option value="Puducherry">Puducherry</option>
                                    <option value="Jammu and Kashmir">Jammu and Kashmir</option>
                                    <option value="Delhi">Delhi</option>
                                </select>
                            </div>

                            {/* Annual Income */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                                    <DollarSign size={18} className="text-blue-600" />
                                    Annual Family Income (₹)
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g., 200000"
                                    value={answers.income}
                                    onChange={(e) => handleAnswer('income', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                />
                                <p className="text-sm text-gray-500 mt-2 ml-1">Leave blank if not sure</p>
                            </div>

                            {/* Gender */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Gender</label>
                                <select
                                    value={answers.gender}
                                    onChange={(e) => handleAnswer('gender', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Occupation */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3">What is your occupation?</label>
                                <select
                                    value={answers.occupation}
                                    onChange={(e) => handleAnswer('occupation', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                >
                                    <option value="">Select occupation</option>
                                    <option value="Student">Student</option>
                                    <option value="Fisherman">Fisherman</option>
                                    <option value="Farmer">Farmer</option>
                                    <option value="Construction Worker">Construction Worker</option>
                                    <option value="Businessman">Small Business Owner</option>
                                    <option value="Salaried">Salaried Employee</option>
                                    <option value="Unemployed">Unemployed</option>
                                    <option value="Self Employed">Self Employed</option>
                                    <option value="Daily Wage Worker">Daily Wage Worker</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div className="group">
                                <label className="block text-sm font-bold text-gray-700 mb-3">Social Category</label>
                                <select
                                    value={answers.category}
                                    onChange={(e) => handleAnswer('category', e.target.value)}
                                    className="w-full px-5 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all text-lg group-hover:border-gray-300"
                                >
                                    <option value="">Select category</option>
                                    <option value="General">General</option>
                                    <option value="OBC">OBC</option>
                                    <option value="SC">SC</option>
                                    <option value="ST">ST</option>
                                    <option value="EWS">EWS</option>
                                </select>
                            </div>
                        </div>

                        <button
                            onClick={() => setCurrentStep('results')}
                            disabled={!answers.age || !answers.state}
                            className="group w-full mt-10 bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-5 rounded-xl font-bold hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xl shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                        >
                            Find Schemes for Me
                            <ArrowRight size={24} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                        {(!answers.age || !answers.state) && (
                            <p className="text-center text-sm text-red-500 mt-3 font-medium">Please fill age and state to continue</p>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Results Screen
    if (currentStep === 'results') {
        const eligible = matchedSchemes.filter((s) => (s.matchScore || 0) >= 70);
        const partial = matchedSchemes.filter((s) => (s.matchScore || 0) >= 40 && (s.matchScore || 0) < 70);

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
                <div className="max-w-6xl mx-auto pt-8">
                    <div className="flex flex-wrap gap-4 mb-8">
                        <button
                            onClick={() => setCurrentStep('questionnaire')}
                            className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-2 group"
                        >
                            <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
                            Edit Answers
                        </button>
                        <button
                            onClick={() => {
                                setCurrentStep('home');
                                setAnswers({
                                    age: '',
                                    state: '',
                                    income: '',
                                    category: '',
                                    occupation: '',
                                    gender: '',
                                    education: '',
                                });
                                setSearchQuery('');
                                setSelectedCategory('all');
                            }}
                            className="text-gray-600 hover:text-gray-800 font-semibold ml-auto"
                        >
                            Start Over
                        </button>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-8 rounded-2xl mb-8 shadow-2xl animate-fade-in">
                        <div className="flex items-center gap-3 mb-4">
                            <TrendingUp size={32} />
                            <h1 className="text-4xl font-bold">Your Results</h1>
                        </div>
                        <p className="text-blue-100 mb-6 text-xl">
                            Found <strong className="text-white text-2xl">{eligible.length}</strong> schemes you can apply for right now
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-5 border border-white border-opacity-30">
                                <div className="text-3xl font-bold mb-1">{eligible.length}</div>
                                <div className="text-sm text-blue-100 font-medium">Eligible Schemes</div>
                            </div>
                            <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-5 border border-white border-opacity-30">
                                <div className="text-3xl font-bold mb-1">{partial.length}</div>
                                <div className="text-sm text-blue-100 font-medium">Partial Matches</div>
                            </div>
                            <div className="bg-white bg-opacity-20 backdrop-blur rounded-xl p-5 border border-white border-opacity-30">
                                <div className="text-3xl font-bold mb-1">{matchedSchemes.length}</div>
                                <div className="text-sm text-blue-100 font-medium">Total Analyzed</div>
                            </div>
                        </div>
                    </div>

                    {/* Search and Filter */}
                    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search schemes by name or benefits..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all"
                                />
                            </div>
                            <div className="relative">
                                <Filter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                                <select
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 transition-all appearance-none"
                                >
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>
                                            {cat === 'all' ? 'All Categories' : cat}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    {eligible.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-3xl font-bold text-green-700 mb-6 flex items-center gap-3">
                                <CheckCircle size={32} />
                                Schemes You Can Apply For ({eligible.length})
                            </h2>
                            <div className="grid grid-cols-1 gap-6">
                                {eligible.slice(0, 20).map((scheme, idx) => (
                                    <SchemeCard
                                        key={idx}
                                        scheme={scheme}
                                        onDetails={() => setCurrentStep(`details-${idx}`)}
                                        isSaved={savedSchemes.has(scheme.scheme_name)}
                                        onToggleSave={() => toggleSaveScheme(scheme.scheme_name)}
                                    />
                                ))}
                            </div>
                            {eligible.length > 20 && (
                                <p className="text-center text-gray-600 mt-6 text-lg">
                                    Showing top 20 of {eligible.length} eligible schemes
                                </p>
                            )}
                        </div>
                    )}

                    {partial.length > 0 && (
                        <div className="mb-12">
                            <h2 className="text-3xl font-bold text-amber-700 mb-6 flex items-center gap-3">
                                <AlertCircle size={32} />
                                Almost Eligible ({partial.length})
                            </h2>
                            <p className="text-gray-600 mb-6 text-lg">
                                You might qualify for these if you meet additional criteria
                            </p>
                            <div className="grid grid-cols-1 gap-6">
                                {partial.slice(0, 10).map((scheme, idx) => (
                                    <SchemeCard
                                        key={idx}
                                        scheme={scheme}
                                        onDetails={() => setCurrentStep(`details-${eligible.length + idx}`)}
                                        isSaved={savedSchemes.has(scheme.scheme_name)}
                                        onToggleSave={() => toggleSaveScheme(scheme.scheme_name)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {eligible.length === 0 && partial.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-2xl shadow-lg">
                            <AlertCircle size={80} className="mx-auto text-gray-300 mb-6" />
                            <h3 className="text-2xl font-bold text-gray-700 mb-3">No exact matches found</h3>
                            <p className="text-gray-600 mb-6 text-lg max-w-md mx-auto">
                                Try adjusting your answers or check back later as new schemes are added regularly
                            </p>
                            <button
                                onClick={() => setCurrentStep('questionnaire')}
                                className="bg-blue-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-blue-700 transition-all shadow-lg"
                            >
                                Update Your Answers
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Details Screen
    const detailsMatch = currentStep.match(/^details-(\d+)$/);
    if (detailsMatch) {
        const schemeIndex = parseInt(detailsMatch[1]);
        const scheme = matchedSchemes[schemeIndex];

        if (!scheme) return null;

        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
                <div className="max-w-5xl mx-auto pt-8">
                    <button
                        onClick={() => setCurrentStep('results')}
                        className="text-blue-600 mb-6 hover:text-blue-800 font-semibold flex items-center gap-2 group"
                    >
                        <ChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" size={20} />
                        Back to Results
                    </button>

                    <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                        {/* Header Section */}
                        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className={`inline-block px-6 py-3 rounded-full font-bold text-lg ${(scheme.matchScore || 0) >= 70
                                            ? 'bg-green-400 text-green-900'
                                            : 'bg-amber-400 text-amber-900'
                                        }`}
                                >
                                    {(scheme.matchScore || 0) >= 70 ? '✓ Eligible' : '⚠ Partial Match'} - {scheme.matchScore}%
                                </div>
                                <button
                                    onClick={() => toggleSaveScheme(scheme.scheme_name)}
                                    className="p-3 rounded-full bg-white bg-opacity-20 hover:bg-opacity-30 transition-all"
                                >
                                    <Heart
                                        size={24}
                                        className={savedSchemes.has(scheme.scheme_name) ? 'fill-red-400 text-red-400' : 'text-white'}
                                    />
                                </button>
                            </div>

                            <h1 className="text-4xl font-bold mb-4 leading-tight">{scheme.scheme_name}</h1>

                            <div className="flex flex-wrap gap-3">
                                <div className="bg-white bg-opacity-20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                                    <MapPin size={18} />
                                    <span className="font-semibold">{scheme.level || 'Not specified'}</span>
                                </div>
                                <div className="bg-white bg-opacity-20 backdrop-blur px-4 py-2 rounded-lg flex items-center gap-2">
                                    <FileText size={18} />
                                    <span className="font-semibold">{scheme.schemeCategory || 'General'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Content Section */}
                        <div className="p-8 space-y-8">
                            {/* About Section */}
                            <section className="border-l-4 border-blue-500 pl-6">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                                    <BookOpen size={28} className="text-blue-600" />
                                    About This Scheme
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                                        {scheme.details || 'Details not available'}
                                    </p>
                                </div>
                            </section>

                            {/* Benefits Section */}
                            <section className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border-2 border-green-200">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                                    <DollarSign size={28} className="text-green-600" />
                                    Benefits You'll Receive
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                                        {scheme.benefits || 'Benefits not specified'}
                                    </p>
                                </div>
                            </section>

                            {/* Eligibility Section */}
                            <section className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-2xl border-2 border-blue-200">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                                    <Users size={28} className="text-blue-600" />
                                    Who Can Apply
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                                        {scheme.eligibility || 'Eligibility criteria not specified'}
                                    </p>
                                </div>
                            </section>

                            {/* Application Process */}
                            <section className="bg-gradient-to-br from-purple-50 to-pink-50 p-6 rounded-2xl border-2 border-purple-200">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                                    <FileText size={28} className="text-purple-600" />
                                    How to Apply
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                                        {scheme.application || 'Application process not specified'}
                                    </p>
                                </div>
                            </section>

                            {/* Documents Section */}
                            <section className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border-2 border-amber-200">
                                <h3 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-3">
                                    <Calendar size={28} className="text-amber-600" />
                                    Documents Needed
                                </h3>
                                <div className="prose prose-lg max-w-none">
                                    <p className="text-gray-700 leading-relaxed text-lg whitespace-pre-line">
                                        {scheme.documents || 'Document list not available'}
                                    </p>
                                </div>
                            </section>

                            {/* Important Notice */}
                            <div className="bg-gradient-to-r from-amber-100 to-orange-100 border-2 border-amber-300 rounded-2xl p-6">
                                <div className="flex gap-4">
                                    <AlertCircle size={28} className="text-amber-700 flex-shrink-0 mt-1" />
                                    <div>
                                        <h4 className="font-bold text-amber-900 text-lg mb-2">⚠ Important Notice</h4>
                                        <p className="text-amber-800 leading-relaxed">
                                            This information is a guide only. Always verify details with the official department before applying.
                                            <strong> Never pay agents or middlemen for government benefits - they are FREE.</strong>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

function SchemeCard({ scheme, onDetails, isSaved, onToggleSave }: {
    scheme: Scheme;
    onDetails: () => void;
    isSaved: boolean;
    onToggleSave: () => void;
}) {
    const getColor = (score: number) => {
        if (score >= 70) return 'green';
        if (score >= 40) return 'yellow';
        return 'gray';
    };

    const color = getColor(scheme.matchScore || 0);
    const colors = {
        green: 'border-green-300 bg-gradient-to-br from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100',
        yellow: 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-amber-50 hover:from-yellow-100 hover:to-amber-100',
        gray: 'border-gray-300 bg-gradient-to-br from-gray-50 to-slate-50 hover:from-gray-100 hover:to-slate-100',
    };

    const badgeColors = {
        green: 'bg-green-500 text-white',
        yellow: 'bg-yellow-500 text-white',
        gray: 'bg-gray-500 text-white',
    };

    return (
        <div
            className={`border-2 ${colors[color]} rounded-2xl p-6 cursor-pointer hover:shadow-2xl transition-all transform hover:-translate-y-1 animate-fade-in`}
        >
            <div className="flex justify-between items-start mb-4">
                <div className="flex-1" onClick={onDetails}>
                    <h3 className="font-bold text-2xl text-gray-800 mb-3 leading-tight hover:text-blue-600 transition-colors">
                        {scheme.scheme_name}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-sm bg-blue-500 text-white px-3 py-1 rounded-full font-semibold">
                            {scheme.level || 'State'}
                        </span>
                        {scheme.schemeCategory && (
                            <span className="text-sm bg-purple-500 text-white px-3 py-1 rounded-full font-semibold">
                                {scheme.schemeCategory}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3 ml-4">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleSave();
                        }}
                        className="p-2 rounded-full hover:bg-white transition-all"
                    >
                        <Heart
                            size={24}
                            className={isSaved ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-500'}
                        />
                    </button>
                    <div
                        className={`text-center rounded-2xl w-20 h-20 flex items-center justify-center font-bold text-xl ${badgeColors[color]} shadow-lg`}
                    >
                        {scheme.matchScore}%
                    </div>
                </div>
            </div>

            <div onClick={onDetails}>
                {/* Description */}
                <div className="mb-4 bg-white bg-opacity-60 p-4 rounded-xl">
                    <p className="text-gray-700 line-clamp-3 leading-relaxed text-base">
                        {scheme.details?.substring(0, 200)}...
                    </p>
                </div>

                {/* Benefits Preview */}
                {scheme.benefits && (
                    <div className="mb-4 bg-green-100 bg-opacity-70 p-4 rounded-xl border border-green-200">
                        <div className="flex items-start gap-2">
                            <DollarSign size={20} className="text-green-600 flex-shrink-0 mt-1" />
                            <div>
                                <p className="font-semibold text-green-800 text-sm mb-1">Benefits:</p>
                                <p className="text-green-700 line-clamp-2 text-sm leading-relaxed">
                                    {scheme.benefits.substring(0, 120)}...
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="flex justify-end">
                    <button className="group text-blue-600 font-bold flex items-center gap-2 hover:gap-3 transition-all bg-blue-100 px-4 py-2 rounded-lg hover:bg-blue-200">
                        View Full Details
                        <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
