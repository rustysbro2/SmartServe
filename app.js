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
        max-width: 600px;
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
        display: block;
        cursor: pointer;
        padding: 5px;
        width: 30px;
        height: 30px;
        background-color: #000;
      }

      .menu-icon span {
        display: block;
        width: 100%;
        height: 2px;
        background-color: #fff;
        margin-bottom: 5px;
      }

      .dropdown {
        display: none;
        position: absolute;
        top: calc(100% + 5px);
        right: 0;
        background-color: #f9f9f9;
        min-width: 160px;
        box-shadow: 0px 8px 16px 0px rgba(0, 0, 0, 0.2);
        z-index: 1;
      }

      .dropdown.show {
        display: block;
      }

      .dropdown-content {
        padding: 5px;
      }

      .dropdown-content a {
        display: block;
        padding: 5px 0;
        color: #333;
        text-decoration: none;
      }

      .dropdown-content a:hover {
        background-color: #eee;
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
    </style>
    <script>
      function toggleDropdown() {
        const dropdownMenu = document.getElementById("dropdownMenu");
        dropdownMenu.classList.toggle("show");

        updateDebugInfo(); // Update debug info when the dropdown is toggled
      }

      function updateDebugInfo() {
        const windowWidthElement = document.getElementById("windowWidth");
        const menuIconDisplayElement = document.getElementById(
          "menuIconDisplay"
        );
        const dropdownDisplayElement = document.getElementById(
          "dropdownDisplay"
        );
        const debugMessageElement = document.getElementById("debugMessage");

        windowWidthElement.textContent = window.innerWidth;
        menuIconDisplayElement.textContent = window.getComputedStyle(
          document.querySelector(".menu-icon")
        ).display;
        dropdownDisplayElement.textContent = window.getComputedStyle(
          document.querySelector(".dropdown")
        ).display;

        const menuDisplay = window.getComputedStyle(
          document.querySelector(".dropdown")
        ).display;
        if (menuDisplay === "none") {
          debugMessageElement.textContent =
            "Menu is not showing on this screen size.";
        } else {
          debugMessageElement.textContent = "";
        }
      }

      updateDebugInfo();

      window.addEventListener("resize", updateDebugInfo);
    </script>
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
  </body>
</html>
