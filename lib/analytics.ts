/**
 * Event names the app may send. Anything else is dropped so a buggy or
 * hostile client cannot flood the table with arbitrary names.
 */
export const ANALYTICS_EVENTS = [
  // install / entry
  "first_open",
  "app_open",
  // editing depth
  "project_created",
  "editor_open",
  "text_added",
  "text_style_applied",
  "transition_applied",
  "music_added",
  // export
  "export_tap",
  "export_started",
  "export_completed",
  "export_failed",
  "youtube_upload_completed",
  // monetization
  "premium_sheet_shown",
  "premium_choice_pro",
  "premium_choice_ad",
  "premium_choice_strip",
  "ad_unlock_success",
  "ad_unlock_failed",
  "paywall_open",
  "purchase_success",
  "purchase_cancelled",
  "purchase_failed",
  "restore_success",
] as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[number];

const allowed = new Set<string>(ANALYTICS_EVENTS);

export function isAllowedEvent(name: unknown): name is AnalyticsEvent {
  return typeof name === "string" && allowed.has(name);
}

/** Usage funnel shown on the dashboard, in order. */
export const FUNNEL_STEPS: { event: AnalyticsEvent; label: string }[] = [
  { event: "first_open", label: "설치 후 첫 실행" },
  { event: "project_created", label: "프로젝트 생성" },
  { event: "editor_open", label: "편집 화면 진입" },
  { event: "text_added", label: "텍스트 추가" },
  { event: "transition_applied", label: "전환 효과 적용" },
  { event: "export_tap", label: "내보내기 시도" },
  { event: "export_completed", label: "내보내기 완료" },
];

export const EVENTS_TABLE = "aveditor_events";
