import React, { useState } from 'react';
import { ImagePlus, Sparkles, Trash2, Wand2 } from 'lucide-react';
import type { PromoDirectionId, PromoPlan, PromoThemeStyle } from '../types';

interface PromoPlannerPanelProps {
  plan: PromoPlan;
  onChangePlan: (next: PromoPlan) => void;
  onApplyDirection: (direction: PromoDirectionId) => void;
  onResetSmart: () => void;
  showToast: (msg: string) => void;
}

const DIRECTIONS: Array<{ id: PromoDirectionId; label: string; desc: string }> = [
  { id: 'smart', label: '智能匹配', desc: '按曲风BPM' },
  { id: 'single-review', label: '单曲乐评', desc: '入坑三理由' },
  { id: 'story-emotion', label: '情感故事', desc: '心境切片' },
  { id: 'brand-feature', label: '产品推广', desc: '能力卖点' },
];

const THEME_STYLES: Array<{ id: PromoThemeStyle; label: string }> = [
  { id: 'darkroom', label: '夜色黑胶' },
  { id: 'warm-film', label: '暖调胶片' },
  { id: 'editorial', label: '杂志网格' },
  { id: 'neon', label: '脉冲霓虹' },
];

export const PromoPlannerPanel: React.FC<PromoPlannerPanelProps> = ({
  plan,
  onChangePlan,
  onApplyDirection,
  onResetSmart,
  showToast,
}) => {
  const [activeSceneEdit, setActiveSceneEdit] = useState<'s1' | 's2' | 's3' | 's4'>('s1');

  const handleUploadCustomImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const remain = Math.max(0, 3 - plan.customImages.length);
    if (remain === 0) {
      showToast('最多上传 3 张宣发图片，请先删除一张再添加');
      return;
    }

    const picked = files.slice(0, remain);
    const urls = await Promise.all(
      picked.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (ev) => resolve(String(ev.target?.result || ''));
            reader.onerror = () => resolve('');
            reader.readAsDataURL(file);
          })
      )
    );
    const valid = urls.filter(Boolean);
    if (!valid.length) return;

    onChangePlan({
      ...plan,
      customImages: [...plan.customImages, ...valid].slice(0, 3),
      s2VisualMode: 'custom-images',
    });
    showToast(`已添加 ${valid.length} 张专属宣发图片到 S2 图集`);
  };

  const handleRemoveImage = (idx: number) => {
    const nextImgs = plan.customImages.filter((_, i) => i !== idx);
    onChangePlan({
      ...plan,
      customImages: nextImgs,
      s2VisualMode: nextImgs.length === 0 ? 'templates' : plan.s2VisualMode,
    });
  };

  const updateHighlight = (index: 0 | 1 | 2, patch: Partial<PromoPlan['s3Highlights'][0]>) => {
    const next: PromoPlan['s3Highlights'] = [
      { ...plan.s3Highlights[0] },
      { ...plan.s3Highlights[1] },
      { ...plan.s3Highlights[2] },
    ];
    next[index] = { ...next[index], ...patch };
    onChangePlan({ ...plan, s3Highlights: next });
  };

  return (
    <div className="hi-fi-panel rounded-2xl p-5 space-y-5">
      {/* Header + Smart Reset */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[var(--line-subtle)]">
        <div>
          <div className="text-sm font-semibold text-[var(--ink-primary)] flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--accent)]" />
            <span>专属宣发策划台</span>
          </div>
          <div className="font-tech text-[10px] text-[var(--ink-muted)] mt-0.5">
            SMART MATCHING + FULL CUSTOMIZATION
          </div>
        </div>
        <button
          type="button"
          onClick={onResetSmart}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--accent-soft)] border border-[var(--accent-border)] text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-[var(--accent-ink)] transition"
        >
          <Wand2 className="w-3.5 h-3.5" />
          <span>智能重配</span>
        </button>
      </div>

      {/* 1. Creative Direction Presets */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--ink-secondary)]">1. 策划方向（一键生成不同结构文案）</span>
        <div className="grid grid-cols-2 gap-2">
          {DIRECTIONS.map((d) => {
            const active = plan.direction === d.id;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => onApplyDirection(d.id)}
                className={`p-2.5 rounded-xl border text-left transition ${
                  active
                    ? 'bg-[var(--bg-elevated)] border-[var(--accent-border)] text-[var(--ink-primary)]'
                    : 'bg-[var(--bg-inset)] border-transparent hover:border-[var(--line-subtle)] text-[var(--ink-secondary)]'
                }`}
              >
                <div className="text-xs font-semibold flex items-center justify-between">
                  <span>{d.label}</span>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />}
                </div>
                <div className="text-[10px] text-[var(--ink-muted)] mt-0.5">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Visual Atmosphere Style */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--ink-secondary)]">2. 视觉基调（改变光影与网格质感）</span>
        <div className="grid grid-cols-4 gap-1.5">
          {THEME_STYLES.map((st) => {
            const active = plan.themeStyle === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => onChangePlan({ ...plan, themeStyle: st.id })}
                className={`py-2 px-1.5 rounded-lg text-[11px] border transition ${
                  active
                    ? 'bg-[var(--btn-primary-bg)] text-[var(--btn-primary-ink)] border-transparent font-medium'
                    : 'bg-[var(--bg-inset)] border-[var(--line-subtle)] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {st.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Custom Multi-Image Upload for S2 */}
      <div className="space-y-2.5 pt-2 border-t border-[var(--line-subtle)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--ink-secondary)]">
            3. 专属图文素材（S2 展示区 · 最多 3 张）
          </span>
          <div className="inline-flex p-0.5 rounded-md hi-fi-inset">
            <button
              type="button"
              onClick={() => onChangePlan({ ...plan, s2VisualMode: 'templates' })}
              className={`px-2 py-0.5 rounded text-[10px] transition ${
                plan.s2VisualMode === 'templates'
                  ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] font-medium'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              版式矩阵
            </button>
            <button
              type="button"
              onClick={() => {
                if (plan.customImages.length === 0) {
                  showToast('请先在下方上传 1~3 张宣发图片');
                  return;
                }
                onChangePlan({ ...plan, s2VisualMode: 'custom-images' });
              }}
              className={`px-2 py-0.5 rounded text-[10px] transition ${
                plan.s2VisualMode === 'custom-images'
                  ? 'bg-[var(--bg-elevated)] text-[var(--ink-primary)] font-medium'
                  : 'text-[var(--ink-muted)]'
              }`}
            >
              上传图集
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {plan.customImages.map((src, idx) => (
            <div
              key={`${idx}-${src.slice(0, 24)}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-[var(--line-subtle)] bg-[var(--bg-inset)] group"
            >
              <img src={src} alt={`宣发图 ${idx + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => handleRemoveImage(idx)}
                className="absolute top-1.5 right-1.5 p-1 rounded-md bg-black/70 text-white hover:bg-[var(--heart)] transition"
                title="移除图片"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {plan.customImages.length < 3 && (
            <label className="aspect-square rounded-xl border border-dashed border-[var(--line-strong)] bg-[var(--bg-inset)] hover:bg-[var(--bg-hover)] flex flex-col items-center justify-center gap-1.5 cursor-pointer text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] transition">
              <ImagePlus className="w-4 h-4 text-[var(--accent)]" />
              <span className="text-[10px]">上传配图</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleUploadCustomImages}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      {/* 4. Per-Scene Copy & Text Editor */}
      <div className="space-y-3 pt-2 border-t border-[var(--line-subtle)]">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-[var(--ink-secondary)]">4. 逐幕文案精修</span>
          <div className="inline-flex p-0.5 rounded-lg hi-fi-inset gap-0.5">
            {(['s1', 's2', 's3', 's4'] as const).map((sc) => (
              <button
                key={sc}
                type="button"
                onClick={() => setActiveSceneEdit(sc)}
                className={`px-2 py-1 rounded text-[10px] font-tech uppercase transition ${
                  activeSceneEdit === sc
                    ? 'bg-[var(--accent)] text-[var(--accent-ink)] font-semibold'
                    : 'text-[var(--ink-muted)] hover:text-[var(--ink-primary)]'
                }`}
              >
                {sc}
              </button>
            ))}
          </div>
        </div>

        {activeSceneEdit === 's1' && (
          <div className="space-y-2">
            <input
              type="text"
              value={plan.badgeText}
              onChange={(e) => onChangePlan({ ...plan, badgeText: e.target.value })}
              placeholder="顶部标签（如：深夜循环 · 独家推荐）"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <input
              type="text"
              value={plan.s1Headline}
              onChange={(e) => onChangePlan({ ...plan, s1Headline: e.target.value })}
              placeholder="S1 主标题"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <input
              type="text"
              value={plan.s1Subline}
              onChange={(e) => onChangePlan({ ...plan, s1Subline: e.target.value })}
              placeholder="S1 副标题（歌手与推荐语）"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <input
              type="text"
              value={plan.s1Slogan}
              onChange={(e) => onChangePlan({ ...plan, s1Slogan: e.target.value })}
              placeholder="S1 引导金句"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </div>
        )}

        {activeSceneEdit === 's2' && (
          <div className="space-y-2">
            <input
              type="text"
              value={plan.s2Heading}
              onChange={(e) => onChangePlan({ ...plan, s2Heading: e.target.value })}
              placeholder="S2 视觉展示标题"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <p className="text-[11px] text-[var(--ink-muted)]">
              提示：若上方上传了 1~3 张专属照片，S2 将自动切换为 2.5D 图集画廊展示；无上传时展示 6 套同曲版式矩阵。
            </p>
          </div>
        )}

        {activeSceneEdit === 's3' && (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={plan.s3Kicker}
                onChange={(e) => onChangePlan({ ...plan, s3Kicker: e.target.value })}
                placeholder="S3 顶部标签"
                className="px-2.5 py-2 rounded-lg hi-fi-inset text-[11px] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
              />
              <input
                type="text"
                value={plan.s3Heading}
                onChange={(e) => onChangePlan({ ...plan, s3Heading: e.target.value })}
                placeholder="S3 主标题"
                className="px-2.5 py-2 rounded-lg hi-fi-inset text-[11px] text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
              />
            </div>
            {([0, 1, 2] as const).map((idx) => (
              <div key={idx} className="p-2.5 rounded-xl hi-fi-inset space-y-1.5">
                <div className="grid grid-cols-3 gap-1.5">
                  <input
                    type="text"
                    value={plan.s3Highlights[idx].title}
                    onChange={(e) => updateHighlight(idx, { title: e.target.value })}
                    placeholder={`卖点 ${idx + 1} 标题`}
                    className="col-span-2 px-2 py-1.5 rounded bg-[var(--bg-panel)] border border-[var(--line-subtle)] text-[11px] text-[var(--ink-primary)] focus:outline-none"
                  />
                  <input
                    type="text"
                    value={plan.s3Highlights[idx].tag}
                    onChange={(e) => updateHighlight(idx, { tag: e.target.value })}
                    placeholder="标签"
                    className="px-2 py-1.5 rounded bg-[var(--bg-panel)] border border-[var(--line-subtle)] font-tech text-[11px] text-[var(--accent)] focus:outline-none"
                  />
                </div>
                <input
                  type="text"
                  value={plan.s3Highlights[idx].sub}
                  onChange={(e) => updateHighlight(idx, { sub: e.target.value })}
                  placeholder="卖点说明"
                  className="w-full px-2 py-1.5 rounded bg-[var(--bg-panel)] border border-[var(--line-subtle)] text-[11px] text-[var(--ink-secondary)] focus:outline-none"
                />
              </div>
            ))}
          </div>
        )}

        {activeSceneEdit === 's4' && (
          <div className="space-y-2">
            <input
              type="text"
              value={plan.s4Headline}
              onChange={(e) => onChangePlan({ ...plan, s4Headline: e.target.value })}
              placeholder="S4 收尾大标题"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <input
              type="text"
              value={plan.s4Subline}
              onChange={(e) => onChangePlan({ ...plan, s4Subline: e.target.value })}
              placeholder="S4 引导说明"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
            <input
              type="text"
              value={plan.s4Cta}
              onChange={(e) => onChangePlan({ ...plan, s4Cta: e.target.value })}
              placeholder="S4 按钮文案"
              className="w-full px-3 py-2 rounded-lg hi-fi-inset text-xs text-[var(--ink-primary)] focus:outline-none focus:border-[var(--accent-border)]"
            />
          </div>
        )}
      </div>
    </div>
  );
};
