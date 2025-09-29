"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const database_1 = require("../config/database");
const models_1 = require("../models");
const seedCategoriesWithHierarchy = async () => {
    try {
        console.log('🚀 Starting hierarchical category seeding...');
        await (0, database_1.connectDatabase)();
        console.log('✅ Database connected');
        console.log('🧹 Clearing existing categories...');
        await models_1.Category.destroy({ where: {} });
        console.log('✅ Categories cleared');
        let adminUser = await models_1.User.findOne({ where: { role: models_1.UserRole.ADMIN } });
        if (!adminUser) {
            adminUser = await models_1.User.create({
                username: 'admin',
                email: 'admin@example.com',
                password: 'admin123',
                role: models_1.UserRole.ADMIN,
                isActive: true
            });
            console.log('✅ Admin user created');
        }
        const categoryHierarchy = [
            {
                name: 'Mathematics',
                description: 'Mathematical concepts and problem solving',
                subcategories: [
                    { name: 'Algebra', description: 'Linear and quadratic equations' },
                    { name: 'Geometry', description: 'Shapes, angles, and spatial reasoning' },
                    { name: 'Calculus', description: 'Derivatives and integrals' },
                    { name: 'Statistics', description: 'Data analysis and probability' }
                ]
            },
            {
                name: 'Science',
                description: 'Natural sciences and scientific methods',
                subcategories: [
                    { name: 'Physics', description: 'Matter, energy, and motion' },
                    { name: 'Chemistry', description: 'Chemical reactions and compounds' },
                    { name: 'Biology', description: 'Living organisms and life processes' },
                    { name: 'Earth Science', description: 'Geology, meteorology, and astronomy' }
                ]
            },
            {
                name: 'Computer Science',
                description: 'Programming, algorithms, and technology',
                subcategories: [
                    { name: 'Programming', description: 'Coding languages and syntax' },
                    { name: 'Data Structures', description: 'Arrays, lists, trees, and graphs' },
                    { name: 'Algorithms', description: 'Sorting, searching, and optimization' },
                    { name: 'Web Development', description: 'Frontend and backend technologies' }
                ]
            },
            {
                name: 'Languages',
                description: 'World languages and communication',
                subcategories: [
                    { name: 'English', description: 'Grammar, literature, and writing' },
                    { name: 'Spanish', description: 'Spanish language and culture' },
                    { name: 'French', description: 'French language and culture' },
                    { name: 'German', description: 'German language and culture' }
                ]
            },
            {
                name: 'History',
                description: 'Historical events and civilizations',
                subcategories: [
                    { name: 'Ancient History', description: 'Ancient civilizations and empires' },
                    { name: 'Medieval History', description: 'Middle Ages and feudalism' },
                    { name: 'Modern History', description: 'Industrial revolution to present' },
                    { name: 'World Wars', description: 'WWI and WWII history' }
                ]
            },
            {
                name: 'Arts',
                description: 'Creative arts and cultural expression',
                subcategories: [
                    { name: 'Visual Arts', description: 'Painting, sculpture, and design' },
                    { name: 'Music', description: 'Music theory, history, and performance' },
                    { name: 'Theater', description: 'Drama, acting, and stage production' },
                    { name: 'Literature', description: 'Poetry, novels, and literary analysis' }
                ]
            }
        ];
        console.log('📚 Creating hierarchical categories...');
        let totalCategories = 0;
        let totalSubcategories = 0;
        for (const categoryData of categoryHierarchy) {
            const parentCategory = await models_1.Category.create({
                name: categoryData.name,
                description: categoryData.description,
                parentId: null,
                createdById: adminUser.id,
                isActive: true
            });
            console.log(`✅ Created parent category: ${parentCategory.name} (ID: ${parentCategory.id})`);
            totalCategories++;
            for (const subData of categoryData.subcategories) {
                const subcategory = await models_1.Category.create({
                    name: subData.name,
                    description: subData.description,
                    parentId: parentCategory.id,
                    createdById: adminUser.id,
                    isActive: true
                });
                console.log(`  ✅ Created subcategory: ${subcategory.name} (ID: ${subcategory.id}) under ${parentCategory.name}`);
                totalSubcategories++;
            }
        }
        console.log(`\n🎉 Seeding completed successfully!`);
        console.log(`📊 Summary:`);
        console.log(`   - Root Categories: ${totalCategories}`);
        console.log(`   - Subcategories: ${totalSubcategories}`);
        console.log(`   - Total Categories: ${totalCategories + totalSubcategories}`);
        console.log('\n🔍 Verifying category hierarchy...');
        const rootCategories = await models_1.Category.findAll({
            where: { parentId: null },
            include: [{
                    model: models_1.Category,
                    as: 'children',
                    required: false
                }],
            order: [['name', 'ASC']]
        });
        console.log('\n📁 Category Structure:');
        for (const root of rootCategories) {
            console.log(`📁 ${root.name} (ID: ${root.id})`);
            if (root.children && root.children.length > 0) {
                for (const child of root.children) {
                    console.log(`  📁 ${child.name} (ID: ${child.id})`);
                }
            }
        }
        process.exit(0);
    }
    catch (error) {
        console.error('❌ Error seeding categories:', error);
        process.exit(1);
    }
};
seedCategoriesWithHierarchy();
//# sourceMappingURL=seedCategoriesWithHierarchy.js.map