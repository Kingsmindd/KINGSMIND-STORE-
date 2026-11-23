import toast from "react-hot-toast";
import { ActionNotice } from "../../components/ui/AppNotifications";
import BackLink from "../../components/ui/BackLink";
import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import {
  createAdminProduct,
  createAdminProductVariant,
  setAdminProductVisibility,
} from "../../services/product.service";

export default function CreateProductPage() {
  const navigate = useNavigate();

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [variantSaved, setVariantSaved] = useState(false);
  const [createdProductId, setCreatedProductId] = useState<string | null>(null);
  const inputClass =
    "mt-2 block min-h-11 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-900 transition-colors placeholder:text-stone-400 focus:border-[#17352a] focus:outline-2 focus:outline-offset-2 focus:outline-[#17352a]";

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePreview) return;

    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  async function handleCreateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;

    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();
    const sku = String(fields.get("sku") ?? "").trim();
    const price = String(fields.get("price") ?? "").trim();

    if (!name || !sku) {
      setCreateError("Enter a product name and SKU.");
      return;
    }

    if (!/^\d{1,17}(\.\d{1,2})?$/.test(price)) {
      setCreateError(
        "Enter a price with up to two decimal places, such as 25000.00.",
      );
      return;
    }

    const [whole, fraction = ""] = price.split(".");
    const amountMinor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

    if (amountMinor <= 0n || amountMinor > 9223372036854775807n) {
      setCreateError("Enter a positive price within the supported range.");
      return;
    }

    const variant = {
      sku,
      size: String(fields.get("size") ?? "").trim() || undefined,
      colour: String(fields.get("colour") ?? "").trim() || undefined,
      stockQuantity: Number(fields.get("stockQuantity")),
      amountMinor: amountMinor.toString(),
    };

    let productId = createdProductId;
    setCreating(true);
    setCreateError("");

    try {
      if (!productId) {
        const productFields = new FormData();
        productFields.set("name", name);

        for (const field of ["description", "currency", "image"]) {
          const value = fields.get(field);
          if (value !== null) productFields.set(field, value);
        }

        const { product } = await createAdminProduct(productFields);
        productId = product.id;
        setCreatedProductId(productId);
      }

      if (!variantSaved) {
        await createAdminProductVariant(productId, variant);
        setVariantSaved(true);
      }

      await setAdminProductVisibility(productId, true);
      toast.success("Product created and published.", { id: "product-result" });
      navigate("/", { replace: true });
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : "Please try again.";

      setCreateError(message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-10 md:px-8 md:py-12">
      <BackLink to="/admin/products">Back to products</BackLink>

      <h1 className="mt-5 text-3xl font-bold tracking-tight text-[#17352a] sm:text-4xl">
        Create product
      </h1>
      <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
        Add the product details, picture and price, then publish it to the collection.
      </p>

      <form onSubmit={handleCreateProduct} className="mt-7 space-y-6">
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
          <div className="min-w-0 space-y-6">
            <section aria-labelledby="product-details-heading" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 id="product-details-heading" className="mb-5 text-lg font-bold text-[#17352a]">
                Product details
              </h2>
              <div className="space-y-5">
                <label className="block text-sm font-semibold">
                  Product name
                  <input name="name" required maxLength={200} className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">
                  Description
                  <textarea name="description" rows={4} maxLength={5000} className={inputClass} />
                </label>
              </div>
            </section>

            <section aria-labelledby="product-pricing-heading" className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6">
              <h2 id="product-pricing-heading" className="mb-5 text-lg font-bold text-[#17352a]">
                Price and inventory
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <label className="block text-sm font-semibold sm:col-span-2">
                  SKU
                  <input name="sku" required maxLength={100} aria-describedby="sku-help" className={inputClass} />
                  <span id="sku-help" className="mt-2 block text-xs font-normal leading-5 text-stone-500">
                    A unique stock code for this product.
                  </span>
                </label>
                <label className="block text-sm font-semibold">
                  Currency
                  <select name="currency" defaultValue="NGN" className={inputClass}>
                    <option value="NGN">NGN</option>
                    <option value="USD">USD</option>
                  </select>
                </label>
                <label className="block text-sm font-semibold">
                  Price
                  <input name="price" inputMode="decimal" placeholder="25000.00" required className={inputClass} />
                </label>
                <label className="block text-sm font-semibold sm:col-span-2">
                  Stock quantity
                  <input name="stockQuantity" type="number" min={0} max={2147483647} step={1} required className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">
                  Size <span className="font-normal text-stone-500">(optional)</span>
                  <input name="size" className={inputClass} />
                </label>
                <label className="block text-sm font-semibold">
                  Colour <span className="font-normal text-stone-500">(optional)</span>
                  <input name="colour" className={inputClass} />
                </label>
              </div>
            </section>
          </div>

          <section aria-labelledby="product-picture-heading" className="min-w-0 rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 lg:sticky lg:top-16">
            <h2 id="product-picture-heading" className="text-lg font-bold text-[#17352a]">
              Product picture
            </h2>
            <div className="mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-stone-200 bg-[#f1f2eb] p-5">
              {imagePreview ? (
                <img src={imagePreview} alt="Selected product picture" className="h-full w-full object-contain" />
              ) : (
                <p className="max-w-48 text-center text-sm leading-6 text-stone-500">
                  Select a picture to preview it here.
                </p>
              )}
            </div>
            <label className="mt-5 block text-sm font-semibold">
              Choose picture
              <input
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                required
                aria-describedby="product-picture-help"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  setImagePreview(file ? URL.createObjectURL(file) : null);
                }}
                className="mt-2 block w-full min-w-0 cursor-pointer rounded-lg border border-stone-300 bg-white p-2 text-xs text-stone-600 file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-[#edf0e7] file:px-3 file:py-2 file:text-xs file:font-semibold file:text-[#17352a] hover:file:bg-[#e0e6d7] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a]"
              />
            </label>
            <p id="product-picture-help" className="mt-2 text-xs leading-5 text-stone-500">
              JPEG, PNG or WebP.
            </p>
          </section>
        </div>

        {createError && (
          <ActionNotice message={createError} type={"error"} />
        )}

        <div className="flex justify-end border-t border-stone-200 pt-5">
          <button
          type="submit"
          disabled={creating}
          className="inline-flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl bg-[#17352a] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#244b3c] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#17352a] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {creating
            ? "Saving…"
            : variantSaved
              ? "Retry publishing"
              : createdProductId
                ? "Save variant and publish"
                : "Create and publish product"}
        </button>
        </div>
      </form>
    </section>
  );
}
