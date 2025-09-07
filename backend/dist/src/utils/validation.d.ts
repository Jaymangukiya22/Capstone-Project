import Joi from 'joi';
export declare const categorySchema: Joi.ObjectSchema<any>;
export declare const createQuizSchema: Joi.ObjectSchema<any>;
export declare const createQuestionSchema: Joi.ObjectSchema<any>;
export declare const addQuestionSchema: Joi.ObjectSchema<any>;
export declare const validationMessages: {
    'custom.noCorrectAnswer': string;
};
export declare const validateCategory: (data: any) => Joi.ValidationResult<any>;
export declare const validateQuiz: (data: any) => Joi.ValidationResult<any>;
export declare const validateQuestion: (data: any) => Joi.ValidationResult<any>;
//# sourceMappingURL=validation.d.ts.map