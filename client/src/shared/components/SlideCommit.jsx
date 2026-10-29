import { useEffect, useRef, useState } from 'react'
import './SlideCommit.css'

const PAD = 4
const HANDLE_SIZE = 48
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export default function SlideCommit({
  label = 'Slide to confirm',
  doneLabel = 'Done',
  errorLabel = 'Could not complete',
  onConfirm,
  onDone,
  onError,
  disabled = false,
  holdMs = 1200,
}) {
  const trackRef = useRef(null)
  const handleRef = useRef(null)
  const progressRef = useRef(null)
  const labelRef = useRef(null)
  const pointerRef = useRef(null)
  const positionRef = useRef(0)
  const timerRef = useRef(null)
  const [trackWidth, setTrackWidth] = useState(0)
  const [phase, setPhase] = useState('idle')
  const [held, setHeld] = useState(false)
  const travel = Math.max(0, trackWidth - HANDLE_SIZE - PAD * 2)

  useEffect(() => {
    const track = trackRef.current
    if (!track) return undefined

    let frame = 0
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => setTrackWidth(track.clientWidth))
    })
    observer.observe(track)
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      clearTimeout(timerRef.current)
    }
  }, [])

  const setPosition = (value, animated = true) => {
    const next = clamp(value, 0, travel)
    positionRef.current = next
    if (handleRef.current) {
      handleRef.current.style.transition = animated ? '' : 'none'
      handleRef.current.style.transform = `translate3d(${next}px, 0, 0)`
      handleRef.current.setAttribute('aria-valuenow', String(travel ? Math.round((next / travel) * 100) : 0))
    }
    if (progressRef.current) {
      progressRef.current.style.transition = animated ? '' : 'none'
      progressRef.current.style.width = `${Math.min(trackWidth - PAD * 2, next + HANDLE_SIZE)}px`
    }
    if (labelRef.current) {
      labelRef.current.style.opacity = String(1 - Math.min(1, next / Math.max(1, travel * 0.6)))
    }
  }

  const returnToStart = () => setPosition(0)

  const commit = async () => {
    if (disabled || phase === 'pending' || phase === 'done') return
    setPosition(travel, false)
    setPhase('pending')
    try {
      await onConfirm?.()
      setPhase('done')
      if (labelRef.current) labelRef.current.style.opacity = '1'
      onDone?.()
      if (holdMs > 0) {
        timerRef.current = setTimeout(() => {
          setPhase('idle')
          returnToStart()
        }, holdMs)
      }
    } catch (reason) {
      setPhase('error')
      onError?.(reason)
      returnToStart()
      timerRef.current = setTimeout(() => setPhase('idle'), Math.max(holdMs, 1500))
    }
  }

  const handlePointerDown = (event) => {
    if (
      disabled
      || phase !== 'idle'
      || (event.pointerType === 'mouse' && event.button !== 0)
      || !trackRef.current
    ) return

    clearTimeout(timerRef.current)
    const rect = trackRef.current.getBoundingClientRect()
    pointerRef.current = {
      id: event.pointerId,
      offset: event.clientX - rect.left - PAD - positionRef.current,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setHeld(true)
  }

  const handlePointerMove = (event) => {
    if (pointerRef.current?.id !== event.pointerId || !trackRef.current) return
    const rect = trackRef.current.getBoundingClientRect()
    setPosition(event.clientX - rect.left - PAD - pointerRef.current.offset, false)
  }

  const handlePointerUp = (event) => {
    if (pointerRef.current?.id !== event.pointerId) return
    pointerRef.current = null
    setHeld(false)
    if (travel > 0 && positionRef.current >= travel * 0.92) {
      void commit()
    } else {
      returnToStart()
    }
  }

  const handleKeyDown = (event) => {
    if (disabled || phase !== 'idle') return
    const step = Math.max(1, travel / 10)
    if (event.key === 'End') {
      event.preventDefault()
      void commit()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      const next = Math.min(travel, positionRef.current + step)
      setPosition(next)
      if (next >= travel) void commit()
    } else if (event.key === 'Home' || event.key === 'Escape' || event.key === 'ArrowLeft') {
      event.preventDefault()
      returnToStart()
    }
  }

  return (
    <div
      className="slide-commit"
      data-phase={phase}
      data-held={held ? '' : undefined}
      data-disabled={disabled ? '' : undefined}
    >
      <div className="slide-commit__track" ref={trackRef}>
        <div className="slide-commit__progress" ref={progressRef} aria-hidden="true" />
        <span className="slide-commit__label" ref={labelRef} aria-hidden="true">
          {phase === 'done' ? doneLabel : phase === 'error' ? errorLabel : label}
        </span>
        <div
          className="slide-commit__handle"
          ref={handleRef}
          role="slider"
          tabIndex={disabled ? -1 : 0}
          aria-label={typeof label === 'string' ? label : 'Slide to confirm'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={0}
          aria-valuetext={label}
          aria-busy={phase === 'pending' || undefined}
          aria-disabled={disabled || undefined}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onKeyDown={handleKeyDown}
        >
          {phase === 'pending' ? (
            <span className="slide-commit__spinner" aria-hidden="true" />
          ) : phase === 'done' ? (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path d="m5 12 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true">
              <path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <span className="slide-commit__sr" aria-live="polite">
          {phase === 'pending' ? 'Working' : phase === 'done' ? doneLabel : phase === 'error' ? errorLabel : ''}
        </span>
      </div>
    </div>
  )
}
