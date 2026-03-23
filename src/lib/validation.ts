import { z } from "zod";

/* ------------------ COMMON ------------------ */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required")
  .email("Invalid email address");

export const passwordSchema = z
  .string()
  .min(6, "Password must be at least 6 characters");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "This field is required");

/* ------------------ REGISTER ------------------ */

export const registerSchema = z
  .object({
    fullName: nameSchema,
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    memberType: z.string().min(1, "Member Type is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

/* ------------------ PROJECT ------------------ */

export const projectSchema = z.object({
  name: nameSchema,
  startDate: z.string().optional(),
  endDate: z.string().optional(),
}).refine(
  (data) => {
    if (!data.startDate || !data.endDate) return true;
    return new Date(data.endDate) >= new Date(data.startDate);
  },
  {
    message: "End date cannot be earlier than start date",
    path: ["endDate"],
  }
);

/* ------------------ TASK ------------------ */

export const taskSchema = z.object({
  title: nameSchema,
  projectId: z.string().min(1, "Project is required"),
  dueDate: z
    .string()
    .optional()
    .refine((val) => {
      if (!val) return true;
      return !Number.isNaN(new Date(val).getTime());
    }, "Invalid due date"),
});
