from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

AngleMode = Literal["degree", "radian"]


class CalculationRequest(BaseModel):
    expression: str = Field(
        ...,
        min_length=1,
        max_length=240,
        description="Scientific expression to evaluate. Supports +, -, *, /, %, ^, parentheses, constants and functions.",
        examples=["sin(90) + sqrt(16) + 2^5"],
    )
    angle_mode: AngleMode = Field(
        default="degree",
        description="Angle mode used by trigonometric functions.",
    )
    precision: int = Field(
        default=10,
        ge=1,
        le=14,
        description="Digits used when formatting the response for UI display.",
    )

    model_config = ConfigDict(
        json_schema_extra={
            "examples": [
                {
                    "expression": "sin(90) + sqrt(16) + 2^5",
                    "angle_mode": "degree",
                    "precision": 10,
                },
                {
                    "expression": "cos(pi) + log(100) + fact(5)",
                    "angle_mode": "radian",
                    "precision": 12,
                },
            ]
        }
    )


class CalculationResponse(BaseModel):
    expression: str = Field(..., description="Original expression received from the client.")
    normalized_expression: str = Field(..., description="Expression after normalizing tokens such as ^, pi and sqrt.")
    angle_mode: AngleMode = Field(..., description="Angle mode used during evaluation.")
    result: int | float = Field(..., description="Raw numeric result.")
    formatted_result: str = Field(..., description="UI-friendly result string with the requested precision.")


class HealthResponse(BaseModel):
    status: str
    service: str
    version: str


class FunctionInfo(BaseModel):
    name: str
    syntax: str
    description: str


class MetaResponse(BaseModel):
    service: str
    docs_url: str
    supported_binary_operations: list[str]
    supported_functions: list[FunctionInfo]
    supported_constants: list[str]
    examples: list[str]
