let meta = #{
    name: "fix-dsh-review",
    description: "Fix all findings from the local dsh-code-review of the uncommitted RSSHub finance/cls work",
    phases: [
        #{ title: "Fix", detail: "parallel writers on disjoint files" },
        #{ title: "Build", detail: "regenerate route assets" },
        #{ title: "Verify", detail: "independent check that every finding is gone" },
    ],
    when_to_use: "After a dsh-code-review of the uncommitted CLS/jin10/longbridge/tencent patch, to apply every listed fix",
};

let unit_schema = #{
    "type": "object",
    "required": ["unit", "status", "files_changed", "summary", "blocked_reason"],
    "properties": #{
        "unit": #{ "type": "string" },
        "status": #{ "type": "string", "enum": ["done", "partial", "blocked"] },
        "files_changed": #{ "type": "array", "items": #{ "type": "string" } },
        "summary": #{ "type": "string" },
        "blocked_reason": #{ "type": "string" },
    },
};

let build_schema = #{
    "type": "object",
    "required": ["status", "summary", "blocked_reason"],
    "properties": #{
        "status": #{ "type": "string", "enum": ["done", "partial", "blocked"] },
        "summary": #{ "type": "string" },
        "blocked_reason": #{ "type": "string" },
    },
};

let verify_schema = #{
    "type": "object",
    "required": ["all_fixed", "covered", "remaining", "summary"],
    "properties": #{
        "all_fixed": #{ "type": "boolean" },
        "covered": #{ "type": "array", "items": #{ "type": "string" } },
        "remaining": #{ "type": "array", "items": #{ "type": "string" } },
        "summary": #{ "type": "string" },
    },
};

let preamble = "";
preamble += "Repo: /Users/luck/Downloads/Repos/RSSHub. Use pnpm only. Do not commit. Do not push. ";
preamble += "Reply in Chinese for the structured summary fields; code, comments, and commits stay English. ";
preamble += "Read each listed file with read_file/grep before editing. Match surrounding style: import type, camelCase, ofetch/got as the file already uses. ";
preamble += "Run focused vitest for files you change. Do not run full coverage. ";

phase("Fix");
log("Four disjoint writers: cls docs, jin10 heat, longbridge feeds, AGENTS pins");

let p_cls = preamble;
p_cls += "UNIT cls-docs. Own ONLY: lib/routes/cls/API.md and lib/routes/cls/telegraph.tsx (and telegraph.test.tsx if a test assertion must change). ";
p_cls += "Finding 1: API.md still lists dianbao.ts as its own route. dianbao.ts is deleted. /cls/dianbao is an alias path on telegraph.tsx. Update the route-to-API table and any other dianbao.ts mentions so they describe the alias, not a second file. ";
p_cls += "Finding 7: /cls/dianbao default item count changed from 20 to 50 because it now shares the telegraph handler. Document that in Route description (Chinese user-facing text is OK). Mention RSSHub common limit param. Do not change the default back to 20. ";
p_cls += "Do not restyle telegraph handler logic. Do not recreate dianbao.ts. ";
p_cls += "Return structured result.";

let p_jin10 = preamble;
p_jin10 += "UNIT jin10-hot. Own ONLY files under lib/routes/jin10/: hot.ts, hot.test.ts, flash.ts, and add flash tests only if needed. ";
p_jin10 += "Finding 3: lib/routes/jin10/flash.ts does not call attachJin10HotLabels / withJin10HotCategory. Wire it the same way as jin10/new.ts: attach inside cache.tryGet after the list fetch, then withJin10HotCategory when building item.category. Keep existing flash filters and description. ";
p_jin10 += "Finding 4: fetchJin10FlashHotMap swallows every error and returns an empty Map. Log the failure with logger.error or logger.warn from @/utils/logger including the error message, then still return empty Map so the flash feed does not die. Add a unit test that the parser/overlay still works; do not add a live network test. ";
p_jin10 += "Follow oxlint: timezone offset is 8 not +8 if you touch that line; do not introduce Number.parseFloat if oxlint wants Number(). ";
p_jin10 += "Return structured result.";

let p_lb = preamble;
p_lb += "UNIT longbridge. Own ONLY files under lib/routes/longbridge/. ";
p_lb += "Finding 5: flash.ts mergeItems can duplicate API items and official live RSS items because API guid uses item.id and link m.lbctrl.com/news/post/ID while RSS guid parses /news/(\\d+) from longbridge.com URLs. Inspect the live shapes if needed. Normalize a single news id extractor used by both buildItem and buildOfficialLiveItem. Prefer a numeric id from the URL when present, else item.id. Use the same guid prefix longbridge-flash-<id> for both. Prefer a stable public link (official news URL) when you can derive the id, so mergeItems dedupes. Add or extend a focused test if one exists; otherwise add a small pure-function test for the id extractor / merge key. ";
p_lb += "Finding 6: channel.ts retired mp-lb-daily and dolphin. Keep them unsupported, but make InvalidParameterError name the retired slugs and point to /longbridge/channel/news and /longbridge/flash. Do not map old slugs onto the new feeds silently. ";
p_lb += "Return structured result.";

let p_agents = preamble;
p_agents += "UNIT agents-md. Own ONLY AGENTS.md. ";
p_agents += "Finding 8: first Commands bullet still says pnpm@10.33.4 and Node ^22.20.0 || ^24. package.json now has packageManager pnpm@10.34.5 and engines.node ^22.22.2 || ^24.15.0. Update AGENTS.md to match package.json exactly. Do not rewrite other sections. ";
p_agents += "Return structured result.";

let fixes = parallel([
    #{ prompt: p_cls, label: "cls-docs", capability_mode: "all", output_schema: unit_schema },
    #{ prompt: p_jin10, label: "jin10-hot", capability_mode: "all", output_schema: unit_schema },
    #{ prompt: p_lb, label: "longbridge", capability_mode: "all", output_schema: unit_schema },
    #{ prompt: p_agents, label: "agents-md", capability_mode: "all", output_schema: unit_schema },
]);

fn unit_status(r) {
    if r == () { "missing" } else if r.success != true { "failed" } else if r.output == () { "empty" } else { r.output.status }
}

let i = 0;
let labels = ["cls-docs", "jin10-hot", "longbridge", "agents-md"];
for r in fixes {
    let st = unit_status(r);
    log(labels[i] + ": " + st);
    i += 1;
}

phase("Build");
log("Regenerate route assets after telegraph/dianbao path merge");

let p_build = preamble;
p_build += "UNIT build-routes. Do not change route source except if pnpm build:routes fails because of a missing file you can prove from its error. ";
p_build += "Finding 2: assets/build/routes.json still maps /dianbao/:category? to location dianbao.ts after dianbao.ts was deleted. Run pnpm build:routes. Then confirm routes.json has /dianbao/:category? and /telegraph/:category? both pointing at telegraph.tsx (or a single route object with both paths), and that no cls route location equals dianbao.ts. ";
p_build += "Do not commit generated files if gitignore excludes them. Return structured result.";

let build = agent(p_build, #{ label: "build-routes", capability_mode: "all", output_schema: build_schema });
if build == () || build.success != true {
    complete(#{ summary: "build-routes agent failed", all_fixed: false });
}

phase("Verify");
log("Independent verifier against the original eight findings");

let p_verify = "";
p_verify += "Repo /Users/luck/Downloads/Repos/RSSHub. Read-only except you MAY run tests. Do not commit. ";
p_verify += "Adversarially verify these review findings are actually fixed in the working tree. Use read_file, grep, and git diff. Do not trust the implementers. ";
p_verify += "F1: lib/routes/cls/API.md must not present dianbao.ts as a separate implementation file. ";
p_verify += "F2: assets/build/routes.json must not use location dianbao.ts; dianbao path must resolve to telegraph.tsx. ";
p_verify += "F3: lib/routes/jin10/flash.ts must attach jin10 hot labels like new.ts. ";
p_verify += "F4: fetchJin10FlashHotMap must log on failure, still return empty Map. ";
p_verify += "F5: longbridge flash API and official RSS items must share a guid/id scheme so mergeItems can dedupe. ";
p_verify += "F6: retired channel slugs still error, and the error text names replacements. ";
p_verify += "F7: telegraph Route description documents the dianbao alias default of 50 and limit. ";
p_verify += "F8: AGENTS.md pnpm/node pins match package.json. ";
p_verify += "Set all_fixed true only if every finding is gone with evidence you read. remaining is the list of still-open finding ids. Run pnpm vitest on the touched test files if present. ";

let verify = agent(p_verify, #{ label: "verify", capability_mode: "all", output_schema: verify_schema });

if verify == () || verify.success != true || verify.output == () {
    complete(#{ summary: "verifier failed", all_fixed: false });
}

complete(#{
    summary: verify.output.summary,
    all_fixed: verify.output.all_fixed,
    covered: verify.output.covered,
    remaining: verify.output.remaining,
    build: build.output.summary,
});
