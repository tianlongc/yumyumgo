export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { query, lat, lng, distance, craving } = req.body;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GOOGLE_PLACES_API_KEY' });
  }

  const isDistant = distance === 'Distant';
  const radiusMeters = isDistant ? 10000.0 : 2000.0;

  const mapLegacyPlaceToNew = (place: any) => ({
    id: place.place_id,
    displayName: {
      text: place.name
    },
    formattedAddress: place.formatted_address || place.vicinity || '',
    types: place.types || [],
    photoReference: place.photos && place.photos.length > 0 ? place.photos[0].photo_reference : null,
    rating: place.rating || 0,
    userRatingCount: place.user_ratings_total || 0
  });

  const fetchLegacyTextSearch = async (q: string) => {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(q)}&key=${apiKey}`;
    const response = await fetch(url);
    const resultData = await response.json();
    if (resultData.status === 'OK' && Array.isArray(resultData.results)) {
      return resultData.results.map(mapLegacyPlaceToNew);
    }
    throw new Error(resultData.error_message || `Legacy Text Search status: ${resultData.status}`);
  };

  const fetchLegacyNearbySearch = async (latitude: number, longitude: number) => {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=${radiusMeters}&type=restaurant&key=${apiKey}`;
    const response = await fetch(url);
    const resultData = await response.json();
    if (resultData.status === 'OK' && Array.isArray(resultData.results)) {
      return resultData.results.map(mapLegacyPlaceToNew);
    }
    throw new Error(resultData.error_message || `Legacy Nearby Search status: ${resultData.status}`);
  };

  try {
    let places: any[] = [];

    if (query) {
      // Try New Places API Text Search first
      let newApiSucceeded = false;
      try {
        const url = `https://places.googleapis.com/v1/places:searchText`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount',
          },
          body: JSON.stringify({
            textQuery: craving ? `${craving} restaurants in ${query}` : `restaurants in ${query}`,
            includedType: 'restaurant',
            maxResultCount: 20,
          }),
          signal: AbortSignal.timeout(2500) // fail fast if hanging
        });
        const data = await response.json();
        
        if (response.ok && data && data.places && Array.isArray(data.places)) {
          places = data.places.map((place: any) => ({
            id: place.id,
            displayName: place.displayName,
            formattedAddress: place.formattedAddress,
            types: place.types,
            photoReference: place.photos && place.photos.length > 0 ? place.photos[0].name : null,
            rating: place.rating || 0,
            userRatingCount: place.userRatingCount || 0
          }));
          newApiSucceeded = true;
        } else {
          console.warn(`Google Places API (New) Text Search failed: ${data.error?.message || 'Unknown error'}`);
        }
      } catch (err: any) {
        console.warn('Google Places API (New) Text Search threw error or timed out:', err.message);
      }

      if (!newApiSucceeded) {
        console.log('Attempting Legacy Text Search fallback...');
        const legacyQuery = craving ? `${craving} restaurants in ${query}` : `restaurants in ${query}`;
        places = await fetchLegacyTextSearch(legacyQuery);
      }

    } else if (lat && lng) {
      if (craving) {
        // GPS + Craving = Text Search with locationBias
        let newApiSucceeded = false;
        try {
          const url = `https://places.googleapis.com/v1/places:searchText`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount',
            },
            body: JSON.stringify({
              textQuery: `${craving} restaurants`,
              includedType: 'restaurant',
              maxResultCount: 20,
              locationBias: {
                circle: {
                  center: { latitude: lat, longitude: lng },
                  radius: radiusMeters,
                },
              },
            }),
            signal: AbortSignal.timeout(2500)
          });
          const data = await response.json();
          
          if (response.ok && data && data.places && Array.isArray(data.places)) {
            places = data.places.map((place: any) => ({
              id: place.id,
              displayName: place.displayName,
              formattedAddress: place.formattedAddress,
              types: place.types,
              photoReference: place.photos && place.photos.length > 0 ? place.photos[0].name : null,
              rating: place.rating || 0,
              userRatingCount: place.userRatingCount || 0
            }));
            newApiSucceeded = true;
          } else {
            console.warn(`Google Places API (New) GPS Text Search failed: ${data.error?.message || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.warn('Google Places API (New) GPS Text Search threw error or timed out:', err.message);
        }

        if (!newApiSucceeded) {
          console.log('Attempting Legacy Text Search fallback for GPS...');
          const legacyQuery = `${craving} restaurants`;
          const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(legacyQuery)}&location=${lat},${lng}&radius=${radiusMeters}&key=${apiKey}`;
          const response = await fetch(url);
          const resultData = await response.json();
          if (resultData.status === 'OK' && Array.isArray(resultData.results)) {
            places = resultData.results.map(mapLegacyPlaceToNew);
          } else {
            throw new Error(resultData.error_message || `Legacy GPS Text Search status: ${resultData.status}`);
          }
        }
      } else {
        // Try New Places API Nearby Search first (no craving)
        let newApiSucceeded = false;
        try {
          const url = `https://places.googleapis.com/v1/places:searchNearby`;
          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.photos,places.rating,places.userRatingCount',
            },
            body: JSON.stringify({
              includedTypes: ['restaurant'],
              maxResultCount: 20,
              locationRestriction: {
                circle: {
                  center: {
                    latitude: lat,
                    longitude: lng,
                  },
                  radius: radiusMeters,
                },
              },
            }),
            signal: AbortSignal.timeout(2500) // fail fast if hanging
          });
          const data = await response.json();
          
          if (response.ok && data && data.places && Array.isArray(data.places)) {
            places = data.places.map((place: any) => ({
              id: place.id,
              displayName: place.displayName,
              formattedAddress: place.formattedAddress,
              types: place.types,
              photoReference: place.photos && place.photos.length > 0 ? place.photos[0].name : null,
              rating: place.rating || 0,
              userRatingCount: place.userRatingCount || 0
            }));
            newApiSucceeded = true;
          } else {
            console.warn(`Google Places API (New) Nearby Search failed: ${data.error?.message || 'Unknown error'}`);
          }
        } catch (err: any) {
          console.warn('Google Places API (New) Nearby Search threw error or timed out:', err.message);
        }

        if (!newApiSucceeded) {
          console.log('Attempting Legacy Nearby Search fallback...');
          places = await fetchLegacyNearbySearch(lat, lng);
        }
      }

    } else {
      return res.status(400).json({ error: 'Must provide either query or lat/lng' });
    }

    const seen = new Set();
    const deduplicatedPlaces = places.filter(p => {
      if (!p || !p.id) return false;
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return res.status(200).json({ places: deduplicatedPlaces });

  } catch (error: any) {
    console.error('All Places API attempts failed:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch places from all sources' });
  }
}

