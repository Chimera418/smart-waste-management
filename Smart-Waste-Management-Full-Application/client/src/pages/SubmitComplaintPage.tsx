import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LocateFixed, Tag } from 'lucide-react';
import api from '../services/api';
import { MapPicker } from '../components/MapPicker';
import type { WasteCategory } from '../types';

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
      () => setError('Unable to read device GPS; click directly on the map to pin the location.')
    );
  };

  const handleAiCategorize = async () => {
    if (description.trim().length < 10) {
      setError('Enter at least 10 characters in the description first.');
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
    if (description.trim().length < 10) {
      setError('Enter a short description before checking for nearby duplicates.');
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
      <div className="border-b border-[#E2E0D5] pb-5">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#14533C]">
          New Field Report
        </p>
        <h1 className="mt-1 text-2xl font-bold text-[#141917]">Report Waste Issue</h1>
        <p className="mt-1 text-sm text-[#5C6460]">
          Describe the issue in plain language, pin the exact street location, and our system will match the ward zone automatically.
        </p>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-2.5 text-sm text-[#991B1B]"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-12">
        <div className="civic-card space-y-4 p-6 lg:col-span-7">
          <div>
            <label htmlFor="comp-title" className="mb-1.5 block text-xs font-semibold text-[#141917]">
              Issue Title <span className="text-[#B91C1C]">*</span>
            </label>
            <input
              id="comp-title"
              required
              minLength={4}
              placeholder="e.g., Overflowing organic waste bin outside market gate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="civic-input"
            />
          </div>

          <div>
            <label htmlFor="comp-desc" className="mb-1.5 block text-xs font-semibold text-[#141917]">
              Description <span className="text-[#B91C1C]">*</span>
            </label>
            <textarea
              id="comp-desc"
              required
              rows={4}
              minLength={10}
              placeholder="Describe what kind of waste is present, approximate volume, and any hazard near drains or schools..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="civic-input"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleAiCategorize}
              disabled={aiLoading}
              className="civic-btn-secondary py-1.5 text-xs"
            >
              <Tag className="h-3.5 w-3.5 text-[#14533C]" />
              {aiLoading ? 'Classifying...' : 'Auto-Classify Waste'}
            </button>
            <button
              type="button"
              onClick={handleCheckDuplicates}
              disabled={dupLoading}
              className="civic-btn-secondary py-1.5 text-xs"
            >
              <AlertTriangle className="h-3.5 w-3.5 text-[#B45309]" />
              {dupLoading ? 'Checking radius...' : 'Check Nearby Reports'}
            </button>
          </div>

          {aiResult && (
            <div className="rounded-lg border border-[#A7F3D0] bg-[#ECFDF5] px-3.5 py-2.5 text-xs text-[#065F46]">
              <strong>Suggested Category: {aiResult.suggestedCategory.toUpperCase()}</strong> (
              {Math.round(aiResult.confidence * 100)}% confidence) — {aiResult.issueType}
            </div>
          )}

          {duplicates && (
            <div className="rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-2.5 text-xs text-[#92400E]">
              {duplicates.candidates.length === 0
                ? 'No similar open reports found within 500 m.'
                : `${duplicates.candidates.length} similar nearby report(s) found (submission still permitted): ${duplicates.candidates
                    .map((c: any) => `${c.complaintCode} (${c.distanceMeters}m)`)
                    .join(', ')}`}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comp-cat" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Waste Category
              </label>
              <select
                id="comp-cat"
                value={wasteCategory}
                onChange={(e) => setWasteCategory(e.target.value as WasteCategory)}
                className="civic-input capitalize"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="comp-weight" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Estimated Weight (kg)
              </label>
              <input
                id="comp-weight"
                type="number"
                min={1}
                value={estimatedWeightKg}
                onChange={(e) => setEstimatedWeightKg(Number(e.target.value))}
                className="civic-input tabular-nums"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="comp-addr" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Street Address <span className="text-[#B91C1C]">*</span>
              </label>
              <input
                id="comp-addr"
                required
                placeholder="14 MG Road, Ward 112"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="civic-input"
              />
            </div>
            <div>
              <label htmlFor="comp-landmark" className="mb-1.5 block text-xs font-semibold text-[#141917]">
                Nearest Landmark
              </label>
              <input
                id="comp-landmark"
                placeholder="Opposite Metro Pillar 42"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="civic-input"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className="civic-btn-primary w-full py-2.5">
            {submitting ? 'Filing report...' : 'Submit Waste Report'}
          </button>
        </div>

        <div className="civic-card flex flex-col gap-3 p-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-[#141917]">Location Pin</h2>
              <p className="text-xs text-[#5C6460]">Click anywhere on the map to adjust coordinates</p>
            </div>
            <button
              type="button"
              onClick={handleUseGps}
              className="civic-btn-secondary py-1.5 text-xs"
            >
              <LocateFixed className="h-3.5 w-3.5 text-[#14533C]" />
              Use GPS
            </button>
          </div>
          <MapPicker coordinates={coordinates} onChange={setCoordinates} />
          <div className="flex items-center justify-between rounded-lg border border-[#E2E0D5] bg-[#FAF9F6] px-3 py-2 font-mono text-xs text-[#5C6460] tabular-nums">
            <span>LNG / LAT</span>
            <strong className="text-[#141917]">
              {coordinates[0]}, {coordinates[1]}
            </strong>
          </div>
        </div>
      </form>
    </div>
  );
}
