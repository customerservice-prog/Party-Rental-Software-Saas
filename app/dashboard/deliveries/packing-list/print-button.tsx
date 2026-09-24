"use client";

import { createElement as h } from "react";

export default function PrintButton() {
  return h(
    "button",
    {
      type: "button",
      onClick: () => window.print(),
      className:
        "friendly-admin-primary !min-h-0 !px-4 !py-1.5 whitespace-nowrap",
    },
    "Print"
  );
}
