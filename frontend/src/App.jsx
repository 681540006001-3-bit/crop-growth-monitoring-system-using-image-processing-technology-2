import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Sprout, 
  Image as ImageIcon, 
  BarChart3, 
  Settings, 
  Plus, 
  Database,
  CloudSun,
  User,
  Menu,
  X,
  Compass,
  Layers
} from 'lucide-react';

// Import Pages
import Dashboard from './pages/Dashboard';
import CropPlotManagement from './pages/CropPlotManagement';
import GrowthMonitoring from './pages/GrowthMonitoring';
import NDVIAnalysis from './pages/NDVIAnalysis';
import Reports from './pages/Reports';
import GISMap from './pages/GISMap';

const MOCK_PLOTS = [
  {
    id: 1,
    name: "A1 Rice Paddy (North)",
    crop_type: "Rice",
    area_rai: 12.5,
    planting_date: "2026-04-14",
    status: "Healthy",
    latitude: 14.3582,
    longitude: 100.0827,
    boundary_coordinates: [
      { lat: 14.3595, lng: 100.0815 },
      { lat: 14.3595, lng: 100.0839 },
      { lat: 14.3570, lng: 100.0839 },
      { lat: 14.3570, lng: 100.0815 }
    ],
    growth_records: [
      { id: 1, plot_id: 1, date: "2026-07-13", height_cm: 102.0, canopy_cover_pct: 92.0, ndvi_avg: 0.78, leaf_area_index: 4.8, status: "Healthy", notes: "Rice growth tracking. Progressing smoothly. Age 90 days." },
      { id: 2, plot_id: 1, date: "2026-06-28", height_cm: 95.0, canopy_cover_pct: 88.0, ndvi_avg: 0.73, leaf_area_index: 4.5, status: "Healthy", notes: "Rice height close to target. Checking water level." },
      { id: 3, plot_id: 1, date: "2026-06-13", height_cm: 78.0, canopy_cover_pct: 78.0, ndvi_avg: 0.62, leaf_area_index: 3.8, status: "Healthy", notes: "Tillering stage completed successfully." }
    ]
  },
  {
    id: 2,
    name: "B3 Sugarcane Field",
    crop_type: "Sugarcane",
    area_rai: 24.0,
    planting_date: "2026-02-13",
    status: "Active Monitoring",
    latitude: 14.3821,
    longitude: 100.0415,
    boundary_coordinates: [
      { lat: 14.3835, lng: 100.0395 },
      { lat: 14.3835, lng: 100.0435 },
      { lat: 14.3805, lng: 100.0435 },
      { lat: 14.3805, lng: 100.0395 }
    ],
    growth_records: [
      { id: 4, plot_id: 2, date: "2026-07-13", height_cm: 260.0, canopy_cover_pct: 82.0, ndvi_avg: 0.70, leaf_area_index: 5.2, status: "Active Monitoring", notes: "Sugarcane monitoring. Stalk elongation stage." },
      { id: 5, plot_id: 2, date: "2026-06-13", height_cm: 205.0, canopy_cover_pct: 74.0, ndvi_avg: 0.64, leaf_area_index: 4.7, status: "Healthy", notes: "Normal stalk growth." }
    ]
  },
  {
    id: 3,
    name: "C2 Cassava Plantation",
    crop_type: "Cassava",
    area_rai: 8.2,
    planting_date: "2026-05-29",
    status: "Stressed",
    latitude: 14.3210,
    longitude: 100.1200,
    boundary_coordinates: [
      { lat: 14.3220, lng: 100.1185 },
      { lat: 14.3220, lng: 100.1215 },
      { lat: 14.3200, lng: 100.1215 },
      { lat: 14.3200, lng: 100.1185 }
    ],
    growth_records: [
      { id: 6, plot_id: 3, date: "2026-07-13", height_cm: 60.0, canopy_cover_pct: 45.0, ndvi_avg: 0.38, leaf_area_index: 2.1, status: "Stressed", notes: "Recent yellowing observed on lower leaves. Suspected nitrogen deficiency." }
    ]
  },
  {
    id: 4,
    name: "D5 Maize Cultivation",
    crop_type: "Corn",
    area_rai: 15.0,
    planting_date: "2026-03-15",
    status: "Harvested",
    latitude: 14.4010,
    longitude: 100.1510,
    boundary_coordinates: [
      { lat: 14.4025, lng: 100.1495 },
      { lat: 14.4025, lng: 100.1525 },
      { lat: 14.3995, lng: 100.1525 },
      { lat: 14.3995, lng: 100.1495 }
    ],
    growth_records: [
      { id: 7, plot_id: 4, date: "2026-07-13", height_cm: 0.0, canopy_cover_pct: 0.0, ndvi_avg: 0.10, leaf_area_index: 0.0, status: "Harvested", notes: "Maize crop successfully harvested. Field stubble remains." },
      { id: 8, plot_id: 4, date: "2026-06-23", height_cm: 205.0, canopy_cover_pct: 80.0, ndvi_avg: 0.76, leaf_area_index: 3.8, status: "Healthy", notes: "Grain filling stage, approaching harvest." }
    ]
  }
];

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [plots, setPlots] = useState(MOCK_PLOTS);
  const [dbStatus, setDbStatus] = useState({ connected: false, mode: 'Initializing...' });
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [stats, setStats] = useState({
    total_plots: 4,
    total_area_rai: 59.7,
    average_ndvi: 0.49,
    health_summary: { healthy: 2, monitoring: 1, stressed: 1, harvested: 1 }
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const plotsRes = await fetch('/api/plots');
      if (plotsRes.ok) {
        const plotsData = await plotsRes.json();
        setPlots(plotsData);
        
        const statsRes = await fetch('/api/dashboard/stats');
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
        
        setDbStatus({ connected: true, mode: 'Live System' });
      } else {
        throw new Error('Backend failed');
      }
    } catch (err) {
      console.warn("Backend API offline. Operating in Offline Demo Mode.", err);
      setDbStatus({ connected: false, mode: 'Demo / Offline' });
      
      const totalPlots = MOCK_PLOTS.length;
      const totalArea = MOCK_PLOTS.reduce((acc, p) => acc + p.area_rai, 0);
      const activeNdviPlots = MOCK_PLOTS.filter(p => p.growth_records.length > 0);
      const avgNdvi = activeNdviPlots.reduce((acc, p) => acc + p.growth_records[0].ndvi_avg, 0) / activeNdviPlots.length;
      
      const healthSummary = { healthy: 0, monitoring: 0, stressed: 0, harvested: 0 };
      MOCK_PLOTS.forEach(p => {
        const statusKey = p.status.toLowerCase().replace(" ", "_");
        if (statusKey.includes("monitor") || statusKey.includes("active")) healthSummary.monitoring++;
        else if (statusKey.includes("stress")) healthSummary.stressed++;
        else if (statusKey.includes("harvest")) healthSummary.harvested++;
        else healthSummary.healthy++;
      });

      setPlots(MOCK_PLOTS);
      setStats({
        total_plots: totalPlots,
        total_area_rai: parseFloat(totalArea.toFixed(1)),
        average_ndvi: parseFloat(avgNdvi.toFixed(2)),
        health_summary: healthSummary
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navigateTo = (page) => {
    setActivePage(page);
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Render components according to routing state
  const renderContent = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard stats={stats} plots={plots} navigateTo={navigateTo} dbStatus={dbStatus} />;
      case 'plots':
        return <CropPlotManagement plots={plots} onRefresh={fetchData} dbStatus={dbStatus} />;
      case 'gis':
        return <GISMap plots={plots} />;
      case 'growth':
        return <GrowthMonitoring plots={plots} onRefresh={fetchData} dbStatus={dbStatus} />;
      case 'ndvi':
        return <NDVIAnalysis plots={plots} onRefresh={fetchData} dbStatus={dbStatus} />;
      case 'reports':
        return <Reports plots={plots} stats={stats} dbStatus={dbStatus} />;
      case 'settings':
        return (
          <div className="space-y-6 lg:space-y-8 max-w-2xl">
            <div>
              <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">System Settings</h2>
              <p className="text-sm text-slate-500">Configure connection strings, API credentials, and default colormap preferences.</p>
            </div>
            
            <div className="glass-panel p-6 rounded-3xl space-y-6">
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Database className="w-5 h-5 text-farm-600" />
                  Geospatial Database Connection
                </h3>
                
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 font-extrabold uppercase">Database Driver URL</label>
                  <input 
                    type="text" 
                    readOnly
                    value={dbStatus.connected ? "mysql+pymysql://farmer:agriculture_secret_123@db/smart_farming" : "sqlite:///./farming.db (Fallback Active)"}
                    className="w-full px-3.5 py-2.5 rounded-xl border bg-slate-50 text-slate-500 font-mono text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-farm-600" />
                  GIS Layer Configurations
                </h3>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Google Maps API Satellite Base Hybrid layer</span>
                    <span className="text-green-600 font-bold">Enabled (Zero-Key CDN)</span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>OpenStreetMap Vector layer</span>
                    <span className="text-green-600 font-bold">Enabled (OSM org)</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="font-bold text-slate-800 border-b pb-2 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-farm-600" />
                  Spectral Index Calibration
                </h3>
                
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">RGB Foliage Proxy Algorithm</label>
                    <select className="w-full px-3 py-2 rounded-xl border bg-white font-semibold text-xs focus:outline-none">
                      <option>GLI - Green Leaf Index (Recommended for RGB photos)</option>
                      <option>ExG - Excess Green Index</option>
                      <option>VARI - Visible Atmospherically Resistant Index</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">Spectral Colormap Palette</label>
                    <select className="w-full px-3 py-2 rounded-xl border bg-white font-semibold text-xs focus:outline-none">
                      <option>Precision Red-Yellow-Green Colormap (Dense contrast)</option>
                      <option>Standard NDVI Rainbow Colormap</option>
                      <option>Grayscale Spectral Reflectance</option>
                    </select>
                  </div>
                </div>
              </div>
              
              <div className="pt-4 flex gap-3 border-t">
                <button 
                  type="button"
                  onClick={() => alert('Configuration profiles saved locally.')}
                  className="flex-1 py-3 text-white bg-farm-600 hover:bg-farm-700 rounded-xl font-extrabold text-xs shadow-md shadow-farm-200 transition"
                >
                  Save Configurations
                </button>
              </div>
            </div>
          </div>
        );
      default:
        return <Dashboard stats={stats} plots={plots} navigateTo={navigateTo} dbStatus={dbStatus} />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 antialiased font-sans">
      
      {/* SIDEBAR */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-white/70 border-r border-white/40 backdrop-blur-xl transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* LOGO */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-green-100">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-tr from-farm-600 to-emerald-400 text-white shadow-md shadow-farm-200">
              <Sprout className="w-5.5 h-5.5" />
            </div>
            <div>
              <h1 className="font-extrabold text-[1.125rem] text-slate-900 leading-tight">CropIntel OS</h1>
              <span className="text-[0.6875rem] font-bold text-farm-600 tracking-wider uppercase">Farming Image AI</span>
            </div>
          </div>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MENU TABS */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'plots', label: 'Crop Plots', icon: Map },
            { id: 'gis', label: 'GIS Mapping', icon: Compass },
            { id: 'growth', label: 'Growth Monitoring', icon: Sprout },
            { id: 'ndvi', label: 'NDVI Analysis', icon: ImageIcon },
            { id: 'reports', label: 'Reports', icon: BarChart3 },
            { id: 'settings', label: 'Settings', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  isActive 
                    ? 'bg-gradient-to-r from-farm-600 to-emerald-600 text-white shadow-md shadow-farm-200' 
                    : 'text-slate-600 hover:bg-farm-50 hover:text-farm-700'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-farm-600'}`} />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* SIDEBAR FOOTER */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white border border-slate-200 shadow-sm">
            <div className={`p-2 rounded-lg ${dbStatus.connected ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'}`}>
              <Database className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[0.6875rem] text-slate-400 font-semibold uppercase tracking-wider leading-none">Database Status</p>
              <h4 className="text-xs font-bold text-slate-700 mt-1 truncate">{dbStatus.mode}</h4>
            </div>
            <div className={`w-2.5 h-2.5 rounded-full ${dbStatus.connected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          </div>
          
          <div className="flex items-center gap-2 mt-4 px-3 text-[0.75rem] text-slate-400 font-semibold">
            <Compass className="w-3.5 h-3.5" />
            <span>Ver. 2.1 • Smart Farming</span>
          </div>
        </div>
      </aside>

      {/* MAIN LAYOUT */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-gradient-to-tr from-green-50/20 via-slate-50 to-emerald-50/20">
        
        {/* TOP BAR */}
        <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-white/45 border-b border-white/20 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-xl text-slate-500 hover:bg-white hover:text-slate-800 shadow-sm border border-slate-200/50"
            >
              <Menu className="w-5.5 h-5.5" />
            </button>
            
            <div className="hidden sm:block">
              <h2 className="text-sm font-bold text-slate-900">Precision Agriculture Hub</h2>
              <p className="text-xs text-slate-400 mt-0.5">Crop Growth Monitoring System</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/60 shadow-sm text-slate-600 text-xs font-semibold">
              <CloudSun className="w-4 h-4 text-amber-500" />
              <span>Suphan Buri, TH • 31°C</span>
            </div>

            <button 
              onClick={() => navigateTo('ndvi')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all duration-200"
            >
              <Plus className="w-4 h-4" />
              <span>Quick NDVI Upload</span>
            </button>

            <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
              <div className="hidden text-right lg:block">
                <h4 className="text-xs font-bold text-slate-900">Dr. Mark Hanson</h4>
                <p className="text-[0.6875rem] text-slate-400 font-semibold">Farm Director</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-farm-100 text-farm-700 border border-farm-200 flex items-center justify-center font-bold text-sm shadow-inner shadow-farm-200/50">
                <User className="w-4 h-4" />
              </div>
            </div>
          </div>
        </header>

        {/* PAGE BODY */}
        <main className="flex-grow p-6 lg:p-8 max-w-[1600px] w-full mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="w-10 h-10 border-4 border-farm-200 border-t-farm-600 rounded-full animate-spin" />
              <p className="text-sm font-semibold text-slate-500">Loading system metrics...</p>
            </div>
          ) : (
            <div className="fade-in">
              {renderContent()}
            </div>
          )}
        </main>
      </div>
      
    </div>
  );
}
