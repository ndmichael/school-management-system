"use client";

import type { SelectHTMLAttributes } from "react";

type Option<T extends string> = { value: T; label: string };

export type SelectProps<T extends string = string> =
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
    label: string;
    value: T | "";
    onChange: (value: T | "") => void;
    options: ReadonlyArray<Option<T>>;
    error?: string;
  };

export const Select = <T extends string>({
  label,
  value,
  onChange,
  options,
  error,
  required,
  className,
  ...props
}: SelectProps<T>) => {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      <select
        {...props} // ✅ supports name, id, disabled, etc.
        value={value}
        onChange={(e) => onChange(e.target.value as T | "")}
        required={required}
        className={`w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all appearance-none bg-white ${
          error ? "border-red-500" : ""
        } ${className ?? ""}`}
      >
        <option value="">Select an option</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
};
