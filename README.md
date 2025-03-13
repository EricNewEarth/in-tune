# InTune - Your Personal Spotify Insights

![InTune Logo](intune/static/images/intune-full.png)

## Overview

InTune is a web application that connects with the Spotify API to provide personalized insights about your listening habits. The app displays your top artists and tracks over different time periods, allowing you to discover patterns in your music preferences and explore your unique music taste profile.

## Features

- **Personalized Listening Stats**: View your top artists and tracks based on your actual Spotify listening data
- **Multiple Time Ranges**: Toggle between different time periods (last month, 6 months, or year) to see how your music taste evolves
- **Genre Analysis**: Identify your most listened-to music genres
- **Popularity Metrics**: See how mainstream or niche your music taste is with popularity scores
- **Spotify Integration**: Easily open any artist or track in Spotify directly from InTune

## How It Works

InTune uses the Spotify Web API to securely access your listening data. The application follows these steps:

1. **Authentication**: Users authenticate with their Spotify account using OAuth 2.0
2. **Data Collection**: The app retrieves your top artists and tracks from Spotify's API
3. **Data Analysis**: InTune processes the raw data to extract insights like genre patterns and popularity metrics
4. **Visualization**: The processed data is displayed in a clean, intuitive interface with artist/track cards

## Technical Details

InTune is built with the following technologies:

- **Backend**: Python with Flask web framework
- **Frontend**: HTML, CSS, and JavaScript
- **API Integration**: Spotify Web API
- **Deployment**: Vercel serverless platform

## Acknowledgments

- Powered by the [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- Created by [Eric Terranova](https://www.ericterranova.com)

---

This application is not affiliated with, maintained, authorized, endorsed, or sponsored by Spotify.
