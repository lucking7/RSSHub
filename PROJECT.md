# Project: RSSHub CLS Filter Refactoring

## Architecture

This project refactors the RSSHub routes for CLS (财联社) to centralize and refine filtering logic for paid VIP content, advertisements, and promotional items.

- Utility module: `lib/routes/cls/utils.ts` will house `isPromotionalContent` and a new consolidated filter function.
- Route implementations: `lib/routes/cls/dianbao.ts` and `lib/routes/cls/telegraph.tsx` will import and apply this filter function.
- Test suites: `lib/routes/cls/telegraph.test.tsx` (or a new test file) will run unit tests to verify the filtering.

## Code Layout

- `lib/routes/cls/utils.ts`: Unified helper functions
- `lib/routes/cls/dianbao.ts`: Dianbao feed route
- `lib/routes/cls/telegraph.tsx`: Telegraph feed route
- `lib/routes/cls/telegraph.test.tsx`: Test cases

## Milestones

| #   | Name                   | Scope                                                                          | Dependencies | Status |
| --- | ---------------------- | ------------------------------------------------------------------------------ | ------------ | ------ |
| 1   | Exploration            | Analyze CLS route codebase, API response structure, and existing filters.      | None         | DONE   |
| 2   | Implementation         | Refactor `utils.ts`, `dianbao.ts`, `telegraph.tsx` and run local verification. | M1           | DONE   |
| 3   | Testing & Verification | Add tests in `telegraph.test.tsx` and run full vitest checks.                  | M2           | DONE   |

## Interface Contracts

### `utils.ts` export:

- `cleanAndFilter(items: any[])`: Filtering helper which filters out items where:
    - `item.type !== -1`
    - `item.share_img` contains `"vip"`
    - `item.is_ad` or `item.is_fad` is truthy
    - Content matches promotional text patterns (using `isPromotionalContent`)
