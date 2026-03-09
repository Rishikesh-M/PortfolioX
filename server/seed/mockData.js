// Mock portfolios used for seeding the database on first run.
// Mirrors constants.ts exactly so the app always has initial data.

export const MOCK_PORTFOLIOS = [
    {
        id: '1',
        fullName: 'Jane Doe',
        role: 'Full Stack Developer',
        bio: 'I build scalable, secure, and modern web applications.',
        avatar: 'https://picsum.photos/id/64/400/400',
        domain: 'Full Stack',
        stats: { repos: 42, followers: 256, projectsCount: 12 },
        skills: ['React', 'Node.js', 'PostgreSQL', 'Tailwind CSS'],
        projects: [
            { id: 'p1', name: 'E-Commerce App', description: 'Full stack shopping platform', type: 'Full Stack' },
            { id: 'p2', name: 'CTF Platform', description: 'Jeopardy-style security CTF', type: 'Security' },
        ],
        githubProjects: [
            { id: 'g1', name: 'CyberRecon', description: 'Open Source Security Tool', type: 'Open Source' },
            { id: 'g2', name: 'PortfolioX-Core', description: 'Core parser for identity orchestration', type: 'Open Source' },
        ],
        learningProgress: [
            { label: 'Frontend', percentage: 90 },
            { label: 'Backend', percentage: 85 },
            { label: 'Security', percentage: 70 },
        ],
        createdAt: '2024-01-15T10:00:00Z',
        score: 95,
        grade: 'S',
        internalFollowers: ['2', '3'],
        ratings: [{ userId: '2', value: 5 }, { userId: '3', value: 4 }],
        contact: {
            email: 'jane.doe@example.com',
            twitter: 'janedoe_dev',
            linkedin: 'janedoe',
            website: 'janedoe.dev',
        },
    },
    {
        id: '2',
        fullName: 'Alex Riv',
        role: 'Cybersecurity Analyst',
        bio: 'Exploring the depths of offensive and defensive security.',
        avatar: 'https://picsum.photos/id/1012/400/400',
        domain: 'Security',
        stats: { repos: 15, followers: 89, projectsCount: 5 },
        skills: ['Python', 'Bash', 'Docker', 'Metasploit'],
        projects: [
            { id: 'p3', name: 'VulnScan', description: 'Automated vulnerability assessment', type: 'Security' },
        ],
        githubProjects: [
            { id: 'g3', name: 'exploit-db-scraper', description: 'Python scraper for local db', type: 'Tool' },
        ],
        learningProgress: [
            { label: 'Penetration Testing', percentage: 80 },
            { label: 'Network Security', percentage: 95 },
        ],
        createdAt: '2024-02-10T08:30:00Z',
        score: 88,
        grade: 'A',
        internalFollowers: ['1'],
        ratings: [{ userId: '1', value: 5 }],
        contact: {},
    },
    {
        id: '3',
        fullName: 'Sam Smith',
        role: 'AI Research Engineer',
        bio: 'Focusing on large language models and prompt engineering.',
        avatar: 'https://picsum.photos/id/1025/400/400',
        domain: 'AI/ML',
        stats: { repos: 30, followers: 412, projectsCount: 8 },
        skills: ['PyTorch', 'TensorFlow', 'LLMs', 'FastAPI'],
        projects: [
            { id: 'p4', name: 'BrainSim', description: 'Neural network visualizer', type: 'AI/ML' },
        ],
        githubProjects: [
            { id: 'g4', name: 'llm-agents-framework', description: 'Agentic workflows for GPT', type: 'Research' },
        ],
        learningProgress: [
            { label: 'Deep Learning', percentage: 88 },
            { label: 'NLP', percentage: 92 },
        ],
        createdAt: '2024-03-01T15:45:00Z',
        score: 75,
        grade: 'B',
        internalFollowers: [],
        ratings: [],
        contact: {},
    },
];
