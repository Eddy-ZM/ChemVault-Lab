# Critical flows

1. A signed-in user imports a scan-cleared Files object or uploads directly.
2. The analysis pipeline parses source data, runs configured providers, generates structured output and export formats, and persists the record.
3. Files-originated runs publish selected JSON, Markdown, LaTeX, and Excel artifacts back to the source project.
4. Completion events use an outbox; result views, exports, corrections, and rejections feed privacy-preserving product metrics.
