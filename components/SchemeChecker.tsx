'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { ChevronRight, Search, Filter, MapPin, Heart, DollarSign, FileText, AlertCircle } from 'lucide-react';
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
    }, []);

    const handleAnswer = (key: keyof UserAnswers, value: string) => {
        setAnswers({ ...answers, [key]: value });
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
                matches += 0.5; // Partial match if no specific age mentioned
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
                matches += 0.3; // Small boost if no income criteria
            }
        }

        // Category matching (SC/ST/OBC/General)
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
                matches += 0.5; // Partial if no specific category mentioned
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

        if (total === 0) return 50; // Default if no criteria to check
        return Math.round((matches / total) * 100);
    };

    const matchedSchemes = useMemo(() => {
        if (schemes.length === 0) return [];
        return schemes
            .map((scheme) => ({ ...scheme, matchScore: calculateMatch(scheme) }))
            .sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
    }, [schemes, answers]);

    // Home Screen
    if (currentStep === 'home') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-4">
                <div className="max-w-2xl mx-auto pt-12 text-center">
                    <div className="mb-6">
                        <h1 className="text-5xl font-bold text-white mb-2">🏛️ Scheme Sahayak</h1>
                        <p className="text-blue-100 text-xl">आपकी योजना, आपका हक</p>
                    </div>
                    <p className="text-blue-100 text-lg mb-8">
                        Answer a few simple questions to discover {schemes.length > 0 ? schemes.length.toLocaleString() : '3,400+'} government schemes you can apply for
                    </p>

                    <button
                        onClick={() => setCurrentStep('questionnaire')}
                        disabled={loading}
                        className="bg-white text-blue-700 px-8 py-4 rounded-lg font-bold text-lg hover:bg-blue-50 transition inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl"
                    >
                        {loading ? 'Loading Schemes...' : 'Start Now'} <ChevronRight size={24} />
                    </button>

                    <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white border border-white border-opacity-20">
                            <div className="text-3xl mb-2">✓</div>
                            <h3 className="font-bold text-lg mb-2">No Hidden Charges</h3>
                            <p className="text-blue-100">Completely free. No agents needed.</p>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white border border-white border-opacity-20">
                            <div className="text-3xl mb-2">🔒</div>
                            <h3 className="font-bold text-lg mb-2">Your Privacy Protected</h3>
                            <p className="text-blue-100">Your data is not saved. We don't share information.</p>
                        </div>
                        <div className="bg-white bg-opacity-10 backdrop-blur p-6 rounded-lg text-white border border-white border-opacity-20">
                            <div className="text-3xl mb-2">⚡</div>
                            <h3 className="font-bold text-lg mb-2">Takes 5 Minutes</h3>
                            <p className="text-blue-100">Simple questions, instant results.</p>
                        </div>
                    </div>

                    <div className="mt-12 bg-white bg-opacity-10 backdrop-blur p-4 rounded-lg text-white text-sm">
                        <p>
                            <strong>Real Data:</strong> {schemes.length > 0 ? `${schemes.length.toLocaleString()} verified schemes` : 'Loading...'} from Central and State Governments
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // Questionnaire Screen
    if (currentStep === 'questionnaire') {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-2xl mx-auto pt-8">
                    <button
                        onClick={() => setCurrentStep('home')}
                        className="text-blue-600 mb-6 hover:text-blue-800 font-semibold"
                    >
                        ← Back
                    </button>

                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <h2 className="text-2xl font-bold mb-2 text-gray-800">Tell Us About Yourself</h2>
                        <p className="text-gray-600 mb-8">We'll match you with schemes from {schemes.length.toLocaleString()} government programs</p>

                        <div className="space-y-6">
                            {/* Age */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    How old are you? <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    placeholder="Enter your age"
                                    value={answers.age}
                                    onChange={(e) => handleAnswer('age', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                            </div>

                            {/* State */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Which state are you in? <span className="text-red-500">*</span>
                                </label>
                                <select
                                    value={answers.state}
                                    onChange={(e) => handleAnswer('state', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Annual Family Income (₹)
                                </label>
                                <input
                                    type="number"
                                    placeholder="e.g., 200000"
                                    value={answers.income}
                                    onChange={(e) => handleAnswer('income', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                />
                                <p className="text-xs text-gray-500 mt-1">Leave blank if not sure</p>
                            </div>

                            {/* Gender */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Gender</label>
                                <select
                                    value={answers.gender}
                                    onChange={(e) => handleAnswer('gender', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                                >
                                    <option value="">Select gender</option>
                                    <option value="Male">Male</option>
                                    <option value="Female">Female</option>
                                    <option value="Other">Other</option>
                                </select>
                            </div>

                            {/* Occupation */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">What is your occupation?</label>
                                <select
                                    value={answers.occupation}
                                    onChange={(e) => handleAnswer('occupation', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Social Category</label>
                                <select
                                    value={answers.category}
                                    onChange={(e) => handleAnswer('category', e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
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
                            className="w-full mt-8 bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed text-lg"
                        >
                            Find Schemes for Me
                        </button>
                        {(!answers.age || !answers.state) && (
                            <p className="text-center text-sm text-red-500 mt-2">Please fill age and state to continue</p>
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
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-4xl mx-auto pt-8">
                    <div className="flex gap-4 mb-8">
                        <button
                            onClick={() => setCurrentStep('questionnaire')}
                            className="text-blue-600 hover:text-blue-800 font-semibold"
                        >
                            ← Edit Answers
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
                            }}
                            className="text-gray-600 hover:text-gray-800 font-semibold ml-auto"
                        >
                            Start Over
                        </button>
                    </div>

                    {/* Summary Card */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-lg mb-8 shadow-lg">
                        <h1 className="text-3xl font-bold mb-2">Your Results</h1>
                        <p className="text-blue-100 mb-4">
                            Found <strong>{eligible.length}</strong> schemes you can apply for right now
                        </p>
                        <div className="grid grid-cols-3 gap-4 text-center">
                            <div className="bg-white bg-opacity-20 rounded p-3">
                                <div className="text-2xl font-bold">{eligible.length}</div>
                                <div className="text-sm text-blue-100">Eligible</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded p-3">
                                <div className="text-2xl font-bold">{partial.length}</div>
                                <div className="text-sm text-blue-100">Partial Match</div>
                            </div>
                            <div className="bg-white bg-opacity-20 rounded p-3">
                                <div className="text-2xl font-bold">{matchedSchemes.length}</div>
                                <div className="text-sm text-blue-100">Total Checked</div>
                            </div>
                        </div>
                    </div>

                    {eligible.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-green-700 mb-4 flex items-center gap-2">
                                ✓ Schemes You Can Apply For ({eligible.length})
                            </h2>
                            <div className="space-y-4">
                                {eligible.slice(0, 20).map((scheme, idx) => (
                                    <SchemeCard
                                        key={idx}
                                        scheme={scheme}
                                        onDetails={() => setCurrentStep(`details-${idx}`)}
                                    />
                                ))}
                            </div>
                            {eligible.length > 20 && (
                                <p className="text-center text-gray-600 mt-4">
                                    Showing top 20 of {eligible.length} eligible schemes
                                </p>
                            )}
                        </div>
                    )}

                    {partial.length > 0 && (
                        <div className="mb-8">
                            <h2 className="text-2xl font-bold text-amber-700 mb-4 flex items-center gap-2">
                                ⚠ Almost Eligible ({partial.length})
                            </h2>
                            <p className="text-gray-600 mb-4">
                                You might qualify for these if you meet additional criteria
                            </p>
                            <div className="space-y-4">
                                {partial.slice(0, 10).map((scheme, idx) => (
                                    <SchemeCard
                                        key={idx}
                                        scheme={scheme}
                                        onDetails={() => setCurrentStep(`details-${eligible.length + idx}`)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {eligible.length === 0 && partial.length === 0 && (
                        <div className="text-center py-12">
                            <AlertCircle size={64} className="mx-auto text-gray-400 mb-4" />
                            <h3 className="text-xl font-bold text-gray-700 mb-2">No exact matches found</h3>
                            <p className="text-gray-600 mb-4">
                                Try adjusting your answers or check back later as new schemes are added regularly
                            </p>
                            <button
                                onClick={() => setCurrentStep('questionnaire')}
                                className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700"
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
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-4xl mx-auto pt-8">
                    <button
                        onClick={() => setCurrentStep('results')}
                        className="text-blue-600 mb-6 hover:text-blue-800 font-semibold"
                    >
                        ← Back to Results
                    </button>

                    <div className="bg-white rounded-lg shadow-lg p-8">
                        <div className="mb-6">
                            <div
                                className={`inline-block px-4 py-2 rounded-full font-bold ${(scheme.matchScore || 0) >= 70
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-amber-100 text-amber-700'
                                    }`}
                            >
                                {(scheme.matchScore || 0) >= 70 ? 'Eligible' : 'Partial Match'} - {scheme.matchScore}%
                            </div>
                        </div>

                        <h1 className="text-3xl font-bold text-gray-800 mb-4">{scheme.scheme_name}</h1>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-blue-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <MapPin size={20} className="text-blue-600" /> Level
                                </h3>
                                <p className="text-lg font-semibold text-blue-600">{scheme.level || 'Not specified'}</p>
                            </div>

                            <div className="bg-purple-50 p-4 rounded-lg">
                                <h3 className="font-bold text-gray-800 mb-2 flex items-center gap-2">
                                    <FileText size={20} className="text-purple-600" /> Category
                                </h3>
                                <p className="text-lg font-semibold text-purple-600">
                                    {scheme.schemeCategory || 'General'}
                                </p>
                            </div>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">About This Scheme</h3>
                            <p className="text-gray-700 whitespace-pre-line">{scheme.details || 'Details not available'}</p>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <DollarSign size={24} className="text-green-600" /> Benefits
                            </h3>
                            <div className="bg-green-50 p-4 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-line">{scheme.benefits || 'Benefits not specified'}</p>
                            </div>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Who Can Apply</h3>
                            <p className="text-gray-700 whitespace-pre-line">{scheme.eligibility || 'Eligibility criteria not specified'}</p>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">How to Apply</h3>
                            <p className="text-gray-700 whitespace-pre-line">{scheme.application || 'Application process not specified'}</p>
                        </div>

                        <div className="border-t pt-6 mb-6">
                            <h3 className="text-xl font-bold text-gray-800 mb-4">Documents Needed</h3>
                            <div className="bg-gray-50 p-4 rounded-lg">
                                <p className="text-gray-700 whitespace-pre-line">{scheme.documents || 'Document list not available'}</p>
                            </div>
                        </div>

                        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                            <p className="text-sm text-amber-800">
                                <strong>⚠ Important:</strong> This information is a guide only. Always verify details with the official department before applying. Never pay agents or middlemen for government benefits - they are FREE.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

function SchemeCard({ scheme, onDetails }: { scheme: Scheme; onDetails: () => void }) {
    const getColor = (score: number) => {
        if (score >= 70) return 'green';
        if (score >= 40) return 'yellow';
        return 'gray';
    };

    const color = getColor(scheme.matchScore || 0);
    const colors = {
        green: 'border-green-200 bg-green-50',
        yellow: 'border-yellow-200 bg-yellow-50',
        gray: 'border-gray-200 bg-gray-50',
    };

    const badgeColors = {
        green: 'bg-green-100 text-green-700 border-green-300',
        yellow: 'bg-yellow-100 text-yellow-700 border-yellow-300',
        gray: 'bg-gray-100 text-gray-700 border-gray-300',
    };

    return (
        <div
            className={`border-2 ${colors[color]} rounded-lg p-6 cursor-pointer hover:shadow-lg transition`}
            onClick={onDetails}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-800 mb-1">{scheme.scheme_name}</h3>
                    <div className="flex gap-2 flex-wrap">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {scheme.level || 'State'}
                        </span>
                        {scheme.schemeCategory && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">
                                {scheme.schemeCategory}
                            </span>
                        )}
                    </div>
                </div>
                <div
                    className={`text-center rounded-full w-16 h-16 flex items-center justify-center font-bold text-lg border-2 ${badgeColors[color]}`}
                >
                    {scheme.matchScore}%
                </div>
            </div>

            <p className="text-gray-700 mb-3 line-clamp-2">
                {scheme.details?.substring(0, 150)}...
            </p>

            <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                    {scheme.benefits && (
                        <span className="font-semibold text-green-600">
                            {scheme.benefits.substring(0, 50)}...
                        </span>
                    )}
                </div>
                <button className="text-blue-600 font-semibold flex items-center gap-1 hover:gap-2 transition">
                    View Details <ChevronRight size={18} />
                </button>
            </div>
        </div>
    );
}
