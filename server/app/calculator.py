from __future__ import annotations

import ast
import math
import operator
import re
from collections.abc import Callable

Number = int | float


class CalculatorError(ValueError):
    """Raised when an expression cannot be safely evaluated."""


def normalize_expression(expression: str) -> str:
    normalized = expression.strip()
    if not normalized:
        raise CalculatorError("Expression is required.")

    replacements = {
        "^": "**",
        "×": "*",
        "÷": "/",
        "π": "pi",
        "√": "sqrt",
    }

    for source, target in replacements.items():
        normalized = normalized.replace(source, target)

    normalized = re.sub(r"\s+", "", normalized)
    return normalized


def format_result(value: Number, precision: int = 10) -> str:
    if isinstance(value, int):
        return str(value)

    if math.isclose(value, 0.0, abs_tol=10 ** (-(precision + 1))):
        value = 0.0

    formatted = f"{value:.{precision}g}"
    if "e" not in formatted and "E" not in formatted and "." in formatted:
        formatted = formatted.rstrip("0").rstrip(".")
    return formatted


class ScientificCalculator:
    MAX_AST_NODES = 120
    MAX_EXPRESSION_LENGTH = 240
    MAX_FACTORIAL_INPUT = 170

    def __init__(self, angle_mode: str = "radian") -> None:
        if angle_mode not in {"degree", "radian"}:
            raise CalculatorError("angle_mode must be either 'degree' or 'radian'.")

        self.angle_mode = angle_mode
        self.binary_operators: dict[type[ast.operator], Callable[[Number, Number], Number]] = {
            ast.Add: operator.add,
            ast.Sub: operator.sub,
            ast.Mult: operator.mul,
            ast.Div: operator.truediv,
            ast.Pow: operator.pow,
            ast.Mod: operator.mod,
        }
        self.unary_operators: dict[type[ast.unaryop], Callable[[Number], Number]] = {
            ast.UAdd: operator.pos,
            ast.USub: operator.neg,
        }
        self.constants: dict[str, Number] = {
            "pi": math.pi,
            "e": math.e,
            "tau": math.tau,
        }
        self.functions: dict[str, Callable[..., Number]] = {
            "sin": self._sin,
            "cos": self._cos,
            "tan": self._tan,
            "asin": self._asin,
            "acos": self._acos,
            "atan": self._atan,
            "sqrt": self._wrap_math_function(math.sqrt, "sqrt"),
            "abs": abs,
            "ln": self._wrap_math_function(math.log, "ln"),
            "log": self._log,
            "log10": self._wrap_math_function(math.log10, "log10"),
            "exp": self._wrap_math_function(math.exp, "exp"),
            "fact": self._factorial,
            "factorial": self._factorial,
            "floor": self._wrap_math_function(math.floor, "floor"),
            "ceil": self._wrap_math_function(math.ceil, "ceil"),
            "round": self._round,
        }

    def evaluate(self, expression: str) -> tuple[str, Number]:
        normalized = normalize_expression(expression)
        if len(normalized) > self.MAX_EXPRESSION_LENGTH:
            raise CalculatorError("Expression is too long.")

        try:
            tree = ast.parse(normalized, mode="eval")
        except SyntaxError as error:
            raise CalculatorError("Expression syntax is invalid.") from error

        if sum(1 for _ in ast.walk(tree)) > self.MAX_AST_NODES:
            raise CalculatorError("Expression is too complex.")

        result = self._evaluate_node(tree.body)
        if isinstance(result, float):
            if not math.isfinite(result):
                raise CalculatorError("Result is not finite.")
            if result.is_integer():
                return normalized, int(result)

        return normalized, result

    def _evaluate_node(self, node: ast.AST) -> Number:
        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
                raise CalculatorError("Only numeric constants are allowed.")
            return node.value

        if isinstance(node, ast.Name):
            if node.id not in self.constants:
                raise CalculatorError(f"Unsupported constant or variable: {node.id}")
            return self.constants[node.id]

        if isinstance(node, ast.BinOp):
            operation = self.binary_operators.get(type(node.op))
            if operation is None:
                raise CalculatorError("Unsupported operator.")
            left = self._evaluate_node(node.left)
            right = self._evaluate_node(node.right)
            try:
                return operation(left, right)
            except ZeroDivisionError as error:
                raise CalculatorError("Division by zero is not allowed.") from error
            except OverflowError as error:
                raise CalculatorError("Number is too large.") from error

        if isinstance(node, ast.UnaryOp):
            operation = self.unary_operators.get(type(node.op))
            if operation is None:
                raise CalculatorError("Unsupported unary operator.")
            value = self._evaluate_node(node.operand)
            return operation(value)

        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise CalculatorError("Only direct function calls are allowed.")
            if node.keywords:
                raise CalculatorError("Keyword arguments are not supported.")
            function = self.functions.get(node.func.id)
            if function is None:
                raise CalculatorError(f"Unsupported function: {node.func.id}")
            arguments = [self._evaluate_node(argument) for argument in node.args]
            try:
                return function(*arguments)
            except TypeError as error:
                raise CalculatorError(f"Invalid arguments for function '{node.func.id}'.") from error

        raise CalculatorError("Unsupported expression.")

    def _to_radians(self, value: Number) -> float:
        return math.radians(value) if self.angle_mode == "degree" else float(value)

    def _from_radians(self, value: float) -> float:
        return math.degrees(value) if self.angle_mode == "degree" else value

    def _sin(self, value: Number) -> float:
        return math.sin(self._to_radians(value))

    def _cos(self, value: Number) -> float:
        return math.cos(self._to_radians(value))

    def _tan(self, value: Number) -> float:
        radians = self._to_radians(value)
        if math.isclose(math.cos(radians), 0.0, abs_tol=1e-12):
            raise CalculatorError("tan is undefined for this angle.")
        return math.tan(radians)

    def _asin(self, value: Number) -> float:
        try:
            return self._from_radians(math.asin(value))
        except ValueError as error:
            raise CalculatorError("asin is only defined in the [-1, 1] range.") from error

    def _acos(self, value: Number) -> float:
        try:
            return self._from_radians(math.acos(value))
        except ValueError as error:
            raise CalculatorError("acos is only defined in the [-1, 1] range.") from error

    def _atan(self, value: Number) -> float:
        return self._from_radians(math.atan(value))

    def _log(self, *values: Number) -> float:
        try:
            if len(values) == 1:
                return math.log10(values[0])
            if len(values) == 2:
                return math.log(values[0], values[1])
        except ValueError as error:
            raise CalculatorError("log only accepts positive values and a valid base.") from error
        raise CalculatorError("log accepts either 1 value or 2 values with a base.")

    def _factorial(self, value: Number) -> int:
        if isinstance(value, float) and not value.is_integer():
            raise CalculatorError("factorial only accepts whole numbers.")
        integer_value = int(value)
        if integer_value < 0:
            raise CalculatorError("factorial is not defined for negative numbers.")
        if integer_value > self.MAX_FACTORIAL_INPUT:
            raise CalculatorError("factorial input is too large.")
        return math.factorial(integer_value)

    def _round(self, *values: Number) -> Number:
        if len(values) == 1:
            return round(values[0])
        if len(values) == 2:
            if isinstance(values[1], float) and not values[1].is_integer():
                raise CalculatorError("round precision must be an integer.")
            return round(values[0], int(values[1]))
        raise CalculatorError("round accepts 1 or 2 arguments.")

    def _wrap_math_function(
        self,
        function: Callable[[float], Number],
        name: str,
    ) -> Callable[[Number], Number]:
        def wrapped(value: Number) -> Number:
            try:
                return function(float(value))
            except ValueError as error:
                raise CalculatorError(f"{name} received a value outside its domain.") from error
            except OverflowError as error:
                raise CalculatorError(f"{name} received a value that is too large.") from error

        return wrapped
