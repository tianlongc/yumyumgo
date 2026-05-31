export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { lat, lng, query } = req.body;
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing WEATHER_API_KEY' });
  }
  
  if (!lat && !lng && !query) {
      return res.status(400).json({ error: 'Missing location data' });
  }

  try {
    let url = '';
    if (lat && lng) {
      url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`;
    } else {
      url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&appid=${apiKey}&units=metric`;
    }
    const response = await fetch(url);
    const data = await response.json();
    
    // Extract a simple weather string
    const weatherString = data.weather && data.weather.length > 0 
        ? `${data.weather[0].main} (${data.weather[0].description}), ${Math.round(data.main.temp)}°C` 
        : 'Unknown';

    return res.status(200).json({ weather: weatherString, raw: data });
  } catch (error) {
    console.error('Weather API Error:', error);
    // Graceful fallback for weather
    return res.status(200).json({ weather: 'Unknown (Error fetching weather)' });
  }
}
