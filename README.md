# Crop Growth Monitoring System Using Image Processing Technology

A modern, responsive smart farming precision agriculture dashboard. It integrates GIS mapping, Leaflet.js telemetry, Recharts interactive data visualization, and OpenCV/NumPy spectral analysis proxies (NDVI and GLI) to monitor vegetation health, canopy coverage, crop height, and leaf density index tracking.

---

## 🛠️ Technology Stack

* **Frontend**: React (Vite), Tailwind CSS, Leaflet.js (GIS), Recharts (Analytical Charts), Lucide Icons
* **Backend**: FastAPI (Python 3.11+), OpenCV-headless (Image Processing), NumPy (Numerical Arrays), Rasterio (Multispectral GeoTIFF), SQLAlchemy ORM
* **Database**: MySQL 8.0 (Docker Compose environment) or SQLite (automatic fallback for zero-dependency standalone local launching)
* **Containers**: Docker, Docker Compose

---

## 🚀 How to Launch the Application

You can launch the system using either **Docker Compose** or **locally as standalone processes**.

### Option A: Using Docker Compose (Recommended)
This runs the full stack including the FastAPI backend, React client, and a dedicated MySQL server.

1. Ensure **Docker Desktop** is running on your machine.
2. Open your terminal at the project root directory.
3. Run the following command:
   ```bash
   docker-compose up --build
   ```
4. Once compilation finishes:
   * Access the **Crop Growth Monitoring Dashboard** at: [http://localhost:3000](http://localhost:3000)
   * The **FastAPI API Swagger Documentation** is served at: [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Option B: Standalone Local Launch (No Docker Required)
This setup runs the React client locally, and configures the FastAPI backend to automatically fall back to **SQLite** (creating a local `farming.db` database file) so you don't need to manually configure MySQL.

#### 1. Start the Backend API (FastAPI)
1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Create a Python virtual environment and activate it:
   ```bash
   python -m venv venv
   # On Windows (PowerShell):
   .\venv\Scripts\Activate.ps1
   # On macOS/Linux:
   source venv/bin/activate
   ```
3. Install the dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run the FastAPI development server:
   ```bash
   python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   *Note: Upon startup, the backend automatically creates SQLite database tables and seeds them with realistic crop plot data.*

#### 2. Start the Frontend Client (React)
1. Open a new terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install Node packages:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

---

## 🔬 Image Processing Engine & Spectral Indexing Details

Because standard RGB photos (JPG/PNG) captured by drones or hand-held cameras lack a Near-Infrared (NIR) band, the system uses a dual-engine architecture:

1. **Multispectral GeoTIFF Uploads**: If the uploaded image is a GeoTIFF and contains 4+ bands, the backend uses `rasterio` to calculate **True NDVI**:
   $$\text{NDVI} = \frac{\text{NIR} - \text{Red}}{\text{NIR} + \text{Red}}$$
2. **Standard RGB Photographs**: If a standard image is uploaded, the backend uses `OpenCV` and `NumPy` to calculate the **Green Leaf Index (GLI)**:
   $$\text{GLI} = \frac{2 \times \text{Green} - \text{Red} - \text{Blue}}{2 \times \text{Green} + \text{Red} + \text{Blue}}$$
   GLI acts as a proxy for vegetation greenness, scaling from -1.0 to 1.0 to mirror NDVI metrics.

### Custom Heatmap Rendering
Both indices are mapped onto a custom colormap:
* **Soil/Water/Dry stubble (Index $\leq 0.0$):** Interpolated from Red-Brown to Yellow-Orange.
* **Stressed canopy ($0.0 < \text{Index} \leq 0.2$):** Interpolated from Yellow-Orange to Pale Green.
* **Healthy canopy ($0.2 < \text{Index} \leq 0.5$):** Interpolated from Pale Green to Pure Green.
* **High-density crop canopy ($\text{Index} > 0.5$):** Interpolated from Pure Green to Forest Green.
The image processing engine applies a **bilateral filter** to smooth pixel-level noise while preserving crop row edges.

---

## 📈 System Navigation & Page Features

1. **Dashboard (Precision Agriculture Hub)**: Focuses on quick telemetry cards, interactive Leaflet GIS boundaries (toggling OSM maps vs Google Satellite imagery), Recharts history, recent growth timeline, and drag-and-drop satellite uploads.
2. **Plot Management**: Register agricultural areas, define coordinates, and edit planting information.
3. **Growth Monitoring**: Submit surveyor field notes, track height growth rates (cm), and chart canopy coverage indices.
4. **NDVI Analysis Lab**: Upload images to compare RGB visible-light vs custom vegetation heatmaps side-by-side. Inspect detailed diagnostic advice.
5. **System Reports**: Query historical databases, filter datasets by parameters, print reports, and download raw tabular data as CSV sheets.
