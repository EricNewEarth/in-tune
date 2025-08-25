import os
import time
import spotify
import logging
import image_generator
from collections import Counter
from flask import Flask, render_template, send_from_directory, redirect, url_for, jsonify, send_file, make_response, session, request

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

app.secret_key = os.environ.get('SECRET_KEY', os.urandom(24))
test_refresh_token = os.environ.get('TEST_REFRESH_TOKEN')

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
        access_token, refresh_token = spotify.get_access_token(auth_code)
        
        logger.debug('Storing tokens in session.')
        session['access_token'] = access_token
        session['refresh_token'] = refresh_token
        session['auth_time'] = time.time()
        
        return redirect(url_for('dashboard', time_range='short_term'))
    except Exception as e:
        logger.error(f'Error in callback: {str(e)}.')
        return render_template('error.html', error=str(e))

# Check if access token is still valid, and refresh it if needed
def verify_token():
    access_token = session.get('access_token')
    refresh_token = session.get('refresh_token')
    auth_time = session.get('auth_time', 0)
    
    # Tokens expire after 3600 seconds (1 hour)
    # Refresh if token is older than 50 minutes
    if time.time() - auth_time > 3000 and refresh_token:
        try:
            logger.debug('Refreshing access token.')
            new_access_token = spotify.refresh_access_token(refresh_token)
            session['access_token'] = new_access_token
            session['auth_time'] = time.time()
            return new_access_token
        except Exception as e:
            logger.error(f'Error refreshing token: {str(e)}.')
            session.clear()
            return None
    
    return access_token

@app.route('/test-login')
def test_login():
    logger.debug('Starting test login process')
    
    # Use environment variables or a secure config for these values
    test_access_token = spotify.refresh_access_token(test_refresh_token)
    
    if not test_access_token or not test_refresh_token:
        logger.error('Test credentials not configured')
        return render_template('error.html', error="Test mode not configured")
    
    # Store test tokens in session
    session['access_token'] = test_access_token
    session['refresh_token'] = test_refresh_token
    session['auth_time'] = time.time()
    session['test_mode'] = True
    
    return redirect(url_for('dashboard', time_range='short_term'))

@app.route('/spotify-review')
def spotify_review():
    return render_template('review.html')

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

# Display the privacy policy and terms of service page
@app.route('/terms')
def terms_of_service():
    logger.debug('Sending user to terms page.')
    return render_template('terms.html')

# Display the changelog page containing app updates
@app.route('/changelog')
def changelog():
    logger.debug('Sending user to changelog page.')
    return render_template('changelog.html')

# Display the about page with app and developer info
@app.route('/about')
def about():
    logger.debug('Sending user to about page.')
    return render_template('about.html')

# Displays main dashboard page with user's Spotify data
@app.route('/dashboard')
def dashboard():
    logger.debug('Preparing dashboard data.')
    access_token = verify_token()
    
    if not access_token:
        logger.warning('No valid access token found when preparing dashboard.')
        return redirect(url_for('index'))
    
    # Get time range from query parameter, default to short_term
    time_range = request.args.get('time_range', 'short_term')

    # Get limit from query parameter, default to 10
    limit = int(request.args.get('limit', 10))

    # Make sure limit is between 5 and 50
    limit = max(5, min(50, limit))
    
    try:
        # Get user's top artists and tracks during specified time range
        logger.debug(f'Fetching top items from Spotify API with time_range={time_range}, limit={limit}.')
        artists_data, tracks_data = spotify.get_top_items(access_token, time_range, limit)

        # Format raw API data into DataFrames
        logger.debug('Parsing API data into DataFrames.')
        final_artists, total_artists = spotify.parse_artists_data(artists_data)
        final_tracks, total_tracks = spotify.parse_tracks_data(tracks_data)

        # Create placeholder data to fill empty grid slots if needed
        artist_count = len(final_artists)
        track_count = len(final_tracks)

        # If there are fewer than the requested limit of artists, add empty placeholders
        if artist_count < limit:
            for i in range(limit - artist_count):
                placeholder = {
                    'id': f'placeholder-artist-{i}',
                    'name': 'No Data Available',
                    'genres': [],
                    'popularity': 0,
                    'followers': 0,
                    'link': '#',
                    'image': None
                }
                final_artists.loc[len(final_artists)] = placeholder

        # If there are fewer than the requested limit of tracks, add empty placeholders
        if track_count < limit:
            for i in range(limit - track_count):
                placeholder = {
                    'id': f'placeholder-track-{i}',
                    'name': 'No Data Available',
                    'artists': [''],
                    'release_date': '',
                    'popularity': 0,
                    'link': '#',
                    'image': None
                }
                final_tracks.loc[len(final_tracks)] = placeholder

        genres_df = final_artists.copy()

        # Process genre data if there are any artists with genre information
        if not genres_df.empty and 'genres' in genres_df.columns:

            # Ensure 'genres' values are all lists, and flatten before counting
            genres_df['genres'] = genres_df['genres'].apply(lambda x: x if isinstance(x, list) else eval(x) if isinstance(x, str) and x.startswith('[') else [])
            all_genres = [genre for sublist in genres_df['genres'] for genre in sublist]
            genre_counts = Counter(all_genres)

            # Get the max count of each genre value
            max_count = max(genre_counts.values(), default=0)
            top_genres = [genre for genre, count in genre_counts.items() if count == max_count]
            
            # Sort genres for consistent ordering
            top_genres.sort()
            
            # Handle three cases for formatting
            if len(top_genres) == 1:
                # Case 1: Single top genre
                top_genre = top_genres[0]
                genre_string = 'Your top genre is '
            elif len(top_genres) == 2:
                # Case 2: 2-way tie
                top_genre = f"{top_genres[0]} and {top_genres[1]}"
                genre_string = 'Your top genres are '
            else:
                # Case 3: 3-way or more tie (show first 3)
                top_genre = f"{', '.join(top_genres[:2])}, and {top_genres[2]}"
                genre_string = 'Your top genres are '
        else:
            # Handle case where no genre data is available
            top_genre = ''
            genre_string = 'No genres found in your top artists.'

        # Convert DataFrames to dictionaries for template rendering
        artists = final_artists.to_dict('records')
        tracks = final_tracks.to_dict('records')

        # Store track IDs in session for playlist creation
        track_ids = [track['id'] for track in tracks if not str(track.get('id')).startswith('placeholder')]
        session['current_track_ids'] = track_ids
        
        # Calculate average popularity of artists and tracks if data is available
        avg_artist_popularity = round(final_artists[:artist_count]['popularity'].mean(), 1) if artist_count > 0 else 0
        avg_track_popularity = round(final_tracks[:track_count]['popularity'].mean(), 1) if track_count > 0 else 0

        # Add all data to the dashboard render_template call
        logger.debug(f'Rendering dashboard with {artist_count} artists and {track_count} tracks.')
        return render_template('dashboard.html', 
                            artists=artists, 
                            tracks=tracks,
                            top_genre=top_genre,
                            genre_string=genre_string,
                            total_artists=total_artists,
                            total_tracks=total_tracks,
                            actual_artist_count=artist_count,
                            actual_track_count=track_count,
                            avg_artist_popularity=avg_artist_popularity,
                            avg_track_popularity=avg_track_popularity,
                            current_time_range=time_range,
                            current_limit=limit)
    
    # If there's an error, clear the session and redirect to login flow
    except Exception as e:
        logger.error(f'Error in dashboard: {str(e)}.')
        session.clear()
        return render_template('error.html', error=str(e))

# Route to handle playlist creation
@app.route('/create-playlist', methods=['POST'])
def create_playlist():
    logger.debug('Creating new playlist.')
    access_token = verify_token()

    if not access_token:
        logger.warning('No valid access token found when creating playlist.')
        return jsonify({'success': False, 'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        playlist_name = data.get('playlist_name', '').strip()
        
        if not playlist_name:
            return jsonify({'success': False, 'error': 'Playlist name is required'}), 400

        track_ids = session.get('current_track_ids', [])
        
        if not track_ids:
            return jsonify({'success': False, 'error': 'No tracks available'}), 400

        playlist_tracks = [{'id': track_id} for track_id in track_ids]

        playlist_info = spotify.create_playlist(access_token, playlist_name, playlist_tracks)
        logger.debug(f'Created playlist: {playlist_info}')

        return jsonify({
            'success': True,
            'playlist': playlist_info
        })
    
    except Exception as e:
        logger.error(f'Error creating playlist: {str(e)}.')
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/generate-story')
def generate_story():
    
    access_token = verify_token()
    if not access_token:
        return redirect(url_for('index'))
    
    try:
        # Get the user's top artists and tracks for the past month
        artists_data, tracks_data = spotify.get_top_items(access_token, 'short_term', 5)
        final_artists, total_artists = spotify.parse_artists_data(artists_data)
        final_tracks, total_tracks = spotify.parse_tracks_data(tracks_data)

        # Generate story image
        img_buffer = image_generator.create_share_image(final_artists, final_tracks, total_artists, total_tracks)

        # Set headers for sharing and downloading using Web Share API
        user_agent = request.headers.get('User-Agent', '')

        if 'Mobile' in user_agent or 'Android' in user_agent or 'iPhone' in user_agent:
            # Mobile - optimized for sharing
            response = make_response(send_file(
                img_buffer,
                mimetype='image/png',
                as_attachment=False,
                download_name='intune-story.png'
            ))
            
            # Add headers to help mobile browsers recognize the file type
            response.headers['Content-Type'] = 'image/png'
            response.headers['Content-Disposition'] = 'inline; filename="intune-story.png"'
            response.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            response.headers['Pragma'] = 'no-cache'
            response.headers['Expires'] = '0'
            
            return response
        else:
            # Desktop - force download
            response = make_response(send_file(
                img_buffer,
                mimetype='image/png',
                as_attachment=True,
                download_name='intune-story.png'
            ))
            
            # Add headers for desktop download
            response.headers['Content-Type'] = 'image/png'
            response.headers['Content-Disposition'] = 'attachment; filename="intune-story.png"'
            
            return response
        
    except Exception as e:
        logger.error(f'Error generating story: {str(e)}.')
        return render_template('error.html', error=str(e))
    
if __name__ == '__main__':
    app.run()