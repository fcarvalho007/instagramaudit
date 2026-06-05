/**
 * User-facing error copy for checkout preparation failures.
 *
 * Raw database / provider errors must never reach the UI. The server
 * function throws this exact message whenever the lead session, the
 * lead row, or the `lead_payments` insert is not usable.
 */

export const SAFE_CHECKOUT_PREPARE_ERROR_PT =
  "Não foi possível preparar o pagamento. Volta ao relatório e tenta novamente.";

export const SAFE_CHECKOUT_PREPARE_ERROR_EN =
  "We could not prepare the payment. Please return to the report and try again.";

/** Default user-facing message — Portuguese (current UI language). */
export const SAFE_CHECKOUT_PREPARE_ERROR = SAFE_CHECKOUT_PREPARE_ERROR_PT;

/**
 * Build a redacted error whose `message` is always the safe copy.
 * Optionally accepts the raw internal cause for server-side logging.
 */
export function safeCheckoutPrepareError(): Error {
  return new Error(SAFE_CHECKOUT_PREPARE_ERROR);
}

/**
 * True when the given error message looks like the safe checkout-prepare
 * copy. Used by tests to assert we never leak DB internals.
 */
export function isSafeCheckoutPrepareError(message: string): boolean {
  return (
    message === SAFE_CHECKOUT_PREPARE_ERROR_PT ||
    message === SAFE_CHECKOUT_PREPARE_ERROR_EN
  );
}