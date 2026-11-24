import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LocateFixed, Sparkles } from 'lucide-react';
import api from '../services/api';
import { MapPicker } from '../components/MapPicker';
import type { DuplicateCandidate, WasteCategory } from '../types';

const CATEGORIES: WasteCategory[] = [
  'organic',
  'recyclable',
  'plastic',
  'electronic',
  'hazardous',
  'construction',
  'medical',
  'mixed',
  'other'
];

export function SubmitComplaintPage() {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [wasteCategory, setWasteCategory] = useState<WasteCategory>('mixed');
  const [estimatedWeightKg, setEstimatedWeightKg] = useState(50);
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [coordinates, setCoordinates] = useState<[number, number]>([77.5946, 12.9716]);

  const [aiResult, setAiResult] = useState<{
    suggestedCategory: WasteCategory;
    confidence: number;
    issueType: string;
    summary: string;
    keywords: string[];
    modelUsed: string;
    fallbackUsed: boolean;
  } | null>(null);
  const [duplicates, setDuplicates] = useState<{
    isPotentialDuplicate: boolean;
    candidates: DuplicateCandidate[];
  } | null>(null);

  const [aiLoading, setAiLoading] = useState(false);
  const [dupLoading, setDupLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleUseGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoordinates([
          Number(pos.coords.longitude.toFixed(6)),
          Number(pos.coords.latitude.toFixed(6))
        ]);
      },
      () => setError('Unable to retrieve GPS coordinates. Click the map to set location.')
    );
  };

  const handleAnalyzeWithGemini = async () => {
    if (description.trim().length < 10) {
      setError('Please enter at least 10 characters in the description for Gemini analysis.');
      return;
    }
    setError('');
    setAiLoading(true);
    try {
      const res = await api.post('/ai/categorize', { title, description });
      const data = res.data.data;
      setAiResult(data);
      setWasteCategory(data.suggestedCategory);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'AI categorization failed');
    } finally {
      setAiLoading(false);
    }
  };

  const handleCheckDuplicates = async () => {
    if (description.trim().length < 10) {
      setError('Enter a description before checking for duplicate reports.');
      return;
    }
    setError('');
    setDupLoading(true);
    try {
      const res = await api.post('/complaints/check-duplicates', {
        title,
        description,
        wasteCategory,
        coordinates
      });
      setDuplicates(res.data.data);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Duplicate check failed');
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
      setError(err.response?.data?.error?.message || 'Failed to submit complaint');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Submit Waste Complaint</h1>
        <p className="text-sm text-slate-600">
          Describe the waste issue in plain text. Gemini AI suggests the waste category and our
          system checks nearby duplicates without blocking valid reports.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-7">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Complaint Title</label>
            <input
              required
              minLength={4}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Overflowing organic and plastic garbage near Market Gate"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              Natural Language Description
            </label>
            <textarea
              required
              rows={4}
              minLength={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what waste is dumped, approximate volume, foul odor or hazards, and nearby landmarks..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleAnalyzeWithGemini}
                disabled={aiLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 ring-1 ring-teal-200 hover:bg-teal-100 disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {aiLoading ? 'Analyzing with Gemini...' : 'Gemini AI Suggest Category'}
              </button>
              <button
                type="button"
                onClick={handleCheckDuplicates}
                disabled={dupLoading}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100 disabled:opacity-50"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                {dupLoading ? 'Checking Nearby...' : 'Check Potential Duplicates'}
              </button>
            </div>
          </div>

          {aiResult && (
            <div className="rounded-lg border border-teal-200 bg-teal-50/70 p-3.5 text-xs">
              <div className="flex items-center justify-between font-semibold text-teal-900">
                <span>AI Suggestion: {aiResult.suggestedCategory.toUpperCase()}</span>
                <span>Confidence: {Math.round(aiResult.confidence * 100)}%</span>
              </div>
              <p className="mt-1 text-teal-800">
                <strong>Issue Nature:</strong> {aiResult.issueType}
              </p>
              <p className="mt-0.5 text-teal-700">{aiResult.summary}</p>
              <p className="mt-1 text-[11px] text-teal-600">
                Engine: {aiResult.modelUsed} {aiResult.fallbackUsed ? '(Deterministic fallback)' : ''} — You can edit the category below before submitting.
              </p>
            </div>
          )}

          {duplicates && (
            <div
              className={`rounded-lg border p-3.5 text-xs ${
                duplicates.isPotentialDuplicate
                  ? 'border-amber-300 bg-amber-50 text-amber-900'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-800'
              }`}
            >
              {duplicates.candidates.length === 0 ? (
                <p>No active duplicate complaints found within 500m.</p>
              ) : (
                <div className="space-y-1.5">
                  <p className="font-semibold">
                    {duplicates.candidates.length} similar nearby complaint(s) found (submission is
                    still permitted):
                  </p>
                  {duplicates.candidates.map((c) => (
                    <div key={c.complaintCode} className="rounded bg-white/80 p-2">
                      <span className="font-mono font-semibold">{c.complaintCode}</span> ·{' '}
                      {Math.round(c.similarityScore * 100)}% match · {c.distanceMeters}m away —{' '}
                      {c.reason}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Waste Category (Editable)
              </label>
              <select
                value={wasteCategory}
                onChange={(e) => setWasteCategory(e.target.value as WasteCategory)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm capitalize focus:border-teal-600 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                min={1}
                max={20000}
                value={estimatedWeightKg}
                onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Street Address</label>
              <input
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="42 MG Road, Sector 4"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-700">Landmark (Optional)</label>
              <input
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="Opposite Central Bus Stand"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {submitting ? 'Submitting Complaint...' : 'Submit Waste Complaint'}
          </button>
        </div>

        <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Geographical Location</h2>
            <button
              type="button"
              onClick={handleUseGps}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              <LocateFixed className="h-3.5 w-3.5 text-teal-600" />
              Use My GPS
            </button>
          </div>
          <p className="text-xs text-slate-500">Click anywhere on the map to adjust the incident pin.</p>
          <MapPicker coordinates={coordinates} onChange={setCoordinates} />
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="text-slate-500">Longitude:</span>{' '}
              <span className="font-mono font-semibold text-slate-900">{coordinates[0]}</span>
            </div>
            <div className="rounded-lg bg-slate-50 p-2.5">
              <span className="text-slate-500">Latitude:</span>{' '}
              <span className="font-mono font-semibold text-slate-900">{coordinates[1]}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
