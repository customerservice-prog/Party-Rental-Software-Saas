"use client";

import { createElement as h } from "react";

export default function PrintButton() {
  return h(
    "button",
    {
      type: "button",
      onClick: () => window.print(),
      className:
        "bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-1.5 text-sm font-medium whitespace-nowrap",
    },
    "Print"
  );
}
