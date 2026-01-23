
import React from 'react';
import { runAudit, BriefingFieldKey, briefingFieldLabels } from '../../lib/audit';

interface AuditStatusProps {
    json: string;
    side?: 'A' | 'B'; // Optional for non-AB scenarios
    onRegenerateBriefingField: (side: 'A' | 'B' | undefined, field: BriefingFieldKey) => void;
    onRegenerateSentenceAnalysis: (side: 'A' | 'B' | undefined) => void;
}

export const AuditStatus: React.FC<AuditStatusProps> = ({
    json,
    side,
    onRegenerateBriefingField,
    onRegenerateSentenceAnalysis
}) => {
    if (!json) return null;
    const result = runAudit(json);
    if (!result) return <div className="text-red-400 text-xs">JSON 解析错误</div>;

    return (
        <div className="mt-4 p-3 bg-black/40 rounded-lg border border-white/10 text-xs space-y-2">
            <div className="font-semibold text-slate-400 mb-1 flex items-center justify-between">
                <span>审计状态 (Audit Status)</span>
                {result.valid ? <span className="text-green-400">✅ 通过</span> : <span className="text-red-400">❌ 未通过</span>}
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">字数 (210-270)</span>
                    <span className={result.isWordCountValid ? "text-green-400" : "text-red-400 font-bold"}>
                        {result.wordCount} {result.isWordCountValid ? "✅" : "⚠️"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">段落 (3段)</span>
                    <span className={result.isParaCountValid ? "text-green-400" : "text-red-400 font-bold"}>
                        {result.paraCount} {result.isParaCountValid ? "✅" : "⚠️"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">标题</span>
                    <span className={result.hasTitle ? "text-green-400" : "text-red-400"}>
                        {result.hasTitle ? "✅" : "❌"}
                    </span>
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-slate-500">Glossary</span>
                    <span className={result.hasGlossary ? "text-green-400" : "text-slate-500"}>
                        {result.hasGlossary ? "✅" : "⚪"}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRegenerateSentenceAnalysis(side);
                    }}
                    className="flex items-center justify-between text-left hover:text-white transition-colors"
                    title="点击重新生成语法分析(中文)"
                >
                    <span className="text-slate-500">语法分析(中文)</span>
                    <span className={result.isSentenceAnalysisChineseStart ? "text-green-400" : "text-red-400"}>
                        {result.isSentenceAnalysisChineseStart ? "✅" : "❌"}
                    </span>
                </button>
            </div>

            {/* Briefing Fields Audit */}
            <div className="pt-2 border-t border-white/5">
                <div className="font-semibold text-slate-400 mb-1 flex items-center justify-between">
                    <span>Briefing 硬信息</span>
                    {result.isBriefingComplete ? <span className="text-green-400">✅ 完整</span> : <span className="text-yellow-400">⚠️ 缺失字段</span>}
                </div>
                <div className="grid grid-cols-3 gap-1 text-[10px]">
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'what');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成事件内容"
                    >
                        <span className={result.hasWhat ? "text-green-400" : "text-red-400"}>
                            {result.hasWhat ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">{briefingFieldLabels.what}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'when');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成时间"
                    >
                        <span className={result.hasWhen ? "text-green-400" : "text-red-400"}>
                            {result.hasWhen ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">{briefingFieldLabels.when}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'who');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成主体"
                    >
                        <span className={result.hasWho ? "text-green-400" : "text-red-400"}>
                            {result.hasWho ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">{briefingFieldLabels.who}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'scope');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成范围"
                    >
                        <span className={result.hasScope ? "text-green-400" : "text-red-400"}>
                            {result.hasScope ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">{briefingFieldLabels.scope}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'market_implications');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成市场影响"
                    >
                        <span className={result.hasMarketImplications ? "text-green-400" : "text-red-400"}>
                            {result.hasMarketImplications ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">{briefingFieldLabels.market_implications}</span>
                    </button>
                    <button
                        type="button"
                        onClick={(event) => {
                            event.stopPropagation();
                            onRegenerateBriefingField(side, 'grammar_analysis');
                        }}
                        className="flex items-center gap-1 text-left hover:text-white transition-colors"
                        title="点击重新生成语法分析"
                    >
                        <span className={result.isGrammarAnalysisValid ? "text-green-400" : "text-red-400"}>
                            {result.isGrammarAnalysisValid ? "✓" : "✗"}
                        </span>
                        <span className="text-slate-500">
                            {briefingFieldLabels.grammar_analysis}
                            {result.hasGrammarAnalysis && !result.isGrammarAnalysisChineseStart ? " (需中文开头)" : ""}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};
