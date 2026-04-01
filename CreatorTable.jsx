import { useState } from 'react'

const SORT_OPTIONS = [
  { key: 'score', label: 'Score' },
  { key: 'subscribers', label: 'Subscribers' },
  { key: 'lastUpload', label: 'Latest Upload' },
]

function ScoreBadge({ score }) {
  const cls = score >= 70 ? 'score-high' : score >= 40 ? 'score-mid' : 'score-low'
  return <span className={`score-badge ${cls}`}>{score}</span>
}

function formatSubs(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return n.toLocaleString()
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  const days = Math.floor((Date.now() - d) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 30)}mo ago`
  return `${Math.floor(days / 365)}y ago`
}

function ContactLinks({ contacts }) {
  if (!contacts) return null
  const { emails = [], instagrams = [], websites = [], skypes = [], allLinks = [] } = contacts

  return (
    <div className="flex flex-wrap gap-1">
      {emails.map((e, i) => (
        <a key={i} href={`mailto:${e}`} className="link-chip" title={e}>
          ✉ {e.length > 20 ? e.slice(0, 20) + '…' : e}
        </a>
      ))}
      {instagrams.map((ig, i) => {
        const handle = ig.replace(/instagram\.com\//i, '').replace('@', '')
        return (
          <a key={i} href={`https://instagram.com/${handle}`} target="_blank" rel="noreferrer" className="link-chip" title={ig}>
            📸 @{handle.slice(0, 14)}
          </a>
        )
      })}
      {websites.map((w, i) => (
        <a key={i} href={w} target="_blank" rel="noreferrer" className="link-chip" title={w}>
          🌐 {w.replace(/https?:\/\/(www\.)?/, '').slice(0, 16)}…
        </a>
      ))}
      {skypes.map((s, i) => (
        <span key={i} className="link-chip">💬 {s.slice(0, 16)}</span>
      ))}
      {/* Show remaining links not already covered */}
      {allLinks.filter(l =>
        !websites.includes(l) &&
        !l.match(/instagram|youtube|youtu\.be|facebook|twitter|tiktok|linkedin/i)
      ).slice(0, 3).map((l, i) => (
        <a key={i} href={l} target="_blank" rel="noreferrer" className="link-chip" title={l}>
          🔗 {l.replace(/https?:\/\/(www\.)?/, '').slice(0, 16)}…
        </a>
      ))}
    </div>
  )
}

function CreatorRow({ creator, index }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <>
      <tr
        className="creator-row cursor-pointer"
        style={{ animationDelay: `${index * 0.05}s` }}
        onClick={() => setExpanded(!expanded)}
      >
        <td className="py-3 px-4">
          <div className="flex items-center gap-3">
            {creator.thumbnail && (
              <img src={creator.thumbnail} alt="" className="w-8 h-8 rounded-full border border-yellow-700/30" />
            )}
            <div>
              <a
                href={creator.channelUrl}
                target="_blank"
                rel="noreferrer"
                className="neon-text-sm font-semibold hover:underline font-display tracking-wide text-base"
                onClick={e => e.stopPropagation()}
              >
                {creator.channelName}
              </a>
              {creator.country && (
                <div className="text-xs text-gray-600 font-mono">{creator.country}</div>
              )}
            </div>
          </div>
        </td>
        <td className="py-3 px-4 font-mono text-sm text-gray-300">
          {formatSubs(creator.subscribers)}
        </td>
        <td className="py-3 px-4">
          <ContactLinks contacts={creator.contacts} />
        </td>
        <td className="py-3 px-4 font-mono text-xs text-gray-500">
          {formatDate(creator.lastUpload)}
        </td>
        <td className="py-3 px-4">
          <ScoreBadge score={creator.score} />
        </td>
        <td className="py-3 px-4 text-xs text-gray-600 font-mono">
          {expanded ? '▲' : '▼'}
        </td>
      </tr>

      {expanded && (
        <tr className="bg-yellow-900/5 border-b border-yellow-900/20">
          <td colSpan={6} className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-yellow-700 uppercase tracking-widest mb-2 font-mono">Channel Description</div>
                <p className="text-sm text-gray-400 leading-relaxed max-h-32 overflow-y-auto">
                  {creator.description?.slice(0, 600) || 'No description'}
                  {creator.description?.length > 600 ? '…' : ''}
                </p>
              </div>
              <div>
                <div className="text-xs text-yellow-700 uppercase tracking-widest mb-2 font-mono">All Links Found</div>
                <div className="flex flex-wrap gap-1">
                  {(creator.contacts?.allLinks || []).map((l, i) => (
                    <a key={i} href={l} target="_blank" rel="noreferrer" className="link-chip">
                      {l.replace(/https?:\/\/(www\.)?/, '').slice(0, 32)}
                    </a>
                  ))}
                  {(creator.contacts?.emails || []).map((e, i) => (
                    <a key={`e${i}`} href={`mailto:${e}`} className="link-chip">✉ {e}</a>
                  ))}
                  {(!creator.contacts?.allLinks?.length && !creator.contacts?.emails?.length) && (
                    <span className="text-xs text-gray-600">No links found in descriptions</span>
                  )}
                </div>
                <div className="text-xs text-yellow-700 uppercase tracking-widest mt-3 mb-2 font-mono">Latest Videos</div>
                <div className="space-y-1">
                  {(creator.latestVideos || []).slice(0, 3).map((v, i) => (
                    <a
                      key={i}
                      href={`https://youtube.com/watch?v=${v.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block text-xs text-gray-500 hover:text-yellow-400 truncate"
                    >
                      ▶ {v.title} <span className="text-gray-700">({formatDate(v.publishedAt)})</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

export default function CreatorTable({ creators, isPro, totalHidden, onUpgrade }) {
  const [sortKey, setSortKey] = useState('score')
  const [sortDir, setSortDir] = useState('desc')

  const sorted = [...creators].sort((a, b) => {
    let va = a[sortKey], vb = b[sortKey]
    if (sortKey === 'lastUpload') {
      va = va ? new Date(va).getTime() : 0
      vb = vb ? new Date(vb).getTime() : 0
    }
    return sortDir === 'desc' ? vb - va : va - vb
  })

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSortKey(key); setSortDir('desc') }
  }

  if (!creators.length) return null

  return (
    <div className="relative">
      <div className="overflow-x-auto neon-border rounded">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-yellow-900/40 bg-black/40">
              <th className="py-3 px-4 text-left text-yellow-600 font-mono text-xs uppercase tracking-widest">Channel</th>
              <th
                className="py-3 px-4 text-left text-yellow-600 font-mono text-xs uppercase tracking-widest cursor-pointer hover:text-yellow-400"
                onClick={() => toggleSort('subscribers')}
              >
                Subs {sortKey === 'subscribers' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
              </th>
              <th className="py-3 px-4 text-left text-yellow-600 font-mono text-xs uppercase tracking-widest">Contact / Links</th>
              <th
                className="py-3 px-4 text-left text-yellow-600 font-mono text-xs uppercase tracking-widest cursor-pointer hover:text-yellow-400"
                onClick={() => toggleSort('lastUpload')}
              >
                Last Upload {sortKey === 'lastUpload' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
              </th>
              <th
                className="py-3 px-4 text-left text-yellow-600 font-mono text-xs uppercase tracking-widest cursor-pointer hover:text-yellow-400"
                onClick={() => toggleSort('score')}
              >
                Score {sortKey === 'score' ? (sortDir === 'desc' ? '↓' : '↑') : '↕'}
              </th>
              <th className="py-3 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <CreatorRow key={c.channelId} creator={c} index={i} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Upgrade overlay when results are hidden */}
      {totalHidden > 0 && (
        <div className="relative mt-0">
          <div className="h-24 bg-gradient-to-b from-transparent to-[#080808] -mt-24 pointer-events-none" />
          <div className="bg-[#080808] border border-yellow-900/30 rounded-b p-6 text-center">
            <div className="text-yellow-600 font-mono text-xs uppercase tracking-widest mb-2">
              ⚡ You're viewing 5 of {creators.length + totalHidden} results
            </div>
            <div className="text-gray-400 text-sm mb-4">
              Upgrade to see all <strong className="text-yellow-400">{totalHidden}</strong> hidden creators + unlimited searches
            </div>
            <button onClick={onUpgrade} className="neon-btn neon-btn-primary px-8 py-3 text-lg">
              Unlock All Results →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
