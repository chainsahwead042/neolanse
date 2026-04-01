import { useState, useEffect, useRef, useCallback } from 'react'
import Particles from './Particles.jsx'
import CreatorTable from './CreatorTable.jsx'
import PricingModal from './PricingModal.jsx'

const API = import.meta.env.VITE_API_URL || '/api'
const FREE_LIMIT = 10
const FREE_RESULTS = 5

// Generate a persistent anonymous user ID
function getUserId() {
  let id = localStorage.getItem('neolanse_uid')
  if (!id) {
    id = 'u_' + Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('neolanse_uid', id)
  }
  return id
}

const QUERY_EXAMPLES = [
  'fitness coach with email and instagram',
  'business creator under 100k subs active last month',
  'gaming creator with no website',
  'yoga teacher with skype and one on one coaching',
  'nutrition coach has contact info in description',
]

export default function App() {
  const [query, setQuery] = useState('')
  const [creators, setCreators] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [searchMeta, setSearchMeta] = useState(null)
  const [showPricing, setShowPricing] = useState(false)
  const [userStatus, setUserStatus] = useState(null)
  const [exporting, setExporting] = useState(false)
  const [placeholder, setPlaceholder] = useState(QUERY_EXAMPLES[0])
  const inputRef = useRef(null)
  const userId = getUserId()

  // Rotate placeholder
  useEffect(() => {
    let i = 0
    const id = setInterval(() => {
      i = (i + 1) % QUERY_EXAMPLES.length
      setPlaceholder(QUERY_EXAMPLES[i])
    }, 3500)
    return () => clearInterval(id)
  }, [])

  // Load user status
  useEffect(() => {
    fetch(`${API}/user/${userId}`)
      .then(r => r.json())
      .then(setUserStatus)
      .catch(() => {})
  }, [userId])

  const search = useCallback(async (q = query) => {
    if (!q.trim()) return
    setLoading(true)
    setError(null)
    setCreators([])
    setSearchMeta(null)

    try {
      const res = await fetch(`${API}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q.trim(), userId }),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.error === 'free_limit_reached') {
          setShowPricing(true)
          setError(`You've used all ${FREE_LIMIT} free searches. Upgrade to continue!`)
        } else {
          setError(data.error || 'Search failed')
        }
        return
      }

      setCreators(data.creators || [])
      setSearchMeta(data)
      setUserStatus(prev => prev ? {
        ...prev,
        searches_used: data.searchesUsed,
        searchesLeft: data.searchesLeft,
        isPro: data.isPro,
      } : null)
    } catch (err) {
      setError('Could not connect to server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }, [query, userId])

  const handleExport = async () => {
    if (!creators.length) return
    setExporting(true)
    try {
      const res = await fetch(`${API}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creators, userId }),
      })
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'neolanse-leads.csv'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('Export failed')
    }
    setExporting(false)
  }

  const searchesLeft = userStatus?.searchesLeft ?? FREE_LIMIT
  const isPro = userStatus?.isPro || false

  return (
    <div className="brick-bg min-h-screen relative">
      <Particles />

      {/* Everything sits above particles */}
      <div className="relative z-10">

        {/* ─── HEADER ──────────────────────────────────────── */}
        <header className="border-b border-yellow-900/30 bg-black/60 backdrop-blur-sm sticky top-0 z-20">
          <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="font-display text-3xl neon-text tracking-widest neon-flicker-slow">⚡ NEOLANSE</div>
              <div className="hidden sm:block text-xs font-mono text-yellow-800 uppercase tracking-widest border-l border-yellow-900/40 pl-3">
                YouTube Lead Engine
              </div>
            </div>
            <div className="flex items-center gap-3">
              {!isPro && (
                <div className="hidden sm:flex items-center gap-2">
                  <div className="w-24 h-1 bg-yellow-900/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 rounded-full transition-all"
                      style={{ width: `${Math.min(100, ((FREE_LIMIT - searchesLeft) / FREE_LIMIT) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-yellow-700">
                    {searchesLeft} search{searchesLeft !== 1 ? 'es' : ''} left
                  </span>
                </div>
              )}
              {isPro && (
                <span className="text-xs font-mono text-yellow-500 border border-yellow-700 px-2 py-0.5 rounded">
                  ⚡ PRO
                </span>
              )}
              <button
                onClick={() => setShowPricing(true)}
                className="neon-btn neon-btn-primary px-4 py-2 text-sm"
              >
                {isPro ? 'Manage Plan' : 'Get Pro →'}
              </button>
            </div>
          </div>
        </header>

        {/* ─── HERO ────────────────────────────────────────── */}
        <section className="max-w-4xl mx-auto px-4 pt-16 pb-10 text-center">
          <div className="font-display text-6xl md:text-8xl neon-text tracking-widest mb-3 fade-in-up">
            FIND YOUR LEADS
          </div>
          <p className="text-gray-500 font-mono text-sm mb-2 fade-in-up fade-in-up-delay-1">
            Describe the creator you want in plain English. We extract their contacts.
          </p>
          <div className="spark-line w-32 mx-auto mb-8 fade-in-up fade-in-up-delay-2" />

          {/* ─── SEARCH BOX ───────────────────────────────── */}
          <div className="flex flex-col sm:flex-row gap-3 neon-border rounded p-1 bg-black/40 fade-in-up fade-in-up-delay-3">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder={placeholder}
              className="neon-input flex-1 px-5 py-4 rounded text-base bg-transparent"
            />
            <button
              onClick={() => search()}
              disabled={loading || !query.trim()}
              className="neon-btn neon-btn-primary px-8 py-4 text-xl disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? '...' : '⚡ SEARCH'}
            </button>
          </div>

          {/* Example chips */}
          <div className="flex flex-wrap gap-2 justify-center mt-4">
            {QUERY_EXAMPLES.map(ex => (
              <button
                key={ex}
                onClick={() => { setQuery(ex); search(ex) }}
                className="text-xs font-mono text-yellow-800 border border-yellow-900/30 px-3 py-1 rounded-full hover:border-yellow-600 hover:text-yellow-600 transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </section>

        {/* ─── MAIN CONTENT ────────────────────────────────── */}
        <main className="max-w-7xl mx-auto px-4 pb-16">

          {/* Error */}
          {error && (
            <div className="neon-border border-red-900/50 bg-red-950/20 rounded p-4 mb-6 text-red-400 font-mono text-sm flex items-center justify-between">
              <span>⚠ {error}</span>
              {error.includes('searches') && (
                <button onClick={() => setShowPricing(true)} className="neon-btn px-4 py-1 text-xs ml-4">
                  Upgrade →
                </button>
              )}
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center py-20">
              <div className="neon-spinner mb-6" />
              <div className="font-mono text-yellow-700 text-sm animate-pulse">
                Scanning YouTube for creators…
              </div>
            </div>
          )}

          {/* Results meta */}
          {!loading && searchMeta && (
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-4">
                <div className="font-mono text-sm">
                  <span className="text-yellow-500">{creators.length}</span>
                  <span className="text-gray-600"> creators found</span>
                  {searchMeta.totalHidden > 0 && (
                    <span className="text-yellow-800">
                      {' '}· <button onClick={() => setShowPricing(true)} className="underline hover:text-yellow-500">
                        +{searchMeta.totalHidden} hidden (upgrade)
                      </button>
                    </span>
                  )}
                </div>
                {searchMeta.filters && (
                  <div className="flex flex-wrap gap-1">
                    {Object.entries({
                      email: searchMeta.filters.requireEmail,
                      instagram: searchMeta.filters.requireInstagram,
                      skype: searchMeta.filters.requireSkype,
                      'no website': searchMeta.filters.noWebsite,
                      'one-on-one': searchMeta.filters.requireOneOnOne,
                    }).filter(([, v]) => v).map(([k]) => (
                      <span key={k} className="text-xs font-mono bg-yellow-900/20 text-yellow-700 border border-yellow-900/30 px-2 py-0.5 rounded-full">
                        {k}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {creators.length > 0 && (
                <button
                  onClick={handleExport}
                  disabled={exporting}
                  className="neon-btn px-5 py-2 text-sm"
                >
                  {exporting ? 'Exporting…' : '↓ Export CSV'}
                  {!isPro && <span className="text-xs opacity-50 ml-1">({FREE_RESULTS} rows)</span>}
                </button>
              )}
            </div>
          )}

          {/* Results table */}
          {!loading && creators.length > 0 && (
            <CreatorTable
              creators={creators}
              isPro={isPro}
              totalHidden={searchMeta?.totalHidden || 0}
              onUpgrade={() => setShowPricing(true)}
            />
          )}

          {/* Empty state */}
          {!loading && searchMeta && creators.length === 0 && (
            <div className="text-center py-20">
              <div className="font-display text-6xl text-yellow-900/40 mb-4">NOTHING</div>
              <p className="text-gray-600 font-mono text-sm">
                No creators matched your filters. Try broader terms or different filters.
              </p>
            </div>
          )}

          {/* ─── FEATURES SECTION (default state) ─────────── */}
          {!loading && !searchMeta && (
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: '🎯',
                  title: 'Natural Language Filters',
                  desc: 'Type what you want in plain English. "fitness creator with email under 50k subs" — we handle the rest.',
                },
                {
                  icon: '📡',
                  title: 'Contact Extraction',
                  desc: 'Automatically pulls emails, Instagram handles, websites, Skype IDs, and every link from channel and video descriptions.',
                },
                {
                  icon: '📊',
                  title: 'Lead Scoring',
                  desc: 'Every creator gets a score based on activity, engagement, and contact availability. Sort and target the hottest leads first.',
                },
              ].map((f, i) => (
                <div key={i} className={`neon-border rounded p-6 bg-black/30 fade-in-up fade-in-up-delay-${i + 1}`}>
                  <div className="text-3xl mb-3">{f.icon}</div>
                  <h3 className="font-display text-xl text-yellow-400 tracking-wider mb-2">{f.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          )}

          {/* Free tier notice */}
          {!isPro && (
            <div className="mt-10 neon-border rounded p-4 bg-black/30 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-gray-500 font-mono">
                Free tier: <span className="text-yellow-600">{searchesLeft}/{FREE_LIMIT} searches</span> remaining · 
                <span className="text-yellow-600"> 5 results</span> per search
              </div>
              <button onClick={() => setShowPricing(true)} className="neon-btn neon-btn-primary px-6 py-2 text-sm whitespace-nowrap">
                ⚡ Upgrade for unlimited →
              </button>
            </div>
          )}
        </main>

        {/* ─── FOOTER ──────────────────────────────────────── */}
        <footer className="border-t border-yellow-900/20 py-6 text-center">
          <div className="font-display text-yellow-900/40 text-lg tracking-widest">NEOLANSE</div>
          <div className="text-xs font-mono text-gray-700 mt-1">
            Only uses publicly available YouTube data · No CAPTCHA bypass · No scraping of protected content
          </div>
        </footer>
      </div>

      {/* ─── PRICING MODAL ───────────────────────────────── */}
      {showPricing && <PricingModal onClose={() => setShowPricing(false)} />}
    </div>
  )
}
