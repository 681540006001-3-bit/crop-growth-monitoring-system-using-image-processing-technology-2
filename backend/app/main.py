from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from datetime import date as dt_date
from typing import List, Optional
import os
import shutil

from app import models, schemas, crud, config, processing
from app.database import engine, get_db

# Create database tables on startup
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Crop Growth Monitoring & NDVI Analysis API",
    description="Backend API for Precision Agriculture dashboards and image analysis.",
    version="1.0.0"
)

# Enable CORS for frontend development server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify the actual frontend domains
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Seed database on startup
@app.on_event("startup")
def startup_event():
    db = next(get_db())
    try:
        crud.seed_database_if_empty(db)
    except Exception as e:
        print(f"Error seeding database on startup: {e}")

# Mount static folder for uploads and heatmaps
# Configures path to serve files uploaded to /app/static/uploads via /static/
static_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static")
os.makedirs(os.path.join(static_path, "uploads"), exist_ok=True)
app.mount("/static", StaticFiles(directory=static_path), name="static")

@app.get("/api/health", tags=["System"])
def health_check():
    return {"status": "healthy", "service": "Crop Growth Monitoring API"}

# Plot Endpoints
@app.get("/api/plots", response_model=List[schemas.PlotOut], tags=["Plots"])
def read_plots(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_plots(db, skip=skip, limit=limit)

@app.get("/api/plots/{plot_id}", response_model=schemas.PlotOut, tags=["Plots"])
def read_plot(plot_id: int, db: Session = Depends(get_db)):
    db_plot = crud.get_plot(db, plot_id=plot_id)
    if db_plot is None:
        raise HTTPException(status_code=404, detail="Crop plot not found")
    return db_plot

@app.post("/api/plots", response_model=schemas.PlotOut, tags=["Plots"])
def create_plot(plot: schemas.PlotCreate, db: Session = Depends(get_db)):
    return crud.create_plot(db=db, plot=plot)

@app.put("/api/plots/{plot_id}", response_model=schemas.PlotOut, tags=["Plots"])
def update_plot(plot_id: int, plot: schemas.PlotCreate, db: Session = Depends(get_db)):
    db_plot = crud.update_plot(db=db, plot_id=plot_id, plot_data=plot)
    if db_plot is None:
        raise HTTPException(status_code=404, detail="Crop plot not found")
    return db_plot

@app.delete("/api/plots/{plot_id}", tags=["Plots"])
def delete_plot(plot_id: int, db: Session = Depends(get_db)):
    success = crud.delete_plot(db=db, plot_id=plot_id)
    if not success:
        raise HTTPException(status_code=404, detail="Crop plot not found")
    return {"detail": "Crop plot successfully deleted"}

# Growth Record Endpoints (with file upload support)
@app.get("/api/growth", response_model=List[schemas.GrowthRecordOut], tags=["Growth"])
def read_growth_records(plot_id: Optional[int] = None, skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return crud.get_growth_records(db, plot_id=plot_id, skip=skip, limit=limit)

@app.post("/api/plots/{plot_id}/growth", response_model=schemas.GrowthRecordOut, tags=["Growth"])
def create_growth_record(
    plot_id: int,
    date: str = Form(...),
    height_cm: float = Form(...),
    canopy_cover_pct: float = Form(...),
    leaf_area_index: float = Form(...),
    status: str = Form(...),
    notes: Optional[str] = Form(None),
    ndvi_avg: Optional[float] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    # Verify plot exists
    db_plot = crud.get_plot(db, plot_id=plot_id)
    if not db_plot:
        raise HTTPException(status_code=404, detail="Plot not found")
        
    original_save_path = None
    heatmap_save_path = None
    calculated_ndvi = ndvi_avg or 0.15 # Fallback
    
    # If image is uploaded, process it
    if image:
        # Create unique filename
        filename = f"plot_{plot_id}_{int(dt_date.today().strftime('%Y%m%d'))}_{image.filename}"
        file_path = os.path.join(config.UPLOAD_DIR, filename)
        
        # Save file to uploads folder
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(image.file, buffer)
            
        original_save_path = f"uploads/{filename}"
        
        try:
            # Process image to extract index (GLI/NDVI) and build heatmap
            result = processing.process_vegetation_image(file_path, config.UPLOAD_DIR)
            calculated_ndvi = result["avg_val"]
            heatmap_save_path = f"uploads/{result['heatmap_filename']}"
            
            # Update plot status based on image classification
            db_plot.status = "Healthy" if "Healthy" in result["classification"] else "Active Monitoring"
            if "Stress" in result["classification"]:
                db_plot.status = "Stressed"
            db.commit()
            
        except Exception as e:
            print(f"Error processing image: {e}")
            # If image processing fails, save image but fallback to basic values
            
    # Parse date
    try:
        parsed_date = dt_date.fromisoformat(date)
    except ValueError:
        parsed_date = dt_date.today()
        
    # Build schema record
    record_create = schemas.GrowthRecordCreate(
        plot_id=plot_id,
        date=parsed_date,
        height_cm=height_cm,
        canopy_cover_pct=canopy_cover_pct,
        ndvi_avg=calculated_ndvi,
        leaf_area_index=leaf_area_index,
        status=status,
        notes=notes
    )
    
    return crud.create_growth_record(
        db=db,
        record=record_create,
        image_path=original_save_path,
        heatmap_path=heatmap_save_path
    )

# NDVI Direct Upload and Analysis Endpoints
@app.post("/api/analysis", response_model=schemas.NDVIAnalysisOut, tags=["Analysis"])
def perform_image_analysis(
    plot_id: Optional[int] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save the original file
    filename = f"analysis_{int(dt_date.today().strftime('%Y%m%d%H%M%S'))}_{image.filename}"
    file_path = os.path.join(config.UPLOAD_DIR, filename)
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(image.file, buffer)
        
    original_save_path = f"uploads/{filename}"
    
    try:
        # Perform vegetation index processing
        result = processing.process_vegetation_image(file_path, config.UPLOAD_DIR)
        
        # Build DB Record
        analysis_create = schemas.NDVIAnalysisCreate(
            plot_id=plot_id,
            date=dt_date.today(),
            original_image_path=original_save_path,
            processed_heatmap_path=f"uploads/{result['heatmap_filename']}",
            min_ndvi=result["min_val"],
            max_ndvi=result["max_val"],
            avg_ndvi=result["avg_val"],
            health_classification=result["classification"],
            histogram=result["histogram"]
        )
        
        db_analysis = crud.create_ndvi_analysis(db=db, analysis=analysis_create)
        
        # If plot_id is supplied, we can also log a corresponding growth record
        if plot_id:
            db_plot = crud.get_plot(db, plot_id=plot_id)
            if db_plot:
                # Add growth record automatically
                db_record = models.GrowthRecord(
                    plot_id=plot_id,
                    date=dt_date.today(),
                    height_cm=0.0,  # Unknown height from image alone
                    canopy_cover_pct=round(max(0.0, result["avg_val"] * 100.0), 1),  # Proxy cover
                    ndvi_avg=result["avg_val"],
                    leaf_area_index=round(max(0.0, result["avg_val"] * 6.0), 2),  # Proxy LAI
                    status="Healthy" if "Healthy" in result["classification"] else "Stressed",
                    notes=f"Auto-generated from image analysis. Health: {result['classification']}.",
                    image_path=original_save_path,
                    heatmap_path=f"uploads/{result['heatmap_filename']}"
                )
                db.add(db_record)
                
                # Update plot status
                db_plot.status = "Healthy" if "Healthy" in result["classification"] else "Active Monitoring"
                if "Stress" in result["classification"]:
                    db_plot.status = "Stressed"
                    
                db.commit()
                
        return db_analysis
        
    except Exception as e:
        # Clean up uploaded file if processing crashed
        if os.path.exists(file_path):
            os.remove(file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Image processing failed: {str(e)}"
        )

@app.post("/api/analysis/dual", response_model=schemas.NDVIAnalysisOut, tags=["Analysis"])
def perform_dual_band_analysis(
    plot_id: Optional[int] = Form(None),
    red_image: UploadFile = File(...),
    nir_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    # Save the Red band image
    red_filename = f"dual_red_{int(dt_date.today().strftime('%Y%m%d%H%M%S'))}_{red_image.filename}"
    red_file_path = os.path.join(config.UPLOAD_DIR, red_filename)
    with open(red_file_path, "wb") as buffer:
        shutil.copyfileobj(red_image.file, buffer)

    # Save the NIR band image
    nir_filename = f"dual_nir_{int(dt_date.today().strftime('%Y%m%d%H%M%S'))}_{nir_image.filename}"
    nir_file_path = os.path.join(config.UPLOAD_DIR, nir_filename)
    with open(nir_file_path, "wb") as buffer:
        shutil.copyfileobj(nir_image.file, buffer)
        
    red_original_path = f"uploads/{red_filename}"
    
    try:
        # Perform dual band image calculation
        result = processing.process_dual_band_ndvi(red_file_path, nir_file_path, config.UPLOAD_DIR)
        
        # Build DB Record (using red image path as original source path representation)
        analysis_create = schemas.NDVIAnalysisCreate(
            plot_id=plot_id,
            date=dt_date.today(),
            original_image_path=red_original_path,
            processed_heatmap_path=f"uploads/{result['heatmap_filename']}",
            min_ndvi=result["min_val"],
            max_ndvi=result["max_val"],
            avg_ndvi=result["avg_val"],
            health_classification=result["classification"],
            histogram=result["histogram"]
        )
        
        db_analysis = crud.create_ndvi_analysis(db=db, analysis=analysis_create)
        
        # Auto log growth record if plot_id is present
        if plot_id:
            db_plot = crud.get_plot(db, plot_id=plot_id)
            if db_plot:
                db_record = models.GrowthRecord(
                    plot_id=plot_id,
                    date=dt_date.today(),
                    height_cm=0.0,
                    canopy_cover_pct=round(max(0.0, result["avg_val"] * 100.0), 1),
                    ndvi_avg=result["avg_val"],
                    leaf_area_index=round(max(0.0, result["avg_val"] * 6.0), 2),
                    status="Healthy" if "Healthy" in result["classification"] else "Stressed",
                    notes=f"Auto-generated from Dual Band NDVI analysis. Health: {result['classification']}.",
                    image_path=red_original_path,
                    heatmap_path=f"uploads/{result['heatmap_filename']}"
                )
                db.add(db_record)
                
                db_plot.status = "Healthy" if "Healthy" in result["classification"] else "Active Monitoring"
                if "Stress" in result["classification"]:
                    db_plot.status = "Stressed"
                db.commit()
                
        return db_analysis
        
    except Exception as e:
        if os.path.exists(red_file_path):
            os.remove(red_file_path)
        if os.path.exists(nir_file_path):
            os.remove(nir_file_path)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Dual band processing failed: {str(e)}"
        )


@app.get("/api/analysis", response_model=List[schemas.NDVIAnalysisOut], tags=["Analysis"])
def read_analyses(plot_id: Optional[int] = None, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_ndvi_analyses(db, plot_id=plot_id, skip=skip, limit=limit)

# Dashboard Summary Stats Endpoint
@app.get("/api/dashboard/stats", response_model=schemas.DashboardStats, tags=["Dashboard"])
def get_dashboard_summary(db: Session = Depends(get_db)):
    return crud.get_dashboard_stats(db)
