export const projectData = [
    {
        id: 1,
        name: "Too Lazy as A Service",
        type: "data",
        description: "Too Lazy as A Service (TLaaS) is a lazy excuse generator API that randomly returns excuses, sometimes refuses to work, and always stay lazy. A project to learn FastAPI. Implemented routing, validation with Pydantic, Dockerized, and deployed on Render. A fun way to practice Python APIs and deployment.",
        shortDescription: "Lazy excuse generator powered by FastAPI",
        technologies: [
            { name: "Python" },
            { name: "FastAPI" },
            { name: "Docker" },
            { name: "Render" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/tlaas",
        webUrl: "https://too-lazy-as-a-service.onrender.com/docs",
        relatedProfileSections: ["tech-stack-primary", "skills-cloud-devops", "learning"],
        skillsHighlighted: ["Python", "FastAPI", "Docker", "API Development", "Deployment"],
        careerRelevance: {
            dataEngineering: 8,
            backendDev: 9,
            dataScience: 3,
            dataAnalyst: 2
        },
        keyLearnings: ["FastAPI framework", "Pydantic validation", "Dockerization", "Render deployment"],
        tags: ["api", "python", "backend", "deployment", "learning-project"]
    },
    {
        id: 2,
        name: "Circus Artist Portfolio",
        type: "web",
        description: "A professional portfolio website designed to showcase the work and artistry of Jakobe Geens, an accomplished circus performer. This website was created to highlight Jakobe Geens' career in the circus arts. It features her biography, artistic approach, and portfolio of performances. Developed using Squarespace, the site is optimized for user experience and SEO.",
        shortDescription: "A professional circus artist portfolio built with Squarespace, designed for show events and collaborations",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "SEO" },
            { name: "Squarespace" }
        ],
        webUrl: "https://jakobegeens.com",
        blogUrl: "https://medium.com/@jgchoti/solving-a-language-switching-nav-bar-using-only-css-on-squarespace-add859c95ef9",
        relatedProfileSections: ["projects-freelance", "tech-stack-web", "accomplishments"],
        skillsHighlighted: ["Web Development", "SEO", "Client Work", "Squarespace"],
        clientWork: true,
        measurableResult: "25% traffic increase through SEO optimization",
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 3,
            dataScience: 1,
            dataAnalyst: 3
        },
        tags: ["freelance", "web", "seo", "client-project", "squarespace"]
    },
    {
        id: 3,
        name: "Monitoring Dashboard",
        type: "data",
        description: "A data visualization tool designed to monitor coral health using data from Smart Buoy sensors. Developed as part of Tech4Positive Futures Challenge's presentation, this dashboard leverages Chart.js for real-time data visualization and Leaflet.js for interactive mapping. It provides insights into key coral health metrics like temperature and pH levels, helping communities and researchers make informed decisions to protect coral reefs.",
        shortDescription: "Built with HTML, CSS, JavaScript, Chart.js, and Leaflet.js",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "Chart.js" },
            { name: "Leaflet.js" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/coral-game",
        webUrl: "https://coral-game.netlify.app/map",

        relatedProfileSections: ["projects-tech4positive", "accomplishments", "interests-values"],
        relatedProjects: ["Save Corals"],
        skillsHighlighted: ["Data Visualization", "Dashboard Development", "JavaScript", "Climate Tech"],
        award: "Tech4Positive Futures Challenge 2024 Winner - Capgemini Belgium",
        teamProject: true,
        careerRelevance: {
            dataEngineering: 6,
            backendDev: 4,
            dataScience: 7,
            dataAnalyst: 9
        },
        impact: "Winner of sustainability hackathon, addressing climate change impacts on coral reefs",
        tags: ["hackathon", "winner", "data-visualization", "climate-tech", "sustainability", "dashboard"]
    },
    {
        id: 4,
        name: "Save Corals",
        type: "web",
        description: "An engaging educational game built to raise awareness about coral reef conservation using interactive storytelling. Developed using Twine, this game allows users to explore scenarios impacting coral reefs and learn about the importance of real-time data monitoring. The game uses HTML, CSS, and JavaScript to enhance interactivity and user experience.",
        shortDescription: "Built with Twine, HTML, CSS, and JavaScript",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "Twine" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/coral-game",
        webUrl: "https://coral-game.netlify.app/",
        relatedProfileSections: ["projects-tech4positive", "accomplishments", "interests-values"],
        relatedProjects: ["Monitoring Dashboard"], // Links to id 3
        skillsHighlighted: ["Interactive Storytelling", "Game Development", "Educational Technology"],
        award: "Part of Tech4Positive Futures Challenge 2024 Winner",
        teamProject: true,
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 3,
            dataScience: 4,
            dataAnalyst: 5
        },
        tags: ["hackathon", "game", "education", "climate-tech", "sustainability"]
    },
    {
        id: 5,
        name: "English Dictionary",
        type: "web",
        description: "This English Dictionary project was developed using React. Using Free Dictionary API, user can look up meaning of any word. Beyond just looking up meanings, users can also get random words thrown their way, making their learning journey exciting and engaging.",
        shortDescription: "Built with HTML, CSS with React",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "React" },
            { name: "API" }
        ],
        githubUrl: "https://github.com/jgchoti/dictionary-react",
        webUrl: "https://retro-english-dictionary.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        skillsHighlighted: ["React", "API Integration", "JavaScript"],
        bootcampProject: "HackYourFuture",
        careerRelevance: {
            dataEngineering: 4,
            backendDev: 6,
            dataScience: 2,
            dataAnalyst: 3
        },
        tags: ["react", "api", "web-development", "bootcamp-project"]
    },
    {
        id: 6,
        name: "Potter Searcher",
        type: "web",
        description: "The PotterAPI Searcher is an application developed as part of an assignment during my studies at HackYourFuture Belgium to deepen my understanding of JavaScript and API interactions. It utilizes The Potter DB: API and allow users to explore and discover information about characters, spells, potions, books, and movies. One of the key challenges I tackled was implementing server-side filtering to optimize performance and ensure accurate data retrieval.",
        shortDescription: "A responsive application using The Potter DB: API",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "API" }
        ],
        githubUrl: "https://github.com/jgchoti/harry-potter-searcher",
        webUrl: "https://jgchoti.github.io/harry-potter-searcher/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        skillsHighlighted: ["JavaScript", "API Integration", "Server-side Filtering", "Performance Optimization"],
        bootcampProject: "HackYourFuture",
        keyLearnings: ["Server-side filtering", "API optimization", "Data retrieval"],
        careerRelevance: {
            dataEngineering: 5,
            backendDev: 7,
            dataScience: 3,
            dataAnalyst: 4
        },
        tags: ["javascript", "api", "web-development", "bootcamp-project", "optimization"]
    },
    {
        id: 7,
        name: "Studio Ghibli Searcher",
        type: "web",
        description: "The Studio Ghibli Searcher is an application born out of my deep admiration for Studio Ghibli films and characters. It is designed to let users discover the world of Studio Ghibli by using the Studio Ghibli API. This application was a passion project developed during my studies at HackYourFuture Belgium. One of the highlights of this project was implementing client-side filtering using state management.",
        shortDescription: "A responsive application using the Studio Ghibli API",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "API" }
        ],
        githubUrl: "https://github.com/jgchoti/studio-ghibli-searcher/",
        webUrl: "https://jgchoti.github.io/studio-ghibli-searcher/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        skillsHighlighted: ["JavaScript", "State Management", "Client-side Filtering", "API Integration"],
        bootcampProject: "HackYourFuture",
        passionProject: true,
        keyLearnings: ["Client-side filtering", "State management", "API integration"],
        careerRelevance: {
            dataEngineering: 4,
            backendDev: 6,
            dataScience: 2,
            dataAnalyst: 3
        },
        tags: ["javascript", "api", "state-management", "bootcamp-project", "passion-project"]
    },
    {
        id: 8,
        name: "To-Do List",
        type: "web",
        description: "This to-do list application was developed as part of my studies with HackYourFuture Belgium, aimed at deepening my understanding of JavaScript. Throughout this project, I aimed to create a user-friendly application where individuals could effortlessly manage their daily tasks. I also implemented local storage capabilities, allowing users to save their to-do lists directly on their devices.",
        shortDescription: "A responsive To-Do List, built with HTML, CSS, and JavaScript",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/to-do-list",
        webUrl: "https://jgchoti.github.io/to-do-list/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        skillsHighlighted: ["JavaScript", "Local Storage", "DOM Manipulation", "User Experience"],
        bootcampProject: "HackYourFuture",
        keyLearnings: ["Local storage", "JavaScript fundamentals", "User-friendly design"],
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 4,
            dataScience: 1,
            dataAnalyst: 2
        },
        tags: ["javascript", "web-development", "bootcamp-project", "beginner-project"]
    },
    {
        id: 9,
        name: "Bike Shop Website",
        type: "web",
        description: "I made a website for a local Bike Repair Shop. I used HTML, CSS, JavaScript, and Bootstrap to make this site user-friendly and responsive. The goal is to make this site looks great on different devices, and to help the shop connect with customers in a digital world.",
        shortDescription: "A responsive website, built with HTML, CSS, and JavaScript",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "Bootstrap" }
        ],
        githubUrl: "https://github.com/jgchoti/fietsateljee-berchem",
        webUrl: "https://fietsateljee-berchem.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "projects-freelance", "learning"],
        skillsHighlighted: ["Responsive Design", "Bootstrap", "Client Communication"],
        clientWork: true,
        localBusiness: true,
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 4,
            dataScience: 1,
            dataAnalyst: 2
        },
        tags: ["web-development", "bootstrap", "responsive-design", "local-business"]
    },
    {
        id: 10,
        name: "Basic Calculator",
        type: "web",
        description: "When I started my journey with HackYourFuture Belgium, I was tasked to created a Basic Calculator. Developed to enhance my web development skills, this calculator is crafted using HTML, CSS, and basic JavaScript. My goal of this project was to create simple, clean and minimalistic design, making calculations straightforward and efficient.",
        shortDescription: "Built with HTML, CSS and basic JavaScript",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/basic-calculator",
        webUrl: "https://choti-calculator.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        skillsHighlighted: ["JavaScript Basics", "Clean Design", "Problem Solving"],
        bootcampProject: "HackYourFuture",
        firstProject: true,
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 3,
            dataScience: 1,
            dataAnalyst: 1
        },
        tags: ["javascript", "web-development", "bootcamp-project", "beginner-project", "first-project"]
    },
    {
        id: 11,
        name: "Weather App 2.0",
        type: "web",
        description: "Utilizing my knowledge of HTML, CSS, and JavaScript, I embarked on building the Weather App using React. This project marked my entry into the world of React. Through this project, I deepened my understanding of React's core concepts, such as state, props, and components.",
        shortDescription: "Built with HTML, CSS with React",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "React" },
            { name: "API" }
        ],
        githubUrl: 'https://github.com/jgchoti/weather-react',
        webUrl: "https://weather2024.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        relatedProjects: ["Weather App"], // Links to id 12
        skillsHighlighted: ["React", "State Management", "Props", "Components", "API Integration"],
        bootcampProject: "HackYourFuture",
        keyLearnings: ["React fundamentals", "Component architecture", "State management"],
        careerRelevance: {
            dataEngineering: 4,
            backendDev: 6,
            dataScience: 2,
            dataAnalyst: 4
        },
        tags: ["react", "api", "web-development", "bootcamp-project", "state-management"]
    },
    {
        id: 12,
        name: "Weather App",
        type: "web",
        description: "In this project, I got into the world of live API to make a dynamic weather app. I aimed for a design that's user-friendly. User can get the latest on weather conditions, forecasts, and what's happening in their area, all thanks to the API integration. My primary focus was on integrating weather APIs to ensure users receive up-to-date and accurate weather information.",
        shortDescription: "Exploring the Power of Live API Integration",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" },
            { name: "API" }
        ],
        githubUrl: 'https://github.com/jgchoti/weather-app',
        webUrl: "https://weather2023.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "education-hackyourfuture", "learning"],
        relatedProjects: ["Weather App 2.0"], // Links to id 11
        skillsHighlighted: ["API Integration", "JavaScript", "Asynchronous Programming"],
        bootcampProject: "HackYourFuture",
        keyLearnings: ["Live API integration", "Async/await", "Data fetching"],
        careerRelevance: {
            dataEngineering: 5,
            backendDev: 6,
            dataScience: 2,
            dataAnalyst: 4
        },
        tags: ["javascript", "api", "web-development", "bootcamp-project", "async"]
    },
    {
        id: 13,
        name: "First Landing Page",
        type: "web",
        description: "My first web development project, marking the beginning of my coding journey. Built with vanilla HTML, CSS, and JavaScript to learn web fundamentals. While simple, this project represents the foundation that led to all subsequent work.",
        shortDescription: "First web project - HTML, CSS, JavaScript fundamentals",
        technologies: [
            { name: "HTML" },
            { name: "CSS" },
            { name: "JavaScript" },
            { name: "GitHub" }
        ],
        githubUrl: 'https://github.com/jgchoti/cv',
        webUrl: "https://chotirat.netlify.app/",
        relatedProfileSections: ["tech-stack-web", "learning", "career-goals"],
        skillsHighlighted: ["HTML", "CSS", "JavaScript Basics", "Responsive Design"],
        firstProject: true,
        milestone: "First web development project - foundation of coding journey",
        careerRelevance: {
            dataEngineering: 2,
            backendDev: 2,
            dataScience: 1,
            dataAnalyst: 2
        },
        tags: ["web-development", "first-project", "html", "css", "milestone", "learning-journey"]
    },
    {
        id: 14,
        name: "SQL Assistant",
        type: "data",
        description: "Convert natural language questions into SQL queries and get instant results from your database. Built with React, Flask, and LangChain with Google Gemini AI. Supports database uploads (.sqlite/.db), AI-generated SQL queries, real-time query execution, and intelligent data analysis. Deployed on Vercel (frontend) and Render (backend).",
        shortDescription: "Ask questions in plain English, get AI-generated SQL queries, and see results instantly.",
        technologies: [
            { name: "Python" },
            { name: "Flask" },
            { name: "React" },
            { name: "Material-UI" },
            { name: "LangChain" },
            { name: "Google Gemini" },
            { name: "SQLAlchemy" },
            { name: "Render" },
            { name: "GitHub" }
        ],
        githubUrl: "https://github.com/jgchoti/sql-assistant",
        webUrl: "https://sql-assist.vercel.app",
        relatedProfileSections: ["tech-stack-primary", "skills-machine-learning", "education-becode", "skills-data-engineering"],
        skillsHighlighted: ["Python", "Flask", "React", "LangChain", "AI Integration", "SQL", "Full-Stack"],
        bootcampProject: "BeCode",
        careerRelevance: {
            dataEngineering: 9,
            backendDev: 9,
            dataScience: 7,
            dataAnalyst: 8
        },
        keyLearnings: ["LangChain integration", "AI-powered applications", "Full-stack deployment", "Natural language processing"],
        impact: "Demonstrates ability to build end-to-end AI applications",
        tags: ["ai", "langchain", "sql", "python", "flask", "react", "full-stack", "bootcamp-project"]
    },
    {
        id: 15,
        demoCallToAction: "**Try it now**: Ask me 'What data science experience does Choti have?' or 'Tell me about her international background' to see how the vector search retrieves relevant context and generates personalized responses!",
        name: "AI Career Agent Chatbot",
        type: "data",
        description: "An AI RAG-powered chatbot that serves as Choti's professional career agent. Built with Node.js, Express, and Google Gemini AI with vector search using semantic embeddings. Features real-time context retrieval from portfolio data, professional career guidance, and conversational AI that accurately represents Choti's background, skills, and experience. Deployed as a serverless API with CORS support for web integration.",
        shortDescription: "Intelligent career agent that answers questions about Choti's professional background using AI and vector search.",
        demoNote: "**Live Demo**: You're currently using this system! Ask me anything about Choti's background, skills, or projects to experience the RAG technology firsthand.",
        technologies: [
            { name: "Node.js" },
            { name: "Express" },
            { name: "Google Gemini AI" },
            { name: "RAG (Retrieval Augmented Generation)" },
            { name: "Vector Search" },
            { name: "Semantic Embeddings" },
            { name: "JavaScript" },
            { name: "Vercel" },
            { name: "GitHub" }
        ],
        webUrl: "https://jgchoti.github.io",
        githubUrl: "https://github.com/jgchoti/portfolio-rag-chatbot",
        relatedProfileSections: ["projects-rag-bot", "tech-stack-primary", "skills-machine-learning", "skills-cloud-devops"],
        skillsHighlighted: ["Node.js", "RAG Architecture", "Vector Search", "Gemini AI", "Semantic Embeddings", "API Development", "Serverless"],
        featuredProject: true,
        currentlyActive: true,
        careerRelevance: {
            dataEngineering: 9,
            backendDev: 10,
            dataScience: 8,
            dataAnalyst: 6
        },
        keyLearnings: ["RAG architecture", "Vector embeddings", "Semantic search", "AI integration", "Serverless deployment"],
        impact: "Showcases cutting-edge AI/ML skills and full-stack capabilities",
        tags: ["ai", "rag", "vector-search", "node.js", "gemini-ai", "featured", "portfolio", "serverless"]
    },
    {
        id: 16,
        name: "Customer Experience Dashboard - Orange Belgium",
        type: "data",
        description: "Built a comprehensive monthly Power BI dashboard for Orange Belgium to monitor customer experience metrics. Provided management with interactive visualizations and drill-down analytics to track service trends, identify pain points, and improve KPIs. Enabled data-driven decision making for customer service improvements.",
        shortDescription: "Power BI dashboard for customer analytics and KPI monitoring",
        technologies: [
            { name: "Power BI" },
            { name: "DAX" },
            { name: "SQL" },
            { name: "Data Modeling" }
        ],
        relatedProfileSections: ["projects-orange-belgium", "education-becode", "skills-data-analysis"],
        skillsHighlighted: ["Power BI", "Data Visualization", "DAX", "SQL", "Business Intelligence"],
        clientWork: true,
        bootcampProject: "BeCode",
        careerRelevance: {
            dataEngineering: 8,
            backendDev: 4,
            dataScience: 7,
            dataAnalyst: 10
        },
        impact: "Real-world business intelligence project with Orange Belgium",
        tags: ["power-bi", "dashboard", "client-project", "business-intelligence", "bootcamp-project"]
    },
    {
        id: 17,
        name: "Real Estate Data Pipeline with Airflow",
        type: "data",
        description: "Orchestrated web scraping pipeline using Apache Airflow to collect Belgian real estate data from Zimmo.be. Automated data extraction, transformation, and loading into PostgreSQL with scheduled DAGs, error handling, and monitoring. Built with Docker for containerized deployment.",
        shortDescription: "Apache Airflow ETL pipeline for real estate data",
        technologies: [
            { name: "Python" },
            { name: "Apache Airflow" },
            { name: "PostgreSQL" },
            { name: "Docker" },
            { name: "HTML" }
        ],
        githubUrl: "https://github.com/jgchoti/immoeliza-airflow",
        webUrl: "https://immo-be.streamlit.app/",
        relatedProfileSections: ["tech-stack-primary", "skills-data-engineering", "education-becode"],
        skillsHighlighted: ["Apache Airflow", "ETL Pipeline", "PostgreSQL", "Docker", "Data Orchestration"],
        bootcampProject: "BeCode",
        careerRelevance: {
            dataEngineering: 10,
            backendDev: 7,
            dataScience: 6,
            dataAnalyst: 5
        },
        keyLearnings: ["Airflow DAGs", "Pipeline orchestration", "Scheduled jobs", "Error handling"],
        impact: "Demonstrates production-ready data pipeline skills",
        tags: ["airflow", "etl", "pipeline", "postgresql", "docker", "bootcamp-project"]
    },
    {
        id: 18,
        name: "CSV Processing with Redis Caching",
        type: "data",
        description: "Optimized large CSV file processing using Redis as a caching layer. Implemented hash operations (HSET/HGET) for chunked data storage with PostgreSQL and MongoDB backends. Demonstrates advanced Redis features and performance optimization for handling large datasets.",
        shortDescription: "Redis caching layer for efficient CSV processing",
        technologies: [
            { name: "Python" },
            { name: "Redis" },
            { name: "PostgreSQL" },
            { name: "MongoDB" },
            { name: "Docker" }
        ],
        githubUrl: "https://github.com/jgchoti/challenge-caching-csv-redis",
        relatedProfileSections: ["skills-data-engineering", "education-becode"],
        skillsHighlighted: ["Redis", "Caching", "Performance Optimization", "PostgreSQL", "MongoDB"],
        bootcampProject: "BeCode",
        careerRelevance: {
            dataEngineering: 9,
            backendDev: 8,
            dataScience: 5,
            dataAnalyst: 4
        },
        keyLearnings: ["Redis caching", "Hash operations", "Performance optimization", "Multi-database architecture"],
        tags: ["redis", "caching", "performance", "postgresql", "mongodb", "bootcamp-project"]
    }, {
        id: 19,
        name: "Music Analytics Platform with Elasticsearch",
        type: "data",
        description: "Built a music analytics platform using Elasticsearch, FastAPI, and Streamlit for exploring Spotify track data. Features advanced search capabilities, AI-powered recommendations, and data visualization. Demonstrates search engine integration and modern API architecture.",
        shortDescription: "Elasticsearch-powered music search with AI recommendations",
        technologies: [
            { name: "Python" },
            { name: "Elasticsearch" },
            { name: "FastAPI" },
            { name: "Streamlit" },
            { name: "Docker" }
        ],
        githubUrl: "https://github.com/jgchoti/elastic-search-music-explorer",
        relatedProfileSections: ["tech-stack-primary", "skills-data-engineering", "education-becode"],
        skillsHighlighted: ["Elasticsearch", "FastAPI", "Search Engine", "API Development", "Docker"],
        bootcampProject: "BeCode",
        careerRelevance: {
            dataEngineering: 9,
            backendDev: 9,
            dataScience: 6,
            dataAnalyst: 7
        },
        keyLearnings: ["Elasticsearch integration", "Search optimization", "FastAPI backend", "Data indexing"],
        tags: ["elasticsearch", "fastapi", "search", "api", "docker", "bootcamp-project"]
    },
    {
        id: 20,
        name: "Deepfake Detection System - Hackathon Winner",
        type: "data",
        description: "Built an award-winning multi-layer deepfake detection system at 2025 Orange Hackathon addressing digital trust and misinformation. Implemented sophisticated detection pipeline combining metadata analysis, visual frame scanning, audio processing, and conditional deep video processing with smart scoring algorithms. Featured graceful degradation for system reliability and scalable architecture for production readiness. Contributed to both technical development and strategic positioning, helping frame the solution as 'rebuilding trust in the digital world' rather than just technical detection. Demonstrates AI safety focus, computer vision expertise, and ability to build high-impact solutions under pressure.",
        shortDescription: "Award-winning multi-layer AI system for deepfake detection and digital trust restoration",
        technologies: [
            { name: "Python" },
            { name: "Computer Vision" },
            { name: "Machine Learning" },
            { name: "Audio Processing" },
            { name: "Multi-layer Architecture" }
        ],
        githubUrl: null, // Team hackathon project - private repo
        relatedProfileSections: ["hackathon-wins", "skills-machine-learning", "skills-problem-solving"],
        skillsHighlighted: ["Computer Vision", "Machine Learning", "AI Safety", "Multi-layer Systems", "Team Collaboration"],
        hackathonProject: "Deepfake Detection Hackathon 2024",
        hackathonWin: true,
        careerRelevance: {
            dataEngineering: 7,
            backendDev: 6,
            dataScience: 9,
            mlEngineer: 10,
            aiSafety: 10
        },
        keyLearnings: [
            "Multi-layer detection architecture",
            "Graceful degradation design",
            "Computer vision for deepfake detection",
            "Audio analysis for synthetic voice detection",
            "Smart scoring algorithms",
            "Team collaboration under pressure",
            "Strategic narrative crafting"
        ],
        tags: ["hackathon-winner", "deepfake-detection", "ai-safety", "computer-vision", "machine-learning", "digital-trust", "misinformation", "team-project", "2024"]
    }
];