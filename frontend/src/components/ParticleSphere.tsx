import { useEffect, useRef } from 'react'

type Props = {
  speaking?: boolean
  thinking?: boolean
  size?: number
}

const N = 320
const PHI = Math.PI * (1 + Math.sqrt(5))

const BASE: [number, number, number][] = Array.from({ length: N }, (_, i) => {
  const phi = Math.acos(1 - 2 * (i + 0.5) / N)
  const theta = PHI * i
  return [Math.cos(theta) * Math.sin(phi), Math.sin(theta) * Math.sin(phi), Math.cos(phi)]
})

export function ParticleSphere({ speaking = false, thinking = false, size = 200 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef({ speaking, thinking })
  stateRef.current = { speaking, thinking }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.scale(dpr, dpr)

    let angle = 0
    let currentRadius = size * 0.36
    let raf: number

    function draw() {
      const { speaking, thinking } = stateRef.current
      ctx.clearRect(0, 0, size, size)

      const t = Date.now() / 1000
      let baseRadius: number
      if (speaking) {
        baseRadius = size * (0.42 + Math.sin(t * 1.1) * 0.04)
      } else if (thinking) {
        baseRadius = size * (0.36 + Math.sin(t * 0.9) * 0.025)
      } else {
        baseRadius = size * (0.34 + Math.sin(t * 0.5) * 0.015)
      }

      currentRadius += (baseRadius - currentRadius) * 0.04

      const rotSpeed = speaking ? 0.006 : 0.002
      angle += rotSpeed

      const cx = size / 2
      const cy = size / 2
      const cosA = Math.cos(angle)
      const sinA = Math.sin(angle)

      const dots = BASE.map(([bx, by, bz]) => {
        const rx = bx * cosA + bz * sinA
        const ry = by
        const rz = -bx * sinA + bz * cosA
        return { x: cx + rx * currentRadius, y: cy + ry * currentRadius, z: rz }
      }).sort((a, b) => a.z - b.z)

      for (const dot of dots) {
        const depth = (dot.z / currentRadius) * 0.5 + 0.5
        const alpha = speaking
          ? depth * 0.55 + 0.45
          : thinking
          ? depth * 0.35 + 0.25
          : depth * 0.28 + 0.18
        const r = (depth * 0.6 + 0.7) * (speaking ? 1.3 : 1.0)
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200,200,200,${alpha.toFixed(2)})`
        ctx.fill()
      }

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => cancelAnimationFrame(raf)
  }, [size])

  return <canvas ref={canvasRef} style={{ width: size, height: size, display: 'block' }} />
}
