// Login page JavaScript functionality

window.addEventListener('message', function(event) {
    if (event.data === 'auth_complete') {
        console.log('Authentication completed, redirecting to dashboard');
        // Redirect to dashboard after authentication flow is complete
        window.location.href = '/';
    }
});

window.onload = function() {
    // Open the Spotify authorization in a popup
    var authWindow = window.open('{{ auth_url }}', 'SpotifyAuth', 
        'width=500,height=700,location=yes,resizable=yes,scrollbars=yes,status=yes');
    
    // Check if popup was blocked, and redirect if needed
    if (!authWindow || authWindow.closed || typeof authWindow.closed == 'undefined') {
        // Popup was blocked, redirect instead
        window.location.href = '{{ auth_url }}';
    }
}

// In case the message is never received, redirect to root after a timeout
setTimeout(function() {
    window.location.href = '/';
}, 20000); // 20 seconds