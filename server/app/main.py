from __future__ import annotations

from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.calculator import CalculatorError, ScientificCalculator, format_result
from app.photo_math import GrokPhotoMathService, PhotoMathError
from app.schemas import (
    CalculationRequest,
    CalculationResponse,
    FunctionInfo,
    HealthResponse,
    MetaResponse,
    PhotoMathResponse,
)

APP_VERSION = "1.0.0"

SUPPORTED_FUNCTIONS = [
    FunctionInfo(
        name="sin", syntax="sin(x)", description="Sine. Respects degree/radian mode."
    ),
    FunctionInfo(
        name="cos", syntax="cos(x)", description="Cosine. Respects degree/radian mode."
    ),
    FunctionInfo(
        name="tan", syntax="tan(x)", description="Tangent. Respects degree/radian mode."
    ),
    FunctionInfo(
        name="asin",
        syntax="asin(x)",
        description="Inverse sine. Returns the current angle mode.",
    ),
    FunctionInfo(
        name="acos",
        syntax="acos(x)",
        description="Inverse cosine. Returns the current angle mode.",
    ),
    FunctionInfo(
        name="atan",
        syntax="atan(x)",
        description="Inverse tangent. Returns the current angle mode.",
    ),
    FunctionInfo(name="sqrt", syntax="sqrt(x)", description="Square root."),
    FunctionInfo(name="ln", syntax="ln(x)", description="Natural logarithm."),
    FunctionInfo(
        name="log",
        syntax="log(x) or log(x, base)",
        description="Base-10 log or custom-base log.",
    ),
    FunctionInfo(
        name="exp", syntax="exp(x)", description="e raised to the given power."
    ),
    FunctionInfo(
        name="fact", syntax="fact(n)", description="Factorial for whole numbers."
    ),
    FunctionInfo(name="abs", syntax="abs(x)", description="Absolute value."),
    FunctionInfo(name="floor", syntax="floor(x)", description="Round down."),
    FunctionInfo(name="ceil", syntax="ceil(x)", description="Round up."),
    FunctionInfo(
        name="round", syntax="round(x) or round(x, n)", description="Rounded result."
    ),
]

app = FastAPI(
    title="Scientific Calculator API",
    version=APP_VERSION,
    docs_url="/swagger",
    redoc_url="/redoc",
    description=(
        "FastAPI backend for a scientific calculator. "
        "It safely evaluates mathematical expressions using Python AST instead of eval."
    ),
    contact={
        "name": "Calculator Backend",
        "url": "http://127.0.0.1:8000/swagger",
    },
    openapi_tags=[
        {"name": "Meta", "description": "Service metadata and health endpoints."},
        {
            "name": "Calculator",
            "description": "Scientific calculator evaluation endpoints.",
        },
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(CalculatorError)
async def calculator_exception_handler(
    _: object, error: CalculatorError
) -> JSONResponse:
    return JSONResponse(status_code=400, content={"detail": str(error)})


@app.exception_handler(PhotoMathError)
async def photo_math_exception_handler(_: object, error: PhotoMathError) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content={"detail": str(error)})


@app.get("/", tags=["Meta"], summary="Service entrypoint")
def root() -> dict[str, str]:
    return {
        "service": "Scientific Calculator API",
        "status": "ok",
        "docs": "/swagger",
        "health": "/api/v1/health",
        "calculate": "/api/v1/calculate",
        "photo_math": "/api/v1/photo-math",
    }


@app.get(
    "/api/v1/health",
    response_model=HealthResponse,
    tags=["Meta"],
    summary="Health check",
)
def healthcheck() -> HealthResponse:
    return HealthResponse(
        status="ok", service="Scientific Calculator API", version=APP_VERSION
    )


@app.get(
    "/api/v1/meta",
    response_model=MetaResponse,
    tags=["Meta"],
    summary="Supported operations and examples",
)
def meta() -> MetaResponse:
    return MetaResponse(
        service="Scientific Calculator API",
        docs_url="/swagger",
        supported_binary_operations=["+", "-", "*", "/", "%", "^", "()"],
        supported_functions=SUPPORTED_FUNCTIONS,
        supported_constants=["pi", "e", "tau"],
        examples=[
            "sin(90) + cos(0)",
            "sqrt(81) + fact(5)",
            "log(100) + ln(e)",
            "2^8 + abs(-3)",
        ],
    )


@app.post(
    "/api/v1/calculate",
    response_model=CalculationResponse,
    tags=["Calculator"],
    summary="Evaluate a scientific expression",
)
def calculate(payload: CalculationRequest) -> CalculationResponse:
    calculator = ScientificCalculator(angle_mode=payload.angle_mode)
    normalized_expression, result = calculator.evaluate(payload.expression)
    return CalculationResponse(
        expression=payload.expression,
        normalized_expression=normalized_expression,
        angle_mode=payload.angle_mode,
        result=result,
        formatted_result=format_result(result, payload.precision),
    )


@app.post(
    "/api/v1/photo-math",
    response_model=PhotoMathResponse,
    tags=["Calculator"],
    summary="Solve a math problem from an uploaded image with Grok vision",
)
async def solve_photo_math(image: UploadFile = File(...)) -> PhotoMathResponse:
    image_bytes = await image.read()
    media_type = image.content_type or "application/octet-stream"

    service = GrokPhotoMathService()
    analysis = await service.solve_image(image_bytes=image_bytes, media_type=media_type)

    return PhotoMathResponse(
        filename=image.filename or "upload",
        media_type=media_type,
        model=service.model,
        can_solve=analysis.can_solve,
        detected_problem=analysis.detected_problem,
        answer=analysis.answer,
        steps=analysis.steps,
        confidence_note=analysis.confidence_note,
    )
