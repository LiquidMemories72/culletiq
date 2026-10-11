"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Activity,
  AlertTriangle,
  Camera,
  CheckCircle2,
  Cpu,
  Flame,
  Gauge,
  Layers,
  Pause,
  Play,
  RefreshCw,
  ShieldAlert,
  Sliders,
  Upload,
  Wind,
  Zap,
  Radio,
  Eye,
  CheckSquare,
  HelpCircle,
  SkipForward
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RealDetection {
  id: number;
  class_name: string;
  confidence: number;
  bbox: number[];
  polygon: number[][];
  centroid: number[];
  valve_index: number;
  is_defect: boolean;
  hazard_description?: string;
}

interface RealInferenceResult {
  success: boolean;
  model: string;
  inference_ms: number;
  device: string;
  image_dimensions: number[];
  total_detections: number;
  csp_defect_count: number;
  metal_contaminant_count: number;
  stream_purity_percent: number;
  proportions: Record<string, number>;
  detections: RealDetection[];
  annotated_image: string;
  reject_diverter_actuated?: boolean;
  rejection_reasons?: string[];
  critical_defects?: string[];
}

const STREAM_SAMPLES = [
  {
    id: "sample_cullet_csp",
    title: "Mixed Cullet with CSP Ceramic",
    type: "chute",
    url: "/demo/synthetic-with-foreign-objects.jpg",
    description: "Free-fall chute tile with flint, amber, green fragments and opaque ceramic inclusion stones."
  },
  {
    id: "sample_cullet_amber",
    title: "Amber & Dark Cullet Stream",
    type: "chute",
    url: "/demo/synthetic-mixed-dark.jpg",
    description: "High-density amber and green container stream undergoing colorimetric separation."
  },
  {
    id: "sample_cullet_clean",
    title: "High-Purity Green/Flint Chute",
    type: "chute",
    url: "/demo/synthetic-green-light.jpg",
    description: "Line-scan dual-illumination frame with low defect density for baseline calibration."
  },
  {
    id: "sample_pyrex_hazard",
    title: "Intake Conveyor: Pyrex Bakeware Contaminant",
    type: "conveyor",
    url: "/demo/precrush/pyrex_dish.jpg",
    description: "Pre-crush intake inspection. Casserole handles and thick flange indicate borosilicate cookware."
  },
  {
    id: "sample_ceramic_mug",
    title: "Intake Conveyor: Stoneware Ceramic Mug",
    type: "conveyor",
    url: "/demo/precrush/ceramic_mug.jpg",
    description: "Opaque tableware mug that would survive furnace remelt and cause container failure."
  },
  {
    id: "sample_clean_bottles",
    title: "Intake Conveyor: Clear Bottle Intake",
    type: "conveyor",
    url: "/demo/precrush/clear_bottle.jpg",
    description: "Intact packaging soda-lime container bottles ready for mechanical crushing."
  }
];

export function AdvancedIndustrialDashboard() {
  const [streamMode, setStreamMode] = useState<"chute" | "conveyor">("chute");
  const [isLiveStreaming, setIsLiveStreaming] = useState(false);
  const [activeSampleIndex, setActiveSampleIndex] = useState(0);
  const [beltSpeed, setBeltSpeed] = useState(3.0); // m/s
  const [airPressure, setAirPressure] = useState(0.72); // MPa
  const [pulseDuration, setPulseDuration] = useState(3.5); // ms
  const [emergencyPaused, setEmergencyPaused] = useState(false);
  const [showActiveLearningModal, setShowActiveLearningModal] = useState(false);

  // Real inference state
  const [isInferring, setIsInferring] = useState(false);
  const [realResult, setRealResult] = useState<RealInferenceResult | null>(null);
  const [uploadedPreview, setUploadedPreview] = useState<string | null>(null);
  const [currentFrameTitle, setCurrentFrameTitle] = useState("Mixed Cullet with CSP Ceramic");

  // 256 valves actuation history (0 to 1 intensity)
  const [valveHeat, setValveHeat] = useState<number[]>(new Array(256).fill(0));
  const [totalEjectionFires, setTotalEjectionFires] = useState(148);

  // Telemetry time series
  const [telemetry, setTelemetry] = useState<
    { time: string; purity: number; massFlow: number; carryover: number }[]
  >([
    { time: "18:40:10", purity: 98.4, massFlow: 7.2, carryover: 0.25 },
    { time: "18:40:15", purity: 98.9, massFlow: 7.4, carryover: 0.22 },
    { time: "18:40:20", purity: 97.6, massFlow: 8.1, carryover: 0.31 },
    { time: "18:40:25", purity: 99.2, massFlow: 7.5, carryover: 0.19 },
    { time: "18:40:30", purity: 98.8, massFlow: 7.6, carryover: 0.24 },
  ]);

  // Critical alerts queue
  const [alerts, setAlerts] = useState<
    { id: string; time: string; text: string; severity: "critical" | "warning"; type: string }[]
  >([]);

  // Active learning pool
  const [activeLearningPool, setActiveLearningPool] = useState<
    { id: string; frame: string; label: string; confidence: number; verified: boolean }[]
  >([
    { id: "al_1", frame: "Fragment #42 (Edge Chute)", label: "Amber / Thick Flint", confidence: 0.54, verified: false },
    { id: "al_2", frame: "Intake Item #12", label: "Pyrex Measuring Rim", confidence: 0.48, verified: false },
    { id: "al_3", frame: "Fragment #89", label: "Diffuse CSP / White Opal Glass", confidence: 0.51, verified: false },
  ]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Optical physics calculation
  const transitDistanceMm = 1200;
  const transitDelayMs = useMemo(() => {
    return ((transitDistanceMm / (beltSpeed * 1000)) * 1000).toFixed(1);
  }, [beltSpeed]);

  // Function to send image to real FastAPI backend
  const runRealInference = async (fileOrBlob: File | Blob, title?: string) => {
    if (emergencyPaused) return;
    setIsInferring(true);
    if (title) setCurrentFrameTitle(title);

    const formData = new FormData();
    formData.append("file", fileOrBlob);

    const isConveyor = streamMode === "conveyor";
    const endpoint = isConveyor ? "/api/v1/classify/whole-item" : "/api/v1/classify/image";
    const directEndpoint = isConveyor ? "http://127.0.0.1:8000/api/v1/classify/whole-item" : "http://127.0.0.1:8000/api/v1/classify/image";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      let data: any;
      if (res.ok) {
        data = await res.json();
      } else {
        const directRes = await fetch(directEndpoint, {
          method: "POST",
          body: formData,
        });
        if (!directRes.ok) throw new Error(`Inference error: ${res.statusText}`);
        data = await directRes.json();
      }

      handleInferenceSuccess(data, isConveyor);
    } catch (err) {
      console.error("Inference failed:", err);
      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: "Inference server connecting... Ensure backend is online.",
          severity: "warning",
          type: "system",
        },
        ...prev.slice(0, 4),
      ]);
    } finally {
      setIsInferring(false);
    }
  };

  const handleInferenceSuccess = (data: any, isConveyor: boolean) => {
    const isDiverterActuated = !!data.reject_diverter_actuated;
    const detections = (data.detections || []).map((d: any, idx: number) => ({
      id: d.id || idx + 1,
      class_name: d.class_name,
      confidence: d.confidence,
      bbox: d.bbox,
      polygon: d.polygon || [],
      centroid: d.centroid || [d.bbox ? (d.bbox[0] + d.bbox[2]) / 2 : 0, d.bbox ? (d.bbox[1] + d.bbox[3]) / 2 : 0],
      valve_index: d.valve_index ?? Math.floor(((d.bbox ? (d.bbox[0] + d.bbox[2]) / 2 : 0) / (data.image_dimensions?.[0] || 640)) * 256),
      is_defect: d.is_defect || d.is_refractory_defect || d.reject_flag,
      hazard_description: d.hazard_description
    }));

    const normalized: RealInferenceResult = {
      success: data.success,
      model: data.model || (isConveyor ? "G3 Pre-Crush Detector" : "G1 Cullet Segmenter"),
      inference_ms: data.inference_ms,
      device: data.device || "cuda:0 (RTX 5060)",
      image_dimensions: data.image_dimensions || [1280, 1280],
      total_detections: isConveyor ? (data.total_items_inspected || detections.length) : (data.total_detections || detections.length),
      csp_defect_count: isConveyor ? (data.non_container_count || 0) : (data.csp_defect_count || 0),
      metal_contaminant_count: data.metal_contaminant_count || 0,
      stream_purity_percent: isConveyor ? (data.purity_percent ?? 92.5) : (data.stream_purity_percent ?? 96.0),
      proportions: data.proportions || {},
      detections: detections,
      annotated_image: data.annotated_image,
      reject_diverter_actuated: isDiverterActuated,
      rejection_reasons: data.rejection_reasons || [],
      critical_defects: data.critical_defects || []
    };

    setRealResult(normalized);
    setUploadedPreview(normalized.annotated_image);

    // Light up valves corresponding to detected fragments with burst animation
    setValveHeat((prev) => {
      const updated = [...prev];
      let newlyFired = 0;
      detections.forEach((det: RealDetection) => {
        const v = det.valve_index;
        if (v >= 0 && v < 256) {
          const power = det.is_defect ? 1.0 : 0.45;
          updated[v] = Math.min(1.0, updated[v] + power);
          if (v > 0) updated[v - 1] = Math.min(1.0, updated[v - 1] + power * 0.4);
          if (v < 255) updated[v + 1] = Math.min(1.0, updated[v + 1] + power * 0.4);
          newlyFired++;
        }
      });
      if (newlyFired > 0) {
        setTotalEjectionFires((prevCount) => prevCount + newlyFired);
      }
      return updated;
    });

    // Check if CSP or defects detected -> Trigger alert
    if (isDiverterActuated || normalized.csp_defect_count > 0 || normalized.metal_contaminant_count > 0) {
      const alertMsg = isConveyor
        ? `G3 INTAKE DIVERSION: ${data.rejection_reasons?.join("; ") || "Pyrex / Ceramic refractory hazard detected"}`
        : `REAL REFRACTORY INCLUSION DETECTED: ${normalized.csp_defect_count} CSP Ceramic(s), ${normalized.metal_contaminant_count} Metal(s)`;

      setAlerts((prev) => [
        {
          id: Math.random().toString(),
          time: new Date().toLocaleTimeString(),
          text: alertMsg,
          severity: "critical",
          type: "csp",
        },
        ...prev.slice(0, 4),
      ]);
    }

    // Append live telemetry point
    const now = new Date().toLocaleTimeString([], { hour12: false, minute: "2-digit", second: "2-digit" });
    setTelemetry((prev) => [
      ...prev.slice(-14),
      {
        time: now,
        purity: normalized.stream_purity_percent,
        massFlow: +(7.0 + normalized.total_detections * 0.12).toFixed(2),
        carryover: +(normalized.csp_defect_count > 0 ? 0.38 : 0.18).toFixed(2),
      },
    ]);
  };

  // Helper to load sample by index
  const loadSampleByIndex = (index: number) => {
    const s = STREAM_SAMPLES[index];
    if (!s) return;
    setActiveSampleIndex(index);
    if (s.type !== streamMode) {
      setStreamMode(s.type as "chute" | "conveyor");
    }
    fetch(s.url)
      .then((res) => res.blob())
      .then((blob) => runRealInference(blob, s.title))
      .catch((err) => console.error("Error loading sample:", err));
  };

  // Optional live simulation stream loop (only when explicitly enabled by user)
  useEffect(() => {
    if (!isLiveStreaming || emergencyPaused) return;

    // Filter samples belonging to current mode
    const modeIndices = STREAM_SAMPLES
      .map((s, idx) => (s.type === streamMode ? idx : -1))
      .filter((idx) => idx !== -1);

    if (modeIndices.length === 0) return;

    const timer = setInterval(() => {
      setActiveSampleIndex((curr) => {
        const currPos = modeIndices.indexOf(curr);
        const nextPos = (currPos + 1) % modeIndices.length;
        const nextIdx = modeIndices[nextPos];
        const sample = STREAM_SAMPLES[nextIdx];
        fetch(sample.url)
          .then((res) => res.blob())
          .then((blob) => runRealInference(blob, sample.title))
          .catch((err) => console.error("Auto stream error:", err));
        return nextIdx;
      });
    }, 6000);

    return () => clearInterval(timer);
  }, [isLiveStreaming, emergencyPaused, streamMode]);

  // Initial load
  useEffect(() => {
    loadSampleByIndex(0);
  }, []);

  // Background cooldown for pneumatic valves
  useEffect(() => {
    const interval = setInterval(() => {
      setValveHeat((vh) => vh.map((h) => Math.max(0, h - 0.045)));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      runRealInference(file, `Custom Upload: ${file.name}`);
    }
  };

  return (
    <div className="space-y-6 p-4 lg:p-8">
      <div className="mb-4 rounded-xl border border-amber-400/40 bg-amber-50 p-4 text-sm text-amber-900">
        <b>Advanced lab · simulated equipment controls.</b> The moving stream, air-jet heatmap, pressure, throughput and initial telemetry are illustrative. Uploads use the local model server; no industrial hardware is connected and visual area is not certified purity.
      </div>
      {/* Top Banner / System Title & Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-gradient-to-r from-charcoal via-surface to-charcoal p-5 shadow-2xl lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className={`flex size-3.5 rounded-full ${emergencyPaused ? "bg-red-500" : "bg-emerald-500"} animate-pulse`} />
            <h1 className="text-xl font-bold tracking-tight text-white lg:text-2xl">
              Industrial Optical Sorter Console
            </h1>
            <span className="rounded-md bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
              {streamMode === "chute" ? "Free-Fall Chute (G1/G2 Active)" : "Intake Conveyor (G3 Active)"}
            </span>
          </div>
          <p className="mt-1 text-xs text-white/60">
            Model inspection and simulated line controls · no physical actuation
          </p>
        </div>

        {/* Live Controls: Play/Pause, Emergency Stop, Upload */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <button
            onClick={() => setIsLiveStreaming(!isLiveStreaming)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition-all shadow-md ${
              isLiveStreaming
                ? "bg-emerald-600 text-white hover:bg-emerald-500"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {isLiveStreaming ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            {isLiveStreaming ? "SIMULATED REPLAY" : "REPLAY PAUSED"}
          </button>

          <button
            onClick={() => {
              const next = (activeSampleIndex + 1) % STREAM_SAMPLES.length;
              loadSampleByIndex(next);
            }}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-medium text-white hover:bg-white/10"
          >
            <SkipForward className="size-3.5 text-sky-400" />
            Next Frame
          </button>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 font-semibold text-white hover:bg-sky-500 transition-all shadow"
          >
            <Upload className="size-3.5" />
            {isInferring ? "Analyzing..." : "Upload Frame"}
          </button>

          <button
            onClick={() => setEmergencyPaused(!emergencyPaused)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-bold transition-all ${
              emergencyPaused
                ? "bg-amber-500 text-black hover:bg-amber-400"
                : "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
            }`}
          >
            <ShieldAlert className="size-3.5" />
            {emergencyPaused ? "RESUME DEMO" : "PAUSE DEMO"}
          </button>
        </div>
      </div>

      {/* Stream Preset Quick Feeder Bar */}
      <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2 text-white/70">
          <Radio className="size-4 text-sky-400 animate-pulse shrink-0" />
          <span className="font-semibold text-white">Active Stream Feed:</span>
          <span className="font-mono text-sky-300">{currentFrameTitle}</span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {STREAM_SAMPLES.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => loadSampleByIndex(idx)}
              className={`rounded px-2.5 py-1 text-[11px] font-medium transition-colors ${
                activeSampleIndex === idx
                  ? "bg-sky-500 text-black font-bold shadow"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              }`}
            >
              {s.title.split(":")[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Emergency Alert Toast */}
      {alerts.length > 0 && alerts[0].severity === "critical" && (
        <div className="flex items-center justify-between rounded-xl border border-red-500/50 bg-red-950/40 p-4 text-red-200 backdrop-blur shadow-lg animate-pulse">
          <div className="flex items-center gap-3">
            <AlertTriangle className="size-6 text-red-400 shrink-0" />
            <div>
              <p className="font-bold text-sm text-red-300">
                CRITICAL REFRACTORY / CONTAMINANT INCLUSION DETECTED!
              </p>
              <p className="text-xs text-red-200/80">
                {alerts[0].text} at {alerts[0].time} — Pneumatic Diverter / Air Ejection Fired.
              </p>
            </div>
          </div>
          <button
            onClick={() => setAlerts([])}
            className="rounded bg-red-500/20 px-2.5 py-1 text-xs font-medium hover:bg-red-500/30 text-white"
          >
            Acknowledge
          </button>
        </div>
      )}

      {/* Main Grid: Stream Visualizer & 256 Valve Array */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Left Column: Real Optical Stream / Neural Inference Visualizer (7 Cols) */}
        <div className="rounded-xl border border-white/10 bg-charcoal p-5 shadow-xl xl:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Activity className="size-4 text-sky-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Optical Inspection Stream & GPU Segmenter
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <div className="flex items-center gap-1 rounded bg-white/10 px-2 py-0.5 font-mono text-emerald-400">
                <Cpu className="size-3 text-emerald-400" />
                {realResult ? `${realResult.inference_ms} ms (RTX 5060)` : "8.5 ms"}
              </div>
              <span className="font-mono text-amber-400 text-xs">
                Δt: {transitDelayMs} ms
              </span>
            </div>
          </div>

          {/* Stream Canvas / Real Image Viewport */}
          <div className="relative my-4 min-h-[400px] w-full overflow-hidden rounded-lg border border-white/10 bg-[#0d1217] flex items-center justify-center">
            {uploadedPreview ? (
              <img
                src={uploadedPreview}
                alt="Real YOLO Model Detections"
                className="max-h-[440px] w-full object-contain"
              />
            ) : (
              <div className="text-center p-8 text-white/50">
                <Camera className="size-10 mx-auto mb-2 text-white/20" />
                <p className="text-sm">Initializing GPU stream feed...</p>
              </div>
            )}

            {/* Chute Laser / Line-Scan Scanline Indicator */}
            <div className="absolute top-[28%] left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_14px_#38bdf8] opacity-90 pointer-events-none animate-pulse" />
            <span className="absolute top-[23%] right-3 text-[10px] font-mono tracking-wider text-cyan-400 bg-black/80 border border-cyan-500/30 px-2 py-0.5 rounded pointer-events-none">
              10.2 kHz LINE-SCAN {streamMode === "chute" ? "(YOLO11s-SEG)" : "(YOLO11s DETECT)"}
            </span>

            {/* Ejection Lip Line at Bottom */}
            <div className="absolute bottom-[10%] left-0 right-0 border-t-2 border-dashed border-red-500/70 pointer-events-none" />
            <span className="absolute bottom-[4%] right-3 text-[10px] font-mono tracking-wider text-red-400 bg-black/80 border border-red-500/30 px-2 py-0.5 rounded pointer-events-none">
              PNEUMATIC EJECTION LIP (256 NOZZLES)
            </span>
          </div>

          {/* Stream Control Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-xs">
            {/* Mode & Speed Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/5 p-1">
                <button
                  onClick={() => setStreamMode("chute")}
                  className={`rounded px-2.5 py-1 text-xs font-semibold ${
                    streamMode === "chute" ? "bg-sky-500 text-black font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  Free-Fall Chute
                </button>
                <button
                  onClick={() => setStreamMode("conveyor")}
                  className={`rounded px-2.5 py-1 text-xs font-semibold ${
                    streamMode === "conveyor" ? "bg-sky-500 text-black font-bold" : "text-white/60 hover:text-white"
                  }`}
                >
                  Pre-Crush Intake
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-white/60">
                <span>Speed:</span>
                {[2.5, 3.0, 4.0].map((s) => (
                  <button
                    key={s}
                    onClick={() => setBeltSpeed(s)}
                    className={`rounded px-2 py-0.5 font-mono ${
                      beltSpeed === s
                        ? "bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold"
                        : "hover:text-white"
                    }`}
                  >
                    {s.toFixed(1)} m/s
                  </button>
                ))}
              </div>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-2 text-[11px]">
              <span className="flex items-center gap-1 text-sky-400"><span className="size-2 rounded-full bg-sky-400" /> Flint</span>
              <span className="flex items-center gap-1 text-amber-400"><span className="size-2 rounded-full bg-amber-400" /> Amber</span>
              <span className="flex items-center gap-1 text-emerald-400"><span className="size-2 rounded-full bg-emerald-400" /> Green</span>
              <span className="flex items-center gap-1 text-red-400"><span className="size-2 rounded-full bg-red-400" /> Refractory / CSP</span>
            </div>
          </div>
        </div>

        {/* Right Column: 256-Valve Heatmap & Pneumatics (5 Cols) */}
        <div className="rounded-xl border border-white/10 bg-charcoal p-5 shadow-xl xl:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Wind className="size-4 text-emerald-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  256-Air-Jet Solenoid Nozzle Array
                </h2>
              </div>
              <span className="text-xs font-mono text-white/50">Pitch: 4.69 mm (1,200 mm)</span>
            </div>

            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Real-time duty cycle across all 256 pneumatic solenoid nozzles. Valves actively fire short 3.5 ms compressed air pulses to reject ceramics, stones, and off-color cullet.
            </p>

            {/* 256 Valve Heatmap Grid */}
            <div className="mt-4 rounded-lg border border-white/10 bg-black/50 p-3">
              <div className="grid grid-cols-32 gap-0.5 h-24 w-full items-end">
                {valveHeat.map((heat, idx) => {
                  const heightPct = Math.max(8, Math.round(heat * 100));
                  return (
                    <div
                      key={idx}
                      title={`Valve #${idx + 1} | Duty: ${(heat * 100).toFixed(0)}%`}
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-t-sm transition-all duration-75 ${
                        heat > 0.6
                          ? "bg-red-500 shadow-[0_0_8px_#ef4444]"
                          : heat > 0.2
                          ? "bg-sky-400 shadow-[0_0_5px_#38bdf8]"
                          : "bg-white/20"
                      }`}
                    />
                  );
                })}
              </div>

              {/* Nozzle Index Ruler */}
              <div className="mt-2 flex justify-between text-[9px] font-mono text-white/40 border-t border-white/10 pt-1">
                <span>#1 (x=0 mm)</span>
                <span>#64 (300 mm)</span>
                <span>#128 (Center)</span>
                <span>#192 (900 mm)</span>
                <span>#256 (1200 mm)</span>
              </div>
            </div>

            {/* Real Detection Counts */}
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-lg bg-white/5 p-2.5 border border-white/5">
                <span className="text-white/40 block text-[10px]">Inspected Pieces</span>
                <span className="font-mono font-bold text-white text-base">
                  {realResult ? realResult.total_detections : 38}
                </span>
              </div>
              <div className="rounded-lg bg-red-950/30 p-2.5 border border-red-500/20">
                <span className="text-red-300/60 block text-[10px]">Potential defects (image)</span>
                <span className="font-mono font-bold text-red-400 text-base">
                  {realResult ? realResult.csp_defect_count : "—"}
                </span>
              </div>
              <div className="rounded-lg bg-emerald-950/30 p-2.5 border border-emerald-500/20">
                <span className="text-emerald-300/60 block text-[10px]">Visible non-defect area*</span>
                <span className="font-mono font-bold text-emerald-400 text-base">
                  {realResult ? `${realResult.stream_purity_percent}%` : "—"}
                </span>
              </div>
            </div>

            {/* Pneumatics Regulator Controls */}
            <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-3.5 text-xs text-white">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Manifold Air Pressure:</span>
                <span className="font-mono font-bold text-sky-400">{airPressure} MPa (0.6 - 0.8 MPa standard)</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="0.9"
                step="0.02"
                value={airPressure}
                onChange={(e) => setAirPressure(parseFloat(e.target.value))}
                className="w-full accent-sky-400"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-white/70">Air Pulse Duration:</span>
                <span className="font-mono font-bold text-emerald-400">{pulseDuration} ms</span>
              </div>
              <input
                type="range"
                min="2.0"
                max="6.0"
                step="0.5"
                value={pulseDuration}
                onChange={(e) => setPulseDuration(parseFloat(e.target.value))}
                className="w-full accent-emerald-400"
              />
            </div>
          </div>

          {/* Quick Valve Diagnostics & Active Learning Trigger */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
            <div className="flex items-center gap-1.5 text-xs text-emerald-300">
              <CheckCircle2 className="size-4 text-emerald-400" />
              <span className="font-mono">{totalEjectionFires} Ejection Firings Logged</span>
            </div>
            <button
              onClick={() => setShowActiveLearningModal(true)}
              className="rounded bg-purple-500/20 px-2.5 py-1 text-xs font-semibold text-purple-300 border border-purple-500/30 hover:bg-purple-500/30"
            >
              Active Learning Queue ({activeLearningPool.filter(a => !a.verified).length})
            </button>
          </div>
        </div>
      </div>

      {/* Lower Row: Output Purity Telemetry Chart & Real Detections Table */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Stream Purity Live Telemetry (7 Cols) */}
        <div className="rounded-xl border border-white/10 bg-charcoal p-5 shadow-xl lg:col-span-7">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Gauge className="size-4 text-sky-400" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                Live Output Stream Purity & Mass Flow
              </h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 font-bold">
              Specification: &gt;99.5% Flint Target
            </span>
          </div>

          <div className="mt-4 h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={telemetry}>
                <defs>
                  <linearGradient id="purityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="time" stroke="#64748b" fontSize={10} tickLine={false} />
                <YAxis domain={[94, 100]} stroke="#64748b" fontSize={10} tickLine={false} unit="%" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", fontSize: "11px" }}
                />
                <Area type="monotone" dataKey="purity" stroke="#38bdf8" strokeWidth={2} fillOpacity={1} fill="url(#purityGrad)" name="Purity %" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Real Detections Table / Feed (5 Cols) */}
        <div className="rounded-xl border border-white/10 bg-charcoal p-5 shadow-xl lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Layers className="size-4 text-amber-400" />
                <h2 className="text-sm font-bold uppercase tracking-wider text-white">
                  Real Detections Log ({realResult ? realResult.detections.length : 0} Items)
                </h2>
              </div>
              <span className="text-xs font-mono text-white/50">
                {realResult?.model || "RTX 5060 Active"}
              </span>
            </div>

            <div className="mt-3 space-y-1.5 max-h-56 overflow-y-auto pr-1 text-xs">
              {!realResult || realResult.detections.length === 0 ? (
                <div className="p-4 text-center text-white/40">No fragments processed yet</div>
              ) : (
                realResult.detections.slice(0, 10).map((det) => (
                  <div
                    key={det.id}
                    className={`flex items-center justify-between rounded p-2 border ${
                      det.is_defect
                        ? "bg-red-950/30 border-red-500/40 text-red-200"
                        : "bg-white/5 border-white/5 text-white/80"
                    }`}
                  >
                    <div>
                      <span className="font-semibold uppercase tracking-wide">{det.class_name}</span>
                      <span className="text-white/40 block text-[10px]">
                        Conf: {(det.confidence * 100).toFixed(1)}% • Centroid: [{det.centroid[0]}, {det.centroid[1]}]
                      </span>
                    </div>
                    <span className={`font-mono text-[11px] font-bold ${det.is_defect ? "text-red-400" : "text-amber-400"}`}>
                      {det.is_defect ? "EJECT (Valve #" + (det.valve_index + 1) + ")" : "Valve #" + (det.valve_index + 1)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
            <span>256 Manifold Synchronization: OK</span>
            <span className="font-mono text-emerald-400">PLC Delay: {transitDelayMs} ms</span>
          </div>
        </div>
      </div>

      {/* Active Learning Modal (as specified in ML for Waste Recycling Section) */}
      {showActiveLearningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl rounded-xl border border-white/20 bg-surface p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="size-5 text-purple-400" />
                <h3 className="font-bold text-lg text-white">Active Learning Verification Queue</h3>
              </div>
              <button
                onClick={() => setShowActiveLearningModal(false)}
                className="text-white/60 hover:text-white"
              >
                ✕
              </button>
            </div>

            <p className="mt-2 text-xs text-white/60 leading-relaxed">
              Low-confidence predictions (&lt;60%) captured from the line-scan camera for plant engineer verification. Approved samples are queued for automated model fine-tuning.
            </p>

            <div className="mt-4 space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {activeLearningPool.map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3 text-xs">
                  <div>
                    <span className="font-bold text-white block">{item.frame}</span>
                    <span className="text-white/50 text-[11px]">Prediction: {item.label} ({(item.confidence * 100).toFixed(0)}% conf)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.verified ? (
                      <span className="text-emerald-400 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="size-3.5" /> Queued
                      </span>
                    ) : (
                      <button
                        onClick={() => {
                          const updated = [...activeLearningPool];
                          updated[idx].verified = true;
                          setActiveLearningPool(updated);
                        }}
                        className="rounded bg-sky-600 px-2.5 py-1 text-white font-medium hover:bg-sky-500"
                      >
                        Approve for Retraining
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-white/10 pt-4">
              <button
                onClick={() => setShowActiveLearningModal(false)}
                className="rounded-lg bg-white/10 px-4 py-2 text-xs font-semibold text-white hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
