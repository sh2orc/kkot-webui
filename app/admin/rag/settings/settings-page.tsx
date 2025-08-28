"use client";

import { ChunkingSettings } from "../components/chunking-settings";
import { CleansingSettings } from "../components/cleansing-settings";
import { RerankingSettings } from "../components/reranking-settings";

export default function SettingsPage() {
  return (
    <div className="grid gap-4">
      <ChunkingSettings />
      <CleansingSettings />
      <RerankingSettings />
    </div>
  );
}
