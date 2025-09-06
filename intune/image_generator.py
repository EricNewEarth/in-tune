import os
import requests
import pandas as pd
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont

def create_share_image(final_artists: pd.DataFrame, final_tracks: pd.DataFrame, total_artists: int, total_tracks: int) -> BytesIO:

    width, height = 1080, 1920
    image = Image.new('RGB', (width, height), color='#191414')
    draw = ImageDraw.Draw(image)
    
    try:
        app_root = os.path.dirname(os.path.abspath(__file__))
        
        title_font = ImageFont.truetype(os.path.join(app_root, 'static/fonts/Montserrat-Bold.ttf'), 48)
        section_font = ImageFont.truetype(os.path.join(app_root, 'static/fonts/Montserrat-SemiBold.ttf'), 42)
        item_font = ImageFont.truetype(os.path.join(app_root, 'static/fonts/Montserrat-Medium.ttf'), 36)
        small_font = ImageFont.truetype(os.path.join(app_root, 'static/fonts/Montserrat-Regular.ttf'), 28)
        
    except Exception as e:
        print(f'Font loading failed: {e}')
        try:
            # Try system fonts first
            title_font = ImageFont.truetype('arial.ttf', 48)
            section_font = ImageFont.truetype('arial.ttf', 42)
            item_font = ImageFont.truetype('arial.ttf', 36)
            small_font = ImageFont.truetype('arial.ttf', 28)
        except:
            # Final fallback to default
            title_font = ImageFont.load_default()
            section_font = ImageFont.load_default()
            item_font = ImageFont.load_default()
            small_font = ImageFont.load_default()
    
    # Colors
    spotify_green = '#1DB954'
    white = '#FFFFFF'
    gray = '#B3B3B3'
    
    # Add InTune logo
    try:
        logo = Image.open('static/images/intune.png')
        logo_size = 150
        logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)

        # Paste logo in top left corner
        image.paste(logo, (25, 25), logo if logo.mode == 'RGBA' else None)
    except Exception as e:
        print(f'Could not load logo: {e}')
    
    # Header section
    draw.text((540, 100), 'My Last Month of Listening', font=title_font, fill=white, anchor='mm')
    
    # Top artists section
    y_offset = 215
    draw.text((200, y_offset), 'Top Artists', font=section_font, fill=spotify_green, anchor='mm')
    draw.text((825, y_offset), f'{total_artists} Total Artists', font=section_font, fill=spotify_green, anchor='mm')
    y_offset += 50

    # Add top 5 artists with images
    for i, artist in enumerate(final_artists.head(5).iterrows()):

        artist_data = artist[1]

        if not str(artist_data['id']).startswith('placeholder'):

            # Truncate long artist names
            artist_name = artist_data['name']
            if len(artist_name) > 45:
                artist_name = artist_name[:42] + '...'
            
            # Try to load and display artist image
            artist_image = None
            if artist_data.get('image'):
                artist_image = download_image_from_url(artist_data['image'])
            
            if artist_image:

                # Resize artist image
                img_size = 125
                artist_image = artist_image.resize((img_size, img_size), Image.Resampling.LANCZOS)
                
                # Paste square artist image
                image.paste(artist_image, (80, y_offset))
                
                # Adjust text position to account for image
                number_x = 225
                text_x = 275
            else:
                # If no image is available, adjust positioning
                number_x = 100
                text_x = 150
            
            draw.text((number_x, y_offset + 40), f'{i+1}.', font=item_font, fill=gray)
            draw.text((text_x, y_offset + 40), artist_name, font=item_font, fill=white)
            y_offset += 150 # Padding between items
    
    # Top tracks section
    y_offset += 25
    draw.text((200, y_offset), 'Top Tracks', font=section_font, fill=spotify_green, anchor='mm')
    draw.text((825, y_offset), f'{total_tracks} Total Tracks', font=section_font, fill=spotify_green, anchor='mm')
    y_offset += 50

    # Add top 5 tracks with album art
    for i, track in enumerate(final_tracks.head(5).iterrows()):

        track_data = track[1]

        if not str(track_data['id']).startswith('placeholder'):

            track_name = track_data['name']
            artists = track_data['artists']
            
            # Format artist names
            if isinstance(artists, list):
                artist_names = ', '.join(artists)
            else:
                artist_names = str(artists)
            
            # Try to load and display album art
            album_image = None
            if track_data.get('image'):
                album_image = download_image_from_url(track_data['image'])
            
            if album_image:

                # Resize album art
                img_size = 125
                album_image = album_image.resize((img_size, img_size), Image.Resampling.LANCZOS)
                
                # Paste square album art
                image.paste(album_image, (80, y_offset))
                
                # Adjust text position to account for image
                number_x = 225
                text_x = 275
            else:
                # If no image is available, adjust positioning
                number_x = 100
                text_x = 150
            
            # Truncate long track and artist names
            if len(track_name) > 45:
                track_name = track_name[:42] + '...'
            if len(artist_names) > 50:  
                artist_names = artist_names[:47] + '...'
            
            # Draw track number, name, and artists
            draw.text((number_x, y_offset + 40), f'{i+1}.', font=item_font, fill=gray)
            draw.text((text_x, y_offset + 25), track_name, font=item_font, fill=white)
            draw.text((text_x, y_offset + 65), artist_names, font=small_font, fill=gray)
            y_offset += 150 # Padding between items
    
    # Footer section
    footer_y = height - 75
    draw.text((540, footer_y), 'Created with InTune', font=small_font, fill=gray, anchor='mm')
    draw.text((540, footer_y + 40), 'https://in-tune.app', font=small_font, fill=spotify_green, anchor='mm')
    
    # Save image to buffer
    img_buffer = BytesIO()
    image.save(img_buffer, format='PNG', quality=95)
    img_buffer.seek(0)
    return img_buffer

def download_image_from_url(url):
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            return Image.open(BytesIO(response.content))
    except:
        pass
    return None