const express = require('express');
const app = express();
const natural = require('natural');

const path = require('path');
const port = 8080;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Analyze Headline
app.get('/', (req, res) => {
    const headline = req.query.headline;

    // Tokenization
    let tokenizer = new natural.WordTokenizer();
    const tokens = tokenizer.tokenize(headline);

    // Headline Types

    // ----- Define headline types and their conditions
    const headlineTypes = [
        { type: 'How-to', condition: tokens => (tokens[0] == 'how-to') || (tokens[0] == 'how' && tokens[1] == 'to') },
        { type: 'List', condition: tokens => !isNaN(tokens[0]) || ((tokens[0] == 'best') && !isNaN(tokens[1])) || ((tokens[0] == 'top') && !isNaN(tokens[1])) },
        { type: 'Question-based', condition: tokens => tokens.includes('why') || tokens.includes('what') || tokens.includes('when') || headline.includes('?') },
        { type: 'Reviews/Comparison', condition: tokens => tokens.includes('review') || tokens.includes('vs') || tokens.includes('which') },
        { type: 'Case Study', condition: tokens => tokens.includes('case') && tokens.includes('study') },
        { type: 'Interview', condition: tokens => tokens.includes('interview') }
    ];

    // ---- Headline Type Identification
    let headlineType = [];
    for (let i = 0; i < headlineTypes.length; i++) {
        if (headlineTypes[i].condition(tokens, headline)) {
            headlineType.push(headlineTypes[i].type);
        }
    }
    if (!headlineType.length) {
        headlineType.push('General');
    }


    // Response
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
    };
    res.json(analysis);
});