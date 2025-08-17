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