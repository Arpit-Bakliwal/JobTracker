const openai = require("../config/openai");
const { HTTP_STATUS, MESSAGES } = require("../constants");

// Helper - Safely parse AI JSON response
const parseAIResponse = (content) => {
    try {
        return JSON.parse(content);
    } catch (error) {
        const error2 = new Error(MESSAGES.AI.INVALID_RESPONSE_FORMAT);
        error2.status = HTTP_STATUS.INTERNAL_SERVER_ERROR;
        throw error2;
    }
};

// Helper - Hnadle OpenAI API errors
const handleAIError = (error) => {
    if (error.status === 429) {
        const err = new Error(MESSAGES.AI.RATE_LIMIT_EXCEEDED);
        err.statusCode = HTTP_STATUS.TOO_MANY_REQUESTS;
        throw err;
    }else if (error.status === 503) {
        const err = new Error(MESSAGES.AI.SERVICE_UNAVAILABLE);
        err.statusCode = HTTP_STATUS.SERVICE_UNAVAILABLE;
        throw err;
    }

    const err = new Error("AI service error: " + error.message);
    err.statusCode = error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
    throw err;
};

const analyzeJobMatch = async (jobDescription, userSkills) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a senior technical recruiter with 10 years of experience.
                            Analyze job fit honestly and return ONLY valid JSON.
                            No explanation. No markdown. No code blocks.`,
                },
                {
                    role: "user",
                    content: `
                                Candidate Skills: ${userSkills}

                                Job Description: ${jobDescription}

                                Return JSON in this exact format:
                                {
                                "matchScore": <number between 0-100>,
                                "strengths": [<list of matching skills>],
                                "missingSkills": [<list of skills required but candidate lacks>],
                                "suggestion": "<one actionable sentence to improve chances>",
                                "verdict": "<STRONG_MATCH | GOOD_MATCH | PARTIAL_MATCH | WEAK_MATCH>"
                                }
                            `
                }
            ],
            response_format: {type: "json_object"},
            temperature: 0.3, // Less creative, more factual
            max_tokens: 500,
        });
        return parseAIResponse(response.choices[0].message.content);

    } catch (error) {
        if (error.statusCode) throw error; // Already handled in handleAIError
        handleAIError(error);
    }
};

// Generate interview questions based on job title and user skills
const generateInterviewQuestions = async (jobTitle, userSkills) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `
                                You are a senior technical interviewer.
                                Generate targeted interview questions and return ONLY valid JSON.
                                No explanation. No markdown. No code blocks.
                            `,
                },
                {
                    role: "user",
                    content: `
                                Job Title: ${jobTitle}
                                Skills to focus on: ${userSkills}

                                Generate 5 interview questions.

                                Return JSON in this exact format:
                                {
                                "questions": [
                                    {
                                    "question": "<interview question>",
                                    "difficulty": "<easy | medium | hard>",
                                    "topic": "<skill or topic being tested>",
                                    "hint": "<what a good answer should cover>"
                                    }
                                ]
                                }
                            `,
                }
            ],
            response_format: {type: "json_object"},
            temperature: 0.5, // More creative for question generation
            max_tokens: 800,
        });
        return parseAIResponse(response.choices[0].message.content);

    } catch (error) {
        if (error.statusCode) throw error; // Already handled in handleAIError
        handleAIError(error);
    }
};

// Improve Resume Bullet Points
const improveResumeBullet = async (bulletPoint, jobTitle) => {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content: `You are a professional resume writer with expertise in tech resumes.
                            Improve resume bullet points to be impactful and ATS friendly.
                            Return ONLY valid JSON. No explanation. No markdown. No code blocks.`,
                },
                {
                    role: "user",
                    content: `
                        Target Job Title: ${jobTitle}
                        Original Bullet: ${bulletPoint}

                        Improve this bullet point using the STAR format where possible.
                        Make it quantifiable, action oriented and ATS friendly.

                        Return JSON in this exact format:
                        {
                        "original": "<original bullet>",
                        "improved": "<improved bullet>",
                        "explanation": "<what was changed and why>",
                        "keywords": [<ATS keywords added>]
                        }
                    `,
                }
            ],
            response_format: {type: "json_object"},
            temperature: 0.4,
            max_tokens: 400,
        });
        return parseAIResponse(response.choices[0].message.content);
    } catch (error) {
        if (error.statusCode) throw error; // Already handled in handleAIError
        handleAIError(error);
    }
};

module.exports = {
    analyzeJobMatch,
    generateInterviewQuestions,
    improveResumeBullet,
};