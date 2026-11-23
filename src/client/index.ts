// Keep this file a script (not a module) so the CommonJS build does not emit `exports`
// into the browser bundle. The shape mirrors src/types.ts.
interface PinnedRepo {
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
    parentRepo?: { owner: string; repo: string; link: string };
}

const USERNAME_PATTERN = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;

function element<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    className?: string,
    text?: string,
): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

class PinnedRepoApp {
    private inputEl: HTMLTextAreaElement;
    private sendBtn: HTMLButtonElement;
    private formEl: HTMLFormElement;
    private statusEl: HTMLElement;
    private resultsEl: HTMLElement;
    private resultsTitleEl: HTMLElement;
    private resultsGridEl: HTMLElement;
    private rawJsonLinkEl: HTMLAnchorElement;
    private apiExampleEl: HTMLElement;
    private resultApiUrlEl: HTMLElement;
    private fetchExampleEl: HTMLElement;
    private copyApiBtnEl: HTMLButtonElement;
    private copyResultUrlBtnEl: HTMLButtonElement;
    private howToToggleEl: HTMLButtonElement;
    private howToEl: HTMLElement;
    private homeLinkEl: HTMLAnchorElement;
    private clearInputBtnEl: HTMLButtonElement;

    private currentUsername = '';
    private requestId = 0;

    constructor() {
        this.inputEl = document.getElementById('input_search') as HTMLTextAreaElement;
        this.sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
        this.formEl = document.getElementById('input_form') as HTMLFormElement;
        this.statusEl = document.getElementById('status') as HTMLElement;
        this.resultsEl = document.getElementById('results') as HTMLElement;
        this.resultsTitleEl = document.getElementById('results-title') as HTMLElement;
        this.resultsGridEl = document.getElementById('results-grid') as HTMLElement;
        this.rawJsonLinkEl = document.getElementById('raw-json-link') as HTMLAnchorElement;
        this.apiExampleEl = document.getElementById('api-example') as HTMLElement;
        this.resultApiUrlEl = document.getElementById('result-api-url') as HTMLElement;
        this.fetchExampleEl = document.getElementById('fetch-example') as HTMLElement;
        this.copyApiBtnEl = document.getElementById('copy-api') as HTMLButtonElement;
        this.copyResultUrlBtnEl = document.getElementById('copy-result-url') as HTMLButtonElement;
        this.howToToggleEl = document.getElementById('how-to-toggle') as HTMLButtonElement;
        this.howToEl = document.getElementById('how-to') as HTMLElement;
        this.homeLinkEl = document.getElementById('home-link') as HTMLAnchorElement;
        this.clearInputBtnEl = document.getElementById('clear-input') as HTMLButtonElement;

        if (this.inputEl && this.sendBtn && this.formEl) this.init();
    }

    private init(): void {
        this.inputEl.addEventListener('input', () => this.handleUpdate());

        this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.submitFromInput();
            }
        });

        this.formEl.addEventListener('submit', (e: Event) => {
            e.preventDefault();
            this.submitFromInput();
        });

        if (this.homeLinkEl) {
            this.homeLinkEl.addEventListener('click', (e: MouseEvent) => {
                e.preventDefault();
                this.resetAll();
            });
        }
        if (this.clearInputBtnEl) {
            this.clearInputBtnEl.addEventListener('click', () => this.clearInput());
        }
        if (this.copyApiBtnEl) {
            this.copyApiBtnEl.addEventListener('click', () => this.copyApiUrl(this.copyApiBtnEl));
        }
        if (this.copyResultUrlBtnEl) {
            this.copyResultUrlBtnEl.addEventListener('click', () => this.copyApiUrl(this.copyResultUrlBtnEl));
        }
        if (this.howToToggleEl) {
            this.howToToggleEl.addEventListener('click', () => {
                if (!this.howToEl) return;
                const isHidden = this.howToEl.classList.toggle('hidden');
                this.howToToggleEl.textContent = isHidden
                    ? 'Need help? How to use →'
                    : 'Hide guide';
            });
        }

        // bfcache: restore UI state when navigating back.
        window.addEventListener('pageshow', (event) => {
            if (event.persisted) {
                this.handleUpdate();
                const username = new URLSearchParams(window.location.search).get('q');
                if (username) this.search(username);
            }
        });

        this.handleUpdate();
        const initial = new URLSearchParams(window.location.search).get('q');
        if (initial) {
            this.inputEl.value = initial;
            this.handleUpdate();
            this.search(initial);
        }
    }

    private handleUpdate(): void {
        const hasContent = this.inputEl.value.trim().length > 0;

        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;

        this.sendBtn.disabled = !hasContent;
        this.sendBtn.classList.toggle('opacity-20', !hasContent);
        this.sendBtn.classList.toggle('cursor-not-allowed', !hasContent);
        this.sendBtn.classList.toggle('opacity-100', hasContent);
        this.sendBtn.classList.toggle('cursor-pointer', hasContent);

        if (this.clearInputBtnEl) this.clearInputBtnEl.classList.toggle('hidden', !hasContent);
    }

    private submitFromInput(): void {
        const username = this.inputEl.value.trim();
        if (username) this.search(username);
    }

    private clearInput(): void {
        this.inputEl.value = '';
        this.handleUpdate();
        this.inputEl.focus();
    }

    /** Logo click: return to the initial state without a full page reload. */
    private resetAll(): void {
        // Invalidate in-flight requests so a late response cannot repopulate the UI.
        this.requestId++;
        this.currentUsername = '';

        this.inputEl.value = '';
        this.handleUpdate();

        this.clearStatus();
        this.resultsEl.classList.add('hidden');
        this.resultsGridEl.replaceChildren();
        this.showHowTo();
        if (this.howToToggleEl) this.howToToggleEl.textContent = 'Need help? How to use →';

        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.pushState({}, '', url.toString());

        const defaultApi = 'GET /api/{username}';
        if (this.apiExampleEl) this.apiExampleEl.textContent = defaultApi;
        if (this.resultApiUrlEl) this.resultApiUrlEl.textContent = defaultApi;
        if (this.fetchExampleEl) {
            this.fetchExampleEl.textContent = "fetch('/api/{username}')\n  .then(res => res.json())";
        }

        this.inputEl.focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    private updateExamples(username: string): void {
        const apiExample = `GET /api/${username}`;
        if (this.apiExampleEl) this.apiExampleEl.textContent = apiExample;
        if (this.resultApiUrlEl) this.resultApiUrlEl.textContent = apiExample;
        if (this.fetchExampleEl) {
            this.fetchExampleEl.textContent = `fetch('/api/${username}')\n  .then(res => res.json())`;
        }
    }

    private async copyApiUrl(button: HTMLButtonElement): Promise<void> {
        const path = this.currentUsername
            ? `/api/${encodeURIComponent(this.currentUsername)}`
            : '/api/{username}';
        const url = window.location.origin + path;

        try {
            await navigator.clipboard.writeText(url);
            this.flashCopied(button);
        } catch {
            // Fallback for insecure contexts or denied clipboard permission.
            const helper = element('input');
            helper.value = url;
            helper.style.position = 'fixed';
            helper.style.opacity = '0';
            document.body.appendChild(helper);
            helper.select();
            const copied = document.execCommand('copy');
            helper.remove();
            if (copied) this.flashCopied(button);
            else window.prompt('Copy this URL:', url);
        }
    }

    private flashCopied(button: HTMLButtonElement): void {
        const original = button.textContent || 'Copy';
        button.textContent = 'Copied!';
        window.setTimeout(() => {
            button.textContent = original;
        }, 1500);
    }

    private showHowTo(): void {
        if (this.howToEl) this.howToEl.classList.remove('hidden');
    }

    private hideHowTo(): void {
        if (this.howToEl) this.howToEl.classList.add('hidden');
        if (this.howToToggleEl) this.howToToggleEl.textContent = 'Need help? How to use →';
    }

    private setStatus(message: string, isError = false): void {
        this.statusEl.textContent = message;
        this.statusEl.classList.remove('hidden');
        this.statusEl.classList.toggle('text-red-600', isError);
        this.statusEl.classList.toggle('text-[#73726C]', !isError);
    }

    private clearStatus(): void {
        this.statusEl.textContent = '';
        this.statusEl.classList.add('hidden');
    }

    private async search(rawUsername: string): Promise<void> {
        const username = rawUsername.replace(/^@/, '').trim();

        if (!USERNAME_PATTERN.test(username)) {
            this.resultsEl.classList.add('hidden');
            this.showHowTo();
            this.setStatus('Please enter a valid GitHub username (letters, numbers and hyphens).', true);
            return;
        }

        this.hideHowTo();
        this.currentUsername = username;
        this.updateExamples(username);
        const requestId = ++this.requestId;

        // Keep the URL shareable without leaving the page.
        const url = new URL(window.location.href);
        url.searchParams.set('q', username);
        window.history.pushState({ q: username }, '', url.toString());

        this.resultsEl.classList.add('hidden');
        this.resultsGridEl.replaceChildren();
        this.setStatus(`Fetching pinned repositories for ${username}...`);

        try {
            const response = await fetch(`/api/${encodeURIComponent(username)}`, {
                headers: { 'Accept': 'application/json' },
            });

            let payload: any = null;
            try {
                payload = await response.json();
            } catch {
                // ignore malformed error bodies
            }

            if (requestId !== this.requestId) return; // a newer search won

            if (!response.ok) {
                this.resultsEl.classList.add('hidden');
                this.showHowTo();
                const message = payload?.error || `Request failed (${response.status}).`;
                this.setStatus(message, true);
                return;
            }

            const repos: PinnedRepo[] = Array.isArray(payload) ? payload : [];
            this.renderResults(username, repos);
        } catch {
            if (requestId !== this.requestId) return;
            this.resultsEl.classList.add('hidden');
            this.showHowTo();
            this.setStatus('Network error. Please try again.', true);
        }
    }

    private renderResults(username: string, repos: PinnedRepo[]): void {
        this.clearStatus();
        this.resultsTitleEl.textContent = `${username} — ${repos.length} pinned ${repos.length === 1 ? 'repo' : 'repos'}`;
        this.rawJsonLinkEl.href = `/api/${encodeURIComponent(username)}`;
        this.resultsGridEl.replaceChildren();

        if (repos.length === 0) {
            this.resultsEl.classList.remove('hidden');
            this.resultsGridEl.appendChild(
                element('p', 'col-span-full text-center text-sm text-[#73726C]', 'No pinned repositories found.'),
            );
            return;
        }

        for (const repo of repos) {
            this.resultsGridEl.appendChild(this.buildCard(repo));
        }
        this.resultsEl.classList.remove('hidden');
    }

    private buildCard(repo: PinnedRepo): HTMLElement {
        const card = element('article',
            'bg-white border border-[#E5E5E5] rounded-2xl p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)] flex flex-col gap-3');

        const header = element('div', 'flex items-start gap-3');
        const titleLink = element('a',
            'text-[17px] font-medium text-[#D46B4F] hover:underline break-all',
            `${repo.owner}/${repo.repo}`);
        titleLink.href = repo.link;
        titleLink.target = '_blank';
        titleLink.rel = 'noopener noreferrer';
        const headerText = element('div', 'flex-1 min-w-0');
        headerText.appendChild(titleLink);

        if (repo.isArchived) {
            headerText.appendChild(element('span',
                'ml-2 align-middle text-[10px] uppercase tracking-wide text-[#73726C] border border-[#E5E5E5] rounded px-1.5 py-0.5',
                'Archived'));
        }
        if (repo.isFork && repo.parentRepo) {
            const fork = element('p', 'text-xs text-[#9CA3AF]', 'Forked from ');
            const parentLink = element('a', 'hover:underline',
                `${repo.parentRepo.owner}/${repo.parentRepo.repo}`);
            parentLink.href = repo.parentRepo.link;
            parentLink.target = '_blank';
            parentLink.rel = 'noopener noreferrer';
            fork.appendChild(parentLink);
            headerText.appendChild(fork);
        }
        header.appendChild(headerText);
        card.appendChild(header);

        if (repo.description) {
            card.appendChild(element('p', 'text-sm text-[#4b4a47] leading-relaxed', repo.description));
        }

        const meta = element('div', 'flex flex-wrap items-center gap-4 text-xs text-[#73726C]');
        if (repo.language) {
            const language = element('span', 'inline-flex items-center gap-1.5');
            if (repo.languageColor) {
                const dot = element('span', 'w-2.5 h-2.5 rounded-full inline-block');
                dot.style.backgroundColor = repo.languageColor;
                language.appendChild(dot);
            }
            language.appendChild(document.createTextNode(repo.language));
            meta.appendChild(language);
        }
        meta.appendChild(element('span', '', `★ ${repo.stars}`));
        meta.appendChild(element('span', '', `⑂ ${repo.forks}`));
        if (repo.website) {
            const site = element('a', 'text-[#D46B4F] hover:underline truncate max-w-[220px]',
                repo.website.replace(/^https?:\/\//, ''));
            site.href = repo.website;
            site.target = '_blank';
            site.rel = 'noopener noreferrer';
            meta.appendChild(site);
        }
        card.appendChild(meta);

        if (repo.topics && repo.topics.length > 0) {
            const topics = element('div', 'flex flex-wrap gap-1.5 pt-1');
            for (const topic of repo.topics.slice(0, 10)) {
                topics.appendChild(element('span',
                    'text-[11px] bg-[#f3f2ee] text-[#73726C] rounded-full px-2 py-0.5', topic));
            }
            card.appendChild(topics);
        }

        return card;
    }
}

document.addEventListener('DOMContentLoaded', () => new PinnedRepoApp());
