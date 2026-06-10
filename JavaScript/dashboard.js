// JavaScript for Dashboard Module
(function() {
  document.addEventListener("DOMContentLoaded", () => {
    // Render the dashboard view
    const container = document.getElementById("view-container");
    if (container && window.Views) {
      container.innerHTML = Views.dashboard();
    }
    
    // Highlight sidebar active item
    const sidebarItem = document.querySelector('[data-route="dashboard"]');
    if (sidebarItem) {
      sidebarItem.classList.add("bg-slate-800", "text-white", "border-l-4", "border-blue-600");
      sidebarItem.classList.remove("text-slate-400");
    }

    // Initialize badges
    if (window.updateNavigationBadges) {
      window.updateNavigationBadges();
    }
  });
})();