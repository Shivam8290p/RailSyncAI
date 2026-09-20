// RAIL-BLOCK AI — Authentication Module
// Handles: login, logout, session management, demo users, role permissions

// ═══════════════════════════════════════════
// DEMO USER DATABASE
// ═══════════════════════════════════════════
const DEMO_USERS = [
    {
        id: "USR001",
        employeeId: "COA001",
        password: "Demo@123",
        name: "Rahul Sharma",
        role: "Control Office",
        department: "Control Office",
        email: "rahul.sharma@railnet.gov.in",
        status: "active"
    },
    {
        id: "USR002",
        employeeId: "MPL001",
        password: "Demo@123",
        name: "Priya Verma",
        role: "Maintenance Planner",
        department: "Maintenance Planning",
        email: "priya.verma@railnet.gov.in",
        status: "active"
    },
    {
        id: "USR003",
        employeeId: "ENG001",
        password: "Demo@123",
        name: "Vikram Singh",
        role: "Engineering Officer",
        department: "Engineering",
        email: "vikram.singh@railnet.gov.in",
        status: "active"
    },
    {
        id: "USR004",
        employeeId: "TD001",
        password: "Demo@123",
        name: "Anita Desai",
        role: "Traction Distribution Officer",
        department: "Traction Distribution",
        email: "anita.desai@railnet.gov.in",
        status: "active"
    },
    {
        id: "USR005",
        employeeId: "SNT001",
        password: "Demo@123",
        name: "Suresh Kumar",
        role: "S&T Officer",
        department: "Signal & Telecommunication",
        email: "suresh.kumar@railnet.gov.in",
        status: "active"
    },
    {
        id: "USR006",
        employeeId: "ADMIN001",
        password: "Admin@123",
        name: "Admin User",
        role: "Administrator",
        department: "Administration",
        email: "admin@railnet.gov.in",
        status: "active"
    },
    {
        id: "PUB001",
        employeeId: "USER001",
        password: "User@123",
        name: "Amit Kumar",
        role: "Normal User",
        department: "Public",
        email: "amit.kumar@gmail.com",
        status: "active"
    },
    {
        id: "PUB002",
        employeeId: "USER002",
        password: "User@123",
        name: "Priya Singh",
        role: "Normal User",
        department: "Public",
        email: "priya.singh@gmail.com",
        status: "active"
    },
    {
        id: "PUB003",
        employeeId: "USER003",
        password: "User@123",
        name: "Rajesh Patel",
        role: "Normal User",
        department: "Public",
        email: "rajesh.patel@gmail.com",
        status: "active"
    }
];

// ═══════════════════════════════════════════
// ROLE PERMISSIONS MAP
// ═══════════════════════════════════════════
const ROLE_PERMISSIONS = {
    "Control Office": {
        sections: ["dashboard", "train-operations", "corridors", "block-planning", "ai-planner", "conflicts", "weekly-plan", "monthly-plan", "analytics"],
        label: "Full Operations Access"
    },
    "Maintenance Planner": {
        sections: ["dashboard", "maintenance", "block-requests", "ai-planner", "weekly-plan", "monthly-plan", "assets", "analytics"],
        label: "Maintenance Planning Access"
    },
    "Engineering Officer": {
        sections: ["dashboard", "maintenance", "engineering", "assets", "block-requests", "ai-planner", "weekly-plan"],
        label: "Engineering Access"
    },
    "Traction Distribution Officer": {
        sections: ["dashboard", "maintenance", "traction", "assets", "block-requests", "ai-planner"],
        label: "Traction Distribution Access"
    },
    "S&T Officer": {
        sections: ["dashboard", "maintenance", "signalling", "assets", "block-requests", "ai-planner"],
        label: "S&T Access"
    },
    "Administrator": {
        sections: ["dashboard", "train-operations", "corridors", "block-planning", "ai-planner", "conflicts", "weekly-plan", "monthly-plan", "analytics", "maintenance", "assets", "engineering", "traction", "signalling", "block-requests", "users", "roles", "settings", "audit-logs"],
        label: "Full Administrator Access"
    },
    "Normal User": {
        sections: ["gate-status", "train-delays", "collision-alerts", "track-view", "india-map"],
        label: "Public User Access"
    }
};

// ═══════════════════════════════════════════
// AUTHENTICATION SERVICE (Abstraction layer)
// ═══════════════════════════════════════════
const AuthService = {
    SESSION_KEY: "railblock_session",

    /**
     * Attempts to authenticate with the FastAPI backend first.
     * Falls back to client-side demo auth if backend is offline.
     */
    async login(employeeId, password) {
        // Try backend first
        try {
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: employeeId, password: password })
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, user: data.user, token: data.token, source: "backend" };
            } else if (response.status === 401) {
                const data = await response.json();
                return { success: false, error: data.detail || "Invalid Employee ID or password." };
            } else if (response.status === 403) {
                return { success: false, error: "Your account is currently disabled. Please contact the system administrator." };
            } else {
                throw new Error("Server error");
            }
        } catch (networkError) {
            // Backend offline — fall back to client-side demo auth
            return this._localAuth(employeeId, password);
        }
    },

    /**
     * Client-side demo authentication (fallback when no backend).
     */
    _localAuth(employeeId, password) {
        const trimmedId = employeeId.trim().toUpperCase();

        const user = DEMO_USERS.find(u => u.employeeId === trimmedId);

        if (!user) {
            return { success: false, error: "Invalid Employee ID or password." };
        }

        if (user.status !== "active") {
            return { success: false, error: "Your account is currently disabled. Please contact the system administrator." };
        }

        if (user.password !== password) {
            return { success: false, error: "Invalid Employee ID or password." };
        }

        // Generate a mock JWT-style token
        const token = "demo_" + btoa(JSON.stringify({ sub: user.id, iat: Date.now() }));

        const safeUser = {
            id: user.id,
            employeeId: user.employeeId,
            name: user.name,
            role: user.role,
            department: user.department,
            email: user.email,
            permissions: ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS["Control Office"]
        };

        return { success: true, user: safeUser, token: token, source: "demo" };
    },

    /**
     * Store session after successful login.
     */
    saveSession(user, token, rememberMe) {
        const session = {
            user: user,
            token: token,
            loginTime: Date.now(),
            expiresAt: Date.now() + (rememberMe ? 7 * 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000) // 7 days or 2 hours
        };

        // Use localStorage if remember me, otherwise sessionStorage
        const storage = rememberMe ? localStorage : sessionStorage;
        storage.setItem(this.SESSION_KEY, JSON.stringify(session));

        // Also set in the other storage for cross-tab awareness
        if (!rememberMe) {
            localStorage.removeItem(this.SESSION_KEY);
        }
    },

    /**
     * Get current session if valid.
     */
    getSession() {
        let sessionStr = sessionStorage.getItem(this.SESSION_KEY) || localStorage.getItem(this.SESSION_KEY);
        if (!sessionStr) return null;

        try {
            const session = JSON.parse(sessionStr);

            // Check expiration
            if (Date.now() > session.expiresAt) {
                this.clearSession();
                return null;
            }

            return session;
        } catch (e) {
            this.clearSession();
            return null;
        }
    },

    /**
     * Get the current user from session.
     */
    getCurrentUser() {
        const session = this.getSession();
        return session ? session.user : null;
    },

    /**
     * Check if user is authenticated.
     */
    isAuthenticated() {
        return this.getSession() !== null;
    },

    /**
     * Clear all session data (logout).
     */
    clearSession() {
        sessionStorage.removeItem(this.SESSION_KEY);
        localStorage.removeItem(this.SESSION_KEY);
    },

    /**
     * Logout: clear session + redirect.
     */
    logout() {
        // Try to hit backend logout
        const session = this.getSession();
        if (session && session.token) {
            fetch("/api/auth/logout", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session.token}`
                }
            }).catch(() => {}); // Fire and forget
        }

        this.clearSession();

        // Redirect to login, replacing history so back button doesn't expose dashboard
        window.location.replace("login.html");
    },

    /**
     * Auth guard — call on protected pages. Redirects to login if not authenticated.
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            // Store the originally requested URL for post-login redirect
            sessionStorage.setItem("railblock_redirect", window.location.href);
            window.location.replace("login.html");
            return false;
        }
        return true;
    },

    /**
     * Get the post-login redirect URL (if any).
     */
    getRedirectUrl() {
        return sessionStorage.getItem("railblock_redirect") || "index.html";
    },

    /**
     * Clear the redirect URL after use.
     */
    clearRedirectUrl() {
        sessionStorage.removeItem("railblock_redirect");
    },

    /**
     * Simulated forgot password.
     */
    async forgotPassword(employeeId, email) {
        // Try backend
        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ employee_id: employeeId, email: email })
            });
            if (response.ok) return { success: true };
        } catch (e) { /* fall through */ }

        // Simulated success
        return new Promise(resolve => {
            setTimeout(() => resolve({ success: true }), 1200);
        });
    }
};

// ═══════════════════════════════════════════
// LOGIN PAGE CONTROLLER
// ═══════════════════════════════════════════
const LoginPageController = {
    init() {
        // If already authenticated, redirect based on role
        if (AuthService.isAuthenticated()) {
            const user = AuthService.getCurrentUser();
            if (user && user.role === "Normal User") {
                window.location.replace("user_dashboard.html");
            } else {
                window.location.replace("index.html");
            }
            return;
        }

        this._bindElements();
        this._bindEvents();
        this._animateEntry();
    },

    _bindElements() {
        this.form = document.getElementById("loginForm");
        this.employeeIdInput = document.getElementById("employeeId");
        this.passwordInput = document.getElementById("password");
        this.passwordToggle = document.getElementById("passwordToggle");
        this.rememberMe = document.getElementById("rememberMe");
        this.submitBtn = document.getElementById("loginSubmit");
        this.formError = document.getElementById("formError");
        this.formErrorMsg = document.getElementById("formErrorMsg");
        this.employeeIdError = document.getElementById("employeeIdError");
        this.passwordError = document.getElementById("passwordError");
        this.forgotLink = document.getElementById("forgotLink");
        this.demoCreds = document.getElementById("demoCreds");
        this.demoPopup = document.getElementById("demoPopup");
        this.demoPopupClose = document.getElementById("demoPopupClose");
        this.forgotOverlay = document.getElementById("forgotOverlay");
        this.forgotForm = document.getElementById("forgotForm");
        this.forgotSuccess = document.getElementById("forgotSuccess");
        this.forgotBack = document.getElementById("forgotBack");
        this.forgotCloseBtn = document.getElementById("forgotCloseBtn");
        this.successOverlay = document.getElementById("successOverlay");
        this.successName = document.getElementById("successName");
    },

    _bindEvents() {
        // Form submit
        this.form.addEventListener("submit", (e) => {
            e.preventDefault();
            this._handleLogin();
        });

        // Password toggle
        this.passwordToggle.addEventListener("click", () => {
            const isPassword = this.passwordInput.type === "password";
            this.passwordInput.type = isPassword ? "text" : "password";
            this.passwordToggle.textContent = isPassword ? "🙈" : "👁️";
            this.passwordToggle.setAttribute("aria-label", isPassword ? "Hide password" : "Show password");
        });

        // Clear field errors on input
        this.employeeIdInput.addEventListener("input", () => {
            this.employeeIdInput.classList.remove("error");
            this.employeeIdError.classList.remove("visible");
            this._hideFormError();
        });
        this.passwordInput.addEventListener("input", () => {
            this.passwordInput.classList.remove("error");
            this.passwordError.classList.remove("visible");
            this._hideFormError();
        });

        // Demo credentials popup
        this.demoCreds.addEventListener("click", () => {
            this.demoPopup.classList.add("visible");
        });
        this.demoPopupClose.addEventListener("click", () => {
            this.demoPopup.classList.remove("visible");
        });
        this.demoPopup.addEventListener("click", (e) => {
            if (e.target === this.demoPopup) this.demoPopup.classList.remove("visible");
        });

        // Demo user cards — click to autofill
        document.querySelectorAll(".demo-user-card").forEach(card => {
            card.addEventListener("click", () => {
                const empId = card.dataset.empid;
                const pwd = card.dataset.pwd;
                this.employeeIdInput.value = empId;
                this.passwordInput.value = pwd;
                this.demoPopup.classList.remove("visible");
                this.employeeIdInput.classList.remove("error");
                this.employeeIdError.classList.remove("visible");
                this.passwordInput.classList.remove("error");
                this.passwordError.classList.remove("visible");
                this._hideFormError();
            });
        });

        // Forgot password
        this.forgotLink.addEventListener("click", (e) => {
            e.preventDefault();
            this.forgotOverlay.classList.add("visible");
            this.forgotForm.style.display = "block";
            this.forgotSuccess.classList.remove("visible");
        });

        this.forgotForm.addEventListener("submit", (e) => {
            e.preventDefault();
            this._handleForgotPassword();
        });

        this.forgotBack.addEventListener("click", () => {
            this.forgotOverlay.classList.remove("visible");
        });

        this.forgotCloseBtn.addEventListener("click", () => {
            this.forgotOverlay.classList.remove("visible");
        });

        this.forgotOverlay.addEventListener("click", (e) => {
            if (e.target === this.forgotOverlay) this.forgotOverlay.classList.remove("visible");
        });

        // Keyboard: Escape closes modals
        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape") {
                this.demoPopup.classList.remove("visible");
                this.forgotOverlay.classList.remove("visible");
            }
        });
    },

    _animateEntry() {
        document.querySelector(".login-card").style.opacity = "0";
        document.querySelector(".login-card").style.transform = "translateY(15px)";
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                const card = document.querySelector(".login-card");
                card.style.transition = "opacity 0.5s ease, transform 0.5s ease";
                card.style.opacity = "1";
                card.style.transform = "translateY(0)";
            });
        });
    },

    _validate() {
        let valid = true;
        const empId = this.employeeIdInput.value.trim();
        const pwd = this.passwordInput.value;

        if (!empId) {
            this.employeeIdInput.classList.add("error");
            this.employeeIdError.textContent = "Employee ID is required.";
            this.employeeIdError.classList.add("visible");
            valid = false;
        } else if (empId.length < 3) {
            this.employeeIdInput.classList.add("error");
            this.employeeIdError.textContent = "Employee ID must be at least 3 characters.";
            this.employeeIdError.classList.add("visible");
            valid = false;
        }

        if (!pwd) {
            this.passwordInput.classList.add("error");
            this.passwordError.textContent = "Password is required.";
            this.passwordError.classList.add("visible");
            valid = false;
        } else if (pwd.length < 6) {
            this.passwordInput.classList.add("error");
            this.passwordError.textContent = "Password must be at least 6 characters.";
            this.passwordError.classList.add("visible");
            valid = false;
        }

        if (!valid && !empId && !pwd) {
            this._showFormError("Please enter your Employee ID and password.");
        }

        return valid;
    },

    async _handleLogin() {
        if (!this._validate()) return;

        // Set loading state
        this.submitBtn.disabled = true;
        this.submitBtn.innerHTML = '<span class="spinner-sm"></span> Authenticating...';
        this.employeeIdInput.disabled = true;
        this.passwordInput.disabled = true;

        const result = await AuthService.login(
            this.employeeIdInput.value.trim(),
            this.passwordInput.value
        );

        if (result.success) {
            // Save session
            AuthService.saveSession(result.user, result.token, this.rememberMe.checked);

            // Show success transition
            this._showSuccess(result.user.name);
        } else {
            // Show error
            this._showFormError(result.error);
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = 'Sign In';
            this.employeeIdInput.disabled = false;
            this.passwordInput.disabled = false;
            this.passwordInput.focus();
        }
    },

    _showSuccess(userName) {
        this.successName.textContent = "Welcome, " + userName;
        this.successOverlay.classList.add("visible");

        setTimeout(() => {
            const user = AuthService.getCurrentUser();
            // Normal users go to user dashboard, authorised personnel go to admin dashboard
            if (user && user.role === "Normal User") {
                window.location.replace("user_dashboard.html");
            } else {
                const redirectUrl = AuthService.getRedirectUrl();
                AuthService.clearRedirectUrl();
                window.location.replace(redirectUrl);
            }
        }, 1800);
    },

    _showFormError(msg) {
        this.formErrorMsg.textContent = msg;
        this.formError.classList.add("visible");
    },

    _hideFormError() {
        this.formError.classList.remove("visible");
    },

    async _handleForgotPassword() {
        const empId = document.getElementById("forgotEmpId").value.trim();
        const email = document.getElementById("forgotEmail").value.trim();

        if (!empId || !email) return;

        const btn = this.forgotForm.querySelector(".btn-forgot-submit");
        btn.disabled = true;
        btn.textContent = "Sending...";

        await AuthService.forgotPassword(empId, email);

        btn.disabled = false;
        btn.textContent = "Send Reset Instructions";
        this.forgotForm.style.display = "none";
        this.forgotSuccess.classList.add("visible");
    }
};

// ═══════════════════════════════════════════
// DASHBOARD AUTH INTEGRATION HELPERS
// ═══════════════════════════════════════════

/**
 * Initialize user profile in the dashboard header.
 * Call this from app.js on DOMContentLoaded.
 */
function initDashboardAuth() {
    if (!AuthService.requireAuth()) return false;

    const user = AuthService.getCurrentUser();
    if (!user) return false;

    // Populate user profile widget in header
    const profileEl = document.getElementById("userProfile");
    if (profileEl) {
        const initials = user.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
        profileEl.innerHTML = `
            <div class="profile-widget" id="profileWidget">
                <div class="profile-avatar">${initials}</div>
                <div class="profile-info">
                    <span class="profile-name">${user.name}</span>
                    <span class="profile-role">${user.role}</span>
                </div>
                <span class="profile-chevron">▾</span>
            </div>
            <div class="profile-dropdown" id="profileDropdown">
                <div class="dropdown-header">
                    <div class="dropdown-avatar">${initials}</div>
                    <div>
                        <div class="dropdown-name">${user.name}</div>
                        <div class="dropdown-dept">${user.department}</div>
                        <div class="dropdown-empid">${user.employeeId}</div>
                    </div>
                </div>
                <div class="dropdown-divider"></div>
                <button class="dropdown-item" onclick="AuthService.logout()">
                    <span>🚪</span> Sign Out
                </button>
            </div>
        `;

        // Toggle dropdown
        const widget = document.getElementById("profileWidget");
        const dropdown = document.getElementById("profileDropdown");
        widget.addEventListener("click", (e) => {
            e.stopPropagation();
            dropdown.classList.toggle("visible");
        });
        document.addEventListener("click", () => {
            dropdown.classList.remove("visible");
        });
    }

    return user;
}

/**
 * Get greeting based on time of day.
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    return "Good evening";
}

// ═══════════════════════════════════════════
// AUTO-INIT LOGIN PAGE
// ═══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
    // If the login form exists, initialize the login page controller
    if (document.getElementById("loginForm")) {
        LoginPageController.init();
    }
});
