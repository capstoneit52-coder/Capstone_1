<?php

namespace App\Http\Controllers\API;

use App\Models\Payment;
use Illuminate\Support\Str;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Http;

class MayaController extends Controller
{
    /**
     * Create Pay with Maya (Wallet) one-time payment via PayBy API (PUBLIC sandbox).
     * Auth: Basic <base64(PUBLIC_KEY:)>
     * Response: { paymentId, redirectUrl }
     */
    public function createPayment(Request $request)
    {
        $request->validate([
            'appointment_id' => 'nullable|exists:appointments,id',
            'patient_visit_id' => 'nullable|exists:patient_visits,id',
        ]);

        $amountDue = $this->computeAmount($request);

        $payment = Payment::create([
            'appointment_id' => $request->appointment_id,
            'patient_visit_id' => $request->patient_visit_id,
            'currency' => 'PHP',
            'amount_due' => $amountDue,
            'amount_paid' => 0,
            'method' => 'maya',
            'status' => 'unpaid',
            'reference_no' => 'PAY-' . now()->format('YmdHis') . '-' . Str::upper(Str::random(6)),
            'created_by' => auth()->id(),
        ]);

        Log::info('payments.db', [
            'db' => DB::selectOne('select database() as db')->db
        ]);

        // PUBLIC key for create
        $publicKey = (string) config('services.maya.public');

        // Base PayMaya host
        $baseUrl = rtrim(env('MAYA_BASE', 'https://pg-sandbox.paymaya.com'), '/');
        $createPath = env('MAYA_PAYBY_CREATE_PATH');

        // ---------- Resolve redirect URLs (absolute HTTPS) ----------
        $baseHost = rtrim((string) config('app.url'), '/');

        // We’ll route returns through API so Laravel can log/poll, then redirect to SPA.
        $successUrl = $baseHost . '/api/maya/return/success';
        $failureUrl = $baseHost . '/api/maya/return/failure';
        $cancelUrl = $baseHost . '/api/maya/return/cancel';

        // Append our own reference so we can find the Payment on return
        $ref = $payment->reference_no;
        $successUrl .= (str_contains($successUrl, '?') ? '&' : '?') . 'ref=' . urlencode($ref);
        $failureUrl .= (str_contains($failureUrl, '?') ? '&' : '?') . 'ref=' . urlencode($ref);
        $cancelUrl .= (str_contains($cancelUrl, '?') ? '&' : '?') . 'ref=' . urlencode($ref);

        Log::info('maya.redirects.resolved', [
            'baseHost' => $baseHost,
            'successUrl' => $successUrl,
            'failureUrl' => $failureUrl,
            'cancelUrl' => $cancelUrl,
            'ref' => $ref,
        ]);

        foreach (['success' => $successUrl, 'failure' => $failureUrl, 'cancel' => $cancelUrl] as $label => $u) {
            $parts = parse_url($u);
            $ok = $u
                && filter_var($u, FILTER_VALIDATE_URL)
                && isset($parts['scheme'], $parts['host'])
                && strtolower($parts['scheme']) === 'https';
            if (!$ok) {
                return response()->json([
                    'message' => "Maya redirectUrl.{$label} must be a valid absolute https URL.",
                    'resolved' => ['url' => $u, 'baseHost' => $baseHost],
                ], 422);
            }
        }

        // ---------- Build payload (PayBy expects totalAmount.value) ----------
        $payload = [
            'totalAmount' => [
                'value' => number_format((float) $payment->amount_due, 2, '.', ''),
                'currency' => $payment->currency,
            ],
            'requestReferenceNumber' => $payment->reference_no,
            'redirectUrl' => [
                'success' => $successUrl,
                'failure' => $failureUrl,
                'cancel' => $cancelUrl,
            ],
            'buyer' => [
                'firstName' => auth()->user()->name ?? 'Customer',
                'contact' => ['email' => auth()->user()->email ?: 'no-reply@example.test'],
            ],
            'metadata' => [
                'dcms_context' => [
                    'appointment_id' => $payment->appointment_id,
                    'patient_visit_id' => $payment->patient_visit_id,
                ],
            ],
        ];

        Log::info('maya.payby.payload.preview', [
            'totalAmount' => $payload['totalAmount'],
            'redirectUrl' => $payload['redirectUrl'],
        ]);

        // ---------- Endpoint candidates ----------
        $candidates = $createPath && is_string($createPath) && $createPath !== ''
            ? [$createPath]
            : [
                '/payby/v2/paymaya/payments',
                '/payby/v2/payments',
            ];

        $lastResp = null;

        foreach ($candidates as $path) {
            $endpoint = $baseUrl . $path;
            Log::info('maya.payby.try', ['endpoint' => $endpoint]);

            $resp = Http::withHeaders([
                'Authorization' => 'Basic ' . base64_encode($publicKey . ':'),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
                'Idempotency-Key' => $payment->reference_no,
                'X-Request-Id' => (string) Str::uuid(),
            ])->post($endpoint, $payload);

            Log::info('maya.payby.response', [
                'endpoint' => $endpoint,
                'status' => $resp->status(),
                'body' => $resp->json() ?: $resp->body(),
            ]);

            if ($resp->successful()) {
                $data = $resp->json();

                $payment->update([
                    'status' => 'awaiting_payment',
                    'maya_payment_id' => $data['paymentId'] ?? null,
                    'redirect_url' => $data['redirectUrl'] ?? null,
                ]);

                return response()->json([
                    'payment_id' => $payment->id,
                    'maya_payment_id' => $payment->maya_payment_id,
                    'redirect_url' => $payment->redirect_url,
                ]);
            }

            $lastResp = $resp;

            $body = $resp->json();
            $code = is_array($body) ? ($body['code'] ?? null) : null;
            if (!in_array($resp->status(), [401, 404]) && !in_array($code, ['K004', 'K007'])) {
                break;
            }
        }

        // None matched → mark failed and bubble a readable error (422)
        $payment->update([
            'status' => 'failed',
            'webhook_last_payload' => ['create_error' => $lastResp?->json() ?: $lastResp?->body()],
        ]);

        return response()->json([
            'message' => 'Unable to create Maya wallet payment.',
            'maya' => $lastResp?->json() ?: ['raw' => $lastResp?->body()],
        ], 422);
    }

    /**
     * Browser return handler (public sandbox).
     * - Reads ?ref=PAY-...
     * - Finds the Payment
     * - Polls PUBLIC-Key status API a few times
     * - Marks paid if Maya says SUCCESS/APPROVED
     * - Redirects to your SPA routes
     */
    public function returnCapture(Request $request, string $outcome)
    {
        Log::info('maya.return.' . $outcome, [
            'full_url' => $request->fullUrl(),
            'query' => $request->query(),
        ]);

        $ref = $request->query('ref');
        $payment = $ref ? Payment::where('reference_no', $ref)->first() : null;

        if ($payment && $payment->maya_payment_id && $payment->status !== 'paid') {
            $poll = $this->pollMayaStatusPublic($payment->maya_payment_id, attempts: 3);

            Log::info('maya.return.poll_result', [
                'payment_id' => $payment->id,
                'reference_no' => $payment->reference_no,
                'outcome' => $outcome,
                'poll_ok' => $poll['ok'],
                'poll_body' => $poll['body'] ?? null,
            ]);

            if ($poll['ok']) {
                $payment->update([
                    'status' => 'paid',
                    'amount_paid' => $payment->amount_due,
                    'paid_at' => now(),
                    'webhook_last_payload' => $poll['body'], // keep last proof
                ]);
                if ($payment->appointment_id) {
                    $payment->appointment()->update(['payment_status' => 'paid']);
                }
                Log::info('maya.status.public.mark_paid', ['payment_id' => $payment->id]);
            }
        } elseif (!$payment) {
            Log::warning('maya.return.payment_not_found', ['ref' => $ref]);
        }

        // Send user to SPA
        $target = match (true) {
            $payment && $payment->status === 'paid' => env('MAYA_SUCCESS_URL') ?: (config('app.url') . '/app/pay/success'),
            $outcome === 'cancel' => env('MAYA_CANCEL_URL') ?: (config('app.url') . '/app/pay/cancel'),
            default => env('MAYA_FAILURE_URL') ?: (config('app.url') . '/app/pay/failure'),
        };
        return redirect()->away($target);
    }

    /**
     * PUBLIC-key status poll for public sandbox (no webhooks).
     * Returns ['ok'=>bool, 'body'=>array].
     */
    private function pollMayaStatusPublic(string $mayaPaymentId, int $attempts = 3, int $delayMs = 800): array
    {
        $publicKey = (string) config('services.maya.public'); // PUBLIC key
        if (!$publicKey) {
            Log::warning('maya.poll.public.no_public_key');
            return ['ok' => false, 'body' => []];
        }

        $baseUrl = rtrim(env('MAYA_BASE', 'https://pg-sandbox.paymaya.com'), '/');
        $statusPath = '/payments/v1/payments/{id}/status'; // public-status endpoint
        $endpoint = $baseUrl . str_replace('{id}', urlencode($mayaPaymentId), $statusPath);

        for ($i = 1; $i <= $attempts; $i++) {
            $resp = Http::withHeaders([
                'Authorization' => 'Basic ' . base64_encode($publicKey . ':'),
                'Accept' => 'application/json',
            ])->get($endpoint);

            $json = $resp->json() ?: ['raw' => $resp->body()];
            $status = is_array($json) ? ($json['status'] ?? null) : null;

            Log::info('maya.status.public.try', [
                'attempt' => $i,
                'http_status' => $resp->status(),
                'body' => $json,
            ]);

            if (in_array($status, ['SUCCESS', 'APPROVED', 'PAYMENT_SUCCESS'], true)) {
                return ['ok' => true, 'body' => $json];
            }

            usleep($delayMs * 1000);
            $delayMs = (int) min(4000, $delayMs * 2); // 0.8s → 1.6s → 3.2s
        }

        return ['ok' => false, 'body' => []];
    }

    /**
     * (Kept) Secret-key status (useful if you add an admin "recheck" button)
     */
    public function status(string $paymentId)
    {
        $secretKey = (string) config('services.maya.secret');
        $baseUrl = rtrim(env('MAYA_BASE', 'https://pg-sandbox.paymaya.com'), '/');
        $statusPath = env('MAYA_STATUS_PATH', '/payments/v1/payments/{id}/status');
        $endpoint = $baseUrl . str_replace('{id}', urlencode($paymentId), $statusPath);

        $resp = Http::withHeaders([
            'Authorization' => 'Basic ' . base64_encode($secretKey . ':'),
            'Accept' => 'application/json',
        ])->get($endpoint);

        Log::info('maya.payby.status.response', [
            'status' => $resp->status(),
            'body' => $resp->json() ?: $resp->body(),
        ]);

        return response()->json($resp->json() ?: ['raw' => $resp->body()], $resp->status());
    }

    /**
     * Webhook (unused in public sandbox, kept for future prod)
     */
    public function webhook(Request $request)
    {
        // In public sandbox there’s no dashboard/webhook registration.
        // Keeping this for when you switch to production.
        $payload = $request->json()->all();
        $mayaPaymentId = $payload['paymentId'] ?? ($payload['id'] ?? null);
        $status = $payload['status'] ?? null;

        $payment = $mayaPaymentId ? Payment::where('maya_payment_id', $mayaPaymentId)->first() : null;
        if ($payment) {
            $updates = [
                'webhook_last_payload' => $payload,
                'webhook_first_received_at' => $payment->webhook_first_received_at ?? now(),
            ];

            if (in_array($status, ['PAYMENT_SUCCESS', 'SUCCESS', 'APPROVED'])) {
                $updates['status'] = 'paid';
                $updates['amount_paid'] = $payment->amount_due;
                $updates['paid_at'] = now();
            } elseif (in_array($status, ['PAYMENT_CANCELLED', 'CANCELLED'])) {
                $updates['status'] = 'cancelled';
                $updates['cancelled_at'] = now();
            } elseif (in_array($status, ['PAYMENT_FAILED', 'FAILED', 'DECLINED'])) {
                $updates['status'] = 'failed';
            }

            $payment->update($updates);

            if ($payment->appointment_id && isset($updates['status'])) {
                $payment->appointment()->update([
                    'payment_status' => $updates['status'] === 'paid' ? 'paid' : 'unpaid',
                ]);
            }
        }

        return response()->json(['ok' => true]);
    }

    private function computeAmount(Request $request): float
    {
        // TODO: compute from appointment/visit/promos
        return 1500.00;
    }
}
