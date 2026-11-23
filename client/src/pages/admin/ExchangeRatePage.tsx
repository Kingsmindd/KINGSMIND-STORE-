import { ActionNotice } from "../../components/ui/AppNotifications";
import { useEffect, useState, type FormEvent } from "react";
import {
  getExchangeRate,
  updateExchangeRate,
} from "../../services/exchange-rate.service";

export default function ExchangeRatePage() {
  const [rate, setRate] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadRate() {
      try {
        const { exchangeRate } = await getExchangeRate(controller.signal);
        if (!controller.signal.aborted) setRate(exchangeRate?.rate ?? "");
      } catch (error: unknown) {
        if (!controller.signal.aborted) {
          setError(
            error instanceof Error ? error.message : "Could not load the rate.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadRate();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!message && !error) return;

    const timer = window.setTimeout(
      () => {
        setMessage("");
        setError("");
      },
      error ? 6000 : 4000,
    );

    return () => window.clearTimeout(timer);
  }, [message, error]);

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (loading || saving) return;

    setSaving(true);
    setMessage("");
    setError("");

    try {
      const { exchangeRate } = await updateExchangeRate(rate.trim());
      setRate(exchangeRate.rate);
      setMessage("Exchange rate updated.");
    } catch (error: unknown) {
      setError(
        error instanceof Error ? error.message : "Could not save the rate.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-xl px-5 py-12">
      <h1 className="text-3xl font-bold tracking-tight">Exchange rate</h1>
      <p className="mt-2 text-sm text-stone-600">
        Set how much ₦1 US dollar is worth at checkout.
      </p>

      <form
        onSubmit={handleSave}
        className="mt-6 space-y-4 rounded-xl border border-stone-200 bg-white p-5 sm:p-6"
      >
        <label className="block text-sm font-semibold">
          Naira per US dollar
          <input
            value={rate}
            onChange={(event) => setRate(event.target.value)}
            inputMode="decimal"
            placeholder="1500.00"
            required
            disabled={loading || saving}
            className="mt-2 block w-full rounded-lg border border-stone-300 px-4 py-3"
          />
        </label>

        <button
          type="submit"
          disabled={loading || saving}
          className="cursor-pointer rounded-lg bg-[#17352a] px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Loading…" : saving ? "Saving…" : "Save rate"}
        </button>

        {message && (
          <ActionNotice message={message} type={"success"} />
        )}
        {error && (
          <ActionNotice message={error} type={"error"} />
        )}
      </form>
    </section>
  );
}
