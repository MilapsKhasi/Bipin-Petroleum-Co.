// Clean Auth Logic for Bipin Petroleum Co.

let supabaseClient = null;
let currentMode = 'signin';

// Initialize Supabase when config is ready
function initSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error("Supabase credentials missing");
    return false;
  }
  
  let cleanUrl = window.SUPABASE_URL.trim();
  cleanUrl = cleanUrl.replace(/\/rest\/v1\/?$/, '');
  cleanUrl = cleanUrl.replace(/\/+$/, '');
  
  supabaseClient = supabase.createClient(cleanUrl, window.SUPABASE_ANON_KEY.trim());
  window.supabaseClient = supabaseClient;
  return true;
}

// Show status message
function showStatus(message, type = 'error') {
  const statusDiv = document.getElementById('status-message');
  if (!statusDiv) return;
  
  statusDiv.textContent = message;
  statusDiv.className = `status-message ${type}`;
  statusDiv.classList.remove('hidden');
  
  setTimeout(() => {
    statusDiv.classList.add('hidden');
  }, 4000);
}

// Switch between Sign In and Sign Up modes
function setAuthMode(mode) {
  currentMode = mode;
  const signinTab = document.getElementById('signin-tab');
  const signupTab = document.getElementById('signup-tab');
  const nameGroup = document.getElementById('name-group');
  const btnText = document.getElementById('btn-text');
  
  if (mode === 'signup') {
    signinTab.classList.remove('active');
    signupTab.classList.add('active');
    nameGroup.classList.remove('hidden');
    btnText.textContent = 'Create Account';
  } else {
    signupTab.classList.remove('active');
    signinTab.classList.add('active');
    nameGroup.classList.add('hidden');
    btnText.textContent = 'Sign In';
  }
}

// Handle form submission
async function handleAuthSubmit(event) {
  event.preventDefault();
  
  if (!supabaseClient) {
    showStatus("Supabase not initialized. Check config.js", "error");
    return;
  }
  
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const fullname = document.getElementById('fullname')?.value.trim() || '';
  
  const submitBtn = document.getElementById('submit-btn');
  const btnText = document.getElementById('btn-text');
  const btnLoader = document.getElementById('btn-loader');
  
  // Show loading state
  submitBtn.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');
  
  try {
    if (currentMode === 'signup') {
      // Sign Up
      const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullname || "Petroleum Operator" },
          emailRedirectTo: window.location.origin
        }
      });
      
      if (error) throw error;
      
      if (data?.user) {
        showStatus("Account created! You can now sign in.", "success");
        setAuthMode('signin');
        document.getElementById('password').value = '';
      }
    } else {
      // Sign In
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      if (data?.session) {
        showStatus("Welcome back!", "success");
        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      }
    }
  } catch (error) {
    showStatus(error.message, "error");
  } finally {
    // Reset button state
    submitBtn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

// Check if config is valid
function hasValidConfig() {
  return (
    window.SUPABASE_URL &&
    window.SUPABASE_ANON_KEY &&
    !window.SUPABASE_URL.includes("your-project")
  );
}

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  // Initialize Supabase
  if (hasValidConfig()) {
    initSupabase();
    document.getElementById('auth-form').classList.remove('hidden');
    document.getElementById('config-error').classList.add('hidden');
  } else {
    document.getElementById('auth-form').classList.add('hidden');
    document.getElementById('config-error').classList.remove('hidden');
  }
  
  // Setup event listeners
  document.getElementById('signin-tab').addEventListener('click', () => setAuthMode('signin'));
  document.getElementById('signup-tab').addEventListener('click', () => setAuthMode('signup'));
  document.getElementById('login-form').addEventListener('submit', handleAuthSubmit);
  
  // Initialize Lucide icons if available
  if (window.lucide) window.lucide.createIcons();
});