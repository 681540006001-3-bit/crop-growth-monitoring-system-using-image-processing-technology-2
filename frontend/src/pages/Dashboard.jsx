import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
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
  MapPin, 
  TrendingUp, 
  Percent, 
  Layers, 
  Calendar, 
  ArrowUpRight, 
  Upload, 
  Sprout, 
  AlertTriangle,
  FileText,
  Search,
  Sliders,
  Sparkles,
  RefreshCw,
  Layers3,
  Compass
} from 'lucide-react';

// Setup Leaflet icon overrides
const greenMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const orangeMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const redMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const greyMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getMarkerByStatus = (status) => {
  const s = status.toLowerCase();
  if (s.includes("stress")) return redMarkerIcon;
  if (s.includes("active") || s.includes("monitoring")) return orangeMarkerIcon;
  if (s.includes("harvest")) return greyMarkerIcon;
  return greenMarkerIcon;
};

// React Leaflet controller component to animate maps flying to selected coordinate points
function MapFlyController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, zoom, { animate: true, duration: 1.5 });
    }
  }, [center, zoom, map]);
  return null;
}

export default function Dashboard({ stats, plots, navigateTo, dbStatus }) {
  const [mapType, setMapType] = useState('satellite'); // 'osm' or 'satellite'
  const [dragActive, setDragActive] = useState(false);
  const [selectedPlot, setSelectedPlot] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Default coordinate center (Suphan Buri, Thailand agricultural corridor)
  const defaultCenter = [14.365, 100.08];
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);

  // Count total growth records dynamically
  const totalRecords = useMemo(() => {
    return plots.reduce((sum, p) => sum + (p.growth_records?.length || 0), 0);
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

  // Filter plots by search
  const filteredSearchPlots = useMemo(() => {
    if (!searchQuery) return plots;
    return plots.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.crop_type.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [plots, searchQuery]);

  // Process data for Health Summary Pie Chart
  const pieData = useMemo(() => {
    const s = stats.health_summary;
    return [
      { name: 'Healthy', value: s?.healthy || 0, color: '#10b981' },
      { name: 'Monitoring', value: s?.monitoring || 0, color: '#f59e0b' },
      { name: 'Stressed', value: s?.stressed || 0, color: '#ef4444' },
      { name: 'Harvested', value: s?.harvested || 0, color: '#64748b' }
    ].filter(item => item.value > 0);
  }, [stats]);

  // Aggregate recent chronological growth logs
  const recentTimeline = useMemo(() => {
    const timeline = [];
    plots.forEach(plot => {
      plot.growth_records?.forEach(rec => {
        timeline.push({
          ...rec,
          plotName: plot.name,
          cropType: plot.crop_type
        });
      });
    });
    return timeline.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 4);
  }, [plots]);

  // Handles panning map to specific fields
  const handleFocusPlot = (plot) => {
    setSelectedPlot(plot);
    setMapCenter([plot.latitude, plot.longitude]);
    setMapZoom(14.5);
  };

  // Reset focus
  const handleResetMapFocus = () => {
    setSelectedPlot(null);
    setMapCenter(defaultCenter);
    setMapZoom(12);
  };

  // Drag & Drop
  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      navigateTo('ndvi');
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            Enterprise Agriculture Console
            <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100 uppercase tracking-widest">
              OneSoil Sync Active
            </span>
          </h2>
          <p className="text-sm text-slate-500">Multispectral GIS analysis dashboard, vegetation index telemetry, and field monitoring.</p>
        </div>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-white/60 border border-white/40 shadow-sm backdrop-blur-md text-xs font-bold text-slate-600">
          <Calendar className="w-4 h-4 text-farm-600" />
          <span>Surveillance Cycle: Q3 2026</span>
        </div>
      </div>

      {/* METRIC CARD GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* CARD 1: Total Crop Plots */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Crop Plots</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total_plots}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-farm-600 mt-2.5 bg-green-50 px-2 py-0.5 rounded-full w-max border border-green-100">
              <Sprout className="w-3.5 h-3.5" />
              <span>Active Fields</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Layers className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 2: Total Area */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Total Area (Rai)</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.total_area_rai}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 mt-2.5">
              <Compass className="w-3.5 h-3.5 text-slate-400" />
              <span>≈ {Math.round(stats.total_area_rai * 0.16)} Hectares</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Compass className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 3: Average NDVI */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Average NDVI</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{stats.average_ndvi}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-farm-600 mt-2.5 bg-green-50 px-2 py-0.5 rounded-full w-max border border-green-100">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Good Vegetation</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <Percent className="w-5.5 h-5.5" />
          </div>
        </div>

        {/* CARD 4: Growth Records */}
        <div className="glass-panel glass-panel-hover p-6 rounded-2xl flex items-center justify-between border border-white/50 backdrop-blur-md">
          <div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Growth Records</span>
            <h3 className="text-3xl font-black text-slate-900 mt-1">{totalRecords}</h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-farm-600 mt-2.5 bg-green-50 px-2 py-0.5 rounded-full w-max border border-green-100">
              <FileText className="w-3.5 h-3.5 text-farm-600" />
              <span>Surveyor Audits</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-green-500/10 to-emerald-500/5 text-farm-600 border border-green-200/30 flex items-center justify-center shadow-inner">
            <FileText className="w-5.5 h-5.5" />
          </div>
        </div>

      </div>

      {/* ENTERPRISE SPLIT-VIEW GIS CONTROL HUB */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN (1 col): Plot Control Sidecard */}
        <div className="glass-panel p-5 rounded-3xl flex flex-col h-[560px]">
          <div className="space-y-3 pb-4 border-b border-slate-100">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Sliders className="w-4 h-4 text-farm-600" />
                Plot Control Sidecar
              </h3>
              {selectedPlot && (
                <button 
                  onClick={handleResetMapFocus}
                  className="text-[10px] font-black text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3 animate-spin-once" />
                  Reset View
                </button>
              )}
            </div>
            
            {/* Search filter bar */}
            <div className="relative">
              <input 
                type="text"
                placeholder="Search plot or crop type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-farm-400"
              />
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            </div>
          </div>

          {/* Scrollable Plots list */}
          <div className="flex-1 overflow-y-auto py-2.5 space-y-2">
            {filteredSearchPlots.map((plot) => {
              const active = selectedPlot?.id === plot.id;
              const rec = plot.growth_records?.[0];
              
              let statusBorder = 'border-l-green-500';
              if (plot.status.toLowerCase().includes("stress")) statusBorder = 'border-l-red-500';
              else if (plot.status.toLowerCase().includes("monitor")) statusBorder = 'border-l-amber-500';
              else if (plot.status.toLowerCase().includes("harvest")) statusBorder = 'border-l-slate-500';

              return (
                <div 
                  key={plot.id}
                  onClick={() => handleFocusPlot(plot)}
                  className={`p-3.5 border border-l-4 rounded-xl cursor-pointer transition ${statusBorder} ${
                    active 
                      ? 'bg-emerald-50/50 border-farm-200' 
                      : 'bg-white hover:bg-slate-50 border-slate-100'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800 leading-tight">{plot.name}</h4>
                      <span className="text-[10px] text-slate-400 font-bold mt-1 block">{plot.crop_type} • {plot.area_rai} Rai</span>
                    </div>
                    {rec && (
                      <div className="text-right">
                        <span className="text-xs font-black text-farm-700 block">{rec.ndvi_avg} NDVI</span>
                        <span className="text-[9px] text-slate-400 font-bold block">{rec.height_cm} cm</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filteredSearchPlots.length === 0 && (
              <div className="text-center text-slate-400 py-10 font-bold text-xs">No matching fields found.</div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMNS (2 cols): GIS Map Container */}
        <div className="lg:col-span-2 glass-panel p-5 rounded-3xl flex flex-col h-[560px] relative">
          <div className="flex justify-between items-center mb-4 z-20">
            <div>
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 leading-none">
                <MapPin className="w-4.5 h-4.5 text-farm-600" />
                GIS Satellite Mapping Center
              </h3>
              <p className="text-[10px] text-slate-400 mt-1">Overlaying multispectral data indices over Google Satellite channels.</p>
            </div>
            
            {/* Tile Layer Toggle */}
            <div className="flex bg-slate-100 border p-1 rounded-xl gap-1">
              <button 
                onClick={() => setMapType('osm')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  mapType === 'osm' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Vector Map
              </button>
              <button 
                onClick={() => setMapType('satellite')}
                className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                  mapType === 'satellite' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Satellite Hybrid
              </button>
            </div>
          </div>

          {/* MAP */}
          <div className="flex-1 relative overflow-hidden rounded-2xl border border-slate-200 shadow-inner z-10">
            <MapContainer 
              center={mapCenter} 
              zoom={mapZoom} 
              scrollWheelZoom={true}
              className="w-full h-full"
            >
              <TileLayer
                attribution="&copy; Google Maps / OpenStreetMap"
                url={mapType === 'osm' ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" : "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"}
              />

              <MapFlyController center={mapCenter} zoom={mapZoom} />

              {plots.map((plot) => {
                const latestRec = plot.growth_records?.[0];
                const markerIconType = getMarkerByStatus(plot.status);
                
                let polyColor = '#10b981';
                if (plot.status.toLowerCase().includes("stress")) polyColor = '#ef4444';
                else if (plot.status.toLowerCase().includes("monitor")) polyColor = '#f59e0b';
                else if (plot.status.toLowerCase().includes("harvest")) polyColor = '#64748b';

                const isFocused = selectedPlot?.id === plot.id;

                return (
                  <React.Fragment key={plot.id}>
                    {plot.boundary_coordinates && (
                      <Polygon 
                        positions={plot.boundary_coordinates.map(coord => [coord.lat, coord.lng])}
                        eventHandlers={{ click: () => handleFocusPlot(plot) }}
                        pathOptions={{ 
                          color: polyColor, 
                          fillColor: polyColor, 
                          fillOpacity: isFocused ? 0.35 : 0.15, 
                          weight: isFocused ? 4 : 2 
                        }}
                      />
                    )}

                    <Marker 
                      position={[plot.latitude, plot.longitude]} 
                      icon={markerIconType}
                    >
                      <Popup>
                        <div className="p-1 min-w-[200px] font-sans">
                          <div className="flex justify-between items-center border-b pb-1.5 mb-1.5">
                            <span className="font-extrabold text-sm text-slate-800 leading-tight">{plot.name}</span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              plot.status.includes("Healthy") ? 'bg-green-100 text-green-700' :
                              plot.status.includes("Stressed") ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                            }`}>{plot.status}</span>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                            <div>Crop Type:</div>
                            <div className="font-bold text-right text-slate-800">{plot.crop_type}</div>
                            <div>Size:</div>
                            <div className="font-bold text-right text-slate-800">{plot.area_rai} Rai</div>
                            {latestRec && (
                              <>
                                <div>NDVI Score:</div>
                               <div className="font-bold text-right text-farm-700">{latestRec.ndvi_avg}</div>
                              </>
                            )}
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  </React.Fragment>
                );
              })}
            </MapContainer>

            {/* FLOATING NDVI GRADIENT LEGEND BAR */}
            <div className="absolute bottom-4 right-4 z-20 bg-white/90 backdrop-blur border border-slate-200/80 p-2.5 rounded-xl shadow-lg w-52 flex flex-col gap-1.5 font-sans">
              <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                <span>NDVI Spectral Range</span>
                <span>Vigor</span>
              </div>
              <div className="h-2.5 w-full rounded bg-gradient-to-r from-red-500 via-yellow-400 to-green-600" />
              <div className="flex justify-between items-center text-[9px] text-slate-600 font-extrabold">
                <span>-1.0 (Soil)</span>
                <span>0.0</span>
                <span>1.0 (Canopy)</span>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* SATELLITE PASS ACQUISITION TELEMETRY & HEALTH PIE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1 & 2: Recent Sentinel Pass Telemetry (2 cols) */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col justify-between h-[380px]">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
              <Layers3 className="w-5 h-5 text-farm-600" />
              Satellite Telemetry Acquisition Logs
            </h3>
            <p className="text-xs text-slate-400">Recent Copernicus Sentinel-2A multispectral imaging pass history.</p>
          </div>

          <div className="overflow-x-auto my-4 flex-1 flex flex-col justify-center">
            <table className="w-full text-left border-collapse text-xs font-semibold">
              <thead>
                <tr className="border-b text-[9px] text-slate-400 uppercase font-black tracking-wider">
                  <th className="py-2.5">Orbit Pass Date</th>
                  <th className="py-2.5">Satellite Mission</th>
                  <th className="py-2.5 text-center">Cloud Cover</th>
                  <th className="py-2.5 text-right">Data Channels</th>
                  <th className="py-2.5 text-right">Resolution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-slate-900">2026-07-11 03:41 UTC</td>
                  <td className="py-3">Sentinel-2A MSI</td>
                  <td className="py-3 text-center">
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-black text-[9px]">
                      1.2% (Clear)
                    </span>
                  </td>
                  <td className="py-3 text-right">B4, B8 (Red + NIR)</td>
                  <td className="py-3 text-right font-mono">10m / px</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-slate-900">2026-07-06 03:41 UTC</td>
                  <td className="py-3">Sentinel-2B MSI</td>
                  <td className="py-3 text-center">
                    <span className="bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded-full font-black text-[9px]">
                      74.5% (Overcast)
                    </span>
                  </td>
                  <td className="py-3 text-right">B2, B3, B4, B8</td>
                  <td className="py-3 text-right font-mono">10m / px</td>
                </tr>
                <tr className="hover:bg-slate-50/50">
                  <td className="py-3 font-bold text-slate-900">2026-07-01 03:41 UTC</td>
                  <td className="py-3">Sentinel-2A MSI</td>
                  <td className="py-3 text-center">
                    <span className="bg-green-50 text-green-700 border border-green-200 px-2 py-0.5 rounded-full font-black text-[9px]">
                      4.8% (Optimal)
                    </span>
                  </td>
                  <td className="py-3 text-right">B4, B8 (Red + NIR)</td>
                  <td className="py-3 text-right font-mono">10m / px</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="flex gap-2 items-center text-[10px] text-slate-400 font-bold bg-slate-50 border p-2.5 rounded-xl">
            <Sparkles className="w-4 h-4 text-farm-600 shrink-0 animate-pulse" />
            <span>Next orbital pass cycle acquisition target: July 16, 2026.</span>
          </div>
        </div>

        {/* COLUMN 3: Health breakdown pie chart */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col h-[380px] justify-between">
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Health breakdown</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Crop health proportions distribution.</p>
          </div>

          <div className="flex-1 flex items-center justify-center">
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
              <div className="text-sm font-semibold text-slate-400">No plots recorded</div>
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
                    <span className="text-slate-800 font-bold">{item.value} Fields</span>
                    <span className="text-slate-400">({percent}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* TREND CHART & SPECTROSCOPIC PIPELINE WORKFLOW */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUMN 1 & 2: Historical NDVI progression */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-3xl flex flex-col h-[400px]">
          <div>
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-farm-600" />
              Multi-Temporal NDVI Trend Comparison
            </h3>
            <p className="text-xs text-slate-400">Chlorophyll activity comparison across fields based on multi-temporal satellite records.</p>
          </div>

          <div className="flex-grow mt-4 w-full h-[280px]">
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
              <div className="flex items-center justify-center h-full text-slate-400 text-sm font-semibold">
                Waiting for history telemetry.
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: Drag and Drop analysis lab shortcut */}
        <div className="glass-panel p-6 rounded-3xl flex flex-col h-[400px] justify-between">
          <div>
            <h3 className="font-bold text-slate-800">Satellite & Aerial Lab</h3>
            <p className="text-xs text-slate-400">Process multispectral GeoTIFFs or standard farm photographs.</p>
          </div>

          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => navigateTo('ndvi')}
            className={`flex-1 my-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-6 text-center cursor-pointer transition-all duration-300 ${
              dragActive 
                ? 'border-farm-500 bg-farm-50/50 scale-[0.98]' 
                : 'border-slate-200 hover:border-farm-400 hover:bg-farm-50/10'
            }`}
          >
            <div className="w-14 h-14 rounded-full bg-farm-50 flex items-center justify-center text-farm-600 mb-3 transition">
              <Upload className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-bold text-slate-800">Analyze Vegetation Health</h4>
            <p className="text-xs text-slate-400 max-w-[200px] mt-1.5 leading-relaxed">
              Drag & drop drone/satellite imagery or click to browse.
            </p>
            <span className="text-[10px] text-slate-400 font-bold mt-3 bg-slate-100 border px-2 py-0.5 rounded">
              JPG • PNG • GeoTIFF
            </span>
          </div>

          <button 
            onClick={() => navigateTo('ndvi')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-farm-600 to-emerald-600 hover:from-farm-700 hover:to-emerald-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition"
          >
            Open NDVI Processing Hub
          </button>
        </div>

      </div>

      {/* RECENT GROWTH TIMELINE FEEDS */}
      <div className="glass-panel p-6 rounded-3xl">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="font-bold text-slate-800">Recent Growth Logs</h3>
            <p className="text-xs text-slate-400">Chronological telemetry feed submitted by surveyors and satellite calculations.</p>
          </div>
          <button 
            onClick={() => navigateTo('growth')}
            className="flex items-center gap-1 text-xs font-bold text-farm-600 hover:text-farm-700 bg-farm-50 px-3 py-1.5 rounded-lg border border-farm-100 transition"
          >
            Manage Records
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* LOGS LIST */}
        <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-6">
          {recentTimeline.map((record, index) => {
            let statusColor = 'bg-green-500';
            let statusBg = 'bg-green-50';
            let statusTxt = 'text-green-700';
            
            if (record.status.toLowerCase().includes("stress")) {
              statusColor = 'bg-red-500';
              statusBg = 'bg-red-50';
              statusTxt = 'text-red-700';
            } else if (record.status.toLowerCase().includes("monitor")) {
              statusColor = 'bg-amber-500';
              statusBg = 'bg-amber-50';
              statusTxt = 'text-amber-700';
            } else if (record.status.toLowerCase().includes("harvest")) {
              statusColor = 'bg-slate-500';
              statusBg = 'bg-slate-50';
              statusTxt = 'text-slate-700';
            }

            return (
              <div key={record.id || index} className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className={`absolute -left-[31px] w-4 h-4 rounded-full border-2 border-white ring-4 ring-slate-50 ${statusColor}`} />
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-slate-800">{record.plotName}</h4>
                    <span className="text-[10px] text-slate-400">•</span>
                    <span className="text-xs text-slate-400 font-semibold">{record.cropType}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${statusBg} ${statusTxt}`}>
                      {record.status}
                    </span>
                  </div>
                  
                  <p className="text-xs text-slate-500 font-semibold max-w-[600px]">{record.notes}</p>
                  
                  <div className="flex gap-4 text-[10px] text-slate-400 font-semibold pt-1">
                    <span>Date: {record.date}</span>
                    <span>NDVI: <strong className="text-slate-600">{record.ndvi_avg}</strong></span>
                    <span>Height: <strong className="text-slate-600">{record.height_cm} cm</strong></span>
                    <span>Canopy: <strong className="text-slate-600">{record.canopy_cover_pct}%</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  {record.heatmap_path ? (
                    <div className="flex gap-1.5">
                      <div>
                        <img 
                          src={`/${record.heatmap_path}`} 
                          alt="Heatmap" 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                      <div>
                        <img 
                          src={`/${record.image_path}`} 
                          alt="Original" 
                          className="w-10 h-10 rounded-lg object-cover border border-slate-200 shadow-sm"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold bg-slate-50 border px-2 py-1.5 rounded-lg">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Manual Log</span>
                    </div>
                  )}
                </div>
                
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}
