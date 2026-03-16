function getCookie(name: string): string | null {
    const nameEQ = name + "=";
    const ca = document.cookie.split(';');
    for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') {
            c = c.substring(1, c.length);
        }
        if (c.indexOf(nameEQ) === 0) {
            return c.substring(nameEQ.length, c.length);
        }
    }
    return null;
}

function eraseCookie(name: string): void {
    document.cookie = name + '=; Max-Age=-99999999;';
}

function inputOnFocus(target: HTMLInputElement): void {
    target.parentElement?.classList.add('active');
}

function inputOnBlur(target: HTMLInputElement): void {
    if (target.value.length === 0) {
        target.parentElement?.classList.remove('active');
    }
}

function handleRedirect(event: Event): void {
    event.preventDefault();

    const input = document.getElementById('input_search') as HTMLInputElement;
    const spinner = document.getElementById('spinner');
    const overlay = document.getElementById('overlay');

    const username = input.value.trim();

    if (username) {
        spinner?.classList.add('show');
        overlay?.classList.add('show');

        const nextPageCookie = getCookie("nextPage");
        if (nextPageCookie) {
            eraseCookie('nextPage');
        }

        window.location.href = `/api/${username}`;
    }
}

window.onload = () => {
    const form = document.getElementById('input_form');
    const input = document.getElementById('input_search') as HTMLInputElement;

    form?.addEventListener('submit', handleRedirect);

    if (input) {
        input.addEventListener('focus', () => inputOnFocus(input));
        input.addEventListener('blur', () => inputOnBlur(input));
    }
};