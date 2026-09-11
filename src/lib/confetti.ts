import confetti from 'canvas-confetti'

export function celebrate() {
  const colors = ['#6c63ff', '#38e8c6', '#ffb347', '#8b8ffc']
  confetti({
    particleCount: 90,
    spread: 70,
    origin: { y: 0.65 },
    colors,
    scalar: 0.9,
  })
}

export function celebrateBig() {
  const colors = ['#6c63ff', '#38e8c6', '#ffb347', '#8b8ffc', '#ff5f7e']
  const end = Date.now() + 700
  ;(function frame() {
    confetti({ particleCount: 4, angle: 60, spread: 55, origin: { x: 0 }, colors })
    confetti({ particleCount: 4, angle: 120, spread: 55, origin: { x: 1 }, colors })
    if (Date.now() < end) requestAnimationFrame(frame)
  })()
}
