import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar,
  Cell
} from 'recharts';
import { 
  Sprout, 
  Calendar, 
  Ruler, 
  Layers, 
  Percent, 
  Plus, 
  Clock, 
  FileText, 
  TrendingUp, 
  ChevronRight, 
  Heart,
  Image as ImageIcon,
  CheckCircle,
  X,
  MapPin
} from 'lucide-react';

export default function GrowthMonitoring({ plots, onRefresh, dbStatus }) {
  const [selectedPlotId, setSelectedPlotId] = useState(plots[0]?.id || 1);
  const [modalOpen, setModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form input states
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    height_cm: 20.0,
    canopy_cover_pct: 15.0,
    leaf_area_index: 0.8,
    status: 'Healthy',
    notes: '',
    ndvi_avg: 0.20
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Get active plot
  const selectedPlot = useMemo(() => {
    return plots.find(p => p.id === Number(selectedPlotId));
  }, [plots, selectedPlotId]);

  // Sort growth records chronologically for charts
  const chronologicalRecords = useMemo(() => {
    if (!selectedPlot || !selectedPlot.growth_records) return [];
    return [...selectedPlot.growth_records].sort((a, b) => new Date(a.date) - new Date(b.date));
  }, [selectedPlot]);

  // Sort descending for timeline/latest records
  const reverseRecords = useMemo(() => {
    if (!selectedPlot || !selectedPlot.growth_records) return [];
    return [...selectedPlot.growth_records].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [selectedPlot]);

  // Fetch Latest Record details
  const latestRecord = useMemo(() => {
    return reverseRecords[0] || null;
  }, [reverseRecords]);

  // Monthly Growth grouping: groups height and NDVI averages by month
  const monthlyData = useMemo(() => {
    if (chronologicalRecords.length === 0) return [];
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const grouped = {};
    
    chronologicalRecords.forEach(rec => {
      const d = new Date(rec.date);
      const mLabel = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      
      if (!grouped[mLabel]) {
        grouped[mLabel] = { month: mLabel, height: 0, ndvi: 0, count: 0 };
      }
      grouped[mLabel].height += rec.height_cm;
      grouped[mLabel].ndvi += rec.ndvi_avg;
      grouped[mLabel].count += 1;
    });

    return Object.values(grouped).map(item => ({
      month: item.month,
      height: Math.round(item.height / item.count),
      ndvi: parseFloat((item.ndvi / item.count).toFixed(2))
    }));
  }, [chronologicalRecords]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'height_cm' || name === 'canopy_cover_pct' || name === 'leaf_area_index' || name === 'ndvi_avg'
        ? parseFloat(value) || 0
        : value
    }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const openLogModal = () => {
    setFormData({
      date: new Date().toISOString().split('T')[0],
      height_cm: latestRecord?.height_cm || 30.0,
      canopy_cover_pct: latestRecord?.canopy_cover_pct || 25.0,
      leaf_area_index: latestRecord?.leaf_area_index || 1.2,
      status: 'Healthy',
      notes: '',
      ndvi_avg: latestRecord?.ndvi_avg || 0.35
    });
    setSelectedFile(null);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    if (formData.height_cm < 0 || formData.canopy_cover_pct < 0 || formData.leaf_area_index < 0) {
      setErrorMsg("Measurement values cannot be negative");
      return;
    }
    if (formData.canopy_cover_pct > 100) {
      setErrorMsg("Canopy cover percentage cannot exceed 100%");
      return;
    }

    if (dbStatus.connected) {
      try {
        const payload = new FormData();
        payload.append('date', formData.date);
        payload.append('height_cm', formData.height_cm);
        payload.append('canopy_cover_pct', formData.canopy_cover_pct);
        payload.append('leaf_area_index', formData.leaf_area_index);
        payload.append('status', formData.status);
        if (formData.notes) payload.append('notes', formData.notes);
        
        if (selectedFile) {
          payload.append('image', selectedFile);
        } else {
          payload.append('ndvi_avg', formData.ndvi_avg);
        }

        const response = await fetch(`/api/plots/${selectedPlotId}/growth`, {
          method: 'POST',
          body: payload
        });

        if (response.ok) {
          setSuccessMsg("Growth record logged successfully");
          setModalOpen(false);
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          const err = await response.json();
          setErrorMsg(err.detail || "Server failed to log record");
        }
      } catch (err) {
        setErrorMsg("Failed to communicate with API server");
      }
    } else {
      // Mock local state update
      const newRecord = {
        id: Math.random(),
        plot_id: Number(selectedPlotId),
        date: formData.date,
        height_cm: formData.height_cm,
        canopy_cover_pct: formData.canopy_cover_pct,
        leaf_area_index: formData.leaf_area_index,
        ndvi_avg: selectedFile ? 0.76 : formData.ndvi_avg,
        status: formData.status,
        notes: formData.notes + (selectedFile ? " [Image Attached in Demo]" : ""),
        image_path: selectedFile ? "uploads/demo_field.jpg" : null,
        heatmap_path: selectedFile ? "uploads/demo_field_heatmap.jpg" : null
      };

      selectedPlot.growth_records = [newRecord, ...(selectedPlot.growth_records || [])];
      selectedPlot.status = formData.status;

      setSuccessMsg("Growth record logged (Demo Mode)");
      setModalOpen(false);
      onRefresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Growth Monitoring</h2>
          <p className="text-sm text-slate-500">Record vegetative elongation heights, crop canopy coverage, and chlorophyll trends.</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Plot select */}
          <select 
            value={selectedPlotId}
            onChange={(e) => setSelectedPlotId(e.target.value)}
            className="px-4 py-3 rounded-xl bg-white border border-slate-200 shadow-sm font-bold text-xs focus:outline-none focus:border-farm-500"
          >
            {plots.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.crop_type})</option>
            ))}
          </select>

          <button
            onClick={openLogModal}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition duration-150"
          >
            <Plus className="w-4 h-4" />
            <span>Log Growth Entry</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold animate-pulse">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* LATEST MONITORING Telemetry Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Latest monitoring statistics */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between h-[340px]">
          <div>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Latest Monitoring Summary</span>
                <h3 className="font-extrabold text-slate-800 text-base mt-0.5">{selectedPlot?.name}</h3>
              </div>
              
              {latestRecord && (
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                  latestRecord.status.includes("Healthy") ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {latestRecord.status}
                </span>
              )}
            </div>
            
            {latestRecord ? (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Ruler className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Stalk Height</p>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-1">{latestRecord.height_cm} cm</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Percent className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Canopy Cover</p>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-1">{latestRecord.canopy_cover_pct}%</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Average NDVI</p>
                    <h4 className="text-sm font-extrabold text-farm-700 mt-1">{latestRecord.ndvi_avg}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Layers className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">Leaf Area Index</p>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-1">{latestRecord.leaf_area_index}</h4>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">
                No logs recorded yet.
              </div>
            )}
          </div>

          {latestRecord && (
            <div className="flex gap-2 items-center text-[10px] text-slate-400 font-semibold bg-slate-50 border p-2.5 rounded-xl mt-4">
              <Calendar className="w-4 h-4 text-farm-600 shrink-0" />
              <span>Inspection date: {latestRecord.date}</span>
            </div>
          )}
        </div>

        {/* Dynamic Split imagery representation of latest upload */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl h-[340px] flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Latest Photo & Heatmap</h3>
            <p className="text-xs text-slate-400">Actual field photography side-by-side with processed spectral colormap.</p>
          </div>

          <div className="flex-1 border rounded-2xl bg-slate-50 overflow-hidden flex divide-x divide-slate-200 mt-3 relative">
            {latestRecord?.image_path ? (
              <>
                <div className="flex-1 h-full relative">
                  <img 
                    src={`/${latestRecord.image_path}`} 
                    alt="RGB Visible" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold">RGB Photo</span>
                </div>
                <div className="flex-1 h-full relative">
                  <img 
                    src={`/${latestRecord.heatmap_path}`} 
                    alt="Heatmap" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute bottom-2 left-2 bg-farm-600/80 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold">Spectral Heatmap</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold leading-none">No photo attached to latest log</p>
                <p className="text-[10px] text-slate-400 mt-1">Upload a photo during the log entry step to generate visual heatmaps.</p>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* ANALYTICAL CHARTS: MONTHLY GROWTH & NDVI TREND */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* NDVI Trend Graph */}
        <div className="glass-panel p-6 rounded-3xl h-[380px] flex flex-col">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <TrendingUp className="w-5 h-5 text-farm-600" />
              Chlorophyll NDVI Trend
            </h3>
            <p className="text-xs text-slate-400">Vegetative greenness and plant health index trajectory mapping.</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[280px]">
            {chronologicalRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chronologicalRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis domain={[0, 1.0]} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Line 
                    type="monotone" 
                    dataKey="ndvi_avg" 
                    name="Average NDVI Score" 
                    stroke="#10b981" 
                    strokeWidth={3} 
                    dot={{ r: 4, fill: '#10b981' }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                Waiting for history telemetry.
              </div>
            )}
          </div>
        </div>

        {/* Monthly Growth rates */}
        <div className="glass-panel p-6 rounded-3xl h-[380px] flex flex-col">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Ruler className="w-5 h-5 text-farm-600" />
              Monthly Growth Performance
            </h3>
            <p className="text-xs text-slate-400">Average plant height (cm) grouped and compared monthly.</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[280px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px' }} />
                  <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                  <Bar dataKey="height" name="Average Height (cm)" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#f59e0b' : '#fbbf24'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                Waiting for monthly aggregations.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* CHRONOLOGICAL GROWTH TIMELINE FEED */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-farm-600" />
              Growth Timeline Feed
            </h3>
            <p className="text-xs text-slate-400">Historical developmental log stages and observations details.</p>
          </div>
        </div>

        <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
          {reverseRecords.length > 0 ? (
            reverseRecords.map((rec, index) => {
              let tagStyle = "bg-green-50 text-green-700 border-green-200";
              let dotStyle = "bg-green-500";
              if (rec.status.toLowerCase().includes("stress")) {
                tagStyle = "bg-red-50 text-red-700 border-red-200";
                dotStyle = "bg-red-500";
              } else if (rec.status.toLowerCase().includes("monitor")) {
                tagStyle = "bg-amber-50 text-amber-700 border-amber-200";
                dotStyle = "bg-amber-500";
              } else if (rec.status.toLowerCase().includes("harvest")) {
                tagStyle = "bg-slate-100 text-slate-600 border-slate-200";
                dotStyle = "bg-slate-500";
              }

              return (
                <div key={rec.id || index} className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Timeline bullet node */}
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ring-4 ring-slate-50 ${dotStyle}`} />

                  {/* Log description */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{rec.date}</span>
                      <span className="text-slate-300 font-bold">•</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${tagStyle}`}>
                        {rec.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-normal max-w-[650px]">{rec.notes || "Standard developmental inspection report logged by field surveyor."}</p>
                    
                    {/* Measurements */}
                    <div className="flex gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1.5">
                      <span className="flex items-center gap-0.5"><Ruler className="w-3.5 h-3.5 text-slate-400" /> Height: <strong className="text-slate-700">{rec.height_cm} cm</strong></span>
                      <span className="flex items-center gap-0.5"><Percent className="w-3.5 h-3.5 text-slate-400" /> Canopy: <strong className="text-slate-700">{rec.canopy_cover_pct}%</strong></span>
                      <span className="flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /> NDVI: <strong className="text-farm-700">{rec.ndvi_avg}</strong></span>
                      <span className="flex items-center gap-0.5"><Layers className="w-3.5 h-3.5 text-slate-400" /> LAI: <strong className="text-slate-700">{rec.leaf_area_index}</strong></span>
                    </div>
                  </div>

                  {/* Thumbnails */}
                  <div className="shrink-0">
                    {rec.image_path ? (
                      <div className="flex gap-1.5">
                        <img 
                          src={`/${rec.heatmap_path}`} 
                          alt="Heatmap" 
                          className="w-10 h-10 rounded-lg object-cover border" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <img 
                          src={`/${rec.image_path}`} 
                          alt="Original" 
                          className="w-10 h-10 rounded-lg object-cover border" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        MANUAL LOG
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-400 font-bold text-xs col-span-full">
              No entries logged for this plot yet.
            </div>
          )}
        </div>
      </div>

      {/* SURVEY ENTRY DIALOG MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl animate-pulse-once">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-800">
                Log Growth Record: {selectedPlot?.name}
              </h3>
              <button 
                type="button" 
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 mb-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                  {errorMsg}
                </div>
              )}

              {/* Date */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase">Inspection date</label>
                <input 
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                />
              </div>

              {/* Height & Canopy */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Stalk Height (cm)</label>
                  <input 
                    type="number"
                    name="height_cm"
                    step="0.1"
                    value={formData.height_cm}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Canopy Cover (%)</label>
                  <input 
                    type="number"
                    name="canopy_cover_pct"
                    step="0.1"
                    value={formData.canopy_cover_pct}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                  />
                </div>
              </div>

              {/* Leaf Area Index & Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Leaf Area Index (LAI)</label>
                  <input 
                    type="number"
                    name="leaf_area_index"
                    step="0.01"
                    value={formData.leaf_area_index}
                    onChange={handleInputChange}
                    className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Assessed Health Status</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                  >
                    {["Healthy", "Active Monitoring", "Stressed", "Harvested"].map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload vs manual NDVI */}
              <div className="space-y-1 bg-slate-50 border p-3.5 rounded-2xl">
                <label className="text-[10px] text-farm-700 font-black uppercase flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  Crop Plot Photo (Recommended)
                </label>
                <p className="text-[9px] text-slate-400 leading-tight mb-2">
                  Attach a field/drone photo to auto-generate the greenness index and vegetation heatmap.
                </p>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-farm-100 file:text-farm-700 hover:file:bg-farm-200 file:cursor-pointer"
                />

                {!selectedFile && (
                  <div className="space-y-1 mt-3 pt-3 border-t">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">Manual Average NDVI input</label>
                    <input 
                      type="number"
                      name="ndvi_avg"
                      step="0.01"
                      min="-1"
                      max="1"
                      value={formData.ndvi_avg}
                      onChange={handleInputChange}
                      className="w-full px-3.5 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                    />
                  </div>
                )}
              </div>

              {/* Observations Notes */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 font-extrabold uppercase">Inspection Observations Notes</label>
                <textarea 
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Describe leaves, soil dampness, weed intensity, fertilizing details..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button 
                  type="button" 
                  onClick={() => setModalOpen(false)}
                  className="flex-1 py-3 text-slate-500 hover:bg-slate-50 border rounded-xl font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-white bg-farm-600 hover:bg-farm-700 rounded-xl font-extrabold text-xs shadow-md shadow-farm-200 transition"
                >
                  Log Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
