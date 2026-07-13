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

  // Aggregate all growth logs and flatten them
  const rawRecords = useMemo(() => {
    let list = [];
    plots.forEach(plot => {
      plot.growth_records?.forEach(rec => {
        list.push({
          ...rec,
          plotName: plot.name,
          cropType: plot.crop_type,
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

  // Area statistics breakdown
  const areaStats = useMemo(() => {
    const totalPlots = plots.length;
    const totalArea = plots.reduce((sum, p) => sum + p.area_rai, 0);
    const avgSize = totalPlots > 0 ? (totalArea / totalPlots).toFixed(1) : 0;
    
    // Group area by crop type
    const cropBreakdown = {};
    plots.forEach(p => {
      cropBreakdown[p.crop_type] = (cropBreakdown[p.crop_type] || 0) + p.area_rai;
    });

    const cropList = Object.entries(cropBreakdown).map(([name, val]) => ({
      name,
      value: val
    })).sort((a, b) => b.value - a.value);

    return {
      totalPlots,
      totalArea: totalArea.toFixed(1),
      avgSize,
      cropList
    };
  }, [plots]);

  // Calculated averages for filtered records
  const averages = useMemo(() => {
    if (filteredRecords.length === 0) {
      return { ndvi: 0.0, height: 0.0, canopy: 0.0, lai: 0.0, count: 0 };
    }
    const sumNdvi = filteredRecords.reduce((sum, r) => sum + r.ndvi_avg, 0);
    const sumHeight = filteredRecords.reduce((sum, r) => sum + r.height_cm, 0);
    const sumCanopy = filteredRecords.reduce((sum, r) => sum + r.canopy_cover_pct, 0);
    const sumLai = filteredRecords.reduce((sum, r) => sum + r.leaf_area_index, 0);

    return {
      ndvi: (sumNdvi / filteredRecords.length).toFixed(2),
      height: (sumHeight / filteredRecords.length).toFixed(1),
      canopy: (sumCanopy / filteredRecords.length).toFixed(1),
      lai: (sumLai / filteredRecords.length).toFixed(2),
      count: filteredRecords.length
    };
  }, [filteredRecords]);

  // Excel (.xls) Exporter
  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      alert("No data available to export");
      return;
    }

    // Create an XML-based HTML table that Excel opens natively
    let tableHtml = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <!--[if gte mso 9]>
        <xml>
          <x:ExcelWorkbook>
            <x:ExcelWorksheets>
              <x:ExcelWorksheet>
                <x:Name>Crop Growth Report</x:Name>
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
        <h2>Crop Monitoring Report (${reportType === 'growth' ? 'Growth Report' : 'NDVI Chlorophyll Report'})</h2>
        <table border="1">
          <thead>
            <tr style="background-color: #f1f5f9; font-weight: bold;">
              <th>Log Date</th>
              <th>Plot Name</th>
              <th>Crop Type</th>
              <th>Height (cm)</th>
              <th>Canopy Cover (%)</th>
              <th>Average NDVI</th>
              <th>Leaf Area Index (LAI)</th>
              <th>Health Status</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
    `;

    filteredRecords.forEach(r => {
      tableHtml += `
        <tr>
          <td>${r.date}</td>
          <td>${r.plotName}</td>
          <td>${r.cropType}</td>
          <td>${r.height_cm}</td>
          <td>${r.canopy_cover_pct}</td>
          <td>${r.ndvi_avg}</td>
          <td>${r.leaf_area_index}</td>
          <td>${r.status}</td>
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
    link.download = `crop_monitor_${reportType}_report.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // PDF print trigger
  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div className="space-y-6 lg:space-y-8 print:p-0">
      
      {/* PAGE HEADER (Hidden on print) */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">System Reports</h2>
          <p className="text-sm text-slate-500">Compile precision summaries, export Excel logs, and print PDF certificates.</p>
        </div>

        <div className="flex items-center gap-2">
          {/* Excel Export */}
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-slate-200 shadow-sm text-slate-700 hover:text-slate-900 text-xs font-bold transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export Excel</span>
          </button>

          {/* PDF Export */}
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Export PDF / Print</span>
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
              Growth Report
            </button>
            <button
              onClick={() => setReportType('ndvi')}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                reportType === 'ndvi' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              NDVI Report
            </button>
          </div>
          
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Filter className="w-4 h-4 text-farm-600" />
            Report Telemetry Filters
          </h3>
        </div>

        {/* Filter Selection Panel */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Plot select */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">Selected Target Area</label>
            <select 
              value={filterPlotId}
              onChange={(e) => setFilterPlotId(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white font-bold text-xs focus:outline-none"
            >
              <option value="all">All Registered Plots</option>
              {plots.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">Start date</label>
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-white font-semibold text-xs focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div className="space-y-1">
            <label className="text-[10px] text-slate-400 font-extrabold uppercase">End date</label>
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
            <h1 className="text-2xl font-black text-slate-900 uppercase">Precision Farming Report</h1>
            <p className="text-xs text-slate-400 mt-1">Geospatial Diagnostic Data Sheet • CropIntel Labs</p>
          </div>
          <div className="text-right">
            <h3 className="text-sm font-bold text-slate-800">Suphan Buri Station</h3>
            <p className="text-[10px] text-slate-400">Compiled Date: {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4 pt-4 border-t mt-4 text-xs font-semibold">
          <div>Template: <span className="font-bold text-slate-950">{reportType === 'growth' ? 'Growth Progress' : 'NDVI Spectral'}</span></div>
          <div>Target Area: <span className="font-bold text-slate-950">{filterPlotId === 'all' ? 'All Plots' : plots.find(p => p.id === Number(filterPlotId))?.name}</span></div>
          <div>Period Start: <span className="font-bold text-slate-950">{startDate}</span></div>
          <div>Period End: <span className="font-bold text-slate-950">{endDate}</span></div>
        </div>
      </div>

      {/* AREA STATISTICS BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Total stats card */}
        <div className="lg:col-span-1 glass-panel p-6 rounded-3xl flex flex-col justify-between border print:border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-1.5 border-b pb-2 mb-4">
              <Compass className="w-5 h-5 text-farm-600" />
              Area Statistics Summary
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Total Cultivation (Rai):</span>
                <span className="text-slate-800 text-base font-black">{areaStats.totalArea} Rai</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Registered Crop Plots:</span>
                <span className="text-slate-800 font-bold">{areaStats.totalPlots} Plots</span>
              </div>
              <div className="flex justify-between items-center text-xs font-semibold">
                <span className="text-slate-500">Average Field Size:</span>
                <span className="text-slate-800 font-bold">{areaStats.avgSize} Rai/Plot</span>
              </div>
            </div>
          </div>

          <div className="mt-4 flex gap-2 items-center text-[10px] text-slate-400 font-semibold bg-slate-50 border p-2.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-farm-600 shrink-0" />
            <span>Reflects overall geospatial acreage parameters.</span>
          </div>
        </div>

        {/* Crop classification area distribution list */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl border print:border-slate-200">
          <h3 className="font-bold text-slate-800 border-b pb-2 mb-4">Crop Distribution Acreage</h3>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {areaStats.cropList.map((crop, idx) => (
              <div key={idx} className="p-4 rounded-2xl bg-slate-50/50 border flex flex-col justify-between shadow-sm">
                <span className="text-[10px] text-slate-400 font-extrabold uppercase">{crop.name}</span>
                <h4 className="text-lg font-black text-slate-800 mt-2">{crop.value} Rai</h4>
                <div className="w-full bg-slate-200 h-1.5 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="bg-farm-600 h-full rounded-full" 
                    style={{ width: `${(crop.value / areaStats.totalArea * 100).toFixed(0)}%` }} 
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
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Averages NDVI</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.ndvi}</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">Filtered average score</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 border flex items-center justify-center text-blue-500">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Averages Height</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.height} cm</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">Elongation values</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border flex items-center justify-center text-amber-500">
            <Ruler className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Averages Canopy</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.canopy}%</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">Foliar photosynthetic area</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-50 border flex items-center justify-center text-green-500">
            <Percent className="w-5 h-5" />
          </div>
        </div>

        <div className="glass-panel p-6 rounded-2xl border print:border-slate-200 flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Averages LAI</span>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{averages.lai}</h3>
            <span className="text-[10px] text-slate-400 font-bold mt-1 block">Leaf Area Index coverage</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 border flex items-center justify-center text-purple-500">
            <Layers className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* TEMPLATE DYNAMIC CHARTS */}
      {reportType === 'growth' ? (
        // Growth charts: Height & Canopy progression curves
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800">Vertical Height Progress</h3>
              <p className="text-xs text-slate-400">Average crop elongation heights curve (cm).</p>
            </div>
            
            <div className="flex-1 mt-4 w-full h-[260px]">
              {filteredRecords.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredRecords}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                    <Line type="monotone" dataKey="height_cm" name="Height (cm)" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">No records found.</div>
              )}
            </div>
          </div>

          <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
            <div>
              <h3 className="font-bold text-slate-800">Canopy Density Progress</h3>
              <p className="text-xs text-slate-400">Foliage photosynthetic coverage percentage progression (%).</p>
            </div>

            <div className="flex-1 mt-4 w-full h-[260px]">
              {filteredRecords.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRecords}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                    <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                    <Bar dataKey="canopy_cover_pct" name="Canopy Cover (%)" fill="#10b981" radius={[4, 4, 0, 0]}>
                      {filteredRecords.map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? '#10b981' : '#34d399'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">No records found.</div>
              )}
            </div>
          </div>
        </div>
      ) : (
        // NDVI charts: Chlorophyll trend comparison
        <div className="glass-panel p-6 rounded-3xl h-[360px] flex flex-col border print:border-slate-200">
          <div>
            <h3 className="font-bold text-slate-800">Spectral NDVI Progression Curve</h3>
            <p className="text-xs text-slate-400">Vegetation health index mapped over timeline range.</p>
          </div>

          <div className="flex-1 mt-4 w-full h-[260px]">
            {filteredRecords.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={filteredRecords}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <YAxis domain={[0, 1.0]} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} />
                  <Tooltip contentStyle={{ background: 'rgba(255, 255, 255, 0.95)', borderRadius: '10px' }} />
                  <Line type="monotone" dataKey="ndvi_avg" name="NDVI Index" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-xs font-bold">No records found.</div>
            )}
          </div>
        </div>
      )}

      {/* FILTERED DATASET TABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm border print:border-slate-200">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center print:bg-white">
          <h3 className="font-bold text-slate-800">Report Tabular Dataset</h3>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded border print:hidden">
            {filteredRecords.length} LOG RECORDS
          </span>
        </div>

        <div className="overflow-x-auto">
          <table id="reportTableId" className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider print:bg-white">
                <th className="px-6 py-3.5">Log Date</th>
                <th className="px-6 py-3.5">Plot Name</th>
                <th className="px-6 py-3.5">Crop Classification</th>
                <th className="px-6 py-3.5 text-right font-mono">Height (cm)</th>
                <th className="px-6 py-3.5 text-right font-mono">Canopy (%)</th>
                <th className="px-6 py-3.5 text-right font-mono">Avg NDVI</th>
                <th className="px-6 py-3.5 text-right font-mono">LAI</th>
                <th className="px-6 py-3.5">Health Assessment</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {filteredRecords.length > 0 ? (
                filteredRecords.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition print:hover:bg-transparent">
                    <td className="px-6 py-3.5 font-bold text-slate-900">{r.date}</td>
                    <td className="px-6 py-3.5">{r.plotName}</td>
                    <td className="px-6 py-3.5">
                      <span className="bg-slate-100 border text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        {r.cropType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">{r.height_cm} cm</td>
                    <td className="px-6 py-3.5 text-right">{r.canopy_cover_pct}%</td>
                    <td className="px-6 py-3.5 text-right text-farm-700 font-extrabold">{r.ndvi_avg}</td>
                    <td className="px-6 py-3.5 text-right">{r.leaf_area_index}</td>
                    <td className="px-6 py-3.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        r.status.includes("Healthy") ? 'bg-green-50 text-green-700 border border-green-200' :
                        r.status.includes("Stressed") ? 'bg-red-50 text-red-700 border border-red-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="px-6 py-8 text-center text-slate-400 font-bold">
                    No matching records found in this configuration range.
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
