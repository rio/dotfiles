/**
 * Context Progress Bar Extension
 *
 * Replaces the percentage display in the footer's context usage with a thin
 * progress bar. The bar fills left-to-right based on context window usage,
 * and changes color when approaching the limit.
 *
 * Auto-enabled on every session. Auto-discovered from .pi/extensions/
 */

import type { ExtensionAPI, FooterData } from "@earendil-works/pi-coding-agent";
import type { TUI, Theme } from "@earendil-works/pi-tui";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

// ─── Configuration ─────────────────────────────────────────────────────────────

/** Token count where the "dumb zone" begins. Beyond this point the model's
 *  attention degrades significantly — time to compact or restart.
 *
 *  Adjust per your model. 100k is a reasonable default for most models.
 *  Set to `null` to disable the marker.
 */
let dumbZoneThreshold: number | null = 100_000;

/** Percentage of the dumb zone threshold where warning/danger zones begin.
 *  Warning at 60% of threshold, danger at 80% of threshold. */
const WARNING_OF_THRESHOLD = 0.6;
const DANGER_OF_THRESHOLD = 0.8;

// ─── Zone helpers ──────────────────────────────────────────────────────────────

/** Return the color key for a token count relative to the dumb zone threshold. */
function zoneColor(tokens: number, threshold: number | null): string {
	if (threshold === null) return "success";
	const ratio = tokens / threshold;
	if (ratio >= DANGER_OF_THRESHOLD) return "error";
	if (ratio >= WARNING_OF_THRESHOLD) return "warning";
	return "success";
}

// ─── Progress bar rendering ────────────────────────────────────────────────────

/**
 * Render a thin progress bar using solid rectangles with colored zones.
 *
 * Maps to the dumb zone threshold (not the full context window). Zone colors:
 *   0–60% of threshold → green (safe)
 *   60–80% of threshold → orange (warning)
 *   80–100% of threshold → red (danger)
 *
 * Binary: █ filled, ░ empty.
 */
function renderProgressBar(
	currentTokens: number,
	width: number,
	themeFn: (color: string, text: string) => string,
	dumbZoneTokens: number | null,
): string {
	if (width < 1) return "";

	const cellTokens = dumbZoneTokens !== null ? dumbZoneTokens / width : 0;

	const parts: string[] = [];
	for (let i = 0; i < width; i++) {
		const cellThreshold = (i + 1) * cellTokens;
		const color = zoneColor(i * cellTokens, dumbZoneTokens);

		if (currentTokens >= cellThreshold) {
			parts.push(themeFn(color, "█"));
		} else {
			parts.push(themeFn(color, "░"));
		}
	}
	return parts.join("");
}

// ─── Formatting helpers ────────────────────────────────────────────────────────

/** Format token counts for display. */
function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

/** Compute cumulative token usage from session entries. */
function computeTokenStats(
	entries: Array<{
		type: string;
		message?: { role: string; usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: { total: number } }; };
	}>,
): { totalInput: number; totalOutput: number; totalCacheRead: number; totalCacheWrite: number } {
	let totalInput = 0, totalOutput = 0, totalCacheRead = 0, totalCacheWrite = 0;
	for (const entry of entries) {
		if (entry.type === "message" && entry.message?.role === "assistant") {
			const u = entry.message.usage;
			totalInput += u.input;
			totalOutput += u.output;
			totalCacheRead += u.cacheRead;
			totalCacheWrite += u.cacheWrite;
		}
	}
	return { totalInput, totalOutput, totalCacheRead, totalCacheWrite };
}

// ─── Session state accessor ────────────────────────────────────────────────────

interface SessionAccessor {
	getEntries: () => Array<{
		type: string;
		message?: { role: string; usage: { input: number; output: number; cacheRead: number; cacheWrite: number; cost: { total: number } }; };
	}>;
	getCwd: () => string;
	getSessionName: () => string | undefined;
	getContextUsage: () => { tokens: number | null; contextWindow: number; percent: number | null } | undefined;
	getModel: () => { id: string; provider: string; reasoning?: boolean; contextWindow?: number } | undefined;
	getThinkingLevel: () => string | undefined;
}

// ─── Footer component ──────────────────────────────────────────────────────────

/** Assemble a single footer line: left content, padding, right content. */
function layoutLine(
	left: string, leftWidth: number,
	right: string, rightWidth: number,
	totalWidth: number,
	theme: Theme,
): string {
	const needed = leftWidth + 2 + rightWidth;
	if (needed <= totalWidth) {
		return left + " ".repeat(totalWidth - leftWidth - rightWidth) + right;
	}
	const availRight = totalWidth - leftWidth - 2;
	if (availRight > 0) {
		const truncatedRight = truncateToWidth(right, availRight, "");
		return left + " ".repeat(Math.max(0, totalWidth - leftWidth - visibleWidth(truncatedRight))) + truncatedRight;
	}
	return truncateToWidth(left, totalWidth, "...");
}

/** Create a custom footer component with a progress bar. */
function createFooterComponent(
	session: SessionAccessor,
	theme: Theme,
	tui: TUI,
	footerData: FooterData,
) {
	let cachedWidth = 0;
	let cachedLines: string[] = [];
	let lastEntryCount = -1;

	return {
		dispose: () => {
			// No-op; reactive hooks are handled via footerData below
		},
		invalidate: () => { cachedWidth = 0; cachedLines = []; },

		render(width: number): string[] {
			const entries = session.getEntries();
			if (width === cachedWidth && cachedLines.length > 0 && lastEntryCount === entries.length) {
				return cachedLines;
			}

			const stats = computeTokenStats(entries);
			const contextUsage = session.getContextUsage();
			const contextWindow = contextUsage?.contextWindow ?? 0;
			const contextTokens = contextUsage?.tokens ?? null;

			// ── Left side: stats + progress bar + context label ──
			const statsParts: string[] = [];
			if (stats.totalInput) statsParts.push(`↑${formatTokens(stats.totalInput)}`);
			if (stats.totalOutput) statsParts.push(`↓${formatTokens(stats.totalOutput)}`);
			if (stats.totalCacheRead) statsParts.push(`R${formatTokens(stats.totalCacheRead)}`);
			if (stats.totalCacheWrite) statsParts.push(`W${formatTokens(stats.totalCacheWrite)}`);

			const barWidth = Math.min(30, Math.max(10, Math.floor(width / 4)));
			const bar = renderProgressBar(
				contextTokens ?? 0, barWidth, theme.fg.bind(theme), dumbZoneThreshold,
			);

			const pct = contextUsage?.percent !== null ? contextUsage.percent.toFixed(1) : "?";
			const tokensStr = contextTokens !== null ? formatTokens(contextTokens) : "?";
			const contextLabel = contextTokens !== null
				? `${tokensStr}/${formatTokens(contextWindow)} (${pct})`
				: `${tokensStr}/${formatTokens(contextWindow)}`;

			const leftContent = [statsParts.join(" "), bar, contextLabel].filter(Boolean).join(" ");
			const leftWidth = visibleWidth(leftContent);

			// ── Right side: model name + thinking level ──
			const model = session.getModel();
			const modelName = model?.id || "no-model";
			const rightSide = model?.reasoning
				? `${modelName} • ${session.getThinkingLevel() || "off"}`
				: modelName;
			const rightWidth = visibleWidth(rightSide);

			// ── Layout ──
			const statsLine = layoutLine(leftContent, leftWidth, rightSide, rightWidth, width, theme);

			// ── PWD line ──
			let pwd = session.getCwd();
			const home = process.env.HOME || process.env.USERPROFILE;
			if (home && pwd.startsWith(home)) pwd = `~${pwd.slice(home.length)}`;
			const sessionName = session.getSessionName();
			if (sessionName) pwd = `${pwd} • ${sessionName}`;
			const pwdLine = truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "..."));

			cachedWidth = width;
			cachedLines = [pwdLine, statsLine];
			lastEntryCount = entries.length;
			return cachedLines;
		},
	};
}

// ─── Extension entry point ─────────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		const sessionAccessor: SessionAccessor = {
			getEntries: () => ctx.sessionManager.getEntries(),
			getCwd: () => ctx.sessionManager.getCwd(),
			getSessionName: () => ctx.sessionManager.getSessionName(),
			getContextUsage: () => ctx.getContextUsage(),
			getModel: () => ctx.model ?? undefined,
			getThinkingLevel: () => {
				const entries = ctx.sessionManager.getEntries();
				for (let i = entries.length - 1; i >= 0; i--) {
					const entry = entries[i];
					if (entry.type === "thinkingLevelChange") {
						return (entry as any).level ?? "off";
					}
				}
				return "off";
			},
		};

		const footerFactory = (tui: TUI, theme: Theme, footerData: FooterData) => {
			const component = createFooterComponent(sessionAccessor, theme, tui, footerData);

			// Make the footer reactive: re-render when the session branch changes
			// (new messages, compaction, etc.)
			const onBranchChange = footerData.onBranchChange?.(() => tui.requestRender());

			return {
				...component,
				dispose: () => {
					component.dispose();
					onBranchChange?.();
				},
			};
		};

		ctx.ui.setFooter(footerFactory);
	});
}
