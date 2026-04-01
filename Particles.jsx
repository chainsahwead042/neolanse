import { useEffect, useRef } from 'react'

export default function Particles() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    let w = canvas.width = window.innerWidth
    let h = canvas.height = window.innerHeight
    let animId

    const PARTICLE_COUNT = 120
    const particles = []

    class Particle {
      constructor() { this.reset(true) }

      reset(initial = false) {
        this.x = Math.random() * w
        this.y = initial ? Math.random() * h : Math.random() < 0.5 ? 0 : Math.random() * h
        this.vx = (Math.random() - 0.5) * 1.5
        this.vy = Math.random() * 1.2 + 0.2
        this.life = 0
        this.maxLife = Math.random() * 180 + 60
        this.size = Math.random() * 1.5 + 0.3
        this.trail = []
        this.trailLen = Math.floor(Math.random() * 12 + 4)
        // Spark type: 0 = falling spark, 1 = horizontal streak, 2 = float
        this.type = Math.floor(Math.random() * 3)
        if (this.type === 1) {
          this.vx = (Math.random() > 0.5 ? 1 : -1) * (Math.random() * 3 + 1)
          this.vy = (Math.random() - 0.5) * 0.4
          this.y = Math.random() * h
        }
        if (this.type === 2) {
          this.vy = (Math.random() - 0.5) * 0.5
          this.vx = (Math.random() - 0.5) * 0.8
          this.y = Math.random() * h
        }
        this.brightness = Math.random() * 0.5 + 0.5
        this.flicker = Math.random() > 0.7
        this.flickerSpeed = Math.random() * 0.2 + 0.05
      }

      update() {
        this.trail.push({ x: this.x, y: this.y })
        if (this.trail.length > this.trailLen) this.trail.shift()

        this.x += this.vx
        this.y += this.vy

        // Gravity for falling sparks
        if (this.type === 0) this.vy += 0.02

        // Turbulence
        this.vx += (Math.random() - 0.5) * 0.08

        this.life++

        if (this.flicker) {
          this.brightness = 0.3 + Math.abs(Math.sin(this.life * this.flickerSpeed)) * 0.7
        }

        if (this.life > this.maxLife || this.y > h + 20 || this.x < -20 || this.x > w + 20) {
          this.reset()
        }
      }

      draw() {
        const alpha = this.brightness * Math.min(1, (this.maxLife - this.life) / 30) * Math.min(1, this.life / 10)
        if (alpha <= 0) return

        // Draw trail
        for (let i = 0; i < this.trail.length; i++) {
          const t = i / this.trail.length
          const trailAlpha = alpha * t * 0.6
          ctx.beginPath()
          ctx.arc(this.trail[i].x, this.trail[i].y, this.size * t * 0.8, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, ${180 + Math.floor(t * 75)}, 0, ${trailAlpha})`
          ctx.fill()
        }

        // Draw core
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)

        // Glow
        const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 4)
        grad.addColorStop(0, `rgba(255, 240, 50, ${alpha})`)
        grad.addColorStop(0.4, `rgba(255, 200, 0, ${alpha * 0.6})`)
        grad.addColorStop(1, `rgba(255, 150, 0, 0)`)

        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size * 4, 0, Math.PI * 2)
        ctx.fill()

        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha})`
        ctx.fill()
      }
    }

    // Occasional spark bursts
    class SparkBurst {
      constructor() { this.reset() }
      reset() {
        this.x = Math.random() * w
        this.y = Math.random() * h * 0.7
        this.sparks = []
        const n = Math.floor(Math.random() * 8 + 4)
        for (let i = 0; i < n; i++) {
          const angle = Math.random() * Math.PI * 2
          const speed = Math.random() * 3 + 1
          this.sparks.push({
            x: this.x, y: this.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            life: 0,
            maxLife: Math.floor(Math.random() * 30 + 15)
          })
        }
        this.nextBurst = Math.floor(Math.random() * 200 + 100)
        this.timer = 0
      }

      update() {
        this.timer++
        this.sparks = this.sparks.filter(s => s.life < s.maxLife)
        this.sparks.forEach(s => {
          s.x += s.vx; s.y += s.vy
          s.vy += 0.05
          s.vx *= 0.97
          s.life++
        })
        if (this.timer >= this.nextBurst) this.reset()
      }

      draw() {
        this.sparks.forEach(s => {
          const alpha = (1 - s.life / s.maxLife) * 0.8
          ctx.beginPath()
          ctx.arc(s.x, s.y, 1, 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255, 220, 0, ${alpha})`
          ctx.fill()
        })
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(new Particle())
    const bursts = [new SparkBurst(), new SparkBurst(), new SparkBurst()]

    function render() {
      ctx.clearRect(0, 0, w, h)
      particles.forEach(p => { p.update(); p.draw() })
      bursts.forEach(b => { b.update(); b.draw() })
      animId = requestAnimationFrame(render)
    }

    render()

    const handleResize = () => {
      w = canvas.width = window.innerWidth
      h = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} id="particles-canvas" />
}
