"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function RecipeSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const id = setTimeout(() => {
      const params = new URLSearchParams();
      if (value.trim()) params.set("q", value.trim());
      router.replace(`/app/recipes${params.toString() ? `?${params}` : ""}`);
    }, 300);
    return () => clearTimeout(id);
  }, [value, router]);

  return (
    <input
      type="search"
      className="input"
      placeholder="Search recipes…"
      value={value}
      onChange={(e) => setValue(e.target.value)}
    />
  );
}
