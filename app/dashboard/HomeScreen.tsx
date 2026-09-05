"use client";

import { useState } from "react";

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const watchMatch = trimmed.match(/[?&]v=([^&]+)/);
  if (watchMatch) return watchMatch[1];
  const shortMatch = trimmed.match(/youtu\.be\/([^?&]+)/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([^?&]+)/);
  if (embedMatch) return embedMatch[1];
  if (/^[a-zA-Z0-9_-]{6,}$/.test(trimmed)) return trimmed;
  return null;
}

export default function HomeScreen() {
  const [input, setInput] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);

  function handlePlay() {
    setVideoId(extractVideoId(input));
  }

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-semibold text-gray-900 mb-3">Screen</h2>
      <div className="bg-gray-100 rounded aspect-video flex items-center justify-center mb-3 overflow-hidden">
        {videoId ? (
          <iframe
            className="w-full h-full"
            src={"https://www.youtube.com/embed/" + videoId}
            title="Screen"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <span className="text-sm text-gray-400">No video playing</span>
        )}
      </div>
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handlePlay();
          }}
          placeholder="Paste a YouTube link or video ID"
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={handlePlay}
          className="bg-green-700 text-white text-sm px-4 py-2 rounded hover:bg-green-800"
        >
          Play
        </button>
      </div>
    </div>
  );
}
