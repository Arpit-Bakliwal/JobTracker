const { z } = require('zod');

const createJobSchema = z.object({
  title: z
    .string({ required_error: 'Job title is required' })
    .min(2, 'Job title must be at least 2 characters')
    .max(100, 'Job title must be less than 100 characters')
    .trim(),

  company: z
    .string({ required_error: 'Company name is required' })
    .min(2, 'Company name must be at least 2 characters')
    .max(100, 'Company name must be less than 100 characters')
    .trim(),

  location: z
    .string()
    .max(100, 'Location must be less than 100 characters')
    .trim()
    .optional(),

  jobUrl: z
    .string()
    .url("Invalid Job URL format")
    .optional(),

  status: z
    .enum(['APPLIED', "SCREENING", 'INTERVIEW', 'OFFER', 'REJECTED', "WITHDRAWN"])
    .default('APPLIED'),

  notes: z
    .string()
    .max(1000, 'Notes must be less than 1000 characters')
    .trim()
    .optional(),

  salary: z
    .string()
    .max(50, 'Salary must be less than 50 characters')
    .trim()
    .optional(),

  appliedAt: z
    .string()
    .datetime("Invalid Date Format")
    .optional(),
});

const updateJobSchema = createJobSchema.partial();

module.exports = { createJobSchema, updateJobSchema };