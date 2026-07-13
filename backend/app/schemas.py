from pydantic import BaseModel
from datetime import date
from typing import List, Optional, Any

# Growth Record Schemas
class GrowthRecordBase(BaseModel):
    date: date
    height_cm: float
    canopy_cover_pct: float
    ndvi_avg: float
    leaf_area_index: float
    status: str
    notes: Optional[str] = None

class GrowthRecordCreate(GrowthRecordBase):
    plot_id: int

class GrowthRecordOut(GrowthRecordBase):
    id: int
    plot_id: int
    image_path: Optional[str] = None
    heatmap_path: Optional[str] = None

    class Config:
        from_attributes = True

# Plot Schemas
class PlotBase(BaseModel):
    name: str
    crop_type: str
    area_rai: float
    planting_date: date
    status: str = "Healthy"
    latitude: float
    longitude: float
    boundary_coordinates: Optional[List[Any]] = None

class PlotCreate(PlotBase):
    pass

class PlotOut(PlotBase):
    id: int
    growth_records: List[GrowthRecordOut] = []

    class Config:
        from_attributes = True

class NDVIAnalysisBase(BaseModel):
    date: date
    min_ndvi: float
    max_ndvi: float
    avg_ndvi: float
    health_classification: str
    histogram: Optional[List[Any]] = None

class NDVIAnalysisCreate(NDVIAnalysisBase):
    plot_id: Optional[int] = None
    original_image_path: str
    processed_heatmap_path: str

class NDVIAnalysisOut(NDVIAnalysisBase):
    id: int
    plot_id: Optional[int] = None
    original_image_path: str
    processed_heatmap_path: str

    class Config:
        from_attributes = True

# Dashboard Summary Schemas
class CropHealthSummary(BaseModel):
    healthy: int
    monitoring: int
    stressed: int
    harvested: int

class DashboardStats(BaseModel):
    total_plots: int
    total_area_rai: float
    average_ndvi: float
    health_summary: CropHealthSummary
    latest_records: List[Any]  # Will include combined Plot Name for display
