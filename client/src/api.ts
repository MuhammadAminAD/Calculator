const API_BASE = 'https://calculator-iclv.onrender.com/api/v1';

export interface CalculationRequest {
    expression: string;
    angle_mode?: 'degree' | 'radian';
    precision?: number;
}

export interface CalculationResponse {
    expression: string;
    normalized_expression: string;
    angle_mode: 'degree' | 'radian';
    result: number;
    formatted_result: string;
}

export interface ApiError {
    detail?: Array<{ loc: (string | number)[]; msg: string; type: string }>;
    message?: string;
}

export async function calculateExpression(
    request: CalculationRequest
): Promise<CalculationResponse> {
    const res = await fetch(`${API_BASE}/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => null);
        if (err?.detail && Array.isArray(err.detail)) {
            throw new Error(err.detail.map((d: { msg: string }) => d.msg).join('; '));
        }
        throw new Error(err?.message || `Calculation failed (${res.status})`);
    }

    return res.json();
}

export async function checkHealth(): Promise<boolean> {
    try {
        const res = await fetch(`${API_BASE}/health`);
        return res.ok;
    } catch {
        return false;
    }
}
