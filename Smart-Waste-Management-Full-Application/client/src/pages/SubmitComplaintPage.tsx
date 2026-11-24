import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LocateFixed, Sparkles } from 'lucide-react';
import api from '../services/api';
import { MapPicker } from '../components/MapPicker';
import type { WasteCategory } from '../types';

const CATEGORIES: WasteCategory[] = [
  'organic', 'recyclable', 'plastic', 'electronic', 'hazardous', 'construction', 'medical', 'mixed', 'other'
];

export function SubmitComplaintPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wasteCategory, setWasteCategory] = useState<WasteCategory>('mixed');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState(50);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([77.5952, 12.9721]);

  const [aiResult, setAiResult] = useState<any | null>(null);
  const [duplicates, setDuplicates] = useState<any | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUseGps = () => {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        setCoordinates([
          Number(pos.coords.longitude.toFixed(6)),
          Number(pos.coords.latitude.toFixed(6))
        ]),
      () => setError('Unable to read device GPS; click the map to pin location.')
    );
  };

  const handleAiCategorize = async () => {
    if (description.trim().length < 10) {
      setError('Enter at least 10 characters in description first.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const res = await api.post('/ai/categorize', { title, description });
      setAiResult(res.data.data);
      setWasteCategory(res.data.data.suggestedCategory);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (description.trim().length < 10) return;
    setDupLoading(true);
    try {
      const res = await api.post('/complaints/check-duplicates', {
        title,
        description,
        wasteCategory,
        coordinates
      });
      setDuplicates(res.data.data);
    } finally {
      setDupLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/complaints', {
        title,
        description,
        wasteCategory,
        estimatedWeightKg: Number(estimatedWeightKg),
        address,
        landmark,
        coordinates,
        aiSuggestedCategory: aiResult?.suggestedCategory,
        aiConfidence: aiResult?.confidence,
        aiIssueType: aiResult?.issueType,
        aiSummary: aiResult?.summary,
        aiKeywords: aiResult?.keywords,
        aiModelUsed: aiResult?.modelUsed,
        aiFallbackUsed: aiResult?.fallbackUsed
      });
      navigate('/complaints');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submit Waste Complaint</h1>
        <p className="text-sm text-slate-600">
          Natural-language complaint filing with Gemini categorization, duplicate detection, and auto zone matching.
        </p>
      </div>
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-7">
          <input
            required
            minLength={4}
            placeholder="Complaint Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <textarea
            required
            rows={4}
            minLength={10}
            placeholder="Describe the waste issue in plain language..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAiCategorize}
              disabled={aiLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {aiLoading ? 'Analyzing...' : 'Gemini AI Suggest Category'}
            </button>
            <button
              type="button"
              onClick={handleCheckDuplicates}
              disabled={dupLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              {dupLoading ? 'Checking...' : 'Check Duplicates'}
            </button>
          </div>

          {aiResult && (
            <div className="rounded-lg border border-teal-200 bg-teal-50 p-3 text-xs text-teal-900">
              <strong>AI Suggestion: {aiResult.suggestedCategory.toUpperCase()}</strong> ({Math.round(aiResult.confidence * 100)}%) — {aiResult.issueType}
            </div>
          )}

          {duplicates && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {duplicates.candidates.length === 0
                ? 'No nearby duplicate complaints detected.'
                : `${duplicates.candidates.length} similar nearby report(s) detected (still allowed to submit): ${duplicates.candidates.map((c: any) => `${c.complaintCode} (${c.distanceMeters}m)`).join(', ')}`}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={wasteCategory}
              onChange={(e) => setWasteCategory(e.target.value as WasteCategory)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={estimatedWeightKg}
              onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
              placeholder="Est. Weight (kg)"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              required
              placeholder="Street Address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              placeholder="Landmark (Optional)"
              value={landmark}
              onChange={(e) => setLandmark(e.target.value)}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting...' : 'Submit Waste Complaint'}
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">Location Pin</h2>
            <button
              type="button"
              onClick={handleUseGps}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium"
            >
              <LocateFixed className="h-3.5 w-3.5 text-teal-600" />
              Use My GPS
            </button>
          </div>
          <MapPicker coordinates={coordinates} onChange={setCoordinates} />
          <p className="font-mono text-xs text-slate-600">
            Coordinates: [{coordinates[0]}, {coordinates[1]}]
          </p>
        </div>
      </form>
    </div>
  );
}
