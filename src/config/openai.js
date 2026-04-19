const OpenAI = require('openai');
const { OPENAI_API_KEY} = require('./index');

if (!OPENAI_API_KEY) {
    console.warn('Warning: OPENAI_API_KEY is not set. OpenAI features will be disabled.');
}

const openai = new OpenAI({
    apiKey: OPENAI_API_KEY,
});

module.exports = openai;