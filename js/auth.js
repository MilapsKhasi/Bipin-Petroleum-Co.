/**
 * Supabase Auth Integration for Bipin Petroleum Co. Workspace
 */

(function () {
  const isHTMLFolder = window.location.pathname.includes("/HTML/");
  const loginPageUrl = isHTMLFolder ? "login.html" : "HTML/login.html";
  const dashboardPageUrl = isHTMLFolder ? "dashboard.html" : "HTML/dashboard.html";

  // Check if config exists and keys are valid
  const hasValidConfig = () => {
    return (
      window.SUPABASE_URL &&
      window.SUPABASE_ANON_KEY &&
      window.SUPABASE_URL !== "https://your-project-id.supabase.co" &&
      window.SUPABASE_ANON_KEY !== "your-anon-public-key"
    );
  };

  // Initialize Supabase Client
  let supabaseClient = null;
  if (typeof supabase !== 'undefined' && hasValidConfig()) {
    try {
      // Clean up URL in case it has trailing slashes or /rest/v1 suffix
      let cleanUrl = window.SUPABASE_URL.trim();
      cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, "");
      cleanUrl = cleanUrl.replace(/\/+$/, "");
      
      supabaseClient = supabase.createClient(cleanUrl, window.SUPABASE_ANON_KEY.trim());
      window.supabaseClient = supabaseClient;
    } catch (err) {
      console.error("Failed to initialize Supabase:", err);
    }
  }

  // Global auth check function
  window.checkAuthState = async function () {
    const isLoginPage = window.location.pathname.endsWith("login.html");

    // If config is missing or invalid, go to login so the user can see configure instructions
    if (!hasValidConfig()) {
      if (!isLoginPage) {
        window.location.href = loginPageUrl + "?error=config_missing";
      }
      return;
    }

    if (!supabaseClient) return;

    try {
      const { data: { session }, error } = await supabaseClient.auth.getSession();
      
      if (error) {
        console.error("Session fetch error:", error);
        if (!isLoginPage) window.location.href = loginPageUrl;
        return;
      }

      if (session) {
        // User logged in!
        window.currentUser = session.user;
        if (isLoginPage) {
          window.location.href = dashboardPageUrl;
        } else {
          // Render current user information in sidebar if elements exist
          renderUserSidebarUI();
        }
      } else {
        // User not logged in!
        if (!isLoginPage) {
          window.location.href = loginPageUrl;
        }
      }
    } catch (err) {
      console.error("Auth state check exception:", err);
      if (!isLoginPage) window.location.href = loginPageUrl;
    }
  };

  // Render User details in sidebar
  function renderUserSidebarUI() {
    const user = window.currentUser;
    if (!user) return;

    // We can inject user email and signout button into a placeholder in sidebar
    const sidebar = document.getElementById("sidebar");
    if (!sidebar) return;

    // Check if we already injected the user section
    let userSection = document.getElementById("auth-sidebar-section");
    if (!userSection) {
      // Find the existing offline badge/container or navigation
      const navElement = sidebar.querySelector("nav");
      if (navElement) {
        userSection = document.createElement("div");
        userSection.id = "auth-sidebar-section";
        userSection.className = "p-3 border-t border-slate-800 m-3 mt-auto bg-slate-950/40 rounded-lg flex flex-col gap-2 z-10";
        
        const shortEmail = user.email.length > 22 ? user.email.substring(0, 19) + "..." : user.email;
        const displayName = user.user_metadata?.full_name || "Petroleum Operator";

        userSection.innerHTML = `
          <div class="flex items-center gap-1.5">
            <div class="w-2 h-2 rounded-full bg-blue-500"></div>
            <div class="flex flex-col min-w-0">
              <span class="text-[10px] text-slate-300 font-semibold truncate leading-none">${displayName}</span>
              <span class="text-[9px] text-slate-500 truncate mt-0.5" title="${user.email}">${shortEmail}</span>
            </div>
          </div>
          <button onclick="window.handleSignOut(event)" class="mt-1 w-full bg-slate-800 hover:bg-red-950/40 text-red-400 hover:text-red-300 border border-slate-700/60 hover:border-red-900/40 py-1 px-2 rounded text-[10px] font-medium transition-all duration-150 flex items-center justify-center gap-1 cursor-pointer">
            <i data-lucide="log-out" class="w-3 h-3"></i>
            Sign Out
          </button>
        `;
        // Insert it right before the custom local storage footer if possible, or append to sidebar
        const footer = sidebar.querySelector(".p-3:last-child");
        if (footer) {
          sidebar.insertBefore(userSection, footer);
        } else {
          sidebar.appendChild(userSection);
        }

        if (window.lucide) window.lucide.createIcons();
      }
    }
  }

  // Handle global Sign Out action
  window.handleSignOut = async function (e) {
    if (e && e.preventDefault) e.preventDefault();
    
    if (supabaseClient) {
      try {
        await supabaseClient.auth.signOut();
      } catch (err) {
        console.error("Logout exception:", err);
      }
    }
    
    // Clear state
    window.currentUser = null;
    localStorage.removeItem("supabase.auth.token"); // fallback local state cleanup
    
    // Redirect
    window.location.href = loginPageUrl;
  };

  // Run the check on load, unless the page is explicitly checking on its own
  document.addEventListener("DOMContentLoaded", () => {
    // Check auth status immediately
    window.checkAuthState();
  });
})();
