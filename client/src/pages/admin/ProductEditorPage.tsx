import BackLink from "../../components/ui/BackLink";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  deleteAdminProduct,
  getAdminProduct,
  setAdminProductVisibility,
  updateAdminProduct,
  updateAdminProductImage,
  updateAdminVariantPrice,
} from "../../services/product.service";
import { formatMoney } from "../../utils/formatMoney";
import type { FormEvent } from "react";
import { resolveImageUrl } from "../../config/api";

type Product = Awaited<ReturnType<typeof getAdminProduct>>["product"];
type Result = { id: string; product: Product } | { id: string; error: string };

export default function ProductEditorPage() {
  const { productId = "" } = useParams();
  const [result, setResult] = useState<Result | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<{
    id: string;
    message: string;
    isError: boolean;
  } | null>(null);

  const [changingVisibility, setChangingVisibility] = useState(false);
  const [visibilityError, setVisibilityError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  const navigate = useNavigate();
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    if (!imagePreview) return;

    return () => URL.revokeObjectURL(imagePreview);
  }, [imagePreview]);

  useEffect(() => {
    const controller = new AbortController();

    void getAdminProduct(productId, controller.signal)
      .then(({ product }) => {
        if (!controller.signal.aborted) setResult({ id: productId, product });
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            id: productId,
            error:
              error instanceof Error
                ? error.message
                : "Could not load the product.",
          });
        }
      });

    return () => controller.abort();
  }, [productId]);

  const current = result?.id === productId ? result : null;
  const product = current && "product" in current ? current.product : null;

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product || saving || changingVisibility) return;

    const fields = new FormData(event.currentTarget);
    const name = String(fields.get("name") ?? "").trim();
    const description = String(fields.get("description") ?? "").trim();

    if (!name) {
      setSaveFeedback({
        id: product.id,
        message: "Enter a product name.",
        isError: true,
      });
      return;
    }

    setSaving(true);
    setSaveFeedback(null);

    try {
      await updateAdminProduct(product.id, {
        name,
        description: description || null,
      });

      const image = fields.get("image");

      if (image instanceof File && image.size > 0) {
        await updateAdminProductImage(product.id, image);
      }

      navigate("/admin/products", {
        replace: true,
        state: { productUpdated: true },
      });
    } catch (error: unknown) {
      setSaveFeedback({
        id: product.id,
        message:
          error instanceof Error
            ? error.message
            : "Could not save the product.",
        isError: true,
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleVisibilityChange() {
    if (!product || saving || changingVisibility) return;

    setChangingVisibility(true);
    setVisibilityError(null);

    try {
      const { product: updated } = await setAdminProductVisibility(
        product.id,
        !product.is_active,
      );
      if (updated.is_active) {
        navigate("/admin/products", { replace: true });
        return;
      }
      setResult((previous) => {
        if (
          !previous ||
          previous.id !== product.id ||
          !("product" in previous)
        ) {
          return previous;
        }

        return {
          ...previous,
          product: { ...previous.product, is_active: updated.is_active },
        };
      });
    } catch (error: unknown) {
      setVisibilityError({
        id: product.id,
        message:
          error instanceof Error
            ? error.message
            : "Could not change product visibility.",
      });
    } finally {
      setChangingVisibility(false);
    }
  }

  const [savingPriceId, setSavingPriceId] = useState<string | null>(null);
  const [priceError, setPriceError] = useState<{
    variantId: string;
    message: string;
  } | null>(null);

  async function handlePriceSave(
    event: FormEvent<HTMLFormElement>,
    variantId: string,
  ) {
    event.preventDefault();
    if (!product || savingPriceId) return;

    const fields = new FormData(event.currentTarget);
    const value = String(fields.get("price") ?? "").trim();

    if (!/^\d{1,17}(\.\d{1,2})?$/.test(value)) {
      setPriceError({ variantId, message: "Enter a price such as 27500.00." });
      return;
    }

    const [whole, fraction = ""] = value.split(".");
    const amountMinor = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));

    if (amountMinor <= 0n || amountMinor > 9223372036854775807n) {
      setPriceError({
        variantId,
        message: "Enter a positive price within the supported range.",
      });
      return;
    }

    setSavingPriceId(variantId);
    setPriceError(null);

    try {
      const { price } = await updateAdminVariantPrice(
        product.id,
        variantId,
        amountMinor.toString(),
      );

      setResult((previous) => {
        if (
          !previous ||
          previous.id !== product.id ||
          !("product" in previous)
        ) {
          return previous;
        }

        return {
          ...previous,
          product: {
            ...previous.product,
            variants: previous.product.variants.map((variant) =>
              variant.id === variantId
                ? { ...variant, amount_minor: price.amount_minor }
                : variant,
            ),
          },
        };
      });
    } catch (error: unknown) {
      setPriceError({
        variantId,
        message:
          error instanceof Error
            ? error.message
            : "Could not update the price.",
      });
    } finally {
      setSavingPriceId(null);
    }
  }
  const deleteDialogRef = useRef<HTMLDialogElement>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDeleteProduct() {
    if (!product || deleting) return;

    setDeleting(true);
    setDeleteError("");

    try {
      await deleteAdminProduct(product.id);
      deleteDialogRef.current?.close();
      navigate("/admin/products", { replace: true });
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : "Could not delete the product.",
      );
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-12 md:px-8">
      <BackLink to="/admin/products">Back to products</BackLink>

      {!current && (
        <p role="status" className="mt-6">
          Loading product…
        </p>
      )}
      {current && "error" in current && (
        <p role="alert" className="mt-6 text-red-800">
          {current.error}
        </p>
      )}

      {product && (
        <>
          <h1 className="mt-5 wrap-break-word text-4xl font-bold">
            {product.name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p
              aria-live="polite"
              className="text-sm font-semibold text-stone-600"
            >
              {product.is_active ? "Published" : "Hidden"} · {product.currency}
            </p>

            <button
              type="button"
              onClick={handleVisibilityChange}
              disabled={saving || changingVisibility}
              className="cursor-pointer rounded-md border border-[#17352a] bg-white px-4 py-2 text-sm font-semibold text-[#17352a] hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {changingVisibility
                ? "Updating…"
                : product.is_active
                  ? "Unpublish"
                  : "Publish"}
            </button>
          </div>

          {visibilityError?.id === product.id && (
            <p role="alert" className="mt-2 text-sm text-red-800">
              {visibilityError.message}
            </p>
          )}
          <p className="mt-4 text-stone-600">
            {product.description || "No description yet."}
          </p>

          <form
            key={`details-${product.id}`}
            onSubmit={handleSave}
            className="mt-8 rounded-lg border border-stone-200 bg-white p-5 sm:p-6"
          >
            <h2 className="text-xl font-bold">Edit product details</h2>

            <fieldset
              disabled={saving || changingVisibility}
              className="mt-5 space-y-4"
            >
              <label className="block text-sm font-semibold">
                Product name
                <input
                  name="name"
                  required
                  maxLength={200}
                  defaultValue={product.name}
                  className="mt-2 block w-full rounded border border-stone-300 px-4 py-3"
                />
              </label>

              <label className="block text-sm font-semibold">
                Description
                <textarea
                  name="description"
                  rows={4}
                  maxLength={5000}
                  defaultValue={product.description ?? ""}
                  className="mt-2 block w-full rounded border border-stone-300 px-4 py-3"
                />
              </label>
            </fieldset>

            {saveFeedback?.id === product.id && (
              <p
                role={saveFeedback.isError ? "alert" : "status"}
                className={`mt-4 text-sm ${
                  saveFeedback.isError ? "text-red-800" : "text-emerald-800"
                }`}
              >
                {saveFeedback.message}
              </p>
            )}
            <section className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-xl font-bold">Product picture</h2>

              {imagePreview || product.image_url ? (
                <figure className="mt-4">
                  <img
                    src={imagePreview ?? resolveImageUrl(product.image_url!)}
                    alt={
                      imagePreview
                        ? "Selected replacement picture"
                        : product.name
                    }
                    className="h-40 w-40 rounded bg-[#e9ebdf] object-contain"
                  />
                  {imagePreview && (
                    <figcaption className="mt-2 text-sm text-stone-600">
                      Preview · not saved yet
                    </figcaption>
                  )}
                </figure>
              ) : (
                <p className="mt-4 text-sm text-stone-600">
                  No picture uploaded yet.
                </p>
              )}

              <fieldset
                disabled={saving || changingVisibility}
                className="mt-4 space-y-4"
              >
                <label className="block text-sm font-semibold">
                  Choose a new picture
                  <input
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => {
                      const file = event.currentTarget.files?.[0];
                      setImagePreview(file ? URL.createObjectURL(file) : null);
                    }}
                    className="mt-2 block w-full cursor-pointer rounded border border-stone-300 p-2 file:cursor-pointer"
                  />
                </label>
              </fieldset>
            </section>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={saving || changingVisibility}
                className="cursor-pointer rounded bg-[#17352a] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>

          <h2 className="mt-8 text-xl font-bold">Variants</h2>
          {product.variants.length === 0 && (
            <p className="mt-3">No variants yet.</p>
          )}

          <ul className="mt-4 divide-y divide-stone-200 border-y border-stone-200">
            {product.variants.map((variant) => (
              <li
                key={variant.id}
                className="flex flex-wrap justify-between gap-3 py-4"
              >
                <div>
                  <p className="font-semibold">
                    {[variant.colour, variant.size]
                      .filter(Boolean)
                      .join(" / ") || variant.sku}
                  </p>
                  <p className="text-sm text-stone-600">
                    {variant.sku} · {variant.is_active ? "Active" : "Hidden"}
                  </p>
                </div>
                <div className="text-sm">
                  <p>
                    {variant.amount_minor === null
                      ? "No price yet"
                      : formatMoney(variant.amount_minor, product.currency)}
                  </p>
                  <p className="text-stone-600">
                    {variant.stock_quantity} available
                  </p>
                  {variant.amount_minor !== null && (
                    <details className="mt-2">
                      <summary className="cursor-pointer font-semibold text-[#17352a]">
                        Edit price
                      </summary>

                      <form
                        onSubmit={(event) =>
                          void handlePriceSave(event, variant.id)
                        }
                        className="mt-2 space-y-2"
                      >
                        <label className="block">
                          New price ({product.currency})
                          <input
                            name="price"
                            inputMode="decimal"
                            placeholder="27500.00"
                            required
                            className="mt-1 block w-full rounded-md border border-stone-300 px-3 py-2"
                          />
                        </label>

                        <button
                          type="submit"
                          disabled={savingPriceId !== null}
                          className="cursor-pointer rounded-md bg-[#17352a] px-3 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {savingPriceId === variant.id
                            ? "Saving…"
                            : "Save price"}
                        </button>

                        {priceError?.variantId === variant.id && (
                          <p role="alert" className="text-red-800">
                            {priceError.message}
                          </p>
                        )}
                      </form>
                    </details>
                  )}
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 border-t border-stone-200 pt-6">
            <button
              type="button"
              disabled={
                saving ||
                changingVisibility ||
                savingPriceId !== null ||
                deleting
              }
              onClick={() => {
                setDeleteError("");
                deleteDialogRef.current?.showModal();
              }}
              className="cursor-pointer rounded-md border border-red-300 px-4 py-2 text-sm font-semibold text-red-800 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Delete product
            </button>

            <dialog
              ref={deleteDialogRef}
              aria-labelledby="delete-product-title"
              onCancel={(event) => {
                if (deleting) event.preventDefault();
              }}
              className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl bg-white p-6 shadow-xl backdrop:bg-black/50"
            >
              <h2 id="delete-product-title" className="text-xl font-bold">
                Delete product?
              </h2>
              <p className="mt-3 text-sm text-stone-600">
                This will permanently delete <strong>{product.name}</strong>.
              </p>

              {deleteError && (
                <p role="alert" className="mt-3 text-sm text-red-800">
                  {deleteError}
                </p>
              )}

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  autoFocus
                  disabled={deleting}
                  onClick={() => deleteDialogRef.current?.close()}
                  className="cursor-pointer rounded-md border border-stone-300 px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Keep product
                </button>
                <button
                  type="button"
                  disabled={deleting}
                  onClick={handleDeleteProduct}
                  className="cursor-pointer rounded-md bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {deleting ? "Deleting…" : "Delete product"}
                </button>
              </div>
            </dialog>
          </div>
        </>
      )}
    </section>
  );
}
