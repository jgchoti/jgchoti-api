import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { projectData } from '../data/projectData.js';
import { profileData } from '../data/profileData.js';
import { contactInfo } from '../data/contactInfo.js';

let githubData = [];
try {
    const __jsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/github_portfolio_data.json');
    if (fs.existsSync(__jsonPath)) {
        githubData = JSON.parse(fs.readFileSync(__jsonPath, 'utf-8'));
    }
} catch (_) {
    githubData = [];
}
// data/github_portfolio_data.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


function normalizeTechNames(technologies) {
    if (!technologies) return [];
    return technologies.map(t => {
        if (typeof t === 'string') return t.toLowerCase();
        if (t && typeof t.name === 'string') return t.name.toLowerCase();
        return String(t || '').toLowerCase();
    });
}

function getDataSkillCategories(technologies) {
    const techNames = normalizeTechNames(technologies);
    const skillCategories = [];

    // Data Engineering skills
    if (techNames.some(t => ['python', 'pandas', 'numpy', 'api', 'node.js'].includes(t))) {
        skillCategories.push('data pipeline development');
    }

    // Data Science skills  
    if (techNames.some(t => ['python', 'scikit-learn', 'machine learning', 'matplotlib', 'seaborn'].includes(t))) {
        skillCategories.push('machine learning and statistical analysis');
    }

    // ML Engineering skills
    if (techNames.some(t => ['embeddings', 'vector', 'rag', 'ai', 'deployment'].includes(t))) {
        skillCategories.push('ML infrastructure and model deployment');
    }

    // Backend/Systems skills
    if (techNames.some(t => ['node.js', 'express', 'api', 'database', 'serverless'].includes(t))) {
        skillCategories.push('scalable backend systems development');
    }

    // Data Analysis skills
    if (techNames.some(t => ['visualization', 'analytics', 'dashboard', 'sql'].includes(t))) {
        skillCategories.push('data visualization and analytics');
    }

    return skillCategories;
}

function getCareerPathRelevanceFromTechs(technologies) {
    const techNames = normalizeTechNames(technologies);
    const paths = {};

    paths.dataEngineering = 0;
    paths.dataScience = 0;
    paths.backendDev = 0;
    paths.dataAnalyst = 0;

    // Data Engineering relevance
    if (techNames.some(t => ['api', 'pipeline', 'etl', 'database'].includes(t))) paths.dataEngineering += 3;
    if (techNames.some(t => ['node.js', 'express', 'serverless'].includes(t))) paths.dataEngineering += 2;
    if (techNames.some(t => ['processing', 'automation'].includes(t))) paths.dataEngineering += 2;

    // Data Science relevance
    if (techNames.some(t => ['python', 'pandas', 'numpy'].includes(t))) paths.dataScience += 3;
    if (techNames.some(t => ['machine learning', 'scikit-learn'].includes(t))) paths.dataScience += 4;
    if (techNames.some(t => ['matplotlib', 'seaborn', 'visualization'].includes(t))) paths.dataScience += 2;

    // Backend Development relevance
    if (techNames.some(t => ['node.js', 'express', 'javascript'].includes(t))) paths.backendDev += 4;
    if (techNames.some(t => ['api', 'rest', 'serverless'].includes(t))) paths.backendDev += 3;
    if (techNames.some(t => ['database', 'cors'].includes(t))) paths.backendDev += 2;

    // Data Analyst relevance
    if (techNames.some(t => ['visualization', 'dashboard', 'analytics'].includes(t))) paths.dataAnalyst += 4;
    if (techNames.some(t => ['python', 'pandas', 'sql'].includes(t))) paths.dataAnalyst += 3;
    if (techNames.some(t => ['reporting', 'insights'].includes(t))) paths.dataAnalyst += 2;

    return paths;
}

function createDocuments() {
    const documents = [];

    profileData.forEach((section, index) => {
        let enhancedContent = `${section.title}: ${section.content}${section.subtitle ? ` ${section.subtitle}` : ''}`;

        // Add flexible career context
        if (section.title.includes('Technical Skills') || section.title.includes('Skills')) {
            enhancedContent += ` These versatile technical skills apply across multiple data career paths including Data Engineering, Data Science, ML Engineering, and Backend Development roles.`;
        }

        if (section.title.includes('International Experience') || section.title.includes('Experience')) {
            enhancedContent += ` This global perspective is valuable across all data-focused roles, bringing cross-cultural collaboration skills and diverse problem-solving approaches.`;
        }

        if (section.title.includes('Learning') || section.title.includes('Journey')) {
            enhancedContent += ` Open to various data career paths, with particular interest in roles combining technical skills with data systems, analysis, and engineering.`;
        }

        if (section.title.includes('Accomplishments') || section.title.includes('Challenge')) {
            enhancedContent += ` This achievement demonstrates ability to work across the full data stack - from problem identification to technical implementation to solution delivery.`;
        }

        documents.push({
            id: `profile-${index}`,
            content: enhancedContent,
            metadata: {
                type: 'profile',
                section: section.title,
                source: 'profile',
                careerRelevance: 'high'
            }
        });
    });

    projectData.forEach((project, index) => {
        const skillCategories = getDataSkillCategories(project.technologies);
        const careerPaths = getCareerPathRelevanceFromTechs(project.technologies);
        const topPaths = Object.entries(careerPaths)
            .filter(([_, score]) => score >= 4)
            .map(([path, _]) => path)
            .join(', ');

        const content = `${project.name}: ${project.shortDescription || project.description}

Multi-Path Career Relevance: This project demonstrates skills applicable to ${topPaths || 'multiple data career paths'}. The technical implementation showcases ${skillCategories.length > 0 ? skillCategories.join(', ') : 'versatile software engineering capabilities'}.

Technical Stack: Built with ${project.technologies.map(t => t.name).join(', ')}, showing proficiency across the modern data technology ecosystem.

Detailed Description: ${project.description}

${project.features ? `Key Features: ${project.features.join(', ')}.` : ''}
${project.demoCallToAction ? `Live Demo Available: ${project.demoCallToAction}` : ''}
${project.demoNote ? project.demoNote : ''}

Career Path Applications:
${getCareerPathApplications(project, careerPaths)}

Available at: ${project.githubUrl || project.webUrl || 'Contact for details'}`;

        documents.push({
            id: `project-${index}`,
            content: content,
            metadata: {
                type: 'project',
                projectName: project.name,
                projectType: project.type,
                technologies: normalizeTechNames(project.technologies),
                skillCategories: skillCategories,
                careerPathScores: careerPaths,
                topCareerPaths: Object.entries(careerPaths)
                    .filter(([_, score]) => score >= 4)
                    .map(([path, _]) => path),
                source: 'projects'
            }
        });
    });

    // GitHub portfolio projects to documents
    githubData.forEach((repo, index) => {
        const techs = normalizeTechNames(repo.technologies);
        const skillCategories = getDataSkillCategories(techs);
        const careerPaths = getCareerPathRelevanceFromTechs(techs);
        const topPaths = Object.entries(careerPaths)
            .filter(([_, score]) => score >= 4)
            .map(([path, _]) => path)
            .join(', ');

        const content = `${repo.displayName || repo.repoName}: ${repo.description || repo.businessSummary}

Multi-Path Career Relevance: This project demonstrates skills applicable to ${topPaths || 'multiple data career paths'}. The technical implementation showcases ${skillCategories.length > 0 ? skillCategories.join(', ') : 'versatile software engineering capabilities'}.

Technical Stack: Built with ${techs.join(', ') || 'varied technologies'}.

Detailed Summary: ${repo.businessSummary || repo.description}

${repo.demoLinks && repo.demoLinks.length ? `Live Demo: ${repo.demoLinks[0]}` : ''}

Repository: ${repo.githubUrl}`;

        documents.push({
            id: `github-${index}`,
            content: content,
            metadata: {
                type: 'github-project',
                projectName: repo.displayName || repo.repoName,
                projectType: repo.projectType,
                technologies: techs,
                skillCategories: skillCategories,
                careerPathScores: careerPaths,
                topCareerPaths: Object.entries(careerPaths)
                    .filter(([_, score]) => score >= 4)
                    .map(([path, _]) => path),
                source: 'github',
                stars: repo.stars || 0
            }
        });
    });

    // Contact document
    const contactLines = contactInfo.map(contact => {
        const platform = contact.platform.toLowerCase();
        if (platform === 'email' || platform === 'e-mail') {
            return `Email: ${contact.name}`;
        }
        return `${contact.platform}: ${contact.name}`;
    }).join('\n');

    documents.push({
        id: 'contact-0',
        content: `Contact Choti for data-focused opportunities.\n\n${contactLines}`,
        metadata: {
            type: 'contact',
            source: 'contact',
            location: 'Belgium',
            availability: 'remote-international'
        }
    });

    return documents;
}


function getCareerPathApplications(project, careerPaths) {
    const applications = [];

    if (careerPaths.dataEngineering >= 4) {
        applications.push(`• Data Engineering: Demonstrates pipeline development, data processing, and system architecture skills`);
    }
    if (careerPaths.dataScience >= 4) {
        applications.push(`• Data Science: Shows analytical thinking, ML implementation, and statistical analysis capabilities`);
    }
    if (careerPaths.backendDev >= 4) {
        applications.push(`• Backend Development: Highlights API development, scalable architecture, and system integration`);
    }
    if (careerPaths.dataAnalyst >= 4) {
        applications.push(`• Data Analysis: Showcases data visualization, reporting, and insight generation abilities`);
    }

    return applications.length > 0 ? applications.join('\n') : '• Versatile project demonstrating foundational skills applicable across data careers';
}


async function generateEmbeddings() {
    console.log('🚀 Starting flexible data professional embeddings generation...');

    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY environment variable is required');
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

    const documents = createDocuments();
    const embeddingsData = [];

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        console.log(`📄 Processing document ${i + 1}/${documents.length}: ${doc.id}`);

        try {
            const result = await model.embedContent(doc.content);
            const embedding = result.embedding;

            embeddingsData.push({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                embedding: embedding.values
            });

            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`❌ Error processing document ${doc.id}:`, error);
            throw error;
        }
    }

    const outputDir = path.join(__dirname, '../data');
    const outputPath = path.join(outputDir, 'embeddings-gemini.json');

    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(embeddingsData, null, 2));

    console.log(`✅ Flexible data professional embeddings saved to ${outputPath}`);
    console.log(`📊 Generated embeddings for ${embeddingsData.length} documents`);

    const summary = {
        totalDocuments: embeddingsData.length,
        documentTypes: [...new Set(embeddingsData.map(d => d.metadata.type))],
        careerApproach: 'flexible-data-professional',
        careerPaths: ['data-engineering', 'data-science', 'ml-engineering', 'backend-development', 'data-analysis'],
        generatedAt: new Date().toISOString(),
        embeddingModel: "text-embedding-004",
        embeddingDimensions: embeddingsData[0]?.embedding.length || 0,
        provider: "google-gemini"
    };

    const summaryPath = path.join(outputDir, 'embeddings-gemini-metadata.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('📋 Summary:', summary);
    return embeddingsData;
}

if (import.meta.url === `file://${process.argv[1]}`) {
    generateEmbeddings()
        .then(() => {
            console.log('🎉 Flexible data professional embeddings generation completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Embeddings generation failed:', error);
            process.exit(1);
        });
}

export { generateEmbeddings };