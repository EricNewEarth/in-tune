import os
import base64
import requests
import pandas as pd
from urllib.parse import urlencode
from http.server import HTTPServer, BaseHTTPRequestHandler

# Spotify API credentials
CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
SCOPES = 'user-top-read playlist-modify-public playlist-modify-private'

# Spotify app settings
BASE_URL = os.environ.get('BASE_URL')
REDIRECT_URI = f'{BASE_URL}/callback'
PORT = int(os.environ.get('PORT', 5000))

# Store authorization code and access token
auth_code = None
access_token = None
auth_completed = False

# Handle the OAuth 2.0 callback from Spotify
class CallbackHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        global auth_code, auth_completed
        
        # After Spotify redirects to callback url, extract authorization code from URL
        if '/callback' in self.path:
            query_components = dict(q.split('=') for q in self.path.split('?')[1].split('&'))
            if 'code' in query_components:
                auth_code = query_components['code']
                auth_completed = True
                
                # Send success message to browser
                self.send_response(200)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(b'<html><body><h1>Authentication successful!</h1><p>You can close this window now.</p></body></html>')
            else:
                # Handle error responses
                self.send_response(400)
                self.send_header('Content-type', 'text/html')
                self.end_headers()
                self.wfile.write(b'<html><body><h1>Authentication failed</h1></body></html>')
        else:
            # Throw 404 if callback is not redirected to
            self.send_response(404)
            self.end_headers()

# Create HTTP server to handle callback using local server
def start_server():

    server_address = ('', PORT)
    httpd = HTTPServer(server_address, CallbackHandler)

    print(f'Starting server at http://localhost:{PORT}')

    httpd.handle_request() # Only processes the OAuth callback, then stops

# Create authorization code to exchange for Spotify access token
def get_authorization_url():
    auth_url = 'https://accounts.spotify.com/authorize'
    auth_params = {
        'client_id': CLIENT_ID,
        'response_type': 'code',
        'redirect_uri': REDIRECT_URI,
        'scope': SCOPES,
    }
    
    return f'{auth_url}?{urlencode(auth_params)}'

# Exchange authorization code for API access token
def get_access_token(auth_code: str):
    
    token_url = 'https://accounts.spotify.com/api/token'
    
    # Encode client ID and client secret
    auth_header = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {auth_header}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    payload = {
        'grant_type': 'authorization_code',
        'code': auth_code,
        'redirect_uri': REDIRECT_URI
    }
    
    response = requests.post(token_url, headers=headers, data=payload)
    
    if response.status_code == 200:
        token_info = response.json()
        # Return both access token and refresh token
        return token_info['access_token'], token_info['refresh_token']
    else:
        print(f'Error getting token: {response.status_code}')
        print(response.text)
        raise Exception('Failed to get access token.')

# Refresh an expired access token using refresh token
def refresh_access_token(refresh_token: str):
    
    token_url = 'https://accounts.spotify.com/api/token'
    
    # Encode client ID and client secret
    auth_header = base64.b64encode(f'{CLIENT_ID}:{CLIENT_SECRET}'.encode()).decode()
    
    headers = {
        'Authorization': f'Basic {auth_header}',
        'Content-Type': 'application/x-www-form-urlencoded'
    }
    
    payload = {
        'grant_type': 'refresh_token',
        'refresh_token': refresh_token
    }
    
    response = requests.post(token_url, headers=headers, data=payload)
    
    if response.status_code == 200:
        token_info = response.json()
        return token_info['access_token']
    else:
        print(f'Error refreshing token: {response.status_code}')
        print(response.text)
        raise Exception('Failed to refresh access token.')

# Get top artists and tracks for the given time range (simplified for limits ≤ 50)
def get_top_items(access_token: str, time_range: str, limit=10) -> tuple[dict, dict]:

    artists_url = f'https://api.spotify.com/v1/me/top/artists?time_range={time_range}&limit={limit}&offset=0'
    tracks_url = f'https://api.spotify.com/v1/me/top/tracks?time_range={time_range}&limit={limit}&offset=0'

    headers = { 'Authorization': f'Bearer {access_token}' }
    
    # Get artists
    artists_response = requests.get(artists_url, headers=headers)
    
    if artists_response.status_code == 200:
        artists_data = artists_response.json()
    else:
        print(f'Error getting artists: {artists_response.status_code}')
        raise Exception('Failed to get your top artists data.')
    
    # Get tracks
    tracks_response = requests.get(tracks_url, headers=headers)
    
    if tracks_response.status_code == 200:
        tracks_data = tracks_response.json()
    else:
        print(f'Error getting tracks: {tracks_response.status_code}')
        raise Exception('Failed to get your top tracks data.')
    
    return artists_data, tracks_data

# Parse artist json data into DataFrame and total artist count
def parse_artists_data(artists_data: dict) -> tuple[pd.DataFrame, int]:

    final_artists = pd.DataFrame(columns=['id', 'name', 'genres', 'popularity', 'followers', 'link', 'image'])

    try:
        # Handle case where there are no items
        if not artists_data.get('items'):
            return final_artists, 0

        for item in artists_data['items']:
            id = item['id']
            name = item['name']
            genres = item['genres']
            popularity = item['popularity']
            followers = item['followers']['total']
            link = str(item['href']).replace('https://api.spotify.com/v1/artists', 'https://open.spotify.com/artist')
            image = item['images'][0]['url'] if item['images'] else None

            # Format followers for readability
            formatted_followers = f'{followers:,}'

            row = [id, name, genres, popularity, formatted_followers, link, image]
            final_artists.loc[len(final_artists)] = row

        total_artists = artists_data.get('total', 0)
    except Exception as e:
        print(f'Error when parsing artist data: {e}')
        raise e

    return final_artists, total_artists

# Parse track json data into DataFrame and total track count
def parse_tracks_data(tracks_data: dict) -> tuple[pd.DataFrame, int]:

    final_tracks = pd.DataFrame(columns=['id', 'name', 'artists', 'release_date', 'popularity', 'link', 'image'])

    try:
        # Handle case where there are no items
        if not tracks_data.get('items'):
            return final_tracks, 0

        for item in tracks_data['items']:
            id = item['id']
            name = item['name']
            
            artists = []
            for artist in item['artists']:
                artists.append(artist['name'])

            release_date = str(item['album']['release_date'])
            popularity = item['popularity']
            link = str(item['href']).replace('https://api.spotify.com/v1/tracks', 'https://open.spotify.com/track')
            image = item['album']['images'][0]['url'] if item['album']['images'] else None

            # Handle different release date formats
            formatted_release_date = format_release_date(release_date)

            row = [id, name, artists, formatted_release_date, popularity, link, image]
            final_tracks.loc[len(final_tracks)] = row

        total_tracks = tracks_data.get('total', 0)
    except Exception as e:
        print(f'Error when parsing track data: {e}')
        raise e

    return final_tracks, total_tracks

# Helper function to handle different release date formats
def format_release_date(release_date: str) -> str:
    try:
        parts = release_date.split('-')
        
        # YYYY-MM-DD
        if len(parts) == 3:
            year, month, day = parts
            return f'{int(month)}/{int(day)}/{year}'
        # YYYY-MM
        elif len(parts) == 2:
            year, month = parts
            return f'{int(month)}/1/{year}'
        # YYYY
        elif len(parts) == 1:
            year = parts[0]
            return f'1/1/{year}'
        else:
            return release_date
            
    except (Exception):
        # If any conversion fails, return the original date
        return release_date

# Create a new Spotify playlist with custom name and current displayed tracks
def create_playlist(access_token: str, playlist_name: str, tracks_list: list) -> dict:

    # Get the user's profile ID
    user_url = 'https://api.spotify.com/v1/me'
    headers = { 'Authorization': f'Bearer {access_token}' }

    user_response = requests.get(user_url, headers=headers)

    if user_response.status_code != 200:
        print(f'Error getting user profile: {user_response.status_code}, {user_response.text}')
        raise Exception('Failed to get user profile.')
    
    user_data = user_response.json()
    user_id = user_data['id']

    # Create a new playlist from top items
    playlist_url = f'https://api.spotify.com/v1/users/{user_id}/playlists'
    playlist_data = {
        'name': playlist_name,
        'description': 'Created using the InTune app.',
        'public': False # Playlist is private by default
    }

    playlist_response = requests.post(
        playlist_url, 
        headers={**headers, 'Content-Type': 'application/json'}, # Add content type to current header
        json=playlist_data
    )

    if playlist_response.status_code != 201:
        print(f'Error creating playlist: {playlist_response.status_code}, {playlist_response.text}')
        raise Exception('Failed to create playlist.')
    
    playlist_info = playlist_response.json()
    playlist_id = playlist_info['id']

    # Get track IDs from tracks_list
    track_ids = []
    for track in tracks_list:

        if isinstance(track, dict):
            track_id = track.get('id')

            # Skip placeholder tracks
            if track_id and not str(track_id).startswith('placeholder'):
                track_ids.append(track_id)

        elif isinstance(track, str):
            if not track.startswith('placeholder'):
                track_ids.append(track)
    
    if not track_ids:
        raise Exception('No valid tracks found for playlist creation.')
    
    # Add tracks to playlist using post request
    tracks_url = f'https://api.spotify.com/v1/playlists/{playlist_id}/tracks'
    track_uris = [f'spotify:track:{track_id}' for track_id in track_ids]

    add_tracks_data = {'uris': track_uris}

    add_tracks_response = requests.post(
        tracks_url, 
        headers={**headers, 'Content-Type': 'application/json'},
        json=add_tracks_data
    )

    if add_tracks_response.status_code != 201:
        print(f'Error adding tracks to playlist: {add_tracks_response.status_code}, {add_tracks_response.text}')
        raise Exception('Failed to add tracks to playlist.')
    
    # Return created playlist details
    return {
        'id': playlist_id,
        'name': playlist_name,
        'url': playlist_info['external_urls']['spotify'],
        'tracks_added': len(track_ids)
    }