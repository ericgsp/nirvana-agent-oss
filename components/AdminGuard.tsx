"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminGuard() {
  const router = useRouter();

  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then(({ role }) => {
        if (role !== "admin") router.replace("/agent");
      })
      .catch(() => router.replace("/agent"));
  }, [router]);

  return null;
}
