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
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';
import { 
  TrendingUp, 
  Percent, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  Upload, 
  Sprout, 
  FileText, 
  Search, 
  Sliders, 
  Sparkles, 
  RefreshCw, 
  Layers3, 
  Compass, 
  MapPin,
  CheckCircle,
  HelpCircle
} from 'lucide-react';

export default function Dashboard({ stats, plots, navigateTo, dbStatus }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Cassava Plot Age Calculation
  const calculateAge = (plantingDateStr) => {
    const plantingDate = new Date(plantingDateStr);
    const today = new Date();
    const diffTime = Math.abs(today - plantingDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  // Cassava Starch Estimation Model (RAYONG 72 basis)
  const calculateStarch = (plot) => {
    const ageDays = calculateAge(plot.planting_date);
    let baseStarch = (ageDays / 300) * 28.0; // max starch around 28%
    const latestRec = plot.growth_records?.[0];
    const ndvi = latestRec ? latestRec.ndvi_avg : 0.45;
    let ndviFactor = ndvi / 0.7; // normalized health factor
    let starch = baseStarch * ndviFactor;
    
    if (plot.status.toLowerCase().includes("stress") || plot.status.includes("เครียด")) {
      starch = starch * 0.8;
    }
    
    starch = Math.min(Math.max(starch, 0.0), 32.0);
    return parseFloat(starch.toFixed(1));
  };

  // Cassava Tuber Yield Prediction Model (Tons per Rai)
  const calculateYield = (plot) => {
    const ageDays = calculateAge(plot.planting_date);
    let baseYield = (ageDays / 300) * 4.5; // standard average of 4.5 Tons/Rai
    const latestRec = plot.growth_records?.[0];
    const ndvi = latestRec ? latestRec.ndvi_avg : 0.45;
    let ndviFactor = ndvi / 0.7;
    let yieldVal = baseYield * ndviFactor;
    
    if (plot.status.toLowerCase().includes("stress") || plot.status.includes("เครียด")) {
      yieldVal = yieldVal * 0.85;
    }
    
    yieldVal = Math.min(Math.max(yieldVal, 0.0), 6.5);
    return parseFloat(yieldVal.toFixed(1));
  };

  // Average Starch content across all active cassava plots
  const avgStarchContent = useMemo(() => {
    if (plots.length === 0) return 0.0;
    const totalStarch = plots.reduce((sum, p) => sum + calculateStarch(p), 0);
    return parseFloat((totalStarch / plots.length).toFixed(1));
  }, [plots]);

  // Total Estimated Yield in tons across all plots
  const totalEstimatedYield = useMemo(() => {
    return plots.reduce((sum, p) => sum + (calculateYield(p) * p.area_rai), 0);
  }, [plots]);

  // Process data for multi-line NDVI History chart
  const ndviHistoryData = useMemo(() => {
    const allDates = new Set();
    plots.forEach(plot => {
      plot.growth_records?.forEach(rec => {
        allDates.add(rec.date);
      });
    });
    
    const sortedDates = Array.from(allDates).sort();
    
    return sortedDates.map(date => {
      const row = { date };
      plots.forEach(plot => {
        const recordForDate = plot.growth_records?.find(rec => rec.date === date);
        if (recordForDate) {
          row[plot.name] = recordForDate.ndvi_avg;
        }
      });
      return row;
    });
  }, [plots]);

  // Filter plots by search query for the dashboard summary table
  const filteredTablePlots = useMemo(() => {
    if (!searchQuery) return plots;
    return plots.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plots, searchQuery]);

  // Process data for Health Summary Pie Chart
  const pieData = useMemo(() => {
    const s = stats.health_summary;
    return [
      { name: 'เพิ่งปลูก (Newly Planted)', value: s?.newly_planted || 0, color: '#3b82f6' },
      { name: 'สมบูรณ์ดี (Healthy)', value: s?.healthy || 0, color: '#10b981' },
      { name: 'เฝ้าระวัง (Monitoring)', value: s?.monitoring || 0, color: '#f59e0b' },
      { name: 'เครียด/โรคด่าง (Stressed)', value: s?.stressed || 0, color: '#ef4444' },
      { name: 'เก็บเกี่ยวแล้ว (Harvested)', value: s?.harvested || 0, color: '#64748b' }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Translate status text to Thai for UI display
  const translateStatus = (status) => {
    if (!status) return "ไม่ระบุ";
    const s = status.toLowerCase();
    if (s.includes("healthy")) return "สมบูรณ์ดี";
    if (s.includes("stressed")) return "เครียด/โรคพืช";
    if (s.includes("monitoring") || s.includes("active")) return "กำลังเฝ้าระวัง";
    if (s.includes("harvested")) return "เก็บเกี่ยวแล้ว";
    if (s.includes("newly") || s.includes("just") || s.includes("ปลูก")) return "เพิ่งปลูก";
    return status;
  };

  // Aggregate recent chronological growth logs
  const recentTimeline = useMemo(() => {
    const timeline = [];
    plots.forEach(plot => {
      plot.growth_records?.forEach(rec => {
        timeline.push({
          ...rec,
          plotName: plot.name,
          cropType: plot.crop_type,
          plantingDate: plot.planting_date
        });
      });
    });
    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
  }, [plots]);

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            แผงวิเคราะห์สุขภาพมันสำปะหลังอัจฉริยะ (Cassava Dashboard)
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
              โหมดประสิทธิภาพสูง (ลื่นไหล 60FPS)
            </span>
          </h2>
          <p className="text-sm text-slate-500">ติดตามความสมบูรณ์เชิงใบไม้ NDVI, ประเมินระดับแป้งสะสม และทำนายประมาณผลผลิตรายแปลง</p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/60 border border-white/40 shadow-sm backdrop-blur-md text-xs font-bold text-slate-600">
          <Calendar className="w-4 h-4 text-farm-600" />
          <span>วิเคราะห์ข้อมูลเรียลไทม์</span>
        </div>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: Total Crop Plots */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">แปลงมันสำปะหลังทั้งหมด</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total_plots} แปลง</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-farm-600 mt-2.5 bg-green-50 px-2 py-0.5 rounded-full w-max border border-green-100">
              <Sprout className="w-3.5 h-3.5" />
              <span>แปลงทั้งหมดในระบบ</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Layers className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 2: Total Area */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">พื้นที่มันรวมทั้งหมด (ไร่)</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total_area_rai} ไร่</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>≈ {Math.round(stats.total_area_rai * 0.16)} เฮกตาร์</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Compass className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 3: Average Starch content */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">ค่าแป้งสะสมทำนายเฉลี่ย</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{avgStarchContent} %</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 mt-2.5 bg-emerald-50 px-2 py-0.5 rounded-full w-max border border-emerald-100">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>ทำนายจากอายุและ NDVI</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Percent className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 4: Total Estimated Yield */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">คาดการณ์ผลผลิตหัวมันรวม</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{totalEstimatedYield.toFixed(1)} ตัน</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-600 mt-2.5 bg-amber-50 px-2 py-0.5 rounded-full w-max border border-amber-100">
              <FileText className="w-3.5 h-3.5" />
              <span>ประเมินผลผลิตตามจริง</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <FileText className="w-5.5 h-5.5" />
          </div>
        </div>

      </div>

      {/* CHARTS GRID SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LINE CHART: Historical NDVI progression (2/3 width) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col h-[380px]">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-farm-600" />
              การเปรียบเทียบแนวโน้มค่าดัชนี NDVI ใบมันสำปะหลังย้อนหลัง
            </h3>
            <p className="text-xs text-slate-400">กราฟเปรียบเทียบคลอโรฟิลล์ใบพืชและการเติบโตเชิงแสงจำแนกรายแปลง</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[250px]">
            {ndviHistoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={ndviHistoryData}>
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
                  <Legend 
                    wrapperStyle={{ fontSize: 11, fontWeight: 600 }} 
                    verticalAlign="bottom" 
                    height={36} 
                  />
                  {plots.map((plot, index) => {
                    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
                    return (
                      <Line
                        key={plot.id}
                        type="monotone"
                        dataKey={plot.name}
                        stroke={colors[index % colors.length]}
                        strokeWidth={3}
                        dot={{ r: 4, strokeWidth: 2 }}
                        activeDot={{ r: 6 }}
                        connectNulls
                      />
                    );
                  })}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">
                ยังไม่มีประวัติการวิเคราะห์ดัชนีสะสมแป้งส่งเข้ามาบันทึกในฐานข้อมูล
              </div>
            )}
          </div>
        </div>

        {/* PIE CHART: Health Summary (1/3 width) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col h-[380px] justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">สัดส่วนประเมินสุขภาพต้นมันรวม</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">ภาพรวมเปอร์เซ็นต์ระดับสุขภาพและความสมบูรณ์ใบมัน</p>
          </div>

          <div className="flex-grow flex items-center justify-center">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={170}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs font-bold text-slate-400">ยังไม่มีข้อมูลแปลงมันสำปะหลังในระบบ</div>
            )}
          </div>

          {/* List Legends */}
          <div className="space-y-1.5 border-t pt-4">
            {pieData.map((item, idx) => {
              const total = stats.total_plots || 1;
              const percent = Math.round((item.value / total) * 100);
              return (
                <div key={idx} className="flex items-center justify-between text-xs font-semibold">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-500">{item.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-slate-800 font-bold">{item.value} แปลง</span>
                    <span className="text-slate-400">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* PLOT SUMMARY INFORMATION TABLE - REPLACE MAP DRAWINGS */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center flex-col sm:flex-row gap-3">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-sm leading-none">
              <Sliders className="w-4.5 h-4.5 text-farm-600" />
              สรุปตรรกะคาดการณ์แป้งและผลผลิตรายแปลง (Cassava Prediction Table)
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">ประเมินเปรียบเทียบระหว่างอายุแปลง ปริมาณคลอโรฟิลล์ใบ NDVI และผลผลิตสะสมรวม</p>
          </div>

          {/* Search Table input */}
          <div className="relative w-full sm:w-64">
            <input 
              type="text"
              placeholder="กรองชื่อแปลง..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-farm-400"
            />
            <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-semibold">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3">ชื่อแปลงมันสำปะหลัง</th>
                <th className="px-6 py-3">วันปักชำ / เริ่มปลูก</th>
                <th className="px-6 py-3 text-right">อายุแปลง (วัน)</th>
                <th className="px-6 py-3 text-right">NDVI ล่าสุด</th>
                <th className="px-6 py-3 text-right text-emerald-700">เปอร์เซ็นต์แป้งสะสม</th>
                <th className="px-6 py-3 text-right text-amber-700">ผลผลิตทำนายรวม</th>
                <th className="px-6 py-3">สภาพและอาการแปลง</th>
                <th className="px-6 py-3 text-center">ทางลัด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredTablePlots.length > 0 ? (
                filteredTablePlots.map((plot) => {
                  const latestRec = plot.growth_records?.[0];
                  const starch = calculateStarch(plot);
                  const yieldVal = calculateYield(plot);
                  const age = calculateAge(plot.planting_date);

                  return (
                    <tr key={plot.id} className="hover:bg-slate-50/50 transition">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{plot.name}</td>
                      <td className="px-6 py-3.5 text-slate-500">{plot.planting_date}</td>
                      <td className="px-6 py-3.5 text-right font-mono">{age} วัน</td>
                      <td className="px-6 py-3.5 text-right text-farm-700 font-bold">{latestRec ? latestRec.ndvi_avg : '0.45'}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-700 font-black">{starch} %</td>
                      <td className="px-6 py-3.5 text-right text-amber-600 font-black">{(yieldVal * plot.area_rai).toFixed(1)} ตัน <span className="text-[10px] text-slate-400 font-semibold">({yieldVal} ตัน/ไร่)</span></td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full inline-block ${
                          plot.status.includes("Healthy") || plot.status.includes("สมบูรณ์") ? 'bg-green-50 text-green-700 border border-green-200' :
                          plot.status.includes("Stressed") || plot.status.includes("เครียด") ? 'bg-red-50 text-red-700 border border-red-200' :
                          plot.status.includes("Newly") || plot.status.includes("ปลูก") ? 'bg-blue-50 text-blue-700 border border-blue-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>{translateStatus(plot.status)}</span>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <button 
                          onClick={() => navigateTo('gis')}
                          className="text-[9px] font-black text-farm-600 hover:text-farm-700 bg-farm-50 border border-farm-200 px-2 py-1 rounded-lg transition"
                        >
                          ส่องดาวเทียม GIS
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400 font-bold">
                    ไม่พบข้อมูลแปลงมันสำปะหลัง
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SATELLITE PASS TELEMETRY, TIMELINE & WORKFLOW SHORTCUT */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Recent Sentinel Pass Telemetry (1/3 width) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-[340px]">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-farm-600" />
              วงโคจรดาวเทียม Sentinel-2
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">รอบเวลาภาพสแกนข้ามเขตพื้นที่แปลงมัน</p>
          </div>

          <div className="overflow-x-auto my-3 flex-1 flex flex-col justify-center">
            <table className="w-full text-left border-collapse text-[10px] font-semibold">
              <thead>
                <tr className="border-b text-[8px] text-slate-400 uppercase font-black tracking-wider">
                  <th className="py-2">วันสแกน</th>
                  <th className="py-2 text-center">เมฆบัง</th>
                  <th className="py-2 text-right">มิติภาพ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">11 ก.ค. 03:41</td>
                  <td className="py-2.5 text-center text-green-700 font-black">1.2%</td>
                  <td className="py-2.5 text-right font-mono">10m/px</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">06 ก.ค. 03:41</td>
                  <td className="py-2.5 text-center text-red-700 font-black">74.5%</td>
                  <td className="py-2.5 text-right font-mono">10m/px</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-2.5 font-bold text-slate-900">01 ก.ค. 03:41</td>
                  <td className="py-2.5 text-center text-green-700 font-black">4.8%</td>
                  <td className="py-2.5 text-right font-mono">10m/px</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 items-center text-[9px] text-slate-400 font-bold bg-slate-50 border p-2 rounded-xl">
            <Sparkles className="w-4 h-4 text-farm-600 shrink-0" />
            <span>ประมาณการรอบถัดไป: 16 กรกฎาคม 2026</span>
          </div>
        </div>

        {/* Recent timeline growth logs (1/3 width) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col justify-between h-[340px]">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Sprout className="w-5 h-5 text-farm-600" />
              การเข้าสำรวจแปลงล่าสุด
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">ประวัติความสูงและการประเมินน้ำแป้งหัวมัน</p>
          </div>

          <div className="flex-grow my-3 space-y-3 overflow-y-auto">
            {recentTimeline.map((record, index) => {
              const logStarch = calculateStarch({
                planting_date: record.plantingDate,
                growth_records: [record],
                status: record.status
              });

              return (
                <div key={record.id || index} className="flex flex-col border-b border-slate-100 pb-2 last:border-b-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-xs text-slate-800">{record.plotName}</span>
                    <span className="text-[9px] text-slate-400">{record.date}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500 font-semibold mt-1">
                    <span>สูง: {record.height_cm} ซม.</span>
                    <span>แป้งทำนาย: <strong className="text-emerald-700 font-black">{logStarch}%</strong></span>
                  </div>
                </div>
              );
            })}
            {recentTimeline.length === 0 && (
              <div className="text-slate-400 text-[10px] font-bold py-6 text-center">ยังไม่มีข้อมูลบันทึก</div>
            )}
          </div>

          <button 
            onClick={() => navigateTo('growth')}
            className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border text-[10px] font-bold transition"
          >
            จัดการข้อมูลการสำรวจ
          </button>
        </div>

        {/* Image processing upload lab shortcut (1/3 width) */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col h-[340px] justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">วิเคราะห์ภาพด่วน (NDVI Lab)</h3>
            <p className="text-[10px] text-slate-400 mt-1">ประมวลผลดัชนีคลอโรฟิลล์ใบจากโดรนหรือกล้อง</p>
          </div>

          <div 
            onClick={() => navigateTo('ndvi')}
            className="flex-1 my-3 border-2 border-dashed border-slate-200 hover:border-farm-400 hover:bg-farm-50/10 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition"
          >
            <Upload className="w-5.5 h-5.5 text-farm-600 mb-1.5" />
            <h4 className="text-xs font-bold text-slate-800">วิเคราะห์สีใบพืชด่วน</h4>
            <p className="text-[9px] text-slate-400 max-w-[150px] mt-1">
              ลากและวางภาพถ่ายแปลงมันที่นี่ เพื่อคำนวณเฉดสีใบ
            </p>
          </div>

          <button 
            onClick={() => navigateTo('ndvi')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-farm-600 to-emerald-600 hover:from-farm-700 hover:to-emerald-700 text-white font-extrabold text-[10px] shadow-md shadow-farm-200 transition"
          >
            เข้าแล็บประมวลผล NDVI
          </button>
        </div>

      </div>

    </div>
  );
}
