// Custom page JavaScript functionality

// ========================================
// MODAL-BASED ITEM SELECTION
// ========================================

// Modal elements
const customModal = document.getElementById('customItemModal');
const modalTitle = document.getElementById('modalTitle');
const modalSearchInput = document.getElementById('modalSearchInput');
const modalClearSearch = document.getElementById('modalClearSearch');
const modalSearchResults = document.getElementById('modalSearchResults');
const modalSelectionPreview = document.getElementById('modalSelectionPreview');
const modalCancelBtn = document.getElementById('modalCancelBtn');
const modalSaveBtn = document.getElementById('modalSaveBtn');
const modalCloseBtn = document.querySelector('.custom-modal-close');

// Current modal state
let currentCardType = null; // 'artist' or 'track'
let currentCardIndex = null;
let currentSelection = null;

// Search debouncing
let searchTimeout = null;
const SEARCH_DELAY = 500; // Wait 500ms after user stops typing

function initializeCardInteractions() {
    console.log('Initializing card interactions...');
    
    // Add hover and click handlers to placeholder cards
    const placeholderCards = document.querySelectorAll('.placeholder-card');
    
    console.log(`Found ${placeholderCards.length} placeholder cards`);
    
    placeholderCards.forEach((card, index) => {
        const addBtn = card.querySelector('.card-add-btn');
        
        if (!addBtn) {
            console.warn(`No add button found for card ${index}`);
            return;
        }
        
        console.log(`Setting up card ${index}:`, {
            cardType: card.getAttribute('data-card-type'),
            cardIndex: card.getAttribute('data-card-index')
        });

        // Show add button on hover
        card.addEventListener('mouseenter', function() {
            console.log(`Mouse enter on card ${index}`);
            if (this.classList.contains('placeholder-card')) {
                addBtn.style.display = 'flex';
                addBtn.style.opacity = '1';
                console.log('Showing add button');
            }
        });

        card.addEventListener('mouseleave', function() {
            console.log(`Mouse leave on card ${index}`);
            if (this.classList.contains('placeholder-card')) {
                addBtn.style.display = 'none';
                addBtn.style.opacity = '0';
                console.log('Hiding add button');
            }
        });

        // Add button click handler
        addBtn.addEventListener('click', function(e) {
            console.log(`Add button clicked on card ${index}`);
            e.stopPropagation();
            e.preventDefault();
            openCustomModal(card);
        });

        // Also allow clicking the entire card to open modal
        card.addEventListener('click', function(e) {
            console.log(`Card ${index} clicked`);
            if (this.classList.contains('placeholder-card')) {
                e.preventDefault();
                openCustomModal(card);
            }
        });
    });

    // Add hover handlers for delete buttons (for cards with content)
    const allCards = document.querySelectorAll('.card');
    allCards.forEach((card, index) => {
        const deleteBtn = card.querySelector('.card-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function(e) {
                console.log(`Delete button clicked on card ${index}`);
                e.stopPropagation();
                e.preventDefault();
                clearCard(card);
            });
        }
    });
}

function openCustomModal(card) {
    console.log('Opening modal for card:', card);
    
    const cardType = card.getAttribute('data-card-type');
    const cardIndex = card.getAttribute('data-card-index');
    
    console.log('Modal data:', { cardType, cardIndex });
    
    currentCardType = cardType;
    currentCardIndex = cardIndex;
    currentSelection = null;

    // Update modal title and placeholder text
    if (cardType === 'artist') {
        modalTitle.textContent = 'Add Artist';
        modalSearchInput.placeholder = 'Search for artists...';
    } else {
        modalTitle.textContent = 'Add Track';
        modalSearchInput.placeholder = 'Search for tracks...';
    }

    // Reset modal state
    resetModalState();
    
    // Show modal
    customModal.style.display = 'block';
    
    // Focus on search input after a brief delay
    setTimeout(() => {
        if (modalSearchInput) {
            modalSearchInput.focus();
        }
    }, 100);
}

function resetModalState() {
    if (modalSearchInput) modalSearchInput.value = '';
    if (modalClearSearch) modalClearSearch.style.display = 'none';
    if (modalSaveBtn) modalSaveBtn.disabled = true;
    currentSelection = null;
    
    // Reset search results
    if (modalSearchResults) {
        modalSearchResults.innerHTML = `
            <div class="modal-no-search">
                <i class="fas fa-search"></i>
                <p>Start typing to search for items...</p>
            </div>
        `;
    }
    
    // Reset selection preview
    if (modalSelectionPreview) {
        modalSelectionPreview.innerHTML = `
            <div class="modal-no-selection">
                <i class="fas fa-plus-circle"></i>
                <p>No item selected</p>
            </div>
        `;
    }
}

function closeCustomModal() {
    if (customModal) {
        customModal.style.display = 'none';
    }
    resetModalState();
    currentCardType = null;
    currentCardIndex = null;
    currentSelection = null;
    
    // Clear any pending search timeouts
    if (searchTimeout) {
        clearTimeout(searchTimeout);
        searchTimeout = null;
    }
}

// ========================================
// SPOTIFY SEARCH FUNCTIONALITY
// ========================================

async function performModalSearch(query) {
    if (query.length < 2) {
        if (modalSearchResults) {
            modalSearchResults.innerHTML = `
                <div class="modal-no-search">
                    <i class="fas fa-search"></i>
                    <p>Start typing to search for items...</p>
                </div>
            `;
        }
        return;
    }

    // Show loading state
    if (modalSearchResults) {
        modalSearchResults.innerHTML = `
            <div class="modal-loading">
                <i class="fas fa-spinner fa-spin"></i>
                <span>Searching for ${currentCardType}s...</span>
            </div>
        `;
    }

    try {
        const searchType = currentCardType; // 'artist' or 'track'
        const results = await searchSpotify(query, searchType);
        displaySearchResults(results);
    } catch (error) {
        console.error('Search error:', error);
        showSearchError(error.message);
    }
}

async function searchSpotify(query, type) {
    // Make API request to your Flask backend which will handle the Spotify API call
    const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: query,
            type: type,
            limit: 10
        })
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Search failed');
    }

    return await response.json();
}

// Helper function to format follower counts with commas
function formatFollowerCount(count) {
    if (typeof count === 'number') {
        return count.toLocaleString();
    }
    return count;
}

// Helper function to format track release date
function formatTrackReleaseDate(album) {
    if (!album || !album.release_date) {
        return new Date().getFullYear().toString();
    }
    
    const releaseDate = album.release_date;
    const parts = releaseDate.split('-');
    
    // Handle different date formats
    if (parts.length === 3) {
        // YYYY-MM-DD format
        const year = parts[0];
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);
        return `${month}/${day}/${year}`;
    } else if (parts.length === 2) {
        // YYYY-MM format
        const year = parts[0];
        const month = parseInt(parts[1]);
        return `${month}/1/${year}`;
    } else {
        // YYYY format or fallback
        return parts[0] || new Date().getFullYear().toString();
    }
}

function displaySearchResults(results) {
    if (!results || !results.items || results.items.length === 0) {
        if (modalSearchResults) {
            modalSearchResults.innerHTML = `
                <div class="modal-no-search">
                    <i class="fas fa-search"></i>
                    <p>No ${currentCardType}s found for this search</p>
                </div>
            `;
        }
        return;
    }

    const isArtist = currentCardType === 'artist';
    let resultsHTML = '';
    
    results.items.forEach(item => {
        // Extract relevant data based on type
        const itemData = {
            id: item.id,
            name: item.name,
            image: null,
            subtitle: '',
            popularity: item.popularity || 0
        };

        if (isArtist) {
            // Artist-specific data
            itemData.image = item.images && item.images.length > 0 ? item.images[0].url : null;
            itemData.subtitle = item.followers ? formatFollowerCount(item.followers.total) : 'No follower data';
            itemData.genres = item.genres || [];
            itemData.followers = item.followers ? item.followers.total : 0;
        } else {
            // Track-specific data
            itemData.image = item.album && item.album.images && item.album.images.length > 0 ? item.album.images[0].url : null;
            itemData.subtitle = item.artists ? item.artists.map(a => a.name).join(', ') : 'Unknown artist';
            itemData.album = item.album ? item.album.name : '';
            itemData.artists = item.artists ? item.artists.map(a => a.name) : ['Unknown artist'];
            itemData.release_date = formatTrackReleaseDate(item.album);
        }

        resultsHTML += `
            <div class="modal-result-item" data-item-id="${item.id}" data-item-data='${JSON.stringify(itemData)}'>
                ${itemData.image ? 
                    `<img src="${itemData.image}" alt="${itemData.name}" class="modal-result-image">` :
                    `<div class="modal-result-placeholder-img">
                        <i class="fas fa-${isArtist ? 'user' : 'music'}"></i>
                    </div>`
                }
                <div class="modal-result-content">
                    <div class="modal-result-title">${itemData.name}</div>
                    <div class="modal-result-subtitle">${itemData.subtitle}</div>
                </div>
                <div class="modal-result-popularity">${itemData.popularity}/100</div>
            </div>
        `;
    });

    if (modalSearchResults) {
        modalSearchResults.innerHTML = resultsHTML;
    }

    // Add click handlers to result items
    const resultItems = modalSearchResults.querySelectorAll('.modal-result-item');
    resultItems.forEach(item => {
        item.addEventListener('click', function() {
            selectModalItem(this);
        });
    });
}

function showSearchError(errorMessage) {
    if (modalSearchResults) {
        modalSearchResults.innerHTML = `
            <div class="modal-no-search">
                <i class="fas fa-exclamation-triangle"></i>
                <p>Search error: ${errorMessage}</p>
                <p style="font-size: 0.8rem; margin-top: 0.5rem;">Please try again</p>
            </div>
        `;
    }
}

function selectModalItem(itemElement) {
    // Remove previous selection
    const previousSelected = modalSearchResults.querySelector('.modal-result-item.selected');
    if (previousSelected) {
        previousSelected.classList.remove('selected');
    }

    // Select current item
    itemElement.classList.add('selected');
    
    // Parse item data
    const itemData = JSON.parse(itemElement.getAttribute('data-item-data'));
    currentSelection = itemData;

    // Update selection preview
    updateSelectionPreview(itemData);
    
    // Enable save button
    if (modalSaveBtn) {
        modalSaveBtn.disabled = false;
    }
}

function updateSelectionPreview(itemData) {
    const isArtist = currentCardType === 'artist';
    
    if (modalSelectionPreview) {
        modalSelectionPreview.innerHTML = `
            <div class="modal-result-item selected">
                ${itemData.image ? 
                    `<img src="${itemData.image}" alt="${itemData.name}" class="modal-result-image">` :
                    `<div class="modal-result-placeholder-img">
                        <i class="fas fa-${isArtist ? 'user' : 'music'}"></i>
                    </div>`
                }
                <div class="modal-result-content">
                    <div class="modal-result-title">${itemData.name}</div>
                    <div class="modal-result-subtitle">${itemData.subtitle}</div>
                </div>
                <div class="modal-result-popularity">${itemData.popularity}/100</div>
            </div>
        `;
    }
}

function saveModalSelection() {
    if (!currentSelection) return;

    // Find the target card
    const targetCard = document.querySelector(`[data-card-type="${currentCardType}"][data-card-index="${currentCardIndex}"]`);
    if (!targetCard) return;

    // Update card with selected item
    populateCard(targetCard, currentSelection);
    
    // Update average popularity scores
    setTimeout(() => {
        updatePopularityAverages();
    }, 0);
    
    // Close modal
    closeCustomModal();
}

function populateCard(card, itemData) {
    const isArtist = currentCardType === 'artist';
    
    // Remove placeholder class
    card.classList.remove('placeholder-card');
    card.classList.remove('custom-placeholder-card');
    card.classList.add('custom-populated-card');
    
    // Update card content
    const cardImageContainer = card.querySelector('.card-image');
    const cardTitle = card.querySelector(isArtist ? '.artist-name' : '.track-name');
    const cardTags = card.querySelector('.tags');
    const cardStats = card.querySelectorAll('.stat span');
    const cardLink = card.querySelector('.spotify-link-placeholder');
    const deleteBtn = card.querySelector('.card-delete-btn');
    
    // Update image
    if (cardImageContainer) {
        if (itemData.image) {
            cardImageContainer.innerHTML = `<img src="${itemData.image}" alt="${itemData.name}">`;
        } else {
            cardImageContainer.innerHTML = `
                <div class="placeholder-image">
                    <i class="fas fa-${isArtist ? 'user' : 'music'}"></i>
                </div>
            `;
        }
    }
    
    // Update title
    if (cardTitle) {
        cardTitle.textContent = itemData.name;
        cardTitle.style.color = 'white';
        cardTitle.style.fontStyle = 'normal';
    }
    
    // Update tags
    if (cardTags) {
        cardTags.innerHTML = ''; // Clear existing tags
        
        if (isArtist && itemData.genres && itemData.genres.length > 0) {
            // Show multiple genres for artists
            itemData.genres.slice(0, 3).forEach(genre => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = genre;
                tag.style.backgroundColor = 'rgba(29, 185, 84, 0.3)';
                tag.style.color = 'var(--spotify-green)';
                tag.style.border = 'none';
                cardTags.appendChild(tag);
            });
        } else if (!isArtist && itemData.artists && itemData.artists.length > 0) {
            // Show artists for tracks
            itemData.artists.slice(0, 2).forEach(artist => {
                const tag = document.createElement('span');
                tag.className = 'tag';
                tag.textContent = artist;
                tag.style.backgroundColor = 'rgba(29, 185, 84, 0.3)';
                tag.style.color = 'var(--spotify-green)';
                tag.style.border = 'none';
                cardTags.appendChild(tag);
            });
        } else {
            // Fallback tag
            const tag = document.createElement('span');
            tag.className = 'tag';
            tag.textContent = isArtist ? 'No genres listed' : 'No artists listed';
            tag.style.backgroundColor = 'rgba(29, 185, 84, 0.3)';
            tag.style.color = 'var(--spotify-green)';
            tag.style.border = 'none';
            cardTags.appendChild(tag);
        }
    }
    
    // Update stats
    if (cardStats.length >= 2) {
        cardStats[0].textContent = `${itemData.popularity}/100`;
        if (isArtist) {
            cardStats[1].textContent = formatFollowerCount(itemData.followers || 0);
        } else {
            cardStats[1].textContent = itemData.release_date;
        }
    }
    
    // Update link - FIX: Create proper anchor element
    if (cardLink) {
        // Replace the existing element with a proper anchor
        const newLink = document.createElement('a');
        newLink.innerHTML = `<i class="fab fa-spotify"></i> Open in Spotify`;
        newLink.href = `https://open.spotify.com/${isArtist ? 'artist' : 'track'}/${itemData.id}`;
        newLink.target = '_blank';
        newLink.className = 'spotify-link';
        newLink.style.backgroundColor = 'var(--spotify-green)';
        newLink.style.color = 'white';
        newLink.style.border = 'none';
        newLink.style.display = 'block';
        newLink.style.textAlign = 'center';
        newLink.style.padding = '0.5rem';
        newLink.style.borderRadius = '4px';
        newLink.style.textDecoration = 'none';
        newLink.style.fontSize = '0.9rem';
        newLink.style.transition = 'background-color 0.3s ease';
        
        // Add hover effect
        newLink.addEventListener('mouseenter', function() {
            this.style.backgroundColor = '#1ed760';
        });
        
        newLink.addEventListener('mouseleave', function() {
            this.style.backgroundColor = 'var(--spotify-green)';
        });
        
        // Replace the old element
        cardLink.parentNode.replaceChild(newLink, cardLink);
    }
    
    // Show delete button
    if (deleteBtn) {
        deleteBtn.style.display = 'flex';
    }
    
    // Hide add button since card is no longer a placeholder
    const addBtn = card.querySelector('.card-add-btn');
    if (addBtn) {
        addBtn.style.display = 'none';
    }
    
    console.log(`Added ${currentCardType}: ${itemData.name} to position ${currentCardIndex}`);
}

function clearCard(card) {
    const cardType = card.getAttribute('data-card-type');
    const cardIndex = card.getAttribute('data-card-index');
    const isArtist = cardType === 'artist';
    
    // Add placeholder class back
    card.classList.add('placeholder-card');
    card.classList.add('custom-placeholder-card');
    card.classList.remove('custom-populated-card');
    
    // Reset card content to match initial state exactly
    const cardImageContainer = card.querySelector('.card-image');
    const cardTitle = card.querySelector(isArtist ? '.artist-name' : '.track-name');
    const cardTags = card.querySelector('.tags');
    const cardStats = card.querySelectorAll('.stat span');
    const cardLink = card.querySelector('.spotify-link, .spotify-link-placeholder');
    const deleteBtn = card.querySelector('.card-delete-btn');
    const addBtn = card.querySelector('.card-add-btn');
    
    // Reset image to placeholder - target the container and replace all content
    if (cardImageContainer) {
        cardImageContainer.innerHTML = `
            <div class="placeholder-image">
                <i class="fas fa-${isArtist ? 'user' : 'music'}"></i>
            </div>
        `;
    }
    
    // Reset title to match initial state
    if (cardTitle) {
        cardTitle.textContent = isArtist ? 'Artist Name' : 'Track Name';
        cardTitle.style.color = '';
        cardTitle.style.fontStyle = '';
    }
    
    // Reset tags to match initial state
    if (cardTags) {
        cardTags.innerHTML = `<span class="tag">${isArtist ? 'Genre' : 'Artist'}</span>`;
        const tag = cardTags.querySelector('.tag');
        if (tag) {
            tag.style.backgroundColor = '';
            tag.style.color = '';
            tag.style.border = '';
            tag.className = 'tag'; // Reset to default tag class
        }
    }
    
    // Reset stats to match initial state
    if (cardStats.length >= 2) {
        cardStats[0].textContent = '--/100';
        cardStats[0].style.color = '';
        
        if (isArtist) {
            cardStats[1].textContent = '--';
        } else {
            cardStats[1].textContent = '--/--/----';
        }
        cardStats[1].style.color = '';
    }
    
    // Reset all stat containers
    const statContainers = card.querySelectorAll('.stat');
    statContainers.forEach(stat => {
        stat.style.color = '';
    });
    
    // Reset link to match initial state - create proper div element
    if (cardLink) {
        const newLinkPlaceholder = document.createElement('div');
        newLinkPlaceholder.innerHTML = '<i class="fab fa-spotify"></i>';
        newLinkPlaceholder.className = 'spotify-link-placeholder';
        newLinkPlaceholder.style.backgroundColor = '';
        newLinkPlaceholder.style.color = '';
        newLinkPlaceholder.style.border = '';
        newLinkPlaceholder.style.display = '';
        
        // Replace the existing element
        cardLink.parentNode.replaceChild(newLinkPlaceholder, cardLink);
    }
    
    // Hide delete button and reset visibility properties
    if (deleteBtn) {
        deleteBtn.style.display = 'none';
        deleteBtn.style.opacity = '';
        deleteBtn.style.transform = '';
        deleteBtn.style.visibility = '';
    }
    
    // Reset add button visibility properties (hidden by default, shown on hover)
    if (addBtn) {
        addBtn.style.display = '';
        addBtn.style.opacity = '';
        addBtn.style.visibility = '';
        addBtn.style.transform = '';
    }
    
    // Update average popularity scores
    updatePopularityAverages();
    
    console.log(`Reset ${cardType} card at position ${cardIndex} to initial state`);
}

// Function to update popularity averages
function updatePopularityAverages() {
    console.log('Updating popularity averages...');
    
    // Get all populated artist and track cards
    const artistCards = document.querySelectorAll('[data-card-type="artist"]:not(.placeholder-card)');
    const trackCards = document.querySelectorAll('[data-card-type="track"]:not(.placeholder-card)');
    
    console.log('Artist cards found:', artistCards.length);
    console.log('Track cards found:', trackCards.length);
    
    // Calculate artist popularity average
    let artistPopularitySum = 0;
    let artistCount = 0;
    
    artistCards.forEach(card => {
        // Get all stat elements and find the one with the fire icon (popularity)
        const stats = card.querySelectorAll('.stat');
        stats.forEach(stat => {
            const icon = stat.querySelector('i.fa-fire');
            if (icon) {
                const popularityElement = stat.querySelector('span');
                if (popularityElement) {
                    const popularityText = popularityElement.textContent;
                    const popularity = parseInt(popularityText.split('/')[0]);
                    console.log('Found artist popularity:', popularity);
                    if (!isNaN(popularity) && popularity > 0) {
                        artistPopularitySum += popularity;
                        artistCount++;
                    }
                }
            }
        });
    });
    
    // Calculate track popularity average
    let trackPopularitySum = 0;
    let trackCount = 0;
    
    trackCards.forEach(card => {
        // Get all stat elements and find the one with the fire icon (popularity)
        const stats = card.querySelectorAll('.stat');
        stats.forEach(stat => {
            const icon = stat.querySelector('i.fa-fire');
            if (icon) {
                const popularityElement = stat.querySelector('span');
                if (popularityElement) {
                    const popularityText = popularityElement.textContent;
                    const popularity = parseInt(popularityText.split('/')[0]);
                    console.log('Found track popularity:', popularity);
                    if (!isNaN(popularity) && popularity > 0) {
                        trackPopularitySum += popularity;
                        trackCount++;
                    }
                }
            }
        });
    });
    
    console.log('Artist sum:', artistPopularitySum, 'Count:', artistCount);
    console.log('Track sum:', trackPopularitySum, 'Count:', trackCount);
    
    // FIXED: Use better selectors
    // Find the avg-popularity element in the section containing the artistGrid
    const artistGrid = document.getElementById('artistGrid');
    const artistSection = artistGrid ? artistGrid.closest('.stats-section') : null;
    const artistAvgElement = artistSection ? artistSection.querySelector('.avg-popularity') : null;
    
    // Find the avg-popularity element in the section containing the trackGrid
    const trackGrid = document.getElementById('trackGrid');
    const trackSection = trackGrid ? trackGrid.closest('.stats-section') : null;
    const trackAvgElement = trackSection ? trackSection.querySelector('.avg-popularity') : null;
    
    console.log('Artist avg element found:', !!artistAvgElement);
    console.log('Track avg element found:', !!trackAvgElement);
    
    if (artistAvgElement) {
        const avgArtistPopularity = artistCount > 0 ? Math.round((artistPopularitySum / artistCount) * 10) / 10 : 0;
        artistAvgElement.innerHTML = `<i class="fas fa-fire"></i> Avg Top Artist Popularity: ${avgArtistPopularity}/100
            <span class="tooltip-text">The lower the popularity, the more niche the artist!</span>`;
        console.log('Updated artist average to:', avgArtistPopularity);
    } else {
        console.error('ERROR: Could not find artist avg element!');
    }
    
    if (trackAvgElement) {
        const avgTrackPopularity = trackCount > 0 ? Math.round((trackPopularitySum / trackCount) * 10) / 10 : 0;
        trackAvgElement.innerHTML = `<i class="fas fa-fire"></i> Avg Top Track Popularity: ${avgTrackPopularity}/100
            <span class="tooltip-text">The lower the popularity, the more niche the track!</span>`;
        console.log('Updated track average to:', avgTrackPopularity);
    } else {
        console.error('ERROR: Could not find track avg element!');
    }
}

// Modal event listeners
function initializeModalEventHandlers() {
    console.log('Initializing modal event handlers...');
    
    // Search input handlers with debouncing
    if (modalSearchInput) {
        modalSearchInput.addEventListener('input', function() {
            const query = this.value.trim();
            console.log('Modal search input:', query);
            
            // Clear previous timeout
            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }
            
            if (query.length > 0) {
                if (modalClearSearch) modalClearSearch.style.display = 'flex';
                
                // Set new timeout for debounced search
                searchTimeout = setTimeout(() => {
                    performModalSearch(query);
                }, SEARCH_DELAY);
            } else {
                if (modalClearSearch) modalClearSearch.style.display = 'none';
                resetModalState();
            }
        });

        modalSearchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeCustomModal();
            }
        });
    }

    // Clear search button
    if (modalClearSearch) {
        modalClearSearch.addEventListener('click', function() {
            modalSearchInput.value = '';
            modalClearSearch.style.display = 'none';
            resetModalState();
            modalSearchInput.focus();
            
            // Clear any pending searches
            if (searchTimeout) {
                clearTimeout(searchTimeout);
                searchTimeout = null;
            }
        });
    }

    // Modal close handlers
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', closeCustomModal);
    }

    if (modalCancelBtn) {
        modalCancelBtn.addEventListener('click', closeCustomModal);
    }

    if (modalSaveBtn) {
        modalSaveBtn.addEventListener('click', saveModalSelection);
    }

    // Click outside modal to close
    if (customModal) {
        customModal.addEventListener('click', function(e) {
            if (e.target === customModal) {
                closeCustomModal();
            }
        });
    }

    // Prevent modal content clicks from closing modal
    const modalContent = document.querySelector('.custom-modal-content');
    if (modalContent) {
        modalContent.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    }

    // ESC key to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && customModal && customModal.style.display === 'block') {
            closeCustomModal();
        }
    });
}

// ========================================
// HEADER EDITING FUNCTIONALITY
// ========================================

function initializeHeaderEditing() {
    console.log('Initializing header editing...');
    
    const editableHeaders = document.querySelectorAll('.editable-header');
    console.log(`Found ${editableHeaders.length} editable headers`);

    editableHeaders.forEach(header => {
        const input = header.nextElementSibling;
        const headerText = header.querySelector('.header-text');
        const originalText = header.getAttribute('data-original');
        const fieldName = header.getAttribute('data-field');

        if (!input || !headerText) {
            console.warn('Missing input or header text element for:', header);
            return;
        }

        // Click to start editing
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            startEditing(header, input, headerText);
        });

        // Input event handlers
        input.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                finishEditing(header, input, headerText, fieldName);
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelEditing(header, input, headerText);
            }
        });

        // Add input event listener for auto-resizing
        input.addEventListener('input', function() {
            autoResizeInput(input);
        });

        input.addEventListener('blur', function() {
            // Small delay to allow for click events to register
            setTimeout(() => {
                if (header.classList.contains('editing')) {
                    finishEditing(header, input, headerText, fieldName);
                }
            }, 100);
        });

        // Prevent input clicks from bubbling up
        input.addEventListener('click', function(e) {
            e.stopPropagation();
        });
    });

    // Click outside to finish editing
    document.addEventListener('click', function(e) {
        const editingHeader = document.querySelector('.editable-header.editing');
        if (editingHeader && !editingHeader.contains(e.target)) {
            const input = editingHeader.nextElementSibling;
            const headerText = editingHeader.querySelector('.header-text');
            const fieldName = editingHeader.getAttribute('data-field');
            finishEditing(editingHeader, input, headerText, fieldName);
        }
    });
}

function startEditing(header, input, headerText) {
    console.log('Starting header edit');
    // Set input value to current text
    input.value = headerText.textContent.trim();
    
    // Show input, hide header
    header.classList.add('editing');
    header.style.opacity = '0';
    input.style.display = 'block';
    
    // Auto-resize input to fit current content
    autoResizeInput(input);

    // Completely hide the header after sizing is done
    header.style.visibility = 'hidden';
    
    input.focus();
    input.select();
}

function autoResizeInput(input) {
    // Create a temporary span to measure text width
    const tempSpan = document.createElement('span');
    tempSpan.style.visibility = 'hidden';
    tempSpan.style.position = 'absolute';
    tempSpan.style.whiteSpace = 'nowrap';
    tempSpan.style.fontSize = window.getComputedStyle(input).fontSize;
    tempSpan.style.fontFamily = window.getComputedStyle(input).fontFamily;
    tempSpan.style.fontWeight = window.getComputedStyle(input).fontWeight;
    tempSpan.textContent = input.value || input.placeholder || 'My Artists';
    
    document.body.appendChild(tempSpan);
    
    // Get the text width and add some padding
    const textWidth = tempSpan.offsetWidth;
    const minWidth = 150; // Minimum width in pixels
    const padding = 40; // Extra padding for comfort
    const newWidth = Math.max(minWidth, textWidth + padding);
    
    // Apply the new width
    input.style.width = newWidth + 'px';
    
    // Clean up
    document.body.removeChild(tempSpan);
}

function finishEditing(header, input, headerText, fieldName) {
    const newText = input.value.trim();
    const originalText = header.getAttribute('data-original');
    
    if (newText === '') {
        // If empty, revert to original text
        headerText.textContent = originalText;
        
        // Remove from localStorage since we're back to default
        removeHeaderText(fieldName);
        
        // Show revert indicator
        showRevertIndicator(header);
    } else if (newText !== headerText.textContent.trim()) {
        // Update the header text
        headerText.textContent = newText;
        
        // Save to localStorage/session for persistence
        saveHeaderText(fieldName, newText);
        
        // Show save indicator
        showSaveIndicator(header);
    }
    
    // Reset to display state - restore opacity and visibility
    header.classList.remove('editing');
    header.style.opacity = ''; // Reset opacity
    header.style.visibility = 'visible';
    input.style.display = 'none';
    input.style.width = ''; // Reset width
}

function cancelEditing(header, input, headerText) {
    // Reset to original state without saving
    header.classList.remove('editing');
    header.style.opacity = ''; // Reset opacity
    header.style.visibility = 'visible';
    input.style.display = 'none';
    input.style.width = ''; // Reset width
}

function saveHeaderText(fieldName, text) {
    // Save to localStorage for persistence
    try {
        let customHeaders = JSON.parse(localStorage.getItem('intune_custom_headers')) || {};
        customHeaders[fieldName] = text;
        localStorage.setItem('intune_custom_headers', JSON.stringify(customHeaders));
        console.log(`Saved header "${fieldName}": "${text}"`);
    } catch (e) {
        console.warn('Could not save header text to localStorage:', e);
    }
}

function removeHeaderText(fieldName) {
    // Remove custom header from localStorage to revert to default
    try {
        let customHeaders = JSON.parse(localStorage.getItem('intune_custom_headers')) || {};
        delete customHeaders[fieldName];
        localStorage.setItem('intune_custom_headers', JSON.stringify(customHeaders));
        console.log(`Reverted header "${fieldName}" to default`);
    } catch (e) {
        console.warn('Could not remove header text from localStorage:', e);
    }
}

function loadSavedHeaders() {
    // Load saved headers from localStorage
    try {
        const customHeaders = JSON.parse(localStorage.getItem('intune_custom_headers')) || {};
        
        const editableHeaders = document.querySelectorAll('.editable-header');
        editableHeaders.forEach(header => {
            const fieldName = header.getAttribute('data-field');
            const savedText = customHeaders[fieldName];
            
            if (savedText) {
                const headerText = header.querySelector('.header-text');
                if (headerText) {
                    headerText.textContent = savedText;
                }
            }
        });
    } catch (e) {
        console.warn('Could not load saved headers from localStorage:', e);
    }
}

function showSaveIndicator(header) {
    // Brief visual feedback that save was successful
    const originalColor = header.style.color;
    header.style.color = 'var(--spotify-green)';
    
    setTimeout(() => {
        header.style.color = originalColor;
    }, 1000);
}

function showRevertIndicator(header) {
    // Brief visual feedback that header was reverted to default
    const originalColor = header.style.color;
    header.style.color = 'var(--spotify-green)';
    
    setTimeout(() => {
        header.style.color = originalColor;
    }, 1000);
}

// ========================================
// INITIALIZATION
// ========================================
    
document.addEventListener('DOMContentLoaded', function() {
    console.log('Custom page DOM loaded, initializing...');
    
    // Initialize all functionality
    initializeHeaderEditing();
    initializeCardInteractions();
    initializeModalEventHandlers();
    loadSavedHeaders();
    
    // Set initial popularity averages to 0
    updatePopularityAverages();
    
    console.log('Custom page initialized successfully');
    
    // Debug: Log all placeholder cards and their buttons
    setTimeout(() => {
        const cards = document.querySelectorAll('.placeholder-card');
        console.log('Debug - Placeholder cards check:');
        cards.forEach((card, index) => {
            const addBtn = card.querySelector('.card-add-btn');
            console.log(`Card ${index}:`, {
                hasAddBtn: !!addBtn,
                cardType: card.getAttribute('data-card-type'),
                cardIndex: card.getAttribute('data-card-index')
            });
        });
    }, 500);
});
