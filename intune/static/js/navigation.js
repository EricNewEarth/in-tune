// Navigation Arrows JavaScript functionality
// Works for both dashboard and custom pages

function initializeNavigationArrows() {

    console.log('Initializing navigation arrows...');

    // Get the sections we'll navigate to
    const header = document.querySelector('body');
    
    // Find sections by looking for specific headers
    const allSections = document.querySelectorAll('.stats-section');
    let artistsSection = null;
    let tracksSection = null;
    
    // Look for the sections with "Top Artists" and "Top Tracks" or "My Artists" and "My Tracks"
    allSections.forEach(section => {
        const headerText = section.querySelector('h2');
        if (headerText) {
            const text = headerText.textContent.toLowerCase();
            if ((text.includes('artists') || text.includes('artist')) && !artistsSection) {
                // Make sure it has a grid-container (actual content section)
                if (section.querySelector('.grid-container')) {
                    artistsSection = section;
                }
            } else if ((text.includes('tracks') || text.includes('track')) && !tracksSection) {
                // Make sure it has a grid-container (actual content section)
                if (section.querySelector('.grid-container')) {
                    tracksSection = section;
                }
            }
        }
    });
    
    if (!header || !artistsSection || !tracksSection) {
        console.warn('Navigation sections not found', { header, artistsSection, tracksSection });
        return;
    }
    
    console.log('Found sections:', { artistsSection, tracksSection });
    
    // Current section index: 0 = top, 1 = artists, 2 = tracks
    let currentSection = 0;
    
    // Get arrow elements
    const upArrow = document.getElementById('navArrowUp');
    const downArrow = document.getElementById('navArrowDown');

    // Show arrow elements
    upArrow.classList.add('visible');
    downArrow.classList.add('visible');
    
    if (!upArrow || !downArrow) {
        console.warn('Navigation arrow elements not found');
        return;
    }
    
    console.log('Navigation arrows found and ready');
    
    // Function to scroll to a section
    function scrollToSection(section) {
        const yOffset = -150; // 100px offset from the top
        const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
        
        window.scrollTo({
            top: y,
            behavior: 'smooth'
        });
    }
    
    // Up arrow click handler
    upArrow.addEventListener('click', function() {
        console.log('Up arrow clicked, current section:', currentSection);
        if (currentSection === 2) {
            // From tracks to artists
            currentSection = 1;
            scrollToSection(artistsSection);
        } else if (currentSection === 1) {
            // From artists to top
            currentSection = 0;
            scrollToSection(header);
        } else if (currentSection === 0) {
            // From artists to top
            currentSection = 0;
            scrollToSection(header);
        }
    });
    
    // Down arrow click handler
    downArrow.addEventListener('click', function() {
        console.log('Down arrow clicked, current section:', currentSection);
        if (currentSection === 0) {
            // From top to artists
            currentSection = 1;
            scrollToSection(artistsSection);
        } else if (currentSection === 1) {
            // From artists to tracks
            currentSection = 2;
            scrollToSection(tracksSection);
        }
    });
    
    // Update current section based on scroll position
    let scrollTimeout;
    window.addEventListener('scroll', function() {
        // Debounce scroll events
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(function() {
            const scrollPos = window.scrollY;
            const headerBottom = header.offsetTop + header.offsetHeight;
            const artistsTop = artistsSection.offsetTop - 100;
            const tracksTop = tracksSection.offsetTop; 
            
            if (scrollPos < artistsTop) {
                currentSection = 0;
            } else if (scrollPos < tracksTop) {
                currentSection = 1;
            } else {
                currentSection = 2;
            }
            
        }, 100);
    });
    
    console.log('Navigation arrows initialized successfully');
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initializeNavigationArrows);