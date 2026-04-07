<?php

// ============================================================
// ARKZEN ENGINE — ARKZEN YAML PARSER
// Pure-PHP drop-in replacement for yaml_parse().
// Handles the YAML subset used in Arkzen tatemono sections:
//   - Top-level and nested string keys (kebab-case or snake_case)
//   - String values: quoted ("...") or unquoted
//   - Integer values
//   - Inline arrays: [item1, item2, item3]
//   - Nested maps (2-space indentation)
//   - Inline key: value on same line as parent key
//
// Does NOT support: anchors, multi-line strings, complex types,
// flow mappings, or anything outside Arkzen's usage pattern.
//
// Usage: ArkzenYaml::parse($rawString) — same return shape as yaml_parse()
// ============================================================

namespace App\Arkzen\Builders;

class ArkzenYaml
{
    /**
     * Parse a YAML string into a PHP array.
     * Returns null on failure (mirrors yaml_parse behaviour).
     */
    public static function parse(string $yaml): ?array
    {
        try {
            $lines  = explode("\n", str_replace("\r\n", "\n", $yaml));
            $result = self::parseLines($lines, 0, count($lines), 0);
            return is_array($result['value']) ? $result['value'] : null;
        } catch (\Throwable) {
            return null;
        }
    }

    // ─────────────────────────────────────────────
    // CORE RECURSIVE PARSER
    // ─────────────────────────────────────────────

    private static function parseLines(array $lines, int $start, int $end, int $baseIndent): array
    {
        $result = [];
        $i      = $start;

        while ($i < $end) {
            $line = $lines[$i];

            // Skip blank lines and comment-only lines
            if (trim($line) === '' || ltrim($line)[0] === '#') {
                $i++;
                continue;
            }

            $indent = self::indentOf($line);

            // If this line is less indented than our base, we're done with this block
            if ($indent < $baseIndent) {
                break;
            }

            // Parse the key: value on this line
            $trimmed = trim($line);

            // Must be a "key:" line
            if (!preg_match('/^([a-zA-Z0-9_\-\.]+)\s*:\s*(.*)$/', $trimmed, $m)) {
                $i++;
                continue;
            }

            $key        = $m[1];
            $valuePart  = trim($m[2]);

            // Look ahead: if next non-empty line is more indented, it's a nested map
            $nextIdx    = self::nextNonEmpty($lines, $i + 1, $end);
            $nextIndent = ($nextIdx < $end) ? self::indentOf($lines[$nextIdx]) : $baseIndent;

            if ($valuePart === '' && $nextIdx < $end && $nextIndent > $indent) {
                // Nested map — recurse
                $child       = self::parseLines($lines, $nextIdx, $end, $nextIndent);
                $result[$key] = $child['value'];
                $i            = $child['next'];
            } else {
                // Scalar or inline array on this line
                $result[$key] = self::parseValue($valuePart);
                $i++;
            }
        }

        return ['value' => $result, 'next' => $i];
    }

    // ─────────────────────────────────────────────
    // VALUE PARSER
    // ─────────────────────────────────────────────

    private static function parseValue(string $raw): mixed
    {
        $raw = trim($raw);

        // Inline array: [a, b, c]
        if (str_starts_with($raw, '[') && str_ends_with($raw, ']')) {
            $inner = substr($raw, 1, -1);
            if (trim($inner) === '') return [];
            return array_map(
                fn($v) => self::parseScalar(trim($v)),
                explode(',', $inner)
            );
        }

        return self::parseScalar($raw);
    }

    private static function parseScalar(string $raw): mixed
    {
        $raw = trim($raw);

        // Double-quoted string — strip quotes and unescape
        if (str_starts_with($raw, '"') && str_ends_with($raw, '"')) {
            return stripcslashes(substr($raw, 1, -1));
        }

        // Single-quoted string
        if (str_starts_with($raw, "'") && str_ends_with($raw, "'")) {
            return substr($raw, 1, -1);
        }

        // Boolean
        if (in_array(strtolower($raw), ['true', 'yes'], true))  return true;
        if (in_array(strtolower($raw), ['false', 'no'], true))  return false;
        if (strtolower($raw) === 'null' || $raw === '~')        return null;

        // Integer
        if (preg_match('/^-?\d+$/', $raw)) return (int) $raw;

        // Float
        if (preg_match('/^-?\d+\.\d+$/', $raw)) return (float) $raw;

        // Plain string (unquoted)
        return $raw;
    }

    // ─────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────

    private static function indentOf(string $line): int
    {
        return strlen($line) - strlen(ltrim($line));
    }

    private static function nextNonEmpty(array $lines, int $start, int $end): int
    {
        for ($i = $start; $i < $end; $i++) {
            if (trim($lines[$i]) !== '' && ltrim($lines[$i])[0] !== '#') {
                return $i;
            }
        }
        return $end;
    }
}