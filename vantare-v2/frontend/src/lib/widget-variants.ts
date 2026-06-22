import type { ColumnConfig, ProfileConfig, WidgetConfig, WidgetPropsMap, WidgetVariantConfig } from "./profile";
import { RELATIVE_DEFAULT_TEMPLATE_ID, createDefaultRelativeColumns, getRelativeColumn } from "../overlay/widgets/relative-catalog";

type RenderVariant = {
  id: string;
  templateId: string;
  themeId?: string;
  columns: ColumnConfig[];
};

export type WidgetPropsWithVariant = WidgetPropsMap & {
  variant?: RenderVariant;
};

export function findWidgetVariant(profile: ProfileConfig, widget: WidgetConfig): WidgetVariantConfig | undefined {
  if (!widget.variantId) return undefined;
  return profile.variants?.find((variant) => variant.id === widget.variantId && variant.widgetType === widget.type);
}

export function withDefaultWidgetVariants(profile: ProfileConfig): ProfileConfig {
  const widgets = [...profile.widgets];
  const variants = [...(profile.variants ?? [])];
  let changed = false;

  for (let i = 0; i < widgets.length; i++) {
    const widget = widgets[i];
    if (widget.type !== "relative") continue;

    let variantId = widget.variantId;
    if (!variantId) {
      variantId = `variant-${widget.id}-default`;
      widgets[i] = { ...widget, variantId };
      changed = true;
    }

    const index = variants.findIndex((variant) => variant.id === variantId);
    if (index === -1) {
      variants.push(createDefaultRelativeVariant(variantId));
      changed = true;
      continue;
    }
    const current = variants[index];
    if (!current.columns || current.columns.length === 0 || !current.templateId) {
      variants[index] = normalizeRelativeVariant(current);
      changed = true;
    }
  }

  return changed ? { ...profile, widgets, variants } : profile;
}

export function toggleRelativeColumn(
  profile: ProfileConfig,
  widgetId: string,
  columnId: string,
  enabled: boolean,
): ProfileConfig {
  if (!getRelativeColumn(columnId)) return profile;

  const base = withDefaultWidgetVariants(profile);
  const widget = base.widgets.find((item) => item.id === widgetId && item.type === "relative");
  if (!widget?.variantId) return profile;

  const variants = (base.variants ?? []).map((variant) => {
    if (variant.id !== widget.variantId || variant.widgetType !== "relative") return variant;
    const normalized = normalizeRelativeVariant(variant);
    return {
      ...normalized,
      columns: normalized.columns?.map((column) =>
        column.id === columnId ? { ...column, enabled } : column,
      ),
    };
  });

  return { ...base, variants };
}

export function enrichWidgetPropsWithVariant(profile: ProfileConfig | null | undefined, widget: WidgetConfig): WidgetPropsWithVariant {
  const props: WidgetPropsWithVariant = {
    ...(widget.props ?? {}),
    style: widget.style ?? widget.props?.style,
  };
  if (!profile) return props;

  const normalized = withDefaultWidgetVariants(profile);
  const normalizedWidget = normalized.widgets.find((w) => w.id === widget.id) ?? widget;
  const variant = findWidgetVariant(normalized, normalizedWidget);
  if (!variant) return props;

  const relativeVariant = widget.type === "relative" ? normalizeRelativeVariant(variant) : variant;
  return {
    ...props,
    variant: {
      id: relativeVariant.id,
      templateId: relativeVariant.templateId ?? RELATIVE_DEFAULT_TEMPLATE_ID,
      themeId: relativeVariant.themeId,
      columns: relativeVariant.columns ?? [],
    },
  };
}

function createDefaultRelativeVariant(id: string): WidgetVariantConfig {
  return {
    id,
    widgetType: "relative",
    templateId: RELATIVE_DEFAULT_TEMPLATE_ID,
    themeId: "vantare-racing",
    name: "Relative Default",
    columns: createDefaultRelativeColumns(),
  };
}

function normalizeRelativeVariant(variant: WidgetVariantConfig): WidgetVariantConfig {
  const defaults = createDefaultRelativeColumns();
  const current = variant.columns ?? [];
  const columns = defaults.map((defaultColumn) => {
    const existing = current.find((column) => column.id === defaultColumn.id);
    return existing ? { ...defaultColumn, ...existing } : defaultColumn;
  });

  return {
    ...variant,
    widgetType: "relative",
    templateId: variant.templateId ?? RELATIVE_DEFAULT_TEMPLATE_ID,
    columns,
  };
}
