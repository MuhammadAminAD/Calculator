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
      // Try to remove function names as a unit
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

  // Keyboard support
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

  // Auto-scroll display
  useEffect(() => {
    if (displayRef.current) {
      displayRef.current.scrollLeft = displayRef.current.scrollWidth
    }
  }, [display])

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
    { label: '=', action: evaluate, type: 'operator' },
  ]

  const scientificButtons = [
    { label: 'sin', action: () => insertFunction('sin'), type: 'func' },
    { label: 'cos', action: () => insertFunction('cos'), type: 'func' },
    { label: 'tan', action: () => insertFunction('tan'), type: 'func' },
    { label: 'π', action: () => insertConstant('pi'), type: 'const' },
    { label: 'asin', action: () => insertFunction('asin'), type: 'func' },
    { label: 'acos', action: () => insertFunction('acos'), type: 'func' },
    { label: 'atan', action: () => insertFunction('atan'), type: 'func' },
    { label: 'e', action: () => insertConstant('e'), type: 'const' },
    { label: '√', action: () => insertFunction('sqrt'), type: 'func' },
    { label: 'ln', action: () => insertFunction('ln'), type: 'func' },
    { label: 'log', action: () => insertFunction('log'), type: 'func' },
    { label: 'τ', action: () => insertConstant('tau'), type: 'const' },
    { label: 'xⁿ', action: () => appendToExpression('^'), type: 'func' },
    { label: 'n!', action: () => insertFunction('fact'), type: 'func' },
    { label: 'exp', action: () => insertFunction('exp'), type: 'func' },
    { label: '%', action: () => appendToExpression('%'), type: 'func' },
    { label: '|x|', action: () => insertFunction('abs'), type: 'func' },
    { label: '⌊x⌋', action: () => insertFunction('floor'), type: 'func' },
    { label: '⌈x⌉', action: () => insertFunction('ceil'), type: 'func' },
    { label: '≈', action: () => insertFunction('round'), type: 'func' },
  ]

  return (
    <div className="app-container">
      {/* Outer glow */}
      <div className="calculator-wrapper">
        <div className="glow-effect" />

        <div className={`calculator ${isScientific ? 'calculator-scientific' : ''}`}>
          {/* Top bar */}
          <div className="top-bar">
            <button
              className={`mode-toggle ${isScientific ? 'active' : ''}`}
              onClick={() => setIsScientific(prev => !prev)}
              title="Toggle scientific mode"
            >
              <span className="mode-icon">{isScientific ? '🔬' : '🔢'}</span>
              <span className="mode-label">{isScientific ? 'SCI' : 'STD'}</span>
            </button>

            <div className="angle-toggle">
              <button
                className={`angle-btn ${angleMode === 'degree' ? 'active' : ''}`}
                onClick={() => setAngleMode('degree')}
              >
                DEG
              </button>
              <button
                className={`angle-btn ${angleMode === 'radian' ? 'active' : ''}`}
                onClick={() => setAngleMode('radian')}
              >
                RAD
              </button>
            </div>

            <button
              className={`history-btn ${showHistory ? 'active' : ''}`}
              onClick={() => setShowHistory(prev => !prev)}
              title="History"
            >
              🕐
            </button>
          </div>

          {/* Display */}
          <div className="display">
            <div className="display-expression">
              {expression || '\u00A0'}
            </div>
            <div className={`display-result ${error ? 'display-error' : ''} ${loading ? 'display-loading' : ''}`} ref={displayRef}>
              {loading ? '...' : error ? error : display}
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <div className="history-panel">
              <div className="history-header">
                <span>History</span>
                <button className="history-clear" onClick={() => setHistory([])}>Clear</button>
              </div>
              {history.length === 0 ? (
                <div className="history-empty">No calculations yet</div>
              ) : (
                <div className="history-list">
                  {history.map((entry, i) => (
                    <button
                      key={i}
                      className="history-item"
                      onClick={() => {
                        setExpression(entry.result)
                        setDisplay(entry.result)
                        setShowHistory(false)
                      }}
                    >
                      <span className="history-expr">{entry.expression}</span>
                      <span className="history-res">= {entry.result}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Scientific panel */}
          {isScientific && (
            <div className="scientific-panel">
              {scientificButtons.map((btn, idx) => (
                <button
                  key={idx}
                  onClick={btn.action}
                  className={`btn btn-${btn.type}`}
                >
                  {btn.label}
                </button>
              ))}
            </div>
          )}

          {/* Backspace row */}
          <div className="backspace-row">
            <button className="btn btn-backspace" onClick={backspace}>
              ⌫
            </button>
          </div>

          {/* Basic keypad */}
          <div className="keypad">
            {basicButtons.map((btn, idx) => (
              <button
                key={idx}
                onClick={btn.action}
                className={`btn btn-${btn.type} ${btn.wide ? 'btn-wide' : ''}`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
