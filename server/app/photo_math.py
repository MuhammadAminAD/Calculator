from __future__ import annotations

import asyncio
import base64
import json
import os
from collections.abc import Mapping
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from groq import APIConnectionError, APIStatusError, APITimeoutError, Groq

from app.schemas import PhotoMathAnalysis

load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DEFAULT_GROQ_MODEL = os.getenv(
    "GROQ_PHOTOMATH_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct"
)
SUPPORTED_VISION_MODELS = {
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "meta-llama/llama-4-maverick-17b-128e-instruct",
}
MAX_IMAGE_SIZE_BYTES = 20 * 1024 * 1024
MAX_BASE64_IMAGE_SIZE_BYTES = 4 * 1024 * 1024
SUPPORTED_IMAGE_TYPES = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
}
PHOTO_MATH_SCHEMA: dict[str, Any] = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "can_solve": {"type": "boolean"},
        "detected_problem": {"type": "string"},
        "answer": {"type": "string"},
        "steps": {
            "type": "array",
            "items": {"type": "string"},
        },
        "confidence_note": {"type": "string"},
    },
    "required": [
        "can_solve",
        "detected_problem",
        "answer",
        "steps",
        "confidence_note",
    ],
}
SYSTEM_PROMPT = (
    "You analyze a photo of a math exercise and answer in strict JSON. "
    "Return exactly one JSON object with keys: can_solve, detected_problem, answer, steps, confidence_note. "
    "If the image is ambiguous, explain that in confidence_note. "
    "If no solvable math problem is visible, set can_solve=false, keep answer short, and leave steps empty. "
    "When the problem is solvable, provide the final answer and 2-5 concise steps."
)
USER_PROMPT = (
    "Read the uploaded image like a PhotoMath app. "
    "Extract the main visible math problem, solve it, and return concise Uzbek-friendly steps."
)


class PhotoMathError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502) -> None:
        super().__init__(message)
        self.status_code = status_code


class GrokPhotoMathService:
    def __init__(
        self,
        api_key: str | None = None,
        model: str = DEFAULT_GROQ_MODEL,
        timeout: float = 45.0,
    ) -> None:
        self.api_key = (
            api_key
            or os.getenv("GROQ_API_KEY")
            or os.getenv("GROK_SECRET_KEY")
            or os.getenv("XAI_API_KEY")
        )
        self.model = model
        self.timeout = timeout
        self.client = (
            Groq(api_key=self.api_key, timeout=self.timeout, max_retries=0)
            if self.api_key
            else None
        )

    async def solve_image(
        self,
        image_bytes: bytes,
        media_type: str,
        prompt: str | None = None,
    ) -> PhotoMathAnalysis:
        if media_type not in SUPPORTED_IMAGE_TYPES:
            raise PhotoMathError(
                "Only JPG and PNG images are supported for PhotoMath upload.",
                400,
            )

        if not image_bytes:
            raise PhotoMathError("Uploaded image is empty.", 400)

        if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
            raise PhotoMathError("Image must be smaller than 20 MiB.", 400)

        if not self.api_key or not self.client:
            raise PhotoMathError(
                "GROQ_API_KEY or GROK_SECRET_KEY is not configured on the backend.",
                503,
            )

        if self.model not in SUPPORTED_VISION_MODELS:
            raise PhotoMathError(
                "Configured GROQ_PHOTOMATH_MODEL does not support image input.",
                500,
            )

        base64_image = base64.b64encode(image_bytes).decode("ascii")
        if len(base64_image.encode("ascii")) > MAX_BASE64_IMAGE_SIZE_BYTES:
            raise PhotoMathError(
                "Groq base64 image uploads must stay under 4 MiB. Please upload a smaller image.",
                400,
            )

        data_url = f"data:{media_type};base64,{base64_image}"

        try:
            return await asyncio.to_thread(
                self._request_completion,
                data_url,
                prompt.strip() if prompt and prompt.strip() else USER_PROMPT,
            )
        except PhotoMathError:
            raise
        except APITimeoutError as error:
            raise PhotoMathError("Groq request timed out.") from error
        except APIConnectionError as error:
            raise PhotoMathError("Could not connect to Groq API.") from error
        except APIStatusError as error:
            raise PhotoMathError(self._build_upstream_error(error), 502) from error

    def _request_completion(self, data_url: str, prompt: str) -> PhotoMathAnalysis:
        primary_response = self.client.chat.completions.create(
            model=self.model,
            messages=self._build_messages(data_url, prompt),
            response_format={
                "type": "json_schema",
                "json_schema": {
                    "name": "photo_math_solution",
                    "strict": False,
                    "schema": PHOTO_MATH_SCHEMA,
                },
            },
            temperature=0.2,
            max_completion_tokens=700,
            top_p=1,
            stream=False,
            stop=None,
        )

        content = primary_response.choices[0].message.content or ""
        try:
            return PhotoMathAnalysis.model_validate_json(content)
        except Exception:
            fallback_response = self.client.chat.completions.create(
                model=self.model,
                messages=self._build_messages(
                    data_url,
                    (
                        f"{prompt} "
                        "Return only a valid JSON object that matches the requested schema."
                    ),
                ),
                response_format={"type": "json_object"},
                temperature=0.2,
                max_completion_tokens=700,
                top_p=1,
                stream=False,
                stop=None,
            )
            fallback_content = fallback_response.choices[0].message.content or ""
            try:
                parsed = json.loads(fallback_content)
            except json.JSONDecodeError as error:
                raise PhotoMathError("Groq returned invalid JSON for the uploaded image.") from error

            try:
                return PhotoMathAnalysis.model_validate(parsed)
            except Exception as error:
                raise PhotoMathError("Groq returned invalid structured output.") from error

    def _build_messages(self, data_url: str, prompt: str) -> list[dict[str, Any]]:
        return [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ]

    def _build_upstream_error(self, error: APIStatusError) -> str:
        status_code = getattr(error, "status_code", None)
        response = getattr(error, "response", None)
        if status_code is None and response is not None:
            status_code = getattr(response, "status_code", None)

        body = getattr(error, "body", None)
        message = str(error)

        if isinstance(body, Mapping):
            detail = body.get("error") or body.get("message") or body.get("detail")
            if isinstance(detail, Mapping) and isinstance(detail.get("message"), str):
                message = detail["message"]
            elif isinstance(detail, str):
                message = detail

            code = body.get("code")
            if isinstance(code, str):
                message = f"{code}: {message}"

        if isinstance(status_code, int):
            return f"Groq request failed ({status_code}): {message}"

        return f"Groq request failed: {message}"
