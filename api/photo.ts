export default async function handler(req: any, res: any) {
  const { photoReference } = req.query;
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing GOOGLE_PLACES_API_KEY' });
  }

  if (!photoReference) {
    return res.status(400).json({ error: 'Missing photoReference parameter' });
  }

  try {
    let url = '';
    const isNewApiPhoto = photoReference.startsWith('places/');

    if (isNewApiPhoto) {
      // New Places API Photo endpoint
      url = `https://places.googleapis.com/v1/${photoReference}/media?maxWidthPx=400&key=${apiKey}`;
    } else {
      // Legacy Places API Photo endpoint
      url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${photoReference}&key=${apiKey}`;
    }

    console.log(`[PhotoProxy] Proxying photo from Google: ${isNewApiPhoto ? 'New API' : 'Legacy API'}`);
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[PhotoProxy] Google API error: ${response.status}`);
      return res.status(response.status).json({ error: 'Failed to fetch photo from Google' });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400, s-maxage=86400'); // Cache for 24 hours

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    res.end(buffer);
  } catch (error: any) {
    console.error('[PhotoProxy] Failed to proxy photo:', error);
    return res.status(500).json({ error: 'Internal server error proxying photo' });
  }
}
