function toggleDropdown() {
  const dropdownMenu = document.getElementById("dropdownMenu");
  dropdownMenu.classList.toggle("show");

  updateDebugInfo(); // Update debug info when the dropdown is toggled
}

function updateDebugInfo() {
  // Get the debug elements
  const windowWidthElement = document.getElementById("windowWidth");
  const menuIconDisplayElement = document.getElementById("menuIconDisplay");
  const dropdownDisplayElement = document.getElementById("dropdownDisplay");
  const debugMessageElement = document.getElementById("debugMessage");

  // Update debug info with current values
  windowWidthElement.textContent = window.innerWidth;
  menuIconDisplayElement.textContent = window.getComputedStyle(document.querySelector('.menu-icon')).display;
  dropdownDisplayElement.textContent = window.getComputedStyle(document.querySelector('.dropdown-content')).display;

  // Update debug message based on menu display property
  const menuDisplay = window.getComputedStyle(document.querySelector('.dropdown')).display;
  if (menuDisplay === 'none') {
    debugMessageElement.textContent = "Menu is not showing on this screen size.";
  } else {
    debugMessageElement.textContent = "";
  }
}

// Debug: Output initial debug info
updateDebugInfo();

// Debug: Log window resize events
window.addEventListener('resize', updateDebugInfo);
