import os
import time
import spotify
import logging
import pandas as pd
from collections import Counter
from flask import Flask, render_template, send_from_directory, redirect, url_for, session, request, jsonify

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Use environment variable for secret key in production
app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))

@app.route('/favicon.ico')
def favicon():
    return send_from_directory(os.path.join(app.root_path, 'static'),
            'favicon.ico', mimetype='image/vnd.microsoft.icon')

# Display dashboard if the user already has an access token, otherwise show the login page
@app.route('/')
def index():
    logger.debug('Accessing root route.')
    access_token = session.get('access_token')
    
    if access_token:
        logger.debug('User has access token, showing dashboard.')
        return redirect(url_for('dashboard', time_range='short_term'))
    else:
        logger.debug('No access token found, showing login page.')
        return render_template('index.html')

# Get authentication url and redirect to Spotify auth page
@app.route('/login')
def login():
    logger.debug('Starting login process.')
    auth_url = spotify.get_authorization_url()
    logger.debug(f'Generated auth URL: {auth_url[:50]}...')
    return redirect(auth_url)

# Handle callback from Spotify after authorizing
@app.route('/callback')
def callback():
    logger.debug('Received callback from Spotify.')
    auth_code = request.args.get('code')
    
    if not auth_code:
        logger.warning('No auth code in callback, redirecting to index.')
        return redirect(url_for('index'))
    
    # Attempt to get access token from auth code, store token, and redirect to dashboard
    try:
        logger.debug('Exchanging auth code for access token.')
        access_token = spotify.get_access_token(auth_code)
        
        logger.debug('Storing access token in session.')
        session['access_token'] = access_token
        session['auth_time'] = time.time()
        
        return redirect(url_for('dashboard', time_range='short_term'))
    except Exception as e:
        logger.error(f'Error in callback: {str(e)}.')
        return render_template('error.html', error=str(e))

# Endpoint to debug and make sure session is working
@app.route('/check-session')
def check_session():
    return jsonify({
        "has_token": "access_token" in session,
        "auth_time": session.get("auth_time", None),
        "session_keys": list(session.keys())
    })

# Clear the current session and log the user out
@app.route('/logout')
def logout():
    logger.debug('Logging user out.')
    session.clear()
    return redirect(url_for('index'))

# Displays main dashboard page with user's Spotify data
@app.route('/dashboard')
def dashboard():
    logger.debug('Preparing dashboard data.')
    access_token = session.get('access_token')
    
    if not access_token:
        logger.warning('No access token found when preparing dashboard.')
        return redirect(url_for('index'))
    
    # Get time range from query parameter, default to short_term
    time_range = request.args.get('time_range', 'short_term')
    
    try:
        # Get user's top artists and tracks during specified time range
        logger.debug(f'Fetching top items from Spotify API with time_range={time_range}.')
        artists_data, tracks_data = spotify.get_top_items(access_token, time_range)
        
        # Format raw API data into DataFrames
        logger.debug('Parsing API data into DataFrames.')
        final_artists, total_artists = spotify.parse_artists_data(artists_data)
        final_tracks, total_tracks = spotify.parse_tracks_data(tracks_data)

        genres_df = final_artists.copy()

        # Ensure 'genres' values are all lists, and flatten before counting
        genres_df['genres'] = genres_df['genres'].apply(lambda x: x if isinstance(x, list) else eval(x))
        all_genres = [genre for sublist in genres_df['genres'] for genre in sublist]
        genre_counts = Counter(all_genres)

        # Get the max count of each genre value, and if ties occur, concatenate with ', '
        max_count = max(genre_counts.values(), default=0)
        top_genres = [genre for genre, count in genre_counts.items() if count == max_count]
        top_genre = ", ".join(top_genres)

        # Convert DataFrames to dictionaries for template rendering
        artists = final_artists.to_dict('records')
        tracks = final_tracks.to_dict('records')
        
        # Calculate average popularity of artists and tracks
        avg_artist_popularity = round(final_artists['popularity'].mean(), 1)
        avg_track_popularity = round(final_tracks['popularity'].mean(), 1)

        # Add all data to the dashboard render_template call
        logger.debug(f'Rendering dashboard with {len(artists)} artists and {len(tracks)} tracks.')
        return render_template('dashboard.html', 
                            artists=artists, 
                            tracks=tracks,
                            top_genre=top_genre,
                            total_artists=total_artists,
                            total_tracks=total_tracks,
                            avg_artist_popularity=avg_artist_popularity,
                            avg_track_popularity=avg_track_popularity,
                            current_time_range=time_range)

    # If there's an error, clear the session and redirect to login flow
    except Exception as e:
        logger.error(f'Error in dashboard: {str(e)}.')
        session.clear()
        return render_template('error.html', error=str(e))

if __name__ == '__main__':
    app.run()