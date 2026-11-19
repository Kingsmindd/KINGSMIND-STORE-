export type CheckoutItemInput = {
  variantId: string;
  quantity: number;
};

export type ShippingAddressInput = {
  recipientName: string;
  phone: string;
  addressLine1: string;
  city: string;
  state: string;
  countryCode: "NG";
};

export type CheckoutInput = {
  items: CheckoutItemInput[];
  currency: "NGN" | "USD";
  shippingAddress: ShippingAddressInput;
  pricingFingerprint?: string;
};

export class CheckoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutValidationError";
  }
}

export function validateCheckoutItems(value: unknown): CheckoutItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CheckoutValidationError(
      "Your order must contain at least one item.",
    );
  }

  if (value.length > 50) {
    throw new CheckoutValidationError(
      "Your order cannot contain more than 50 different items.",
    );
  }

  const seenVariants = new Set<string>();

  return value.map((item: unknown) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new CheckoutValidationError("Invalid order item.");
    }

    const { variantId, quantity } = item as Record<string, unknown>;

    if (
      typeof variantId !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        variantId,
      )
    ) {
      throw new CheckoutValidationError("Invalid variant ID.");
    }

    if (
      typeof quantity !== "number" ||
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > 100
    ) {
      throw new CheckoutValidationError(
        "Item quantity must be a whole number between 1 and 100.",
      );
    }

    const cleanVariantId = variantId.toLowerCase();

    if (seenVariants.has(cleanVariantId)) {
      throw new CheckoutValidationError(
        "Combine repeated variants into one item with the required quantity.",
      );
    }

    seenVariants.add(cleanVariantId);

    return {
      variantId: cleanVariantId,
      quantity,
    };
  });
}

function readRequiredText(
  value: unknown,
  field: string,
  maxLength: number,
): string {
  if (typeof value !== "string") {
    throw new CheckoutValidationError(`${field} is required.`);
  }

  const text = value.trim();

  if (text.length === 0 || text.length > maxLength) {
    throw new CheckoutValidationError(
      `${field} must contain between 1 and ${maxLength} characters.`,
    );
  }

  return text;
}

export function validateShippingAddress(value: unknown): ShippingAddressInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CheckoutValidationError("Provide a valid shipping address.");
  }

  const address = value as Record<string, unknown>;

  return {
    recipientName: readRequiredText(
      address.recipientName,
      "Recipient name",
      200,
    ),
    phone: readRequiredText(address.phone, "Phone number", 30),
    addressLine1: readRequiredText(address.addressLine1, "Street address", 250),
    city: readRequiredText(address.city, "City", 100),
    state: readRequiredText(address.state, "State", 100),
    countryCode: "NG",
  };
}

export function validateCheckoutInput(value: unknown): CheckoutInput {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new CheckoutValidationError("Provide a valid checkout request.");
  }

  const body = value as Record<string, unknown>;

  if (body.currency !== "NGN" && body.currency !== "USD") {
    throw new CheckoutValidationError("Currency must be NGN or USD.");
  }

  const fingerprint = body.pricingFingerprint;

  if (
    fingerprint !== undefined &&
    (body.currency !== "NGN" ||
      typeof fingerprint !== "string" ||
      !/^[a-f0-9]{64}$/.test(fingerprint))
  ) {
    throw new CheckoutValidationError("Invalid checkout price preview.");
  }

  return {
    items: validateCheckoutItems(body.items),
    currency: body.currency,
    ...(fingerprint === undefined ? {} : { pricingFingerprint: fingerprint }),
    shippingAddress: validateShippingAddress(body.shippingAddress),
  };
}
