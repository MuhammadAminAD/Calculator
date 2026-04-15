import { startTransition, useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

type CalculationResponse = {
  expression: string
  normalized_expression: string
  angle_mode: 'degree' | 'radian'
  result: number
  formatted_result: string
}

type PhotoMathResult = {
  filename: string
  media_type: string
  model: string
  can_solve: boolean
  detected_problem: string
  answer: string
  steps: string[]
  confidence_note: string
}

type AngleMode = 'degree' | 'radian'
type ViewMode = 'calculator' | 'photo'

const rawApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const API_BASE_URL = rawApiBaseUrl
  ? rawApiBaseUrl.replace(/\/$/, '')
  : window.location.hostname === 'localhost'
    ? 'http://127.0.0.1:8000'
    : window.location.origin

const keypadButtons = [
  { label: 'C', type: 'action' },
  { label: '(', type: 'token', value: '(' },
  { label: ')', type: 'token', value: ')' },
  { label: '÷', type: 'token', value: '/' },
  { label: '7', type: 'token', value: '7' },
  { label: '8', type: 'token', value: '8' },
  { label: '9', type: 'token', value: '9' },
  { label: '×', type: 'token', value: '*' },
  { label: '4', type: 'token', value: '4' },
  { label: '5', type: 'token', value: '5' },
  { label: '6', type: 'token', value: '6' },
  { label: '-', type: 'token', value: '-' },
  { label: '1', type: 'token', value: '1' },
  { label: '2', type: 'token', value: '2' },
  { label: '3', type: 'token', value: '3' },
  { label: '+', type: 'token', value: '+' },
  { label: '0', type: 'token', value: '0' },
  { label: '.', type: 'token', value: '.' },
  { label: '^', type: 'token', value: '^' },
  { label: '⌫', type: 'backspace' },
] as const

const scientificTokens = [
  'sin(',
  'cos(',
  'tan(',
  'sqrt(',
  'ln(',
  'log(',
  'pi',
  'e',
  'abs(',
  'fact(',
] as const

function App() {
  const expressionInputRef = useRef<HTMLInputElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('calculator')
  const [expression, setExpression] = useState('')
  const [angleMode, setAngleMode] = useState<AngleMode>('degree')
  const [calculation, setCalculation] = useState<CalculationResponse | null>(null)
  const [calcLoading, setCalcLoading] = useState(false)
  const [calcError, setCalcError] = useState<string | null>(null)
  const [photoMathResult, setPhotoMathResult] = useState<PhotoMathResult | null>(null)
  const [photoMathLoading, setPhotoMathLoading] = useState(false)
  const [photoMathError, setPhotoMathError] = useState<string | null>(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)

  useEffect(() => {
    async function startCamera() {
      if (viewMode !== 'photo') {
        stopCamera()
        return
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Brauzer kamerani qo‘llamaydi.')
        setCameraReady(false)
        return
      }

      setCameraError(null)
      setCameraReady(false)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        })

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        setCameraReady(true)
      } catch {
        setCameraError('Kameraga ruxsat berilmadi yoki kamera topilmadi.')
        setCameraReady(false)
      }
    }

    function stopCamera() {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      if (videoRef.current) {
        videoRef.current.srcObject = null
      }

      setCameraReady(false)
    }

    void startCamera()

    return () => {
      stopCamera()
    }
  }, [viewMode])

  function focusExpressionInput(position?: number) {
    if (!expressionInputRef.current) return

    expressionInputRef.current.focus()
    if (typeof position === 'number') {
      expressionInputRef.current.setSelectionRange(position, position)
    }
  }

  function insertText(token: string) {
    const input = expressionInputRef.current
    if (!input) {
      setExpression((prev) => prev + token)
      return
    }

    const start = input.selectionStart ?? expression.length
    const end = input.selectionEnd ?? expression.length
    const nextExpression = expression.slice(0, start) + token + expression.slice(end)
    const nextCursorPosition = start + token.length

    setExpression(nextExpression)
    setCalcError(null)

    requestAnimationFrame(() => focusExpressionInput(nextCursorPosition))
  }

  function clearExpression() {
    setExpression('')
    setCalculation(null)
    setCalcError(null)
    requestAnimationFrame(() => focusExpressionInput(0))
  }

  function backspaceExpression() {
    const input = expressionInputRef.current
    if (!input) {
      setExpression((prev) => prev.slice(0, -1))
      return
    }

    const start = input.selectionStart ?? expression.length
    const end = input.selectionEnd ?? expression.length

    if (start !== end) {
      const nextExpression = expression.slice(0, start) + expression.slice(end)
      setExpression(nextExpression)
      setCalcError(null)
      requestAnimationFrame(() => focusExpressionInput(start))
      return
    }

    if (start === 0) return

    const nextExpression = expression.slice(0, start - 1) + expression.slice(end)
    setExpression(nextExpression)
    setCalcError(null)
    requestAnimationFrame(() => focusExpressionInput(start - 1))
  }

  async function handleCalculate(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault()

    const trimmedExpression = expression.trim()
    if (!trimmedExpression) {
      setCalcError('Formula kiriting.')
      return
    }

    setCalcLoading(true)
    setCalcError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/calculate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expression: trimmedExpression,
          angle_mode: angleMode,
          precision: 10,
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'Formula hisoblanmadi.',
        )
      }

      setCalculation(payload as CalculationResponse)
    } catch (error) {
      setCalculation(null)
      setCalcError(error instanceof Error ? error.message : 'Noma’lum xato yuz berdi.')
    } finally {
      setCalcLoading(false)
    }
  }

  function applyPhotoProblem() {
    const sourceExpression = photoMathResult?.detected_problem?.trim()
    if (!sourceExpression) return

    setExpression(sourceExpression)
    setCalculation(null)
    setCalcError(null)
    setViewMode('calculator')
    requestAnimationFrame(() => focusExpressionInput(sourceExpression.length))
  }

  async function handlePhotoMathSubmit() {
    if (!videoRef.current || !cameraReady) {
      setPhotoMathError('Avval kamerani ishga tushiring.')
      return
    }

    const frameBlob = await captureFrame()
    if (!frameBlob) {
      setPhotoMathError('Kameradan rasm olinmadi.')
      return
    }

    const formData = new FormData()
    formData.append('image', frameBlob, 'capture.jpg')

    setPhotoMathLoading(true)
    setPhotoMathError(null)

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/photo-math`, {
        method: 'POST',
        body: formData,
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(
          typeof payload?.detail === 'string'
            ? payload.detail
            : 'Rasm o‘qilmadi.',
        )
      }

      startTransition(() => {
        setPhotoMathResult(payload as PhotoMathResult)
      })
    } catch (error) {
      setPhotoMathResult(null)
      setPhotoMathError(error instanceof Error ? error.message : 'Noma’lum xato yuz berdi.')
    } finally {
      setPhotoMathLoading(false)
    }
  }

  async function captureFrame() {
    const video = videoRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      return null
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const context = canvas.getContext('2d')
    if (!context) return null

    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.92)
    })
  }

  const displayExpression =
    calculation?.normalized_expression || expression || '0'
  const displayValue = calcLoading ? '...' : calculation?.formatted_result || '0'

  return (
    <main className="app-shell">
      <section className="app-card">
        <header className="app-header">
          <h1 className="title">Calculator</h1>

          <div className="view-toggle" role="tablist" aria-label="Calculator mode">
            <button
              type="button"
              className={viewMode === 'calculator' ? 'toggle-button is-active' : 'toggle-button'}
              onClick={() => setViewMode('calculator')}
            >
              Hisoblash
            </button>
            <button
              type="button"
              className={viewMode === 'photo' ? 'toggle-button is-active' : 'toggle-button'}
              onClick={() => setViewMode('photo')}
            >
              Rasm
            </button>
          </div>
        </header>

        {viewMode === 'calculator' ? (
          <>
            <section className="display-panel">
              <p className="display-expression">{displayExpression}</p>
              <p className="display-value">{displayValue}</p>
            </section>

            {calcError ? <div className="message-banner is-error">{calcError}</div> : null}

            <form onSubmit={handleCalculate} className="calculator-section">
              <div className="toolbar">
                <input
                  ref={expressionInputRef}
                  type="text"
                  value={expression}
                  readOnly
                  placeholder="sin(90)+sqrt(16)"
                  className="expression-input"
                  autoComplete="off"
                />

                <div className="mode-toggle" role="group" aria-label="Angle mode">
                  <button
                    type="button"
                    onClick={() => setAngleMode('degree')}
                    className={angleMode === 'degree' ? 'mode-button is-active' : 'mode-button'}
                  >
                    Deg
                  </button>
                  <button
                    type="button"
                    onClick={() => setAngleMode('radian')}
                    className={angleMode === 'radian' ? 'mode-button is-active' : 'mode-button'}
                  >
                    Rad
                  </button>
                </div>
              </div>

              <div className="chip-grid">
                {scientificTokens.map((token) => (
                  <button
                    key={token}
                    type="button"
                    className="chip-button"
                    onClick={() => insertText(token)}
                  >
                    {token}
                  </button>
                ))}
              </div>

              <div className="keypad-grid">
                {keypadButtons.map((button) => (
                  <button
                    key={button.label}
                    type="button"
                    className={button.type === 'action' || button.type === 'backspace' ? 'keypad-button is-muted' : 'keypad-button'}
                    onClick={() => {
                      if (button.type === 'action') {
                        clearExpression()
                        return
                      }

                      if (button.type === 'backspace') {
                        backspaceExpression()
                        return
                      }

                      insertText(button.value)
                    }}
                  >
                    {button.label}
                  </button>
                ))}
              </div>

              <button type="submit" className="primary-button" disabled={calcLoading}>
                =
              </button>
            </form>
          </>
        ) : (
          <section className="photo-section">
            <section className="display-panel">
              <p className="display-expression">
                {photoMathResult?.detected_problem || 'Rasm'}
              </p>
              <p className="display-value">
                {photoMathLoading ? '...' : photoMathResult?.answer || '0'}
              </p>
            </section>

            {photoMathError ? <div className="message-banner is-error">{photoMathError}</div> : null}

            <div className="photo-preview">
              {cameraError ? (
                <div className="photo-placeholder">{cameraError}</div>
              ) : (
                <video
                  ref={videoRef}
                  className="photo-image"
                  autoPlay
                  muted
                  playsInline
                />
              )}
            </div>

            <button
              type="button"
              onClick={handlePhotoMathSubmit}
              disabled={!cameraReady || photoMathLoading}
              className="primary-button"
            >
              Yechish
            </button>

            {!cameraError ? <p className="meta-line">Kamera rasmidan to‘g‘ridan-to‘g‘ri yechiladi.</p> : null}

            {photoMathResult?.steps.length ? (
              <ol className="steps-list">
                {photoMathResult.steps.map((step) => (
                  <li key={step} className="step-item">
                    <span className="step-dot" />
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {photoMathResult?.detected_problem ? (
              <button type="button" className="secondary-button" onClick={applyPhotoProblem}>
                Formulaga qo‘yish
              </button>
            ) : null}

            {photoMathResult?.confidence_note ? (
              <p className="meta-line">{photoMathResult.confidence_note}</p>
            ) : null}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
