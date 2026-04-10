import ast
import json
import operator as op
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse

_ALLOWED_OPERATORS = {
    ast.Add: op.add,
    ast.Sub: op.sub,
    ast.Mult: op.mul,
    ast.Div: op.truediv,
    ast.USub: op.neg,
}


def _eval_expr(node):
    if isinstance(node, ast.Constant):
        if isinstance(node.value, (int, float)):
            return node.value

    elif isinstance(node, ast.BinOp):
        left = _eval_expr(node.left)
        right = _eval_expr(node.right)

        op_func = _ALLOWED_OPERATORS.get(type(node.op))
        if not op_func:
            raise ValueError("Operator not allowed")

        return op_func(left, right)

    elif isinstance(node, ast.UnaryOp):
        operand = _eval_expr(node.operand)

        op_func = _ALLOWED_OPERATORS.get(type(node.op))
        if not op_func:
            raise ValueError("Operator not allowed")

        return op_func(operand)

    raise ValueError("Invalid expression")


def safe_eval(expression: str):
    try:
        parsed = ast.parse(expression, mode="eval")
        return _eval_expr(parsed.body)
    except Exception:
        raise ValueError("Invalid expression")


from rest_framework.decorators import api_view
from django.views.decorators.csrf import csrf_exempt


@csrf_exempt
@api_view(["POST"])
def calculator(request):
    if request.method != "POST":
        return JsonResponse(
            {"success": False, "error": "Only POST allowed"}, status=405
        )

    try:
        data = json.loads(request.body)
        expression = data.get("data")

        if not expression:
            return JsonResponse(
                {"success": False, "error": "Expression is required"}, status=400
            )

        result = safe_eval(expression)

        return JsonResponse(
            {"success": True, "expression": expression, "result": result}
        )

    except ValueError as e:
        return JsonResponse({"success": False, "error": str(e)}, status=400)

    except Exception:
        return JsonResponse({"success": False, "error": "Server error"}, status=500)
