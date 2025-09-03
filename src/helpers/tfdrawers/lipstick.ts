export type Point = { x: number; y: number }

const LIPS_OUTER = [61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 308, 324, 318, 402, 317, 14, 87]
const LIPS_INNER = [78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82]

export function drawLipstick(
  ctx: CanvasRenderingContext2D,
  keypoints: Point[],
  width: number,
  height: number,
  color: string,
  opacity: number = 0.55
) {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))
  const getPoint = (idx: number) => ({ x: clamp(keypoints[idx].x, 0, width), y: clamp(keypoints[idx].y, 0, height) })

  const leftOuterIdx = LIPS_OUTER.indexOf(61)
  const rightOuterIdx = LIPS_OUTER.indexOf(291)
  const leftInnerIdx = LIPS_INNER.indexOf(78)
  const rightInnerIdx = LIPS_INNER.indexOf(308)
  if (leftOuterIdx < 0 || rightOuterIdx < 0 || leftInnerIdx < 0 || rightInnerIdx < 0) return

  const outerUpper = LIPS_OUTER.slice(leftOuterIdx, rightOuterIdx + 1)
  const outerLower = [...LIPS_OUTER.slice(rightOuterIdx), ...LIPS_OUTER.slice(0, leftOuterIdx + 1)]
  const innerLower = LIPS_INNER.slice(leftInnerIdx, rightInnerIdx + 1)
  const innerUpper = [...LIPS_INNER.slice(rightInnerIdx), ...LIPS_INNER.slice(0, leftInnerIdx + 1)]

  const fillRibbon = (outerSeq: number[], innerSeq: number[]) => {
    ctx.beginPath()
    outerSeq.forEach((idx, i) => {
      const p = getPoint(idx)
      if (i === 0) ctx.moveTo(p.x, p.y)
      else ctx.lineTo(p.x, p.y)
    })
    for (let i = innerSeq.length - 1; i >= 0; i--) {
      const p = getPoint(innerSeq[i])
      ctx.lineTo(p.x, p.y)
    }
    ctx.closePath()
    ctx.fill()
  }

  ctx.save()
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
  ctx.fillStyle = color
  fillRibbon(outerUpper, innerUpper)
  fillRibbon(outerLower, innerLower)
  ctx.globalAlpha = 1
  ctx.restore()
}



