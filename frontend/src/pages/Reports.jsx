import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from 'recharts';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter, 
  Calendar, 
  TrendingUp, 
  Percent, 
  Ruler, 
  Compass,
  Layers,
  Sparkles,
  Database
} from 'lucide-react';

export default function Reports({ plots, stats, dbStatus }) {
  const [reportType, setReportType] = useState('growth'); // 'growth' or 'ndvi'
  const [filterPlotId, setFilterPlotId] = useState('all');
  const [startDate, setStartDate] = useState('2026-04-01');
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

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

  // Aggregate all growth logs and flatten them
  const rawRecords = useMemo(() => {
    let list = [];
    plots.forEach(plot => {
      plot.growth_records?.forEach(rec => {
        list.push({
          ...rec,
          plotName: plot.name,
          cropType: plot.crop_type,
          plantingDate: plot.planting_date,
          rawDate: new Date(rec.date)
        });
      });
    });
    return list;
  }, [plots]);

  // Filter records chronologically ascending for charts
  const filteredRecords = useMemo(() => {
    let list = [...rawRecords];
    
    // Plot filter
    if (filterPlotId !== 'all') {
      list = list.filter(r => r.plot_id === Number(filterPlotId));
    }

    // Date range filter
    const start = new Date(startDate);
    const end = new Date(endDate);
    list = list.filter(r => r.rawDate >= start && r.rawDate <= end);

    return list.sort((a, b) => a.rawDate - b.rawDate);
  }, [rawRecords, filterPlotId, startDate, endDate]);

  // Area statistics breakdown & starch group distribution
  const areaStats = useMemo(() => {
    const totalPlots = plots.length;
    const totalArea = plots.reduce((sum, p) => sum + p.area_rai, 0);
    const avgSize = totalPlots > 0 ? (totalArea / totalPlots).toFixed(1) : 0;
    
    // Group area by Starch category
    const starchBreakdown = {
      'ใบสะสมแป้งต่ำ (<15%)': 0,
      'สะสมแป้งปานกลาง (15-25%)': 0,
      'หัวสะสมแป้งสูง (>25%)': 0
    };
    plots.forEach(p => {
      const starch = calculateStarch(p);
      if (starch < 15.0) starchBreakdown['ใบสะสมแป้งต่ำ (<15%)'] += p.area_rai;
      else if (starch >= 15.0 && starch <= 25.0) starchBreakdown['สะสมแป้งปานกลาง (15-25%)'] += p.area_rai;
      else starchBreakdown['หัวสะสมแป้งสูง (>25%)'] += p.area_rai;
    });

    const starchList = Object.entries(starchBreakdown).map(([name, val]) => ({
      name,
      value: val
    }));

    return {
      totalPlots,
      totalArea: totalArea.toFixed(1),
      avgSize,
      starchList
    };
  }, [plots]);

  // Calculated averages for filtered records
  const averages = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { ndvi: 0.0, height: 0.0, starch: 0.0, yield: 0.0, count: 0 };
    }
    const sumNdvi = filteredRecords.reduce((sum, r) => sum + r.ndvi_avg, 0);
    const sumHeight = filteredRecords.reduce((sum, r) => sum + r.height_cm, 0);
    
    let sumStarch = 0.0;
    let sumYield = 0.0;
    filteredRecords.forEach(r => {
      const plot = plots.find(p => p.id === r.plot_id || p.name === r.plotName);
      if (plot) {
        sumStarch += calculateStarch(plot, r);
        sumYield += calculateYield(plot, r) * plot.area_rai;
      }
    });

    return {
      ndvi: (sumNdvi / filteredRecords.length).toFixed(2),
      height: (sumHeight / filteredRecords.length).toFixed(1),
      starch: (sumStarch / filteredRecords.length).toFixed(1),
      yield: sumYield.toFixed(1),
      count: filteredRecords.length
    };
  }, [filteredRecords, plots]);

  const translateStatus = (status) => {
    if (!status) return "ไม่ระบุ";
    const s = status.toLowerCase();
    if (s.includes("healthy")) return "สมบูรณ์ดี";
    if (s.includes("stressed")) return "เครียด/ขาดสารอาหาร";
    if (s.includes("monitoring") || s.includes("active")) return "กำลังเฝ้าระวัง";
    if (s.includes("harvested")) return "เก็บเกี่ยวแล้ว";
    return status;
  };

  // Excel (.xls) Exporter
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("ไม่มีข้อมูลที่จะใช้ในการส่งออกรายงาน");
      return;
    }

    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8">
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>รายงานผลผลิตมันสำปะหลัง</x:Name>
                <x:WorksheetOptions>
                  <x:DisplayGridlines/>
                </x:WorksheetOptions>
              </x:ExcelWorksheet>
            </x:ExcelWorksheets>
          </x:ExcelWorkbook>
        </xml>
        <![endif]-->
      </head>
      <body>
        <h2>รายงานวิเคราะห์การเติบโตมันสำปะหลัง (${reportType === 'growth' ? 'รายงานการเติบโตความสูง' : 'รายงานวิเคราะห์คลอโรฟิลล์ NDVI'})</h2>
        <table border="1">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <th>วันที่สำรวจ</th>
              <th>ชื่อแปลง</th>
              <th>ประเภทพืช</th>
              <th>ความสูง (ซม.)</th>
              <th>เปอร์เซ็นต์แป้งสะสม (%)</th>
              <th>ค่าเฉลี่ยดัชนี NDVI</th>
              <th>คาดการณ์ผลผลิตรวม (ตัน)</th>
              <th>สถานะสุขภาพพืช</th>
              <th>ข้อสังเกตเพิ่มเติม</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRecords.forEach(r => {
      const plot = plots.find(p => p.id === r.plot_id || p.name === r.plotName);
      const starch = calculateStarch(plot, r);
      const yieldTons = plot ? (calculateYield(plot, r) * plot.area_rai).toFixed(1) : '0.0';

      tableHtml += `
        <tr>
          <td>${r.date}</td>
          <td>${r.plotName}</td>
          <td>มันสำปะหลัง</td>
          <td>${r.height_cm}</td>
          <td>${starch}</td>
          <td>${r.ndvi_avg}</td>
          <td>${yieldTons}</td>
          <td>${translateStatus(r.status)}</td>
          <td>${r.notes || ''}</td>
        </tr>
      `;
    });

    tableHtml += `
          </tbody>
        </table>
      </body>
      </html>
    `;

    const blob = new Blob([tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = `รายงานมันสำปะหลัง_${reportType}_${new Date().toISOString().split('T')[0]}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 lg:space-y-8 print:p-0">
      
      {/* PAGE HEADER (Hidden on print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">รายงานและสถิติภาพรวม</h2>
          <p className="text-sm text-slate-500">พิมพ์สรุปวิชาการเพื่อทำเล่มรายงาน, ส่งออกไฟล์ตารางบันทึกในรูปแบบ Excel และ PDF</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-slate-900 text-xs font-bold transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>ส่งออกตาราง Excel</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition"
          >
            <Printer className="w-4 h-4" />
            <span>พิมพ์รายงาน PDF</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROL CARD & REPORT TYPE TABS (Hidden on print) */}
      <div className="glass-panel p-6 rounded-3xl space-y-5 print:hidden">
        
        {/* Toggle Report Templates */}
        <div className="flex justify-between items-center border-b pb-4">
          <div className="flex bg-slate-100 p-1.5 rounded-xl border gap-1">
            <button
              onClick={() => setReportType('growth')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                reportType === 'growth' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายงานความสูงต้นมัน
            </button>
            <button
              onClick={() => setReportType('ndvi')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                reportType === 'ndvi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              รายงานดัชนี NDVI
            </button>
          </div>
          
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-farm-600" />
            ตัวกรองข้อมูลสรุปวิชาการ
          </h3>
        </div>

        {/* Filter Selection Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Plot select */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">แปลงมันสำปะหลังเป้าหมาย</label>
            <select 
              value={filterPlotId}
              onChange={(e) => setFilterPlotId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none"
            >
              <option value="all">แปลงมันสำปะหลังทั้งหมด</option>
              {plots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">วันที่สำรวจเริ่มต้น</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-xs focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">วันที่สำรวจสิ้นสุด</label>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-xs focus:outline-none"
            />
          </div>
        </div>

      </div>

      {/* PRINT REPORT HEADER (Only visible on print/PDF) */}
      <div className="hidden print:block border-b-2 pb-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">รายงานความสมบูรณ์และผลผลิตมันสำปะหลัง</h1>
            <p className="text-xs text-slate-400 mt-1">รายงานผลการตรวจรังวัดพืชเชิงพิกัดภูมิศาสตร์ • ระบบประมวลผลดัชนีแป้งสะสม</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-slate-800">สถานีวิจัยเกษตรดิจิทัลมันสำปะหลัง</h3>
            <p className="text-[10px] text-slate-400">พิมพ์ข้อมูล ณ วันที่: {new Date().toLocaleDateString('th-TH')}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t mt-4 text-xs font-semibold">
          <div>รูปแบบรายงาน: <span className="font-bold text-slate-950">{reportType === 'growth' ? 'ความสูงต้นและสัดส่วนใบ' : 'ย่านแสงสะท้อน NDVI'}</span></div>
          <div>แปลงทดลอง: <span className="font-bold text-slate-950">{filterPlotId === 'all' ? 'แปลงทั้งหมดในระบบ' : plots.find(p => p.id === Number(filterPlotId))?.name}</span></div>
          <div>เริ่มต้นรอบ: <span className="font-bold text-slate-950">{startDate}</span></div>
          <div>สิ้นสุดรอบ: <span className="font-bold text-slate-950">{endDate}</span></div>
        </div>
      </div>

      {/* AREA STATISTICS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total stats card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between border print:border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-4">
              <Compass className="w-5 h-5 text-farm-600" />
              สรุปสถิติแปลงเกษตรกรรม
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">พื้นที่รวมทั้งหมด:</span>
                <span className="text-slate-800 text-base font-black">{areaStats.totalArea} ไร่</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">แปลงมันที่ลงทะเบียนแล้ว:</span>
                <span className="text-slate-800 font-bold">{areaStats.totalPlots} แปลง</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">ขนาดพื้นที่เฉลี่ยต่อแปลง:</span>
                <span className="text-slate-800 font-bold">{areaStats.avgSize} ไร่ / แปลง</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 items-center text-[10px] text-slate-400 font-semibold bg-slate-50 border p-2.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-farm-600 shrink-0" />
            <span>คำนวณจากขนาดพิกัดสัดส่วนแผนที่ GIS ของหน่วยทดลองจริง</span>
          </div>
        </div>

        {/* Starch Classification area distribution list */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border print:border-slate-200">
          <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">สัดส่วนพื้นที่แปลงตามระดับแป้งสะสมทำนาย</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {areaStats.starchList.map((item, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">{item.name}</span>
                <h4 className="text-lg font-black text-slate-800 mt-2">{item.value.toFixed(1)} ไร่</h4>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-farm-600 h-full rounded-full" 
                    style={{ width: areaStats.totalArea > 0 ? `${(item.value / areaStats.totalArea * 100).toFixed(0)}%` : '0%' }} 
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* DYNAMIC TELEMETRY AVERAGES GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">เฉลี่ยดัชนี NDVI</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.ndvi}</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">ความสมบูรณ์ใบช่วงวิเคราะห์</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border flex items-center justify-center text-blue-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ความสูงลำต้นเฉลี่ย</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.height} ซม.</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">ความสูงพัฒนาการลำต้น</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border flex items-center justify-center text-amber-500">
            <Ruler className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">เฉลี่ยเปอร์เซ็นต์แป้งสะสม</span>
            <h3 className="text-2xl font-black text-emerald-600 mt-1">{averages.starch} %</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">ระดับเปอร์เซ็นต์แป้งทำนาย</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 border flex items-center justify-center text-green-500">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">ทำนายผลผลิตมันรวม</span>
            <h3 className="text-2xl font-black text-amber-600 mt-1">{averages.yield} ตัน</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">น้ำหนักผลผลิตสะสมคาดการณ์</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border flex items-center justify-center text-purple-500">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TEMPLATE DYNAMIC CHARTS */}
      {reportType === 'growth' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800">กราฟแสดงการยืดตัวความสูงต้นมัน</h3>
              <p className="text-xs text-slate-400">พัฒนาการความสูงเฉลี่ยต่อกิจกรรมการบันทึกตรวจวัด</p>
            </div>

            <div className="flex-1 mt-4 w-full h-[260px]">
              {filteredRecords.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredRecords}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                    <Line type="monotone" dataKey="height_cm" name="ความสูงลำต้น (ซม.)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">ไม่พบข้อมูลบันทึก</div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800">กราฟประเมินการพัฒนาสัดส่วนพุ่มใบ (%)</h3>
              <p className="text-xs text-slate-400">อัตราการปกคลุมดินของใบไม้เพื่อวิเคราะห์การสังเคราะห์แสง</p>
            </div>

            <div className="flex-1 mt-4 w-full h-[260px]">
              {filteredRecords.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRecords}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                    <Bar dataKey="canopy_cover_pct" name="ทรงพุ่มดิน (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">ไม่พบข้อมูลบันทึก</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800">เส้นกราฟพัฒนาการดัชนี NDVI พืช</h3>
            <p className="text-xs text-slate-400">แนวโน้มระดับคะแนนความเขียวสุขภาพพืชเฉลี่ยตามไทม์ไลน์สำรวจ</p>
          </div>

          <div className="flex-1 mt-4 w-full h-[260px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis domain={[0, 1.0]} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                  <Line type="monotone" dataKey="ndvi_avg" name="ดัชนี NDVI" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">ไม่พบข้อมูลบันทึก</div>
            )}
          </div>
        </div>
      )}

      {/* FILTERED DATASET TABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border print:border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center print:bg-white">
          <h3 className="font-bold text-slate-800">ชุดตารางรายงานการตรวจวัดมันสำปะหลังรายแปลง</h3>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded border print:hidden">
            พบข้อมูลทั้งหมด {filteredRecords.length} แถวบันทึก
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="reportTableId" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider print:bg-white">
                <th className="px-6 py-3.5">วันที่เข้าตรวจ</th>
                <th className="px-6 py-3.5">ชื่อแปลงพืช</th>
                <th className="px-6 py-3.5 text-right font-mono">ความสูงพืช</th>
                <th className="px-6 py-3.5 text-right font-mono">สัดส่วนแป้งทำนาย</th>
                <th className="px-6 py-3.5 text-right font-mono">คาดการณ์ผลผลิต</th>
                <th className="px-6 py-3.5 text-right font-mono">ค่าเฉลี่ย NDVI</th>
                <th className="px-6 py-3.5 text-right font-mono">ทรงพุ่มคลุมดิน</th>
                <th className="px-6 py-3.5">ประเมินสภาพ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => {
                  const plot = plots.find(p => p.id === r.plot_id || p.name === r.plotName);
                  const starch = calculateStarch(plot, r);
                  const yieldTons = plot ? (calculateYield(plot, r) * plot.area_rai).toFixed(1) : '0.0';

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition print:hover:bg-transparent">
                      <td className="px-6 py-3.5 font-bold text-slate-900">{r.date}</td>
                      <td className="px-6 py-3.5">{r.plotName}</td>
                      <td className="px-6 py-3.5 text-right text-emerald-700 font-black">{starch} %</td>
                      <td className="px-6 py-3.5 text-right text-amber-600 font-black">{yieldTons} ตัน</td>
                      <td className="px-6 py-3.5 text-right text-farm-700 font-extrabold">{r.ndvi_avg}</td>
                      <td className="px-6 py-3.5 text-right">{r.canopy_cover_pct}%</td>
                      <td className="px-6 py-3.5">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                          r.status.includes("Healthy") || r.status.includes("สมบูรณ์") ? 'bg-green-50 text-green-700 border border-green-200' :
                          r.status.includes("Stressed") || r.status.includes("เครียด") ? 'bg-red-50 text-red-700 border border-red-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {translateStatus(r.status)}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400 font-bold">
                    ไม่พบข้อมูลการรังวัดในช่วงตัวกรองหรือแปลงเพาะปลูกที่คุณระบุ
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
