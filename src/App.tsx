import { useState } from 'react'
import './App.css'

function App() {
  const [display, setDisplay] = useState('0')
  const [previousValue, setPreviousValue] = useState<string | null>(null)
  const [operator, setOperator] = useState<string | null>(null)

  const handleNumber = (num: string) => {
    setDisplay(prev => prev === '0' ? num : prev + num)
  }

  const handleOperator = (op: string) => {
    setOperator(op)
    setPreviousValue(display)
    setDisplay('0')
  }

  const calculate = () => {
    if (!previousValue || !operator) return
    const prev = parseFloat(previousValue)
    const current = parseFloat(display)
    let result = 0

    switch (operator) {
      case '+': result = prev + current; break
      case '-': result = prev - current; break
      case '*': result = prev * current; break
      case '/': result = prev / current; break
    }

    setDisplay(String(result))
    setPreviousValue(null)
    setOperator(null)
  }

  const clear = () => {
    setDisplay('0')
    setPreviousValue(null)
    setOperator(null)
  }

  const buttons = [
    { label: 'C', action: clear, type: 'special' },
    { label: '±', action: () => { }, type: 'special' },
    { label: '%', action: () => { }, type: 'special' },
    { label: '/', action: () => handleOperator('/'), type: 'operator' },
    { label: '7', action: () => handleNumber('7'), type: 'number' },
    { label: '8', action: () => handleNumber('8'), type: 'number' },
    { label: '9', action: () => handleNumber('9'), type: 'number' },
    { label: '*', action: () => handleOperator('*'), type: 'operator' },
    { label: '4', action: () => handleNumber('4'), type: 'number' },
    { label: '5', action: () => handleNumber('5'), type: 'number' },
    { label: '6', action: () => handleNumber('6'), type: 'number' },
    { label: '-', action: () => handleOperator('-'), type: 'operator' },
    { label: '1', action: () => handleNumber('1'), type: 'number' },
    { label: '2', action: () => handleNumber('2'), type: 'number' },
    { label: '3', action: () => handleNumber('3'), type: 'number' },
    { label: '+', action: () => handleOperator('+'), type: 'operator' },
    { label: '0', action: () => handleNumber('0'), type: 'number', wide: true },
    { label: '.', action: () => handleNumber('.'), type: 'number' },
    { label: '=', action: calculate, type: 'operator' },
  ]

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-400 to-indigo-500 bg-clip-text text-transparent">
          SmartCalc Pro
        </h1>
        <p className="text-slate-400 mt-2">Professional UI by Antigravity</p>
      </div>

      <div className="glass p-6 rounded-[2.5rem] shadow-2xl w-full max-w-[340px] border border-white/10 ring-1 ring-white/5">
        {/* Display */}
        <div className="mb-6 px-4 py-8 text-right overflow-hidden rounded-2xl bg-black/20 border border-white/5">
          <div className="text-slate-500 text-sm h-6 transition-all duration-300">
            {previousValue} {operator}
          </div>
          <div className="text-5xl font-light tracking-tighter text-white truncate transition-all duration-300">
            {display}
          </div>
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-4 gap-3">
          {buttons.map((btn, idx) => (
            <button
              key={idx}
              onClick={btn.action}
              className={`
                h-16 rounded-2xl text-xl font-medium transition-all duration-200 active:scale-95
                ${btn.wide ? 'col-span-2' : ''}
                ${btn.type === 'number' ? 'bg-white/5 hover:bg-white/10 text-white' : ''}
                ${btn.type === 'operator' ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg shadow-sky-500/20' : ''}
                ${btn.type === 'special' ? 'bg-slate-700/50 hover:bg-slate-700/70 text-sky-400' : ''}
              `}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-12 flex gap-4 text-xs text-slate-500 uppercase tracking-widest font-semibold">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          Connected to Backend
        </div>
        <div>v1.0.0</div>
      </div>
    </div>
  )
}

export default App
