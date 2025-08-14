// scripts/generate-embeddings.js - Run this during build time
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// Your data imports
import { projectData } from '../data/projectData.js';
import { profileData } from '../data/profileData.js';
import { contactInfo } from '../data/contactInfo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Create documents from your data
function createDocuments() {
    const documents = [];

    // Profile documents
    profileData.forEach((section, index) => {
        documents.push({
            id: `profile-${index}`,
            content: `${section.title}: ${section.content}${section.subtitle ? ` ${section.subtitle}` : ''}`,
            metadata: {
                type: 'profile',
                section: section.title,
                source: 'profile'
            }
        });
    });

    // Project documents
    projectData.forEach((project, index) => {
        const content = `Project: ${project.name}
Description: ${project.description}
Type: ${project.type}
Technologies: ${project.technologies.map(t => t.name).join(', ')}
Link: ${project.linkUrl || project.webUrl || 'Available on request'}
${project.shortDescription ? `Summary: ${project.shortDescription}` : ''}`;

        documents.push({
            id: `project-${index}`,
            content: content,
            metadata: {
                type: 'project',
                projectName: project.name,
                projectType: project.type,
                technologies: project.technologies.map(t => t.name),
                source: 'projects'
            }
        });
    });

    // Contact document
    const contactContent = contactInfo.map(contact =>
        `${contact.platform}: ${contact.name}`
    ).join('\n');

    documents.push({
        id: 'contact-0',
        content: `Contact Information:\n${contactContent}`,
        metadata: {
            type: 'contact',
            source: 'contact'
        }
    });

    return documents;
}

async function generateEmbeddings() {
    console.log('🚀 Starting embeddings generation...');

    const documents = createDocuments();
    const embeddingsData = [];

    for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        console.log(`📄 Processing document ${i + 1}/${documents.length}: ${doc.id}`);

        try {
            // Get embedding from OpenAI
            const response = await openai.embeddings.create({
                model: "text-embedding-ada-002",
                input: doc.content,
            });

            embeddingsData.push({
                id: doc.id,
                content: doc.content,
                metadata: doc.metadata,
                embedding: response.data[0].embedding
            });

            // Add small delay to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`❌ Error processing document ${doc.id}:`, error);
            throw error;
        }
    }

    // Save embeddings to JSON file
    const outputDir = path.join(__dirname, '../data');
    const outputPath = path.join(outputDir, 'embeddings.json');

    // Ensure data directory exists
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputPath, JSON.stringify(embeddingsData, null, 2));

    console.log(`✅ Embeddings saved to ${outputPath}`);
    console.log(`📊 Generated embeddings for ${embeddingsData.length} documents`);

    // Generate metadata summary
    const summary = {
        totalDocuments: embeddingsData.length,
        documentTypes: [...new Set(embeddingsData.map(d => d.metadata.type))],
        generatedAt: new Date().toISOString(),
        embeddingModel: "text-embedding-ada-002",
        embeddingDimensions: embeddingsData[0]?.embedding.length || 0
    };

    const summaryPath = path.join(outputDir, 'embeddings-metadata.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('📋 Summary:', summary);
    return embeddingsData;
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    generateEmbeddings()
        .then(() => {
            console.log('🎉 Embeddings generation completed successfully!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Embeddings generation failed:', error);
            process.exit(1);
        });
}

export { generateEmbeddings };