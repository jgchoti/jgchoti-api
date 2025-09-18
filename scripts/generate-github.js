
import axios from "axios"
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
class GitHubPortfolioProcessor {
    constructor(username) {
        this.username = username;
        this.baseUrl = 'https://api.github.com';
        const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
        this.http = axios.create({
            baseURL: this.baseUrl,
            headers: {
                'User-Agent': 'GitHubPortfolioProcessor',
                'Accept': 'application/vnd.github+json',
                ...(token ? { Authorization: `Bearer ${token}` } : {})
            }
        });
    }

    async fetchAllRepos() {
        try {
            const response = await this.http.get(`/users/${this.username}/repos?per_page=100`);
            const originalRepos = response.data.filter(repo => !repo.fork);

            const ignoredRepos = new Set([
                'exquisite-corpse-choti',
                'fietsateljee',
                'fietsateljee-berchem',
                'group4-project-backend',
                'group4-project-frontend',
                'jgchoti',
                'openspace-organizer',
                'recipe-node-js',
                'skills-introduction-to-github',
                'tlaas-ui',
                'vscode-git',
                'weather-app',
                'challenge - card - game - becode',
                'jgchoti-api'
            ]);

            const filteredRepos = originalRepos.filter(repo => !ignoredRepos.has((repo.name || '').toLowerCase()));
            return filteredRepos;

        } catch (error) {
            console.error('Error fetching repos:', error.message);
            return [];
        }
    }
    // https://api.github.com/users/jgchoti/repos?per_page=100
    async getReadmeContent(repoName) {
        try {
            const response = await this.http.get(`/repos/${this.username}/${repoName}/readme`);

            if (response.status === 200) {
                const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
                return content;
            }
            return null;

        } catch (error) {
            return null;
        }
    }

    extractDescriptionFromReadme(readmeContent) {
        if (!readmeContent) return '';

        // remove code blocks
        const withoutCode = readmeContent.replace(/```[\s\S]*?```/g, '');
        // remove images and badges ![alt](url)
        const withoutImages = withoutCode.replace(/!\[[^\]]*\]\([^\)]*\)/g, '');
        // remove HTML tags
        const withoutHtml = withoutImages.replace(/<[^>]+>/g, '');
        // remove headings and blockquotes
        const withoutHeadings = withoutHtml.replace(/^\s{0,3}#{1,6}\s.*$/gm, '').replace(/^>.*$/gm, '');
        // collapse multiple blank lines
        const collapsed = withoutHeadings.replace(/\n{3,}/g, '\n\n');

        const paragraphs = collapsed
            .split(/\n\n+/)
            .map(p => p.trim())
            .filter(p => p && p.length > 0);

        const candidate = paragraphs.find(p => p.length >= 40) || paragraphs[0] || '';
        const clean = candidate
            // replace markdown links [text](url) with just text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        return clean.length > 500 ? `${clean.slice(0, 497)}...` : clean;
    }

    extractDemoLinks(readmeContent, repoUrl, repoHomepage) {
        const demoLinks = [];

        if (readmeContent) {
            const patterns = [
                /https?:\/\/[\w\.-]+\.[\w]{2,}[^\s\)]*/g,
                /\[.*demo.*\]\((https?:\/\/[^\)]+)\)/gi,
                /\[.*live.*\]\((https?:\/\/[^\)]+)\)/gi,
            ];

            patterns.forEach(pattern => {
                const matches = readmeContent.match(pattern) || [];
                demoLinks.push(...matches);
            });
        }

        const sanitizeLink = (raw) => {
            const trimmed = String(raw).trim();
            // remove wrapping markdown artifacts or quotes
            const withoutWrap = trimmed.replace(/^"|"$/g, '').replace(/^\(|\)$/g, '');
            // remove trailing punctuation ) , .
            return withoutWrap.replace(/[),.]+$/g, '');
        };

        const ignoredHostnames = [
            'economie.fgov.be',
            'petconnect.be',
            'www.petconnect.be',
            'streamlit.io',
            'img.shields.io',
            'shields.io',
            'raw.githubusercontent.com',
            'user-images.githubusercontent.com',
            'avatars.githubusercontent.com',
            'npmjs.com',
            'registry.npmjs.org',
            'pypi.org',
            'crates.io',
            // user-requested ignores
            'makersuite.google.com',
            'becode.org',
            'www.becode.org',
            'reactjs.org',
            'www.reactjs.org',
            'potterdb.com',
            'www.potterdb.com'
        ];

        const preferredHostSuffixes = [
            'vercel.app',
            'netlify.app',
            'github.io',
            'onrender.com',
            'herokuapp.com',
            'pages.dev',
            'fly.dev',
            'web.app',
            'firebaseapp.com',
            'railway.app',
            'azurewebsites.net',
            'cloudflarepages.com'
        ];

        const looksLikeAsset = (url) => /\.(png|jpe?g|gif|svg|pdf|md|zip|tgz|tar|gz|mp4|mov)$/i.test(url);

        const uniqueLinks = [...new Set(demoLinks.map(sanitizeLink))];
        const basicFiltered = uniqueLinks.filter(link => {
            try {
                const urlObj = new URL(link);
                const host = urlObj.hostname.toLowerCase();
                const isIgnoredHost = ignoredHostnames.some(ignored => host === ignored || host.endsWith(`.${ignored}`));
                const containsBannedText = ['github.com', 'git', 'npm', 'docs'].some(exclude => link.toLowerCase().includes(exclude));
                if (isIgnoredHost || containsBannedText) return false;
                if (looksLikeAsset(link)) return false;
                return true;
            } catch {
                return false;
            }
        });

        const text = readmeContent || '';
        const keywordRegex = /(demo|live|preview|website|site|app|try it|deployed)/i;
        const withContext = basicFiltered.filter(link => {
            try {
                const { hostname } = new URL(link);
                const preferred = preferredHostSuffixes.some(sfx => hostname.toLowerCase().endsWith(sfx));
                if (preferred) return true;
            } catch { }
            const idx = text.indexOf(link);
            if (idx === -1) return false;
            const start = Math.max(0, idx - 80);
            const end = Math.min(text.length, idx + link.length + 80);
            const window = text.slice(start, end);
            return keywordRegex.test(window);
        });

        const results = [];
        const pushIfValid = (url) => {
            try {
                const u = sanitizeLink(url);
                if (!u) return;
                const obj = new URL(u);
                const host = obj.hostname.toLowerCase();
                const isIgnoredHost = ignoredHostnames.some(ignored => host === ignored || host.endsWith(`.${ignored}`));
                if (isIgnoredHost || looksLikeAsset(u)) return;
                if (!results.includes(u)) results.push(u);
            } catch { }
        };

        if (repoHomepage && typeof repoHomepage === 'string' && repoHomepage.trim()) {
            pushIfValid(repoHomepage);
        }

        withContext.forEach(pushIfValid);

        return results.slice(0, 3);
    }

    extractTechnologies(repoData, readmeContent) {
        const technologies = [];

        if (repoData.language) {
            technologies.push(repoData.language);
        }
        if (repoData.topics) {
            technologies.push(...repoData.topics);
        }

        if (readmeContent) {
            const techPatterns = [
                // Languages & frameworks
                /\b(React|Vue|Angular|Node\.?js|Python|JavaScript|TypeScript|C\+\+|C#|Rust)\b/gi,

                // Databases
                /\b(MongoDB|PostgreSQL|MySQL|Redis|Firebase|Supabase|SQLite|Oracle|Elasticsearch)\b/gi,

                // Backend frameworks
                /\b(Express|Django|Flask|Spring|Laravel|FastAPI)\b/gi,

                // Cloud & deployment
                /\b(Docker|Kubernetes|AWS|Azure|GCP|Heroku|Vercel|Netlify)\b/gi,

                // Frontend & styling
                /\b(HTML|CSS|Sass|Tailwind|Bootstrap|Material-UI|Chakra)\b/gi,

                // Data engineering / workflow / big data
                /\b(Apache\s+Airflow|Airflow|Spark|Kafka|Hadoop|Beam|Flink|NiFi)\b/gi
            ];

            techPatterns.forEach(pattern => {
                const matches = readmeContent.match(pattern) || [];
                technologies.push(...matches);
            });
        }

        const uniqueTech = [...new Set(technologies)];
        return uniqueTech.filter(tech => tech && tech.length > 1);
    }

    normalizeTechnologies(technologies) {
        if (!Array.isArray(technologies)) return [];
        const canonicalMap = {
            'node': 'Node.js',
            'node.js': 'Node.js',
            'nodejs': 'Node.js',
            'express': 'Express',
            'javascript': 'JavaScript',
            'typescript': 'TypeScript',
            'react': 'React',
            'vue': 'Vue',
            'angular': 'Angular',
            'python': 'Python',
            'java': 'Java',
            'c++': 'C++',
            'c#': 'C#',
            'mongodb': 'MongoDB',
            'postgresql': 'PostgreSQL',
            'mysql': 'MySQL',
            'redis': 'Redis',
            'firebase': 'Firebase',
            'supabase': 'Supabase',
            'expressjs': 'Express',
            'tailwind': 'Tailwind',
            'tailwindcss': 'Tailwind',
            'sass': 'Sass',
            'html': 'HTML',
            'css': 'CSS',
            'docker': 'Docker',
            'kubernetes': 'Kubernetes',
            'aws': 'AWS',
            'azure': 'Azure',
            'gcp': 'GCP',
            'vercel': 'Vercel',
            'netlify': 'Netlify'
        };

        const normalized = technologies.map(t => {
            const raw = String(t).trim();
            const lower = raw.toLowerCase();
            return canonicalMap[lower] || raw.replace(/\bjs\b/i, 'JS');
        });

        const seen = new Set();
        const deduped = [];
        for (const tech of normalized) {
            const key = tech.toLowerCase();
            if (!seen.has(key)) {
                seen.add(key);
                deduped.push(tech);
            }
        }
        return deduped;
    }

    determineProjectType(repoData, technologies) {
        const description = (repoData.description || '').toLowerCase();
        const techStr = technologies.join(' ').toLowerCase();
        const combined = description + ' ' + techStr;

        if (['web', 'react', 'vue', 'angular', 'frontend'].some(word => combined.includes(word))) {
            return 'Web Application';
        } else if (['api', 'backend', 'server', 'express', 'django'].some(word => combined.includes(word))) {
            return 'Backend API';
        } else if (['mobile', 'react native', 'flutter', 'android', 'ios'].some(word => combined.includes(word))) {
            return 'Mobile Application';
        } else if (['ml', 'ai', 'machine learning', 'data', 'analysis', 'llm'].some(word => combined.includes(word))) {
            return 'Data Science';
        } else if (['game', 'unity', 'pygame'].some(word => combined.includes(word))) {
            return 'Game Development';
        } else {
            return 'Software Project';
        }
    }

    createBusinessSummary(repoData, technologies, projectType, effectiveDescription) {
        const name = repoData.name;
        const description = effectiveDescription || repoData.description || 'No description available';

        const cleanName = name.replace(/-/g, ' ').replace(/_/g, ' ')
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

        const summaryParts = [
            `Project: ${cleanName}`,
            `Type: ${projectType}`,
            `Description: ${description}`,
            `Technologies: ${technologies.slice(0, 5).join(', ')}` // Limit to top 5
        ];

        if (repoData.stargazers_count > 0) {
            summaryParts.push(`GitHub Stars: ${repoData.stargazers_count}`);
        }

        return summaryParts.join(' | ');
    }

    async processAllRepos() {
        console.log(`Fetching repositories for ${this.username}...`);
        const repos = await this.fetchAllRepos();

        if (!repos.length) {
            console.log('No repositories found or error occurred');
            return [];
        }

        const processedRepos = [];

        for (const repo of repos) {
            const repoName = repo.name;
            console.log(`Processing: ${repoName}`);

            // Get README
            const readmeContent = await this.getReadmeContent(repoName);

            // Extract technologies
            const technologiesRaw = this.extractTechnologies(repo, readmeContent);
            const technologies = this.normalizeTechnologies(technologiesRaw);

            // Determine project type
            const projectType = this.determineProjectType(repo, technologies);

            // Extract demo links (prioritize homepage)
            const demoLinks = this.extractDemoLinks(readmeContent, repo.html_url, repo.homepage);

            // Prepare description using README fallback
            const descriptionFromReadme = this.extractDescriptionFromReadme(readmeContent);
            const effectiveDescription = repo.description && repo.description.trim().length > 0
                ? repo.description
                : (descriptionFromReadme || 'No description available');

            // Create business summary
            const businessSummary = this.createBusinessSummary(repo, technologies, projectType, effectiveDescription);

            // Structure data for RAG
            const processedRepo = {
                repoName: repoName,
                displayName: repoName.replace(/-/g, ' ').replace(/_/g, ' ')
                    .split(' ')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' '),
                description: effectiveDescription,
                technologies: technologies,
                projectType: projectType,
                githubUrl: repo.html_url,
                demoLinks: demoLinks,
                stars: repo.stargazers_count || 0,
                lastUpdated: repo.updated_at,
                businessSummary: businessSummary,
                embeddingText: `${businessSummary} | Skills demonstrated: ${technologies.join(', ')} | Suitable for clients needing ${projectType.toLowerCase()} solutions`,
                metadata: {
                    source: 'github',
                    repoName: repoName,
                    projectType: projectType,
                    technologies: technologies
                }
            };

            processedRepos.push(processedRepo);
        }

        return processedRepos;
    }
}


async function runGitHubProcessor() {
    const processor = new GitHubPortfolioProcessor('jgchoti');
    const portfolioData = await processor.processAllRepos();

    console.log(`\nProcessed ${portfolioData.length} repositories:`);
    console.log('-'.repeat(50));

    portfolioData.forEach(repo => {
        console.log(`\n📁 ${repo.displayName}`);
        console.log(`🔧 ${repo.projectType} | ⭐ ${repo.stars} stars`);
        console.log(`💻 Technologies: ${repo.technologies.slice(0, 3).join(', ')}...`);
        console.log(`📝 Embedding text preview: ${repo.embeddingText.substring(0, 100)}...`);
        if (repo.demoLinks.length > 0) {
            console.log(`🌐 Demo: ${repo.demoLinks[0]}`);
        }
        console.log('-'.repeat(30));
    });


    const outputPath = path.resolve(__dirname, '../data/github_portfolio_data.json')
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(portfolioData, null, 2))
    console.log(`\n✅ Data saved to ${outputPath}`)
}

runGitHubProcessor();