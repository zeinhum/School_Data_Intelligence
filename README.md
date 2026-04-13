# School Data Intelligence System — Engineering Samples

> Selected code samples from a production-deployed, **multi-tenant** school management system built in **C# / ASP.NET Core MVC**, **Entity Framework**, **SQLite**, and **Vanilla JavaScript**.  
> The full system is actively used by multiple schools in low-connectivity environments, with full tenant isolation at every layer.

---

## Why This Project Exists

Many schools in low-resource settings cannot rely on cloud connectivity. This system was designed ground-up for **LAN-only deployment**, running on modest hardware with multiple simultaneous users across three roles: **Admin**, **Teacher**, and **Finance**.

The system has since evolved into a **multi-tenant architecture**, allowing a single server instance to serve multiple schools simultaneously — with complete data isolation between tenants — while retaining its core constraint of zero internet dependency.

Every engineering decision in this project was shaped by two constraints:
- **No internet dependency** — fully self-hosted, LAN-based
- **Low-spec devices** — frontend must be lean; no heavy frameworks

---

## System Overview

| Layer | Technology |
|---|---|
| Backend | C# / ASP.NET Core MVC (Areas) |
| ORM | Entity Framework Core |
| Database | SQLite (per-tenant isolated) |
| Frontend | Vanilla JavaScript (no frameworks) |
| Architecture | Multi-Tenant MVC + Service Layer + Internal API Router |
| Session Security | HTTP-only Cookie Authentication |

**User Roles:** Admin · Teacher · Finance  
**Deployment:** LAN (multi-tenant, multi-user, single server instance)

---

## Engineering Highlights

### 1. Multi-Tenant Architecture — School Isolation

The system supports multiple schools on a single server instance, with each school (tenant) fully isolated at the data, session, and routing layers.

**Tenant resolution** happens early in the request pipeline — before authentication or controller logic — via a `TenantResolver` middleware that identifies the school from the incoming request context (subdomain, path prefix, or cookie claim).

```csharp
// TenantResolver.cs
// Resolves school identity from request → attaches SchoolId to HttpContext
// All downstream services and queries scope to this resolved tenant
```

Key isolation guarantees:
- Each school's data lives in a **dedicated SQLite database** — cross-tenant data access is structurally impossible
- All service classes receive a `SchoolContext` (containing the resolved `SchoolId`) rather than operating on a global database
- Admin-level operations are scoped — a school Admin cannot affect another school's data even with a crafted request

```csharp
// SchoolContext.cs
// Carries: SchoolId, SchoolName, resolved DB connection string
// Injected via DI into all services — never resolved directly from config
```

**Why this matters:** Tenant isolation at the infrastructure layer (separate databases, context-bound services) is more robust than filter-level isolation. A bug in a query cannot leak data across schools.

---

### 2. Cookie-Based Authentication & Session Security

Authentication is handled via **HTTP-only, SameSite-strict cookies** — replacing earlier session-variable approaches. This closes the attack surface against XSS-based session theft while remaining fully functional in a LAN environment.

```csharp
// Program.cs (cookie auth configuration)
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options => {
        options.Cookie.HttpOnly = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
        options.SlidingExpiration = true;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.LoginPath = "/auth/login";
    });
```

On login, the cookie payload is signed and carries:
- `UserId` and `Role`
- `SchoolId` (tenant claim) — used by `TenantResolver` on every request
- Issue timestamp for sliding expiration

```csharp
// AuthService.cs
// Validates credentials → builds ClaimsPrincipal with tenant + role claims
// Signs cookie via ASP.NET Data Protection (no raw session storage)
```

**Why this matters:** HTTP-only cookies are inaccessible to JavaScript, eliminating the most common session hijack vector. Embedding `SchoolId` as a signed claim means tenant resolution cannot be spoofed by a client-side value.

---

### 3. Role-Based Access Control — Request Pipeline

Every incoming request passes through a three-stage check before reaching any controller action:

1. **Tenant resolution** — which school does this request belong to?
2. **Authentication check** — is the user logged in (valid cookie)?
3. **Authorisation check** — does their role permit this action?

This is implemented as a middleware pipeline using ASP.NET's `Areas` feature to physically separate role-specific logic at the routing level — not just at the controller level.

```csharp
// RoleAccessMiddleware.cs
// Intercepts every request → resolves tenant → verifies cookie claims
// → checks role → permits or denies before controller is reached
```

**Why this matters:** Role and tenant enforcement at the routing layer means a Teacher cannot reach an Admin endpoint — and a user from School A cannot reach School B's data — even by crafting a direct URL. The request never arrives at the controller.

---

### 4. School-Indexed Queries — Tenant-Scoped Data Access

All database queries are scoped to the resolved `SchoolId` at the repository layer. No query reaches the database without a school index filter — enforced by convention, not developer discipline.

The base repository applies a global query filter via EF Core, so every entity query is automatically school-scoped:

```csharp
// AppDbContext.cs
// Global query filter — SchoolId applied to every entity automatically
protected override void OnModelCreating(ModelBuilder modelBuilder)
{
    modelBuilder.Entity<Student>()
        .HasQueryFilter(s => s.SchoolId == _schoolContext.SchoolId);

    modelBuilder.Entity<Teacher>()
        .HasQueryFilter(t => t.SchoolId == _schoolContext.SchoolId);

    // Applied to: Students, Teachers, Grades, Attendance, Fees, Staff, Reports
}
```

```csharp
// BaseRepository.cs
// All reads, writes, updates are automatically school-scoped
// Explicit SchoolId filters are redundant — included defensively in critical paths
public IQueryable<T> GetAll() =>
    _dbContext.Set<T>(); // EF global filter already scopes to current school
```

For write operations and critical paths, `SchoolId` is also set **explicitly** as a defensive measure:

```csharp
// StudentService.cs (example write path)
var student = new Student {
    SchoolId = _schoolContext.SchoolId,  // Explicit — never inferred on writes
    // ... other fields
};
```

**Why this matters:** EF Core global query filters make tenant leakage structurally difficult — a developer cannot forget to add a `WHERE SchoolId = ?` clause because it is injected automatically. Explicit assignment on writes prevents zero-value or default `SchoolId` from being persisted.

---

### 5. Internal API Router — Service Dispatch Pattern

The Analytics feature (grade sheets, class reports, Teacher Performance Index, School Quality Rating) handles many distinct operations from a single entry point.

Rather than bloating controllers with conditional logic, an **ApiRouter** was built to:
- Accept all analytics requests and JSON payloads at one endpoint
- Identify the requested operation
- Dispatch to the relevant **school-scoped** service class
- Return a structured JSON response

```csharp
// ApiRouter.cs
// Central dispatcher — maps operation keys to service handlers
// All handlers receive SchoolContext — no cross-tenant data possible
```

→ See [`/Dispatcher Architecture`](https://github.com/zeinhum/School_Data_Intelligence/tree/main/C%23/Analytics)

**Why this matters:** Controllers stay thin, services stay focused, and every service operates within a tenant boundary. Adding a new analytics feature means adding a school-scoped service and registering it — not modifying existing code. Open/Closed Principle in practice.

---

### 6. Academic Analytics Engine

The analytics module produces tenant-scoped reports — all figures are isolated to the querying school:

| Report | Description |
|---|---|
| **Grade Sheet** | Per-student academic performance per term |
| **Class Report** | Aggregate class performance summary |
| **Teacher Performance Index** | Derived metric from student outcomes per teacher |
| **School Quality Rating** | Institution-level academic health indicator |

```csharp
// GradeSheetService.cs
// TeacherPerformanceIndex.cs
// All queries filtered by SchoolId via EF global filter + explicit scoping
```

---

### 7. Vanilla JS Navigation & Memory Manager

This was one of the more deliberate frontend decisions. Given the target devices (low RAM, older hardware), loading all JavaScript upfront was not viable.

The `NavigationManager` class solves this with:

- **Event delegation** — a single top-level listener handles all UI interactions
- **On-demand module loading** — JS classes are imported only when the user triggers their feature
- **Explicit teardown** — modules are destroyed after use, releasing memory and preventing leaks
- **Partial view loading** — only the required UI fragment is fetched and rendered, not full page reloads

```javascript
// NavigationManager.js
// Listens via event delegation → routes action → imports module → executes → destroys
```

→ See [`navigation`](https://github.com/zeinhum/School_Data_Intelligence/tree/main/javaScript)

**Why this matters:** This replicates what frameworks like React do (component mount/unmount lifecycle, lazy imports) but in ~150 lines of vanilla JS — deliberately, to avoid framework overhead on constrained hardware.

---

### 8. Python Grade Processor (Earlier System)

Before the full C# system, a Python quick fix was built within hours of demand in early 2026.

**Problem:** An MS Excel grading sheet (built 2020) was working poorly with exceptional errors, and wasn't accessible across the school network.

**Solution:**
- Python reads the existing Excel sheets (preserving the school's data)
- Processes and generates formatted grade sheets
- Accessible by any user over LAN via student symbol number lookup
- Resolved the issue before the school — a government school — could face consequences

```python
# calculate_grade.py
# Ingests Excel → validates → produces grade sheets → serves over LAN
```

→ See [`Python Flask App`](https://github.com/zeinhum/School_Data_Intelligence/tree/main/python)  
→ Download & Run [`Python Flask App`](https://drive.google.com/drive/folders/1nUP9eAnMRegKYbthalOb3YETxFZV5LZK?usp=sharing)

---

## What's Not Included

This repository contains **selected samples only** — illustrating architecture and engineering decisions.

The full system includes:
- Student & staff attendance (login-based, school-scoped)
- Fee collection and salary records (Finance role, per-tenant)
- Complete academic management workflow
- Full admin dashboard with analytics
- Tenant onboarding and school provisioning

The complete system is deployed and in active use. A public release is planned.

---

## Author

**Jameel Ahamad Khan**  
BSc Physics · MSc Software Engineering (New Zealand)  
[LinkedIn](https://www.linkedin.com/in/jameel01khan/) · [Email](jameelhumn@gmail.com)

---

*Built to solve a real problem, for real schools, under real constraints.*
