export class OrderValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderValidationError";
  }
}

export type DeliveryQuoteInput = {
  shippingMinor: bigint;
};

export function validateDeliveryQuoteInput(value: unknown): DeliveryQuoteInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OrderValidationError("Provide a valid delivery quote request.");
  }

  const body = value as Record<string, unknown>;
  const shippingMinor = body.shippingMinor;

  if (
    typeof shippingMinor !== "string" ||
    !/^(0|[1-9][0-9]{0,18})$/.test(shippingMinor)
  ) {
    throw new OrderValidationError(
      "Delivery fee must be a whole-number string in minor currency units.",
    );
  }

  const amount = BigInt(shippingMinor);

  if (amount > 9223372036854775807n) {
    throw new OrderValidationError("Delivery fee is too large.");
  }

  return { shippingMinor: amount };
}

export type CancelOrderInput = {
  reason: string;
};

export function validateCancelOrderInput(value: unknown): CancelOrderInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new OrderValidationError("Provide a valid cancellation request.");
  }

  const body = value as Record<string, unknown>;

  if (typeof body.reason !== "string") {
    throw new OrderValidationError("A cancellation reason is required.");
  }

  const reason = body.reason.trim();

  if (reason.length === 0 || Array.from(reason).length > 500) {
    throw new OrderValidationError(
      "Cancellation reason must contain between 1 and 500 characters.",
    );
  }

  if (reason.includes("\u0000")) {
    throw new OrderValidationError(
      "Cancellation reason contains an invalid character.",
    );
  }

  return { reason };
}
