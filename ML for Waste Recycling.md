# **Vision-Only Deep Learning Architectures for Automated Glass Recycling: Industrial Cullet Refinement, Citizen Pre-Sorting, and Web Dashboard Systems**

Modern materials recovery facilities (MRFs) and glass beneficiation plants process high volumes of mixed solid waste to produce high-purity cullet feedstocks for container manufacturing1. Glass represents an infinitely recyclable packaging material that can undergo repeated furnace remelting without structural degradation3. Adding clean post-consumer cullet to raw batch mixtures directly reduces furnace energy consumption: every 10% increase in cullet content lowers furnace operating energy demand by approximately 3%, yielding proportional reductions in carbon emissions3.  
However, closed-loop glass remelting operates under strict chemical, thermal, and optical tolerances4. Achieving high cullet utilization requires resolving critical bottlenecks across two operational environments:

> 1. **Municipal and Household Collection Points:** Improper residential sorting introduces refractory ceramics, heat-resistant cookware, lead crystal tableware, and flat architectural glass into collection bins, causing severe contamination before collection trucks arrive1.  
> 2. **Industrial Sorting Lines:** At the recovery plant, cullet fragmentation, heavy visual clutter, dust accumulation, and variable lighting make it difficult to differentiate refractory contaminants from dark or thick glass fragments2.

Relying exclusively on visible-spectrum computer vision—eliminating near-infrared spectroscopy, chemical sensors, and non-optical hardware—enables a cost-effective, software-driven framework for automated glass recycling8. Using high-speed line-scan RGB cameras, standard industrial area-scan cameras, consumer mobile devices, deep convolutional neural networks, vision transformers, and web-based dashboard platforms, facilities can automate color sorting, reject refractory defects, and guide citizen preprocessing9.

## **Visible-Spectrum Imaging Modalities and Optical Principles for Glass**

A vision-only glass recycling architecture relies entirely on spatial, chromatic, morphological, and textural features captured within the visible electromagnetic spectrum (400 nm to 700 nm)9. The physical behavior of incident light—specifically specular reflection, bulk transmission, refraction, and surface scattering—provides the foundational data used by deep learning models to assess cullet quality6.  
High-speed visible-spectrum line-scan Charge-Coupled Device (CCD) and Complementary Metal-Oxide-Semiconductor (CMOS) sensors capture continuous 1D image slices at line rates exceeding 20 kHz9. These sensors reconstruct high-resolution 2D surface profiles of glass cullet moving across conveyor belts or falling freely down inclined chutes at speeds between 2.5 m/s and 4.0 m/s9.  
Because post-consumer cullet exhibits variable thickness, curvature, and surface cleanliness, imaging accuracy depends on specialized illumination geometries:

* **High-Contrast Optical Backlighting (Transmission Channel):** Positioned directly behind falling cullet streams or beneath translucent chutes, diffused white LED panels illuminate fragments to measure bulk optical transmission8. This transmission channel highlights clear flint glass, captures color saturation profiles in amber and green cullet, and detects fully opaque inclusions6.  
* **45-Degree Surface Specular Illumination (Reflection Channel):** Positioned above the material stream at a 45-degree angle, high-intensity white LED bars project light across cullet surfaces6. Vitrified glass fragments reflect sharp specular highlights along their fractured facets, while non-vitrified ceramic, stone, and porcelain (CSP) particles scatter light diffusely6. Combining transmission and reflection imaging prevents dark, thick glass from being falsely flagged as opaque ceramic6.  
* **Cross-Polarized Lighting Arrays:** Polarizing filters mounted over light sources and camera lenses eliminate blinding external flare caused by wet cullet surfaces, preserving facet details, micro-cracks, and conchoidal edge lines9.  
* **Consumer Mobile Bayer-Filter Cameras:** Residential pre-sorting applications rely on standard consumer smartphone cameras with red, green, and blue Bayer color filter arrays11. Because ambient residential lighting is uncontrolled, client-side vision models must handle varying color temperatures, indoor shadows, and low-contrast backgrounds11.

| Vision Modality | Optical & Illumination Setup | Target Glass Streams & Form Factors | Image Acquisition Latency | Deployment Setting | Primary Optical Failure Mode |
| :---- | :---- | :---- | :---- | :---- | :---- |
| High-Speed RGB Line-Scan | Overhead 4096-pixel linear array \+ high-CRI white LED bars9 | Crushed cullet fragments (10 mm to 50 mm) in free fall4 | 1 to 3 ms per scan block9 | Industrial sorting chutes and conveyor discharge lips9 | Dense airborne glass dust coating optical lenses; fragment overlap9 |
| Dual Transmission / Reflection Array | Diffused backlight \+ 45-degree angled LED specular illuminators6 | Mixed cullet streams; refractory defect separation6 | 2 to 4 ms per frame | Primary cullet purification chutes6 | Heavily soiled cullet with caked dirt simulating ceramic opacity6 |
| Industrial RGB Area-Scan | 2D Global-shutter CMOS camera \+ polarized ring illuminator9 | Whole container bottles, jars, intact cookware4 | 5 to 12 ms per frame | Pre-crush conveyors, intake inspection stations4 | Severe motion blur at belt speeds above 3.0 m/s without strobed illumination |
| Citizen Mobile Camera | Rolling-shutter consumer CMOS (Bayer CFA) via WebRTC11 | Whole jars, drink bottles, bakeware, ceramic mugs4 | 30 to 60 ms per frame | Browser-based progressive web applications11 | Uncontrolled household lighting, background clutter, hand tremor11 |

## **Computer Vision Systems for Glass Cullet Purification and Consumer Pre-Sorting**

In a vision-only sorting architecture, glass cannot be analyzed via chemical bond absorption or elemental fluorescence17. Instead, deep learning models evaluate optical transmission, colorimetry, surface specularity, edge morphology, and intact container geometry6.

### **Industrial Glass Cullet Refinement**

Industrial processing plants separate crushed cullet into uniform color streams while removing refractory and non-soda-lime contaminants4.  
The industrial sorting workflow follows a structured sequence:

> 1. **High-Speed Free-Fall Ingestion:** Crushed cullet passes off the conveyor discharge lip, falling freely past the line-scan optical inspection zone9.  
> 2. **Calibrated Colorimetric Classification:** High-speed line-scan cameras convert raw pixel values into CIE ![][image1] and HSV color coordinates to separate flint, amber, and green cullet14.  
> 3. **CSP Texture & Specularity Analysis:** Convolutional neural networks evaluate edge sharpess, surface specularity, and internal transmission to identify opaque ceramics, stones, and porcelain6.  
> 4. **Pre-Crush Typology Screening:** Overhead area-scan cameras upstream of the crusher identify heat-resistant borosilicate cookware and lead crystal stemware by geometry4.  
> 5. **Targeted Pneumatic Ejection:** High-speed solenoid air valves fire short compressed-air pulses to deflect identified defects over a mechanical splitter plate9.  
* **Cullet Colorimetric Separation:** Container glass furnaces producing flint (colorless) glass require high color purity, tolerating no more than 0.5% amber or green glass to prevent off-color tints in the finished product3. Line-scan cameras measure light transmission across calibrated channels, mapping RGB signals into CIE ![][image1] and HSV color spaces14. Deep convolutional classification layers adjust dynamically for cullet wall thickness, surface dust, and curved geometries, maintaining precise color separation under varying operational conditions8.  
* **Visual Detection of Ceramic, Stone, and Porcelain (CSP):** CSP particles are the most damaging physical contaminants in cullet recycling18. Because they have refractory melting points well above 1800 °C, CSP particles do not dissolve at typical soda-lime furnace melt temperatures (1450 °C to 1500 °C)5. Undissolved ceramic stones remain trapped in container walls as stress concentrators, causing finished bottles to shatter during automated filling or internal carbonation pressurization18. Standard optical sorting configurations often misclassify dark or thick glass as ceramic because little light passes through6. To resolve this, vision-only networks evaluate surface texture and specular reflection:  
  * Vitrified glass surfaces exhibit high specular reflectance and sharp conchoidal fracture ridges6.  
  * Refractory ceramics display diffuse surface scatter, rough or granular face textures, and crumbling, rounded edges6.  
  * The model computes a combined purity score across transmission and reflection channels:

![][image2]  
This scoring enables the system to reject opaque ceramics while retaining thick, dark glass fragments6.

* **Pre-Crush Borosilicate (Pyrex) Identification:** Crushed borosilicate glass (Pyrex bakeware, laboratory containers) visually mimics clear soda-lime flint cullet3. However, borosilicate melts above 1650 °C and has a very low coefficient of thermal expansion3. When mixed into soda-lime furnaces, undissolved borosilicate forms high-viscosity cords—streaks of mismatched glass composition—that create internal stress fractures4. In a vision-only system, borosilicates must be identified and removed *before* crushing4. Overhead area-scan cameras stationed over intake conveyors identify intact items by geometry: measuring cups, casserole handles, rim flanges, and embossed brand logos, routing them off the line before they break into identical-looking cullet4.  
* **Visual Detection of Lead Crystal Tableware:** Lead crystal contains over 24% lead oxide (PbO), which is toxic and leaches into food and drink4. If melted into container glass, lead crystal contaminates entire production runs4. During pre-crush visual inspection, convolutional networks identify lead crystal items by their distinctive decorative features: deep diamond-cut facets, heavy stemware profiles, and rainbow chromatic dispersion along beveled edges4.

### **Citizen Preprocessing and Guidance**

Households often assume all transparent, rigid glass can be placed in curbside recycling bins1. As a result, non-container glass—such as heat-resistant cookware, ceramic mugs, drinking glasses, window glass, and mirrors—routinely enters residential collection systems1.  
The citizen guidance application uses a structured visual decision pipeline:

> 1. **User Capture:** The resident scans an item using their smartphone camera through the web application11.  
> 2. **Form-Factor Classification:** A lightweight convolutional vision network classifies the item's geometric category and surface type11.  
> 3. **Disposal Guidance Routing:**  
   * **Container Glass (Bottles & Jars):** Verified as accepted soda-lime glass. The user is instructed to empty contents and remove metal lids (paper labels can remain, as they combust cleanly in the furnace)4.  
   * **Cookware & Bakeware (Pyrex / Borosilicate):** Flagged as a strict contaminant. The app explains that its high melting temperature ruins furnace batches and routes the item to donation or residual waste4.  
   * **Ceramic Tableware (Plates, Mugs, Porcelain):** Flagged as a non-fusible refractory. The app instructs the user to dispose of it in general household trash4.  
   * **Flat Architectural Glass & Mirrors:** Flagged as chemically incompatible. The app directs the user to local municipal civic drop-off depots1.

| Glass Waste Category | Visual Indicators & Morphological Markers | Melting Point & Chemical Composition | Computer Vision Model Architecture | Recycling Suitability & Citizen Directives |
| :---- | :---- | :---- | :---- | :---- |
| **Soda-Lime Flint (Clear)** | High optical clarity, conchoidal fracture facets, uniform container neck finishes3 | 1450 °C to 1500 °C (72% SiO2, 14% Na2O, 10% CaO)4 | Line-scan RGB Color Classifier8 | Primary clear container stream; keep color contamination below 0.5%3. Instructions: Empty liquids, remove metal closures4. |
| **Soda-Lime Amber (Brown)** | Deep brown/amber hue, consistent wall thickness, amber bottle shoulders4 | 1450 °C to 1500 °C (Iron-sulfur chromophores)4 | Line-scan RGB Color Classifier8 | Accepted in brown container stream; separate completely from flint3. Instructions: Rinse sticky residue4. |
| **Soda-Lime Green** | Translucent green tint, smooth molded sidewalls, wine bottle geometries4 | 1450 °C to 1500 °C (Chromium oxide colorant)4 | Line-scan RGB Color Classifier8 | Accepted in green container stream; separate completely from flint3. Instructions: Remove aluminum foil necks4. |
| **Ceramics, Stone, Porcelain (CSP)** | Opaque matte finish, rough granular surface, crumbling non-vitreous edges6 | \>1800 °C (Refractory alumino-silicates, quartz)5 | Dual-channel YOLOv8-seg surface texture parser6 | Strict defect; eject immediately to prevent bottle failure inclusions18. Directives: Keep out of all recycling bins4. |
| **Borosilicate (Pyrex)** | Thick clear cookware shapes, handles, measuring spouts, embossed logos4 | \>1650 °C (80% SiO2, 13% B2O3, low thermal expansion)3 | Pre-Crush Area-Scan Object Detector4 | Strict contaminant (Zero tolerance); causes cords and fractures4. Directives: Place in general waste or donate4. |
| **Lead Crystal** | Intricate cut-glass patterns, decorative stems, prismatic rainbow sparkle4 | 1350 °C to 1400 °C (\>24% PbO heavy metal content)4 | Pre-Crush ResNet-50 Typology Classifier4 | Prohibited; toxic lead leaches into food containers4. Directives: Divert to general residual waste4. |
| **Architectural / Flat Glass** | Uniform flat sheets, perfectly straight edges, greenish tint on cut edges1 | 1450 °C to 1550 °C (Modified soda-lime formulation)1 | Pre-Crush Area Bounding Network1 | Incompatible viscosity profile; do not mix with container cullet1. Directives: Deliver to civic amenity depots1. |

## **Deep Learning Architectures and High-Speed Industrial Actuation**

Deploying computer vision models on cullet sorting chutes requires handling fragmented items, dust accumulation, fast material speeds, and strict latency limits2. Benchmark datasets like ZeroWaste and TACO highlight the challenges of identifying waste in cluttered, fast-moving environments2.

### **Model Architectures and Edge Benchmarking**

* **YOLOv8-seg (Real-Time Instance Segmentation):** Ultralytics YOLOv8-seg uses an anchor-free, decoupled head that predicts bounding boxes, class labels, and prototype segmentation masks simultaneously22. Compiled with NVIDIA TensorRT (FP16 precision), YOLOv8x-seg processes frames in 6.2 ms on industrial GPUs, providing accurate spatial delineation of overlapping cullet fragments9.  
* **Mask R-CNN (Two-Stage Architectural Benchmark):** While Mask R-CNN achieves good mask quality on cluttered benchmarks like ZeroWaste-f, its two-stage proposal process results in inference times of approximately 28.5 ms, making it too slow for high-speed conveyor lines23. It is better suited for offline quality auditing and training verification24.  
* **MobileNetV4 and YOLOv8-Nano (Citizen Mobile Clients):** Consumer mobile browsers require lightweight architectures that execute efficiently on client hardware10. MobileNetV4-Small runs in sub-millisecond times on modern mobile NPUs and executes smoothly in browser environments using WebAssembly (Wasm) or WebGPU10.

| Model Architecture | Parameter Count | Latency (TensorRT FP16) | ZeroWaste-f mAP (Mask) | Edge Hardware Suitability | Deployment Context |
| :---- | :---- | :---- | :---- | :---- | :---- |
| **Mask R-CNN (ResNet-50)** | 44.2 M | 28.5 ms | 22.8% to 24.5%24 | Low (Exceeds high-speed line timing budgets) | Offline cullet quality assurance and auditing24 |
| **DeepLabV3+ (ResNet-101)** | 59.5 M | 34.1 ms | 21.2 mIoU25 | Moderate (High compute; lacks instance tracking) | Static contamination mapping and density estimation25 |
| **YOLOv8x-seg** | 71.8 M | 6.2 ms | 31.4%22 | High (Industrial GPU: RTX 4090 / Jetson AGX Orin)9 | Real-time pneumatic cullet sorting lines9 |
| **YOLOv8s-seg** | 11.8 M | 2.1 ms | 26.8%23 | Very High (Embedded boards: Jetson Orin Nano)9 | Compact optical chute retrofits9 |
| **MobileNetV4-Small** | 3.8 M | 0.8 ms | Top-1 Class: 78.2% | Exceptional (WebAssembly / WebGPU on smartphones) | Browser-based citizen web dashboard10 |

### **Conveyor Tracking and High-Speed Pneumatic Actuation**

Industrial optical sorters run chutes and conveyors at speeds between 2.5 m/s and 4.0 m/s, processing 3 to 12 tonnes of cullet per hour9. To remove detected contaminants or separate target cullet colors, the vision system must coordinate directly with high-speed pneumatic valve manifolds9.  
The industrial actuation sequence coordinates five key stages:

> 1. **Optical Capture:** High-speed cameras scan cullet fragments 1000 mm to 1500 mm upstream of the ejection line9.  
> 2. **Spatial Localization:** The segmentation model calculates the 2D center-of-mass coordinates ![][image3] for each identified defect or color target9.  
> 3. **Displacement Tracking:** Optical rotary encoders mounted on the conveyor shaft track physical belt movement in real time:

![][image4]

> 4. **Transit Delay Calculation:** The controller computes the exact transit time to the ejection nozzle array:

![][image5]

> 5. **Pneumatic Actuation:** High-speed solenoid valves (128 to 256 individual nozzles spaced 6 mm to 12 mm apart across the chute width, operating at 0.6 to 0.8 MPa pressure) fire short air pulses (2.0 to 5.0 ms duration)9.  
> 6. **Deflection Separation:** The targeted fragment is deflected over an adjustable mechanical splitter plate into a reject hopper, while untargeted cullet falls naturally along its ballistic path into the accepted product stream14.

Miscalibrated actuation timing causes two primary sorting errors:

* **Carryover:** Desirable cullet is accidentally blown into the reject bin, reducing material yield14.  
* **Carry-under:** Ceramic or refractory contaminants escape the air blast and remain in the accepted stream, risking furnace contamination6.

## **Technical Architecture for Glass Recycling Web Dashboards**

Deploying deep learning glass classification requires a decoupled web application architecture that supports high-speed industrial telemetry as well as mobile video streaming for residential users10.  
The platform architecture is organized into five functional tiers:

> 1. **Client Presentation Tier:** Built using React 19, TypeScript, and Vite, featuring responsive layouts for both plant operator consoles and citizen mobile devices12.  
> 2. **API and Streaming Gateway:** An asynchronous application layer built with FastAPI handles request routing, data validation, WebRTC media handshakes, and bidirectional WebSocket telemetry streams10.  
> 3. **Deep Learning Inference Tier:** A microservice running NVIDIA Triton Inference Server or TensorRT execution engines processes image batches and video streams, returning segmentation masks, bounding boxes, and material classes9.  
> 4. **Task Queue and Analytics Engine:** Distributed background workers managed with Celery and Redis handle long-running jobs such as batch reporting, drift detection, and active learning updates10.  
> 5. **Persistence Tier:** A relational database using TimescaleDB extensions stores operational time-series data, valve actuation logs, citizen interaction metrics, and model performance history10.

### **Industrial Operations Dashboard**

The industrial console gives plant operators real-time visibility into high-speed sorting performance, purity metrics, and valve health9.  
The operator interface consists of four primary operational modules:

* **Live Video and Segmentation Visualizer:** Renders low-latency video feeds from line-scan cameras, overlaying colored segmentation masks to display flint, amber, and green cullet along with highlighted defect alerts (e.g., ceramics or borosilicate)8.  
* **Real-Time Stream Purity and Yield Tracking:** Tracks output purity as a running ratio of target materials to total mass flow:

![][image6]

* **Pneumatic Valve Performance Heatmap:** Displays actuation cycles across all individual pneumatic nozzles, helping technicians quickly identify clogged air jets, uneven belt loading, or localized camera issues9.  
* **Critical Contaminant Alerting:** Flags urgent hazards—such as intact Pyrex cookware, large porcelain fragments, or lead crystal tableware—and can automatically pause or slow upstream conveyors to prevent downstream damage4.  
* **Active Learning Queue:** Automatically collects low-confidence detections (![][image7]) for operator verification, enabling regular model retraining to resolve distribution drift11.

### **Citizen Preprocessing and Guidance Dashboard**

The citizen dashboard is designed as a mobile-optimized Progressive Web Application (PWA) that provides simple, interactive recycling instructions11.  
The mobile interface is organized into five functional user components:

* **Live Device Camera Viewport:** Ingests the smartphone camera feed via the browser's navigator.mediaDevices.getUserMedia API, rendering detection boxes and instructions directly onto an HTML5 Canvas12.  
* **Item Classification Banner:** Displays the identified object category (such as soda-lime container jar, ceramic mug, or Pyrex baking dish) along with model confidence scores11.  
* **Step-by-Step Preparation Directives:** Breaks down proper glass preparation into numbered actions, such as removing steel caps, rinsing food residues, or diverting non-fusible cookware to general trash4.  
* **Geolocation-Based Municipal Rules Engine:** Uses the browser's Geolocation API to look up local recycling guidelines, automatically tailoring bin recommendations and sorting rules to regional waste collection policies (e.g., single-stream, separate glass bin, or color-separated bottle bank)1.  
* **Civic Impact Tracking and Gamification:** Tracks personal sorting accuracy, logging cumulative kilograms of glass diverted from landfills and awarding points to encourage sustained participation11.

### **Backend API and Streaming Protocols**

Communication between client interfaces and the backend infrastructure combines REST endpoints for atomic transactions with WebSocket connections for continuous data streams10.  
The client-server communication workflow operates as follows:

> 1. **Rule Query:** The client requests local municipal sorting policies via an HTTP GET request to /api/v1/municipal/rules.  
> 2. **Video Streaming Handshake:** The client initiates a WebSocket connection at /api/v1/stream/classify for real-time camera inspection.  
> 3. **Inference Execution:** The backend processes incoming frames through TensorRT engines, returning bounding coordinates, class labels, and prep directives within 35 ms.  
> 4. **Industrial Telemetry:** Sorter hardware streams belt speed and valve performance to /api/v1/industrial/telemetry, updating dashboard charts and heatmaps in real time.

| Endpoint Path | Network Protocol | Request Payload | Response Structure | Target Latency | Functional Purpose |
| :---- | :---- | :---- | :---- | :---- | :---- |
| /api/v1/classify/image | HTTP POST (Multipart) | image\_file: UploadFile, metadata: JSON \[cite: 12\] | predictions: List\[{class, score, bbox, prep\_steps}\] \[cite: 12\] | \<100 ms | Citizen single-image analysis and prep advice11 |
| /api/v1/stream/classify | WebSocket (WSS Binary) | Compressed video frames (WebP / JPEG @ 15-30 FPS) | stream\_tracks: \[{track\_id, class, mask, steps}\] | \<35 ms | Real-time browser object detection and canvas overlay11 |
| /api/v1/industrial/telemetry | WebSocket (WSS JSON) | {line\_id: int, encoder\_tick: int, belt\_vel: float} \[cite: 9\] | {purity: float, mass\_flow: float, valve\_stats: \[\]} | \<10 ms | Industrial cullet sorting metrics and line monitoring9 |
| /api/v1/industrial/control | HTTP POST (JSON) | {line\_id: int, target\_thresholds: Dict\[str, float\]} | {status: "updated", active\_profile: str} | \<20 ms | Pneumatic sensitivity and ejection timing calibration9 |
| /api/v1/municipal/rules | HTTP GET | Query parameters: postal\_code: str, family: str | {accepted: bool, target\_bin: str, local\_notes: \[\]} | \<15 ms | Local municipal waste rule lookups1 |

### **Database Schemas and Data Models**

The persistence layer uses PostgreSQL with TimescaleDB extensions to store both relational operational records and high-frequency time-series telemetry10.

SQL  
\-- Table: Glass Material Specifications & Defect Categories  
CREATE TABLE glass\_material\_classes (  
    id SERIAL PRIMARY KEY,  
    material\_family VARCHAR(32) NOT NULL DEFAULT 'GLASS',  
    sub\_category VARCHAR(64) NOT NULL,          \-- 'FLINT\_CULLET', 'AMBER\_CULLET', 'GREEN\_CULLET', 'CSP\_CERAMIC', 'BOROSILICATE\_PYREX', 'LEAD\_CRYSTAL', 'FLAT\_GLASS'  
    melting\_point\_celsius INT NOT NULL,         \-- e.g., 1450 for soda-lime, 1650 for borosilicate, 1800 for ceramic  
    is\_furnace\_compatible BOOLEAN NOT NULL,  
    max\_tolerated\_ppm INT NOT NULL,             \-- Maximum permissible contamination threshold in furnace feed  
    furnace\_impact\_notes TEXT  
);

\-- Table: High-Frequency Industrial Sorter Telemetry (TimescaleDB Hypertable)  
CREATE TABLE cullet\_line\_telemetry (  
    recorded\_at TIMESTAMPTZ NOT NULL,  
    line\_id INT NOT NULL,  
    belt\_speed\_mps NUMERIC(4, 2) NOT NULL,  
    cullet\_mass\_flow\_tph NUMERIC(5, 2) NOT NULL,  
    purity\_percentage NUMERIC(5, 2) NOT NULL,  
    csp\_reject\_count INT NOT NULL,  
    carryover\_ratio NUMERIC(4, 3) NOT NULL  
);  
SELECT create\_hypertable('cullet\_line\_telemetry', 'recorded\_at');

\-- Table: Pneumatic Solenoid Valve Actuation Metrics  
CREATE TABLE valve\_actuation\_events (  
    recorded\_at TIMESTAMPTZ NOT NULL,  
    line\_id INT NOT NULL,  
    valve\_index INT NOT NULL,                  \-- Valve position across chute (1 to 256\)  
    actuation\_duration\_ms NUMERIC(4, 2) NOT NULL,  
    target\_class\_id INT REFERENCES glass\_material\_classes(id)  
);  
SELECT create\_hypertable('valve\_actuation\_events', 'recorded\_at');

\-- Table: Citizen Scanning Activity & Preprocessing History  
CREATE TABLE citizen\_glass\_scan\_logs (  
    id UUID PRIMARY KEY DEFAULT gen\_random\_uuid(),  
    scanned\_at TIMESTAMPTZ DEFAULT NOW(),  
    postal\_code VARCHAR(16) NOT NULL,  
    detected\_class\_id INT REFERENCES glass\_material\_classes(id),  
    confidence\_score NUMERIC(4, 3) NOT NULL,  
    is\_compatible\_container BOOLEAN NOT NULL,  
    prep\_directives\_completed BOOLEAN DEFAULT FALSE,  
    session\_latency\_ms INT NOT NULL  
);

### **Full-Stack Implementation Roadmap**

Deploying the vision-based glass recycling platform proceeds across four sequential development phases:

> 1. **Phase 1: Dataset Engineering and Model Training (Months 1 to 3\)**  
   * Collect and label high-resolution RGB imagery of glass cullet (flint, amber, green), refractory ceramics, Pyrex bakeware, and lead crystal2.  
   * Augment training datasets with synthetic lighting variations, dust occlusions, surface wetness, and chipping artifacts11.  
   * Train YOLOv8-seg models for fine-grained cullet instance segmentation and ResNet backbones for pre-crush container typology12.  
> 2. **Phase 2: Actuation Calibration and Hardware Integration (Months 4 to 6\)**  
   * Export trained vision backbones to TensorRT FP16 execution engines to achieve inference latencies under 7 ms9.  
   * Connect the vision pipeline to industrial conveyor hardware, synchronizing camera frame triggers, rotary encoder tracking, and programmable logic controllers (PLCs) driving the 256-nozzle pneumatic valve array9.  
> 3. **Phase 3: Web Dashboard and Backend Microservices (Months 7 to 9\)**  
   * Implement the FastAPI application gateway alongside dedicated Triton inference containers10.  
   * Build the industrial operator dashboard (using React, TypeScript, and WebSocket feeds) with live segmentation overlays, purity charts, and valve heatmaps10.  
   * Build the citizen-facing PWA with WebRTC camera ingestion, client-side inference using ONNX Runtime Web, and step-by-step preparation guidance11.  
> 4. **Phase 4: Field Validation and Active Learning Integration (Months 10 to 12\)**  
   * Deploy the system on an active cullet sorting line, tuning air-valve pulse timings and splitter plate positions to maintain purity above 99%8.  
   * Launch the citizen web application in a pilot municipal collection area, tracking reductions in curbside non-container glass contamination1.  
   * Deploy an automated active learning pipeline to capture low-confidence detections, retrain models, and deploy updated weights without operational downtime11.

## **Vision-Only Operational Trade-Offs and Engineering Recommendations**

Relying exclusively on visible-spectrum computer vision provides an accessible, low-cost sorting solution, but introduces specific operational constraints compared to multi-sensor setups6:

* **Pre-Crush Screening for Critical Contaminants:** Computer vision models achieve their highest accuracy when inspecting whole, intact glassware4. Once items are crushed into uniform 15 mm cullet, distinguishing clear borosilicate bakeware from clear soda-lime flint cullet becomes exceptionally difficult3. Facilities should position area-scan cameras upstream of mechanical crushers to identify and divert heat-resistant cookware and lead crystal before fragmentation takes place4.  
* **Optics Maintenance in High-Dust Environments:** Glass crushing produces fine silica and cullet dust that settles on camera lenses and LED illumination arrays9. Optical sorters must be equipped with automatic high-pressure air-knife blast systems that clean camera windows and illumination diffusers at regular intervals, preventing optical degradation and false ejections9.  
* **Edge Deployment for Citizen Dashboards:** For mobile web applications, models should run locally on client devices via ONNX WebAssembly or WebGPU whenever feasible10. Running inference directly in the mobile browser eliminates video streaming bandwidth, lowers backend cloud costs, and provides immediate visual feedback to the resident11.

#### **Works cited**

> 1. Exploring glass recycling: Trends, technologies, and future trajectories, [https\://www\.eeer.org/journal/view.php?number=1614](https://www.eeer.org/journal/view.php?number=1614)  
> 2. ZeroWaste Dataset | PDF | Image Segmentation | Recycling \- Scribd, [https\://www\.scribd.com/document/990510316/ZeroWaste-Dataset](https://www.scribd.com/document/990510316/ZeroWaste-Dataset)  
> 3. Packaging Glasses: From Containers to Encapsulation Composition, [https\://pmc.ncbi.nlm.nih.gov/articles/PMC12897758/](https://pmc.ncbi.nlm.nih.gov/articles/PMC12897758/)  
> 4. Glass Recycling Technologies Handbook | PDF \- Scribd, [https\://www\.scribd.com/document/87097041/Glass-Recycling-Technology-Handbook-27105217536](https://www.scribd.com/document/87097041/Glass-Recycling-Technology-Handbook-27105217536)  
> 5. Recycling technologies and applications of borosilicate glasses, [https\://digital.csic.es/bitstream/10261/429487/1/gorni-et-al-2026-recycling-technologies-and-applications-of-borosilicate-glasses.pdf](https://digital.csic.es/bitstream/10261/429487/1/gorni-et-al-2026-recycling-technologies-and-applications-of-borosilicate-glasses.pdf)  
> 6. New sorting tech pushes glass recycling to the next level, [https\://recyclinginternational.com/business/new-sorting-tech-pushes-glass-recycling-to-the-next-level/30790/](https://recyclinginternational.com/business/new-sorting-tech-pushes-glass-recycling-to-the-next-level/30790/)  
> 7. Sorting Solutions for Glass Recycling and Processing \- Redwave, [https\://redwave.com/en/loesungen/recycling/glass](https://redwave.com/en/loesungen/recycling/glass)  
> 8. How to sort glass for recycling? 4 essential rules\! \- Meyer Europe, [https\://meyer-corp.eu/article/how-to-sort-glass-for-recycling-4-essential-rules/](https://meyer-corp.eu/article/how-to-sort-glass-for-recycling-4-essential-rules/)  
> 9. Optical Sorter \- MSW Technology Group \- AI Sorting Machine, [https\://www\.aisortingmachine.com/sorting-machine/sensor-based-sorting-machine/optical-sorter](https://www.aisortingmachine.com/sorting-machine/sensor-based-sorting-machine/optical-sorter)  
> 10. GitHub \- RishvinReddy/EcoBin-Smart-Waste-Management-System, [https\://github.com/RishvinReddy/EcoBin-Smart-Waste-Management-System](https://github.com/RishvinReddy/EcoBin-Smart-Waste-Management-System)  
> 11. SMART WASTE MANAGEMENT PLATFORM \- IRJMETS, [https\://www\.irjmets.com/upload\_newfiles/irjmets71100094995/paper\_file/irjmets71100094995.pdf](https://www.irjmets.com/upload_newfiles/irjmets71100094995/paper_file/irjmets71100094995.pdf)  
> 12. An IoT-Ready, AI-Augmented Smart Waste Management Framework, [https\://www\.ijert.org/an-iot-ready-ai-augmented-smart-waste-management-framework-integrating-citizen-grievance-redressal-image-based-waste-classification-and-retrieval-augmented-conversational-assistance-ijertv15is070538](https://www.ijert.org/an-iot-ready-ai-augmented-smart-waste-management-framework-integrating-citizen-grievance-redressal-image-based-waste-classification-and-retrieval-augmented-conversational-assistance-ijertv15is070538)  
> 13. Reiling: Glass Recycling & CSP Removal with MSort \- steinert, [https\://steinertglobal.com/showcases/reiling/](https://steinertglobal.com/showcases/reiling/)  
> 14. Cashew Color Sorter (CCD Optical) | TTQ Co. Ltd., [https\://cashewplus.com/cashew-nut-color-sorter/](https://cashewplus.com/cashew-nut-color-sorter/)  
> 15. How Do Optical Sorting Machines Improve Glass Separation and, [https\://www\.apexitec.com/how-do-optical-sorting-machines-improve-glass-separation-and-recycling/](https://www.apexitec.com/how-do-optical-sorting-machines-improve-glass-separation-and-recycling/)  
> 16. Products \- Bits Infinity Services Pvt Ltd ,Coimbatore, India, [https\://bitscolorsorter.com/products-detail.php?product\_id=MzY0Njc1](https://bitscolorsorter.com/products-detail.php?product_id=MzY0Njc1)  
> 17. Decarbonizing the glass industry: A critical and systematic review of, [https\://pureadmin.qub.ac.uk/ws/files/288308009/Decarbonizing\_the\_glass\_industry\_FV\_22092021.pdf](https://pureadmin.qub.ac.uk/ws/files/288308009/Decarbonizing_the_glass_industry_FV_22092021.pdf)  
> 18. CSP (ceramic, stone, and porcelain) waste as raw material and as an, [https\://www\.researchgate.net/figure/CSP-ceramic-stone-and-porcelain-waste-as-raw-material-and-as-an-alkali-activated\_fig1\_350916833](https://www.researchgate.net/figure/CSP-ceramic-stone-and-porcelain-waste-as-raw-material-and-as-an-alkali-activated_fig1_350916833)  
> 19. The problems caused by ceramics in glass sorting \- YouTube, [https\://www\.youtube.com/watch?v=5BQ\_C5Kw-nA](https://www.youtube.com/watch?v=5BQ_C5Kw-nA)  
> 20. Stones and Cord in Glass | PDF \- Scribd, [https\://www\.scribd.com/document/1024417955/Stones-and-Cord-in-Glass](https://www.scribd.com/document/1024417955/Stones-and-Cord-in-Glass)  
> 21. A Large-Scale, Integrated Dataset for Robust Waste Classification, [https\://arxiv.org/pdf/2602.07463](https://arxiv.org/pdf/2602.07463)  
> 22. YOLOv8 vs Mask R-CNN: In-depth Analysis and Comparison, [https\://www\.labelvisor.com/yolov8-vs-mask-r-cnn-in-depth-analysis-and-comparison/](https://www.labelvisor.com/yolov8-vs-mask-r-cnn-in-depth-analysis-and-comparison/)  
> 23. Comparing YOLOv8 and Mask R-CNN for instance segmentation in, [https\://arxiv.org/abs/2312.07935](https://arxiv.org/abs/2312.07935)  
> 24. Object detection for waste management: a comparative review of, [https\://beei.org/index.php/EEI/article/download/10696/4768](https://beei.org/index.php/EEI/article/download/10696/4768)  
> 25. \[CVPR 2022\] ZeroWaste: Towards Deformable Object Segmentation, [https\://github.com/dbash/zerowaste/](https://github.com/dbash/zerowaste/)  
> 26. Rice Color Sorter Machine: Complete Guide to Technology, [https\://www\.jcsorter.com/industry-news/rice-color-sorter-machine-complete-guide-to-technology-selection-roi.html](https://www.jcsorter.com/industry-news/rice-color-sorter-machine-complete-guide-to-technology-selection-roi.html)  
> 27. Waste Collection Management System with Express.js REST API, [https\://codecanyon.net/item/trashsync-waste-collection-management-system-with-expressjs-rest-api-react-js/59208245](https://codecanyon.net/item/trashsync-waste-collection-management-system-with-expressjs-rest-api-react-js/59208245)  
> 28. development of an iot-based smart waste management web, [https\://engrxiv.org/preprint/download/7941/12885](https://engrxiv.org/preprint/download/7941/12885)  
> 29. Building EcoSort: A Full-Stack Smart Waste Management System, [https\://medium.com/@baidpankaj567/building-ecosort-a-full-stack-smart-waste-management-system-with-node-js-df0b9e541d36](https://medium.com/@baidpankaj567/building-ecosort-a-full-stack-smart-waste-management-system-with-node-js-df0b9e541d36)  
> 30. a Recycled Waste Sorting System With Arduino and FastAPI : 7 Steps, [https\://www\.instructables.com/Smart-Bin-a-Recycled-Waste-Sorting-System-With-Ard/](https://www.instructables.com/Smart-Bin-a-Recycled-Waste-Sorting-System-With-Ard/)

[image1]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADoAAAAaCAYAAADmF08eAAACn0lEQVR4Xu2XS6hNURjHP3lE5HU9EomSKOUWGUhJyaOQMpLJnZkrlAxEN2VggCKRKEkZGFCKwS0TRWYmHoXEQDIyQB7/X2svZ+3v7L3POqfIYP/q1z13fXt9d+21vrXWuWYtLS1/kWlynhzvA4OySX6UvxK/yftyKHkuskae9Y0DQA5yedbLDxbG8VjOKof/UNe/J5fkT7nNBwqWyStyqzwoR+SR9IFM6DMij8qNFnKSO2WOfFbExrlYTv9amDVm77VcWA6VWCqvyzdyr5xYDmdBH/qSg1zk9LBSX+Q+H7C8/rWslJ/kLTnBxSJz5UV5TZ63UNq7S0/kQR/6koNc5CR3yn4LL1pVmjn9a2Hm2BOHfSBhqlwh11rYH9Pl8tITHWbILRbivvRooy85yEVOckd4nnKkwijJnXJ10Q69+jdyRn6XG3ygggVyh28soKwOyUcWJu+0fCqfy/nJc0AOcnni/mRFb1rIc8/CCqZbpa5/LXF/vrLuwfQDM85LvpBLiraYe8zCdZFD3J+UZHwxVrWulLPptT8nWd6hEwd4LGlj4phAKiYXVtC/FC/K1uLnwMT9ecAHLKzScbnKByqoKn8+f5W7krYm4v6kdCnhyKiFMW5P2vqG+9MPMMJhcFlO8QEHZTlm3QNk8qgWqiaHmIdrIx4+k+Vd+c76vEpSmu5PypV9UnWXeeIAH1jnBGQbsB0eytnylFxcxOqIedLTn2r6LE9Y9wmeTdxXfn9ymvGSby1vFhnAOSsfOnvkD3nVQo4LFlanCcZww0KpQpxsJpArq282y/fW+W7LgCgN5HNs549WHVBVLLKwekzabXnSwte0l/KOXNd5tJFh+cTClwHyMQYq4r+C/zT4jyO9Sma633OoytPS0tLS0tLyD/kNXICGnYIHfVMAAAAASUVORK5CYII=>

[image2]: <data:image/png;base64,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>

[image3]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADsAAAAaCAYAAAAJ1SQgAAADVElEQVR4Xu2XWahNURjHP6GMyZAhUyQyFGWIKC8UMsWLIg+GpJAHQ+ThljxQIhQPIkoIIZGiHJFEKQ+GDHVJ5FVRlOH/s9a+Z51l73P2PfflnJxf/dr37rX22mv41rfXMWvwf9FNdopv1ig9ZMf4Zl4myJPmGqkHpsgzVkV/B8k7cmxcUOOskMesFSvcTh6UTdH9eqCzvCaXxAVZjJMv/bUeWSYfWM5w3i6vW/0kppjh8o2cERfEMEAGujMuCBgs5/sr9JZz5YCWGm2DdmmPdkPoG1+HSnSVt638GP5Ch9/JBXGBub28WR6VK+VzuU+eltvkazmqpXZ1sNdOyb3yqRUHzEAvy/Oyvb9XDtogM9PnTCbKz5YeArPlLis2QIMf5Ghz0fDV3PPV0leeMDdAttJHOdSXEZqfLMdqeXi+YBUigc6+99eYTXKk/zsJlYuyg5wuF1nprJMg1vtrHibJNebqP5RnzbUNs+QPfwU+LWvNfSLTYLCPZc+4IKTcYEOSmabRLMbLI1ZhdlOYJr+Zy6oJe8xFUTI4rsctO0/Qr7eyX1wQknewC+V3Sw/3tkJHmUgmFJIoas0XIlcY8wL2CtkwhH26ytzphAYOyWY50Jez3w7ILr7uYnnD3JEzhPCjbrkTDrmgYMWOJlHE6gITfNX+7WMIdZkgJiqTPvKZXBfdJxwICzIkGfeJFTvE4LbK5b4uCYuOkEya/L2E/fJ3yv0QwrNgxbbJ9D/N7VcmiiPhUsvOzDxDJmZBykJFDv9xRVaCGecodlNuNJcASFCX5A5fB+jQEHMrG4c5n65f5mY9K8RIVOxP2r5iLjE1m4uiXrK/uT4mkxtDUnpkbqtVhMRA5TiTMYsMJNk38f8hJJlblp6JiZ7Dlh5itNnd3MQRTSSggpVm5mHyvr+mwbtfWHZ5CXznaGxOXNAKiAySxDz794xNZwjNGAbDgeWLuUwOrA7fb77xCWwxVpZ2Zgb3gcjc7S17oAjhJRfM/YqoBvYmq0e4hy8ldDk4pP10TLIu7yUiJstXcoOVtrFanjO3deL+jTDXRnIYyUWSdDD3DAXwDOEYP0vyilcjhLK78p65/TqmtLgF2o6TE6HPiuf+eRfCw1vk1LigRuFE1Zat16BBgxrlD6kfiLTV2oHEAAAAAElFTkSuQmCC>

[image4]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAAxCAYAAABnGvUlAAADCElEQVR4Xu3dv6tXdRgH8CfIMDQKhERUhNQpB8EKRBQHBUNwiAzDpv6EFsFBdHB0MrcQ1CFSB8EfBToILSKuEZSDRdQQNDRVEPU8fs7hHs/93utw9Xuv+nrBm+85n3M553vu9PB8Pp97IwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAgGfNxszR8eAL4N3MsvEgAMBS9Fvmv8yb4wvPsb2ZvzJXM6+OrvVujgcAABbD25lVmX2Zu6Nrz7Pz0bprVaheHF0r6zInx4MAANP2UuZEd1xdpipextZHK+h6ywfHC/V+zNz7vWjfZxqqUNvZHX+f+XtwrazJHMwcClOmAMAiO5b5ZHB+O1qR0qsp0iqofs1syLwVbfp07OPMz3PkXmbTzI8+VPc9mzme+SlaofZHZtvgZ56mLwbHVZD+mNk+GKui9Hr3CQCwqKooGa5bq2LtdmZld/5O5vXMl5mXM3sy/3TXFqLuW0XenWj3Ll9ldkR7/lx2Zc6NByeo73wlZt5jrH9m73g8WsTVdOgvg3MAgEVRnaXV48Fo06LfDM6PROuslVvRiryx6kTVNOKk1DPmmlasbl1/70+7zyq05tMXbPOtL6uO3bir16su3qRNBvXe/ZRs7Zid1EkEAJiq72L29GWlOmhVvPRFTXWeqlNVxcy/0bpsT8q3mdcyHwzGagq11CaINzJnuvPT0b5DX7A9rrCbZEvm95j9zpV6t8+jPaN+N1UQ1vea1ro6AIBZqiibL/VnL0pNX16OViA9yKztxp+EWjv2debUYKwvxKo791HmfubDzI1oheNCCrYqyMbvOUwVc7VrtjZi1HP7DRkAAEtWrVv7szs+EDNF3NN0rfusbtjmaIVa2Z95JR4t2HbH9DYqAAAsSSsyl6L9R4AfYjrTgxcyh6Otlyu1Fu2zaMXi1mhdsFpjVl25Gp9rYwEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAsEf8Dllx1JVqwJRYAAAAASUVORK5CYII=>

[image5]: <data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAmwAAAA/CAYAAABdEJRVAAAEMklEQVR4Xu3dTaimYxgH8EsiM2h8ZRILyZSvBfmcQs3CApFkQSkLyscsSMkkdDbSIN8WpAaTEDEiyljMYsqCZDFW1JykrBChrLiuue+n856H92y8Z84Z8/vVv+fjft53fXXfz309EQAAAAAAAAAAAAAAAAAAAAAAAAAAAADAijk0c+L4JgAAq8PazF89AACsUu9kdo1vAgCw8tZlzs/8mbl2NAYAwAp7MPN55uXMj5kzFw8DALCSNmbm+vnJmWcXhvapIu6afr4lc9jEGAAA+0EVaJf28zqOl0OPioWCbXtmzcRYOTqzeXQPAIAZqWJsV+bIfl0bDo7LPNbv1VLpXLSC7dTMi/3+w5m3MpsyezJ7M1dmrss8mbkz2kzcfZkbMs9kLo7m8syb0f67/msu/jmrBwDAhFOiFWo7ohVRH2YuynydOS0Wz7DVM3X9W+bqaD3bauzVPl7WZ17P3B///ttH+nX5Ntpzw7MAAExRjXKHgmk4fpU5qV+Pi67zMvOZO/pYFWwbMi/0TBZh498+0K/LfLSdqQAAK6J2XV42vnkAqSXOT6PNiH2WuSrzU+ahaBsRns5cEW1H6e5oy6PvZx7vqRm6evaTzPXRZuXqemvmtmiF2+mZnf0cAGC/+z+0x6glz8rYIbH4/uTO0WMmzqcZL3/aeQoA7Ff1DtfZmW3RlhQBAFiFbo/Zz67V7sqfxzcnfJH5bonctPAoAMDBrZYLa5fksRP36v2uWRhe4J+V4UPvqy0AAMvqwswfE9d3RXvxvnqR3RrtRf73+lj1LaveZtW37NzMS/2ZerZSfcpeiYU+ZUsVbLXTs5Zgp2X83hgAwEGrlkN/7efDMuRQaNXL9VWs3RKtGPs42ozcc338y2h90WqX5RnRWmSUm/tzSxVs1RetmtROy6yXaAEADlj1eacfojWjreKrVKFVXxAoQ5PZKt6qIDs+Ws+ycmPmo8wl/Xq+HwdLFWwAAPwH72buiTb7VsVcLXuui9a3rJZDa0atjjWL9nz/Tak+ZfdG61NWS6a1tKpnGQDAMqjlz2m9xo4YXR8+uq7CbtpvAQBgn2opMnxCqhrmnjAxBgDACqsZvrsz3/Tr+mRVfZoKAIBVojZE1GaIyVYlWzK/xPQPt6/NvBbTxwEAmLHaKFEfgS9roi2J7oilC7Lq+1bj52SeGo0BADBjv8dCS5GN/fhBtB2s2zNn9XvbMm9E2+06FGx7MnujLaUCALBMtma+z+zMXNDvTc6wVW+5moEbmvRWcTcUbHU+9J4DAGAZVQE22V5kXLCNNyKMC7YNi4cBAFhu9d3TJ/rx0WjtPt6O9tmt9dEa/Faj3/ok1u7MpvYzAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWC5/A7nbttJaQFp7AAAAAElFTkSuQmCC>

[image6]: <data:image/png;base64,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>

[image7]: <data:image/png;base64,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>