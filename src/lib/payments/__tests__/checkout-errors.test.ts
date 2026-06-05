import { describe, expect, it } from "vitest";

import {
  SAFE_CHECKOUT_PREPARE_ERROR,
  SAFE_CHECKOUT_PREPARE_ERROR_EN,
  SAFE_CHECKOUT_PREPARE_ERROR_PT,
  isSafeCheckoutPrepareError,
  safeCheckoutPrepareError,
} from "../checkout-errors";

describe("payments/checkout-errors", () => {
  it("PT copy matches the agreed user-facing message", () => {
    expect(SAFE_CHECKOUT_PREPARE_ERROR_PT).toBe(
      "Não foi possível preparar o pagamento. Volta ao relatório e tenta novamente.",
    );
  });

  it("EN copy matches the agreed user-facing message", () => {
    expect(SAFE_CHECKOUT_PREPARE_ERROR_EN).toBe(
      "We could not prepare the payment. Please return to the report and try again.",
    );
  });

  it("default safe message is the PT copy", () => {
    expect(SAFE_CHECKOUT_PREPARE_ERROR).toBe(SAFE_CHECKOUT_PREPARE_ERROR_PT);
  });

  it("safeCheckoutPrepareError() throws only the safe copy and never DB internals", () => {
    const err = safeCheckoutPrepareError();
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe(SAFE_CHECKOUT_PREPARE_ERROR);

    // Forbidden leaks that previously surfaced from raw insertErr.message.
    const forbidden = [
      "lead_payments",
      "lead_payments_lead_id_fkey",
      "foreign key constraint",
      "violates",
      "leads",
      "SQLSTATE",
    ];
    for (const token of forbidden) {
      expect(err.message.toLowerCase()).not.toContain(token.toLowerCase());
    }
  });

  it("isSafeCheckoutPrepareError recognises both PT and EN copies", () => {
    expect(isSafeCheckoutPrepareError(SAFE_CHECKOUT_PREPARE_ERROR_PT)).toBe(true);
    expect(isSafeCheckoutPrepareError(SAFE_CHECKOUT_PREPARE_ERROR_EN)).toBe(true);
    expect(
      isSafeCheckoutPrepareError(
        'Failed to create payment row: insert or update on table "lead_payments" violates foreign key constraint "lead_payments_lead_id_fkey"',
      ),
    ).toBe(false);
  });
});