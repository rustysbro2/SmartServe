<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
      background-color: rgba(255, 255, 255, 0.8);
    }

    h1 {
      font-size: 24px;
      margin-bottom: 20px;
    }

    .menu-icon {
      display: none;
      cursor: pointer;
      padding: 10px;
      background-color: #000; /* Change the background color to black or any other desired color */
    }

    .menu-icon span {
      display: block;
      width: 30px;
      height: 3px;
      background-color: #fff; /* Change the color of the hamburger lines to white or any other desired color */
      margin-bottom: 5px;
    }

    .dropdown {
      display: inline-block;
      position: relative;
    }

    .dropdown-content {
      display: none;
      position: absolute;
      top: 100%;
      left: 0;
      background-color: #f9f9f9;
      min-width: 160px;
      box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
      z-index: 1;
    }

    .dropdown:hover .dropdown-content {
      display: block;
    }

    .profile-info {
      margin-top: 30px;
    }

    .debug-info {
      font-weight: bold;
      margin-bottom: 10px;
    }

    .debug-info span {
      font-weight: normal;
    }

    @media (max-width: 768px) {
      .menu-icon {
        display: block;
        background-color: #f00; /* Debug: Set the background color to red */
      }

      .dropdown {
        display: none;
      }

      .dropdown.show {
        display: block;
      }

      .profile-info {
        margin-top: 10px;
      }
    }

    @media (min-width: 769px) {
      .menu-icon {
        display: none;
      }

      .dropdown:hover .dropdown-content {
        display: block;
      }
    }

    @media (min-width: 1200px) {
      .dropdown {
        display: inline-block;
        background-color: #0f0; /* Debug: Set the background color to green */
      }

      .dropdown-content {
        position: static;
        min-width: auto;
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to the Dashboard</h1>

    <div class="menu-icon" onclick="toggleDropdown()">
      <span></span>
      <span></span>
      <span></span>
    </div>

    <div class="dropdown" id="dropdownMenu">
      <div class="dropdown-content">
        <a href="#">Link 1</a>
        <a href="#">Link 2</a>
        <a href="#">Link 3</a>
      </div>
    </div>

    <div class="profile-info">
      <% if (user) { %>
        <h2>Welcome, <%= user.username %>!</h2>
        <p>User ID: <%= user.id %></p>
      <% } else { %>
        <p>User not logged in.</p>
      <% } %>
    </div>

    <div class="debug-info">
      <span>Window Width:</span> <span id="windowWidth"></span>
    </div>
    <div class="debug-info">
      <span>Menu Icon Display:</span> <span id="menuIconDisplay"></span>
    </div>
    <div class="debug-info">
      <span>Dropdown Display:</span> <span id="dropdownDisplay"></span>
    </div>
    <div class="debug-info">
      <span>Debug Message:</span> <span id="debugMessage"></span>
    </div>

  </div>

  <script>
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
      dropdownDisplayElement.textContent = window.getComputedStyle(document.querySelector('.dropdown')).display;

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
  </script>
</body>
</html>
