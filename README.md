# School Data Intelligence System — Engineering Samples

> Selected code samples from a production-deployed, LAN-based school management system built in **C# / ASP.NET Core MVC**, **Entity Framework**, **SQLite**, and **Vanilla JavaScript**.  
> The full system is actively used by a school in a low-connectivity environment.

---

## Why This Project Exists

Many schools in low-resource settings cannot rely on cloud connectivity. This system was designed ground-up for **LAN-only deployment**, running on modest hardware with multiple simultaneous users across three roles: **Admin**, **Teacher**, and **Finance**.

Every engineering decision in this project was shaped by two constraints:
- **No internet dependency** — fully self-hosted, LAN-based
- **Low-spec devices** — frontend must be lean; no heavy frameworks

---

## System Overview

| Layer | Technology |
|---|---|
| Backend | C# / ASP.NET Core MVC (Areas) |
| ORM | Entity Framework Core |
| Database | SQLite |
| Frontend | Vanilla JavaScript (no frameworks) |
| Architecture | MVC + Service Layer + Internal API Router |

**User Roles:** Admin · Teacher · Finance  
**Deployment:** LAN (multi-user, single server instance)

---

## Engineering Highlights

### 1. Role-Based Access Control — Request Pipeline

Every incoming request passes through a two-stage check before reaching any controller action:

1. **Authentication check** — is the user logged in?
2. **Authorisation check** — does their role permit this action?

This is implemented as a clean middleware-style pipeline using ASP.NET's `Areas` feature to physically separate role-specific logic at the routing level — not just at the controller level.

```csharp
// RoleAccessMiddleware.cs
// Intercepts every request, verifies session, resolves role, permits or denies
```

→ See [`/architecture/RoleAccessMiddleware.cs`](./architecture/RoleAccessMiddleware.cs)

**Why this matters:** Role enforcement at the routing layer means a Teacher cannot reach an Admin endpoint even by crafting a direct URL — the request never arrives at the controller.

---

### 2. Internal API Router — Service Dispatch Pattern

The Analytics feature (grade sheets, class reports, Teacher Performance Index, School Quality Rating) handles many distinct operations from a single entry point.

Rather than bloating controllers with conditional logic, an **ApiRouter** was built to:
- Accept all analytics requests and JSON payloads at one endpoint
- Identify the requested operation
- Dispatch to the relevant service class
- Return a structured JSON response

```csharp
// ApiRouter.cs
// Central dispatcher — maps operation keys to service handlers
```

→ See [`/architecture/ApiRouter.cs`](./architecture/ApiRouter.cs)

**Why this matters:** This is a service-layer pattern — controllers stay thin, services stay focused, and adding a new analytics feature means adding a service and registering it with the router, not modifying existing code. Open/Closed Principle in practice.

---

### 3. Academic Analytics Engine

The analytics module produces:

| Report | Description |
|---|---|
| **Grade Sheet** | Per-student academic performance per term |
| **Class Report** | Aggregate class performance summary |
| **Teacher Performance Index** | Derived metric from student outcomes per teacher |
| **School Quality Rating** | Institution-level academic health indicator |

```csharp
// GradeSheetService.cs
// TeacherPerformanceIndex.cs
```

→ See [`/analytics/`](./analytics/)

---

### 4. Vanilla JS Navigation & Memory Manager

This was one of the more deliberate frontend decisions. Given the target devices (low RAM, older hardware), loading all JavaScript upfront was not viable.

The `NavigationManager` class solves this with:

- **Event delegation** — a single top-level listener handles all UI interactions, rather than attaching handlers to individual elements
- **On-demand module loading** — JS classes are imported only when the user triggers their feature
- **Explicit teardown** — modules are destroyed after use, releasing memory and preventing leaks
- **Partial view loading** — only the required UI fragment is fetched and rendered, not full page reloads

```javascript
// NavigationManager.js
// Listens via event delegation → routes action → imports module → executes → destroys
```

→ See [`/frontend/NavigationManager.js`](./frontend/NavigationManager.js)

**Why this matters:** This replicates what frameworks like React do (component mount/unmount lifecycle, lazy imports) but in ~150 lines of vanilla JS — deliberately, to avoid framework overhead on constrained hardware.

---

### 5. Python Grade Processor (Earlier System)

Before the full C# system, a Python desktop application was built to replace a fragile Excel-based grading workflow.

**Problem:** An MS Excel grading sheet (built 2020) was working poorly and wasn't accessible across the school network.

**Solution:**
- Python reads the existing Excel sheets (preserving the school's data)
- Processes and generates formatted grade sheets
- Accessible by multiple users over LAN via student symbol number lookup
- Currently in daily use by the school

```python
# grade_processor.py
# Ingests Excel → validates → produces grade sheets → serves over LAN
```

→ See [`/python-grader/grade_processor.py`](./python-grader/grade_processor.py)

---

## What's Not Included

This repository contains **selected samples only** — illustrating architecture and engineering decisions.

The full system includes:
- Student & staff attendance (login-based)
- Fee collection and salary records (Finance role)
- Complete academic management workflow
- Full admin dashboard with analytics

The complete system is deployed and in active use. A public release is planned.

---

## Author

**Jameel Ahamad Khan**  
BSc Physics · MSc Software Engineering (New Zealand)  
[LinkedIn](https://www.linkedin.com/in/jameel01khan/) · [Email](jameelhumn@gmail.com)

---

*Built to solve a real problem, for a real school, under real constraints.*
