// Callback JavaScript for handling authentication completion

if (window.opener) {
    window.opener.postMessage('auth_complete', '*');
    setTimeout(function() {
        window.close();
    }, 1500);
} else {
    // If there's no window opener, redirect to dashboard
    setTimeout(function() {
        window.location.href = "/";
    }, 1500);
}