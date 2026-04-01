import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import crypto from 'crypto';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;

// ─── ENV CONFIG ────────────────────────────────────────────────────────────────
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || 'YOUR_YOUTUBE_API_KEY';
const FREEMIUS_SECRET_KEY = process.env.FREEMIUS_SECRET_KEY || 'YOUR_FREEMIUS_SECRET_KEY';
const FREE_SEARCH_LIMIT = 10;
const FREE_RESULTS_LIMIT = 5;

// ─── DATABASE SETUP ────────────────────────────────────────────────────────────
const db = new Database(join(__dirname, 'neolanse.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    plan TEXT DEFAULT 'free',
    searches_used INTEGER DEFAULT 0,
    license_id TEXT,
    license_expires TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS search_cache (
    cache_key TEXT PRIMARY KEY,
    results TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

// ─── MIDDLEWARE ─────────────────────────────────────────────────────────────────
app.use(cors({ origin: '*' }));
app.use(express.json());

// ─── HELPERS ───────────────────────────────────────────────────────────────────
function getOrCreateUser(userId) {
  let user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  if (!user) {
    db.prepare('INSERT INTO users (id) VALUES (?)').run(userId);
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
  }
  return user;
}

function isPro(user) {
  if (!user) return false;
  if (user.plan === 'free') return false;
  if (user.license_expires && new Date(user.license_expires) < new Date()) return false;
  return true;
}

function extractContacts(text) {
  if (!text) return { emails: [], instagrams: [], websites: [], skypes: [], phones: [], allLinks: [] };

  const emails = [...new Set((text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g) || []))];
  const instagrams = [...new Set((text.match(/(?:instagram\.com\/|@)([a-zA-Z0-9_.]{1,30})/gi) || []))];
  const websites = [...new Set((text.match(/https?:\/\/(?!(?:www\.)?(?:instagram|youtube|youtu\.be|facebook|twitter|tiktok|linkedin))[^\s<>"]+/gi) || []))];
  const skypes = [...new Set((text.match(/skype[:\s]+([^\s\n,]+)/gi) || []))];
  const phones = [...new Set((text.match(/(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g) || []))];
  const allLinks = [...new Set((text.match(/https?:\/\/[^\s<>"]+/gi) || []))];

  return { emails, instagrams, websites, skypes, phones, allLinks };
}

function scoreCreator(channel, videos) {
  let score = 0;
  let insights = {
    whyGoodClient: [],
    whatToPitch: [],
    whatsWrong: []
  };

  const subs = parseInt(channel.subscriberCount || 0);
  const views = parseInt(channel.viewCount || 0);
  const videoCount = parseInt(channel.statistics?.videoCount || 0);

  // Activity score - recent uploads
  if (videos && videos.length > 0) {
    const latestUpload = new Date(videos[0].publishedAt);
    const daysSince = (Date.now() - latestUpload) / (1000 * 60 * 60 * 24);
    if (daysSince < 7) {
      score += 30;
      insights.whyGoodClient.push('Very active creator with recent uploads');
    } else if (daysSince < 30) {
      score += 20;
      insights.whyGoodClient.push('Active creator uploading regularly');
    } else if (daysSince < 90) {
      score += 10;
    } else {
      insights.whatsWrong.push("Inactive channel - hasn't uploaded in months");
      insights.whatToPitch.push('Help them restart content creation');
    }
  } else {
    insights.whatsWrong.push('No recent videos found');
  }

  // Engagement score
  if (subs > 0 && views > 0) {
    const ratio = views / subs;
    if (ratio > 100) {
      score += 25;
      insights.whyGoodClient.push('High engagement ratio indicates engaged audience');
    } else if (ratio > 50) {
      score += 15;
    } else if (ratio > 10) {
      score += 5;
    } else {
      insights.whatsWrong.push('Low engagement - videos not resonating with audience');
      insights.whatToPitch.push('Content strategy consultation to improve engagement');
    }
  }

  // Growth potential - smaller channels have more room to grow
  if (subs < 10000) {
    score += 20;
    insights.whyGoodClient.push('Smaller channel with growth potential');
  } else if (subs < 100000) {
    score += 10;
  }

  // Upload consistency
  if (videos && videos.length >= 5) {
    const dates = videos.map(v => new Date(v.publishedAt).getTime()).sort((a,b) => b-a);
    const intervals = [];
    for (let i = 0; i < dates.length - 1; i++) {
      intervals.push(dates[i] - dates[i+1]);
    }
    const avgInterval = intervals.reduce((a,b) => a+b, 0) / intervals.length / (1000*60*60*24); // days
    if (avgInterval < 14) {
      score += 15;
      insights.whyGoodClient.push('Consistent uploader - posts frequently');
    } else if (avgInterval < 30) {
      score += 10;
    } else {
      insights.whatsWrong.push('Inconsistent upload schedule');
      insights.whatToPitch.push('Content calendar planning service');
    }
  }

  // Contact info score
  const contacts = extractContacts(channel.description);
  if (contacts.emails.length > 0) {
    score += 20;
    insights.whyGoodClient.push('Already has contact info - easy to reach');
  }
  if (contacts.instagrams.length > 0) score += 10;
  if (contacts.websites.length === 0) {
    score += 15;
    insights.whyGoodClient.push('No website - opportunity for web design services');
    insights.whatToPitch.push('Professional website creation');
  } else {
    insights.whatsWrong.push('Already has website - may not need design help');
  }

  // Monetization signals - assume based on subs and video count
  if (subs > 1000 && videoCount > 50) {
    score += 10;
    insights.whyGoodClient.push('Likely monetized or close to it');
    insights.whatToPitch.push('Advanced monetization strategies');
  }

  const finalScore = Math.min(score, 100);
  const chance = Math.round(finalScore * 0.82); // Rough conversion to percentage

  return {
    score: finalScore,
    chance: chance,
    insights: insights
  };
}

async function ytFetch(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`YouTube API error: ${res.status}`);
  return res.json();
}

// ─── NATURAL LANGUAGE FILTER PARSER ────────────────────────────────────────────
function parseNaturalFilters(query) {
  const filters = {
    keyword: query,
    minSubs: 0,
    maxSubs: Infinity,
    maxDaysInactive: 365,
    requireEmail: false,
    requireInstagram: false,
    requireWebsite: false,
    noWebsite: false,
    requireSkype: false,
    requireOneOnOne: false,
  };

  const lower = query.toLowerCase();

  // Detect contact requirements
  if (lower.includes('email')) filters.requireEmail = true;
  if (lower.includes('instagram') || lower.includes(' ig ')) filters.requireInstagram = true;
  if (lower.includes('skype')) filters.requireSkype = true;
  if (lower.includes('one on one') || lower.includes('1 on 1') || lower.includes('coaching')) filters.requireOneOnOne = true;
  if (lower.includes('no website') || lower.includes('without website')) filters.noWebsite = true;
  if (lower.includes('has website') || lower.includes('own website')) filters.requireWebsite = true;
  if (lower.includes('contact info') || lower.includes('contact information')) {
    filters.requireEmail = true;
  }

  // Subscriber range detection
  const subsMatch = lower.match(/(\d+[km]?)\s*(?:to|-)\s*(\d+[km]?)\s*(?:subscribers|subs)/i);
  if (subsMatch) {
    filters.minSubs = parseSubs(subsMatch[1]);
    filters.maxSubs = parseSubs(subsMatch[2]);
  }

  const minSubsMatch = lower.match(/(?:min|minimum|at least|over)\s*(\d+[km]?)\s*(?:subscribers|subs)/i);
  if (minSubsMatch) filters.minSubs = parseSubs(minSubsMatch[1]);

  const maxSubsMatch = lower.match(/(?:max|maximum|under|less than)\s*(\d+[km]?)\s*(?:subscribers|subs)/i);
  if (maxSubsMatch) filters.maxSubs = parseSubs(maxSubsMatch[1]);

  // Activity
  if (lower.includes('active') || lower.includes('recent')) filters.maxDaysInactive = 30;
  if (lower.includes('last week') || lower.includes('7 days')) filters.maxDaysInactive = 7;
  if (lower.includes('last month') || lower.includes('30 days')) filters.maxDaysInactive = 30;

  // Clean keyword - remove filter words
  const cleanKeyword = query
    .replace(/\b(with|has|have|contact info|contact information|email|instagram|ig|skype|one on one|1 on 1|website|no website|own website|active|recent|coach|coaching)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  filters.keyword = cleanKeyword || query;
  return filters;
}

function parseSubs(str) {
  const s = str.toLowerCase();
  if (s.endsWith('k')) return parseFloat(s) * 1000;
  if (s.endsWith('m')) return parseFloat(s) * 1000000;
  return parseInt(s);
}

// ─── ROUTES ────────────────────────────────────────────────────────────────────

// Health check
app.get(['/health','/api/health'], (req, res) => res.json({ ok: true }));

// Search creators
app.post(['/search','/api/search'], async (req, res) => {
  try {
    const { query, userId = 'anon', pageToken } = req.body;
    if (!query) return res.status(400).json({ error: 'Query required' });

    const user = getOrCreateUser(userId);
    const pro = isPro(user);

    // Check free limit
    if (!pro && user.searches_used >= FREE_SEARCH_LIMIT) {
      return res.status(403).json({
        error: 'free_limit_reached',
        message: `You've used all ${FREE_SEARCH_LIMIT} free searches. Upgrade to continue!`,
        searchesUsed: user.searches_used,
        limit: FREE_SEARCH_LIMIT,
      });
    }

    const filters = parseNaturalFilters(query);

    // Build YouTube search URL
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('q', filters.keyword);
    searchUrl.searchParams.set('type', 'channel');
    searchUrl.searchParams.set('maxResults', '25');
    searchUrl.searchParams.set('key', YOUTUBE_API_KEY);
    if (pageToken) searchUrl.searchParams.set('pageToken', pageToken);

    const searchData = await ytFetch(searchUrl.toString());
    const channelIds = searchData.items?.map(i => i.snippet?.channelId || i.id?.channelId).filter(Boolean);

    if (!channelIds || channelIds.length === 0) {
      return res.json({ creators: [], total: 0, nextPageToken: null, filters });
    }

    // Fetch channel details
    const channelsUrl = new URL('https://www.googleapis.com/youtube/v3/channels');
    channelsUrl.searchParams.set('part', 'snippet,statistics,brandingSettings');
    channelsUrl.searchParams.set('id', channelIds.join(','));
    channelsUrl.searchParams.set('key', YOUTUBE_API_KEY);

    const channelsData = await ytFetch(channelsUrl.toString());

    // Process channels + fetch latest videos
    const creators = [];
    for (const channel of (channelsData.items || [])) {
      const subs = parseInt(channel.statistics?.subscriberCount || 0);
      const views = parseInt(channel.statistics?.viewCount || 0);
      const desc = channel.snippet?.description || '';

      // Sub filter
      if (subs < filters.minSubs || subs > filters.maxSubs) continue;

      // Fetch latest videos
      const videosUrl = new URL('https://www.googleapis.com/youtube/v3/search');
      videosUrl.searchParams.set('part', 'snippet');
      videosUrl.searchParams.set('channelId', channel.id);
      videosUrl.searchParams.set('order', 'date');
      videosUrl.searchParams.set('maxResults', '5');
      videosUrl.searchParams.set('type', 'video');
      videosUrl.searchParams.set('key', YOUTUBE_API_KEY);

      let videos = [];
      try {
        const vData = await ytFetch(videosUrl.toString());
        videos = (vData.items || []).map(v => ({
          title: v.snippet?.title,
          publishedAt: v.snippet?.publishedAt,
          videoId: v.id?.videoId,
          description: v.snippet?.description || '',
        }));
      } catch (e) { /* skip */ }

      // Activity filter
      if (videos.length > 0) {
        const latestUpload = new Date(videos[0].publishedAt);
        const daysSince = (Date.now() - latestUpload) / (1000 * 60 * 60 * 24);
        if (daysSince > filters.maxDaysInactive) continue;
      }

      // Extract contacts from channel desc + video descs
      const allText = [desc, ...videos.map(v => v.description)].join('\n');
      const contacts = extractContacts(allText);

      // Apply contact filters
      if (filters.requireEmail && contacts.emails.length === 0) continue;
      if (filters.requireInstagram && contacts.instagrams.length === 0) continue;
      if (filters.requireSkype && contacts.skypes.length === 0) continue;
      if (filters.requireWebsite && contacts.websites.length === 0) continue;
      if (filters.noWebsite && contacts.websites.length > 0) continue;

      const scoreData = scoreCreator({ subscriberCount: subs, viewCount: views, description: desc }, videos);

      creators.push({
        channelId: channel.id,
        channelName: channel.snippet?.title,
        channelUrl: `https://youtube.com/channel/${channel.id}`,
        thumbnail: channel.snippet?.thumbnails?.default?.url,
        subscribers: subs,
        totalViews: views,
        videoCount: parseInt(channel.statistics?.videoCount || 0),
        description: desc,
        country: channel.snippet?.country,
        contacts,
        latestVideos: videos,
        score: scoreData.score,
        chance: scoreData.chance,
        insights: scoreData.insights,
        lastUpload: videos[0]?.publishedAt || null,
      });
    }

    // Sort by score desc
    creators.sort((a, b) => b.score - a.score);

    // Increment search count
    db.prepare('UPDATE users SET searches_used = searches_used + 1 WHERE id = ?').run(userId);
    const updatedUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);

    const total = creators.length;
    const limitedCreators = pro ? creators : creators.slice(0, FREE_RESULTS_LIMIT);

    res.json({
      creators: limitedCreators,
      total,
      totalHidden: pro ? 0 : Math.max(0, total - FREE_RESULTS_LIMIT),
      nextPageToken: searchData.nextPageToken || null,
      filters,
      searchesUsed: updatedUser.searches_used,
      searchesLeft: pro ? Infinity : Math.max(0, FREE_SEARCH_LIMIT - updatedUser.searches_used),
      isPro: pro,
    });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get user status
app.get(['/user/:userId', '/api/user/:userId'], (req, res) => {
  const user = getOrCreateUser(req.params.userId);
  res.json({
    ...user,
    isPro: isPro(user),
    searchesLeft: isPro(user) ? Infinity : Math.max(0, FREE_SEARCH_LIMIT - user.searches_used),
  });
});

// CSV export
app.post(['/export', '/api/export'], (req, res) => {
  try {
    const { creators, userId = 'anon' } = req.body;
    const user = getOrCreateUser(userId);
    const pro = isPro(user);

    const data = pro ? creators : creators.slice(0, FREE_RESULTS_LIMIT);

    const headers = ['Channel Name', 'Subscribers', 'Score', 'Email(s)', 'Instagram(s)', 'Website(s)', 'Skype(s)', 'All Links', 'Last Upload', 'Channel URL'];
    const rows = data.map(c => [
      `"${(c.channelName || '').replace(/"/g, '""')}"`,
      c.subscribers,
      c.score,
      `"${(c.contacts?.emails || []).join('; ')}"`,
      `"${(c.contacts?.instagrams || []).join('; ')}"`,
      `"${(c.contacts?.websites || []).join('; ')}"`,
      `"${(c.contacts?.skypes || []).join('; ')}"`,
      `"${(c.contacts?.allLinks || []).join('; ')}"`,
      c.lastUpload ? new Date(c.lastUpload).toLocaleDateString() : '',
      `"${c.channelUrl}"`,
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="lanceit-leads.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── FREEMIUS WEBHOOK ──────────────────────────────────────────────────────────
app.post('/webhook/freemius', bodyParser.raw({ type: '*/*' }), (req, res) => {
  try {
    const input = req.body.toString('utf8');
    const hash = crypto.createHmac('sha256', FREEMIUS_SECRET_KEY).update(input).digest('hex');
    const signature = req.headers['x-signature'] || '';

    if (!crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(signature.padEnd(hash.length, '0').slice(0, hash.length), 'hex'))) {
      console.warn('Invalid webhook signature');
      return res.status(200).send(); // Return 200 always to prevent retries
    }

    const event = JSON.parse(input);
    console.log('Freemius webhook event:', event.type);

    const userEmail = event.objects?.user?.email;
    const license = event.objects?.license;

    switch (event.type) {
      case 'license.created':
      case 'license.extended': {
        // Grant pro access
        if (userEmail && license) {
          const expires = license.expiration || null;
          const plan = license.plan_id ? 'pro' : 'free';
          db.prepare(`
            INSERT INTO users (id, email, plan, license_id, license_expires)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(email) DO UPDATE SET
              plan = excluded.plan,
              license_id = excluded.license_id,
              license_expires = excluded.license_expires
          `).run(userEmail, userEmail, plan, license.id, expires);
          console.log(`✅ Pro access granted to ${userEmail}`);
        }
        break;
      }
      case 'license.cancelled':
      case 'license.expired':
      case 'payment.refund': {
        // Revoke pro access
        if (userEmail) {
          db.prepare('UPDATE users SET plan = ?, license_id = NULL, license_expires = NULL WHERE email = ?')
            .run('free', userEmail);
          console.log(`❌ Pro access revoked for ${userEmail}`);
        }
        break;
      }
      case 'subscription.renewal.failed': {
        if (userEmail) {
          console.warn(`⚠️ Renewal failed for ${userEmail} - grace period`);
        }
        break;
      }
    }

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(200).send(); // Always 200 to prevent retries
  }
});

// Activate license by email (called after Freemius checkout redirect)
app.post('/activate', async (req, res) => {
  try {
    const { email, licenseKey, userId } = req.body;
    if (!email) return res.status(400).json({ error: 'Email required' });

    // In production, verify licenseKey with Freemius API
    // For now we trust the email from the checkout redirect
    const id = userId || email;
    db.prepare(`
      INSERT INTO users (id, email, plan, license_id)
      VALUES (?, ?, 'pro', ?)
      ON CONFLICT(id) DO UPDATE SET
        email = excluded.email,
        plan = 'pro',
        license_id = excluded.license_id
    `).run(id, email, licenseKey || 'manual');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    res.json({ success: true, user: { ...user, isPro: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => console.log(`🚀 LanceIt backend running on port ${PORT}`));
