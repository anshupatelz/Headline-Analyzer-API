const express = require('express');
const app = express();
const natural = require('natural');
const Sentiment = require('sentiment');
const getSentiment = new Sentiment();
const getReadability = require("flesch-kincaid-calc");

const port = 8080;

const commonWordsList = require('./utils/common-words-list');
const uncommonWordsList = require('./utils/uncommon-words-list');
const emotionalWordsList = require('./utils/emotional-words-list');
const powerWordsList = require('./utils/power-words-list');

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Analyze Headline
app.get('/', (req, res) => {
    const headline = req.query.headline;

    // Tokenization
    let tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(headline);

    // Headline Types - START

    // Define headline types and their conditions
    const headlineTypes = [
        { type: 'How-to', condition: tokens => (tokens[0] == 'how-to') || (tokens[0] == 'how' && tokens[1] == 'to') },
        { type: 'List', condition: tokens => !isNaN(tokens[0]) || ((tokens[0] == 'best') && !isNaN(tokens[1])) || ((tokens[0] == 'top') && !isNaN(tokens[1])) },
        { type: 'Question-based', condition: tokens => tokens.includes('why') || tokens.includes('what') || tokens.includes('when') || headline.includes('?') },
        { type: 'Reviews/Comparison', condition: tokens => tokens.includes('review') || tokens.includes('vs') || tokens.includes('which') },
        { type: 'Case Study', condition: tokens => tokens.includes('case') && tokens.includes('study') },
        { type: 'Interview', condition: tokens => tokens.includes('interview') }
    ];

    // Headline Type Identification
    let headlineType = [];
    for (let i = 0; i < headlineTypes.length; i++) {
        if (headlineTypes[i].condition(tokens, headline)) {
            headlineType.push(headlineTypes[i].type);
        }
    }
    if (!headlineType.length) {
        headlineType.push('General');
    }

    // Headline Types - END

    // Response Object
    const analysis = {
        headline: headline,
        tokens: tokens,
        structural_analysis: {
            headline_type: headlineType,
            character_count: headline.length,
            word_count: tokens.length,
            beginning_words: tokens.slice(0, 3),
            ending_words: tokens.slice(-3)
        },
        semantic_analysis: {
            word_balance: {
                common_words: tokens.filter(word => commonWordsList.includes(word)),
                uncommon_words: tokens.filter(word => uncommonWordsList.includes(word)),
                emotional_words: tokens.filter(word => emotionalWordsList.includes(word)),
                power_words: tokens.filter(word => powerWordsList.includes(word))
            },
        },
        sentiment_analysis: {
            score: getSentiment.analyze(headline).score,
            positive_words: getSentiment.analyze(headline).positive,
            negative_words: getSentiment.analyze(headline).negative
        },
        readability_analysis: {
            flesch_kincaid_grade: getReadability.getGradeLevel(headline), // 0-12
            flesch_reading_ease: getReadability.getReadingEase(headline), // 0-100
        }
    };
    res.json(analysis);
});