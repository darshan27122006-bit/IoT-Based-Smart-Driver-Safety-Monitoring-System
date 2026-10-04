import { useState, useEffect } from 'react';
import { getMlMetrics, predictMl } from '../services/api';
import { Brain, Target, CheckCircle, Percent, Sliders, Layers, Sparkles } from 'lucide-react';

export default function MlAnalytics({ isBackendOnline }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Live Prediction Playground state
  const [testFeatures, setTestFeatures] = useState({
    average_speed: 68.0,
    maximum_speed: 92.0,
    average_acceleration: 1.4,
    maximum_acceleration: 4.2,
    harsh_braking_count: 2,
    sudden_acceleration_count: 2,
    sharp_turn_count: 2,
    overspeed_count: 2,
    acceleration_variance: 2.5,
    gyroscope_variance: 1.8
  });
  const [predictionResult, setPredictionResult] = useState(null);
  const [predicting, setPredicting] = useState(false);

  useEffect(() => {
    getMlMetrics()
      .then(res => {
        if (res.data.error) {
          setError(res.data.error);
        } else {
          setMetrics(res.data);
        }
      })
      .catch(err => {
        console.error("Failed to fetch ML metrics:", err);
        setError("Failed to fetch machine learning model metrics.");
      })
      .finally(() => setLoading(false));
  }, []);

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const res = await predictMl(testFeatures);
      setPredictionResult(res.data);
    } catch (err) {
      console.error("Prediction error:", err);
    } finally {
      setPredicting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !metrics) {
    return (
      <div className="text-rose-600 bg-rose-50 p-6 rounded-xl border border-rose-200">
        <p className="font-semibold">{error}</p>
        <p className="text-xs text-rose-500 mt-1">Ensure ML training has been executed (`python ml/train.py`).</p>
      </div>
    );
  }

  const classes = metrics?.classes || ['MODERATE', 'RISKY', 'SAFE'];
  const cm = metrics?.confusion_matrix || [];
  const featuresList = metrics?.features || [
    "average_speed", "maximum_speed", "average_acceleration", "maximum_acceleration",
    "harsh_braking_count", "sudden_acceleration_count", "sharp_turn_count",
    "overspeed_count", "acceleration_variance", "gyroscope_variance"
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-8 text-white shadow-md border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-purple-400" />
              <span>Machine Learning Driving Behavior Classifier</span>
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              Supervised Random Forest Classifier trained to classify trips into SAFE, MODERATE, and RISKY behaviors.
            </p>
          </div>
          <span className="px-3.5 py-1.5 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-300 text-xs font-mono">
            Model: {metrics?.model || 'Random Forest (100 Trees)'}
          </span>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center text-center">
          <Target className="w-7 h-7 text-blue-500 mb-2" />
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Accuracy</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {metrics ? (metrics.accuracy * 100).toFixed(1) : '--'}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-7 h-7 text-emerald-500 mb-2" />
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Precision</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {metrics ? (metrics.precision * 100).toFixed(1) : '--'}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center text-center">
          <CheckCircle className="w-7 h-7 text-indigo-500 mb-2" />
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Recall</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {metrics ? (metrics.recall * 100).toFixed(1) : '--'}%
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col items-center justify-center text-center">
          <Percent className="w-7 h-7 text-purple-500 mb-2" />
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">F1 Score</p>
          <p className="text-3xl font-extrabold text-slate-900 mt-1">
            {metrics ? (metrics.f1_score * 100).toFixed(1) : '--'}%
          </p>
        </div>
      </div>

      {/* Model Features & Confusion Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix Table */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Layers className="w-4 h-4 text-purple-500" />
            <span>Confusion Matrix (Evaluated on Holdout Test Set)</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-center text-xs border border-slate-200 rounded-lg overflow-hidden">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3 border-b border-r border-slate-200 text-left">Actual \ Predicted</th>
                  {classes.map(c => (
                    <th key={c} className="p-3 border-b border-r border-slate-200 font-bold">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classes.map((actualClass, rowIdx) => (
                  <tr key={actualClass} className="hover:bg-slate-50">
                    <td className="p-3 font-semibold text-left border-r border-slate-200 bg-slate-50">
                      {actualClass}
                    </td>
                    {classes.map((_, colIdx) => {
                      const count = cm[rowIdx]?.[colIdx] ?? 0;
                      const isDiagonal = rowIdx === colIdx;
                      return (
                        <td
                          key={colIdx}
                          className={`p-3 font-mono font-bold border-r border-slate-100 ${
                            isDiagonal
                              ? (count > 0 ? 'bg-emerald-50 text-emerald-700' : 'text-slate-800')
                              : (count > 0 ? 'bg-rose-50 text-rose-700' : 'text-slate-300')
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-2xs text-slate-400">
            Diagonal cells represent true positives correctly classified by the Random Forest model.
          </p>
        </div>

        {/* Features Input Vector Description */}
        <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
          <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span>Input Feature Representation ({featuresList.length} Features)</span>
          </h3>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {featuresList.map(feat => (
              <div key={feat} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 font-mono text-slate-700 flex items-center justify-between">
                <span>{feat}</span>
                <span className="text-slate-400 text-2xs uppercase">float/int</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Inference Tester */}
      <div className="bg-white p-6 rounded-xl shadow-xs border border-slate-200 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            <span>Live ML Prediction Playground</span>
          </h3>
          <button
            onClick={handlePredict}
            disabled={predicting}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-semibold shadow-xs transition flex items-center gap-2"
          >
            {predicting ? 'Running Inference...' : 'Run Live Prediction'}
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="text-2xs font-semibold text-slate-500 uppercase">Avg Speed (km/h)</label>
            <input
              type="number"
              value={testFeatures.average_speed}
              onChange={e => setTestFeatures({ ...testFeatures, average_speed: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 uppercase">Max Speed (km/h)</label>
            <input
              type="number"
              value={testFeatures.maximum_speed}
              onChange={e => setTestFeatures({ ...testFeatures, maximum_speed: parseFloat(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 uppercase">Harsh Braking</label>
            <input
              type="number"
              value={testFeatures.harsh_braking_count}
              onChange={e => setTestFeatures({ ...testFeatures, harsh_braking_count: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 uppercase">Sudden Accel</label>
            <input
              type="number"
              value={testFeatures.sudden_acceleration_count}
              onChange={e => setTestFeatures({ ...testFeatures, sudden_acceleration_count: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
          <div>
            <label className="text-2xs font-semibold text-slate-500 uppercase">Sharp Turns</label>
            <input
              type="number"
              value={testFeatures.sharp_turn_count}
              onChange={e => setTestFeatures({ ...testFeatures, sharp_turn_count: parseInt(e.target.value) || 0 })}
              className="w-full mt-1 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Prediction Output */}
        {predictionResult && (
          <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-700 font-medium">Model Classification Result:</p>
              <p className="text-2xl font-black text-purple-950 mt-0.5">
                {predictionResult.prediction}
                <span className="text-xs font-normal text-purple-700 ml-2">
                  (Confidence: {(predictionResult.confidence * 100).toFixed(1)}%)
                </span>
              </p>
            </div>
            {predictionResult.probabilities && (
              <div className="flex gap-4 text-xs font-mono">
                {Object.entries(predictionResult.probabilities).map(([cls, prob]) => (
                  <div key={cls} className="text-right">
                    <span className="text-slate-500">{cls}:</span>
                    <span className="font-bold text-slate-800 ml-1">{(prob * 100).toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
