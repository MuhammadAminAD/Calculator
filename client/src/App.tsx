import { useState, useEffect, useCallback, useRef } from 'react'
import { calculateExpression } from './api'
import './App.css'

type AngleMode = 'degree' | 'radian'

interface HistoryEntry {
  expression: string
  result: string
}

function App() {
  const [expression, setExpression] = useState('')
  const [display, setDisplay] = useState('0')
  const [angleMode, setAngleMode] = useState<AngleMode>('degree')
  const [isScientific, setIsScientific] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const displayRef = useRef<HTMLDivElement>(null)

  const appendToExpression = useCallback((value: string) => {
    setError(null)
    setExpression(prev => {
      const next = prev + value
      setDisplay(next || '0')
      return next
    })
  }, [])

  const clearAll = useCallback(() => {
    setExpression('')
    setDisplay('0')
    setError(null)
  }, [])

  const backspace = useCallback(() => {
    setError(null)
    setExpression(prev => {
      const funcMatch = prev.match(/(sin|cos|tan|asin|acos|atan|sqrt|ln|log|exp|fact|abs|floor|ceil|round)\($/)
      if (funcMatch) {
        const next = prev.slice(0, -(funcMatch[1].length + 1))
        setDisplay(next || '0')
        return next
      }
      const next = prev.slice(0, -1)
      setDisplay(next || '0')
      return next
    })
  }, [])

  const evaluate = useCallback(async () => {
    if (!expression.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await calculateExpression({
        expression,
        angle_mode: angleMode,
        precision: 10,
      })
      setDisplay(res.formatted_result)
      setHistory(prev => [{ expression, result: res.formatted_result }, ...prev].slice(0, 10))
      setExpression(res.formatted_result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Calculation error')
    } finally {
      setLoading(false)
    }
  }, [expression, angleMode])

  const insertFunction = useCallback((fn: string) => {
    appendToExpression(`${fn}(`)
  }, [appendToExpression])

  const insertConstant = useCallback((c: string) => {
    appendToExpression(c)
  }, [appendToExpression])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') appendToExpression(e.key)
      else if (e.key === '.') appendToExpression('.')
      else if (['+', '-', '*', '/', '%', '^'].includes(e.key)) appendToExpression(e.key)
      else if (e.key === '(' || e.key === ')') appendToExpression(e.key)
      else if (e.key === 'Enter' || e.key === '=') { e.preventDefault(); evaluate() }
      else if (e.key === 'Escape') clearAll()
      else if (e.key === 'Backspace') backspace()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [appendToExpression, evaluate, clearAll, backspace])

  useEffect(() => {
    if (displayRef.current) displayRef.current.scrollLeft = displayRef.current.scrollWidth
  }, [display])

  const scientificRow1 = [
    { label: 'sin', action: () => insertFunction('sin') },
    { label: 'cos', action: () => insertFunction('cos') },
    { label: 'tan', action: () => insertFunction('tan') },
    { label: 'π', action: () => insertConstant('pi'), isConst: true },
    { label: 'ln', action: () => insertFunction('ln') },
  ]
  const scientificRow2 = [
    { label: 'sin⁻¹', action: () => insertFunction('asin') },
    { label: 'cos⁻¹', action: () => insertFunction('acos') },
    { label: 'tan⁻¹', action: () => insertFunction('atan') },
    { label: 'e', action: () => insertConstant('e'), isConst: true },
    { label: 'log', action: () => insertFunction('log') },
  ]
  const scientificRow3 = [
    { label: '√x', action: () => insertFunction('sqrt') },
    { label: 'xⁿ', action: () => appendToExpression('^') },
    { label: 'n!', action: () => insertFunction('fact') },
    { label: 'τ', action: () => insertConstant('tau'), isConst: true },
    { label: 'exp', action: () => insertFunction('exp') },
  ]
  const scientificRow4 = [
    { label: '|x|', action: () => insertFunction('abs') },
    { label: '⌊x⌋', action: () => insertFunction('floor') },
    { label: '⌈x⌉', action: () => insertFunction('ceil') },
    { label: '≈', action: () => insertFunction('round') },
    { label: '%', action: () => appendToExpression('%') },
  ]

  const basicButtons = [
    { label: 'C', action: clearAll, type: 'special' },
    { label: '(', action: () => appendToExpression('('), type: 'special' },
    { label: ')', action: () => appendToExpression(')'), type: 'special' },
    { label: '÷', action: () => appendToExpression('/'), type: 'operator' },
    { label: '7', action: () => appendToExpression('7'), type: 'number' },
    { label: '8', action: () => appendToExpression('8'), type: 'number' },
    { label: '9', action: () => appendToExpression('9'), type: 'number' },
    { label: '×', action: () => appendToExpression('*'), type: 'operator' },
    { label: '4', action: () => appendToExpression('4'), type: 'number' },
    { label: '5', action: () => appendToExpression('5'), type: 'number' },
    { label: '6', action: () => appendToExpression('6'), type: 'number' },
    { label: '−', action: () => appendToExpression('-'), type: 'operator' },
    { label: '1', action: () => appendToExpression('1'), type: 'number' },
    { label: '2', action: () => appendToExpression('2'), type: 'number' },
    { label: '3', action: () => appendToExpression('3'), type: 'number' },
    { label: '+', action: () => appendToExpression('+'), type: 'operator' },
    { label: '0', action: () => appendToExpression('0'), type: 'number', wide: true },
    { label: '.', action: () => appendToExpression('.'), type: 'number' },
    { label: '=', action: evaluate, type: 'equals' },
  ]

  const sciRows = [scientificRow1, scientificRow2, scientificRow3, scientificRow4]

  return (
    <div className="app-root">
      {/* Ambient background */}
      <div className="ambient-bg" />
      <div className="grid-bg" />

      <div className="calc-shell">
        {/* Status bar */}
        <div className="status-bar">
          <div className="status-left">
            <div className="status-dot green" />
            <span className="status-label">CONNECTED</span>
          </div>
          <span className="status-version">v2.0 SCI</span>
        </div>

        {/* Control strip */}
        <div className="control-strip">
          <button
            className={`ctrl-chip ${isScientific ? 'ctrl-active' : ''}`}
            onClick={() => setIsScientific(prev => !prev)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {isScientific ? 'SCIENTIFIC' : 'STANDARD'}
          </button>

          <div className="ctrl-divider" />

          <div className="angle-switch">
            <button className={`angle-opt ${angleMode === 'degree' ? 'angle-active' : ''}`} onClick={() => setAngleMode('degree')}>DEG</button>
            <button className={`angle-opt ${angleMode === 'radian' ? 'angle-active' : ''}`} onClick={() => setAngleMode('radian')}>RAD</button>
          </div>

          <div className="ctrl-divider" />

          <button className={`ctrl-chip ${showHistory ? 'ctrl-active' : ''}`} onClick={() => setShowHistory(prev => !prev)}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            LOG
          </button>
        </div>

        {/* Display */}
        <div className="screen">
          <div className="screen-expr">{expression || '\u00A0'}</div>
          <div className={`screen-result ${error ? 'screen-error' : ''} ${loading ? 'screen-loading' : ''}`} ref={displayRef}>
            {loading ? (
              <span className="loading-dots"><span>.</span><span>.</span><span>.</span></span>
            ) : error ? error : display}
          </div>
        </div>

        {/* History */}
        {showHistory && (
          <div className="log-panel">
            <div className="log-header">
              <span>COMPUTATION LOG</span>
              <button className="log-clear" onClick={() => setHistory([])}>FLUSH</button>
            </div>
            {history.length === 0 ? (
              <div className="log-empty">— empty —</div>
            ) : (
              <div className="log-list">
                {history.map((entry, i) => (
                  <button key={i} className="log-item" onClick={() => { setExpression(entry.result); setDisplay(entry.result); setShowHistory(false) }}>
                    <span className="log-expr">{entry.expression}</span>
                    <span className="log-res">→ {entry.result}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Scientific panel — compact horizontal 5-col grid, NO scroll */}
        {isScientific && (
          <div className="sci-grid">
            {sciRows.map((row, ri) => (
              <div className="sci-row" key={ri}>
                {row.map((btn, ci) => (
                  <button key={ci} className={`sci-btn ${btn.isConst ? 'sci-const' : ''}`} onClick={btn.action}>
                    {btn.label}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Backspace */}
        <div className="del-row">
          <button className="del-btn" onClick={backspace}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" /><line x1="18" y1="9" x2="12" y2="15" /><line x1="12" y1="9" x2="18" y2="15" />
            </svg>
          </button>
        </div>

        {/* Keypad */}
        <div className="pad">
          {basicButtons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`key key-${btn.type} ${btn.wide ? 'key-wide' : ''}`}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="calc-footer">
          <span>POWERED BY API</span>
          <span>•</span>
          <span>{angleMode.toUpperCase()}</span>
        </div>
      </div>
    </div>
  )
}

export default App
