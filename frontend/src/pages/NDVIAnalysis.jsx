import React, { useState, useEffect } from 'react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as ChartTooltip, 
  Cell
} from 'recharts';
import { 
  Upload, 
  ImageIcon, 
  Sparkles, 
  AlertTriangle,
  Download, 
  Layers, 
  ArrowRight,
  Database,
  RefreshCw,
  Info,
  Sliders,
  FileText
} from 'lucide-react';

export default function NDVIAnalysis({ plots, onRefresh, dbStatus }) {
  const [analysisMode, setAnalysisMode] = useState('single'); // 'single' (GeoTIFF/RGB) or 'dual' (Red + NIR bands)
  const [selectedPlotId, setSelectedPlotId] = useState('');
  
  // Single mode files
  const [singleFile, setSingleFile] = useState(null);
  const [singlePreviewUrl, setSinglePreviewUrl] = useState(null);

  // Dual mode files
  const [redFile, setRedFile] = useState(null);
  const [redPreviewUrl, setRedPreviewUrl] = useState(null);
  const [nirFile, setNirFile] = useState(null);
  const [nirPreviewUrl, setNirPreviewUrl] = useState(null);

  // Status & Telemetry
  const [analyzing, setAnalyzing] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [analysisHistory, setAnalysisHistory] = useState([]);
  const [dragActive, setDragActive] = useState({ single: false, red: false, nir: false });

  // Fetch analysis records
  const fetchHistory = async () => {
    if (dbStatus.connected) {
      try {
        const res = await fetch('/api/analysis');
        if (res.ok) {
          const data = await res.json();
          setAnalysisHistory(data);
        }
      } catch (err) {
        console.error("Failed to load lab history", err);
      }
    } else {
      // Mock history containing histograms in Demo Mode
      setAnalysisHistory([
        {
          id: 1,
          plot_id: 1,
          date: new Date().toISOString().split('T')[0],
          original_image_path: "static/uploads/demo_rice.jpg",
          processed_heatmap_path: "static/uploads/demo_rice_heatmap.jpg",
          min_ndvi: 0.12,
          max_ndvi: 0.88,
          avg_ndvi: 0.78,
          health_classification: "สมบูรณ์ดีมาก (Healthy Canopy)",
          histogram: [
            { bin: -0.9, percentage: 0.2 },
            { bin: -0.7, percentage: 0.1 },
            { bin: -0.5, percentage: 0.5 },
            { bin: -0.3, percentage: 1.2 },
            { bin: -0.1, percentage: 2.5 },
            { bin: 0.1, percentage: 8.4 },
            { bin: 0.3, percentage: 15.6 },
            { bin: 0.5, percentage: 28.2 },
            { bin: 0.7, percentage: 35.8 },
            { bin: 0.9, percentage: 7.5 }
          ]
        },
        {
          id: 2,
          plot_id: 3,
          date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
          original_image_path: "static/uploads/demo_cassava.jpg",
          processed_heatmap_path: "static/uploads/demo_cassava_heatmap.jpg",
          min_ndvi: -0.05,
          max_ndvi: 0.62,
          avg_ndvi: 0.38,
          health_classification: "เครียดปานกลาง (Moderate Stress)",
          histogram: [
            { bin: -0.9, percentage: 1.5 },
            { bin: -0.7, percentage: 2.2 },
            { bin: -0.5, percentage: 3.4 },
            { bin: -0.3, percentage: 6.8 },
            { bin: -0.1, percentage: 12.5 },
            { bin: 0.1, percentage: 25.4 },
            { bin: 0.3, percentage: 32.6 },
            { bin: 0.5, percentage: 12.2 },
            { bin: 0.7, percentage: 3.1 },
            { bin: 0.9, percentage: 0.3 }
          ]
        }
      ]);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [dbStatus.connected]);

  // Drag & Drop Handler
  const handleDrag = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(prev => ({ ...prev, [target]: true }));
    } else if (e.type === "dragleave") {
      setDragActive(prev => ({ ...prev, [target]: false }));
    }
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(prev => ({ ...prev, [target]: false }));
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const fileObj = e.dataTransfer.files[0];
      const preview = URL.createObjectURL(fileObj);
      
      if (target === 'single') {
        setSingleFile(fileObj);
        setSinglePreviewUrl(preview);
      } else if (target === 'red') {
        setRedFile(fileObj);
        setRedPreviewUrl(preview);
      } else if (target === 'nir') {
        setNirFile(fileObj);
        setNirPreviewUrl(preview);
      }
    }
  };

  const handleFileChange = (e, target) => {
    if (e.target.files && e.target.files[0]) {
      const fileObj = e.target.files[0];
      const preview = URL.createObjectURL(fileObj);
      
      if (target === 'single') {
        setSingleFile(fileObj);
        setSinglePreviewUrl(preview);
      } else if (target === 'red') {
        setRedFile(fileObj);
        setRedPreviewUrl(preview);
      } else if (target === 'nir') {
        setNirFile(fileObj);
        setNirPreviewUrl(preview);
      }
    }
  };

  const handleCalculateNDVI = async () => {
    setAnalyzing(true);
    setCurrentAnalysis(null);

    const formData = new FormData();
    if (selectedPlotId) {
      formData.append('plot_id', selectedPlotId);
    }

    if (dbStatus.connected) {
      try {
        let endpoint = '/api/analysis';
        if (analysisMode === 'single') {
          formData.append('file', singleFile);
        } else {
          formData.append('red_file', redFile);
          formData.append('nir_file', nirFile);
          endpoint = '/api/analysis/dual';
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          body: formData
        });

        if (res.ok) {
          const data = await res.json();
          setCurrentAnalysis(data);
          fetchHistory();
          onRefresh(); // Refresh parent states
        } else {
          const errData = await res.json();
          alert(`วิเคราะห์ล้มเหลว: ${errData.detail || 'การเชื่อมต่อผิดพลาด'}`);
        }
      } catch (err) {
        alert("ไม่สามารถสื่อสารกับเซิร์ฟเวอร์เพื่อทำการประมวลผลดัชนีแสงพืชได้");
      } finally {
        setAnalyzing(false);
      }
    } else {
      // Mock computation locally in Demo Mode
      setTimeout(() => {
        const mockResult = {
          id: Math.random() * 100,
          plot_id: selectedPlotId ? Number(selectedPlotId) : null,
          date: new Date().toISOString().split('T')[0],
          original_image_path: analysisMode === 'single' ? singlePreviewUrl : redPreviewUrl,
          processed_heatmap_path: analysisMode === 'single' ? singlePreviewUrl : redPreviewUrl, // maps before image as preview placeholder
          min_ndvi: 0.05,
          max_ndvi: 0.85,
          avg_ndvi: selectedPlotId ? (plots.find(p => p.id === Number(selectedPlotId))?.growth_records?.[0]?.ndvi_avg || 0.65) : 0.65,
          health_classification: selectedPlotId ? (plots.find(p => p.id === Number(selectedPlotId))?.status || "สภาพพืชสมบูรณ์ (Healthy)") : "สภาพพืชสมบูรณ์ (Healthy)",
          histogram: [
            { bin: -0.9, percentage: 0.5 },
            { bin: -0.7, percentage: 0.3 },
            { bin: -0.5, percentage: 0.8 },
            { bin: -0.3, percentage: 1.4 },
            { bin: -0.1, percentage: 3.2 },
            { bin: 0.1, percentage: 9.8 },
            { bin: 0.3, percentage: 18.2 },
            { bin: 0.5, percentage: 32.5 },
            { bin: 0.7, percentage: 28.3 },
            { bin: 0.9, percentage: 5.0 }
          ]
        };

        // Add records dynamically to local array in memory
        if (selectedPlotId) {
          const target = plots.find(p => p.id === Number(selectedPlotId));
          if (target) {
            target.growth_records.unshift({
              id: Math.random() * 100,
              plot_id: target.id,
              date: mockResult.date,
              height_cm: target.growth_records?.[0]?.height_cm || 85.0,
              canopy_cover_pct: target.growth_records?.[0]?.canopy_cover_pct || 75.0,
              ndvi_avg: mockResult.avg_ndvi,
              leaf_area_index: target.growth_records?.[0]?.leaf_area_index || 3.5,
              status: mockResult.health_classification,
              notes: "วิเคราะห์ดัชนี NDVI จากภาพถ่ายทางอากาศ (โหมดจำลองออฟไลน์)"
            });
          }
        }

        setCurrentAnalysis(mockResult);
        setAnalysisHistory(prev => [mockResult, ...prev]);
        setAnalyzing(false);
        onRefresh();
      }, 2000);
    }
  };

  const loadPastAnalysis = (past) => {
    setCurrentAnalysis(past);
    setSinglePreviewUrl(past.original_image_path.startsWith('blob:') ? past.original_image_path : `/${past.original_image_path}`);
  };

  const handleDownloadHeatmap = () => {
    if (!currentAnalysis) return;
    const path = currentAnalysis.processed_heatmap_path;
    const downloadUrl = path.startsWith('blob:') ? path : `/${path}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `heatmap_plot_${currentAnalysis.plot_id || 'adhoc'}_${currentAnalysis.date}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getDiagnosticDetails = (status) => {
    const s = status.toLowerCase();
    if (s.includes("severe") || s.includes("วิกฤต") || s.includes("รุนแรง")) {
      return {
        severity: "วิกฤตเตือนภัย (CMD & CRITICAL ALERT)",
        alertColor: "bg-red-500",
        bg: "bg-red-50 border-red-200 text-red-700",
        advice: "พบภาพแปลงมันสำปะหลังที่มีค่าดัชนี NDVI ต่ำผิดปกติ อาจเป็นสัญญาณของโรคใบด่างมันสำปะหลัง (CMD) หรือการระบาดของเพลี้ยแป้งรุนแรง ควรส่งเจ้าหน้าที่เข้าตรวจเช็คแปลง สุ่มขุดดูหัวมัน และเพิ่มโพแทสเซียมเพื่อฟื้นฟูรากโดยด่วน",
        colorMap: ['#ef4444', '#f87171']
      };
    } else if (s.includes("moderate") || s.includes("stress") || s.includes("เครียด") || s.includes("ลดลง")) {
      return {
        severity: "เฝ้าระวังความเครียดพืช (MILD STRESS)",
        alertColor: "bg-amber-500",
        bg: "bg-amber-50 border-amber-200 text-amber-700",
        advice: "พบค่าดัชนีใบมันสำปะหลังลดลงเล็กน้อย ใบเริ่มเหลืองหรือขาดปุ๋ยบำรุงหัว แนะนำให้เสริมปุ๋ยบำรุงพุ่ม (NPK สูตร 15-15-15 หรือเร่งหัวมันด้วยสูตรโพแทสเซียมสูงเช่น 15-0-120) เพื่อพยุงคุณภาพน้ำแป้ง",
        colorMap: ['#f59e0b', '#fbbf24']
      };
    } else {
      return {
        severity: "สภาพพืชปกติและสมบูรณ์ดี (OPTIMAL HEALTH)",
        alertColor: "bg-green-500",
        bg: "bg-green-50 border-green-200 text-green-700",
        advice: "ต้นมันสำปะหลังสมบูรณ์ดีเยี่ยม โครงสร้างทรงพุ่มใบมีสีเขียวสดหนาแน่น คาดว่าการลงหัวสะสมแป้งมีประสิทธิผลสูง แนะนำให้รักษามาตรฐานการตรวจโรคใบด่าง CMD อย่างสม่ำเสมอ",
        colorMap: ['#22c55e', '#4ade80']
      };
    }
  };

  const isCalculateDisabled = () => {
    if (analyzing) return true;
    if (analysisMode === 'single') return !singleFile;
    return !redFile || !nirFile;
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* PAGE HEADER */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">ห้องแล็บประมวลผลดัชนีใบมันสำปะหลัง (NDVI Lab)</h2>
        <p className="text-sm text-slate-500">ประมวลผลภาพถ่ายทางอากาศย่านคลื่นแสงสะท้อนคลอโรฟิลล์เพื่อตรวจหาโรคใบด่าง CMD และประเมินความพร้อมการลงหัวของมันสำปะหลัง</p>
      </div>

      {/* LAB SETTINGS CONTROL BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1: Settings Panel & File Slots */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between min-h-[480px]">
          <div className="space-y-5">
            <div>
              <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
                <Sliders className="w-5 h-5 text-farm-600" />
                ตั้งค่าเครื่องมือวิเคราะห์
              </h3>
              <p className="text-xs text-slate-400">เลือกประเภทไฟล์ ย่านความถี่คลื่น และแปลงพืชเพื่อจับคู่</p>
            </div>

            {/* Mode selection toggle */}
            <div className="flex bg-slate-100 p-1.5 rounded-xl border">
              <button
                onClick={() => setAnalysisMode('single')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  analysisMode === 'single' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                ไฟล์เดี่ยว (RGB/Tiff)
              </button>
              <button
                onClick={() => setAnalysisMode('dual')}
                className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${
                  analysisMode === 'dual' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                สองช่องแสง (Red + NIR)
              </button>
            </div>

            {/* Associate Plot */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-400 font-extrabold uppercase">ผูกข้อมูลกับแปลงเพาะปลูก</label>
              <select 
                value={selectedPlotId}
                onChange={(e) => setSelectedPlotId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:border-farm-500 font-bold text-xs"
              >
                <option value="">ไม่จับคู่กับแปลง (รันวิเคราะห์ภาพด่วนชั่วคราว)</option>
                {plots.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.crop_type === 'Rice' ? 'ข้าว' : p.crop_type === 'Sugarcane' ? 'อ้อย' : p.crop_type})</option>
                ))}
              </select>
            </div>

            {/* Dynamic File Upload Inputs */}
            {analysisMode === 'single' ? (
              <div 
                onDragEnter={(e) => handleDrag(e, 'single')}
                onDragOver={(e) => handleDrag(e, 'single')}
                onDragLeave={(e) => handleDrag(e, 'single')}
                onDrop={(e) => handleDrop(e, 'single')}
                onClick={() => document.getElementById('singleInput').click()}
                className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center h-40 ${
                  dragActive.single ? 'border-farm-500 bg-farm-50/40' : 'border-slate-200 hover:border-farm-400 hover:bg-farm-50/5'
                }`}
              >
                <input 
                  id="singleInput" 
                  type="file" 
                  accept="image/*,.tif,.tiff" 
                  onChange={(e) => handleFileChange(e, 'single')}
                  className="hidden" 
                />
                <Upload className="w-7 h-7 text-farm-600 mb-2" />
                {singleFile ? (
                  <div className="max-w-[200px] truncate">
                    <p className="text-xs font-bold text-slate-700">{singleFile.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">{(singleFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-bold text-slate-700">เลือกรูปถ่ายพืชพรรณ หรือ GeoTIFF</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">รองรับสกุลไฟล์ JPG, PNG, GeoTIFF</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {/* Red Band Input */}
                <div 
                  onDragEnter={(e) => handleDrag(e, 'red')}
                  onDragOver={(e) => handleDrag(e, 'red')}
                  onDragLeave={(e) => handleDrag(e, 'red')}
                  onDrop={(e) => handleDrop(e, 'red')}
                  onClick={() => document.getElementById('redInput').click()}
                  className={`border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center h-36 ${
                    dragActive.red ? 'border-farm-500 bg-farm-50/40' : 'border-slate-200 hover:border-farm-400 hover:bg-farm-50/5'
                  }`}
                >
                  <input id="redInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'red')} className="hidden" />
                  <Upload className="w-5 h-5 text-red-500 mb-1" />
                  {redFile ? (
                    <p className="text-[10px] font-bold text-slate-700 truncate w-full px-1">{redFile.name}</p>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-slate-700 leading-tight">นำเข้าย่านแสง RED</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-none">ช่วงคลื่นแสงแดงที่พืชดูดกลืน</p>
                    </div>
                  )}
                </div>

                {/* NIR Band Input */}
                <div 
                  onDragEnter={(e) => handleDrag(e, 'nir')}
                  onDragOver={(e) => handleDrag(e, 'nir')}
                  onDragLeave={(e) => handleDrag(e, 'nir')}
                  onDrop={(e) => handleDrop(e, 'nir')}
                  onClick={() => document.getElementById('nirInput').click()}
                  className={`border-2 border-dashed rounded-2xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center h-36 ${
                    dragActive.nir ? 'border-farm-500 bg-farm-50/40' : 'border-slate-200 hover:border-farm-400 hover:bg-farm-50/5'
                  }`}
                >
                  <input id="nirInput" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'nir')} className="hidden" />
                  <Upload className="w-5 h-5 text-blue-500 mb-1" />
                  {nirFile ? (
                    <p className="text-[10px] font-bold text-slate-700 truncate w-full px-1">{nirFile.name}</p>
                  ) : (
                    <div>
                      <p className="text-[10px] font-bold text-slate-700 leading-tight">นำเข้าย่านแสง NIR</p>
                      <p className="text-[9px] text-slate-400 mt-0.5 leading-none">ช่วงคลื่นอินฟราเรดใกล้สะท้อนใบพืช</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleCalculateNDVI}
            disabled={isCalculateDisabled()}
            className={`w-full py-4 rounded-xl font-extrabold text-xs shadow-md transition mt-6 ${
              isCalculateDisabled()
                ? 'bg-slate-100 text-slate-400 border shadow-none cursor-not-allowed'
                : 'bg-gradient-to-r from-farm-600 to-emerald-600 text-white shadow-farm-200 hover:from-farm-700 hover:to-emerald-700'
            }`}
          >
            {analyzing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                กำลังประมวลผลพิกเซลดัชนีแสงพืช...
              </span>
            ) : "คำนวณดัชนีความสมบูรณ์พืช"}
          </button>
        </div>

        {/* COLUMN 2 & 3: Visual Split View Preview */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col h-[480px]">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h3 className="font-bold text-slate-800">การเปรียบเทียบภาพดั้งเดิมกับแผนภาพความร้อน</h3>
              <p className="text-xs text-slate-400">เปรียบเทียบคลื่นแสงธรรมชาติพืชจริง (ซ้าย) กับการคัดแยกสีเชิงดัชนี NDVI (ขวา)</p>
            </div>
            
            {currentAnalysis && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 border text-slate-700`}>
                ประเมินสภาพใบ: {currentAnalysis.health_classification}
              </span>
            )}
          </div>

          {/* SPLIT PANEL GRID */}
          <div className="flex-1 border rounded-2xl bg-slate-50 relative overflow-hidden flex divide-x divide-slate-200">
            {singlePreviewUrl || redPreviewUrl ? (
              <>
                {/* Visible Light */}
                <div className="flex-1 h-full relative">
                  <img 
                    src={analysisMode === 'single' ? singlePreviewUrl : redPreviewUrl} 
                    alt="Original" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-xs text-[9px] font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider">
                    {analysisMode === 'single' ? 'ภาพถ่ายแสงจริง (RGB)' : 'ภาพช่องแสงสีแดง (RED)'}
                  </div>
                </div>

                {/* Spectral Heatmap */}
                <div className="flex-1 h-full relative">
                  {currentAnalysis ? (
                    <>
                      <img 
                        src={currentAnalysis.processed_heatmap_path.startsWith('blob:') ? currentAnalysis.processed_heatmap_path : `/${currentAnalysis.processed_heatmap_path}`} 
                        alt="NDVI Heatmap" 
                        className="w-full h-full object-cover"
                        style={!dbStatus.connected ? { filter: 'hue-rotate(110deg) saturate(130%)' } : {}}
                      />
                      <button
                        onClick={handleDownloadHeatmap}
                        className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 backdrop-blur-xs text-white hover:bg-black/80 transition"
                        title="ดาวน์โหลดภาพแผนที่ความร้อนพืช"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                      <ImageIcon className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-xs font-bold leading-tight">รอประมวลผลดัชนีสีความร้อนพืช</p>
                      <p className="text-[10px] text-slate-400 mt-1 max-w-[200px]">กดปุ่ม "คำนวณดัชนีความสมบูรณ์พืช" ด้านซ้ายเพื่อเริ่มทำการวิเคราะห์หาค่าสี</p>
                    </div>
                  )}
                  <div className="absolute bottom-3 left-3 bg-farm-600/80 backdrop-blur-xs text-[9px] font-extrabold text-white px-2 py-0.5 rounded uppercase tracking-wider">
                    ผลวิเคราะห์แผนภาพความร้อน NDVI
                  </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 p-6 text-center">
                <ImageIcon className="w-12 h-12 text-slate-300 mb-2" />
                <h4 className="text-sm font-bold text-slate-600">สถานีวิเคราะห์ภาพทางอากาศหลักพร้อมทำงาน</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-[250px] leading-relaxed">
                  กรุณาอัปโหลดรูปภาพพืชและเลือกประเภทแปลงเกษตรเพื่อแปลงเป็นภาพแผนความร้อนพืชพรรณพืช
                </p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SPECTRUM ANALYSIS METRICS & HISTOGRAM DISTRIBUTION */}
      {currentAnalysis && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn">
          
          {/* STATS BOARD */}
          <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between">
            <div>
              <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">สถิติค่าดัชนี NDVI</h3>
              
              <div className="space-y-3.5">
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">ค่าเฉลี่ยดัชนี NDVI รวม:</span>
                  <span className="text-farm-700 text-lg font-black">{currentAnalysis.avg_ndvi}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">ค่าสะท้อนแสงพืชพรรณสูงสุด (Max):</span>
                  <span className="text-slate-800 font-bold">{currentAnalysis.max_ndvi}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500">ค่าสะท้อนแสงพืชพรรณต่ำสุด (Min):</span>
                  <span className="text-slate-800 font-bold">{currentAnalysis.min_ndvi}</span>
                </div>
                
                <div className="flex justify-between items-center text-xs font-semibold pt-2.5 border-t">
                  <span className="text-slate-500">ผลการวินิจฉัยสุขภาพพืช:</span>
                  <span className="font-extrabold text-slate-800">{currentAnalysis.health_classification}</span>
                </div>
              </div>
            </div>

            {/* Diagnostic recommendation banner */}
            {(() => {
              const rec = getDiagnosticDetails(currentAnalysis.health_classification);
              return (
                <div className={`p-4 rounded-2xl border text-xs font-bold leading-normal mt-4 ${rec.bg}`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <div className={`w-2 h-2 rounded-full ${rec.alertColor}`} />
                    <span className="text-[9px] font-black uppercase tracking-wider">คำแนะนำวิชาการ: {rec.severity}</span>
                  </div>
                  <span>{rec.advice}</span>
                </div>
              );
            })()}
          </div>

          {/* HISTOGRAM BAR CHART */}
          <div className="lg:col-span-2 glass-panel p-6 rounded-3xl h-[310px] flex flex-col">
            <div>
              <h3 className="font-bold text-slate-800">กราฟฮิสโตแกรมการแจกแจงพิกเซลดัชนีแสงสะท้อน</h3>
              <p className="text-xs text-slate-400">แผนภูมิแสดงสัดส่วนการกระจายตัวของค่าคะแนนคลอโรฟิลล์พืชตั้งแต่ -1.0 (ดินแห้ง/แหล่งน้ำ) ไปจนถึง 1.0 (พื้นที่พืชใบเขียวหนาแน่น)</p>
            </div>

            <div className="flex-1 mt-4 w-full h-[200px]">
              {currentAnalysis.histogram && currentAnalysis.histogram.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={currentAnalysis.histogram}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="bin" 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                      label={{ value: 'ช่วงระดับคะแนนดัชนี NDVI', position: 'bottom', offset: 0, fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                    />
                    <YAxis 
                      tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }}
                      label={{ value: 'สัดส่วนพื้นที่พิกเซล (%)', angle: -90, position: 'insideLeft', offset: 5, fontSize: 9, fill: '#94a3b8', fontWeight: 700 }}
                    />
                    <ChartTooltip 
                      contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px', fontSize: 10 }}
                    />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]}>
                      {currentAnalysis.histogram.map((entry, idx) => {
                        let barColor = '#dc2626'; // red
                        if (entry.bin >= 0.0 && entry.bin <= 0.2) barColor = '#f59e0b'; // orange/yellow
                        else if (entry.bin > 0.2 && entry.bin <= 0.5) barColor = '#86efac'; // pale green
                        else if (entry.bin > 0.5) barColor = '#22c55e'; // pure green
                        return <Cell key={`cell-${idx}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                  ไม่มีข้อมูลกราฟฮิสโตแกรมการแจกแจงพิกเซล
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* LAB HISTORICAL CATALOG */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center">
          <h3 className="font-bold text-slate-800 font-sans">ประวัติการวิเคราะห์ในห้องปฏิบัติการ</h3>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded border">
            ลงทะเบียนข้อมูลตรวจวิเคราะห์ไว้ {analysisHistory.length} รายการ
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
          {analysisHistory.length > 0 ? (
            analysisHistory.map((hist) => (
              <div 
                key={hist.id} 
                onClick={() => loadPastAnalysis(hist)}
                className="bg-white border rounded-2xl overflow-hidden shadow-sm hover:border-farm-400 cursor-pointer group transition duration-150"
              >
                <div className="h-28 bg-slate-100 relative flex overflow-hidden">
                  <img 
                    src={hist.original_image_path.startsWith('blob:') ? hist.original_image_path : `/${hist.original_image_path}`} 
                    alt="Original" 
                    className="w-1/2 h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <img 
                    src={hist.processed_heatmap_path.startsWith('blob:') ? hist.processed_heatmap_path : `/${hist.processed_heatmap_path}`} 
                    alt="Heatmap" 
                    className="w-1/2 h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                </div>
                
                <div className="p-3.5 space-y-1">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase">
                    <span>{hist.date}</span>
                    <span>รหัส: #{Math.round(hist.id)}</span>
                  </div>
                  
                  <h4 className="text-xs font-black text-slate-800 truncate mt-1 group-hover:text-farm-600">
                    {hist.plot_id ? plots.find(p => p.id === hist.plot_id)?.name : 'อัปโหลดวิเคราะห์ภาพด่วนชั่วคราว'}
                  </h4>
                  
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 mt-2 font-semibold">
                    <span className="text-slate-500">ค่าเฉลี่ยดัชนี NDVI:</span>
                    <span className="text-farm-700 font-extrabold">{hist.avg_ndvi}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full py-6 text-center text-slate-400 font-bold text-xs">
              ยังไม่มีประวัติภาพถ่ายประมวลผลดัชนี NDVI ถูกสร้างบันทึกไว้ในระบบ
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
