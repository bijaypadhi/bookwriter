const BASE_URL = window.location.origin.includes("localhost") 
    ? "http://localhost:8000/bookwriter" 
    : "http://148.100.78.182/bookwriter";

export function homeURL() { return `${BASE_URL}/`; }
export function readerURL() { return `${BASE_URL}/read.html`; }
export function booksURL() { return `${BASE_URL}/library/`; }
export function websiteName() { return "KFZ BookWriter"; }
export function defaultLanguage() { return "en"; }
