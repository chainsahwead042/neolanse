export default async function handler(req, res) {
      if (req.method !== 'POST') {
            return res.status(405).json({ error: 'Method not allowed' });
      }

        try {
                const { query } = req.body;

                    if (!query) {
                              return res.status(400).json({ error: 'Query is required' });
                    }

                        const API_KEY = process.env.YOUTUBE_API_KEY;

                        if (!API_KEY) {
                            return res.status(500).json({ error: 'API key missing' });
                        }

                            const ytRes = await fetch(
                                      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(query)}&maxResults=10&key=${API_KEY}`
                            );

                                const data = await ytRes.json();

                                    const results = data.items?.map(item => ({
                                              channelId: item.id.channelId,
                                                    title: item.snippet.title,
                                                          description: item.snippet.description,
                                                                thumbnail: item.snippet.thumbnails.default.url,
                                                                      score: Math.floor(Math.random() * 100)
                                    })) || [];

                                        res.status(200).json({ results });

        } catch (error) {
                console.error(error);
                    res.status(500).json({ error: 'Server error' });
        }
}