import React, { useState } from 'react';
import { 
  MapContainer, 
  TileLayer, 
  Marker, 
  useMapEvents 
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
  Database
} from 'lucide-react';

const defaultMarkerIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// A small sub-component to handle map clicks and move the marker
function MapClickSelector({ onLocationSelected, selectedPos }) {
  useMapEvents({
    click(e) {
      onLocationSelected(e.latlng.lat, e.latlng.lng);
    },
  });
  return selectedPos ? <Marker position={selectedPos} icon={defaultMarkerIcon} /> : null;
}

export default function CropPlotManagement({ plots, onRefresh, dbStatus }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    crop_type: 'Rice',
    area_rai: 5.0,
    planting_date: new Date().toISOString().split('T')[0],
    status: 'Healthy',
    latitude: 14.358,
    longitude: 100.082
  });

  const openAddModal = () => {
    setEditingPlot(null);
    setFormData({
      name: '',
      crop_type: 'Rice',
      area_rai: 5.0,
      planting_date: new Date().toISOString().split('T')[0],
      status: 'Healthy',
      latitude: 14.358,
      longitude: 100.082
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const openEditModal = (plot) => {
    setEditingPlot(plot);
    setFormData({
      name: plot.name,
      crop_type: plot.crop_type,
      area_rai: plot.area_rai,
      planting_date: typeof plot.planting_date === 'string' ? plot.planting_date : new Date(plot.planting_date).toISOString().split('T')[0],
      status: plot.status,
      latitude: plot.latitude,
      longitude: plot.longitude
    });
    setErrorMsg(null);
    setModalOpen(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'area_rai' || name === 'latitude' || name === 'longitude' 
        ? parseFloat(value) || 0 
        : value
    }));
  };

  const handleLocationSelected = (lat, lng) => {
    setFormData(prev => ({
      ...prev,
      latitude: parseFloat(lat.toFixed(5)),
      longitude: parseFloat(lng.toFixed(5))
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validate inputs
    if (!formData.name.trim()) {
      setErrorMsg("Plot name is required");
      return;
    }
    if (formData.area_rai <= 0) {
      setErrorMsg("Area must be positive");
      return;
    }
    if (formData.latitude === 0 || formData.longitude === 0) {
      setErrorMsg("Please specify latitude and longitude coordinates");
      return;
    }

    // Set boundary points: mock a small 400m rectangle box centered on lat/lng for display
    const offset = 0.001; // ~110 meters offset
    const boundary = [
      { lat: formData.latitude + offset, lng: formData.longitude - offset },
      { lat: formData.latitude + offset, lng: formData.longitude + offset },
      { lat: formData.latitude - offset, lng: formData.longitude + offset },
      { lat: formData.latitude - offset, lng: formData.longitude - offset }
    ];

    const plotPayload = {
      ...formData,
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
          setSuccessMsg(editingPlot ? "Crop plot updated successfully" : "New crop plot created");
          setModalOpen(false);
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          const data = await response.json();
          setErrorMsg(data.detail || "Server operation failed");
        }
      } catch (err) {
        setErrorMsg("Failed to communicate with API server");
      }
    } else {
      // Mock operation locally (Demo Mode)
      if (editingPlot) {
        // Edit local plot reference
        const idx = plots.findIndex(p => p.id === editingPlot.id);
        if (idx !== -1) {
          plots[idx] = {
            ...plots[idx],
            ...plotPayload,
            planting_date: plotPayload.planting_date
          };
        }
        setSuccessMsg("Crop plot updated (Demo Mode)");
      } else {
        // Add new mock plot
        const newId = plots.length > 0 ? Math.max(...plots.map(p => p.id)) + 1 : 1;
        plots.push({
          id: newId,
          ...plotPayload,
          growth_records: []
        });
        setSuccessMsg("New crop plot created (Demo Mode)");
      }
      setModalOpen(false);
      onRefresh(); // trigger UI re-render
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const handleDelete = async (plotId) => {
    if (!window.confirm("Are you sure you want to delete this crop plot? All growth records will be lost.")) {
      return;
    }

    if (dbStatus.connected) {
      try {
        const response = await fetch(`/api/plots/${plotId}`, { method: 'DELETE' });
        if (response.ok) {
          setSuccessMsg("Crop plot deleted");
          onRefresh();
          setTimeout(() => setSuccessMsg(null), 3000);
        } else {
          alert("Failed to delete plot on database");
        }
      } catch (err) {
        alert("API connection error during deletion");
      }
    } else {
      // Mock deletion
      const idx = plots.findIndex(p => p.id === plotId);
      if (idx !== -1) {
        plots.splice(idx, 1);
        setSuccessMsg("Crop plot deleted (Demo Mode)");
        onRefresh();
        setTimeout(() => setSuccessMsg(null), 3000);
      }
    }
  };

  return (
    <div className="space-y-6 lg:space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-900 tracking-tight">Crop Plot Management</h2>
          <p className="text-sm text-slate-500">Register crop fields, define boundaries, and modify planting configurations.</p>
        </div>
        <button
          onClick={openAddModal}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-farm-600 hover:bg-farm-700 text-white font-extrabold text-xs shadow-md shadow-farm-200 transition duration-150"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Plot</span>
        </button>
      </div>

      {/* FEEDBACK SYSTEM NOTIFICATIONS */}
      {successMsg && (
        <div className="flex items-center gap-2 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold animate-pulse">
          <CheckCircle className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* TABLE PANEL */}
      <div className="glass-panel rounded-3xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/40 flex justify-between items-center">
          <h3 className="font-bold text-slate-800">Registered Crop Plots</h3>
          <span className="text-[10px] text-slate-400 font-extrabold bg-slate-100 px-2 py-0.5 rounded border">
            {plots.length} PLOTS LISTED
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                <th className="px-6 py-3.5">Plot Info</th>
                <th className="px-6 py-3.5">Crop Classification</th>
                <th className="px-6 py-3.5 text-right">Area (Rai)</th>
                <th className="px-6 py-3.5">Planting Date</th>
                <th className="px-6 py-3.5">Coordinates</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
              {plots.length > 0 ? (
                plots.map((plot) => (
                  <tr key={plot.id} className="hover:bg-slate-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-extrabold text-slate-800 text-sm">{plot.name}</div>
                      <span className="text-[10px] text-slate-400">ID: {plot.id}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-farm-50 text-farm-700 border border-farm-100 px-2 py-1 rounded-md text-[11px] font-bold">
                        {plot.crop_type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-slate-900 font-extrabold">
                      {plot.area_rai} Rai
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{String(plot.planting_date)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-mono">
                      {plot.latitude.toFixed(4)}, {plot.longitude.toFixed(4)}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block ${
                        plot.status.includes("Healthy") ? 'bg-green-50 text-green-700 border border-green-200' :
                        plot.status.includes("Stressed") ? 'bg-red-50 text-red-700 border border-red-200' :
                        plot.status.includes("Harvest") ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                        'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {plot.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center items-center gap-1">
                        <button 
                          onClick={() => openEditModal(plot)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
                          title="Edit plot configurations"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(plot.id)}
                          className="p-2 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          title="Remove plot registration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-slate-400 font-bold">
                    No crop plots registered yet. Click the button to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* FORM MODAL (ADD / EDIT) */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-4xl bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-[90vh] md:h-[600px] animate-pulse-once">
            
            {/* FORM CONTAINER - LEFT HALF */}
            <form onSubmit={handleSubmit} className="flex-1 p-6 md:p-8 flex flex-col justify-between overflow-y-auto border-r border-slate-100">
              
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-black text-slate-800">
                    {editingPlot ? `Edit Plot: ${editingPlot.name}` : "Register New Crop Plot"}
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
                    <label className="text-[10px] text-slate-400 font-extrabold uppercase">Plot Identification Name</label>
                    <input 
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="e.g. A3 Jasmine Rice (South)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                    />
                  </div>

                  {/* Crop Type & Area */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Crop Classification</label>
                      <select 
                        name="crop_type"
                        value={formData.crop_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      >
                        {["Rice", "Sugarcane", "Cassava", "Corn", "Pineapple", "Rubber"].map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Area (Rai)</label>
                      <input 
                        type="number"
                        name="area_rai"
                        step="0.1"
                        value={formData.area_rai}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-sm"
                      />
                    </div>
                  </div>

                  {/* Planting Date & Status */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Planting date</label>
                      <input 
                        type="date"
                        name="planting_date"
                        value={formData.planting_date}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Initial Status</label>
                      <select 
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      >
                        {["Healthy", "Active Monitoring", "Stressed", "Harvested"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Coordinates (Lat / Lng) */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Latitude Coordinate</label>
                      <input 
                        type="number"
                        name="latitude"
                        step="0.00001"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] text-slate-400 font-extrabold uppercase">Longitude Coordinate</label>
                      <input 
                        type="number"
                        name="longitude"
                        step="0.00001"
                        value={formData.longitude}
                        onChange={handleInputChange}
                        className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:border-farm-500 font-semibold text-xs"
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
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-white bg-farm-600 hover:bg-farm-700 rounded-xl font-extrabold text-xs shadow-md shadow-farm-200 transition"
                >
                  {editingPlot ? "Apply Changes" : "Register Plot"}
                </button>
              </div>

            </form>

            {/* GIS BOUNDARY MAP PICKER - RIGHT HALF */}
            <div className="hidden md:flex md:w-[40%] bg-slate-50 flex-col">
              <div className="p-4 border-b border-slate-200 bg-white">
                <h4 className="font-bold text-slate-700 flex items-center gap-1.5 text-xs">
                  <MapPin className="w-4 h-4 text-farm-600" />
                  GIS Location Pinpoint
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
                  Click anywhere on the satellite imagery map below to dynamically lock coordinates.
                </p>
              </div>
              
              <div className="flex-1 relative">
                <MapContainer 
                  center={[formData.latitude || 14.358, formData.longitude || 100.082]} 
                  zoom={12} 
                  scrollWheelZoom={true}
                  className="w-full h-full"
                >
                  <TileLayer
                    attribution='&copy; Google Maps Satellite'
                    url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  />
                  <MapClickSelector 
                    selectedPos={[formData.latitude, formData.longitude]} 
                    onLocationSelected={handleLocationSelected} 
                  />
                </MapContainer>
              </div>
              
              <div className="p-4 bg-slate-100 border-t flex gap-2 items-center text-[10px] text-slate-400 font-semibold leading-normal">
                <Info className="w-4 h-4 text-farm-600 shrink-0" />
                <span>Boundary polygons are generated automatically around selected anchor.</span>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
