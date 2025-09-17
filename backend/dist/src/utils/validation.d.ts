import Joi from 'joi';
export declare const registerSchema: Joi.ObjectSchema<any>;
export declare const loginSchema: Joi.ObjectSchema<any>;
export declare const refreshTokenSchema: Joi.ObjectSchema<any>;
export declare const updateProfileSchema: Joi.ObjectSchema<any>;
export declare const categorySchema: Joi.ObjectSchema<any>;
export declare const createQuizSchema: Joi.ObjectSchema<any>;
export declare const createQuestionBankSchema: Joi.ObjectSchema<any>;
export declare const bulkImportSchema: Joi.ObjectSchema<any>;
export declare const assignQuestionsSchema: Joi.ObjectSchema<any>;
export declare const searchQuestionsSchema: Joi.ObjectSchema<any>;
export declare const searchQuizzesSchema: Joi.ObjectSchema<any>;
export declare const createQuestionSchema: Joi.ObjectSchema<any>;
export declare const startQuizSchema: Joi.ObjectSchema<any>;
export declare const submitAnswerSchema: Joi.ObjectSchema<any>;
export declare const completeQuizSchema: Joi.ObjectSchema<any>;
export declare const createMatchSchema: Joi.ObjectSchema<any>;
export declare const joinMatchSchema: Joi.ObjectSchema<any>;
export declare const validationMessages: {
    'custom.noCorrectAnswer': string;
};
export declare const validateCategory: (data: any) => Joi.ValidationResult<any>;
export declare const validateQuiz: (data: any) => Joi.ValidationResult<any>;
export declare const validateQuestion: (data: any) => Joi.ValidationResult<any>;
//# sourceMappingURL=validation.d.ts.map