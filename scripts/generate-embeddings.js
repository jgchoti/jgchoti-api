import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

import { projectData } from '../data/projectData.js';
import { profileData } from '../data/profileData.js';
import { contactInfo } from '../data/contactInfo.js';
import { blogData } from '../data/blogData.js';
import { githubCrossReferences } from '../data/githubCrossReferences.js';

let githubData = [];
try {
    const __jsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/github_portfolio_data.json');
    if (fs.existsSync(__jsonPath)) {
        githubData = JSON.parse(fs.readFileSync(__jsonPath, 'utf-8'));
    }
} catch (_) {
    githubData = [];
}

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

function cleanText(text) {
    if (!text) return '';
    return text
        .replace(/\s+/g, ' ') 
        .replace(/('|\"|\`)/g, "'") 
        .trim();
}

function chunkText(text, chunkSize = 250, overlap = 50) {
    const chunks = [];
    if (!text) return chunks;

    const sentences = text.split(/(?<=[.?!])\s+/);
    let currentChunk = '';

    for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > chunkSize) {
            chunks.push(currentChunk.trim());
            currentChunk = currentChunk.slice(-overlap);
        }
        currentChunk += (currentChunk.length > 0 ? ' ' : '') + sentence;
    }

    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
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

function createDocuments() {
    const documents = [];

    // PROFILE DATA 
    profileData.forEach((section, index) => {
        const baseId = `profile-${index}`;
        const baseMetadata = {
            type: 'profile',
            section: section.title,
            source: 'profile',
            careerRelevance: 'high'
        };

        const chunks = section.content.split(/\n|\. /).filter(c => c.trim().length > 10);

        chunks.forEach((chunk, chunkIndex) => {
            documents.push({
                id: `${baseId}-${chunkIndex}`,
                content: cleanText(`${section.title}: ${chunk.trim()}`),
                metadata: { ...baseMetadata, chunk: chunkIndex }
            });
        });

        if (section.subtitle) {
            documents.push({
                id: `${baseId}-subtitle`,
                content: cleanText(`${section.title} (Subtitle): ${section.subtitle}`),
                metadata: { ...baseMetadata, chunk: 'subtitle' }
            });
        }
    });

    // PROJECT DATA 
    projectData.forEach((project, index) => {
        const baseId = `project-${index}`;
        const skillCategories = getDataSkillCategories(project.technologies);
        const careerPaths = getCareerPathRelevanceFromTechs(project.technologies);
        const topPaths = Object.entries(careerPaths)
            .filter(([_, score]) => score >= 4)
            .map(([path, _]) => path)
            .join(', ');

        const baseMetadata = {
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
        };

        // Core project info
        documents.push({
            id: `${baseId}-core`,
            content: cleanText(`${project.name}: ${project.shortDescription || project.description}`),
            metadata: { ...baseMetadata, chunk: 'core' }
        });

        // Career relevance
        documents.push({
            id: `${baseId}-relevance`,
            content: cleanText(`Multi-Path Career Relevance for ${project.name}: This project demonstrates skills applicable to ${topPaths || 'multiple data career paths'}. The technical implementation showcases ${skillCategories.length > 0 ? skillCategories.join(', ') : 'versatile software engineering capabilities'}.`),
            metadata: { ...baseMetadata, chunk: 'relevance' }
        });

        // Tech stack
        documents.push({
            id: `${baseId}-stack`,
            content: cleanText(`Technical Stack for ${project.name}: Built with ${project.technologies.map(t => t.name).join(', ')}, showing proficiency across the modern data technology ecosystem.`),
            metadata: { ...baseMetadata, chunk: 'stack' }
        });

        //Features
        if (project.features && project.features.length > 0) {
            documents.push({
                id: `${baseId}-features`,
                content: cleanText(`Key Features of ${project.name}: ${project.features.join(', ')}.`), 
                metadata: { ...baseMetadata, chunk: 'features' }
            });
        }
        
        // Career applications
        documents.push({
            id: `${baseId}-applications`,
            content: cleanText(`Career Path Applications for ${project.name}:\n${getCareerPathApplications(project, careerPaths)}`),
            metadata: { ...baseMetadata, chunk: 'applications' }
        });

        // Links
        documents.push({
            id: `${baseId}-links`,
            content: cleanText(`Links for ${project.name}: Available at ${project.githubUrl || project.webUrl || 'Contact for details'}. ${project.demoCallToAction || ''} ${project.demoNote || ''}`),
            metadata: { ...baseMetadata, chunk: 'links' }
        });
    });

    // GITHUB DATA
    githubData.forEach((repo, index) => {
        const baseId = `github-${index}`;
        const techs = normalizeTechNames(repo.technologies);
        const skillCategories = getDataSkillCategories(techs);
        const careerPaths = getCareerPathRelevanceFromTechs(techs);
        const crossRef = githubCrossReferences[repo.repoName] || {};
        const finalCareerPaths = crossRef.careerRelevance || careerPaths;
        const topPaths = Object.entries(finalCareerPaths)
            .filter(([_, score]) => score >= 4)
            .map(([path, _]) => path)
            .join(', ');

        const baseMetadata = {
            type: 'github-project',
            projectName: repo.displayName || repo.repoName,
            projectType: repo.projectType,
            technologies: techs,
            skillCategories: skillCategories,
            careerPathScores: finalCareerPaths,
            topCareerPaths: Object.entries(finalCareerPaths)
                .filter(([_, score]) => score >= 4)
                .map(([path, _]) => path),
            source: 'github',
            stars: repo.stars || 0,
            ...crossRef
        };

        //Core repo info
        documents.push({
            id: `${baseId}-core`,
            content: cleanText(`${repo.displayName || repo.repoName}: ${repo.description || repo.businessSummary}`),
            metadata: { ...baseMetadata, chunk: 'core' }
        });

        //Career relevance
        documents.push({
            id: `${baseId}-relevance`,
            content: cleanText(`Multi-Path Career Relevance for ${repo.displayName || repo.repoName}: This project demonstrates skills applicable to ${topPaths || 'multiple data career paths'}. The technical implementation showcases ${skillCategories.length > 0 ? skillCategories.join(', ') : 'versatile software engineering capabilities'}.`),
            metadata: { ...baseMetadata, chunk: 'relevance' }
        });

        //Tech stack
        documents.push({
            id: `${baseId}-stack`,
            content: cleanText(`Technical Stack for ${repo.displayName || repo.repoName}: Built with ${techs.join(', ') || 'varied technologies'}.`),
            metadata: { ...baseMetadata, chunk: 'stack' }
        });

        //Summary and Links
        const summaryContent = `Detailed Summary for ${repo.displayName || repo.repoName}: ${repo.businessSummary || repo.description}
Repository: ${repo.githubUrl}`;
        documents.push({
            id: `${baseId}-summary`,
            content: cleanText(summaryContent),
            metadata: { ...baseMetadata, chunk: 'summary' }
        });
    });

    // CONTACT DATA
    const contactLines = contactInfo.map(contact => {
        const platform = contact.platform.toLowerCase();
        if (platform === 'email' || platform === 'e-mail') {
            return `Email: ${contact.name}`;
        }
        return `${contact.platform}: ${contact.name}`;
    }).join('\n');

    documents.push({
        id: 'contact-0',
        content: cleanText(`Contact Choti for data-focused opportunities.\n\n${contactLines}`),
        metadata: {
            type: 'contact',
            source: 'contact',
            location: 'Belgium',
            availability: 'remote-international'
        }
    });

    // BLOG DATA
    blogData.forEach((blog, index) => {
        const blogContent = `${blog.title}: ${blog.shortDescription || blog.summary || ''}`;
        const chunks = chunkText(blogContent, 200, 40);
        const tags = blog.tags || [];
        const careerRelevance = tags.some(t => ['data', 'ai', 'ml', 'engineering'].includes(t.toLowerCase())) ? 'high' : 'medium';

        chunks.forEach((chunk, chunkIndex) => {
            const content = `${chunk}\n\nRead the full post: ${blog.url}. Key topics: ${tags.join(', ')}.`;
            documents.push({
                id: `blog-${index}-${chunkIndex}`,
                content: cleanText(content),
                metadata: {
                    type: 'blog',
                    title: blog.title,
                    tags: tags,
                    source: 'blog',
                    careerRelevance: careerRelevance,
                    chunk: chunkIndex
                }
            });
        });
    });

    return documents;
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