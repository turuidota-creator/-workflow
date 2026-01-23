
export type BriefingFieldKey = 'what' | 'when' | 'who' | 'scope' | 'market_implications' | 'grammar_analysis';

export const briefingFieldLabels: Record<BriefingFieldKey, string> = {
    what: '事件内容',
    when: '时间',
    who: '主体',
    scope: '范围',
    market_implications: '市场影响',
    grammar_analysis: '语法分析'
};

export const runAudit = (jsonStr: string) => {
    try {
        const data = JSON.parse(jsonStr);
        const articleData = data.article || data;
        const paragraphs = articleData.paragraphs || [];
        const meta = articleData.meta || {};
        const briefing = meta.briefing || {};

        let totalWords = 0;
        paragraphs.forEach((p: any) => {
            const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);
            sentences.forEach((s: any) => {
                if (s.tokens && Array.isArray(s.tokens)) {
                    s.tokens.forEach((t: any) => {
                        const text = t.text || t.value || t.word || '';
                        if (!text) return;
                        // Split by whitespace and count each word that:
                        // - Contains at least one English letter
                        // - Does not contain Chinese characters
                        const words = text.split(/\s+/);
                        words.forEach((word: string) => {
                            // Clean punctuation from word edges
                            const cleanWord = word.replace(/^[^\w]+|[^\w]+$/g, '');
                            if (cleanWord && /[a-zA-Z]/.test(cleanWord) && !/[\u4e00-\u9fa5]/.test(cleanWord)) {
                                totalWords++;
                            }
                        });
                    });
                }
            });
        });

        let hasSentenceAnalysis = false;
        let isSentenceAnalysisChineseStart = true;
        paragraphs.forEach((p: any) => {
            const sentences = p.paragraph?.tokenizedSentences || (Array.isArray(p) ? p : []);
            sentences.forEach((s: any) => {
                const analysis = s.analysis;
                if (!analysis) return;
                const grammarText = analysis.grammar || '';
                const explanationText = analysis.explanation || '';
                if (grammarText || explanationText) {
                    hasSentenceAnalysis = true;
                }
                const grammarOk = grammarText ? /^[\u4e00-\u9fa5]/.test(grammarText.trim()) : true;
                const explanationOk = explanationText ? /^[\u4e00-\u9fa5]/.test(explanationText.trim()) : true;
                if (!grammarOk || !explanationOk) {
                    isSentenceAnalysisChineseStart = false;
                }
            });
        });

        // Briefing field validation (what, when, who, scope, market_implications)
        const hasWhat = !!(briefing.what && briefing.what.trim());
        const hasWhen = !!(briefing.when && briefing.when.trim());
        const hasWho = !!(briefing.who && briefing.who.trim());
        const hasScope = !!(briefing.scope && briefing.scope.trim());
        const hasMarketImplications = !!(briefing.market_implications && briefing.market_implications.trim());
        const hasGrammarAnalysis = !!(briefing.grammar_analysis && briefing.grammar_analysis.trim());
        const isGrammarAnalysisChineseStart = hasGrammarAnalysis
            ? /^[\u4e00-\u9fa5]/.test(briefing.grammar_analysis.trim())
            : false;
        const isGrammarAnalysisValid = hasGrammarAnalysis && isGrammarAnalysisChineseStart;
        const isBriefingComplete = hasWhat && hasWhen && hasWho && hasScope && hasMarketImplications && isGrammarAnalysisValid;

        // Updated word count range: 210-270
        const isWordCountValid = totalWords >= 210 && totalWords <= 270;
        const isParaCountValid = paragraphs.length === 3;

        return {
            wordCount: totalWords,
            paraCount: paragraphs.length,
            hasTitle: !!(articleData.title?.zh || articleData.title?.cn),
            hasBriefing: !!(articleData.intro?.text || Object.keys(briefing).length > 0),
            hasGlossary: !!(data.glossary && Object.keys(data.glossary).length > 0),
            hasSentenceAnalysis,
            isSentenceAnalysisChineseStart,
            // Briefing sub-fields
            hasWhat,
            hasWhen,
            hasWho,
            hasScope,
            hasMarketImplications,
            hasGrammarAnalysis,
            isGrammarAnalysisChineseStart,
            isGrammarAnalysisValid,
            isBriefingComplete,
            isWordCountValid,
            isParaCountValid,
            valid: isWordCountValid
                && isParaCountValid
                && isBriefingComplete
                && isSentenceAnalysisChineseStart
        };
    } catch (e) {
        return null;
    }
};
