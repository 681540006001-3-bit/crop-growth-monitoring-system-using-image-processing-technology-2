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
    height_cm: 60.0,
    canopy_cover_pct: 35.0,
    leaf_area_index: 1.5,
    status: 'Healthy',
    notes: '',
    ndvi_avg: 0.45
  });
  const [selectedFile, setSelectedFile] = useState(null);

  // Get active plot
  const selectedPlot = useMemo(() => {
    return plots.find(p => p.id === Number(selectedPlotId));
  }, [plots, selectedPlotId]);

  // Cassava Starch Estimation Model (RAYONG 72 basis)
  const calculateStarch = (plot, record = null) => {
    if (!plot) return 0.0;
    const plantingDate = new Date(plot.planting_date);
    const today = record ? new Date(record.date) : new Date();
    const diffTime = Math.abs(today - plantingDate);
    const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let baseStarch = (ageDays / 300) * 28.0;
    const activeRecord = record || plot.growth_records?.[0];
    const ndvi = activeRecord ? activeRecord.ndvi_avg : 0.45;
    let ndviFactor = ndvi / 0.7;
    let starch = baseStarch * ndviFactor;
    
    const statusVal = record ? record.status : plot.status;
    if (statusVal.toLowerCase().includes("stress") || statusVal.includes("เครียด")) {
      starch = starch * 0.8;
    }
    
    starch = Math.min(Math.max(starch, 0.0), 32.0);
    return parseFloat(starch.toFixed(1));
  };

  // Cassava Tuber Yield Prediction Model (Tons per Rai)
  const calculateYield = (plot, record = null) => {
    if (!plot) return 0.0;
    const plantingDate = new Date(plot.planting_date);
    const today = record ? new Date(record.date) : new Date();
    const diffTime = Math.abs(today - plantingDate);
    const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let baseYield = (ageDays / 300) * 4.5;
    const activeRecord = record || plot.growth_records?.[0];
    const ndvi = activeRecord ? activeRecord.ndvi_avg : 0.45;
    let ndviFactor = ndvi / 0.7;
    let yieldVal = baseYield * ndviFactor;
    
    const statusVal = record ? record.status : plot.status;
    if (statusVal.toLowerCase().includes("stress") || statusVal.includes("เครียด")) {
      yieldVal = yieldVal * 0.85;
    }
    yieldVal = Math.min(Math.max(yieldVal, 0.0), 6.5);
    return parseFloat(yieldVal.toFixed(1));
  };

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

  // Monthly Growth grouping
  const monthlyData = useMemo(() => {
    if (chronologicalRecords.length === 0) return [];
    
    const thMonths = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    const grouped = {};
    
    chronologicalRecords.forEach(rec => {
      const d = new Date(rec.date);
      const mLabel = `${thMonths[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`;
      
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

  const translateStatus = (status) => {
    if (!status) return "ไม่ระบุ";
    const s = status.toLowerCase();
    if (s.includes("healthy")) return "สมบูรณ์ดี";
    if (s.includes("stressed")) return "เครียด/โรคด่างพืช";
    if (s.includes("monitoring") || s.includes("active")) return "กำลังเฝ้าระวัง";
    if (s.includes("harvested")) return "เก็บเกี่ยวแล้ว";
    return status;
  };

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
      height_cm: latestRecord?.height_cm || 60.0,
      canopy_cover_pct: latestRecord?.canopy_cover_pct || 35.0,
      leaf_area_index: latestRecord?.leaf_area_index || 1.5,
      status: 'Healthy',
      notes: '',
      ndvi_avg: latestRecord?.ndvi_avg || 0.45
    });
    setSelectedFile(null);
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Call API backend
    if (dbStatus.connected) {
      try {
        const formDataPayload = new FormData();
        formDataPayload.append("plot_id", selectedPlotId);
        formDataPayload.append("date", formData.date);
        formDataPayload.append("height_cm", formData.height_cm);
        formDataPayload.append("canopy_cover_pct", formData.canopy_cover_pct);
        formDataPayload.append("ndvi_avg", formData.ndvi_avg);
        formDataPayload.append("leaf_area_index", formData.leaf_area_index);
        formDataPayload.append("status", formData.status);
        formDataPayload.append("notes", formData.notes);
        
        if (selectedFile) {
          formDataPayload.append("image", selectedFile);
        }

        const response = await fetch('/api/growth-records/', {
          method: 'POST',
          body: formDataPayload
        });

        if (response.ok) {
          setSuccessMsg("บันทึกข้อมูลการเจริญเติบโตมันสำปะหลังสำเร็จ");
          setModalOpen(false);
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          const errData = await response.json();
          setErrorMsg(errData.detail || "เกิดข้อผิดพลาดในการบันทึกข้อมูล");
        }
      } catch (err) {
        setErrorMsg("การเชื่อมต่อระบบบริการข้อมูลหลักขัดข้อง");
      }
    } else {
      // Mock saving fallback
      if (!selectedPlot.growth_records) {
        selectedPlot.growth_records = [];
      }
      
      const newRecord = {
        id: Math.floor(Math.random() * 1000) + 10,
        plot_id: Number(selectedPlotId),
        date: formData.date,
        height_cm: Number(formData.height_cm),
        canopy_cover_pct: Number(formData.canopy_cover_pct),
        ndvi_avg: Number(formData.ndvi_avg),
        leaf_area_index: Number(formData.leaf_area_index),
        status: formData.status,
        notes: formData.notes
      };

      if (selectedFile) {
        newRecord.image_path = URL.createObjectURL(selectedFile);
        newRecord.heatmap_path = URL.createObjectURL(selectedFile);
      }

      selectedPlot.growth_records.unshift(newRecord);
      setSuccessMsg("บันทึกข้อมูลสำเร็จ (โหมดจำลอง)");
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
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            บันทึกการเติบโตและประเมินแป้งรายแปลง
          </h2>
          <p className="text-sm text-slate-500">บันทึกตรวจวัดทางวิชาการและอัปเดตสถานะการสะสมแป้งของต้นมันสำปะหลังรายแปลง</p>
        </div>

        <div className="flex gap-2">
          {/* Plot selector drop-down */}
          <div className="relative">
            <select 
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="px-4 py-3 bg-white border border-slate-200 rounded-xl font-bold text-xs focus:outline-none focus:border-farm-500 shadow-sm"
            >
              {plots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <button
            onClick={openLogModal}
            disabled={plots.length === 0}
            className="flex items-center gap-2 px-5 py-3 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition duration-150 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            <span>เพิ่มบันทึกการเติบโต</span>
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
                <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">สรุปการรังวัด & ทำนายล่าสุด</span>
                <h3 className="font-extrabold text-slate-800 text-base mt-0.5">{selectedPlot?.name}</h3>
              </div>
              
              {latestRecord && (
                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                  latestRecord.status.includes("Healthy") || latestRecord.status.includes("สมบูรณ์") ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}>
                  {translateStatus(latestRecord.status)}
                </span>
              )}
            </div>
            
            {latestRecord ? (
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Ruler className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">ความสูงต้นมัน</p>
                    <h4 className="text-sm font-extrabold text-slate-800 mt-1">{latestRecord.height_cm} ซม.</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Percent className="w-5 h-5 text-green-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">แป้งสะสมทำนาย</p>
                    <h4 className="text-sm font-extrabold text-emerald-600 mt-1">{calculateStarch(selectedPlot, latestRecord)} %</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">ดัชนี NDVI ใบ</p>
                    <h4 className="text-sm font-extrabold text-farm-700 mt-1">{latestRecord.ndvi_avg}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-white border shadow-sm">
                  <Layers className="w-5 h-5 text-purple-500" />
                  <div>
                    <p className="text-[9px] text-slate-400 font-bold uppercase leading-none">คาดการณ์ผลผลิต</p>
                    <h4 className="text-sm font-extrabold text-amber-600 mt-1">{(calculateYield(selectedPlot, latestRecord) * selectedPlot.area_rai).toFixed(1)} ตัน</h4>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-slate-400 font-bold text-xs">
                ยังไม่มีข้อมูลบันทึกการเติบโตสำหรับแปลงนี้
              </div>
            )}
          </div>

          {latestRecord && (
            <div className="flex gap-2 items-center text-[10px] text-slate-400 font-semibold bg-slate-50 border p-2.5 rounded-xl mt-4">
              <Calendar className="w-4 h-4 text-farm-600 shrink-0" />
              <span>ตรวจรังวัดล่าสุดเมื่อ: {latestRecord.date}</span>
            </div>
          )}
        </div>

        {/* Dynamic Split imagery representation of latest upload */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl h-[340px] flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-800">รูปภาพล่าสุด & แผนที่ความร้อน NDVI</h3>
            <p className="text-xs text-slate-400">เปรียบเทียบภาพถ่ายแปลงมันสำปะหลังจริงกับภาพถ่ายวิเคราะห์ดัชนีสุขภาพเชิงแสง</p>
          </div>

          <div className="flex-1 border rounded-2xl bg-slate-50 overflow-hidden flex divide-x divide-slate-200 mt-3 relative">
            {latestRecord?.image_path ? (
              <>
                <div className="flex-1 h-full relative">
                  <img 
                    src={`/${latestRecord.image_path}`} 
                    alt="RGB" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold">ภาพแปลงจริง</span>
                </div>
                <div className="flex-1 h-full relative">
                  <img 
                    src={`/${latestRecord.heatmap_path}`} 
                    alt="Heatmap" 
                    className="w-full h-full object-cover"
                    onError={(e) => { e.target.style.display = 'none'; }}
                  />
                  <span className="absolute bottom-2 left-2 bg-farm-600/80 text-[9px] text-white px-1.5 py-0.5 rounded font-extrabold">แผนภาพสี NDVI</span>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 text-center p-6">
                <ImageIcon className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-xs font-bold leading-none">ไม่ได้แนบรูปถ่ายในการสำรวจรอบล่าสุด</p>
                <p className="text-[10px] text-slate-400 mt-1">คุณสามารถอัปโหลดรูปภาพใบมันสำปะหลังขณะบันทึก เพื่อเปรียบเทียบคลอโรฟิลล์สีใบพืชได้</p>
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
              การติดตามค่าดัชนี NDVI ประวัติความเขียวใบย้อนหลัง
            </h3>
            <p className="text-xs text-slate-400">ประเมินระดับการสังเคราะห์แสงเพื่อประมวลระยะสะสมแป้งของมันสำปะหลัง</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[280px]">
            {chronologicalRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chronologicalRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }} 
                  />
                  <YAxis 
                    domain={[0, 1.0]} 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 6px 16px rgba(0,0,0,0.05)' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="ndvi_avg" 
                    name="ดัชนี NDVI เฉลี่ย"
                    stroke="#10b981" 
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2, fill: '#fff' }}
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                ยังไม่มีข้อมูลดัชนีความเขียวใบมันสำปะหลัง
              </div>
            )}
          </div>
        </div>

        {/* Height chart monthly */}
        <div className="glass-panel p-6 rounded-3xl h-[380px] flex flex-col">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5">
              <Ruler className="w-5 h-5 text-amber-500" />
              แผนภูมิเปรียบเทียบอัตราความสูงของลำต้นรายเดือน (ซม.)
            </h3>
            <p className="text-xs text-slate-400">อัตราความสูงเฉลี่ยเพื่อจำแนกระยะตั้งตัวและระยะพัฒนาทางลำต้นใบ</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[280px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    axisLine={{ stroke: '#e2e8f0' }}
                  />
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 6px 16px rgba(0,0,0,0.05)' }}
                  />
                  <Bar dataKey="height" name="ความสูงลำต้น (ซม.)" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {monthlyData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#d97706' : '#f59e0b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                ยังไม่มีข้อมูลการเจริญเติบโตทางความสูงเฉลี่ยรายเดือน
              </div>
            )}
          </div>
        </div>

      </div>

      {/* TRACKING TIMELINE LOGS LIST */}
      <div className="glass-panel p-6 rounded-3xl">
        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
          <Clock className="w-5 h-5 text-slate-400" />
          ไทม์ไลน์บันทึกกิจกรรมและการสำรวจรายแปลงย้อนหลัง
        </h3>

        <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
          {reverseRecords.length > 0 ? (
            reverseRecords.map((rec, index) => {
              let dotStyle = 'bg-green-500';
              let tagStyle = 'bg-green-50 text-green-700 border-green-200';
              if (rec.status.toLowerCase().includes("stress") || rec.status.includes("เครียด")) {
                dotStyle = 'bg-red-500';
                tagStyle = 'bg-red-50 text-red-700 border-red-200';
              } else if (rec.status.toLowerCase().includes("monitor") || rec.status.includes("เฝ้าระวัง")) {
                dotStyle = 'bg-amber-500';
                tagStyle = 'bg-amber-50 text-amber-700 border-amber-200';
              } else if (rec.status.toLowerCase().includes("harvest") || rec.status.includes("เก็บเกี่ยว")) {
                dotStyle = 'bg-slate-500';
                tagStyle = 'bg-slate-50 text-slate-700 border-slate-200';
              }

              return (
                <div key={rec.id || index} className="relative flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  
                  {/* Timeline bullet node */}
                  <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ring-4 ring-slate-50 ${dotStyle}`} />

                  {/* Log description */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-800">{rec.date}</span>
                      <span className="text-slate-300 font-bold">•</span>
                      <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 border rounded-full ${tagStyle}`}>
                        {translateStatus(rec.status)}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 leading-normal max-w-[650px]">{rec.notes || "รายงานผลการสำรวจและบันทึกข้อมูลการเจริญเติบโตต้นมันสำปะหลังโดยทีมงานเกษตรดิจิทัล"}</p>
                    
                    {/* Measurements */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-slate-400 font-bold uppercase tracking-wider pt-1.5">
                      <span className="flex items-center gap-0.5"><Ruler className="w-3.5 h-3.5 text-slate-400" /> สูงต้นมัน: <strong className="text-slate-700">{rec.height_cm} ซม.</strong></span>
                      <span className="flex items-center gap-0.5"><Percent className="w-3.5 h-3.5 text-slate-400" /> แป้งทำนาย: <strong className="text-emerald-700 font-black">{calculateStarch(selectedPlot, rec)}%</strong></span>
                      <span className="flex items-center gap-0.5"><TrendingUp className="w-3.5 h-3.5 text-slate-400" /> NDVI: <strong className="text-slate-700">{rec.ndvi_avg}</strong></span>
                      <span className="flex items-center gap-0.5"><Percent className="w-3.5 h-3.5 text-slate-400" /> ทรงพุ่ม: <strong className="text-slate-700">{rec.canopy_cover_pct}%</strong></span>
                      <span className="flex items-center gap-0.5"><FileText className="w-3.5 h-3.5 text-slate-400" /> ผลผลิต: <strong className="text-amber-600 font-black">{(calculateYield(selectedPlot, rec) * selectedPlot.area_rai).toFixed(1)} ตัน</strong></span>
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
                          alt="RGB" 
                          className="w-10 h-10 rounded-lg object-cover border" 
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    ) : (
                      <span className="text-[9px] font-extrabold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1.5 rounded-lg flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" />
                        บันทึกแบบป้อนค่ามือ
                      </span>
                    )}
                  </div>

                </div>
              );
            })
          ) : (
            <div className="py-6 text-center text-slate-400 font-bold text-xs col-span-full">
              ยังไม่มีการบันทึกประวัติการเจริญเติบโตพืชพรรณพืชสำหรับแปลงที่เลือก
            </div>
          )}
        </div>
      </div>

      {/* SURVEY ENTRY DIALOG MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl overflow-hidden shadow-2xl">
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="text-base font-black text-slate-800">
                เพิ่มบันทึกตรวจวัดการเติบโต: {selectedPlot?.name}
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
                <label className="text-[10px] text-slate-400 font-extrabold uppercase">วันที่รังวัด / บันทึก</label>
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
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">ความสูงของต้นมัน (ซม.)</label>
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
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">สัดส่วนพื้นที่ใบปกคลุมดิน (%)</label>
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
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">ดัชนีพื้นที่ใบมัน (LAI)</label>
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
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">ผลประเมินสุขภาพต้นมัน</label>
                  <select 
                    name="status"
                    value={formData.status}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                  >
                    {["Healthy", "Active Monitoring", "Stressed", "Harvested"].map(s => (
                      <option key={s} value={s}>{translateStatus(s)}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Photo Upload vs manual NDVI */}
              <div className="space-y-1 bg-slate-50 border p-3.5 rounded-2xl">
                <label className="text-[10px] text-farm-700 font-black uppercase flex items-center gap-1">
                  <ImageIcon className="w-4 h-4" />
                  แนบภาพถ่ายแปลงมัน (แนะนำเพื่อสร้างแผนภาพสี)
                </label>
                <p className="text-[9px] text-slate-400 leading-tight mb-2">
                  ระบบจำแนกภาพถ่ายทางดาวเทียมและโดรนจะแปลงย่านคลื่นสีพืชเป็นแผนที่ความเข้มใบให้อัตโนมัติ
                </p>
                <input 
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-farm-100 file:text-farm-700 hover:file:bg-farm-200 file:cursor-pointer"
                />

                {!selectedFile && (
                  <div className="space-y-1 mt-3 pt-3 border-t">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">ค่าเฉลี่ยดัชนี NDVI (กรณีระบุค่ามือ)</label>
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
                <label className="text-[10px] text-slate-400 font-extrabold uppercase">ข้อสังเกตและบันทึกเพิ่มเติม</label>
                <textarea 
                  name="notes"
                  rows="3"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="เช่น สีใบมันปกติ, ใบด่างเฝ้าระวังโรค CMD, ใส่ปุ๋ยโพแทสเซียมบำรุงหัวแล้ว..."
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
                  ยกเลิก
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-white bg-farm-600 hover:bg-farm-700 rounded-xl font-extrabold text-xs shadow-md shadow-farm-200 transition"
                >
                  บันทึกข้อมูล
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
