import { useState } from "react";
import type { ComponentPropsWithoutRef } from "react";

type PasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  id: string;
};

export default function PasswordInput({
  id,
  className = "",
  ...props
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative mt-2">
      <input
        {...props}
        id={id}
        type={visible ? "text" : "password"}
        className={`w-full border border-stone-300 bg-white py-3 pr-12 pl-4 disabled:opacity-60 ${className}`}
      />

      <button
        type="button"
        aria-label={visible ? "Hide password" : "Show password"}
        aria-controls={id}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((value) => !value)}
        className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-stone-500 hover:text-[#17352a] disabled:cursor-not-allowed"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" />
          {visible && <path d="m3 3 18 18" />}
        </svg>
      </button>
    </div>
  );
}
