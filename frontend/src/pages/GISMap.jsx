import React, { useState, useMemo, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon,
  ImageOverlay,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Layers, 
  MapPin, 
  Eye, 
  EyeOff, 
  Sliders, 
  Sprout, 
  Compass, 
  TrendingUp,
  Info,
  X,
  Search,
  RefreshCw
} from 'lucide-react';

import { thaiProvinces } from '../utils/thaiProvinces';

// Setup marker icons override
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

const blueMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const getMarkerIcon = (status) => {
  if (!status) return greenMarkerIcon;
  const s = status.toLowerCase();
  if (s.includes("stress") || s.includes("เครียด")) return redMarkerIcon;
  if (s.includes("active") || s.includes("monitoring") || s.includes("เฝ้าระวัง")) return orangeMarkerIcon;
  if (s.includes("harvest") || s.includes("เก็บเกี่ยว")) return greyMarkerIcon;
  if (s.includes("newly") || s.includes("just") || s.includes("ปลูก")) return blueMarkerIcon;
  return greenMarkerIcon;
};

const getMockHeatmapUrl = (status) => {
  if (!status) return "";
  const s = status.toLowerCase();
  if (s.includes("stress") || s.includes("เครียด")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23ef4444' stop-opacity='0.8'/><stop offset='50%' stop-color='%23f59e0b' stop-opacity='0.7'/><stop offset='100%' stop-color='%23ef4444' stop-opacity='0.8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  if (s.includes("monitor") || s.includes("เฝ้าระวัง")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f59e0b' stop-opacity='0.7'/><stop offset='50%' stop-color='%2386efac' stop-opacity='0.8'/><stop offset='100%' stop-color='%2322c55e' stop-opacity='0.7'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  if (s.includes("harvest") || s.includes("เก็บเกี่ยว")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2378716c' stop-opacity='0.7'/><stop offset='100%' stop-color='%2344403c' stop-opacity='0.7'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  if (s.includes("newly") || s.includes("just") || s.includes("ปลูก")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%233b82f6' stop-opacity='0.5'/><stop offset='100%' stop-color='%2360a5fa' stop-opacity='0.5'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2322c55e' stop-opacity='0.8'/><stop offset='50%' stop-color='%2315803d' stop-opacity='0.9'/><stop offset='100%' stop-color='%23052e16' stop-opacity='0.8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
};

// Sub-component to fly map to targeted coordinate pinpoints dynamically
function MapSearchFlyController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function GISMap({ plots }) {
  const [mapType, setMapType] = useState('satellite_hybrid'); // satellite, satellite_hybrid, terrain, osm
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showNDVI, setShowNDVI] = useState(true);
  const [starchFilter, setStarchFilter] = useState('all'); // all, low, medium, high
  const [activePlot, setActivePlot] = useState(null);

  // Geographic coordinates search state
  const [geoQuery, setGeoQuery] = useState('');
  const [geoSearching, setGeoSearching] = useState(false);
  const [geoError, setGeoError] = useState(null);
  const [searchPin, setSearchPin] = useState(null);
  const [searchLabel, setSearchLabel] = useState('');

  const mapCenter = [14.365, 100.08];
  const mapZoom = 12;

  // Starch Prediction Model (CPE Thesis Feature)
  const calculateStarch = (plot) => {
    const plantingDate = new Date(plot.planting_date);
    const today = new Date();
    const diffTime = Math.abs(today - plantingDate);
    const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Base starch content rises with age (peaks around 300 days)
    let baseStarch = (ageDays / 300) * 28.0;
    
    const latestRec = plot.growth_records?.[0];
    const ndvi = latestRec ? latestRec.ndvi_avg : 0.45;
    let ndviFactor = ndvi / 0.7; // Normalized around healthy 0.7 NDVI index
    let starch = baseStarch * ndviFactor;
    
    if (plot.status.toLowerCase().includes("stress") || plot.status.includes("เครียด")) {
      starch = starch * 0.8; // Diseases/mosaic reduce starch content
    }
    
    starch = Math.min(Math.max(starch, 0.0), 32.0);
    return parseFloat(starch.toFixed(1));
  };

  // Yield Estimation Model (Tons per Rai)
  const calculateYield = (plot) => {
    const plantingDate = new Date(plot.planting_date);
    const today = new Date();
    const diffTime = Math.abs(today - plantingDate);
    const ageDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    let baseYield = (ageDays / 300) * 4.5; // Average Rayong 72 is 4.5 Tons/Rai
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

  // Filter plots by predicted Starch Content
  const filteredPlots = useMemo(() => {
    if (starchFilter === 'all') return plots;
    return plots.filter(p => {
      const starch = calculateStarch(p);
      if (starchFilter === 'low') return starch < 15.0;
      if (starchFilter === 'medium') return starch >= 15.0 && starch <= 25.0;
      if (starchFilter === 'high') return starch > 25.0;
      return true;
    });
  }, [plots, starchFilter]);

  const tileLayers = {
    satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    satellite_hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    terrain: "https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}",
    osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  const handlePlotSelect = (plot) => {
    setActivePlot(plot);
  };

  const getPolygonBounds = (coords) => {
    if (!coords || coords.length === 0) return null;
    const lats = coords.map(c => c.lat);
    const lngs = coords.map(c => c.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    return [[minLat, minLng], [maxLat, maxLng]];
  };

  // Perform geocode text search or coordinate lookup
  const handleGeoSearch = async () => {
    if (!geoQuery.trim()) return;
    setGeoSearching(true);
    setGeoError(null);

    // 1. Check local Thai province coordinate lookup
    const cleanQuery = geoQuery.trim()
      .replace(/จังหวัด|จ\./g, '')
      .replace(/อำเภอ|อ\./g, '')
      .replace(/ตำบล|ต\./g, '')
      .trim();

    if (thaiProvinces[cleanQuery]) {
      const [lat, lng] = thaiProvinces[cleanQuery];
      setSearchPin([lat, lng]);
      setSearchLabel(`จังหวัด ${cleanQuery}: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
      setGeoSearching(false);
      return;
    }

    // 2. DMS coordinate parsing (e.g. 16°26'42.4"N 103°31'57.7"E)
    // Supports degrees (°), minutes ('), seconds (") and directions (N/S/E/W) with variations of quote marks
    const dmsRegex = /(\d+)\s*[°od]?\s*(\d+)\s*['′’‘]?\s*([\d.]+)\s*["″”’']*\s*([NSEWnsew])/gi;
    const dmsMatches = [...geoQuery.matchAll(dmsRegex)];
    if (dmsMatches.length === 2) {
      const results = dmsMatches.map(match => {
        const deg = parseFloat(match[1]);
        const min = parseFloat(match[2]);
        const sec = parseFloat(match[3]);
        const hem = match[4].toUpperCase();
        let dd = deg + min / 60 + sec / 3600;
        if (hem === 'S' || hem === 'W') dd = -dd;
        return dd;
      });
      const lat = results[0];
      const lng = results[1];
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSearchPin([lat, lng]);
        setSearchLabel(`พิกัด DMS: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setGeoSearching(false);
        return;
      }
    }

    // 2. Decimal coordinate check
    const coordRegex = /^\s*([-+]?[0-9]*\.?[0-9]+)\s*[\s,]\s*([-+]?[0-9]*\.?[0-9]+)\s*$/;
    const match = geoQuery.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setSearchPin([lat, lng]);
        setSearchLabel(`พิกัด: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        setGeoSearching(false);
        return;
      } else {
        setGeoError("ค่าพิกัดเกินช่วงที่ระบุ (Lat -90 ถึง 90, Lng -180 ถึง 180)");
        setGeoSearching(false);
        return;
      }
    }

    // Text geocoding query
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(geoQuery)}&limit=3&accept-language=th,en`
      );
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const topResult = results[0];
          const lat = parseFloat(topResult.lat);
          const lng = parseFloat(topResult.lon);
          
          setSearchPin([lat, lng]);
          const shortName = topResult.display_name.split(',')[0];
          setSearchLabel(shortName || geoQuery);
        } else {
          setGeoError("ไม่พบพิกัดของชื่อสถานที่นี้ในระบบหลัก");
        }
      } else {
        setGeoError("ระบบวิเคราะห์สถานที่ขัดข้องกรุณาลองใหม่ภายหลัง");
      }
    } catch (err) {
      setGeoError("ไม่สามารถติดต่อระบบเซิร์ฟเวอร์วิเคราะห์แผนที่ได้");
    } finally {
      setGeoSearching(false);
    }
  };

  // Translate status
  const translateStatus = (status) => {
    if (!status) return "ไม่ระบุ";
    const s = status.toLowerCase();
    if (s.includes("healthy")) return "สมบูรณ์ดี";
    if (s.includes("stressed")) return "เครียด/ขาดน้ำ";
    if (s.includes("monitoring") || s.includes("active")) return "กำลังเฝ้าระวัง";
    if (s.includes("harvested")) return "เก็บเกี่ยวแล้ว";
    if (s.includes("newly") || s.includes("just") || s.includes("ปลูก")) return "เพิ่งปลูก";
    return status;
  };

  return (
    <div className="relative flex flex-col h-[calc(100vh-140px)] rounded-3xl overflow-hidden border border-slate-200/60 shadow-lg">
      
      {/* MAP VIEWPORT CONTAINER */}
      <div className="flex-1 relative z-10 w-full h-full">
        <MapContainer 
          center={mapCenter} 
          zoom={mapZoom} 
          scrollWheelZoom={true}
          className="w-full h-full"
        >
          <TileLayer
            attribution={mapType.includes('osm') ? '&copy; OpenStreetMap' : '&copy; Google Maps'}
            url={tileLayers[mapType]}
          />

          <MapSearchFlyController center={searchPin} />

          {/* Render Search Pinpoint Marker */}
          {searchPin && (
            <Marker position={searchPin} icon={redMarkerIcon}>
              <Popup>
                <div className="p-1 min-w-[150px] font-sans">
                  <div className="font-extrabold text-xs text-red-600 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>สถานที่ที่พบ:</span>
                  </div>
                  <p className="text-xs font-bold text-slate-800 mt-1">{searchLabel}</p>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">{searchPin[0].toFixed(5)}, {searchPin[1].toFixed(5)}</p>
                </div>
              </Popup>
            </Marker>
          )}

          {filteredPlots.map((plot) => {
            const polyCoords = plot.boundary_coordinates?.map(c => [c.lat, c.lng]);
            const bounds = getPolygonBounds(plot.boundary_coordinates);
            const latestRec = plot.growth_records?.[0];
            
            let boundaryColor = '#22c55e';
            if (plot.status.toLowerCase().includes("stress") || plot.status.includes("เครียด")) boundaryColor = '#ef4444';
            else if (plot.status.toLowerCase().includes("monitor") || plot.status.includes("เฝ้าระวัง")) boundaryColor = '#f59e0b';
            else if (plot.status.toLowerCase().includes("harvest") || plot.status.includes("เก็บเกี่ยว")) boundaryColor = '#64748b';
            else if (plot.status.toLowerCase().includes("newly") || plot.status.includes("ปลูก")) boundaryColor = '#3b82f6';

            const heatmapSource = latestRec?.heatmap_path 
              ? `/${latestRec.heatmap_path}` 
              : getMockHeatmapUrl(plot.status);

            return (
              <React.Fragment key={plot.id}>
                {showBoundaries && polyCoords && (
                  <Polygon 
                    positions={polyCoords}
                    eventHandlers={{ click: () => handlePlotSelect(plot) }}
                    pathOptions={{ 
                      color: boundaryColor, 
                      fillColor: boundaryColor, 
                      fillOpacity: showNDVI ? 0.0 : 0.2, 
                      weight: 2.5
                    }}
                  />
                )}

                {showNDVI && bounds && (
                  <ImageOverlay
                    url={heatmapSource}
                    bounds={bounds}
                    opacity={0.6}
                    interactive={true}
                    eventHandlers={{ click: () => handlePlotSelect(plot) }}
                  />
                )}

                {showMarkers && (
                  <Marker 
                    position={[plot.latitude, plot.longitude]}
                    icon={getMarkerIcon(plot.status)}
                  >
                    <Popup>
                      <div className="p-1.5 min-w-[200px] font-sans">
                        <div className="flex justify-between items-center border-b pb-1.5 mb-2">
                          <span className="font-extrabold text-sm text-slate-800 leading-tight">{plot.name}</span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full inline-block ${
                            plot.status.includes("Healthy") || plot.status.includes("สมบูรณ์") ? 'bg-green-100 text-green-700' :
                            plot.status.includes("Stressed") || plot.status.includes("เครียด") ? 'bg-red-100 text-red-700' :
                            plot.status.includes("Newly") || plot.status.includes("ปลูก") ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                          }`}>{translateStatus(plot.status)}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                          <div>ประเภทพืช:</div>
                          <div className="font-bold text-right text-slate-800">มันสำปะหลัง</div>
                          
                          <div>ขนาดแปลง:</div>
                          <div className="font-bold text-right text-slate-800">{plot.area_rai} ไร่</div>

                          {latestRec && (
                            <>
                              <div>เฉลี่ย NDVI:</div>
                              <div className="font-bold text-right text-farm-700">{latestRec.ndvi_avg}</div>
                              <div>ปริมาณแป้งสะสม:</div>
                              <div className="font-bold text-right text-emerald-600">{calculateStarch(plot)} %</div>
                            </>
                          )}
                        </div>

                        <div className="mt-3 flex gap-2 border-t pt-2 text-[10px] text-slate-400 font-semibold">
                          <MapPin className="w-3.5 h-3.5 text-farm-600" />
                          <span>{plot.latitude.toFixed(5)}, {plot.longitude.toFixed(5)}</span>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}
              </React.Fragment>
            );
          })}
        </MapContainer>
      </div>

      {/* GIS FLOATING CONTROL HUD - OVERLAYS MAP */}
      <div className="absolute top-4 left-4 z-40 w-80 bg-white/90 backdrop-blur-xl border border-white/50 p-5 rounded-2xl flex flex-col space-y-4 shadow-xl">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 leading-none">
            <Layers className="w-4.5 h-4.5 text-farm-600" />
            แผงควบคุมแผนที่ดาวเทียมมันสำปะหลัง
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">สลับมุมมองภาพและจัดการส่วนการซ้อนทับภาพ</p>
        </div>

        {/* GEOLOCATION & COORDINATE SEARCH BAR */}
        <div className="space-y-1.5 border-t pt-3">
          <div className="flex justify-between items-center">
            <label className="text-[9px] text-slate-400 font-extrabold uppercase">ค้นหาพิกัดแผนที่หรือสถานที่</label>
            {searchPin && (
              <button 
                onClick={() => { setSearchPin(null); setGeoQuery(''); setGeoError(null); }}
                className="text-[9px] text-red-500 font-extrabold hover:text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-md transition"
              >
                ล้างหมุดค้นหา
              </button>
            )}
          </div>
          
          <div className="flex gap-1.5">
            <input 
              type="text"
              placeholder="พิกัด: 14.365, 100.08 หรือ สุพรรณบุรี..."
              value={geoQuery}
              onChange={(e) => setGeoQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleGeoSearch(); }}
              className="flex-1 px-3 py-2 bg-slate-50 border rounded-xl text-xs font-semibold focus:outline-none focus:border-farm-500"
            />
            <button 
              onClick={handleGeoSearch}
              disabled={geoSearching}
              className="p-2.5 bg-farm-600 hover:bg-farm-700 text-white rounded-xl flex items-center justify-center transition"
            >
              {geoSearching ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Search className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          
          {geoError && (
            <p className="text-[9px] text-red-500 font-bold leading-tight mt-1">{geoError}</p>
          )}
        </div>

        {/* Base Map Toggles */}
        <div className="space-y-1.5 border-t pt-3">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase">ภาพแผนที่ดาวเทียมฐาน</label>
          <select 
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-xs focus:outline-none"
          >
            <option value="satellite_hybrid">Google Satellite Hybrid (ดาวเทียมคมชัดสูง)</option>
            <option value="satellite">Google Satellite Standard (ดาวเทียมธรรมดา)</option>
            <option value="terrain">Google Terrain Maps (ลักษณะภูมิประเทศ)</option>
            <option value="osm">OpenStreetMap Vector Map (แผนที่กราฟิกปกติ)</option>
          </select>
        </div>

        {/* Layer Visibility Overlays checkboxes */}
        <div className="space-y-2 border-t pt-3">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">ความโปร่งใสและเลเยอร์ซ้อนทับ</label>
          
          <button 
            onClick={() => setShowBoundaries(!showBoundaries)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-400" />
              ร่างขอบเขตแปลงพืช (Boundaries)
            </span>
            {showBoundaries ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>

          <button 
            onClick={() => setShowNDVI(!showNDVI)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              ภาพซ้อนทับดัชนี NDVI พืช
            </span>
            {showNDVI ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>

          <button 
            onClick={() => setShowMarkers(!showMarkers)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              ปักหมุดประเมินสภาพแปลงเพาะปลูก
            </span>
            {showMarkers ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>
        </div>

        {/* Filter Cassava Plots by Starch Percentage */}
        <div className="space-y-1.5 border-t pt-3">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase">ตัวกรองตามเปอร์เซ็นต์แป้งสะสม</label>
          <select 
            value={starchFilter}
            onChange={(e) => setStarchFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-xs focus:outline-none"
          >
            <option value="all">แปลงมันสำปะหลังทั้งหมด</option>
            <option value="low">ระยะใบสะสมแป้งต่ำ (แป้ง &lt; 15%)</option>
            <option value="medium">ระยะสะสมแป้งปานกลาง (แป้ง 15% - 25%)</option>
            <option value="high">ระยะหัวแป้งสูงพร้อมเก็บเกี่ยว (แป้ง &gt; 25%)</option>
          </select>
        </div>

      </div>

      {/* CLICKED PLOT DETAILS DRAWER PANEL */}
      {activePlot && (
        <div className="absolute bottom-4 right-4 z-40 w-96 glass-panel p-5 rounded-2xl flex flex-col space-y-4 animate-fadeIn border-l-4 border-l-farm-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{activePlot.name}</h3>
              <p className="text-[10px] text-farm-600 font-extrabold mt-0.5">พืชเป้าหมาย: มันสำปะหลัง</p>
            </div>
            
            <button 
              onClick={() => setActivePlot(null)}
              className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs font-semibold text-slate-600 pt-2 border-t">
            <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">ขนาดพื้นที่</span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{activePlot.area_rai} ไร่</span>
            </div>

            <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">ระดับประเมินสุขภาพ</span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{translateStatus(activePlot.status)}</span>
            </div>

            <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">เปอร์เซ็นต์แป้งทำนาย</span>
              <span className="text-sm font-extrabold text-farm-700 mt-0.5 block">{calculateStarch(activePlot)} %</span>
            </div>

            <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">ผลผลิตหัวมันคาดการณ์</span>
              <span className="text-sm font-extrabold text-amber-600 mt-0.5 block">{(calculateYield(activePlot) * activePlot.area_rai).toFixed(1)} ตัน</span>
            </div>

            {activePlot.growth_records?.[0] && (
              <>
                <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center col-span-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">เฉลี่ย NDVI</span>
                  <span className="text-sm font-extrabold text-slate-700 mt-0.5 block">
                    {activePlot.growth_records[0].ndvi_avg}
                  </span>
                </div>

                <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center col-span-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">ความสูงต้นมัน</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {activePlot.growth_records[0].height_cm} ซม.
                  </span>
                </div>
              </>
            )}
          </div>

          {activePlot.growth_records?.[0]?.notes && (
            <div className="p-3 bg-slate-50 border rounded-xl text-[10px] text-slate-500 font-bold leading-normal">
              <span className="text-[9px] text-slate-400 block uppercase font-black mb-1">บันทึกตรวจวัดทางวิชาการ</span>
              {activePlot.growth_records[0].notes}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
