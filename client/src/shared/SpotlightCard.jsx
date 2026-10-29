export function SpotlightCard({
  children,
  className = '',
  style,
  onPointerMove,
  onPointerLeave,
  ...props
}) {
  const handlePointerMove = (event) => {
    if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return

    const bounds = event.currentTarget.getBoundingClientRect()
    event.currentTarget.style.setProperty('--spotlight-x', `${event.clientX - bounds.left}px`)
    event.currentTarget.style.setProperty('--spotlight-y', `${event.clientY - bounds.top}px`)
    event.currentTarget.style.setProperty('--spotlight-opacity', '1')
    onPointerMove?.(event)
  }

  const handlePointerLeave = (event) => {
    event.currentTarget.style.setProperty('--spotlight-opacity', '0')
    onPointerLeave?.(event)
  }

  return (
    <article
      {...props}
      className={`spotlight-card${className ? ` ${className}` : ''}`}
      style={style}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {children}
    </article>
  )
}
