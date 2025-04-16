import os
import base64
import requests
import pandas as pd
from urllib.parse import urlencode
from http.server import HTTPServer, BaseHTTPRequestHandler

# Spotify API credentials
CLIENT_ID = os.environ.get('SPOTIFY_CLIENT_ID')
CLIENT_SECRET = os.environ.get('SPOTIFY_CLIENT_SECRET')
SCOPES = 'user-top-read'

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

# Get top artists and tracks for the given time range
def get_top_items(access_token: str, time_range: str, limit=10) -> tuple[dict, dict]:

    artists_url = f'https://api.spotify.com/v1/me/top/artists?time_range={time_range}&limit={limit}&offset=0'
    tracks_url = f'https://api.spotify.com/v1/me/top/tracks?time_range={time_range}&limit={limit}&offset=0'

    artists_data = []
    tracks_data = []
    
    headers = { 'Authorization': f'Bearer {access_token}' }
    
    artists_response = requests.get(artists_url, headers=headers)
    
    if artists_response.status_code == 200:
        artists_data = artists_response.json()
    else:
        print(f'Error getting artists: {artists_response.status_code}')
        raise Exception('Failed to get your top data.')
    
    tracks_response = requests.get(tracks_url, headers=headers)
    
    if tracks_response.status_code == 200:
        tracks_data = tracks_response.json()
    else:
        print(f'Error getting tracks: {tracks_response.status_code}')
        raise Exception('Failed to get your top data.')
    
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
            link = item['href'].replace('https://api.spotify.com/v1/artists', 'https://open.spotify.com/artist')
            image = item['images'][0]['url'] if item['images'] else None

            row = [id, name, genres, popularity, followers, link, image]
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

            release_date = item['album']['release_date']
            popularity = item['popularity']
            link = item['href'].replace('https://api.spotify.com/v1/tracks', 'https://open.spotify.com/track')
            image = item['album']['images'][0]['url'] if item['album']['images'] else None

            row = [id, name, artists, release_date, popularity, link, image]
            final_tracks.loc[len(final_tracks)] = row

        total_tracks = tracks_data.get('total', 0)
    except Exception as e:
        print(f'Error when parsing track data: {e}')
        raise e

    return final_tracks, total_tracks