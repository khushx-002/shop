"use client";
/** Password field (heritage .field look) with the eye button that shows / hides what was typed. */
import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { INPUT } from "./form-styles";

type Props = {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  required?: boolean;
  error?: string;
  describedBy?: string;
};

export function PasswordInput({ id, name, autoComplete, required, error, describedBy }: Props) {
  const [visible, setVisible] = useState(false);
  const described = [error ? `${id}-error` : "", describedBy ?? ""].filter(Boolean).join(" ") || undefined;
  return (
    <span className="relative block">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        required={required}
        autoComplete={autoComplete}
        maxLength={200}
        aria-invalid={error ? true : undefined}
        aria-describedby={described}
        className={`${INPUT} pr-[44px]`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className={`absolute right-[4px] top-1/2 flex size-[38px] -translate-y-1/2 items-center justify-center rounded-[8px] transition-colors hover:bg-cream-light hover:text-primary ${visible ? "text-primary" : "text-muted"}`}
      >
        <Icon name="eye" size={16} />
      </button>
    </span>
  );
}
