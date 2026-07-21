import React, { useState, useEffect } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  useMapEvents,
  useMap,
  Polyline,
  Polygon
} from 'react-leaflet';
import L from 'leaflet';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  MapPin, 
  Compass, 
  Calendar, 
  Info,
  X,
  CheckCircle,
  Database,
  Search,
  RefreshCw
} from 'lucide-react';

import { thaiProvinces } from '../utils/thaiProvinces';

const defaultMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Circular vertex dot marker for polygon drawing
const vertexMarkerIcon = new L.DivIcon({
  className: 'custom-div-icon',
  html: "<div style='background-color:#10b981;width:8px;height:8px;border:1.5px solid white;border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.3);'></div>",
  iconSize: [8, 8],
  iconAnchor: [4, 4]
});

// Component to handle map clicks and move the marker in click-to-pin mode
function MapClickSelector({ onLocationSelected, selectedPos }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return selectedPos ? <Marker position={selectedPos} icon={defaultMarkerIcon} /> : null;
}

// Component to capture map clicks in custom polygon drawing mode
function MapDrawClicksCollector({ onAddPoint }) {
  useMapEvents({
    click(e) {
      onAddPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Component to fly map in modal
function MapModalFlyController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, 14, { animate: true, duration: 1.2 });
    }
  }, [center, map]);
  return null;
}

export default function CropPlotManagement({ plots, onRefresh, dbStatus }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State (using strings for inputs to prevent decimal dot stripping during typing)
  const [formData, setFormData] = useState({
    name: '',
    crop_type: 'Cassava',
    area_rai: '5.0',
    planting_date: new Date().toISOString().split('T')[0],
    status: 'Healthy',
    latitude: '14.358',
    longitude: '100.082'
  });

  // Modal Map Search State
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [mapSearching, setMapSearching] = useState(false);
  const [mapSearchError, setMapSearchError] = useState(null);
  const [mapCenterPos, setMapCenterPos] = useState([14.358, 100.082]);

  // Polygon drawing states
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawPoints, setDrawPoints] = useState([]);
  const [customBoundary, setCustomBoundary] = useState(null);

  // Helper to parse a single DMS coordinate (e.g. 16°26'42.4"N or 103°31'57.7"E)
  const parseSingleDMS = (str) => {
    if (!str) return null;
    const cleanStr = str.trim();
    const dmsRegex = /(\d+)\s*[°od]?\s*(\d+)\s*['′’‘]?\s*([\d.]+)\s*["″”’']*\s*([NSEWnsew])/i;
    const match = cleanStr.match(dmsRegex);
    if (match) {
      const deg = parseFloat(match[1]);
      const min = parseFloat(match[2]);
      const sec = parseFloat(match[3]);
      const hem = match[4].toUpperCase();
      let dd = deg + min / 60 + sec / 3600;
      if (hem === 'S' || hem === 'W') {
        dd = -dd;
      }
      return parseFloat(dd.toFixed(5));
    }
    return null;
  };

  // Translate status
  const translateStatus = (status) => {
    if (!status) return "ไม่ระบุ";
    const s = status.toLowerCase();
    if (s.includes("healthy")) return "สมบูรณ์ดี";
    if (s.includes("stressed")) return "เครียด/ขาดน้ำ";
    if (s.includes("monitoring") || s.includes("active")) return "เฝ้าระวัง";
    if (s.includes("harvested")) return "เก็บเกี่ยวแล้ว";
    if (s.includes("newly") || s.includes("just") || s.includes("ปลูก")) return "เพิ่งปลูก";
    return status;
  };

  const openAddModal = () => {
    setEditingPlot(null);
    setFormData({
      name: '',
      crop_type: 'Cassava',
      area_rai: '5.0',
      planting_date: new Date().toISOString().split('T')[0],
      status: 'Healthy',
      latitude: '14.358',
      longitude: '100.082'
    });
    setMapCenterPos([14.358, 100.082]);
    setMapSearchQuery('');
    setMapSearchError(null);
    setErrorMsg(null);
    setIsDrawingMode(false);
    setDrawPoints([]);
    setCustomBoundary(null);
    setModalOpen(true);
  };

  const openEditModal = (plot) => {
    setEditingPlot(plot);
    setFormData({
      name: plot.name,
      crop_type: plot.crop_type,
      area_rai: String(plot.area_rai),
      planting_date: typeof plot.planting_date === 'string' ? plot.planting_date : new Date(plot.planting_date).toISOString().split('T')[0],
      status: plot.status,
      latitude: String(plot.latitude),
      longitude: String(plot.longitude)
    });
    setMapCenterPos([plot.latitude, plot.longitude]);
    setMapSearchQuery('');
    setMapSearchError(null);
    setErrorMsg(null);
    setIsDrawingMode(false);
    setDrawPoints([]);
    setCustomBoundary(plot.boundary_coordinates || null);
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Auto-convert pasted DMS strings into Decimal Degrees inside the form inputs
    let processedValue = value;
    if (name === 'latitude' || name === 'longitude') {
      const parsedDMS = parseSingleDMS(value);
      if (parsedDMS !== null) {
        processedValue = String(parsedDMS);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: processedValue
    }));

    if (name === 'latitude' || name === 'longitude') {
      const latVal = name === 'latitude' ? processedValue : formData.latitude;
      const lngVal = name === 'longitude' ? processedValue : formData.longitude;
      const lat = parseFloat(latVal);
      const lng = parseFloat(lngVal);
      if (!isNaN(lat) && !isNaN(lng) && lat > -90 && lat < 90 && lng > -180 && lng < 180) {
        setMapCenterPos([lat, lng]);
      }
    }
  };

  const handleLocationSelected = (lat, lng) => {
    const formattedLat = lat.toFixed(5);
    const formattedLng = lng.toFixed(5);
    setFormData(prev => ({
      ...prev,
      latitude: formattedLat,
      longitude: formattedLng
    }));
    setMapCenterPos([lat, lng]);
    setCustomBoundary(null); // Reset custom drawn boundary if they click manual single point
  };

  // Process drawn custom points, calculate centroid, and compute spherical Rai area
  const handleFinishDrawing = () => {
    if (drawPoints.length < 3) return;

    // 1. Centroid calculation
    let totalLat = 0;
    let totalLng = 0;
    drawPoints.forEach(p => {
      totalLat += p.lat;
      totalLng += p.lng;
    });
    const avgLat = parseFloat((totalLat / drawPoints.length).toFixed(5));
    const avgLng = parseFloat((totalLng / drawPoints.length).toFixed(5));

    // 2. Spherical projected area calculation (in Square Meters) converted to Rai
    const R = 6378137; // Earth's Radius
    const lat0 = drawPoints[0].lat * Math.PI / 180;
    const lng0 = drawPoints[0].lng * Math.PI / 180;

    const projectedPoints = drawPoints.map(c => {
      const lat = c.lat * Math.PI / 180;
      const lng = c.lng * Math.PI / 180;
      const x = R * (lng - lng0) * Math.cos(lat0);
      const y = R * (lat - lat0);
      return { x, y };
    });

    let area = 0;
    let j = projectedPoints.length - 1;
    for (let i = 0; i < projectedPoints.length; i++) {
      area += (projectedPoints[j].x + projectedPoints[i].x) * (projectedPoints[j].y - projectedPoints[i].y);
      j = i;
    }
    area = Math.abs(area / 2.0);
    const areaRai = parseFloat((area / 1600).toFixed(1)) || 0.1; // 1 Rai = 1600 sq meters

    // 3. Save states
    setFormData(prev => ({
      ...prev,
      latitude: String(avgLat),
      longitude: String(avgLng),
      area_rai: String(areaRai)
    }));
    setMapCenterPos([avgLat, avgLng]);
    setCustomBoundary(drawPoints);
    setIsDrawingMode(false);
  };

  // Perform geocode text search or coordinate lookup for the modal map
  const handleMapSearch = async () => {
    if (!mapSearchQuery.trim()) return;
    setMapSearching(true);
    setMapSearchError(null);

    // 1. Check local Thai province coordinate lookup
    const cleanQuery = mapSearchQuery.trim()
      .replace(/จังหวัด|จ\./g, '')
      .replace(/อำเภอ|อ\./g, '')
      .replace(/ตำบล|ต\./g, '')
      .trim();

    if (thaiProvinces[cleanQuery]) {
      const [lat, lng] = thaiProvinces[cleanQuery];
      setFormData(prev => ({ 
        ...prev, 
        latitude: lat.toFixed(5), 
        longitude: lng.toFixed(5) 
      }));
      setMapCenterPos([lat, lng]);
      setMapSearching(false);
      setCustomBoundary(null);
      return;
    }

    // 2. Check DMS coordinate format (e.g., 16°26'42.4"N 103°31'57.7"E)
    const dmsRegex = /(\d+)\s*[°od]?\s*(\d+)\s*['′’‘]?\s*([\d.]+)\s*["″”’']*\s*([NSEWnsew])/gi;
    const dmsMatches = [...mapSearchQuery.matchAll(dmsRegex)];

    if (dmsMatches.length === 2) {
      const results = dmsMatches.map(match => {
        const deg = parseFloat(match[1]);
        const min = parseFloat(match[2]);
        const sec = parseFloat(match[3]);
        const hem = match[4].toUpperCase();
        
        let dd = deg + min / 60 + sec / 3600;
        if (hem === 'S' || hem === 'W') {
          dd = -dd;
        }
        return dd;
      });

      const lat = results[0];
      const lng = results[1];

      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setFormData(prev => ({ 
          ...prev, 
          latitude: lat.toFixed(5), 
          longitude: lng.toFixed(5) 
        }));
        setMapCenterPos([lat, lng]);
        setMapSearching(false);
        setCustomBoundary(null);
        return;
      }
    }

    // 3. Standard decimal degrees coordinate check
    const coordRegex = /^\s*([-+]?[0-9]*\.?[0-9]+)\s*[\s,]\s*([-+]?[0-9]*\.?[0-9]+)\s*$/;
    const match = mapSearchQuery.match(coordRegex);

    if (match) {
      const lat = parseFloat(match[1]);
      const lng = parseFloat(match[2]);
      
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        setFormData(prev => ({ 
          ...prev, 
          latitude: lat.toFixed(5), 
          longitude: lng.toFixed(5) 
        }));
        setMapCenterPos([lat, lng]);
        setMapSearching(false);
        setCustomBoundary(null);
        return;
      } else {
        setMapSearchError("พิกัดเกินช่วงที่ระบุ");
        setMapSearching(false);
        return;
      }
    }

    // 4. Geocoding text query
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(mapSearchQuery)}&limit=1&accept-language=th,en`
      );
      if (response.ok) {
        const results = await response.json();
        if (results && results.length > 0) {
          const lat = parseFloat(results[0].lat);
          const lng = parseFloat(results[0].lon);
          
          setFormData(prev => ({ 
            ...prev, 
            latitude: lat.toFixed(5), 
            longitude: lng.toFixed(5) 
          }));
          setMapCenterPos([lat, lng]);
          setCustomBoundary(null);
        } else {
          setMapSearchError("ไม่พบสถานที่ดังกล่าว");
        }
      } else {
        setMapSearchError("ระบบประมวลผลสถานที่ขัดข้อง");
      }
    } catch (err) {
      setMapSearchError("ไม่สามารถติดต่อระบบดาวเทียมได้");
    } finally {
      setMapSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Parse numeric fields on submit
    const area = parseFloat(formData.area_rai) || 0;
    const lat = parseFloat(formData.latitude) || 0;
    const lng = parseFloat(formData.longitude) || 0;

    // Validate inputs
    if (!formData.name.trim()) {
      setErrorMsg("กรุณาระบุชื่อแปลงเพาะปลูก");
      return;
    }
    if (area <= 0) {
      setErrorMsg("ขนาดพื้นที่เพาะปลูกต้องมีค่ามากกว่า 0 ไร่");
      return;
    }
    if (lat === 0 || lng === 0 || isNaN(lat) || isNaN(lng)) {
      setErrorMsg("กรุณาระบุพิกัดละติจูดและลองจิจูด (คลิกปักหมุดบนแผนที่ดาวเทียมด้านขวา)");
      return;
    }

    // Set boundary points: if user drew a custom polygon boundary, use it.
    // Otherwise, generate mock square centered on lat/lng
    let boundary = [];
    if (customBoundary && customBoundary.length >= 3) {
      boundary = customBoundary;
    } else {
      const offset = 0.001; // ~110 meters offset
      boundary = [
        { lat: lat + offset, lng: lng - offset },
        { lat: lat + offset, lng: lng + offset },
        { lat: lat - offset, lng: lng + offset },
        { lat: lat - offset, lng: lng - offset }
      ];
    }

    const plotPayload = {
      name: formData.name,
      crop_type: formData.crop_type,
      area_rai: area,
      planting_date: formData.planting_date,
      status: formData.status,
      latitude: lat,
      longitude: lng,
      boundary_coordinates: boundary
    };

    if (dbStatus.connected) {
      try {
        const url = editingPlot ? `/api/plots/${editingPlot.id}` : '/api/plots';
        const method = editingPlot ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(plotPayload)
        });

        if (response.ok) {
          setSuccessMsg(editingPlot ? "ปรับปรุงข้อมูลแปลงเพาะปลูกสำเร็จ" : "ลงทะเบียนแปลงเพาะปลูกใหม่สำเร็จ");
          setModalOpen(false);
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          const data = await response.json();
          setErrorMsg(data.detail || "การบันทึกข้อมูลขัดข้องขัดข้องบนเซิร์ฟเวอร์");
        }
      } catch (err) {
        setErrorMsg("ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์หลักหลังบ้านได้");
      }
    } else {
      // Mock operation locally (Demo Mode)
      if (editingPlot) {
        const idx = plots.findIndex(p => p.id === editingPlot.id);
        if (idx !== -1) {
          plots[idx] = {
            ...plots[idx],
            ...plotPayload,
            planting_date: plotPayload.planting_date
          };
        }
        setSuccessMsg("ปรับปรุงข้อมูลแปลงเพาะปลูกสำเร็จ (โหมดจำลอง)");
      } else {
        const newId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 1;
        
        // Auto-generate initial growth record based on status
        const statusLower = plotPayload.status.toLowerCase();
        let height = 5.0;
        let cover = 2.0;
        let lai = 0.1;
        let ndvi = 0.18;
        let notes = "บันทึกเริ่มต้นอัตโนมัติ (ท่อนพันธุ์ปักชำใหม่)";

        if (statusLower.includes("healthy") || statusLower.includes("สมบูรณ์")) {
          height = 80.0;
          cover = 75.0;
          lai = 2.1;
          ndvi = 0.65;
          notes = "บันทึกเริ่มต้นอัตโนมัติ (สภาพแปลงสมบูรณ์ดี)";
        } else if (statusLower.includes("monitor") || statusLower.includes("เฝ้าระวัง")) {
          height = 75.0;
          cover = 60.0;
          lai = 1.5;
          ndvi = 0.45;
          notes = "บันทึกเริ่มต้นอัตโนมัติ (อยู่ระหว่างเฝ้าระวังการเติบโต)";
        } else if (statusLower.includes("stress") || statusLower.includes("เครียด")) {
          height = 70.0;
          cover = 40.0;
          lai = 0.9;
          ndvi = 0.30;
          notes = "บันทึกเริ่มต้นอัตโนมัติ (พบอาการเครียดหรือโรคด่างมัน CMD)";
        } else if (statusLower.includes("harvest") || statusLower.includes("เก็บเกี่ยว")) {
          height = 0.0;
          cover = 0.0;
          lai = 0.0;
          ndvi = 0.12;
          notes = "บันทึกเริ่มต้นอัตโนมัติ (เก็บเกี่ยวผลผลิตแล้ว)";
        }

        plots.push({
          id: newId,
          ...plotPayload,
          growth_records: [{
            id: 1,
            plot_id: newId,
            date: plotPayload.planting_date,
            height_cm: height,
            canopy_cover_pct: cover,
            leaf_area_index: lai,
            ndvi_avg: ndvi,
            status: plotPayload.status,
            notes: notes
          }]
        });
        setSuccessMsg("ลงทะเบียนแปลงเพาะปลูกใหม่สำเร็จ (โหมดจำลอง)");
      }
      setModalOpen(false);
      onRefresh(); 
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDelete = async (plotId) => {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบแปลงเพาะปลูกนี้? บันทึกการเจริญเติบโตและข้อมูล NDVI ทั้งหมดจะถูกลบอย่างถาวร")) {
      return;
    }

    if (dbStatus.connected) {
      try {
        const response = await fetch(`/api/plots/${plotId}`, { method: 'DELETE' });
        if (response.ok) {
          setSuccessMsg("ลบแปลงเพาะปลูกสำเร็จ");
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          alert("ไม่สามารถลบแปลงเพาะปลูกออกจากฐานข้อมูลได้");
        }
      } catch (err) {
        alert("การเชื่อมต่อระบบขัดข้องขณะพยายามทำการลบแปลง");
      }
    } else {
      // Mock deletion
      const idx = plots.findIndex(p => p.id === plotId);
      if (idx !== -1) {
        plots.splice(idx, 1);
        setSuccessMsg("ลบแปลงเพาะปลูกสำเร็จ (โหมดจำลอง)");
        onRefresh();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  const hasSelectedLoc = formData.latitude && formData.longitude && !isNaN(parseFloat(formData.latitude)) && !isNaN(parseFloat(formData.longitude));

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">ลงทะเบียนแปลงมันสำปะหลัง</h2>
          <p className="text-sm text-slate-500">ลงทะเบียนขอบเขตพื้นที่พิกัดที่ดินแปลงทดสอบและจัดการระยะช่วงอายุเพาะปลูกมันสำปะหลัง</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>ลงทะเบียนแปลงมันใหม่</span>
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold animate-pulse">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* PLOT INVENTORY CATALOG TABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">บัญชีรายชื่อแปลงมันสำปะหลังที่ลงทะเบียนแล้ว</h3>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded border">
            ลงทะเบียนไว้ {plots.length} แปลง
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3.5">ชื่อเรียกแปลง</th>
                <th className="px-6 py-3.5">พืชเป้าหมาย</th>
                <th className="px-6 py-3.5 text-right">ขนาดพื้นที่</th>
                <th className="px-6 py-3.5">วันที่เริ่มเพาะปลูก</th>
                <th className="px-6 py-3.5">พิกัดแกนกลาง (Lat, Lng)</th>
                <th className="px-6 py-3.5">สถานะ</th>
                <th className="px-6 py-3.5 text-center">การจัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {plots.length > 0 ? (
                plots.map((plot) => (
                  <tr key={plot.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4 font-bold text-slate-900">{plot.name}</td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">
                        มันสำปะหลัง
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-mono">{plot.area_rai} ไร่</td>
                    <td className="px-6 py-4">{plot.planting_date}</td>
                    <td className="px-6 py-4 font-mono text-slate-400">
                      {plot.latitude.toFixed(5)}, {plot.longitude.toFixed(5)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full inline-block ${
                        plot.status.includes("Healthy") || plot.status.includes("สมบูรณ์") ? 'bg-green-100 text-green-700' :
                        plot.status.includes("Stressed") || plot.status.includes("เครียด") ? 'bg-red-100 text-red-700' :
                        plot.status.includes("Newly") || plot.status.includes("ปลูก") ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'
                      }`}>{translateStatus(plot.status)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEditModal(plot)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition"
                          title="แก้ไขข้อมูลแปลง"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(plot.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="ลบแปลงออก"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-10 text-center text-slate-400 font-bold text-xs">
                    ยังไม่มีแปลงมันสำปะหลังลงทะเบียนในระบบวิเคราะห์หลัก
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* REGISTRATION FORM DIALOG MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[650px]">
            
            {/* FORM CONTAINER - LEFT HALF */}
            <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100 font-sans">
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800">
                    {editingPlot ? `แก้ไขแปลง: ${editingPlot.name}` : "ลงทะเบียนแปลงมันสำปะหลังใหม่"}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setModalOpen(false)}
                    className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {errorMsg && (
                  <div className="p-3.5 mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-4">
                  {/* Plot Name */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">ชื่อระบุแปลงเพาะปลูก</label>
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="เช่น แปลงมันห้วยบง A1 (ทิศตะวันออก)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                    />
                  </div>

                  {/* Crop Type & Area */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">ประเภทพืชที่เพาะปลูก</label>
                      <input 
                        type="text" 
                        readOnly 
                        value="มันสำปะหลัง" 
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 font-semibold text-xs focus:outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">ขนาดพื้นที่แปลง (ไร่)</label>
                      <input 
                        type="text"
                        name="area_rai"
                        value={formData.area_rai}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                      />
                    </div>
                  </div>

                  {/* Planting Date & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">วันที่เริ่มเพาะปลูก</label>
                      <input 
                        type="date"
                        name="planting_date"
                        value={formData.planting_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">สถานะเริ่มแรก</label>
                      <select 
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      >
                        {["Newly Planted", "Healthy", "Active Monitoring", "Stressed", "Harvested"].map(s => (
                          <option key={s} value={s}>{translateStatus(s)}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Coordinates (Lat / Lng) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">ละติจูด (Latitude)</label>
                      <input 
                        type="text"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="เช่น 16.44511 หรือ 16°26'42.4&quot;N"
                        className="w-full px-3.5 py-2.0 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">ลองจิจูด (Longitude)</label>
                      <input 
                        type="text"
                        name="longitude"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        placeholder="เช่น 103.53269 หรือ 103°31'57.7&quot;E"
                        className="w-full px-3.5 py-2.0 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-6 border-t mt-4">
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
                  {editingPlot ? "บันทึกการแก้ไข" : "ลงทะเบียนแปลง"}
                </button>
              </div>

            </form>

            {/* GIS BOUNDARY MAP PICKER - RIGHT HALF */}
            <div className="hidden md:flex md:w-[40%] bg-slate-50 flex-col relative">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-farm-600" />
                  ระบุพิกัดดาวเทียม GIS
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  {isDrawingMode ? "คลิกบนแผนที่ดาวเทียมทีละจุด เพื่อวาดเส้นขอบขอบเขตแปลงของท่าน" : "คลิกปักหมุดจุดกึ่งกลาง หรือใช้อุปกรณ์วาดแปลงด้านบนขวาเพื่อลากเส้น"}
                </p>

                {/* SEARCH HUD FOR THE MINI-MAP */}
                <div className="flex gap-1.5 mt-3">
                  <input 
                    type="text"
                    placeholder="พิมพ์พิกัดหรือชื่อสถานที่ เช่น อู่ทอง..."
                    value={mapSearchQuery}
                    onChange={(e) => setMapSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleMapSearch(); }}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border rounded-xl text-[10px] font-semibold focus:outline-none focus:border-farm-500"
                  />
                  <button 
                    type="button"
                    onClick={handleMapSearch}
                    disabled={mapSearching}
                    className="px-2.5 py-1.5 bg-farm-600 hover:bg-farm-700 text-white rounded-xl flex items-center justify-center transition"
                  >
                    {mapSearching ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Search className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                {mapSearchError && (
                  <p className="text-[9px] text-red-500 font-bold mt-1 leading-tight">{mapSearchError}</p>
                )}

                {/* QUICK PROVINCE DROPDOWN SELECTOR */}
                <div className="mt-2.5">
                  <select 
                    onChange={(e) => {
                      const prov = e.target.value;
                      if (prov && thaiProvinces[prov]) {
                        const [lat, lng] = thaiProvinces[prov];
                        setFormData(prev => ({
                          ...prev,
                          latitude: lat.toFixed(5),
                          longitude: lng.toFixed(5)
                        }));
                        setMapCenterPos([lat, lng]);
                        setCustomBoundary(null);
                      }
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-extrabold text-slate-500 focus:outline-none focus:border-farm-500"
                  >
                    <option value="">-- หรือเลือกจังหวัดเพื่อข้ามไปด่วน --</option>
                    {Object.keys(thaiProvinces).sort().map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="flex-1 relative overflow-hidden">
                <MapContainer 
                  center={mapCenterPos} 
                  zoom={12} 
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; Google Maps Satellite'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  />
                  <MapModalFlyController center={mapCenterPos} />

                  {isDrawingMode ? (
                    <>
                      <MapDrawClicksCollector onAddPoint={(lat, lng) => {
                        setDrawPoints(prev => [...prev, { lat, lng }]);
                      }} />
                      {drawPoints.length > 0 && (
                        <Polyline positions={drawPoints.map(p => [p.lat, p.lng])} color="#10b981" weight={3} dashArray="5, 10" />
                      )}
                      {drawPoints.length >= 3 && (
                        <Polygon positions={drawPoints.map(p => [p.lat, p.lng])} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.3 }} />
                      )}
                      {drawPoints.map((pt, idx) => (
                        <Marker key={idx} position={[pt.lat, pt.lng]} icon={vertexMarkerIcon} />
                      ))}
                    </>
                  ) : (
                    <>
                      <MapClickSelector 
                        selectedPos={hasSelectedLoc ? [parseFloat(formData.latitude), parseFloat(formData.longitude)] : null} 
                        onLocationSelected={handleLocationSelected} 
                      />
                      {!isDrawingMode && customBoundary && customBoundary.length >= 3 && (
                        <Polygon 
                          positions={customBoundary.map(p => [p.lat, p.lng])} 
                          pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.2, weight: 2 }} 
                        />
                      )}
                    </>
                  )}
                </MapContainer>

                {/* POLYGON DRAWING CONTROLS HUD (FLOATING IN THE MAP WRAPPER) */}
                <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-1.5 bg-white/95 border p-2 rounded-xl shadow-lg border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = !isDrawingMode;
                      setIsDrawingMode(nextMode);
                      if (nextMode) {
                        setDrawPoints([]);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider transition ${
                      isDrawingMode ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-farm-600 hover:bg-farm-700 text-white shadow-sm'
                    }`}
                  >
                    {isDrawingMode ? "❌ ยกเลิกการวาด" : "📐 เริ่มวาดแปลงเอง"}
                  </button>
                  
                  {isDrawingMode && (
                    <>
                      <button
                        type="button"
                        onClick={() => setDrawPoints(prev => prev.slice(0, -1))}
                        disabled={drawPoints.length === 0}
                        className="px-3 py-1 bg-white hover:bg-slate-50 border rounded-lg text-[9px] font-bold text-slate-700 disabled:opacity-50 transition"
                      >
                        ย้อนกลับ 1 จุด
                      </button>
                      <button
                        type="button"
                        onClick={() => setDrawPoints([])}
                        disabled={drawPoints.length === 0}
                        className="px-3 py-1 bg-white hover:bg-slate-50 border rounded-lg text-[9px] font-bold text-slate-700 disabled:opacity-50 transition"
                      >
                        ล้างขอบเขตที่วาด
                      </button>
                      <button
                        type="button"
                        onClick={handleFinishDrawing}
                        disabled={drawPoints.length < 3}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-[9px] font-black disabled:opacity-50 transition shadow-sm"
                      >
                        ✅ เสร็จสิ้นและใช้ขอบเขตนี้
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="p-4 bg-slate-100 border-t flex gap-2 items-center text-[10px] text-slate-400 font-semibold leading-normal">
                <Info className="w-4 h-4 text-farm-600 shrink-0" />
                <span>การวาดขอบเขตด้วยตนเองจะคำนวณขนาดที่ดิน (ไร่) และจุดแกนกลางโดยอัตโนมัติ</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
