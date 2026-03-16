class PinnedRepoApp {
    private inputEl: HTMLTextAreaElement;
    private sendBtn: HTMLButtonElement;
    private formEl: HTMLFormElement;
    private overlayEl: HTMLElement;

    constructor() {
        this.inputEl = document.getElementById('input_search') as HTMLTextAreaElement;
        this.sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
        this.formEl = document.getElementById('input_form') as HTMLFormElement;
        this.overlayEl = document.getElementById('overlay') as HTMLElement;

        if (this.inputEl && this.sendBtn && this.formEl) {
            this.init();
        }
    }

    private init(): void {
        // 1. The button immediately changes color and becomes clickable as soon as there is content in the TextArea
        this.inputEl.addEventListener('input', () => this.handleUpdate());

        // 2. Exclude Shift+Enter line break behavior
        this.inputEl.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const username = this.inputEl.value.trim();
                if (username.length > 0) {
                    this.executeSubmit(username);
                }
            }
        });

        // 3. Listen for Form submission (e.g., pressing Enter without Shift)
        this.formEl.addEventListener('submit', (e: Event) => {
            e.preventDefault();
            const username = this.inputEl.value.trim();
            if (username.length > 0) {
                this.executeSubmit(username);
            }
        });

        // 4. Important: Resolve the issue of overlay residual after navigating back (bfcache)
        window.addEventListener('pageshow', (event) => {
            // persisted is true when the page is loaded from the cache (i.e., when the back button is pressed)
            if (event.persisted) {
                this.hideOverlay();
                this.handleUpdate();
            }
        });

        // Initialize state
        this.handleUpdate();
    }

    private handleUpdate(): void {
        const text = this.inputEl.value.trim();
        const hasContent = text.length > 0;

        this.inputEl.style.height = 'auto';
        this.inputEl.style.height = `${this.inputEl.scrollHeight}px`;

        if (hasContent) {
            this.sendBtn.disabled = false;
            this.sendBtn.classList.remove('opacity-20', 'cursor-not-allowed');
            this.sendBtn.classList.add('opacity-100', 'cursor-pointer');
        } else {
            this.sendBtn.disabled = true;
            this.sendBtn.classList.add('opacity-20', 'cursor-not-allowed');
            this.sendBtn.classList.remove('opacity-100', 'cursor-pointer');
        }
    }

    private showOverlay(): void {
        if (this.overlayEl) {
            this.overlayEl.classList.remove('opacity-0', 'pointer-events-none');
            this.overlayEl.classList.add('opacity-100');
        }
    }

    private hideOverlay(): void {
        if (this.overlayEl) {
            this.overlayEl.classList.add('opacity-0', 'pointer-events-none');
            this.overlayEl.classList.remove('opacity-100');
        }
    }

    private executeSubmit(username: string): void {
        this.showOverlay();
        document.cookie = 'nextPage=; Max-Age=-99999999; path=/;';
        window.location.href = `/api/${encodeURIComponent(username)}`;
    }
}

document.addEventListener('DOMContentLoaded', () => new PinnedRepoApp());