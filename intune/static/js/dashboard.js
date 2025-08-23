// Dashboard JavaScript functionality

document.addEventListener('DOMContentLoaded', function() {
    
    // Modal elements
    const playlistModal = document.getElementById('playlistModal');
    const successModal = document.getElementById('successModal');
    const createPlaylistBtn = document.getElementById('createPlaylistBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const confirmCreateBtn = document.getElementById('confirmCreateBtn');
    const closeSuccessBtn = document.getElementById('closeSuccessBtn');
    const playlistNameInput = document.getElementById('playlistName');
    const closeBtns = document.querySelectorAll('.close');

    // Open playlist creation modal
    createPlaylistBtn.addEventListener('click', function() {
        playlistModal.style.display = 'block';
        playlistNameInput.focus();
    });

    // Close modals function
    function closeModals() {
        playlistModal.style.display = 'none';
        successModal.style.display = 'none';
        playlistNameInput.value = '';
    }

    // Close modal event listeners
    closeBtns.forEach(function(btn) {
        btn.addEventListener('click', closeModals);
    });

    cancelBtn.addEventListener('click', closeModals);
    closeSuccessBtn.addEventListener('click', function() {
        successModal.style.display = 'none';
    });

    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        if (event.target === playlistModal) {
            closeModals();
        }
        if (event.target === successModal) {
            successModal.style.display = 'none';
        }
    });

    // Handle Enter key in input
    playlistNameInput.addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            confirmCreateBtn.click();
        }
    });

    // Loading indicator functions
    function showLoadingOverlay() {
        // Remove any existing overlay
        removeLoadingOverlay();
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.id = 'loadingOverlay';
        overlay.className = 'loading-overlay';
        
        // Create spinner container
        const spinnerContainer = document.createElement('div');
        spinnerContainer.className = 'loading-spinner-container';
        
        // Create spinner
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        
        // Create loading text
        const loadingText = document.createElement('div');
        loadingText.className = 'loading-text';
        loadingText.textContent = 'Loading your listening data...';
        
        // Assemble the overlay
        spinnerContainer.appendChild(spinner);
        spinnerContainer.appendChild(loadingText);
        overlay.appendChild(spinnerContainer);
        
        // Add to page
        document.body.appendChild(overlay);
    }
    
    function removeLoadingOverlay() {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    // Add loading indicators to time range buttons
    const timeRangeButtons = document.querySelectorAll('.time-range-button');
    timeRangeButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            // Don't show loading for the currently active button
            if (this.classList.contains('active')) {
                e.preventDefault();
                return;
            }
            
            showLoadingOverlay();
        });
    });

    // Add loading indicator to count dropdown
    const countDropdown = document.getElementById('item-count');
    if (countDropdown) {
        countDropdown.addEventListener('change', function() {
            showLoadingOverlay();
            // Let the navigation proceed normally via the onchange handler
        });
    }

    // Create playlist function
    confirmCreateBtn.addEventListener('click', async function() {
        const playlistName = playlistNameInput.value.trim();
        
        if (!playlistName) {
            alert('Please enter a playlist name.');
            return;
        }

        // Disable button and show loading state
        confirmCreateBtn.disabled = true;
        const originalText = confirmCreateBtn.innerHTML;
        confirmCreateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';

        try {
            const response = await fetch('/create-playlist', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    playlist_name: playlistName
                })
            });

            const result = await response.json();

            if (result.success) {
                // Close creation modal
                playlistModal.style.display = 'none';
                playlistNameInput.value = '';

                // Show success modal with playlist details
                document.getElementById('successMessage').textContent = 
                    `"${result.playlist.name}" has been created with ${result.playlist.tracks_added} tracks!`;
                document.getElementById('openPlaylistBtn').href = result.playlist.url;
                successModal.style.display = 'block';
            } else {
                alert('Error creating playlist: ' + result.error);
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            alert('An error occurred while creating the playlist. Please try again.');
        } finally {
            // Reset button to original state
            confirmCreateBtn.disabled = false;
            confirmCreateBtn.innerHTML = originalText;
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {

    const shareBtn = document.getElementById('shareStoryBtn');
    const downloadBtn = document.getElementById('downloadStoryBtn');

    // Detect browser and capabilities
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const hasWebShare = navigator.share;
    const hasFileShare = hasWebShare && navigator.canShare && navigator.canShare({ files: [new File([], 'test')] });
    
    console.log('Browser detection:', { isFirefox, isMobile, hasWebShare, hasFileShare });
    
    if (isFirefox) {
        // Firefox - always show download option
        shareBtn.style.display = 'none';
        downloadBtn.style.display = 'inline-block';
        helpText.style.display = 'block';
        
        // Update button text for Firefox
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Your Last Month';
        
    } else if (hasFileShare) {
        // Modern browsers with file sharing support
        shareBtn.style.display = 'inline-block';
        shareBtn.innerHTML = '<i class="fas fa-share"></i> Share Your Last Month';
        
    } else if (hasWebShare) {
        // Browsers with Web Share API but no file support
        shareBtn.style.display = 'inline-block';
        shareBtn.innerHTML = '<i class="fas fa-share"></i> Share Your Last Month';
        
    } else {
        // No Web Share API support - show download
        shareBtn.style.display = 'none';
        downloadBtn.style.display = 'inline-block';
        downloadBtn.innerHTML = '<i class="fas fa-download"></i> Download Your Last Month';
    }
});

async function shareStory() {

    const btn = document.getElementById('shareStoryBtn');
    const originalText = btn.innerHTML;
    
    // Detect browser capabilities
    const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
    const hasFileShare = navigator.canShare && navigator.canShare({ files: [new File([], 'test')] });

    try {
        // Show loading state
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Share...';
        btn.disabled = true;

        // Firefox fallback - redirect to download
        if (isFirefox) {
            window.location.href = '/generate-story';
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }
        
        // Generate the story image
        const response = await fetch('/generate-story');
        if (!response.ok) throw new Error('Failed to generate story');
        
        const blob = await response.blob();
        
        // Update button text for sharing
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sharing...';

        // Try file sharing first if supported
        if (hasFileShare) {
            const file = new File([blob], 'intune-story.png', { 
                type: 'image/png',
                lastModified: Date.now() 
            });

            await navigator.share({
                title: 'My InTune Listening',
                text: 'Check out my top artists and tracks this month!',
                files: [file]
            });

        } else if (navigator.share) {
            // Fallback text/URL share
            await navigator.share({
                title: 'My InTune Listening',
                text: 'Find out your top artists and tracks this month using:',
                url: window.location.origin
            });

        } else {
            // Final fallback, trigger image download
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'intune-story.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            showInstructions('Image downloaded, you can now share your listening!')
        }

        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;

    } catch (error) {

        console.log('Share failed', error);
        
        // Reset button
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        // Error handling
        if (error.name !== 'AbortError') {
            // User canceled, do nothing
            return;
        } else if (error.name == 'NotSupportedError') {
            showInstructions('Sharing not available on this browser, downloading your share image...')
            window.location.href = '/generate-story';
        } else {
            // For all other errors, show download option
            showInstructions('Sharing failed, downloading your share image instead...');
            window.location.href = '/generate-story';
        }
    }
}

function showDownloadSpinner(element) {
    
    const originalText = element.innerHTML;
    
    // Show spinner
    element.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating Image...';
    element.style.pointerEvents = 'none'; // Prevent multiple clicks
    
    // Reset spinner after a set amount of time
    setTimeout(function() {
        element.innerHTML = originalText;
        element.style.pointerEvents = 'auto';
    }, 3000); // 3 seconds - adjust as needed based on server response time
    
    // Also listen for page visibility change to reset faster if user comes back
    const resetButton = function() {
        if (!document.hidden) {
            element.innerHTML = originalText;
            element.style.pointerEvents = 'auto';
            document.removeEventListener('visibilitychange', resetButton);
        }
    };
    
    document.addEventListener('visibilitychange', resetButton);
}