Scientific Calculator Backend (FastAPI)

Run locally
1. py -m venv .venv
2. .\.venv\Scripts\Activate.ps1
3. pip install -r requirements.txt
4. uvicorn app.main:app --reload
5. Create `.env` from `.env.example` and set `GROQ_API_KEY` for PhotoMath uploads

Useful URLs
- API root: http://127.0.0.1:8000/
- Swagger UI: http://127.0.0.1:8000/swagger
- ReDoc: http://127.0.0.1:8000/redoc
- Health check: http://127.0.0.1:8000/api/v1/health
- PhotoMath endpoint: http://127.0.0.1:8000/api/v1/photo-math

Supported examples
- sin(90) + cos(0)
- sqrt(81) + fact(5)
- log(100) + ln(e)
- 2^8 + abs(-3)

Notes
- Trigonometric functions work in degree or radian mode.
- The evaluator is safe: it uses Python AST parsing and does not use eval().
- PhotoMath expects JPG or PNG images under 20 MiB.
- Groq direct base64 image uploads must stay under 4 MiB.
- PhotoMath model can be overridden with `GROQ_PHOTOMATH_MODEL`.
