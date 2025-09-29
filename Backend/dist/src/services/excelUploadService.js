"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.excelUploadService = exports.ExcelUploadService = void 0;
const XLSX = require("xlsx");
const models_1 = require("../models");
const categoryService_1 = require("./categoryService");
const logger_1 = require("../utils/logger");
class ExcelUploadService {
    constructor() {
        this.categoryService = new categoryService_1.CategoryService();
    }
    async importQuestionsFromExcel(fileBuffer, options) {
        try {
            (0, logger_1.logInfo)('Starting Excel import', {
                categoryId: options.categoryId,
                includeSubcategories: options.includeSubcategories
            });
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
            const headers = rawData[0];
            const dataRows = rawData.slice(1);
            this.validateHeaders(headers);
            const questions = this.parseQuestionRows(headers, dataRows);
            const targetCategories = await this.getTargetCategories(options);
            const result = await this.importQuestions(questions, targetCategories, options);
            (0, logger_1.logInfo)('Excel import completed', result);
            return result;
        }
        catch (error) {
            (0, logger_1.logError)('Excel import failed', error);
            throw error;
        }
    }
    normalizeCorrectAnswer(answer) {
        if (!answer)
            return '1';
        return answer
            .split(',')
            .map(a => {
            const trimmed = a.trim().toLowerCase();
            if (trimmed === 'a')
                return '1';
            if (trimmed === 'b')
                return '2';
            if (trimmed === 'c')
                return '3';
            if (trimmed === 'd')
                return '4';
            return trimmed;
        })
            .join(',');
    }
    validateHeaders(headers) {
        const normalizedHeaders = headers.map(h => h.toLowerCase().trim());
        if (!normalizedHeaders.includes('question')) {
            throw new Error(`Missing required column: question`);
        }
        const hasNewFormat = normalizedHeaders.includes('option1') && normalizedHeaders.includes('option2');
        const hasOldFormat = normalizedHeaders.includes('option_a') && normalizedHeaders.includes('option_b');
        if (!hasNewFormat && !hasOldFormat) {
            throw new Error(`Missing required option columns. Expected either: option1, option2 OR option_a, option_b`);
        }
        const hasCorrectAnswers = normalizedHeaders.includes('correctanswers') ||
            normalizedHeaders.includes('correct_answer');
        if (!hasCorrectAnswers) {
            throw new Error(`Missing required column: correctAnswers or correct_answer`);
        }
    }
    parseQuestionRows(headers, dataRows) {
        const questions = [];
        const headerMap = this.createHeaderMap(headers);
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            if (!row || row.every(cell => !cell))
                continue;
            try {
                const question = {
                    question: this.getCellValue(row, headerMap, 'question'),
                    option1: this.getCellValue(row, headerMap, 'option1') || this.getCellValue(row, headerMap, 'option_a'),
                    option2: this.getCellValue(row, headerMap, 'option2') || this.getCellValue(row, headerMap, 'option_b'),
                    option3: this.getCellValue(row, headerMap, 'option3') || this.getCellValue(row, headerMap, 'option_c'),
                    option4: this.getCellValue(row, headerMap, 'option4') || this.getCellValue(row, headerMap, 'option_d'),
                    correctAnswers: this.normalizeCorrectAnswer(this.getCellValue(row, headerMap, 'correctAnswers') || this.getCellValue(row, headerMap, 'correct_answer') || '1'),
                    difficulty: this.getCellValue(row, headerMap, 'difficulty') || 'MEDIUM',
                    category: this.getCellValue(row, headerMap, 'category')
                };
                this.validateQuestion(question, i + 2);
                questions.push(question);
            }
            catch (error) {
                (0, logger_1.logError)(`Error parsing row ${i + 2}`, error);
                throw new Error(`Row ${i + 2}: ${error.message}`);
            }
        }
        return questions;
    }
    createHeaderMap(headers) {
        const map = {};
        headers.forEach((header, index) => {
            const normalized = header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
            map[normalized] = index;
            if (normalized.includes('correct')) {
                map['correctanswers'] = index;
                map['correct_answers'] = index;
            }
        });
        return map;
    }
    getCellValue(row, headerMap, key) {
        const variations = [
            key,
            key.toLowerCase(),
            key.replace(/[^a-z0-9]/gi, '').toLowerCase()
        ];
        for (const variation of variations) {
            const index = headerMap[variation];
            if (index !== undefined && row[index] !== undefined && row[index] !== null) {
                return String(row[index]).trim();
            }
        }
        return '';
    }
    validateQuestion(question, rowNumber) {
        if (!question.question) {
            throw new Error(`Question text is required`);
        }
        if (!question.option1 || !question.option2) {
            throw new Error(`At least 2 options are required`);
        }
        if (!question.correctAnswers) {
            throw new Error(`Correct answers must be specified`);
        }
        if (question.difficulty && !['EASY', 'MEDIUM', 'HARD'].includes(question.difficulty.toUpperCase())) {
            throw new Error(`Invalid difficulty: ${question.difficulty}. Must be EASY, MEDIUM, or HARD`);
        }
        const correctIndices = question.correctAnswers.split(',').map(s => parseInt(s.trim()));
        const availableOptions = [question.option1, question.option2, question.option3, question.option4].filter(Boolean);
        for (const index of correctIndices) {
            if (isNaN(index) || index < 1 || index > availableOptions.length) {
                throw new Error(`Invalid correct answer index: ${index}. Must be between 1 and ${availableOptions.length}`);
            }
        }
    }
    async getTargetCategories(options) {
        const categories = [];
        const mainCategory = await models_1.Category.findByPk(options.categoryId);
        if (!mainCategory) {
            throw new Error(`Category with ID ${options.categoryId} not found`);
        }
        categories.push(mainCategory);
        if (options.includeSubcategories) {
            const subcategories = await this.categoryService.getSubcategories(options.categoryId, options.subcategoryDepth || 10);
            const flattenedSubcategories = this.flattenCategories(subcategories);
            categories.push(...flattenedSubcategories);
        }
        return categories;
    }
    flattenCategories(categories) {
        const flattened = [];
        for (const category of categories) {
            flattened.push(category);
            if (category.children && category.children.length > 0) {
                flattened.push(...this.flattenCategories(category.children));
            }
        }
        return flattened;
    }
    async importQuestions(questions, targetCategories, options) {
        const result = {
            totalRows: questions.length,
            successfulImports: 0,
            failedImports: 0,
            errors: [],
            importedQuestions: [],
            categoryDistribution: {}
        };
        for (let i = 0; i < questions.length; i++) {
            const questionData = questions[i];
            try {
                let targetCategory = targetCategories[0];
                if (questionData.category) {
                    const specifiedCategory = targetCategories.find(cat => cat.name.toLowerCase().includes(questionData.category.toLowerCase()) ||
                        questionData.category.toLowerCase().includes(cat.name.toLowerCase()));
                    if (specifiedCategory) {
                        targetCategory = specifiedCategory;
                    }
                }
                else if (targetCategories.length > 1) {
                    targetCategory = targetCategories[i % targetCategories.length];
                }
                const question = await models_1.QuestionBankItem.create({
                    questionText: questionData.question,
                    difficulty: questionData.difficulty?.toUpperCase() || models_1.Difficulty.MEDIUM,
                    categoryId: targetCategory.id,
                    createdById: options.createdById,
                    isActive: true
                });
                const options_data = [
                    { text: questionData.option1, isCorrect: false },
                    { text: questionData.option2, isCorrect: false },
                    questionData.option3 ? { text: questionData.option3, isCorrect: false } : null,
                    questionData.option4 ? { text: questionData.option4, isCorrect: false } : null
                ].filter(Boolean);
                const correctIndices = questionData.correctAnswers.split(',').map(s => parseInt(s.trim()) - 1);
                correctIndices.forEach(index => {
                    if (options_data[index]) {
                        options_data[index].isCorrect = true;
                    }
                });
                for (const optionData of options_data) {
                    await models_1.QuestionBankOption.create({
                        questionId: question.id,
                        optionText: optionData.text,
                        isCorrect: optionData.isCorrect
                    });
                }
                result.importedQuestions.push(question);
                result.successfulImports++;
                const categoryName = targetCategory.name;
                result.categoryDistribution[categoryName] = (result.categoryDistribution[categoryName] || 0) + 1;
            }
            catch (error) {
                result.failedImports++;
                const errorMessage = `Row ${i + 2}: ${error.message}`;
                result.errors.push(errorMessage);
                (0, logger_1.logError)(`Failed to import question from row ${i + 2}`, error);
            }
        }
        return result;
    }
    generateTemplate() {
        const templateData = [
            ['question', 'option1', 'option2', 'option3', 'option4', 'correctAnswers', 'difficulty', 'category'],
            [
                'What is the capital of France?',
                'London',
                'Paris',
                'Berlin',
                'Madrid',
                '2',
                'EASY',
                'Geography'
            ],
            [
                'Which of the following are programming languages?',
                'JavaScript',
                'HTML',
                'Python',
                'CSS',
                '1,3',
                'MEDIUM',
                'Computer Science'
            ],
            [
                'What is 2 + 2?',
                '3',
                '4',
                '5',
                '6',
                '2',
                'EASY',
                'Mathematics'
            ]
        ];
        const worksheet = XLSX.utils.aoa_to_sheet(templateData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Questions');
        return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
    }
}
exports.ExcelUploadService = ExcelUploadService;
exports.excelUploadService = new ExcelUploadService();
//# sourceMappingURL=excelUploadService.js.map