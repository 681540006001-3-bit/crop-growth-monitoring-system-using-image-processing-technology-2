from sqlalchemy.orm import Session
from app import models, schemas
from datetime import date, timedelta
import json
from typing import Optional

def get_plot(db: Session, plot_id: int):
    return db.query(models.Plot).filter(models.Plot.id == plot_id).first()

def get_plots(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Plot).offset(skip).limit(limit).all()

def create_plot(db: Session, plot: schemas.PlotCreate):
    db_plot = models.Plot(
        name=plot.name,
        crop_type=plot.crop_type,
        area_rai=plot.area_rai,
        planting_date=plot.planting_date,
        status=plot.status,
        latitude=plot.latitude,
        longitude=plot.longitude,
        boundary_coordinates=plot.boundary_coordinates
    )
    db.add(db_plot)
    db.commit()
    db.refresh(db_plot)

    # Auto-generate initial growth record based on registered status
    status_lower = db_plot.status.lower()
    height = 5.0
    cover = 2.0
    lai = 0.1
    ndvi = 0.18
    notes = "บันทึกเริ่มต้นอัตโนมัติ (ท่อนพันธุ์ปักชำใหม่)"
    
    if "healthy" in status_lower or "สมบูรณ์" in status_lower:
        height = 80.0
        cover = 75.0
        lai = 2.1
        ndvi = 0.65
        notes = "บันทึกเริ่มต้นอัตโนมัติ (สภาพแปลงสมบูรณ์ดี)"
    elif "monitor" in status_lower or "เฝ้าระวัง" in status_lower:
        height = 75.0
        cover = 60.0
        lai = 1.5
        ndvi = 0.45
        notes = "บันทึกเริ่มต้นอัตโนมัติ (อยู่ระหว่างเฝ้าระวังการเติบโต)"
    elif "stress" in status_lower or "เครียด" in status_lower:
        height = 70.0
        cover = 40.0
        lai = 0.9
        ndvi = 0.30
        notes = "บันทึกเริ่มต้นอัตโนมัติ (พบอาการเครียดหรือโรคด่างมัน CMD)"
    elif "harvest" in status_lower or "เก็บเกี่ยว" in status_lower:
        height = 0.0
        cover = 0.0
        lai = 0.0
        ndvi = 0.12
        notes = "บันทึกเริ่มต้นอัตโนมัติ (เก็บเกี่ยวผลผลิตแล้ว)"

    initial_record = models.GrowthRecord(
        plot_id=db_plot.id,
        date=db_plot.planting_date,
        height_cm=height,
        canopy_cover_pct=cover,
        leaf_area_index=lai,
        ndvi_avg=ndvi,
        status=db_plot.status,
        notes=notes
    )
    db.add(initial_record)
    db.commit()
    db.refresh(db_plot)

    return db_plot

def update_plot(db: Session, plot_id: int, plot_data: schemas.PlotCreate):
    db_plot = get_plot(db, plot_id)
    if not db_plot:
        return None
    
    db_plot.name = plot_data.name
    db_plot.crop_type = plot_data.crop_type
    db_plot.area_rai = plot_data.area_rai
    db_plot.planting_date = plot_data.planting_date
    db_plot.status = plot_data.status
    db_plot.latitude = plot_data.latitude
    db_plot.longitude = plot_data.longitude
    db_plot.boundary_coordinates = plot_data.boundary_coordinates
    
    db.commit()
    db.refresh(db_plot)
    return db_plot

def delete_plot(db: Session, plot_id: int):
    db_plot = get_plot(db, plot_id)
    if not db_plot:
        return False
    db.delete(db_plot)
    db.commit()
    return True

# Growth Record CRUD
def get_growth_records(db: Session, plot_id: Optional[int] = None, skip: int = 0, limit: int = 200):
    query = db.query(models.GrowthRecord)
    if plot_id is not None:
        query = query.filter(models.GrowthRecord.plot_id == plot_id)
    return query.order_by(models.GrowthRecord.date.desc()).offset(skip).limit(limit).all()

def create_growth_record(db: Session, record: schemas.GrowthRecordCreate, image_path: str = None, heatmap_path: str = None):
    db_record = models.GrowthRecord(
        plot_id=record.plot_id,
        date=record.date,
        height_cm=record.height_cm,
        canopy_cover_pct=record.canopy_cover_pct,
        ndvi_avg=record.ndvi_avg,
        leaf_area_index=record.leaf_area_index,
        status=record.status,
        notes=record.notes,
        image_path=image_path,
        heatmap_path=heatmap_path
    )
    db.add(db_record)
    db.commit()
    db.refresh(db_record)
    return db_record

# NDVI Analysis CRUD
def get_ndvi_analyses(db: Session, plot_id: Optional[int] = None, skip: int = 0, limit: int = 100):
    query = db.query(models.NDVIAnalysis)
    if plot_id is not None:
        query = query.filter(models.NDVIAnalysis.plot_id == plot_id)
    return query.order_by(models.NDVIAnalysis.date.desc()).offset(skip).limit(limit).all()

def create_ndvi_analysis(db: Session, analysis: schemas.NDVIAnalysisCreate):
    db_analysis = models.NDVIAnalysis(
        plot_id=analysis.plot_id,
        date=analysis.date,
        original_image_path=analysis.original_image_path,
        processed_heatmap_path=analysis.processed_heatmap_path,
        min_ndvi=analysis.min_ndvi,
        max_ndvi=analysis.max_ndvi,
        avg_ndvi=analysis.avg_ndvi,
        health_classification=analysis.health_classification,
        histogram=analysis.histogram
    )
    db.add(db_analysis)
    db.commit()
    db.refresh(db_analysis)
    return db_analysis

# Dashboard Statistics
def get_dashboard_stats(db: Session):
    plots = db.query(models.Plot).all()
    total_plots = len(plots)
    total_area_rai = sum(p.area_rai for p in plots)
    
    # Calculate average NDVI based on the latest growth record of each plot
    ndvi_sum = 0.0
    ndvi_count = 0
    
    # Track status counts
    health_counts = {"healthy": 0, "monitoring": 0, "stressed": 0, "harvested": 0, "newly_planted": 0}
    
    for plot in plots:
        # Increment health count
        status_key = plot.status.lower().replace(" ", "_")
        if "active" in status_key or "monitoring" in status_key:
            health_counts["monitoring"] += 1
        elif "stress" in status_key:
            health_counts["stressed"] += 1
        elif "harvest" in status_key:
            health_counts["harvested"] += 1
        elif "newly" in status_key or "just" in status_key or "ปลูก" in status_key:
            health_counts["newly_planted"] += 1
        else:
            health_counts["healthy"] += 1
            
        # Get latest growth record for NDVI
        latest_record = db.query(models.GrowthRecord)\
            .filter(models.GrowthRecord.plot_id == plot.id)\
            .order_by(models.GrowthRecord.date.desc())\
            .first()
            
        if latest_record:
            ndvi_sum += latest_record.ndvi_avg
            ndvi_count += 1
            
    average_ndvi = ndvi_sum / ndvi_count if ndvi_count > 0 else 0.0
    
    # Fetch recent records across all plots
    recent_records_db = db.query(models.GrowthRecord)\
        .order_by(models.GrowthRecord.date.desc())\
        .limit(5)\
        .all()
        
    recent_records = []
    for r in recent_records_db:
        plot_name = db.query(models.Plot.name).filter(models.Plot.id == r.plot_id).scalar()
        recent_records.append({
            "id": r.id,
            "plot_id": r.plot_id,
            "plot_name": plot_name or f"Plot {r.plot_id}",
            "date": r.date.strftime("%Y-%m-%d"),
            "height_cm": r.height_cm,
            "canopy_cover_pct": r.canopy_cover_pct,
            "ndvi_avg": r.ndvi_avg,
            "leaf_area_index": r.leaf_area_index,
            "status": r.status,
            "notes": r.notes,
            "image_path": r.image_path,
            "heatmap_path": r.heatmap_path
        })
        
    return {
        "total_plots": total_plots,
        "total_area_rai": round(total_area_rai, 1),
        "average_ndvi": round(average_ndvi, 2),
        "health_summary": health_counts,
        "latest_records": recent_records
    }

# Database Seeder
def seed_database_if_empty(db: Session):
    # Check if database already has plots
    if db.query(models.Plot).first() is not None:
        return
        
    # Seed 4 plots in Central Thailand (agriculture region)
    seed_plots = [
        models.Plot(
            name="A1 Rice Paddy (North)",
            crop_type="Rice",
            area_rai=12.5,
            planting_date=date.today() - timedelta(days=90),
            status="Healthy",
            latitude=14.3582,
            longitude=100.0827,
            boundary_coordinates=[
                {"lat": 14.3595, "lng": 100.0815},
                {"lat": 14.3595, "lng": 100.0839},
                {"lat": 14.3570, "lng": 100.0839},
                {"lat": 14.3570, "lng": 100.0815}
            ]
        ),
        models.Plot(
            name="B3 Sugarcane Field",
            crop_type="Sugarcane",
            area_rai=24.0,
            planting_date=date.today() - timedelta(days=150),
            status="Active Monitoring",
            latitude=14.3821,
            longitude=100.0415,
            boundary_coordinates=[
                {"lat": 14.3835, "lng": 100.0395},
                {"lat": 14.3835, "lng": 100.0435},
                {"lat": 14.3805, "lng": 100.0435},
                {"lat": 14.3805, "lng": 100.0395}
            ]
        ),
        models.Plot(
            name="C2 Cassava Plantation",
            crop_type="Cassava",
            area_rai=8.2,
            planting_date=date.today() - timedelta(days=45),
            status="Stressed",
            latitude=14.3210,
            longitude=100.1200,
            boundary_coordinates=[
                {"lat": 14.3220, "lng": 100.1185},
                {"lat": 14.3220, "lng": 100.1215},
                {"lat": 14.3200, "lng": 100.1215},
                {"lat": 14.3200, "lng": 100.1185}
            ]
        ),
        models.Plot(
            name="D5 Maize Cultivation",
            crop_type="Corn",
            area_rai=15.0,
            planting_date=date.today() - timedelta(days=120),
            status="Harvested",
            latitude=14.4010,
            longitude=100.1510,
            boundary_coordinates=[
                {"lat": 14.4025, "lng": 100.1495},
                {"lat": 14.4025, "lng": 100.1525},
                {"lat": 14.3995, "lng": 100.1525},
                {"lat": 14.3995, "lng": 100.1495}
            ]
        )
    ]
    
    for plot in seed_plots:
        db.add(plot)
    db.commit()
    
    # Reload from DB to get IDs
    plots = db.query(models.Plot).all()
    
    # Seed historical growth records
    # Plot 1 (Rice - 90 days growth history)
    p1 = next(p for p in plots if p.name == "A1 Rice Paddy (North)")
    for days_ago in [90, 75, 60, 45, 30, 15, 0]:
        rec_date = date.today() - timedelta(days=days_ago)
        progress = (90 - days_ago) / 90.0  # 0.0 to 1.0
        
        db.add(models.GrowthRecord(
            plot_id=p1.id,
            date=rec_date,
            height_cm=round(10.0 + progress * 95.0, 1),
            canopy_cover_pct=round(5.0 + progress * 88.0, 1),
            ndvi_avg=round(0.12 + progress * 0.68, 2),
            leaf_area_index=round(0.3 + progress * 4.5, 2),
            status="Healthy" if days_ago < 30 else "Active Monitoring",
            notes=f"Rice growth tracking. Progressing smoothly. Age {90 - days_ago} days."
        ))
        
    # Plot 2 (Sugarcane - 150 days growth history)
    p2 = next(p for p in plots if p.name == "B3 Sugarcane Field")
    for days_ago in [150, 120, 90, 60, 30, 0]:
        rec_date = date.today() - timedelta(days=days_ago)
        progress = (150 - days_ago) / 150.0
        
        db.add(models.GrowthRecord(
            plot_id=p2.id,
            date=rec_date,
            height_cm=round(20.0 + progress * 240.0, 1),
            canopy_cover_pct=round(8.0 + progress * 82.0, 1),
            ndvi_avg=round(0.15 + progress * 0.55, 2),
            leaf_area_index=round(0.5 + progress * 5.2, 2),
            status="Active Monitoring" if days_ago == 0 else "Healthy",
            notes=f"Sugarcane monitoring. Stalk elongation stage. Stalk height is {round(20.0 + progress * 240.0)} cm."
        ))
        
    # Plot 3 (Cassava - 45 days growth history)
    p3 = next(p for p in plots if p.name == "C2 Cassava Plantation")
    # Cassava is showing signs of nutrient stress
    for days_ago in [45, 30, 15, 0]:
        rec_date = date.today() - timedelta(days=days_ago)
        progress = (45 - days_ago) / 45.0
        
        # NDVI peaks early but falls at day 0 due to stress/yellowing leaves
        ndvi_val = round(0.14 + progress * 0.42, 2)
        status_val = "Healthy"
        if days_ago == 0:
            ndvi_val = 0.38  # dropping from 0.56
            status_val = "Stressed"
            
        db.add(models.GrowthRecord(
            plot_id=p3.id,
            date=rec_date,
            height_cm=round(15.0 + progress * 45.0, 1),
            canopy_cover_pct=round(10.0 + progress * 45.0, 1),
            ndvi_avg=ndvi_val,
            leaf_area_index=round(0.4 + progress * 2.1, 2),
            status=status_val,
            notes="Cassava plant records. Recent yellowing observed on lower leaves. Suspected nitrogen deficiency." if days_ago == 0 else "Normal early canopy development."
        ))
        
    # Plot 4 (Maize - 120 days history, harvested)
    p4 = next(p for p in plots if p.name == "D5 Maize Cultivation")
    for days_ago in [120, 100, 80, 60, 40, 20]:
        rec_date = date.today() - timedelta(days=days_ago)
        progress = (120 - days_ago) / 120.0
        
        db.add(models.GrowthRecord(
            plot_id=p4.id,
            date=rec_date,
            height_cm=round(15.0 + progress * 190.0, 1),
            canopy_cover_pct=round(12.0 + progress * 80.0, 1),
            ndvi_avg=round(0.18 + progress * 0.58, 2),
            leaf_area_index=round(0.4 + progress * 3.8, 2),
            status="Healthy",
            notes="Maize growing healthily. Approaching physiological maturity."
        ))
        
    # Add final harvest log for Plot 4 at day 0
    db.add(models.GrowthRecord(
        plot_id=p4.id,
        date=date.today(),
        height_cm=0.0,
        canopy_cover_pct=0.0,
        ndvi_avg=0.10,
        leaf_area_index=0.0,
        status="Harvested",
        notes="Maize crop successfully harvested. Field stubble remains. Soil preparation starting soon."
    ))
    
    db.commit()
    logger.info("Successfully seeded database with smart farming demo data.")
