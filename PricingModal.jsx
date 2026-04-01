const FREEMIUS_CHECKOUT = 'https://checkout.freemius.com/product/26756/plan/44313/'

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      '10 total searches',
      '5 results per search',
      'Contact extraction',
      'CSV export (5 rows)',
    ],
    cta: 'Current Plan',
    disabled: true,
    featured: false,
  },
  {
    name: 'Pro Monthly',
    price: '$20',
    period: '/month',
    features: [
      'Unlimited searches',
      'All results shown',
      'Full contact extraction',
      'Unlimited CSV export',
      'Priority results',
      'Freemius-secured billing',
    ],
    cta: 'Get Pro Monthly',
    checkout: FREEMIUS_CHECKOUT + '?billing_cycle=monthly',
    featured: false,
  },
  {
    name: 'Pro Yearly',
    price: '$200',
    period: '/year',
    badge: 'SAVE 17%',
    features: [
      'Everything in Monthly',
      '2 months free',
      'Unlimited searches',
      'All results shown',
      'Full CSV export',
    ],
    cta: 'Get Pro Yearly',
    checkout: FREEMIUS_CHECKOUT + '?billing_cycle=annual',
    featured: true,
  },
  {
    name: 'Lifetime',
    price: '$5,000',
    period: 'one-time',
    features: [
      'Lifetime access',
      'All future features',
      'Unlimited everything',
      'Priority support',
    ],
    cta: 'Go Lifetime',
    checkout: FREEMIUS_CHECKOUT + '?billing_cycle=lifetime',
    featured: false,
  },
]

export default function PricingModal({ onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="font-display text-5xl neon-text tracking-widest mb-2">UPGRADE YOUR REACH</h2>
          <p className="text-gray-400 font-mono text-sm">Unlock every creator. Every contact. Every lead.</p>
          <div className="spark-line my-4 w-48 mx-auto" />
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`pricing-card rounded p-5 flex flex-col ${plan.featured ? 'featured' : ''}`}
            >
              {plan.badge && (
                <div className="text-xs font-mono bg-yellow-500 text-black px-2 py-0.5 rounded mb-2 self-start">
                  {plan.badge}
                </div>
              )}
              <div className="font-display text-yellow-600 text-lg tracking-widest mb-1">{plan.name}</div>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="font-display text-4xl neon-text-sm">{plan.price}</span>
                <span className="text-gray-600 text-xs font-mono">{plan.period}</span>
              </div>
              <ul className="space-y-2 flex-1 mb-6">
                {plan.features.map(f => (
                  <li key={f} className="text-xs text-gray-400 flex items-start gap-2">
                    <span className="text-yellow-600 mt-0.5">▸</span>
                    {f}
                  </li>
                ))}
              </ul>
              {plan.disabled ? (
                <button disabled className="neon-btn px-4 py-2 text-sm opacity-30 cursor-not-allowed w-full">
                  {plan.cta}
                </button>
              ) : (
                <a
                  href={plan.checkout}
                  target="_blank"
                  rel="noreferrer"
                  className="neon-btn neon-btn-primary px-4 py-2 text-sm text-center block w-full"
                >
                  {plan.cta} →
                </a>
              )}
            </div>
          ))}
        </div>

        {/* Secure badge */}
        <div className="text-center mt-6 text-gray-700 text-xs font-mono">
          🔒 Payments secured by Freemius · Cancel anytime · 30-day refund
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full border border-yellow-800 bg-black text-yellow-600 font-mono text-sm hover:border-yellow-400 hover:text-yellow-400 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
