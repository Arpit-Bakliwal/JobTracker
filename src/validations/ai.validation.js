const { z } = require('zod');

const analyzeJobSchema = z.object({
  jobDescription: z
    .string({ required_error: 'Job description is required' })
    .min(50, 'Job description must be at least 50 characters')
    .max(5000, 'Job description must be less than 5000 characters')
    .trim(),

  userSkills: z
    .string({ required_error: 'Your skills are required' })
    .min(10, 'Please provide at least some skills')
    .max(1000, 'Skills must be less than 1000 characters')
    .trim(),
});

const interviewQuestionsSchema = z.object({
  jobTitle: z
    .string({ required_error: 'Job title is required' })
    .min(2, 'Job title must be at least 2 characters')
    .max(100, 'Job title must be less than 100 characters')
    .trim(),

  skills: z
    .string({ required_error: 'Skills are required' })
    .min(10, 'Please provide at least some skills')
    .max(500, 'Skills must be less than 500 characters')
    .trim(),
});

const resumeBulletSchema = z.object({
  bullet: z
    .string({ required_error: 'Resume bullet is required' })
    .min(10, 'Bullet point must be at least 10 characters')
    .max(500, 'Bullet point must be less than 500 characters')
    .trim(),

  jobTitle: z
    .string({ required_error: 'Job title is required' })
    .min(2, 'Job title must be at least 2 characters')
    .max(100, 'Job title must be less than 100 characters')
    .trim(),
});

module.exports = {
  analyzeJobSchema,
  interviewQuestionsSchema,
  resumeBulletSchema,
};