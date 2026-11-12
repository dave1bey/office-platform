# Real-Time Attendance, Action Plan & Team Performance Platform

A zero-recurring-cost, high-performance operational platform built for office teams (10–30 members). Designed to automate task execution from master Excel action plans, facilitate instant mobile attendance and absence reporting with sub-200ms real-time alerts, and dynamically calculate team performance metrics with native 4-language localization.

---

## 🚀 Key Highlights & Architectural Features

1. **Master Excel Plan Ingestion (.xlsx)**
   - Upload action plans parsed by Apache POI.
   - Maps Task Title, Description, Deadline, Severity Priority, and pre-assigned Employee Code.
   - Live Searchable Combobox for delegation featuring real-time status indicators:
     - 🟢 **Green:** Present Today
     - 🔴 **Red:** Absent Today
     - ⚪ **Gray:** Unrecorded

2. **Weighted Severity Performance Engine**
   - Incorporates task urgency/severity directly into the completion rate:
     - 🔴 **Critical:** 4x Weight Points
     - 🟠 **High:** 3x Weight Points
     - 🟡 **Medium:** 2x Weight Points
     - ⚪ **Low:** 1x Weight Points
   - **Formula:**
     $$\text{Weighted Accomplishment Rate (\%)} = \left( \frac{\sum (\text{Completed Tasks} \times \text{Severity Weight})}{\sum (\text{Total Assigned Tasks} \times \text{Severity Weight})} \right) \times 100$$
   - Prevents gaming of scores by rewarding teams that deliver high-impact deliverables.

3. **Sub-200ms Real-Time WebSocket Alerts & Live Ticker (STOMP)**
   - **Instant Absence Alarms (`/topic/admin/absences`):** Triggers an expanding red warning banner and synthesized audible chime on administrative consoles.
   - **Operational Impact Analysis:** Immediately cross-references and flags all active deliverables assigned to the absent worker that are due that day.
   - **Real-Time Live Feed (`/topic/admin/live-feed`):** Whenever an employee submits attendance check-ins or progress notes, the Admin console reflects it instantly without page reloads.

4. **Native 4-Language Localization (Ge'ez Unicode & Qubee Diacritics)**
   - **English (EN):** Default fallback
   - **Amharic / አማርኛ (AM):** Ethiopic / Ge'ez script
   - **Tigrinya / ትግርኛ (TI):** Ethiopic / Ge'ez script
   - **Afaan Oromoo (OM):** Latin / Qubee script
   - 1-click persistent header toggle with instant re-render.
   - Multilingual Excel report export preserving Ge'ez UTF-8 characters.

5. **Employee Mobile PWA (Add to Home Screen)**
   - Standalone manifest-driven mobile experience on Chrome / Safari.
   - One-tap daily Check-In and Check-Out.
   - Absence filing modal with categories: `MEDICAL`, `EMERGENCY`, `OFFSITE`, `OTHER`.
   - FullCalendar monthly deadline overview.

---

## 🏗️ System Architecture

* **Backend:** Java 21 / Spring Boot 3.3.x (Spring Security, Spring WebSocket STOMP broker, Apache POI 5.2.5, Spring Data JPA).
* **Database:** PostgreSQL 16 (UTF-8 encoding `en_US.UTF-8` supporting Ge'ez & Latin diacritics) + H2 in-memory dev profile.
* **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, FullCalendar, `i18next`.
* **Deployment:** Single `docker-compose.yml` for local office LAN rollout ($0 software cost).

---

## 🔑 Default Accounts (One-Click Demo)

| Role | Name | Email | Password |
| :--- | :--- | :--- | :--- |
| **Administrator** | Admin User | `admin@office.lan` | `password123` |
| **Team Lead / Manager** | Abebe Bikila | `abebe@office.lan` | `password123` |
| **Staff Employee** | Hagos Berhe | `hagos@office.lan` | `password123` |
| **Staff Employee** | Tolassa Chala | `tolassa@office.lan` | `password123` |
| **Staff Employee** | Sara Tesfaye | `sara@office.lan` | `password123` |

---

## 🏃 Running the Application

### Option A: Local Office LAN Deployment via Docker Compose ($0 Cost)
```bash
docker compose up --build
```
* **Frontend PWA:** `http://<office-lan-ip>:3000` (or `http://localhost:3000`)
* **Backend API & WebSocket:** `http://<office-lan-ip>:8080/ws-attendance`
* **PostgreSQL:** Port `5432` (database: `attendance_db`)

### Option B: Running Development Mode Directly
#### 1. Start Spring Boot Backend:
```bash
cd backend
mvn spring-boot:run
```
*(Runs with embedded in-memory database and auto-seeded sample data on port 8080)*

#### 2. Start React PWA Frontend:
```bash
cd frontend
npm run dev
```
*(Runs on `http://localhost:3000` with proxy to backend)*

