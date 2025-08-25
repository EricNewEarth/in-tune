// Menu JavaScript functionality for About and Changelog pages

document.addEventListener('DOMContentLoaded', function() {
    
    // Hamburger menu elements
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sideMenu = document.getElementById('sideMenu');
    const sideMenuOverlay = document.getElementById('sideMenuOverlay');
    const closeMenuBtn = document.getElementById('closeMenuBtn');

    // Check if elements exist before adding event listeners
    if (!hamburgerBtn || !sideMenu || !sideMenuOverlay || !closeMenuBtn) {
        console.warn('Menu elements not found');
        return;
    }

    // Hamburger menu functionality
    function openSideMenu() {
        sideMenu.classList.add('open');
        hamburgerBtn.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    function closeSideMenu() {
        sideMenu.classList.remove('open');
        hamburgerBtn.classList.remove('active');
        document.body.style.overflow = 'auto'; // Restore background scrolling
    }

    // Hamburger menu event listeners
    hamburgerBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        if (sideMenu.classList.contains('open')) {
            closeSideMenu();
        } else {
            openSideMenu();
        }
    });

    closeMenuBtn.addEventListener('click', closeSideMenu);
    sideMenuOverlay.addEventListener('click', closeSideMenu);

    // Close side menu on escape key
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && sideMenu.classList.contains('open')) {
            closeSideMenu();
        }
    });

    // Close side menu when clicking a menu item (for smooth navigation)
    const menuItems = document.querySelectorAll('.menu-item');
    menuItems.forEach(function(item) {
        item.addEventListener('click', function() {
            // Small delay to allow the click to register before closing
            setTimeout(closeSideMenu, 100);
        });
    });
});