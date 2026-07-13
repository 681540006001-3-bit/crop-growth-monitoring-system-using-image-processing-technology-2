import React, { useState, useMemo } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  Popup, 
  Polygon,
  ImageOverlay
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
  Info
} from 'lucide-react';

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

const getMarkerIcon = (status) => {
  const s = status.toLowerCase();
  if (s.includes("stress")) return redMarkerIcon;
  if (s.includes("active") || s.includes("monitoring")) return orangeMarkerIcon;
  if (s.includes("harvest")) return greyMarkerIcon;
  return greenMarkerIcon;
};

// Generates a mock colormap texture for seeded plots that don't have uploaded image paths
// (Simulates green, yellow, and red spectral overlays on the satellite layer)
const getMockHeatmapUrl = (status) => {
  if (status.toLowerCase().includes("stress")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23ef4444' stop-opacity='0.8'/><stop offset='50%' stop-color='%23f59e0b' stop-opacity='0.7'/><stop offset='100%' stop-color='%23ef4444' stop-opacity='0.8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  if (status.toLowerCase().includes("monitor")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%23f59e0b' stop-opacity='0.7'/><stop offset='50%' stop-color='%2386efac' stop-opacity='0.8'/><stop offset='100%' stop-color='%2322c55e' stop-opacity='0.7'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  if (status.toLowerCase().includes("harvest")) {
    return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2378716c' stop-opacity='0.7'/><stop offset='100%' stop-color='%2344403c' stop-opacity='0.7'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
  }
  // Healthy Green
  return "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><linearGradient id='g' x1='0%' y1='0%' x2='100%' y2='100%'><stop offset='0%' stop-color='%2322c55e' stop-opacity='0.8'/><stop offset='50%' stop-color='%2315803d' stop-opacity='0.9'/><stop offset='100%' stop-color='%23052e16' stop-opacity='0.8'/></linearGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>";
};

export default function GISMap({ plots }) {
  const [mapType, setMapType] = useState('satellite_hybrid'); // satellite, satellite_hybrid, terrain, osm
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showMarkers, setShowMarkers] = useState(true);
  const [showNDVI, setShowNDVI] = useState(true);
  const [selectedCrop, setSelectedCrop] = useState('all');
  const [activePlot, setActivePlot] = useState(null);

  // Centered on Suphan Buri agricultural belt
  const mapCenter = [14.365, 100.08];
  const mapZoom = 12;

  // Filter plots
  const filteredPlots = useMemo(() => {
    if (selectedCrop === 'all') return plots;
    return plots.filter(p => p.crop_type.toLowerCase() === selectedCrop.toLowerCase());
  }, [plots, selectedCrop]);

  // Tile URL Map based on Google Maps types
  const tileLayers = {
    satellite: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    satellite_hybrid: "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}",
    terrain: "https://mt1.google.com/vt/lyrs=t&x={x}&y={y}&z={z}",
    osm: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
  };

  // Click on a plot handler
  const handlePlotSelect = (plot) => {
    setActivePlot(plot);
  };

  // Calculate polygon bounding box corners for ImageOverlay bounds
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
          {/* Base Layer */}
          <TileLayer
            attribution={mapType.includes('osm') ? '&copy; OpenStreetMap contributors' : '&copy; Google Maps'}
            url={tileLayers[mapType]}
          />

          {/* Draw Plots */}
          {filteredPlots.map((plot) => {
            const polyCoords = plot.boundary_coordinates?.map(c => [c.lat, c.lng]);
            const bounds = getPolygonBounds(plot.boundary_coordinates);
            const latestRec = plot.growth_records?.[0];
            
            // Set boundary color
            let boundaryColor = '#22c55e'; // Green
            if (plot.status.toLowerCase().includes("stress")) boundaryColor = '#ef4444'; // Red
            else if (plot.status.toLowerCase().includes("monitor")) boundaryColor = '#f59e0b'; // Amber
            else if (plot.status.toLowerCase().includes("harvest")) boundaryColor = '#64748b'; // Slate

            // Heatmap texture link
            const heatmapSource = latestRec?.heatmap_path 
              ? `/${latestRec.heatmap_path}` 
              : getMockHeatmapUrl(plot.status);

            return (
              <React.Fragment key={plot.id}>
                {/* Plot Boundary Polygon */}
                {showBoundaries && polyCoords && (
                  <Polygon 
                    positions={polyCoords}
                    eventHandlers={{ click: () => handlePlotSelect(plot) }}
                    pathOptions={{ 
                      color: boundaryColor, 
                      fillColor: boundaryColor, 
                      fillOpacity: showNDVI ? 0.0 : 0.2, // Hide color fill if NDVI is overlaid
                      weight: 2.5
                    }}
                  />
                )}

                {/* Translucent NDVI Image Overlay */}
                {showNDVI && bounds && (
                  <ImageOverlay
                    url={heatmapSource}
                    bounds={bounds}
                    opacity={0.6}
                    interactive={true}
                    eventHandlers={{ click: () => handlePlotSelect(plot) }}
                  />
                )}

                {/* Plot Marker Pin */}
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
                            plot.status.includes("Healthy") ? 'bg-green-100 text-green-700' :
                            plot.status.includes("Stressed") ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                          }`}>{plot.status}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-1 text-xs text-slate-600">
                          <div>Crop Type:</div>
                          <div className="font-bold text-right text-slate-800">{plot.crop_type}</div>
                          
                          <div>Acreage size:</div>
                          <div className="font-bold text-right text-slate-800">{plot.area_rai} Rai</div>

                          {latestRec && (
                            <>
                              <div>Average NDVI:</div>
                              <div className="font-bold text-right text-farm-700">{latestRec.ndvi_avg}</div>
                              <div>Crop Height:</div>
                              <div className="font-bold text-right text-slate-800">{latestRec.height_cm} cm</div>
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
      <div className="absolute top-4 left-4 z-40 w-80 glass-panel p-5 rounded-2xl flex flex-col space-y-4">
        <div>
          <h3 className="font-extrabold text-slate-900 text-sm flex items-center gap-1.5 leading-none">
            <Layers className="w-4.5 h-4.5 text-farm-600" />
            GIS Layer Controller
          </h3>
          <p className="text-[10px] text-slate-400 mt-1">Configure satellite mapping filters.</p>
        </div>

        {/* Base Map Toggles */}
        <div className="space-y-1.5">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase">Base Imagery Layer</label>
          <select 
            value={mapType}
            onChange={(e) => setMapType(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-xs focus:outline-none"
          >
            <option value="satellite_hybrid">Google Satellite Hybrid</option>
            <option value="satellite">Google Satellite Standard</option>
            <option value="terrain">Google Terrain Maps</option>
            <option value="osm">OpenStreetMap Vector Map</option>
          </select>
        </div>

        {/* Layer Visibility Overlays checkboxes */}
        <div className="space-y-2 border-t pt-3">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase block mb-1">Layer Visibility</label>
          
          {/* Show Boundaries */}
          <button 
            onClick={() => setShowBoundaries(!showBoundaries)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-400" />
              Plot Boundaries
            </span>
            {showBoundaries ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>

          {/* Show NDVI Overlays */}
          <button 
            onClick={() => setShowNDVI(!showNDVI)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-slate-400" />
              NDVI Heatmap Overlays
            </span>
            {showNDVI ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>

          {/* Show Pins */}
          <button 
            onClick={() => setShowMarkers(!showMarkers)}
            className="flex items-center justify-between w-full text-xs font-semibold text-slate-700 hover:text-slate-900 transition py-1"
          >
            <span className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />
              Health Markers
            </span>
            {showMarkers ? <Eye className="w-4.5 h-4.5 text-farm-600" /> : <EyeOff className="w-4.5 h-4.5 text-slate-300" />}
          </button>
        </div>

        {/* Filter crops */}
        <div className="space-y-1.5 border-t pt-3">
          <label className="text-[9px] text-slate-400 font-extrabold uppercase">Highlight Crop Type</label>
          <select 
            value={selectedCrop}
            onChange={(e) => setSelectedCrop(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border bg-white font-bold text-xs focus:outline-none"
          >
            <option value="all">All Crops</option>
            <option value="rice">Rice</option>
            <option value="sugarcane">Sugarcane</option>
            <option value="cassava">Cassava</option>
            <option value="corn">Corn</option>
          </select>
        </div>

      </div>

      {/* CLICKED PLOT DETAILS DRAWER PANEL */}
      {activePlot && (
        <div className="absolute bottom-4 right-4 z-40 w-96 glass-panel p-5 rounded-2xl flex flex-col space-y-4 animate-fadeIn border-l-4 border-l-farm-500">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-extrabold text-slate-900 text-sm leading-tight">{activePlot.name}</h3>
              <p className="text-[10px] text-farm-600 font-extrabold mt-0.5">Crop Class: {activePlot.crop_type}</p>
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
              <span className="text-[9px] text-slate-400 font-bold block uppercase">Field Size</span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{activePlot.area_rai} Rai</span>
            </div>

            <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center">
              <span className="text-[9px] text-slate-400 font-bold block uppercase">Health Status</span>
              <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">{activePlot.status}</span>
            </div>

            {activePlot.growth_records?.[0] && (
              <>
                <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center col-span-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Avg NDVI</span>
                  <span className="text-sm font-extrabold text-farm-700 mt-0.5 block">
                    {activePlot.growth_records[0].ndvi_avg}
                  </span>
                </div>

                <div className="bg-white border rounded-xl p-2.5 shadow-sm text-center col-span-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase">Crop Height</span>
                  <span className="text-sm font-extrabold text-slate-900 mt-0.5 block">
                    {activePlot.growth_records[0].height_cm} cm
                  </span>
                </div>
              </>
            )}
          </div>

          {activePlot.growth_records?.[0]?.notes && (
            <div className="p-3 bg-slate-50 border rounded-xl text-[10px] text-slate-500 font-bold leading-normal">
              <span className="text-[9px] text-slate-400 block uppercase font-black mb-1">Field observations notes</span>
              {activePlot.growth_records[0].notes}
            </div>
          )}

        </div>
      )}

    </div>
  );
}
