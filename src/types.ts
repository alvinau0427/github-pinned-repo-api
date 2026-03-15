export interface PinnedRepo {
    owner: string;
    repo: string;
    link: string;
    description?: string;
    image: string;
    website?: string;
    language?: string;
    languageColor?: string;
    stars: number;
    forks: number;
    topics?: string[];
    isArchived?: boolean;
    isFork?: boolean;
    parentRepo?: {
        owner: string;
        repo: string;
        link: string;
    };
}