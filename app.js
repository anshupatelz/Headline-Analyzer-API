require('dotenv').config()
const cors = require('cors');
const express = require('express');
const app = express();
const natural = require('natural');
const Sentiment = require('sentiment');
const getSentiment = new Sentiment();
const getReadability = require("flesch-kincaid-calc");

//Middlewares
app.use(cors());

const commonWordsList = require('./utils/common-words-list');
const uncommonWordsList = require('./utils/uncommon-words-list');
const emotionalWordsList = require('./utils/emotional-words-list');
const powerWordsList = require('./utils/power-words-list');

// Server
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port http://localhost:${process.env.PORT}`);
});

// Analyze Headline
app.get('/', (req, res) => {
    // Check if the headline is provided
    if (!req.query.headline) {
        return res.status(400).json({ error: 'Headline is required' });
    } else {
        // Get the headline from the query
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

        let structuralAnalysis = {
            headline_type: headlineType,
            character_count: headline.length,
            word_count: tokens.length,
            beginning_words: tokens.slice(0, 3),
            ending_words: tokens.slice(-3)
        }

        let wordBalance = {
            common_words: tokens.filter(word => commonWordsList.includes(word)),
            uncommon_words: tokens.filter(word => uncommonWordsList.includes(word)),
            emotional_words: tokens.filter(word => emotionalWordsList.includes(word)),
            power_words: tokens.filter(word => powerWordsList.includes(word))
        }

        let sentimentAnalysis = {
            score: getSentiment.analyze(headline).score,
            positive_words: getSentiment.analyze(headline).positive,
            negative_words: getSentiment.analyze(headline).negative
        }

        let readabilityAnalysis = {
            flesch_kincaid_grade: getReadability.getGradeLevel(headline), // 0-12
            flesch_reading_ease: getReadability.getReadingEase(headline), // 0-100
        }


        // Headline Score - Start

        function calculateScore(headline, structuralAnalysis, wordBalance, sentimentAnalysis, readabilityAnalysis) {
            // Define the importance of each factor
            const importance = {
                headlineLength: 0.4,
                numberInTitle: 0.1,
                commonWords: 0.05,
                uncommonWords: 0.05,
                emotionalWords: 0.1,
                powerWords: 0.1,
                sentiment: 0.1,
                fleschKincaidGrade: 0.05,
                fleschReadingEase: 0.05
            };

            // Calculate the score for each factor
            const headlineLengthScore = 100 - Math.abs(structuralAnalysis.character_count - 60) * (100 / 60); // Assuming 60 is the optimal length
            const numberInTitleScore = headline.match(/\d+/) ? 100 : 0; // 0 or 100
            const commonWordsScore = 100 - Math.abs((wordBalance.common_words.length / structuralAnalysis.word_count) * 100 - 25) * (100 / 25); // Assuming 25% is the optimal number
            const uncommonWordsScore = 100 - Math.abs((wordBalance.uncommon_words.length / structuralAnalysis.word_count) * 100 - 15) * (100 / 15); // Assuming 15% is the optimal number
            const emotionalWordsScore = 100 - Math.abs((wordBalance.emotional_words.length / structuralAnalysis.word_count) * 100 - 15) * (100 / 15); // Assuming 15% is the optimal number
            const powerWordsScore = 100 - Math.abs(wordBalance.power_words.length - 3) * (100 / 3); // Assuming 3 is the optimal number
            const sentimentScore = (sentimentAnalysis.score == 0 ? 50 : (sentimentAnalysis.score > 0 ? 100 : 0)); // Assuming 0 is the neutral score
            const fleschKincaidGradeScore = (readabilityAnalysis.flesch_kincaid_grade < 9 ? 100 : 100 - Math.abs(readabilityAnalysis.flesch_kincaid_grade - 9) * (100 / 9)); // Assuming 9 is the optimal grade level
            const fleschReadingEaseScore = readabilityAnalysis.flesch_reading_ease; // Assuming 100 is the optimal range

            // Calculate the final score
            const score = (
                headlineLengthScore * importance.headlineLength +
                numberInTitleScore * importance.numberInTitle +
                commonWordsScore * importance.commonWords +
                uncommonWordsScore * importance.uncommonWords +
                emotionalWordsScore * importance.emotionalWords +
                powerWordsScore * importance.powerWords +
                sentimentScore * importance.sentiment +
                fleschKincaidGradeScore * importance.fleschKincaidGrade +
                fleschReadingEaseScore * importance.fleschReadingEase
            );
            return score;
        }

        let headlineScore = calculateScore(headline, structuralAnalysis, wordBalance, sentimentAnalysis, readabilityAnalysis);

        // Headline Score - End

        // Response Object
        const analysis = {
            headline: headline,
            score: headlineScore, //0-100
            tokens: tokens,
            structural_analysis: structuralAnalysis,
            semantic_analysis: {
                word_balance: wordBalance,
            },
            sentiment_analysis: sentimentAnalysis,
            readability_analysis: readabilityAnalysis,
        };

        res.json(analysis);
    }
});