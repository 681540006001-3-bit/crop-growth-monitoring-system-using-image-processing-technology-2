import os
import cv2
import numpy as np
import logging

# Configure logger
logger = logging.getLogger("app.processing")
logging.basicConfig(level=logging.INFO)

# Optional imports with graceful fallbacks
try:
    import rasterio
    RASTERIO_AVAILABLE = True
    logger.info("Rasterio successfully imported. GeoTIFF multispectral analysis enabled.")
except ImportError:
    RASTERIO_AVAILABLE = False
    logger.warning("Rasterio is not installed. GeoTIFF analysis will fallback to RGB OpenCV engine.")

def _calculate_histogram(index_array: np.ndarray) -> list:
    """
    Splits the vegetation index range [-1.0, 1.0] into 10 bins
    and calculates the percentage distribution of pixels in each bin.
    """
    clean_array = index_array[~np.isnan(index_array)]
    if clean_array.size == 0:
        return []
        
    counts, bin_edges = np.histogram(clean_array, bins=10, range=(-1.0, 1.0))
    total_pixels = clean_array.size
    
    histogram_data = []
    for i in range(len(counts)):
        bin_center = round(float((bin_edges[i] + bin_edges[i+1]) / 2.0), 2)
        percentage = round(float(counts[i] / total_pixels * 100.0), 2)
        histogram_data.append({
            "bin": bin_center,
            "percentage": percentage
        })
    return histogram_data

def process_vegetation_image(input_path: str, output_heatmap_dir: str) -> dict:
    """
    Processes an agricultural crop plot image and generates an NDVI/GLI greenness heatmap.
    Supports GeoTIFF (via rasterio) and standard RGB images (via OpenCV).
    
    Returns statistics, histogram, and the path to the saved heatmap image.
    """
    # Create output filename
    base_name = os.path.basename(input_path)
    name_part, ext = os.path.splitext(base_name)
    heatmap_filename = f"{name_part}_heatmap.jpg"
    output_path = os.path.join(output_heatmap_dir, heatmap_filename)
    
    is_tiff = ext.lower() in [".tif", ".tiff", ".geotiff"]
    
    if is_tiff and RASTERIO_AVAILABLE:
        try:
            return _process_geotiff(input_path, output_path)
        except Exception as e:
            logger.error(f"Error processing GeoTIFF with rasterio: {e}. Falling back to RGB OpenCV engine.")
            return _process_rgb(input_path, output_path)
    else:
        return _process_rgb(input_path, output_path)

def _process_rgb(input_path: str, output_path: str) -> dict:
    """
    Processes standard RGB images (JPG, PNG) using Green Leaf Index (GLI):
    GLI = (2 * G - R - B) / (2 * G + R + B)
    """
    img = cv2.imread(input_path)
    if img is None:
        raise ValueError(f"Failed to read image at path: {input_path}")
        
    b = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    r = img[:, :, 2].astype(np.float32)
    
    numerator = 2.0 * g - r - b
    denominator = 2.0 * g + r + b
    denominator[denominator == 0] = 1e-6
    
    gli = numerator / denominator
    gli = np.clip(gli, -1.0, 1.0)
    
    min_val = float(np.min(gli))
    max_val = float(np.max(gli))
    avg_val = float(np.mean(gli))
    
    heatmap_img = _generate_custom_heatmap(gli)
    cv2.imwrite(output_path, heatmap_img)
    
    classification = _classify_health(avg_val)
    histogram = _calculate_histogram(gli)
    
    return {
        "min_val": round(min_val, 4),
        "max_val": round(max_val, 4),
        "avg_val": round(avg_val, 4),
        "classification": classification,
        "heatmap_filename": os.path.basename(output_path),
        "histogram": histogram
    }

def _process_geotiff(input_path: str, output_path: str) -> dict:
    """
    Processes a multi-band GeoTIFF using true NDVI formula.
    """
    with rasterio.open(input_path) as src:
        band_count = src.count
        
        if band_count >= 4:
            red = src.read(3).astype(np.float32)
            nir = src.read(4).astype(np.float32)
            
            denominator = nir + red
            denominator[denominator == 0] = 1e-6
            ndvi = (nir - red) / denominator
            ndvi = np.clip(ndvi, -1.0, 1.0)
        else:
            r = src.read(1).astype(np.float32)
            g = src.read(2).astype(np.float32)
            b = src.read(3).astype(np.float32)
            
            numerator = 2.0 * g - r - b
            denominator = 2.0 * g + r + b
            denominator[denominator == 0] = 1e-6
            ndvi = numerator / denominator
            ndvi = np.clip(ndvi, -1.0, 1.0)
            
        min_val = float(np.nanmin(ndvi))
        max_val = float(np.nanmax(ndvi))
        avg_val = float(np.nanmean(ndvi))
        
        ndvi_clean = np.nan_to_num(ndvi, nan=-1.0)
        heatmap_img = _generate_custom_heatmap(ndvi_clean)
        cv2.imwrite(output_path, heatmap_img)
        
        classification = _classify_health(avg_val)
        histogram = _calculate_histogram(ndvi_clean)
        
        return {
            "min_val": round(min_val, 4),
            "max_val": round(max_val, 4),
            "avg_val": round(avg_val, 4),
            "classification": classification,
            "heatmap_filename": os.path.basename(output_path),
            "histogram": histogram
        }

def process_dual_band_ndvi(red_path: str, nir_path: str, output_heatmap_dir: str) -> dict:
    """
    Computes NDVI pixel-by-pixel from separate Red and NIR band image files.
    NDVI = (NIR - RED) / (NIR + RED)
    """
    red_img = cv2.imread(red_path, cv2.IMREAD_GRAYSCALE)
    nir_img = cv2.imread(nir_path, cv2.IMREAD_GRAYSCALE)
    
    if red_img is None:
        raise ValueError(f"Failed to read Red band image file at: {red_path}")
    if nir_img is None:
        raise ValueError(f"Failed to read NIR band image file at: {nir_path}")
        
    # Resize NIR to match Red if dimensions differ slightly
    if red_img.shape != nir_img.shape:
        nir_img = cv2.resize(nir_img, (red_img.shape[1], red_img.shape[0]))
        
    red_float = red_img.astype(np.float32) / 255.0
    nir_float = nir_img.astype(np.float32) / 255.0
    
    denominator = nir_float + red_float
    denominator[denominator == 0] = 1e-6
    ndvi = (nir_float - red_float) / denominator
    ndvi = np.clip(ndvi, -1.0, 1.0)
    
    min_val = float(np.min(ndvi))
    max_val = float(np.max(ndvi))
    avg_val = float(np.mean(ndvi))
    
    # Generate Heatmap name
    base_name = os.path.basename(red_path)
    name_part, _ = os.path.splitext(base_name)
    heatmap_filename = f"dual_{name_part}_heatmap.jpg"
    output_path = os.path.join(output_heatmap_dir, heatmap_filename)
    
    heatmap_img = _generate_custom_heatmap(ndvi)
    cv2.imwrite(output_path, heatmap_img)
    
    classification = _classify_health(avg_val)
    histogram = _calculate_histogram(ndvi)
    
    return {
        "min_val": round(min_val, 4),
        "max_val": round(max_val, 4),
        "avg_val": round(avg_val, 4),
        "classification": classification,
        "heatmap_filename": heatmap_filename,
        "histogram": histogram
    }

def _generate_custom_heatmap(index_array: np.ndarray) -> np.ndarray:
    """
    Creates a customized high-resolution agricultural colormap for indexing:
    - Values <= 0.0 (Water, Soil, Rock): Dark Orange/Red/Brown
    - Values 0.0 to 0.15 (Sparse/Dead plants): Light Yellow/Beige
    - Values 0.15 to 0.4 (Stressed crop): Pale Green/Yellow-Green
    - Values 0.4 to 1.0 (Healthy crop): Vibrant Green to Dark Green
    """
    height, width = index_array.shape
    heatmap = np.zeros((height, width, 3), dtype=np.uint8)
    
    color_soil = np.array([30, 70, 130])     # Brown/Red-ish (BGR)
    color_stressed = np.array([40, 200, 230]) # Yellow-Orange (BGR)
    color_mild = np.array([100, 220, 150])    # Pale green (BGR)
    color_healthy = np.array([30, 150, 40])    # Pure green (BGR)
    color_dense = np.array([10, 80, 20])      # Dark forest green (BGR)
    
    # Mask 1: Soil/Water/Concrete (index <= 0.0)
    mask_soil = index_array <= 0.0
    val_soil = (index_array[mask_soil] + 1.0)
    val_soil = np.expand_dims(val_soil, axis=-1)
    heatmap[mask_soil] = (color_soil * (1.0 - val_soil) + color_stressed * val_soil).astype(np.uint8)
    
    # Mask 2: Stressed vegetation (0.0 < index <= 0.2)
    mask_stressed = (index_array > 0.0) & (index_array <= 0.2)
    val_stressed = (index_array[mask_stressed] - 0.0) / 0.2
    val_stressed = np.expand_dims(val_stressed, axis=-1)
    heatmap[mask_stressed] = (color_stressed * (1.0 - val_stressed) + color_mild * val_stressed).astype(np.uint8)
    
    # Mask 3: Healthy vegetation (0.2 < index <= 0.5)
    mask_healthy = (index_array > 0.2) & (index_array <= 0.5)
    val_healthy = (index_array[mask_healthy] - 0.2) / 0.3
    val_healthy = np.expand_dims(val_healthy, axis=-1)
    heatmap[mask_healthy] = (color_mild * (1.0 - val_healthy) + color_healthy * val_healthy).astype(np.uint8)
    
    # Mask 4: High density canopy (index > 0.5)
    mask_dense = index_array > 0.5
    val_dense = (index_array[mask_dense] - 0.5) / 0.5
    val_dense = np.clip(val_dense, 0.0, 1.0)
    val_dense = np.expand_dims(val_dense, axis=-1)
    heatmap[mask_dense] = (color_healthy * (1.0 - val_dense) + color_dense * val_dense).astype(np.uint8)
    
    try:
        smoothed = cv2.bilateralFilter(heatmap, 5, 50, 50)
        return smoothed
    except Exception:
        return heatmap

def _classify_health(avg_val: float) -> str:
    if avg_val >= 0.45:
        return "Healthy (Dense Canopy)"
    elif avg_val >= 0.25:
        return "Healthy (Moderate Canopy)"
    elif avg_val >= 0.12:
        return "Moderate Stress"
    else:
        return "Severe Stress"
