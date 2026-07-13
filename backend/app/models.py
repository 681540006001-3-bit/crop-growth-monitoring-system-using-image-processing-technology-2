from sqlalchemy import Column, Integer, String, Float, Date, Text, ForeignKey, JSON
from sqlalchemy.orm import relationship
from app.database import Base

class Plot(Base):
    __tablename__ = "plots"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    crop_type = Column(String(100), nullable=False)
    area_rai = Column(Float, nullable=False)
    planting_date = Column(Date, nullable=False)
    status = Column(String(50), default="Healthy")  # Healthy, Active Monitoring, Harvested, Stressed
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    boundary_coordinates = Column(JSON, nullable=True)  # List of dicts [{"lat": x, "lng": y}]

    # Relationships
    growth_records = relationship("GrowthRecord", back_populates="plot", cascade="all, delete-orphan")
    ndvi_analyses = relationship("NDVIAnalysis", back_populates="plot", cascade="all, delete-orphan")

class GrowthRecord(Base):
    __tablename__ = "growth_records"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    height_cm = Column(Float, nullable=False)
    canopy_cover_pct = Column(Float, nullable=False)
    ndvi_avg = Column(Float, nullable=False)
    leaf_area_index = Column(Float, nullable=False)
    status = Column(String(50), default="Healthy")  # Excellent, Good, Fair, Poor
    notes = Column(Text, nullable=True)
    image_path = Column(String(255), nullable=True)
    heatmap_path = Column(String(255), nullable=True)

    # Relationships
    plot = relationship("Plot", back_populates="growth_records")

class NDVIAnalysis(Base):
    __tablename__ = "ndvi_analyses"

    id = Column(Integer, primary_key=True, index=True)
    plot_id = Column(Integer, ForeignKey("plots.id", ondelete="CASCADE"), nullable=True)
    date = Column(Date, nullable=False)
    original_image_path = Column(String(255), nullable=False)
    processed_heatmap_path = Column(String(255), nullable=False)
    min_ndvi = Column(Float, nullable=False)
    max_ndvi = Column(Float, nullable=False)
    avg_ndvi = Column(Float, nullable=False)
    health_classification = Column(String(50), nullable=False)  # Healthy, Moderate Stress, Severe Stress
    histogram = Column(JSON, nullable=True)  # List of objects {"bin": val, "percentage": val}

    # Relationships
    plot = relationship("Plot", back_populates="ndvi_analyses")

