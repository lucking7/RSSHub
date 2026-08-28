# Original User Request

## Initial Request — 2026-05-31T15:01:06Z

<USER_REQUEST>
An investigation and refinement project to analyze the API response of CLS (财联社) feed, identify promotional/VIP/soft-ad content lacking user value, and implement robust filters (e.g., via channels or patterns).

Working directory: /Users/luck/Downloads/repos/RSSHUB/lib/routes/cls
Integrity mode: development

## Requirements

### R1. Consolidate and refine filtering logic

- Move `isPromotionalContent` and general filter logic into a unified helper in `utils.ts`.
- Share this utility between `dianbao.ts` and `telegraph.tsx`.
- Filter out items where:
    - `item.type !== -1` (e.g. 20015, 20021, 20022, 20087 are VIP paid articles/recommendations)
    - `item.share_img` contains `"vip"` (e.g. `https://img.cls.cn/share/vip.png` used for VIP contents)
    - `item.is_ad` or `item.is_fad` is truthy
    - Content matches promotional text patterns (using the `isPromotionalContent` helper)

### R2. Add unit tests for filtering validation

- Add mock test cases in `telegraph.test.tsx` (or a new test file) verifying that:
    - VIP types (such as `20021`, `20022`, `20087`) are correctly filtered out.
    - Articles with `share_img` containing `vip` are filtered out.
    - Ad articles (`is_ad: 1`) are filtered out.
    - Normal articles (type `-1`) are preserved.

## Acceptance Criteria

### Test Validation

- [ ] All vitest test suites in `/cls` pass successfully via `pnpm exec vitest run lib/routes/cls`.
- [ ] The filter function is imported and applied in both `dianbao.ts` and `telegraph.tsx`.
- [ ] No regression or compilation issues occur in RSSHub core.
      </USER_REQUEST>
      <ADDITIONAL_METADATA>
      The current local time is: 2026-05-31T23:01:06+08:00.
      </ADDITIONAL_METADATA>
