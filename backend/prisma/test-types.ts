import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This will show the expected type for creating an option
// @ts-ignore - We're using this for type inspection
type OptionCreateInput = Parameters<typeof prisma.option.create>[0]['data'];

// Log the type structure to help with debugging
console.log('OptionCreateInput structure:');
console.log({
  optionText: 'string',
  isCorrect: 'boolean',
  question: 'QuestionCreateNestedOneWithoutOptionsInput | QuestionCreateNestedOneWithoutOptionsInput[]'
});
