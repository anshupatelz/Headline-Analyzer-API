const express = require('express');
const app = express();

const path = require('path');

const port = 8080;

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});

// Analyze Headline
app.get('/', (req, res) => {
    const headline = req.query.headline;
    const analysis = {
        headline: headline,
        sentiment: 'neutral',
        subjectivity: 'objective'
    };
    res.json(analysis);
});