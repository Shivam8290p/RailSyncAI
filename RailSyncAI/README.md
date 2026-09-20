# RAIL-BLOCK AI
### AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways
**Problem Statement ID:** SIH26027 | **Ministry:** Ministry of Railways | **Theme:** Transportation & Logistics

---

## 1. Project Overview & System Features
**RAIL-BLOCK AI** is a state-of-the-art decision-support system designed to automate maintenance block scheduling and train regulation on high-density corridors of Indian Railways. 

Currently, block planning (suspending traffic on a section for track, signaling, or electrical maintenance) is done manually and in silos, leading to severe train delays and under-utilized maintenance machinery. RAIL-BLOCK AI resolves these issues by using **Mixed-Integer Linear Programming (MILP)**, **Graph Neural Networks (GNNs)**, and **Deep Reinforcement Learning (DRL)** to generate conflict-free, integrated block schedules.

### Key Capabilities:
* **Interactive Time-Space String Chart:** A digital twin visualizer rendering train paths and maintenance windows on a 2D coordinate grid (Stations vs. Time).
* **Multi-Department Integrated Block Coordinator (IBC):** A clustering algorithm that automatically combines spatial-temporally overlapping requests (e.g., Track Tamping and OHE Wire repairs on the same section) into a single block window, saving line downtime.
* **Intelligent Train Regulation & Conflict Resolution:** Computes loop line stopping, rerouting, and deceleration profiles to let trains pass around active maintenance zones with minimal delay.
* **Real-time Rescheduling Agent:** Adjusts schedules dynamically in milliseconds when live train tracking indicates deviations (late runs).

---

## 2. System Architecture & Tech Stack

```
                                  +-----------------------+
                                  |   HTML5/CSS3/JS SPA   |  <--- (Frontend Presentation)
                                  +-----------+-----------+
                                              | (REST / WebSockets)
                                              v
                                  +-----------+-----------+
                                  |   FastAPI Web Server  |  <--- (Application Logic Layer)
                                  +-----------+-----------+
                                              |
                     +------------------------+------------------------+
                     v                                                 v
         +-----------+-----------+                         +-----------+-----------+
         | Google OR-Tools Solver|  <--- (Backend MILP)    | PyTorch AI Model Hub  | <--- (GNNs & RL Agents)
         +-----------------------+                         +-----------------------+
```

### Technical Stack:
* **Frontend:** Single Page Application built with HTML5, CSS3 (Glassmorphism design system), and Vanilla JS. It uses a high-performance **SVG rendering engine** to plot the time-space diagram dynamically.
* **Backend:** FastAPI (Python) for asynchronous RESTful services, routing, and data aggregation.
* **Database:** PostgreSQL (with PostGIS for GIS rail-line geometry) and MongoDB (for historical block requests and scheduling logs).
* **Core Optimization:** Google OR-Tools (CP-SAT Solver) for scheduling optimization.
* **AI Subsystems:** PyTorch, Stable-Baselines3, DGL (Deep Graph Library).

---

## 3. Subsystem Architecture

### 3.1 Frontend Subsystem (Presentation Layer)
The frontend serves as the terminal for Divisional Traffic Controllers and Departmental Engineers.
* **State Machine (`app.js`):** Maintains the current state of train schedules (WTT) and maintenance blocks. It switches between the **Siloed State** (showing overlapping block requests causing cascading train delays) and the **Optimized State** (showing consolidated blocks and resolved train lines).
* **Grid Rendering Engine:** Dynamically maps time strings (`HH:MM`) into coordinate offsets on the X-axis and railway stations to vertical coordinate offsets on the Y-axis.
* **Event Dispatcher:** Allows users to hover over train lines and block zones to retrieve details on schedule, current delay, machinery (e.g., *Tamping Machine CSM-49*), and section codes.
* **Live System Logs:** Prints process updates in a terminal console mockup, reflecting solver metrics and optimization status (e.g., DBSCAN parameters, constraints solved).

### 3.2 Backend Subsystem (Mathematical Optimization Solver)
The backend manages data ingestion and runs the optimization models.
* **Data Ingestion Bus:** Establishes data bridges to Indian Railways' **COA (Control Office Application)** for live train status and **BDMS (Block and Disconnection Management System)** for maintenance logging.
* **Integrated Block Coordinator (IBC):** Uses a DBSCAN-based clustering algorithm. By grouping requests along spatial dimensions (station sections) and temporal dimensions (requested start/end times), it automatically forms **Integrated Blocks**.
* **Mixed-Integer Linear Programming (MILP):** Solves the resource-constrained project scheduling problem (RCPSP) to minimize cumulative train delays and maintenance cost penalties.

$$Z_{\text{penalty}} = w_1 \sum \text{Delay}_{\text{trains}} + w_2 \sum \text{Deferred}_{\text{blocks}}$$

### 3.3 AI Subsystem (Predictive & Adaptive Control)
The AI engine enhances the optimization model to handle real-world uncertainty:
* **GNN Delay Propagation Network:** Models the railway network as a dynamic graph. Stations are represented as nodes, and tracks as edges. A **Spatio-Temporal Graph Convolutional Network (ST-GCN)** predicts how a block on a particular section will propagate secondary delays across the entire division over the next 6 hours. This output feeds into the solver's objective function.
* **Reinforcement Learning Rescheduling Agent:** When live train coordinates deviate from schedules, the pre-trained **Proximal Policy Optimization (PPO)** agent executes rescheduling policies (regulating trains at loop lines, rerouting, or shifting block starts) in milliseconds, bypassing the slower mathematical solver for real-time control.

---

## 4. Run Locally

### 4.1 Prerequisites
* Python 3.8 or higher.
* A web browser (Chrome, Firefox, Safari).

### 4.2 Step-by-Step Launch
1. Clone this repository:
   ```bash
   git clone https://github.com/tripathisiddharth765-a11y/RAIL-BLOCK-AI.git
   cd RAIL-BLOCK-AI
   ```
2. Start the local server using Python's built-in HTTP server module:
   ```bash
   python3 -m http.server 8080
   ```
3. Open your browser and navigate to:
   ```text
   http://localhost:8080
   ```
4. Click the **"Run AI Optimization Engine"** button to run the solver simulation and see the block schedules and train lines optimize dynamically.

---
*Developed for the Smart India Hackathon (SIH) 2026.*
